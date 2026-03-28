## v2.1.1 (2026-03-28) — 多语言国际化支持

### 🌍 多语言国际化 (i18n)
- **支持 6 种语言**：中文（默认）、English、日本語、한국어、Français、Español
- **轻量自研 i18n 模块**：零依赖，基于 localStorage 持久化语言偏好
- **翻译覆盖**：底部导航、首页、问候语、情绪标签、设置页、记录页、统计页等全部 UI 文本
- **设置页语言切换器**：3×2 网格按钮，点击即时切换并刷新页面生效
- 所有语言翻译均为人工润色，非机翻，自然地道

### 📝 文档更新
- README 版本号同步至 v2.1.1，新增多语言功能说明，项目结构新增 i18n 目录
- CHANGELOG 新增 v2.1.1 条目
- ARCHITECTURE 版本号同步，LocalStorage Key 表新增 `moodtrace_lang`
- TESTING 版本号同步

---

## v2.1.0 (2026-03-28) — 品牌升级 + 体验优化 + 后端重构

### 🏷️ 品牌升级
- **更名为「心迹 MoodTrace」**：全项目统一更名，包含页面标题、PWA manifest、文档、后端服务名

### ✨ 首页空状态重做
- **全新"一键体验完整功能"按钮**：渐变发光 CTA 按钮，带动态背景、功能亮点展示（AI 分析 / 热力图 / 隐私保护）
- 导入 365 天数据后自动解锁所有功能模块

### 🌐 前后端协作可视化
- **首页新增「今日群体情绪」卡片**：直接展示后端群体统计数据（情绪分布条 + 百分比）
- 评审打开首页即可看到前后端协作成果

### 📱 移动端体验优化
- **响应式媒体查询 hook**：`useMediaQuery` 替代 `window.innerWidth` 静态判断
- 窗口尺寸变化时视图模式自动适配

### 🔧 后端代码重构
- **Worker 代码模块化拆分**：单文件 → `routes/analyze.js` + `routes/stats.js` + `routes/backup.js` + `utils.js`
- 路由表清晰可读，便于维护和扩展

---

## v2.0.0 (2026-03-28) — 全面 UI 重做 + 年度报告升级 + 移动端优化

### 🎨 设计系统全面重做
- **卡片光晕边框**：`.card` 组件统一使用渐变描边（hover 时紫粉渐变显现），替代原来的简单 border
- **多色渐变文字**：`gradient-text` 从单色渐变升级为 5 色渐变 + shimmer 闪烁动画
- **情绪发光系统**：每种情绪新增 `glowColor`，今日卡片根据当前心情动态发光
- **动画系统扩展**：新增 `animate-card-flip`（卡片翻页）、`animate-float`（浮动）、`gradientShift`（渐变位移）

### 📊 年度报告完全重做（卡片翻页式叙事）
- **情绪环形图**：SVG 手绘环形图，5 种情绪按占比分段渲染，中心显示年度主旋律 emoji
- **情绪河流图**：Recharts stacked area chart，12 个月各情绪占比变化可视化
- **月度故事线**：时间轴布局，每月一句话总结情绪状态（"阳光灿烂的一个月" / "经历了一段低谷时光"等）
- **环形进度条**：年度均分和记录率使用 SVG 环形进度条展示
- **卡片入场动画**：每张卡片带 `animate-card-flip` + 递增延迟

### 🌈 情绪色彩系统升级
- 每种情绪新增 `gradient`（渐变色）、`colorLight`（浅色变体）、`glowColor`（发光色）
- Emoji 改为天气主题：🌧️ 非常低落、🌥️ 有点难过、🌤️ 一般般、☀️ 心情不错、🌈 超级开心
- 新增工具函数：`getMoodGradient()`、`getMoodGlow()`、`getMoodColorLight()`

### 🏠 首页体验升级
- **时间问候语**：根据当前时间显示"早安 ☀️" / "下午好 ☁️" / "夜深了 🌙" 等
- **情绪光晕卡片**：今日卡片根据已记录的情绪类型显示对应颜色的 glow 效果
- **记录按钮渐变**：使用当前情绪的渐变色，未记录时使用紫粉渐变
- 移动端默认月视图断点从 640px 调整为 768px

