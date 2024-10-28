import { PutObjectCommand, S3Client, HeadObjectCommand } from "@aws-sdk/client-s3"
import { s3 } from "./configs"
import { getDb } from "./db"
import { logger } from "./logger"
import { md5 } from "./utils"
import sharp from "sharp"

const s3client = new S3Client({
  region: s3.region,
  endpoint: s3.endpoint,
  credentials: {
    accessKeyId: s3.accessKeyId,
    secretAccessKey: s3.secretAccessKey,
  },
})

// 检查文件是否存在于 S3
async function checkFileExistsInS3(path: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: s3.bucket,
      Key: path,
    })
    await s3client.send(command)
    return true
  } catch (err) {
    return false
  }
}

export async function uploadToS3(
  path: string,
  body: Buffer,
  contentType: string
) {
  const command = new PutObjectCommand({
    Bucket: s3.bucket,
    Key: path,
    Body: body,
    ContentType: contentType,
    ACL: 'public-read',
  })

  try {
    const res = await s3client.send(command)
    
    if (res.$metadata.httpStatusCode !== 200) {
      throw new Error("上传到 S3 失败")
    }

    // 验证文件是���真的上传成功
    const exists = await checkFileExistsInS3(path)
    if (!exists) {
      throw new Error("文件上传后无法访问")
    }
  } catch (err) {
    logger.error("S3 上传错误", {
      error: err,
      bucket: s3.bucket,
      path,
    })
    throw err
  }
}

export class Uploader {
  public static readonly shared = new Uploader()
  private uploadingMap = {} as Record<string, boolean>

  async uploadIcon(iconBase64: string, name: string) {
    const db = await getDb()
    const md5Icon = md5(iconBase64)
    const path = `${md5Icon}.png`
    const url = `${s3.customDomain}/${path}`.replace(/([^:]\/)\/+/g, "$1")

    if (this.uploadingMap[name]) {
      return url
    }

    this.uploadingMap[name] = true
    const now = new Date()
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`

    try {
      logger.log(`[${timeStr}] 当前窗口: ${name}`)
      
      const fileExistsInS3 = await checkFileExistsInS3(path)
      let dbRecord = await db.all(
        "SELECT * FROM uploads WHERE name = ? OR md5 = ? LIMIT 1",
        [name, md5Icon]
      ).then(results => results[0])
      
      if (dbRecord && !fileExistsInS3) {
        await db.run("DELETE FROM uploads WHERE md5 = ?", [md5Icon])
        dbRecord = undefined
      }

      if (dbRecord) {
        const oldUrl = dbRecord.url as string
        const newUrl = url
        if (oldUrl !== newUrl) {
          await db.run(
            `UPDATE uploads SET url = ? WHERE md5 = ?`,
            [newUrl, md5Icon]
          )
          return newUrl
        }
        
        this.uploadingMap[name] = false
        return newUrl
      }

      const buffer = Buffer.from(iconBase64.split(",")[1], "base64")
      const resizedBuffer = await sharp(buffer).resize(64, 64).toBuffer()

      await uploadToS3(path, resizedBuffer, "image/png")
      
      await db.run(
        `INSERT INTO uploads (md5, url, name) VALUES (?, ?, ?)`,
        [md5Icon, url, name]
      )

      const finalCheck = await checkFileExistsInS3(path)
      if (!finalCheck) {
        throw new Error("文件上传后最终验证失败")
      }

      return url
    } catch (err) {
      logger.error(`[${timeStr}] 图标上传失败: ${name}`, {
        error: err
      })
      throw err
    } finally {
      this.uploadingMap[name] = false
    }
  }
}
