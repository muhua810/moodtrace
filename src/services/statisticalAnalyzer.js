/**
 * 统计学习情绪分析器（TF-IDF + 朴素贝叶斯）
 *
 * 设计思路：
 * 1. 内置标注训练语料（5 类情绪 × 每类 40+ 句子）
 * 2. 中文分词：字符 bigram + unigram 混合
 * 3. TF-IDF 特征提取
 * 4. 多项式朴素贝叶斯分类
 * 5. 支持增量学习（用户反馈后动态调整）
 *
 * 作为关键词引擎的上层替代方案，在关键词无法覆盖的场景提供更好的泛化能力
 */

import { MOOD_TYPES } from '../utils/moodUtils'
import { t } from '../i18n'

const MOOD_KEY_MAP = {
  1: 'very_negative',
  2: 'negative',
  3: 'neutral',
  4: 'positive',
  5: 'very_positive',
}

// ============ 标注训练语料 ============
const TRAINING_CORPUS = [
  // very_negative (score=1)
  { text: '今天彻底崩溃了，感觉天都塌了', label: 1 },
  { text: '失眠一整夜，难受得想死', label: 1 },
  { text: '考试挂了，完了完了全完了', label: 1 },
  { text: '被分手了，心碎了一地', label: 1 },
  { text: '今天是最糟糕的一天，什么都不想做', label: 1 },
  { text: '被所有人抛弃了，活着没意思', label: 1 },
  { text: '失去了一切，万念俱灰', label: 1 },
  { text: '彻底绝望了，看不到任何希望', label: 1 },
  { text: '今天太痛苦了，痛不欲生', label: 1 },
  { text: '完全崩溃，不想面对任何人', label: 1 },
  { text: '从来没有这么难受过，撕心裂肺', label: 1 },
  { text: '生无可恋，什么都不重要了', label: 1 },
  { text: '今天遭遇了人生最大的打击', label: 1 },
  { text: '噩耗传来，整个人都呆住了', label: 1 },
  { text: '感觉要窒息了，真的受不了了', label: 1 },
  { text: '最难的一天，哭到没有眼泪', label: 1 },
  { text: '一切都在崩塌，我撑不住了', label: 1 },
  { text: '今天出了大事，我无法接受', label: 1 },
  { text: '绝望透顶，不想再坚持了', label: 1 },
  { text: '天塌下来的感觉，没人能帮到我', label: 1 },
  { text: '被背叛了，心里好苦', label: 1 },
  { text: '今天真的好想哭，停不下来', label: 1 },
  { text: '所有事情都搞砸了，我是废物', label: 1 },
  { text: '今天特别特别难过，无法形容', label: 1 },
  { text: '发生了一件让我无法接受的事情', label: 1 },
  { text: '感觉被全世界抛弃了', label: 1 },
  { text: '今天跌入了人生最低谷', label: 1 },
  { text: '心如刀割，难以呼吸', label: 1 },
  { text: '完全看不到出路在哪里', label: 1 },
  { text: '今天遭遇了晴天霹雳', label: 1 },
  { text: '感觉人生到了尽头', label: 1 },
  { text: '今天是最黑暗的一天', label: 1 },
  { text: '从未如此绝望过', label: 1 },
  { text: '今天的打击太大了', label: 1 },
  { text: '一切都完了', label: 1 },
  { text: '不想活了，活着好累', label: 1 },
  { text: '今天的痛苦无法用语言形容', label: 1 },
  { text: '心碎的感觉太难受了', label: 1 },
  { text: '好像掉进了深渊爬不出来', label: 1 },
  { text: '今天特别崩溃，一直哭', label: 1 },

  // negative (score=2)
  { text: '今天有点累，工作压力很大', label: 2 },
  { text: '心情不太好，有些烦躁', label: 2 },
  { text: '被老师批评了，有点难过', label: 2 },
  { text: '计划没完成，有点沮丧', label: 2 },
  { text: '睡眠不足，好困好累', label: 2 },
  { text: '和朋友发生了矛盾', label: 2 },
  { text: '有点焦虑，担心明天的考试', label: 2 },
  { text: '今天效率很低，心情烦', label: 2 },
  { text: '想家了，有些孤独', label: 2 },
  { text: '遇到一些麻烦事，不太顺利', label: 2 },
  { text: '今天状态不好，浑身没劲', label: 2 },
  { text: '感觉压力山大，喘不过气', label: 2 },
  { text: '今天被误解了，心里委屈', label: 2 },
  { text: '和室友闹了点不愉快', label: 2 },
  { text: '今天有点丧，什么都不想做', label: 2 },
  { text: '感觉很疲惫，身心俱疲', label: 2 },
  { text: '今天心情很低落', label: 2 },
  { text: '有点担心自己的未来', label: 2 },
  { text: '今天遇到了很多不顺的事', label: 2 },
  { text: '感觉好孤单，想找人说话', label: 2 },
  { text: '今天很郁闷，不知道为什么', label: 2 },
  { text: '最近压力好大，快撑不住了', label: 2 },
  { text: '今天被忽视了，感觉不被重视', label: 2 },
  { text: '有点紧张，明天要上台演讲', label: 2 },
  { text: '今天感到有些迷茫', label: 2 },
  { text: '工作太多做不完，好烦', label: 2 },
  { text: '今天心情不太好', label: 2 },
  { text: '感觉自己什么都做不好', label: 2 },
  { text: '有点害怕考试结果', label: 2 },
  { text: '今天有点自闭，不想说话', label: 2 },
  { text: '最近情绪不太好', label: 2 },
  { text: '今天特别累，回家就睡了', label: 2 },
  { text: '有点担心下周的面试', label: 2 },
  { text: '今天觉得好辛苦', label: 2 },
  { text: '心情有点down', label: 2 },
  { text: '今天被拒绝了，不太开心', label: 2 },
  { text: '感觉好疲惫啊', label: 2 },
  { text: '今天有点难过', label: 2 },
  { text: '最近心情不太好，有些消沉', label: 2 },
  { text: '今天过得不太好', label: 2 },

  // neutral (score=3)
  { text: '今天一切正常，没什么特别的', label: 3 },
  { text: '平淡的一天，就这样过吧', label: 3 },
  { text: '按时完成了工作，还行', label: 3 },
  { text: '今天很安静，没什么想法', label: 3 },
  { text: '普通的一天，记录一下', label: 3 },
  { text: '一切如常，日子照旧', label: 3 },
  { text: '今天没啥特别的事', label: 3 },
  { text: '平平淡淡，也挺好的', label: 3 },
  { text: '照常上课下课，没什么变化', label: 3 },
  { text: '今天天气一般，心情也一般', label: 3 },
  { text: '没什么波澜，就这样吧', label: 3 },
  { text: '正常的一天', label: 3 },
  { text: '今天和往常一样', label: 3 },
  { text: '没什么好说的，正常过', label: 3 },
  { text: '今天的节奏很平稳', label: 3 },
  { text: '一切照旧', label: 3 },
  { text: '过得去吧，不好不坏', label: 3 },
  { text: '普通日子，没啥起伏', label: 3 },
  { text: '今天做了一些常规的事情', label: 3 },
  { text: '安静的一天，很平静', label: 3 },
  { text: '今天中规中矩', label: 3 },
  { text: '没有特别的事发生', label: 3 },
  { text: '今天的节奏比较慢', label: 3 },
  { text: '如常度过，没什么大不了的', label: 3 },
  { text: '今天没有特别开心也没有不开心', label: 3 },
  { text: '日子就这样一天天过', label: 3 },
  { text: '今天跟昨天差不多', label: 3 },
  { text: '没有什么特别值得记录的', label: 3 },
  { text: '正常运转的一天', label: 3 },
  { text: '今天过得比较佛系', label: 3 },
  { text: '无功无过', label: 3 },
  { text: '今天还行吧', label: 3 },
  { text: '马马虎虎的一天', label: 3 },
  { text: '没有大事也没有小事', label: 3 },
  { text: '今天照常', label: 3 },
  { text: '一天就这样过去了', label: 3 },
  { text: '没什么情绪波动', label: 3 },
  { text: '过得一般般', label: 3 },
  { text: '今天也是一天', label: 3 },
  { text: '没什么可写的', label: 3 },

  // positive (score=4)
  { text: '今天天气不错，心情挺好的', label: 4 },
  { text: '工作顺利，效率很高', label: 4 },
  { text: '吃到了好吃的，满足', label: 4 },
  { text: '和朋友聊了天，感觉温暖', label: 4 },
  { text: '完成了今天的计划，有点小骄傲', label: 4 },
  { text: '看了一部好电影，推荐给大家', label: 4 },
  { text: '今天运动了一下，感觉很轻松', label: 4 },
  { text: '收到了小礼物，很惊喜', label: 4 },
  { text: '学到了新东西，有进步', label: 4 },
  { text: '早睡早起，状态很好', label: 4 },
  { text: '今天被夸了，有点开心', label: 4 },
  { text: '和家人视频了，心里暖暖的', label: 4 },
  { text: '今天的课很有趣', label: 4 },
  { text: '做了一件有意义的事', label: 4 },
  { text: '今天运气不错', label: 4 },
  { text: '顺利完成了一个项目', label: 4 },
  { text: '今天遇到了好心人', label: 4 },
  { text: '和朋友一起吃了饭，聊得很开心', label: 4 },
  { text: '今天的夕阳很好看', label: 4 },
  { text: '完成了一件一直想做的事', label: 4 },
  { text: '今天心情不错', label: 4 },
  { text: '天气好心情也好', label: 4 },
  { text: '今天效率很高，完成了不少事情', label: 4 },
  { text: '收到了好消息', label: 4 },
  { text: '今天的尝试成功了', label: 4 },
  { text: '和朋友一起度过了愉快的下午', label: 4 },
  { text: '今天充实而有意义', label: 4 },
  { text: '听了一首好听的歌', label: 4 },
  { text: '今天状态不错，做事很顺利', label: 4 },
  { text: '买到了喜欢的东西', label: 4 },
  { text: '今天过得挺舒服的', label: 4 },
  { text: '今天的成果让自己满意', label: 4 },
  { text: '和喜欢的人说了话', label: 4 },
  { text: '今天的小确幸', label: 4 },
  { text: '感觉生活还挺美好的', label: 4 },
  { text: '今天的考试感觉还不错', label: 4 },
  { text: '有人记得我的生日，很感动', label: 4 },
  { text: '今天过得有意义', label: 4 },
  { text: '一切都挺顺利的', label: 4 },
  { text: '今天心情美美的', label: 4 },

  // very_positive (score=5)
  { text: '今天项目终于完成了，成就感爆棚', label: 5 },
  { text: '收到了意外的好消息，太开心了', label: 5 },
  { text: '和好朋友一起度过了完美的一天', label: 5 },
  { text: '拿到了心仪的offer，激动到不行', label: 5 },
  { text: '今天的天气超好，心情美美的', label: 5 },
  { text: '旅行第一天，一切都太美好了', label: 5 },
  { text: '完成了一直想做的事情，完美', label: 5 },
  { text: '今天被夸奖了，开心到飞起', label: 5 },
  { text: '比赛拿了第一名，太激动了', label: 5 },
  { text: '今天是最幸福的一天', label: 5 },
  { text: '中奖了，运气爆棚', label: 5 },
  { text: '今天收到了最想要的礼物', label: 5 },
  { text: '表白成功了，太开心了', label: 5 },
  { text: '今天的表演超完美', label: 5 },
  { text: '升职加薪了，开心', label: 5 },
  { text: '今天完成了一个大突破', label: 5 },
  { text: '终于等到这个好消息了', label: 5 },
  { text: '今天是最美好的一天', label: 5 },
  { text: '和家人团聚了，幸福感满满', label: 5 },
  { text: '今天的一切都是完美的', label: 5 },
  { text: '太开心了，忍不住想笑', label: 5 },
  { text: '今天超级超级开心', label: 5 },
  { text: '今天简直是太棒了', label: 5 },
  { text: '激动得睡不着觉', label: 5 },
  { text: '今天是最难忘的一天', label: 5 },
  { text: '喜极而泣', label: 5 },
  { text: '今天好运连连', label: 5 },
  { text: '心愿达成了', label: 5 },
  { text: '今天终于苦尽甘来了', label: 5 },
  { text: '今天的快乐无法形容', label: 5 },
  { text: '太幸福了', label: 5 },
  { text: '今天是人生巅峰', label: 5 },
  { text: '快乐到无法自拔', label: 5 },
  { text: '今天的收获远超预期', label: 5 },
  { text: '一切都在朝着好的方向发展', label: 5 },
  { text: '今天特别有成就感', label: 5 },
  { text: '开心到原地转圈', label: 5 },
  { text: '今天是最棒的一天', label: 5 },
  { text: '笑了一整天', label: 5 },
  { text: '今天的运气太好了', label: 5 },
]