### 📱 热力图响应式优化
- 新增移动端格子尺寸常量（`CELL_SIZE_MOBILE=10`、`CELL_GAP_MOBILE=2`）
- `HeatmapTooltip` 和 `HeatmapCell` 支持动态尺寸（通过 props 传入）
- 移动端月份标签字号缩小到 8px，星期标签缩小到 7px

### 📝 文档全面更新
- README 全面重写：新增 ASCII 架构图、创新点量化对比、测试覆盖表、项目结构树
- package.json 版本号同步为 v2.0.0
- CHANGELOG 新增 v2.0.0 条目

### 🧪 测试
- 更新 HomePage 测试：适配新问候语 UI（日期 → 问候语）

---

## v1.9.2 (2026-03-24) — 情绪分析增强 + 低落关怀系统 + 云端备份

### 🔍 情绪分析引擎增强
- **新增反讽/阴阳怪气检测**：6 种模式识别
  - "呢"结尾 + 正面词 → 反讽（如"真好呢"）
  - "呵呵"独立出现 → 反讽
  - "真是太 X 了呢"结构 → 结构反讽
  - "好一个" + 正面词 → 反讽
  - "哈哈" + 负面 emoji → 情绪矛盾 → 反讽
- **新增网络用语/缩写支持**：yyds、emo、破防、蚌埠住了、摆烂、躺平、润了、人麻了、心态崩了等 20+ 条当代网络用语
- **危机关键词检测升级**：检测"想死"等关键词时直接触发最高级关怀，不等待连续天数

### 💛 低落关怀系统 (CaringCard)
- **3 级渐进式关怀**：Level 1（轻度 1-2 天）→ Level 2（中度 3-4 天）→ Level 3（重度 5+ 天）
- 根据连续低落天数和当前情绪强度动态升级
- Level 2+ 显示心理热线（400-161-9995、12320-5）
- Level 3 心理热线高亮显示，提示专业帮助
- 在 RecordPage 保存负面情绪后自动弹出
- 支持展开/收起建议列表

### ☁️ 云端备份
- Worker 新增 `POST /api/backup/save` 和 `GET /api/backup/restore`
- 前端新增 `backupService.js`：基于设备 ID 的无注册备份方案
- ProfilePage 新增云端备份 UI（上传/恢复/设备 ID 展示）
- 恢复时与本地数据合并，已有日期不覆盖

### 🏠 首页新增组件
- **KeywordCloud**：高频关键词云，按关联情绪着色
- **MiniTrend**：近 7 天情绪趋势迷你折线图

### 📝 文档
- 全部文档同步更新至 v1.9.2

---

## v1.9.1 (2026-03-22) — 群体数据修复 + 版本同步

### 🐛 Bug 修复
- **修复群体统计数据间歇性消失**：前端请求失败或限流时静默降级为本地数据，用户无感知。增加 sessionStorage 5 分钟缓存，减少 API 调用频次
- **修复群体虚拟数据不展示**：KV 中仅 3 条真实数据即跳过演示数据。改为真实数据不足 50 条时仍展示预置虚拟群体数据，评审演示更有保障
- **修复版本号不一致**：关于页面和 package-lock.json 版本号从 v1.8.0 更新为 v1.9.0（此前漏改）

### ⚡ 优化
- **Worker 限流放宽**：5 次/60秒 → 30 次/60秒，正常浏览切换不再触发 429
- **前端群体数据缓存**：sessionStorage 缓存 5 分钟，切换 Tab 不重复请求；刷新按钮绕过缓存强制更新
- **分支整合**：合并 feat/competition-upgrade 分支到 master，删除 gh-pages 和 feat/competition-upgrade 分支

### 📝 文档
- 全部 5 个文档同步更新至 v1.9.1

---

## v1.9.0 (2026-03-20) — 参赛优化版

### 📊 示例数据升级
- **默认从 60 天升级到 365 天**：demoData.js 默认生成一整年数据，完整支撑年度报告（12 个月趋势、年度关键词云、情绪图谱等）
- 首页新增**旧数据检测提示**：检测到 <300 条记录时显示黄色提示卡，一键导入 365 天数据

### 🌐 群体统计演示数据
- Worker 新增 `getDemoStats()` 函数：无真实数据时返回预置的模拟群体统计（~2800 人次）
- 确保评审时"群体"Tab 有内容可展示，不会看到空壳
- 支持当前月自动生成模拟数据

