import { mkdirSync } from "fs"
import path, { resolve } from "path"
import sqlite, { open } from "sqlite"
import * as sqlite3 from "sqlite3"
import { logger } from "./logger"
import { s3 } from "./configs"  // 修改这里，从 configs 导入

const { Database } = sqlite3

let _db: sqlite.Database<sqlite3.Database, sqlite3.Statement> | null = null

const dbFile = resolve(
  require("os").homedir(),
  "./AppData/Local/ProcessRepoter/data.db"
)

mkdirSync(path.dirname(dbFile), { recursive: true })

async function migrateUrls(db: sqlite.Database) {
  const { customDomain } = s3
  logger.log("开始迁移 URL", { customDomain })
  
  // 获取所有记录
  const records = await db.all("SELECT * FROM uploads")
  
  for (const record of records) {
    const newUrl = `${customDomain}/${record.md5}.png`.replace(/([^:]\/)\/+/g, "$1")
    if (record.url !== newUrl) {
      logger.log("更新记录 URL", {
        old: record.url,
        new: newUrl,
        name: record.name
      })
      await db.run(
        "UPDATE uploads SET url = ? WHERE md5 = ?",
        [newUrl, record.md5]
      )
    }
  }
}

async function getDb() {
  if (_db) return _db

  const db = await open({
    driver: Database,
    filename: dbFile,
  })
  _db = db

  async function initializeDb() {
    await db.exec(`CREATE TABLE IF NOT EXISTS uploads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      md5 TEXT NOT NULL,
      url TEXT NOT NULL,
      name TEXT NOT NULL
    )`)
    
    // 在初始化时运行迁移
    await migrateUrls(db)
  }

  await initializeDb()

  return db
}

getDb()
export { getDb }
