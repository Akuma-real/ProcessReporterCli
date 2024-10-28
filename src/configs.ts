import { Rule } from "./types"
import { config } from "dotenv"

const cwd = process.cwd()

const resolvePath = (path: string) => require("path").resolve(cwd, path)
const env = config({
  path: resolvePath(".env"),
})

const requiredEnvVars = [
  'API_URL',
  'UPDATE_KEY',
  'S3_ACCOUNT_ID',
  'S3_ACCESS_KEY',
  'S3_SECRET_KEY',
  'S3_BUCKET',
  'S3_CUSTOM_DOMAIN'
] as const

for (const envVar of requiredEnvVars) {
  if (!env.parsed?.[envVar]) {
    throw new Error(`环境变量 ${envVar} 未设置`)
  }
}

export const endpoint = env.parsed?.API_URL!
export const updateKey = env.parsed?.UPDATE_KEY!

export const rules: Rule[] = [
  {
    matchApplication: "Visual Studio Code",
    replace: {
      application: (appName) => "Code",
      description: (des) =>
        des ? "写码:\n-> " + des.split(" - ").slice(0, 2).join(" - ") : "",
    },
  },
  {
    matchApplication: "QQ音乐 听我想听",
    replace: {
      application: (appName) => "QQ音乐",
      description: (des) => (des ? "正在听:\n-> " + des?.trim() : des),
    },
    override: {
      iconUrl: "",
    },
  },
  {
    matchApplication: "WindowsTerminal.exe",
    replace: {
      application: () => "WindowsTerminal",
      description(des) {
        return "\n$ ********************"
      },
    },
  },
  {
    matchApplication: "Google Chrome",
    replace: {
      description: (des) =>
        des ? "正在浏览:\n->" + des.split(" - ").slice(0, 2).join(" - ") : "",
    },
  },

  {
    matchApplication: "League of Legends",
    replace: {
      description(des) {
        return ` - 祖安`
      },
    },
  },
]

rules.push({
  matchApplication: "*",
  replace: {
    application(appName) {
      return appName?.replace(".exe", "")
    },
    description(des) {
      if (!des) return
      return `\n${des}`
    },
  },
})

export const ignoreProcessNames: (
  | string
  | RegExp
  | ((processName: string) => boolean)
)[] = ["下载"]

export const s3 = {
  accountId: env.parsed?.S3_ACCOUNT_ID!,
  accessKeyId: env.parsed?.S3_ACCESS_KEY!,
  secretAccessKey: env.parsed?.S3_SECRET_KEY!,
  bucket: env.parsed?.S3_BUCKET!,
  customDomain: env.parsed?.S3_CUSTOM_DOMAIN!,
  region: env.parsed?.S3_REGION || "auto",
  get endpoint() {
    return `https://${s3.accountId}.r2.cloudflarestorage.com`
  },
}

export const pushConfig = {
  interval: 30_000,
}