### 🔒 安全加固
- Worker 限流从 10 次/60秒收紧到 5 次/60秒，防止恶意刷数据

### ⚡ 性能优化
- Vite 构建新增 `manualChunks` 代码分割：recharts、react-router、date-fns、dompurify 分别拆包
- 首屏加载体积进一步优化

### 🔍 SEO 补全
- index.html 新增 Open Graph / Twitter Card / JSON-LD 结构化数据
- 新增 keywords、robots、author 等 SEO meta 标签
- 新增 mobile-web-app-capable 和 apple-touch-icon

### 📝 文档更新
- README 改写为参赛版本：用户故事 → 技术方案 → 架构图 → 功能列表
- 全部 5 个文档同步更新优化内容

---

## v1.8.0 (2026-03-17)

### 🤖 内置 AI 分析（零配置可用）
- **Workers AI 代理**：新增 `POST /api/analyze` 端点，通过 Cloudflare Workers 转发到 DeepSeek API
- **四级降级策略**：Workers 代理 → 用户自定义 API → 本地关键词分析，用户无需配置即可使用 AI
- **安全设计**：AI API Key 存储在 Workers 环境变量（wrangler secret），不暴露给前端
- 用户仍可在设置中配置自己的 API Key 覆盖默认

### 🔍 关键词分析引擎重构
- **分句加权分析**：按标点/空格分割句子，对每个分句独立分析后加权汇总
- **混合情绪处理**："虽然...但是..." 后半句权重 2.5x，前半句权重 0.5x
- **Emoji 情绪识别**：新增 50+ emoji 情绪映射（😀😢😭😡 等）作为额外分析信号
- **否定词扩展**：新增"远非""远没有""算不得""称不上"，检测窗口扩大到 10 字符
- **关键词库扩充**：正面 +15 词，负面 +10 词

### 📊 年度报告增强
- 新增 12 个月情绪趋势面积图
- 新增年度关键词云（flex 布局 + 颜色大小映射频率）
- 统计卡片数字增加 count-up 渐入动画
- 年度寄语更丰富（6 级情绪分档个性化文案）

### ✨ UI 微交互动画
- 记录成功：scale + color pulse 动画
- 今日卡片：hover 上浮效果
- 情绪 emoji 选中时弹跳动画
- 全部纯 CSS 实现，无新增依赖

### 📦 示例数据
- 新增 demoData.js（60 天模拟情绪数据生成器）
- 空状态提供"导入示例数据"按钮
- 数据模拟真实规律：工作日偏低、周末偏高、情绪连续性

### ♿ 无障碍 & 移动端
- 热力图触摸热区从 32px 扩大到 44px（WCAG 标准）
- 底部导航栏小屏幕更紧凑（h-14 → h-16 响应式）

### 🧪 测试
- emotionAnalyzer 测试：新增否定词(并非/远非/算不得)、混合情绪(虽然...但是...)、emoji、空输入、超长输入等 12 个用例
- storage 测试：新增 createdAt 保留、updatedAt 设置、delete 不影响其他记录、moodCounts 分布、getRecentRecords 等 8 个用例
- 新增 demoData.test.js：数据生成合理性、周末情绪倾向、字段完整性等 10 个用例
- 测试总数：99 → 129+

### 🔧 后端
- Workers 新增 `POST /api/analyze` 端点（DeepSeek 代理）
- wrangler.toml 更新 version → 1.2.0

---

## v1.7.2 (2026-03-13)

### 🐛 Bug 修复
- **修复 HomePage 重复 onClick**：今日卡片"记录/修改"按钮存在两个 `onClick` handler，第二个覆盖第一个，导致已记录时点"修改"不会携带 `&edit=true` 参数进入编辑模式。合并为一个 handler
- **修复加密模式下页面数据为空**：HomePage、StatsPage 使用同步 `getAllRecords()` 加载数据，加密模式下返回空数组导致页面空白。改为初始化时调用 `getAllRecordsAsync()` 异步加载，事件监听也改为异步刷新
- **修复加密模式下记录保存丢失**：RecordPage 使用同步 `saveRecord()` 和 `getRecordByDate()`，加密模式下读写全部失败。改为 `saveRecordAsync()` + `getAllRecordsAsync()` + 异步查找

