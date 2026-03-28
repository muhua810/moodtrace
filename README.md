# 心迹 — AI 驱动的情绪追踪与心理健康可视化

> 📌 **当前版本**: v2.1.1 | **更新日期**: 2026-03-28
>
> 🏆 **中国大学生计算机设计大赛 · 软件应用与开发赛道**参赛作品
>
> 🔗 **在线体验**: https://moodtrace.pages.dev

---

## 💡 项目背景

当代大学生面临学业、就业、人际关系等多重压力，心理健康问题日益受到关注。然而大多数心理自助工具门槛高、缺洞察、隐私堪忧。**心迹**用「一句话记录 + AI 自动分析 + 可视化洞察」的方式，让心理健康自我管理变得简单。

## ✨ 核心功能

- ✍️ **每日情绪记录** — 一句话描述今日感受，3 秒完成
- 🤖 **AI 情绪分析** — 四级降级策略：Workers AI → 用户 API → 本地关键词引擎 → 统计分析器
- 📊 **情绪热力图日历** — 自研 SVG 组件，GitHub 贡献图风格，年/月双视图
- 📈 **多维度统计** — 饼图/趋势图/柱状图 + 年度报告 + 工作日/周末分析
- 💛 **渐进式关怀** — 3 级关怀系统 + 危机关键词检测 + 心理援助热线
- 🔒 **隐私优先** — 纯前端存储 + AES-256-GCM 加密，数据不出设备
- 🌐 **群体情绪统计** — 首页展示群体情绪分布，前后端协作一目了然
- 📱 **PWA 支持** — 离线缓存、可安装到手机桌面
- ☁️ **云端备份** — 基于设备 ID 的无注册备份/恢复
- 🌍 **多语言支持** — 中/英/日/韩/法/西 6 种语言，设置页一键切换

## 🛠️ 技术栈

| 层面 | 技术 | 说明 |
|------|------|------|
| 框架 | React 19 + Vite 8 | 最新技术栈 |
| 路由 | React Router v7 | 懒加载 + 代码分割 |
| 样式 | Tailwind CSS v4 | 原子化 CSS + 自定义设计系统 |
| 图表 | 自研 SVG 热力图 + Recharts | 零依赖热力图 + 丰富图表 |
| 后端 | Cloudflare Workers + KV | 边缘计算 + 全球分发 |
| 测试 | Vitest + Testing Library | 130+ 用例 |
| 安全 | Web Crypto API (AES-256-GCM) | 浏览器原生加密 |
| 部署 | Cloudflare Pages + Workers | 自动 CI/CD |

## 📚 文档

| 文档 | 说明 |
|------|------|
| [PROJECT.md](docs/PROJECT.md) | 项目说明书 — 选题背景、功能介绍、技术方案、作品特色 |
| [TECHNICAL.md](docs/TECHNICAL.md) | 技术文档 — 核心算法、数据结构、PWA、安全设计 |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | 架构文档 — 系统分层、设计决策、部署架构 |
| [REQUIREMENTS.md](docs/REQUIREMENTS.md) | 需求分析 — 用户画像、功能需求、竞品分析 |
| [TESTING.md](docs/TESTING.md) | 测试报告 — 测试用例清单、兼容性、性能数据 |
| [CHANGELOG.md](docs/CHANGELOG.md) | 版本更新日志 |

## 🚀 快速开始

```bash
# 克隆项目
git clone https://github.com/muhua810/moodtrace.git
cd moodtrace

# 安装依赖
npm install

# 启动开发服务器
npm run dev        # → http://localhost:3000

# 运行测试
npm test                    # 一次性运行
npm run test:coverage       # 覆盖率报告

# 构建
npm run build
```

## 📁 项目结构

```
moodtrace/
├── src/
│   ├── components/        # UI 组件（热力图、关怀卡片、关键词云等）
│   ├── pages/             # 页面（首页、记录、统计、设置）
│   ├── services/          # 业务逻辑（情绪分析引擎、存储、API、备份）
│   ├── utils/             # 工具函数（加密、情绪类型）
│   ├── i18n/              # 国际化（翻译字典 + 工具模块，6 种语言）
│   └── contexts/          # React Context（主题切换）
├── worker/                # Cloudflare Worker 后端
├── docs/                  # 项目文档 + SVG 架构图
└── public/                # PWA 静态资源 + 图标
```

## 📄 License

MIT