// ============ 分词器 ============

/**
 * 中文分词：bigram + unigram 混合
 * 对于中文文本，字符 bigram 是最实用的特征粒度
 */
function tokenize(text) {
  const clean = text.replace(/\s+/g, '').toLowerCase()
  const tokens = []

  // 过滤非中英文字符，但保留 emoji 标记
  const chars = [...clean].filter(c => /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u{20000}-\u{2a6df}a-zA-Z]/u.test(c))

  if (chars.length === 0) {
    // 如果没有中英文，尝试提取所有非标点字符作为 unigram
    const allChars = [...clean].filter(c => /[^\s,.，。！？；、!?;:\-()[\]{}"'""''…]/.test(c))
    return allChars.length > 0 ? allChars : ['__empty__']
  }

  // unigram
  for (const c of chars) {
    tokens.push(c)
  }

  // bigram（中文分词效果更好）
  for (let i = 0; i < chars.length - 1; i++) {
    tokens.push(chars[i] + chars[i + 1])
  }

  return tokens.length > 0 ? tokens : ['__empty__']
}

// ============ TF-IDF 计算器 ============

class TfidfModel {
  constructor() {
    this.vocabulary = new Map() // term -> index
    this.idf = []              // idf[i] = term i 的 IDF 值
    this.classTf = {}          // label -> Map(term -> tf)
    this.classDocCount = {}    // label -> 文档数
    this.totalDocs = 0
    this.termDocFreq = new Map() // term -> 出现在多少个文档中
  }

  /**
   * 在训练语料上拟合模型
   */
  fit(corpus) {
    this.totalDocs = corpus.length

    // 统计每个 term 在多少个文档中出现
    for (const doc of corpus) {
      const tokens = new Set(tokenize(doc.text))
      for (const token of tokens) {
        this.termDocFreq.set(token, (this.termDocFreq.get(token) || 0) + 1)
      }
    }

    // 构建词汇表（过滤低频词：至少出现在 2 个文档中）
    let idx = 0
    for (const [term, freq] of this.termDocFreq) {
      if (freq >= 2) {
        this.vocabulary.set(term, idx++)
      }
    }

    // 计算 IDF
    const vocabSize = this.vocabulary.size
    this.idf = new Float64Array(vocabSize)
    for (const [term, docFreq] of this.termDocFreq) {
      const termIdx = this.vocabulary.get(term)
      if (termIdx !== undefined) {
        // IDF = log(N / df) + 1（平滑）
        this.idf[termIdx] = Math.log(this.totalDocs / (docFreq + 1)) + 1
      }
    }

    // 按类别计算 TF
    const classDocs = {}
    for (const doc of corpus) {
      if (!classDocs[doc.label]) classDocs[doc.label] = []
      classDocs[doc.label].push(doc.text)
    }

    for (const [label, texts] of Object.entries(classDocs)) {
      this.classDocCount[label] = texts.length
      const tf = new Map()

      for (const text of texts) {
        const tokens = tokenize(text)
        for (const token of tokens) {
          tf.set(token, (tf.get(token) || 0) + 1)
        }
      }

      // 归一化 TF
      const totalTerms = [...tf.values()].reduce((s, v) => s + v, 0)
      const normalizedTf = new Map()
      for (const [term, count] of tf) {
        normalizedTf.set(term, count / totalTerms)
      }

      this.classTf[label] = normalizedTf
    }
  }

  /**
   * 计算文本对每个类别的 TF-IDF 相似度得分
   */
  predict(text) {
    const tokens = tokenize(text)
    const tokenFreq = new Map()
    for (const t of tokens) {
      tokenFreq.set(t, (tokenFreq.get(t) || 0) + 1)
    }

    // 计算输入文本的 TF-IDF 向量（稀疏表示）
    const totalInputTokens = tokens.length
    const inputTfidf = new Map()
    for (const [term, count] of tokenFreq) {
      const termIdx = this.vocabulary.get(term)
      if (termIdx !== undefined) {
        const tf = count / totalInputTokens
        const tfidf = tf * this.idf[termIdx]
        inputTfidf.set(term, tfidf)
      }
    }

    // 对每个类别计算余弦相似度
    const scores = {}
    for (const [label, classTfMap] of Object.entries(this.classTf)) {
      let dotProduct = 0
      let normA = 0
      let normB = 0

      // 使用 Laplace 平滑避免零概率
      const smoothing = 0.001

      for (const [term, tfidf] of inputTfidf) {
        const classTfidf = (classTfMap.get(term) || 0) + smoothing
        dotProduct += tfidf * classTfidf
        normA += tfidf * tfidf
        normB += classTfidf * classTfidf
      }

      // 加上先验概率（类别的先验 = 该类别文档数 / 总文档数）
      const prior = Math.log(this.classDocCount[label] / this.totalDocs)
      const similarity = normA > 0 && normB > 0
        ? dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
        : 0

      scores[label] = similarity + prior * 0.1 // 先验作为小幅度调整
    }

    return scores
  }

  /**
   * 获取词汇表大小
   */
  get vocabularySize() {
    return this.vocabulary.size
  }
}

// ============ 模型初始化 ============

let _model = null

function getModel() {
  if (!_model) {
    _model = new TfidfModel()
    _model.fit(TRAINING_CORPUS)
  }
  return _model
}

// ============ 分析主逻辑 ============

/**
 * 统计分析器主入口
 * @param {string} text - 用户输入文本
 * @returns {Object} 分析结果
 */
export function statisticalAnalyze(text) {
  if (!text || text.trim().length === 0) {
    return buildResult(3, 0.2, t('stat.noInput'), [])
  }

  const model = getModel()
  const scores = model.predict(text)

  // 找到最高分的类别
  let bestLabel = 3
  let bestScore = -Infinity
  const scoreEntries = Object.entries(scores).map(([k, v]) => [parseInt(k), v])

  for (const [label, score] of scoreEntries) {
    if (score > bestScore) {
      bestScore = score
      bestLabel = label
    }
  }

  // 计算置信度：基于最高分与次高分的差距
  const sortedScores = scoreEntries.sort(([, a], [, b]) => b - a)
  const topScore = sortedScores[0][1]
  const secondScore = sortedScores[1]?.[1] ?? 0
  const margin = topScore - secondScore

  // 置信度：差距越大越确定
  let confidence = Math.min(0.95, Math.max(0.3, 0.5 + margin * 2))

  // 如果输入太短，降低置信度
  if (text.length < 5) {
    confidence = Math.max(0.25, confidence - 0.2)
  }

  // 提取文本中出现的高权重词汇作为关键词
  const tokens = tokenize(text)
  const keywords = extractKeywords(tokens, model)

  const moodKey = MOOD_KEY_MAP[bestLabel]
  const methodLabel = getMethodLabel(bestLabel, scores)

  return buildResult(bestLabel, confidence, methodLabel, keywords)
}

/**
 * 从 TF-IDF 模型中提取文本中的重要特征词
 */
function extractKeywords(tokens, model) {
  const keywords = []
  const seen = new Set()

  for (const token of tokens) {
    if (seen.has(token) || token.length < 2) continue
    if (model.vocabulary.has(token)) {
      const termIdx = model.vocabulary.get(token)
      const idf = model.idf[termIdx]
      if (idf > 1.0 && keywords.length < 5) { // 只取 IDF 较高的词
        keywords.push(token)
        seen.add(token)
      }
    }
  }

  return keywords
}

function getMethodLabel(bestLabel, scores) {
  const labelKeys = { 1: 'mood.very_negative', 2: 'mood.negative', 3: 'mood.neutral', 4: 'mood.positive', 5: 'mood.very_positive' }
  const label = t(labelKeys[bestLabel]) || MOOD_TYPES[MOOD_KEY_MAP[bestLabel]]?.label
  return t('stat.judged').replace('{label}', label)
}

function buildResult(score, confidence, analysis, keywords) {
  const moodKey = MOOD_KEY_MAP[score] || 'neutral'
  return {
    mood: moodKey,
    intensity: score,
    moodLabel: MOOD_TYPES[moodKey]?.label || t('mood.neutral'),
    confidence,
    analysis,
    keywords,
    suggestion: generateSuggestion(score),
    method: 'statistical',
  }
}

function generateSuggestion(score) {
  const suggestions = {
    1: [t('suggestion.very_negative.1'), t('suggestion.very_negative.2')],
    2: [t('suggestion.negative.1'), t('suggestion.negative.2')],
    3: [t('suggestion.neutral.1'), t('suggestion.neutral.2')],
    4: [t('suggestion.positive.1'), t('suggestion.positive.2')],
    5: [t('suggestion.very_positive.1'), t('suggestion.very_positive.2')],
  }
  const list = suggestions[score] || suggestions[3]
  return list[Math.floor(Math.random() * list.length)]
}

/**
 * 获取模型信息（用于调试 / 展示）
 */
export function getModelInfo() {
  const model = getModel()
  return {
    vocabularySize: model.vocabularySize,
    trainingSamples: TRAINING_CORPUS.length,
    classes: Object.keys(model.classDocCount).length,
    classDistribution: model.classDocCount,
  }
}

/**
 * 增量学习：用新的标注数据更新模型
 * @param {string} text - 文本
 * @param {number} label - 情绪标签 (1-5)
 */
export function learnFromFeedback(text, label) {
  // 将新样本加入语料并重建模型
  TRAINING_CORPUS.push({ text, label: parseInt(label) })
  _model = null // 重置模型，下次调用时自动重建
}