### 🔧 优化
- HomePage/StatsPage 数据加载统一为"同步初始渲染 + 异步覆盖"模式，避免加密模式下首屏闪烁空白

---

## v1.7.1 (2026-03-10)

### 🐛 Bug 修复
- **修复 RecordPage 保存后跨页面数据不同步**：RecordPage 的 `handleSave` 缺少 `mood-record-updated` 事件派发，导致 HomePage 和 StatsPage 在保存记录后不会实时刷新，必须手动切换页面才能看到更新
- **修复 StatsPage `useMemo` 缓存失效**：`getAllRecords()` 每次渲染返回新数组引用，导致 `useMemo` 永远不命中缓存。改为 `useState` + `useEffect` 监听 `storage` 和 `mood-record-updated` 事件，与 HomePage 保持一致

### ✨ 新功能
- **新增 404 页面**：新增 `NotFound.jsx` 组件，路由添加 `path="*"` 兜底，访问不存在的路径时展示友好提示并引导回首页

### 🛡️ 安全增强
- **输入净化升级为 DOMPurify**：RecordPage 的 `sanitizeInput` 从手写正则替换 HTML 标签改为 `DOMPurify.sanitize(input, { ALLOWED_TAGS: [] })`，更彻底防御 XSS 注入

### 🔧 优化
- 首页"修改"按钮跳转时携带 `edit=true` 参数，RecordPage 检测到后自动进入编辑模式，无需滚动到底部找编辑键

---

## v1.7.0 (2026-03-07)

### 🔍 情绪分析增强
- **否定词库扩展**：新增 10+ 复合否定词（"不怎么"、"没那么"、"算不上"、"谈不上"、"说不上"、"不至于"、"不那么"等），总否定词数 25+
- **匹配窗口扩大**：关键词前检测窗口从 4 字符扩大到 6 字符，覆盖复合否定词
- **长词优先匹配**：否定词按长度降序匹配，避免 "不太" 优先于 "不怎么" 的误判
- **相对化表达弱化**：新增 `hasRelativeExpression`，"没那么难过"、"不至于崩溃" 等表达不再被极端化处理，情绪强度适度弱化
- **关键词库扩充**：正面 +15 词（知足、满足、欣慰、庆幸、有进步等），负面 +12 词（好烦、好累、心累、失眠、头疼等），中性 +4 词

### 🛡️ 防御性数据处理
- **storage.js 全面加固**：`getRecordByDate`、`getRecentRecords`、`getStats`、`getConsecutiveLowDays`、`getStreakDays`、`getMaxStreak` 共 6 个函数全部增加 try-catch + 类型校验
- **reminder.js 修复**：`hasRecordedToday` 对加密数据和格式错误增加防御，避免 JSON.parse 崩溃
- **数组边界检查**：遍历前增加 `Array.isArray` 校验，空数据安全返回默认值

### 📱 移动端体验优化
- **热力图触摸热区扩大**：HIT_SIZE 从 28px 提升到 32px，更易点击
- **触摸反馈**：SVG 格子增加 `touchStart/touchEnd` 事件支持，移动端点击有即时高亮反馈
- **消除点击延迟**：添加 `WebkitTapHighlightColor: 'transparent'`

### 📊 新增「年度报告」Tab
- 年度封面（情绪 emoji + 年份标题）
- 核心数据卡片（记录天数、年度均分、记录率、最佳连击）
- 年度主旋律（最常出现的情绪类型）
- 月度对比（最佳月份 vs 需要关怀月份）
- 年度情绪图谱（五级情绪分布条形图）
- 年度寄语（根据平均情绪给出个性化寄语）

### 🏠 首页体验优化
- 最近记录区域新增「查看全部 (N)」入口，链接到统计页

### 🧪 测试
- 全部 99 个测试通过，无新增失败

---

## v1.6.0 (2026-03-05)

### 🔒 安全增强
- **API Key 加密存储**：新增 `secureKeyGet`/`secureKeySet`，API Key 改用 AES-256-GCM 加密后存入 localStorage
- **emotionAnalyzer 和 ProfilePage** 统一使用加密 API Key 读写，自动兼容旧明文并迁移
- **RecordPage sanitizeInput 增强**：增加零宽字符和控制字符过滤
- **HomePage 用户文本渲染**：增加长度截断防止超长文本

