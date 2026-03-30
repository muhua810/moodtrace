# 贡献指南

感谢你对心迹（MoodTrace）的关注！以下是参与开发的指南。

## 开发环境

- **Node.js**: >= 22.x
- **包管理器**: npm
- **浏览器**: Chrome / Firefox / Safari / Edge 最新版本

## 快速开始

```bash
# 克隆项目
git clone https://github.com/muhua810/moodtrace.git
cd moodtrace

# 安装依赖
npm install

# 启动开发服务器（http://localhost:3000）
npm run dev

# 运行测试
npm test

# 运行测试（监听模式）
npm run test:watch

# 运行测试覆盖率
npm run test:coverage
```

## 项目结构

```
moodtrace/
├── src/
│   ├── components/       # UI 组件
│   ├── pages/            # 页面组件
│   ├── services/         # 业务逻辑
│   │   ├── analyze/      # 情绪分析子模块（关键词、emoji、反讽、否定词）
│   │   ├── emotionAnalyzer.js   # 四层降级分析主入口
│   │   ├── statisticalAnalyzer.js  # TF-IDF + 朴素贝叶斯
│   │   ├── aiService.js         # AI 调用（Workers 代理 + 用户 API）
│   │   ├── storage.js           # 本地存储（支持 AES-256-GCM 加密）
│   │   └── insightEngine.js     # 情绪洞察引擎
│   ├── utils/            # 工具函数
│   ├── i18n/             # 国际化（6 种语言）
│   ├── hooks/            # 自定义 Hooks
│   ├── contexts/         # React Context
│   └── test/             # 测试文件
├── worker/               # Cloudflare Worker 后端
│   └── src/
│       ├── index.js      # 入口 + 路由分发
│       ├── utils.js      # CORS、限流工具
│       └── routes/       # 路由处理器
├── docs/                 # 项目文档 + SVG 架构图
├── public/               # PWA 静态资源
└── .github/workflows/    # CI/CD
```

## 开发规范

### 代码风格

- 使用 ES Module（`import/export`）
- 组件使用函数式 + Hooks
- 文件名：组件用 PascalCase，工具/服务用 camelCase
- 优先使用已有工具函数，避免重复实现

### 提交规范

使用语义化提交信息：

```
feat: 新增功能
fix: 修复 Bug
docs: 文档更新
refactor: 重构（不改变功能）
test: 测试相关
chore: 构建/工具相关
```

示例：
```
feat: 新增反讽检测模式
fix: 修复否定词部分匹配逻辑
docs: 更新技术文档
```

### 测试

- 核心模块（emotionAnalyzer、storage、keywords）必须保持 90%+ 覆盖率
- 新增功能必须附带测试用例
- 运行 `npm test` 确保所有测试通过再提交

### 情绪分析引擎

修改分析相关代码时请注意：

- `src/services/analyze/keywords.js` — 关键词规则库，按 score 分级
- `src/services/analyze/negation.js` — 否定词检测，窗口 10 字符
- `src/services/analyze/sarcasm.js` — 反讽模式检测
- `src/services/analyze/emojiMap.js` — Emoji 情绪映射
- `src/services/statisticalAnalyzer.js` — TF-IDF + 朴素贝叶斯兜底

修改后运行专项测试：
```bash
npx vitest run src/test/emotionAnalyzer.test.js
npx vitest run src/test/sarcasmAndSlang.test.js
npx vitest run src/test/accuracy.test.js
```

### Worker 后端

```bash
# 本地开发（需要 wrangler）
cd worker
npx wrangler dev

# 部署
npx wrangler deploy
```

## 常见问题

### Q: 测试中的 crypto.randomUUID 报错？
确保测试环境支持 Web Crypto API。Vitest 的 jsdom 环境可能需要手动 mock，项目 `src/test/setup.js` 已处理。

### Q: 如何新增一种语言支持？
1. 在 `src/i18n/translations.js` 中添加翻译条目
2. 确保所有 key 都有对应翻译
3. 在 `src/i18n/index.js` 的 `getSupportedLangs()` 中添加语言选项

## License

MIT
