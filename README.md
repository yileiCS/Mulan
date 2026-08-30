# 烟火诗笺

> 把生活里的每一件小事，都写成诗。

烟火诗笺是一款面向普通人的生活灵感创作陪伴工具。它不是代笔写诗的机器，而是一个坐在你对面、懂你的老朋友——你说一句，它接一句，随口提几个话头，陪你把自己的生活感触，写成属于自己的诗。

专为**热爱生活、喜欢写作的打工者、宝妈、小商贩**等普通用户设计。

---

## ✨ 产品特色

| 特色 | 说明 |
|------|------|
| 🗣️ **语音输入** | 按住说话，不用打字。支持浏览器语音识别和火山引擎语音代理，兼容 iOS / 安卓 |
| 💬 **朋友式启发** | 不说套话，不写鸡汤。像聊天一样接住你的心事，给 3 个自然的话头 |
| 🧭 **专属风格** | 学习你自己的诗歌作品和语言质感，灵感更贴近你的表达习惯 |
| 📝 **多草稿管理** | 每首诗独立保存，随时中断、随时续接，适配碎片化创作 |
| 🗄️ **本地存储** | 所有草稿存于浏览器 IndexedDB，不上传服务器，你的作品只属于你 |
| 📱 **移动端优先** | 大按钮、单手操作、响应式布局，手机上和电脑上一样好用 |
| 💾 **备份导出** | 诗集备份 / 单首导出 / 恢复导入，作品可随身携带 |

---

## 🚀 快速开始

### 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器（默认 http://localhost:5173）
npm run dev

# 生产构建
npm run build

# 本地预览构建结果
npm run preview
```

### 本地 HTTPS 调试（语音功能需要安全上下文）

```bash
# 生成自签名证书
openssl req -x509 -newkey rsa:4096 -sha256 -days 365 -nodes \
  -keyout server.key -out server.crt \
  -subj "/CN=localhost"

# 启动 HTTPS 本地服务
node server-https.js
# 打开 https://localhost:3000（提示不安全时点"高级"→继续访问）
```

---

## 🛠️ 配置 AI 与语音

打开网页后，点击右上角 ⚙️ 进入设置页面：

| 配置项 | 说明 |
|--------|------|
| **豆包 API Key** | 火山方舟平台申请，`ark-` 开头 |
| **推理接入点 ID** | 火山方舟控制台创建，`ep-` 开头（**模型名不能直接用**） |
| **语音识别方式** | 自动 / 浏览器内置 / 火山语音代理 |
| **火山语音 AppID + AccessKey** | 火山引擎语音服务独立凭证，与 API Key 不是一套 |

> 💡 未配置 API Key 时仍可使用草稿管理、导出等功能，AI 启发会走离线兜底模式。

### 申请入口

- **豆包大模型**：[火山方舟控制台](https://console.volcengine.com/ark/) → 创建推理接入点
- **语音识别**：[火山引擎语音服务](https://console.volcengine.com/speech/service/8) → 创建应用 → 开通"一句话识别 / 录音文件识别"

---

## 📦 部署方案

### 方案一：GitHub Pages（免费，零成本）

仓库已内置 `.github/workflows/deploy.yml`，推送到 `main` 分支自动部署：

1. GitHub 仓库 → **Settings → Pages**
2. Source 选择 **GitHub Actions**
3. `git push origin main`，等几分钟即可通过 `https://<用户名>.github.io/Mulan/` 访问

> ⚠️ GitHub Pages 只有静态页面，不支持火山语音代理，安卓语音识别建议用浏览器内置或部署到有后端的服务器。

### 方案二：阿里云 ECS（推荐，全功能可用）

仓库 `deploy/` 目录提供完整的一键部署脚本：

```bash
# 1. 服务器初始化（首次使用，装 Node/Nginx/PM2）
./deploy/setup-server.sh root@<服务器公网IP>

# 2. 部署（每次代码更新后执行）
./deploy/deploy.sh root@<服务器公网IP>
```

部署完成后：
- 前端：`http://<服务器公网IP>`
- 语音代理接口：`http://<服务器公网IP>/api/asr`
- 后端服务由 PM2 守护，日志命令：`pm2 logs mulan-server`

### 方案三：GitHub Pages + 自建后端代理