### 🌐 部署兼容
- **vite.config.js base 动态化**：读取 `VITE_BASE_URL` 环境变量，支持 Cloudflare Pages / GitHub Pages / Vercel

### 🎨 UI/UX 修复
- **暗色主题对比度提升**：text/text-secondary/tertiary/muted 四级亮度全部上调
- **Service Worker v3**：API 请求不走缓存，离线返回 503
- **Onboarding 隐私说明**：补充匿名统计可关闭说明

### ⚙️ 工程改进
- **CI 增加 test job**：测试通过后才部署
- **README 精简重写**
- 版本号 → v1.6.0

---


## v1.5.0 (2026-03-04)

### 🐛 Bug 修复
- **修复加密模式下数据为空的致命 Bug**：开启 AES-256-GCM 加密后，`getAllRecords()` 同步方法返回空数组，导致首页热力图、统计页、设置页全部清空。引入 `_recordsCache` 内存缓存机制，`saveRecord` 同步更新缓存，彻底解决加密模式下同步读取为空的问题
- **修复记录 ID 碰撞风险**：`Date.now().toString()` 在同一秒多次操作时可能重复，改用 `crypto.randomUUID()` 生成全局唯一 ID
- **修复 AI 返回值解析崩溃**：部分 AI 模型会在 JSON 外包裹 markdown 代码块（` ```json ``` `），`JSON.parse` 直接报错。新增预处理去除代码块包裹 + try-catch 容错
- **修复导出数据在加密模式下为空**：`exportData()` 原先直接读 localStorage，加密后读到的是密文。改为异步读取 `getAllRecordsAsync()` 先解密再导出

### ♻️ 重构
- **HeatmapCalendar 组件拆分**：从 400+ 行单文件拆为 `HeatmapTooltip` + `HeatmapCell` + 主组件三个模块，降低复杂度，提升可维护性
- **ProfilePage 弹窗系统**：用自定义 `ConfirmModal` + `Toast` 组件替代原生 `confirm()`/`alert()`，移动端体验更好，支持动画和自定义样式
- **storage.js 缓存架构**：新增 `_recordsCache` / `_cacheDirty` 内存缓存 + `invalidateCache()` 接口，统一同步/异步数据读写路径
- **导出功能异步化**：`exportData()` 改为 async 函数，优先使用 `getAllRecordsAsync()` 解密数据

### ⚡ 体验优化
- 按钮添加 `active:scale` 触摸反馈（热力图年份导航、滚动按钮）
- SVG 格子添加 `opacity 0.15s ease` 过渡动画
- 新增 `animate-scale-in`、`animate-slide-down` CSS 动画类
- apiService 支持 `VITE_API_BASE` 环境变量，部署时无需修改源码

### 🧪 测试
- 新增 `HomePage.test.jsx` — 7 个渲染/交互测试（标题、今日卡片、视图切换、最近记录、设置按钮）
- 新增 `RecordPage.test.jsx` — 12 个交互测试（输入框、手动选择、字符计数、已有记录、XSS 过滤、日期导航）
- 测试 setup 补充 `window.matchMedia` mock
- 测试总数：80 → 99（+23.75%）

---

## v1.4.0 (2026-03-03)

### ✨ 新功能
- **否定词检测**：本地关键词分析引擎新增 15 个否定词识别
  - 支持：不、没、不太、没有、不是、不会、别、从不、绝不、毫不、毫无、并非、再也不、不再、无法
  - 在关键词前 4 字符窗口内检测否定修饰，自动翻转情绪判定
  - 示例：`"不开心"` → negative（之前错误判定为 positive）
  - 支持混合情况：`"有点不开心但整体还不错"` → 取正向词结果
- **本地数据加密**：新增 AES-256-GCM 加密存储（Web Crypto API）
  - 新增 `src/utils/crypto.js` 加密工具模块
  - 设置页新增「本地数据加密」开关，一键开启并自动迁移
  - 加密后的数据在浏览器 DevTools 中不可直接读取明文
- **分析错误提示**：RecordPage 新增 Toast 错误提示
  - 分析失败时显示红色提示条，4 秒自动消失
- **API Key 安全提示**：ProfilePage AI 配置区域新增安全警告
  - 提醒用户使用子密钥、数据仅存本地

