# 情绪日历 — AI 驱动的情绪追踪与心理健康可视化

> 📌 **当前版本**: v1.9.1 | **更新日期**: 2026-03-27

> 🏆 中国大学生计算机设计大赛 · 软件应用与开发赛道参赛作品
>
> 🔗 在线体验：https://mood-calendar-5by.pages.dev

---

## 💡 项目背景

当代大学生面临学业、就业、人际关系等多重压力，心理健康问题日益受到关注。然而，大多数心理自助工具存在以下痛点：

- **门槛太高**：传统情绪日记需要长篇书写，很难坚持
- **缺乏洞察**：只记录不分析，用户看不到情绪规律
- **隐私顾虑**：情绪数据上传云端，用户不放心

**情绪日历**的解决方案：**每天一句话记录心情，AI 自动分析情绪，生成可视化日历，帮助用户建立情绪觉察习惯。**

## ✨ 核心功能

| 功能 | 说明 |
|------|------|
| ✍️ **每日情绪记录** | 一句话描述今日感受，支持中文自然语言输入 |
| 🤖 **AI 情绪分析** | 三级降级策略：Workers AI 代理 + 140+ 关键词引擎 + 29 否定词 + Emoji 映射 + 分句加权 |
| 📊 **情绪热力图日历** | 自研 SVG 组件，GitHub 贡献图风格，年/月双视图 |
| 📈 **多维度统计** | 饼图/趋势图/柱状图 + 工作日/周末分析 + 年度报告 |
| ⚠️ **低落预警** | 连续 3 天低落自动触发关怀提示 + 心理热线 |
| 🔒 **隐私优先** | 纯前端 + AES-256-GCM 加密存储，数据不出设备 |
| 📱 **PWA 支持** | 离线缓存、可安装到手机桌面 |
| ♿ **无障碍** | 44px 触摸热区、键盘操作、屏幕阅读器兼容 |

## 🔬 技术创新

### 创新点 1：中文情绪三级分析 + 分句加权

传统情绪分析要么依赖云端 AI（需要 API Key、有延迟），要么依赖简单关键词匹配（准确率低）。本项目实现了**零配置可用的智能分析引擎**：

```
用户输入 → Workers AI 代理 (DeepSeek)
            ↓ 失败
        用户自定义 API
            ↓ 失败
        本地关键词引擎（140+ 关键词 + 29 否定词 + Emoji + 分句加权）
```

**分句加权算法**是核心创新：
- 检测"虽然…但是…"反转模式，后半句权重 2.5x
- 否定词检测窗口 10 字符，长词优先匹配（"谈不上" > "不"）
- 相对化表达弱化（"没那么难过"→ 回调为 negative 而非 very_negative）

```javascript
// 示例：「虽然今天很累，但是完成了任务很开心」
// → 检测到反转模式
// → "很累"权重 0.5x，"很开心"权重 2.5x
// → 结论：positive（心情不错）
```

### 创新点 2：GitHub 贡献图风格情绪热力图

自研 SVG 组件，不依赖第三方图表库，复用开发者社区熟悉的视觉语言：
- 12 个月标签 + 7 行星期标签
- 年/月双视图切换
- 选中发光效果 + Tooltip 浮层
- 44px 触摸热区（WCAG 标准）

### 创新点 3：连续低落预警 + 人文关怀

检测连续 3 天负面情绪，自动弹出关怀提示并提供心理援助热线（400-161-9995）。这不是技术炫技，而是**用代码传递温度**。

## 🏗️ 技术架构

