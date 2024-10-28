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
  logger.log("开始上传到 S3", {
    path,
    bucket: s3.bucket,
    endpoint: s3.endpoint,
    contentType,
  })

  const command = new PutObjectCommand({
    Bucket: s3.bucket,
    Key: path,
    Body: body,
    ContentType: contentType,
    ACL: 'public-read', // 确保文件可公开访问
  })

  try {
    const res = await s3client.send(command)
    logger.log("S3 上传响应", {
      statusCode: res.$metadata.httpStatusCode,
      requestId: res.$metadata.requestId,
    })

    if (res.$metadata.httpStatusCode !== 200) {
      throw new Error("上传到 S3 失败")
    }

    // 验证文件是否真的上传成功
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

    logger.log("准备上传图标", {
      name,
      path,
      url,
      isUploading: this.uploadingMap[name],
    })

    if (this.uploadingMap[name]) {
      logger.log("图标正在上传中，返回临时 URL", { name, url })
      return url
    }

    this.uploadingMap[name] = true

    try {
      // 首先检查 S3 中是否存在文件
      const fileExistsInS3 = await checkFileExistsInS3(path)
      
      let dbRecord = await db.all(
        "SELECT * FROM uploads WHERE name = ? OR md5 = ? LIMIT 1",
        [name, md5Icon]
      ).then(results => results[0])
      
      // 如果数据库有记录但 S3 没有文件，需要重新上传
      if (dbRecord && !fileExistsInS3) {
        logger.log("数据库有记录但 S3 无文件，准备重新上传", {
          name,
          md5: md5Icon,
        })
        // 删除旧记录
        await db.run("DELETE FROM uploads WHERE md5 = ?", [md5Icon])
        dbRecord = undefined
      }

      if (dbRecord) {
        const oldUrl = dbRecord.url as string
        const newUrl = url
        if (oldUrl !== newUrl) {
          logger.log("更新图标 URL", {
            name,
            oldUrl,
            newUrl,
          })
          await db.run(
            `UPDATE uploads SET url = ? WHERE md5 = ?`,
            [newUrl, md5Icon]
          )
          return newUrl
        }
        
        logger.log("图标已存在于数据库中", {
          name,
          url: dbRecord.url,
          md5: dbRecord.md5,
        })
        this.uploadingMap[name] = false
        return newUrl
      }

      logger.log("开始处理图标", { name })
      const buffer = Buffer.from(iconBase64.split(",")[1], "base64")
      const resizedBuffer = await sharp(buffer).resize(64, 64).toBuffer()

      await uploadToS3(path, resizedBuffer, "image/png")
      
      logger.log("图标上传成功，写入数据库", {
        name,
        url,
        md5: md5Icon,
      })

      await db.run(
        `INSERT INTO uploads (md5, url, name) VALUES (?, ?, ?)`,
        [md5Icon, url, name]
      )

      // 最后再次验证文件是否可访问
      const finalCheck = await checkFileExistsInS3(path)
      if (!finalCheck) {
        throw new Error("文件上传后最终验证失败")
      }

      return url
    } catch (err) {
      logger.error("图标上传过程出错", {
        name,
        error: err,
      })
      throw err
    } finally {
      this.uploadingMap[name] = false
    }
  }
}