### 🔧 优化
- storage.js 新增异步接口：`getAllRecordsAsync()`、`saveRecordAsync()`
- storage.js 新增加密管理：`isEncryptionEnabled()`、`enableEncryption()`、`decryptForExport()`

### 🧪 测试
- 新增 6 个否定词检测测试用例（不开心、不太开心、没有开心、并不开心、好难过、今天很开心）
- 测试总数：74 → 80

---

## v1.3.0 (2026-03-02)

### ✨ 新功能
- StatsPage 全面引入 Recharts 可视化图表库
  - 情绪分布饼图（带交互式 Tooltip）
  - 近 30 天心情趋势面积图（渐变填充 + 自定义数据点）
  - 每周心情节律柱状图（按星期几分析情绪波动）
  - 月度心情均值柱状图（6 个月趋势对比）
- 新增「群体」统计 Tab
  - 群体情绪分布饼图 + 平均心情
  - 「我 vs 群体」对比卡片
- Worker 后端新增 3 个 API
  - GET /api/stats/trends — 多月群体趋势
  - GET /api/stats/keywords — 关键词热度排行
  - 提交接口支持 keywords 参数（用于热度统计）
- Worker 后端新增 IP 限流（60s/10 次）

### ⚡ 性能优化
- React.lazy + Suspense 路由懒加载
- 首屏 JS 从 329KB 降至 ~195KB（gzip 102KB → 62KB）
- StatsPage（含 Recharts）独立 chunk，按需加载

### 🔧 其他
- RecordPage 保存时附带关键词提交到后端
- apiService 新增 fetchMoodTrends、fetchKeywordRanking 方法

---

## v1.2.0 (2026-03-02)

### ✨ 新功能
- 新增 Cloudflare Workers 后端（匿名情绪统计 API）
  - POST /api/stats/submit — 匿名提交情绪数据
  - GET /api/stats/summary — 群体情绪统计查询
  - GET /api/health — 健康检查
  - Cloudflare KV 按月聚合存储
- 新增 apiService.js 前端 API 服务
- 新增设置页「匿名统计」开关
- 记录保存时自动匿名提交到后端

### 🧪 测试
- 新增 apiService.test.js（10 个测试）
- 新增 reminder.test.js（8 个测试）
- 新增 emotionAnalyzer.edge.test.js（12 个测试）
- 测试总数：44 -> 50+
- 新增 V8 Coverage 覆盖率配置

### 📝 文档
- README 新增：项目演示区、创新点表格、后端部署指南、架构图更新
- PROJECT.md 更新：技术架构、隐私保护、创新点、作品特色
- TECHNICAL.md 更新：技术栈、架构图、测试覆盖表、部署方案
- ARCHITECTURE.md 更新：设计理念、架构图、数据流、部署架构

---

## v1.1.0 (2026-03-01)

### 🐛 Bug 修复
- 修复统计分析页面数据为空的致命 Bug（localStorage key 不匹配）
- 修复首页设置按钮点击无反应（路由路径错误）
- 修复 Service Worker 重复注册导致的控制台警告
- 默认 AI API 端点从内部地址改为通用 OpenAI 兼容格式

### ♻️ 重构
- StatsPage 统一使用 storage 服务函数，消除代码重复
- storage.js 新增 `getMaxStreak()` 函数

### 📝 文档
- 完善 README.md：添加技术架构图、功能列表、部署说明
- 新增技术架构文档 (`docs/ARCHITECTURE.md`)
- 新增 MIT LICENSE

### 🧪 测试
- 新增 11 个单元测试
- 测试总数：33 → 44 (+33%)
- 新增覆盖：getMaxStreak、getStreakDays 边界、getConsecutiveLowDays

---

## v1.0.0 (2026-03-01)

### ✨ 核心功能
- 每日情绪记录（一句话记录）
- AI 情绪分析（关键词 + OpenAI 兼容 API 双轨策略）
- 情绪热力图日历（年视图 + 月视图）
- 多维度统计分析（总览/趋势/月度）
- 低落预警（连续 3 天触发关怀提示）
- 新用户引导（4 步交互式 Onboarding）
- 每日提醒通知
- 数据导入/导出（JSON）
- PWA 支持（离线缓存 + 可安装）
- 深色/浅色主题
- 无障碍支持（WCAG 标准）
