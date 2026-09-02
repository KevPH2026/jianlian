# 建联

自托管外联工作台：联系人 CRM、邮件活动、官方 WhatsApp Cloud API 收件箱、序列自动化。单一 PostgreSQL 联系人库，统一收件箱。

**不包含** 社交抓取、非官方 WhatsApp（Baileys / WAHA / Evolution）、LinkedIn 自动加好友。

## 本地运行

复制 `.env.example` 为 `.env`。至少把 `NEXTAUTH_SECRET` 改成足够长的随机串。SMTP 可留空（dry-run）。

启动（Docker）：

    docker compose up --build

浏览器打开 http://localhost:3000

不使用 Docker、本机已有 Postgres + Redis 时：复制环境变量后执行 `npm install`、`npx prisma generate`、`npx prisma db push`、`npm run db:seed`，然后分别运行 `npm run dev` 与 `npm run worker`。

## 默认登录

- 邮箱：admin@jianlian.local
- 密码：admin12345

首次 compose 启动或 `npm run db:seed` 会写入该管理员及约 8 条演示联系人、1 个邮件模板、1 条「第 0 天邮件 → 等待 3 天 → 跟进邮件」序列。

## 测试

    npm test

覆盖：CSV 去重、模板插值、序列回复暂停、CSV 导入。

## 环境变量

见 `.env.example`。

- DATABASE_URL：PostgreSQL
- REDIS_URL：BullMQ / worker
- NEXTAUTH_URL / NEXTAUTH_SECRET：登录会话
- SMTP_HOST 等：未配置时邮件 dry-run，仍写入「将发送」记录与活动时间线
- IMAP_*：可选入站。关闭时请在联系人页「手动登记回复」
- WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN / WHATSAPP_VERIFY_TOKEN：Cloud API 默认值；也可在「设置」页保存
- SEND_RATE_PER_HOUR：默认 20

仓库不提交 `.env` 与密钥。

## SMTP

在 `.env` 填写 SMTP_HOST、SMTP_PORT、SMTP_USER、SMTP_PASS、SMTP_FROM，重启 app 与 worker。创建活动（默认草稿）→ 打开活动页预览个性化 → 显式点击「开始发送」。Worker 按每小时限额投递。收件人状态：queued / sent / bounced / replied。未配置 SMTP 时同样走队列，状态记为 sent + dry-run。模板变量：{{name}} {{company}} {{title}}。

## WhatsApp Cloud API Webhook

仅官方 Graph API。

1. 在 Meta 开发者后台取得 Phone Number ID 与 Access Token。
2. 打开建联「设置」保存，以及 Verify Token（默认 jianlian-verify）。
3. 回调 URL：https://<你的域名>/api/whatsapp/webhook
   - GET：hub.mode + hub.verify_token + hub.challenge
   - POST：入站文本按手机号匹配联系人，写入统一收件箱，阶段改为「已回复」，进行中序列暂停

联系人页：已配置可直接发消息；否则显示「未配置」。

## 架构

Next.js App Router（界面 + API）与独立 worker 进程共享 Prisma/PostgreSQL。Redis + BullMQ 承接发送节拍；worker 同时轮询到期序列步骤与 sending 活动。邮件走 nodemailer SMTP；可选 imapflow 拉未读入站。WhatsApp 只调用 graph.facebook.com。评分规则纯本地：有邮箱、职位匹配 CEO|Founder|负责人|VP|Director 等，无外网抓取。

浏览器 → app:3000 (Next.js) → Prisma → postgres；入队 → redis；worker 出队后走 SMTP 或 Cloud API。Webhook 走 /api/whatsapp/webhook 进入收件箱。

## 功能清单

- 邮箱密码登录（种子管理员）
- 联系人 CRM：阶段（新线索 / 已触达 / 已回复 / 跟进中 / 勿联系）、标签、搜索筛选、批量改阶段/打标签
- CSV 导入导出，去重优先级：邮箱 → 电话 → 姓名+公司
- 联系人详情 + 活动时间线
- BANT+ICP 分层（热/温/冷），列表展示 ICP 与层级；CRM 含国家/语言/来源/产品意向/下一步
- SMTP 模板、活动草稿、个性化预览、显式开始发送、20/小时、dry-run
- WhatsApp Cloud API 设置、Webhook、联系人页发送
- 统一收件箱（邮件 + WhatsApp），回复走 SMTP / Cloud API
- 入站回复将阶段设为已回复；IMAP 关闭时可手动登记
- 序列：等待 / 发邮件 / 可选 WhatsApp；手动报名；回复或勿联系自动暂停
- 仪表盘：阶段计数、近 7 日发送、停滞 5+ 天、已触达未回复、序列待发

演示数据均为虚构。