```
┌────────────────────────────────────────────┐
│              用户浏览器                      │
│  React 19 + React Router v7 + Tailwind v4  │
│  ┌──────────────────────────────────────┐  │
│  │  组件层：HomePage / RecordPage / …   │  │
│  └──────────────┬───────────────────────┘  │
│  ┌──────────────┴───────────────────────┐  │
│  │  服务层：emotionAnalyzer / storage    │  │
│  └──────┬──────────────┬────────────────┘  │
│  ┌──────┴────┐  ┌──────┴──────┐           │
│  │ 关键词引擎 │  │ AES-256-GCM │           │
│  │ (本地分析) │  │ 加密存储     │           │
│  └───────────┘  └─────────────┘           │
└─────────────────────┼──────────────────────┘
                      │ HTTPS
                      ▼
┌────────────────────────────────────────────┐
│        Cloudflare Worker (边缘计算)         │
│  POST /api/analyze     — AI 分析代理       │
│  POST /api/stats/submit — 匿名统计         │
│  GET  /api/stats/summary — 群体统计        │
│  ┌──────────────────────────────────────┐  │
│  │         Cloudflare KV                │  │
│  └──────────────────────────────────────┘  │
└────────────────────────────────────────────┘
```

## 🛠️ 技术栈

| 层面 | 技术 |
|------|------|
| 框架 | React 19 + Vite 8 |
| 路由 | React Router v7 |
| 样式 | Tailwind CSS v4 |
| 图表 | 自研 SVG 热力图 + Recharts |
| 后端 | Cloudflare Workers + KV |
| 测试 | Vitest + Testing Library (130+ 用例) |
| 安全 | Web Crypto API (AES-256-GCM) |
| 部署 | Cloudflare Pages + Workers |

## 📁 项目结构

```
src/
├── components/           # 公共组件
│   ├── Layout.jsx        # 底部导航布局 + Toast
│   ├── HeatmapCalendar.jsx  # SVG 情绪热力图（自研）
│   ├── MonthCalendar.jsx    # 月历视图
│   ├── ErrorBoundary.jsx    # 错误边界
│   └── Onboarding.jsx       # 新用户引导
├── pages/
│   ├── HomePage.jsx      # 首页 Dashboard
│   ├── RecordPage.jsx    # 情绪记录页
│   ├── StatsPage.jsx     # 统计分析（5 个 Tab）
│   ├── ProfilePage.jsx   # 设置页
│   └── NotFound.jsx      # 404 兜底
├── services/
│   ├── emotionAnalyzer.js   # 情绪分析引擎
│   ├── storage.js           # 加密本地存储
│   ├── apiService.js        # 后端 API 服务
│   ├── reminder.js          # 每日提醒
│   └── demoData.js          # 示例数据生成器
├── utils/
│   ├── moodUtils.js         # 情绪类型定义
│   └── crypto.js            # AES-256-GCM 加密
└── test/                    # 单元测试 (130+)
```

## 🚀 快速开始

```bash
# 克隆项目
git clone https://github.com/muhua810/mood-calendar.git
cd mood-calendar

# 安装依赖
npm install

# 启动开发服务器
npm run dev        # → http://localhost:3000

# 运行测试
npm test           # 一次性运行
npm run test:coverage  # 覆盖率报告

# 构建
npm run build
```

### 部署

```bash
# 前端（Cloudflare Pages）
wrangler pages deploy dist --project-name=mood-calendar

# 后端（Cloudflare Workers）
cd worker
wrangler kv namespace create MOOD_STATS
wrangler deploy
```

## 🧪 测试

| 模块 | 覆盖 |
|------|------|
| emotionAnalyzer | 关键词匹配、否定词、分句加权、Emoji、AI 降级 |
| storage | CRUD、加密迁移、缓存一致性、异常处理 |
| demoData | 数据完整性、日期连续性、情绪分布合理性 |

## 📊 用户价值

- **低门槛**：一句话记录，3 秒完成
- **智能分析**：零配置可用，离线也能分析
- **可视化洞察**：热力图 + 统计图表，发现情绪规律
- **人文关怀**：低落预警 + 心理热线，用代码传递温度
- **隐私安全**：数据不出设备，可选 AES 加密

## 📄 License

MIT