免费托管前端 + 一台小服务器专门跑语音代理：
- 前端用方案一的 GitHub Pages
- 服务器只部署 Node.js 后端，在设置页填写代理服务器地址即可

---

## 🏗️ 技术架构

```
┌──────────────────────────────────────────┐
│              前端（React 18）              │
│  ┌─────────┐  ┌─────────┐  ┌──────────┐  │
│  │  页面层  │  │  状态层  │  │  数据持久化 │  │
│  │  pages/  │  │ store/  │  │ IndexedDB │  │
│  └─────────┘  └─────────┘  └──────────┘  │
│  ┌──────────────────────────────────────┐ │
│  │  utils/  ai · prompt · voice · db    │ │
│  └──────────────────────────────────────┘ │
└──────────────────┬───────────────────────┘
                   │ HTTPS
   ┌───────────────┴───────────────┐
   │                               │
┌──▼─────┐                ┌───────▼──────┐
│ 火山方舟 │                │  浏览器/火山  │
│ 豆包 API │                │   语音识别    │
└─────────┘                └──────────────┘
```

### 技术栈

| 分类 | 选型 |
|------|------|
| 框架 | React 18 + TypeScript |
| 构建 | Vite 6 |
| 样式 | Tailwind CSS 3 |
| 路由 | React Router 7 |
| 状态管理 | Zustand 5 |
| 本地存储 | IndexedDB（idb 库） |
| 配置存储 | LocalStorage |
| AI 服务 | 火山方舟 · 豆包轻量版 API |
| 语音识别 | Web Speech API + 火山引擎 ASR（后端代理兜底） |
| 后端代理 | Node.js + Express |
| 进程守护 | PM2 |
| 部署 | Nginx + GitHub Actions |

---

## 📁 项目结构

```
Mulan/
├── deploy/                    # 服务器部署脚本
│   ├── setup-server.sh        # 服务器初始化（Nginx/Node/PM2）
│   ├── deploy.sh              # 一键部署脚本
│   ├── nginx.conf             # Nginx 配置（静态 + API 反代）
│   └── ecosystem.config.js    # PM2 服务配置
├── public/                    # 静态资源（favicon 等）
├── src/
│   ├── pages/                 # 页面层
│   │   ├── HomePage.tsx       # 首页：灵感输入入口
│   │   ├── VoiceInputPage.tsx # 语音输入页
│   │   ├── TextInputPage.tsx  # 文字输入页
│   │   ├── CreationPage.tsx   # 创作页：启发对话 + 诗句编辑
│   │   ├── PoemsPage.tsx      # 诗集页：草稿列表 + 备份导入
│   │   ├── PoemDetailPage.tsx # 单首诗详情 + 导出
│   │   └── SettingsPage.tsx   # 设置页：API Key / 语音配置
│   ├── store/                 # 状态层（Zustand）
│   │   ├── useDraftStore.ts   # 草稿数据
│   │   └── useConfigStore.ts  # 用户配置
│   ├── types/                 # 类型定义
│   ├── utils/                 # 工具层
│   │   ├── ai.ts              # 豆包 AI 调用 + 缓存 + 错误处理
│   │   ├── prompt.ts          # 系统提示词（风格对齐 + 交互规则）
│   │   ├── voice.ts           # 语音识别（浏览器 + 代理降级）
│   │   ├── db.ts              # IndexedDB 草稿 CRUD
│   │   └── export.ts          # 导出/备份工具
│   └── data/                  # 用户专属数据
│       ├── user-poems.md      # 过往诗歌作品
│       └── user-style.ts      # 风格档案（意象/主题/语言特质）
├── skill.md                   # 产品交互规范与 AI 行为边界
├── PRD.md                     # 产品需求文档
├── server-http.js / server-https.js  # 本地调试服务器
└── vite.config.ts / tsconfig.json / tailwind.config.js
```

---

## 🎯 AI 创作规范（核心）

详见 [skill.md](./skill.md)，简要核心规则：

1. **用户主导**：只给话头，不替用户写成诗
2. **有限启发**：每轮仅 3 个方向，至少 1 个强关联输入
3. **近锚远伸**：锚定眼前具体事物，再延伸情绪/岁月/命运
4. **风格适配**：文学性仅比用户输入高半格，不说自己的话
5. **绝对禁止**：套话（人间烟火、岁月静好…）、文言典故、鸡汤、直接堆砌情绪词

---

## 📄 License

MIT License
