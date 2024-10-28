# Process Reporter Cli for Windows

Process Reporter Cli 是一个 Windows 命令行工具，用于实时报告当前用户正在使用的前台应用程序名称。它可以将你当前正在使用的应用信息同步到你的博客或其他网站上。

## 相关项目

- [ProcessReporterMac](https://github.com/mx-space/ProcessReporterMac) - macOS 版本的 Process Reporter

## 开始使用

### 环境要求

- [Node.js](https://nodejs.org/zh-cn/) (建议使用 v18 或更高版本)
- yarn 包管理器
- Windows 操作系统

### 环境变量配置

在项目根目录创建 `.env` 文件，需要配置以下环境变量：

```env
API Configuration
你的API地址，用于接收进程信息
例如: https://api.example.com/api/v2/fn/ps/update
API_URL=
用于验证更新请求的密钥
UPDATE_KEY=
S3 Configuration
Cloudflare R2 或兼容 S3 协议的存储配置
R2 Account ID，在 Cloudflare R2 控制台可以找到
S3_ACCOUNT_ID=
R2 Access Key ID，在 Cloudflare R2 控制台生成
S3_ACCESS_KEY=
R2 Secret Access Key，在 Cloudflare R2 控制台生成
S3_SECRET_KEY=
R2 Bucket 名称，例如: my-process-reporter
S3_BUCKET=
自定义域名，用于访问上传的图片
例如: https://cdn.example.com 或 https://your-bucket.your-domain.com
S3_CUSTOM_DOMAIN=
R2 地区设置，默认为 auto
S3_REGION=auto
```

### 自定义配置

配置完环境变量后，你可以编辑 `./src/configs.ts` 文件来自定义：

- 进程名称的替换规则
- 描述信息的格式化
- 需要忽略的进程
- 图标处理规则
- 更新间隔时间

### 运行方式

开发环境运行：

```bash
安装依赖
yarn install --ignore-engines
启动开发服务
yarn run dev
```

生产环境部署：

```bash
安装依赖
yarn install --ignore-engines
构建项目
yarn run build
进入构建目录
cd dist
确保 .env 文件已复制到 dist 目录
运行程序
node index.js
```

## 功能特性

- 实时监控前台应用程序
- 自动上传应用图标到 S3 兼容存储
- 支持自定义进程名称和描述格式
- 支持忽略特定进程
- 支持自定义更新间隔
- SQLite 本地缓存，避免重复上传

## 常见问题

1. 如果遇到图标上传失败，请检查：
   - S3 配置是否正确
   - Bucket 权限是否配置正确
   - 自定义域名是否正确配置

2. 如果进程信息不更新，请检查：
   - API_URL 是否正确
   - UPDATE_KEY 是否匹配
   - 网络连接是否正常

## 许可证

2024 Innei, MIT