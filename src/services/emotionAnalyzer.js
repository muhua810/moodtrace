import { MOOD_TYPES } from '../utils/moodUtils'
import { secureKeyGet } from '../utils/crypto'
import { getApiBase } from './apiService'

const MOOD_KEY_MAP = {
  1: 'very_negative',
  2: 'negative',
  3: 'neutral',
  4: 'positive',
  5: 'very_positive',
}

// 关键词规则：score 越极端（距3越远）优先级越高
const KEYWORD_RULES = [
  { score: 5, keywords: ['超级开心', '太开心了', '太高兴', '兴奋', '激动', '幸福', '快乐极了', '完美', '太棒了', '最好', '太爽', '狂喜', '美滋滋', '乐开花', '笑死', '哈哈', '笑疯', '开森', '绝了', '完美的一天', '幸福感爆棚', '乐不可支', '心花怒放', '喜出望外', '欢天喜地'] },
  { score: 4, keywords: ['开心', '高兴', '不错', '挺好', '满意', '舒服', '愉快', '轻松', '快乐', '温暖', '美好', '期待', '加油', '顺利', '成功', '赞', '棒', '厉害', '惊喜', '骄傲', '自信', '感恩', '感谢', '喜欢', '爱', '温柔', '可爱', '甜甜', '惬意', '悠闲', '享受', '爽', '酷', 'nice', 'good', 'great', 'happy', 'love', '知足', '满足', '欣慰', '庆幸', '真好', '好运', '有进步', '还挺好', '挺开心', '心情好', '状态好', '运气好', '值得', '充实', '有意义', '有成就感', '有希望', '欣慰', '得意', '美妙', '幸福的'] },
  { score: 2, keywords: ['难过', '伤心', '失望', '沮丧', '低落', '郁闷', '烦躁', '疲惫', '累', '辛苦', '压力', '焦虑', '担心', '不安', '紧张', '害怕', '孤独', '寂寞', '委屈', '无奈', '痛苦', '哭', '呜呜', '唉', '烦', '好难', '太难', '想哭', '难受', '心酸', 'sad', 'tired', 'stressed', '好烦', '好累', '心累', '心烦', '不爽', '不高兴', '不开心', '有点烦', '有点累', '有点难', '想太多', '睡不着', '失眠', '头疼', '好难过', '丧', '自闭', '崩溃', '纠结', '抓狂', '心塞', '心慌', '忐忑', '消沉', '萎靡', '憔悴'] },
  { score: 1, keywords: ['绝望', '崩溃了', '不想活', '心碎', '万念俱灰', '生无可恋', '痛不欲绝', '太痛苦', '受不了了', '极度低落', '完全崩溃', '痛彻心扉', '撕心裂肺'] },
]

const NEUTRAL_KEYWORDS = ['一般', '还行', '普通', '正常', '平淡', '没什么', '就这样', '凑合', '马马虎虎', '不好不坏', 'soso', 'okay', 'fine', '中规中矩', '过得去', '无功无过', '不上不下', '一如既往']

// ============ Emoji 情绪映射 ============
const EMOJI_MOOD_MAP = {
  // 非常正面
  '😀': 5, '😃': 5, '😄': 5, '😁': 5, '😆': 5, '🥰': 5, '😍': 5, '🤩': 5, '😘': 5, '😗': 5,
  '😚': 5, '😙': 5, '🥲': 4, '😋': 5, '😛': 5, '😜': 5, '🤪': 5, '😝': 5, '🤑': 5,
  '🤗': 5, '🤭': 4, '😌': 4, '😊': 5, '🎉': 5, '🎊': 5, '🥳': 5, '🏆': 5, '💪': 4,
  '❤️': 5, '💕': 5, '💖': 5, '💗': 5, '✨': 4, '🌟': 5, '⭐': 4, '🌈': 4, '☀️': 4,
  // 正面
  '🙂': 4, '🙃': 4, '😏': 4, '😎': 4, '🤓': 3, '😺': 4,
  // 中性
  '😐': 3, '😶': 3, '😑': 3, '🤔': 3, '🫤': 3, '🤷': 3, '😐': 3, '😴': 3,
  // 负面
  '😟': 2, '😕': 2, '🙁': 2, '☹️': 2, '😮‍💨': 2, '😔': 2, '😞': 2, '😣': 2,
  '😖': 2, '😫': 2, '😩': 2, '🥺': 2, '😢': 2, '😰': 2, '😨': 2, '😧': 2,
  '😥': 2, '😓': 2, '🤧': 2, '🤒': 2, '🤕': 2, '😵': 2, '🫠': 2,
  // 非常负面
  '😭': 1, '😤': 1, '😡': 1, '🤬': 1, '😠': 1, '👿': 1, '💀': 1, '☠️': 1,
  '😱': 1, '🥵': 1, '🥶': 1, '🥴': 1, '🤯': 1, '😱': 1,
}

// ============ 否定词（扩大窗口到 10 字符） ============
const NEGATION_WORDS = [
  // 基础否定
  '不', '没', '没有', '不是', '不会', '别', '从不', '绝不', '毫不', '毫无', '并非',
  '再也不', '不再', '无法',
  // 新增否定词
  '远非', '远没有', '算不得', '称不上',
  // 复合否定（更长的优先匹配）
  '不太', '不怎么', '没那么', '不算', '算不上', '谈不上', '说不上', '不至于',
  '不那么', '不太那么', '并非真的',
]

const NEGATION_WINDOW = 10 // 否定词检测窗口扩大到 10 字符

// ============ 反转模式（"虽然...但是..."后半句权重更高） ============
const REVERSAL_PATTERNS = [
  { before: '虽然', after: '但是' },
  { before: '虽然', after: '但' },
  { before: '尽管', after: '但是' },
  { before: '尽管', after: '但' },
  { before: '虽说', after: '但是' },
  { before: '虽说', after: '但' },
  { before: '虽然', after: '不过' },
  { before: '尽管', after: '不过' },
]

// ============ 分词：按标点/空格分割句子 ============
function splitClauses(text) {
  // 按常见中文标点和空格分句
  const parts = text.split(/[,，。！？；、\s!?\.;]+/).filter(s => s.trim().length > 0)
  return parts.length > 0 ? parts : [text]
}

/**
 * 检查关键词是否被否定词修饰
 * 在关键词前面一定窗口内查找否定词（长否定词优先匹配）
 */
function isNegated(text, keyword) {
  const idx = text.indexOf(keyword)
  if (idx <= 0) return false

  // 检查关键词前 NEGATION_WINDOW 个字符的窗口
  const windowStart = Math.max(0, idx - NEGATION_WINDOW)
  const prefix = text.substring(windowStart, idx)

  // 按长度降序排列，长否定词优先匹配
  const sortedNeg = [...NEGATION_WORDS].sort((a, b) => b.length - a.length)
  for (const neg of sortedNeg) {
    if (prefix.endsWith(neg)) return true
  }
  return false
}

/**
 * 检测相对化表达（"没那么难过" → 弱化情绪强度）
 */
function hasRelativeExpression(text) {
  const patterns = ['没那么', '不那么', '不至于', '还算', '勉强']
  return patterns.some(p => text.includes(p))
}

/**
 * 检测反转模式（"虽然...但是..."后半句权重更高）
 * 返回 { hasReversal: boolean, afterIndex: number } — afterIndex 是"但是"开始的位置
 */
function detectReversal(text) {
  for (const pattern of REVERSAL_PATTERNS) {
    const beforeIdx = text.indexOf(pattern.before)
    if (beforeIdx < 0) continue
    const afterIdx = text.indexOf(pattern.after, beforeIdx + pattern.before.length)
    if (afterIdx > beforeIdx) {
      return { hasReversal: true, afterIndex: afterIdx }
    }
  }
  return { hasReversal: false, afterIndex: 0 }
}

/**
 * 分析单个分句的情绪得分
 * 返回 { score, weight, matched, negated }
 */
function analyzeClause(clauseText, clauseWeight = 1) {
  const lower = clauseText.toLowerCase().trim()
  if (!lower) return { score: 3, weight: 0, matched: [], negated: [] }

  // 检查中性关键词
  for (const kw of NEUTRAL_KEYWORDS) {
    if (lower.includes(kw)) {
      return { score: 3, weight: 0.3, matched: [kw], negated: [] }
    }
  }

  // 检查 emoji
  let emojiScore = null
  let emojiMatches = []
  for (const [emoji, score] of Object.entries(EMOJI_MOOD_MAP)) {
    if (clauseText.includes(emoji)) {
      if (emojiScore === null || Math.abs(score - 3) > Math.abs(emojiScore - 3)) {
        emojiScore = score
        emojiMatches = [emoji]
      }
    }
  }

  let bestScore = 3
  let bestWeight = 0
  let bestMatched = []
  let negatedKeywords = []

  for (const rule of KEYWORD_RULES) {
    const matched = rule.keywords.filter(kw => lower.includes(kw))
    if (matched.length === 0) continue

    const negated = matched.filter(kw => isNegated(lower, kw))
    const positive = matched.filter(kw => !isNegated(lower, kw))
    negatedKeywords = [...negatedKeywords, ...negated]

    const extremity = Math.abs(rule.score - 3)
    const weighted = positive.length * (extremity + 1) * clauseWeight

    if (weighted > bestWeight) {
      bestWeight = weighted
      bestScore = rule.score
      bestMatched = positive
    }

    // 如果全部被否定，翻转情绪
    if (positive.length === 0 && negated.length > 0) {
      const flippedScore = rule.score >= 3 ? Math.max(1, rule.score - 2) : Math.min(5, rule.score + 2)
      const flipWeight = negated.length * 0.5 * clauseWeight
      if (flipWeight > bestWeight) {
        bestWeight = flipWeight
        bestScore = flippedScore
        bestMatched = negated.map(n => `非${n}`)
      }
    }
  }

  // emoji 作为额外信号
  if (emojiScore !== null) {
    const emojiWeight = 1.5 * clauseWeight
    if (emojiWeight > bestWeight || bestWeight === 0) {
      bestScore = emojiScore
      bestWeight = emojiWeight
      bestMatched = emojiMatches
    }
  }

  return { score: bestScore, weight: bestWeight, matched: bestMatched, negated: negatedKeywords }
}

function localAnalyze(text) {
  // 检测反转模式
  const { hasReversal, afterIndex } = detectReversal(text)

  // 分句
  const clauses = splitClauses(text)

  // 对每个分句独立分析，加权汇总
  let totalWeight = 0
  let weightedSum = 0
  let allMatched = []
  let allNegated = []

  // 反转模式下，找到后半句开始的分句索引
  let reversalClauseIdx = -1
  if (hasReversal) {
    let charPos = 0
    for (let i = 0; i < clauses.length; i++) {
      const clauseIdx = text.indexOf(clauses[i], charPos)
      if (clauseIdx >= 0 && clauseIdx >= afterIndex) {
        reversalClauseIdx = i
        break
      }
      charPos = clauseIdx >= 0 ? clauseIdx + clauses[i].length : charPos + clauses[i].length
    }
  }

  for (let i = 0; i < clauses.length; i++) {
    const clause = clauses[i].trim()
    if (!clause) continue

    // 反转模式下，后半句的分句权重更高
    let clauseWeight = 1
    if (hasReversal && reversalClauseIdx >= 0) {
      if (i >= reversalClauseIdx) {
        clauseWeight = 2.5 // 后半句权重提高
      } else {
        clauseWeight = 0.5 // 前半句权重降低
      }
    }

    const result = analyzeClause(clause, clauseWeight)

    if (result.weight > 0) {
      weightedSum += result.score * result.weight
      totalWeight += result.weight
      allMatched = [...allMatched, ...result.matched]
      allNegated = [...allNegated, ...result.negated]
    }
  }

  // 如果没有匹配到任何关键词，检查整体是否中性
  if (totalWeight === 0) {
    // 尝试用 emoji 检测
    for (const [emoji, score] of Object.entries(EMOJI_MOOD_MAP)) {
      if (text.includes(emoji)) {
        return buildResult(score, 0.5, `基于表情符号分析：${emoji}`, [emoji])
      }
    }
    return buildResult(3, 0.3, '未能识别明确情绪，记录下来就好~', [])
  }

  // 计算加权平均得分
  const avgScore = weightedSum / totalWeight
  const finalScore = Math.round(avgScore)
  const clampedScore = Math.max(1, Math.min(5, finalScore))

  let analysis = `基于关键词匹配：${allMatched.slice(0, 5).join('、')}`

  // 相对化表达弱化
  if (hasRelativeExpression(text.toLowerCase()) && Math.abs(clampedScore - 3) >= 2) {
    const adjustedScore = clampedScore > 3 ? clampedScore - 1 : clampedScore + 1
    analysis += '（情绪有所弱化）'
    return buildResult(adjustedScore, Math.min(0.5 + allMatched.length * 0.1, 0.85), analysis, allMatched.slice(0, 5))
  }

  // 有多分句时降低置信度（混合情绪）
  const confidence = clauses.length > 1
    ? Math.min(0.45 + allMatched.length * 0.12, 0.85)
    : Math.min(0.5 + allMatched.length * 0.15, 0.9)

  if (hasReversal) {
    analysis += '（综合多个情绪片段）'
  }

  return buildResult(clampedScore, confidence, analysis, allMatched.slice(0, 5))
}

function buildResult(score, confidence, analysis, keywords) {
  const moodKey = MOOD_KEY_MAP[score] || 'neutral'
  return {
    mood: moodKey,
    intensity: score,
    moodLabel: MOOD_TYPES[moodKey]?.label || '一般般',
    confidence,
    analysis,
    keywords,
    suggestion: generateSuggestion(score),
    method: 'keyword',
  }
}

function generateSuggestion(score) {
  const suggestions = {
    1: ['深呼吸，给自己一点时间。如果持续低落，建议找信任的人聊聊。', '每个人都有低谷，照顾好自己，明天会不一样的。'],
    2: ['难过是正常的情绪，允许自己感受它。写日记是很好的情绪出口。', '试试做一些让自己放松的事情吧。'],
    3: ['平淡的日子也有它的价值，记录本身就是一种自我觉察。', '试试做点让自己开心的小事？一杯奶茶、一首歌都可以~'],
    4: ['保持这份好心情！记住这些让你开心的事情。', '美好的一天值得被记录，继续加油！'],
    5: ['开心到飞起！这种快乐时刻太珍贵了，好好享受~', '分享快乐会让快乐加倍！'],
  }
  const list = suggestions[score] || suggestions[3]
  return list[Math.floor(Math.random() * list.length)]
}

// ============ AI 分析（Workers 代理 → 用户自定义 API） ============

const SYSTEM_PROMPT = `你是一个情绪分析助手。用户会发来一段简短的文字，请你分析其中表达的情绪。
用JSON格式返回，包含字段：mood(1-5整数)、moodLabel、confidence(0-1)、analysis(30字内)、keywords(数组)、suggestion(20字内)。
mood对应关系：1=very_negative, 2=negative, 3=neutral, 4=positive, 5=very_positive。
只返回JSON，不要有其他内容。`

/**
 * 通过 Workers 代理调用 AI 分析
 */
async function aiAnalyzeViaWorkers(text) {
  const apiBase = getApiBase()
  const response = await fetch(`${apiBase}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })

  if (!response.ok) throw new Error(`Workers API error: ${response.status}`)

  const data = await response.json()
  if (data.error) throw new Error(data.error)

  return {
    mood: data.mood,
    intensity: data.intensity,
    moodLabel: data.moodLabel,
    confidence: data.confidence,
    analysis: data.analysis,
    keywords: data.keywords || [],
    suggestion: data.suggestion || '',
    method: 'ai',
  }
}

/**
 * 通过用户自定义 API 直接调用 AI 分析
 */
async function aiAnalyzeDirect(text) {
  const apiKey = await secureKeyGet('ai_api_key')
  if (!apiKey) return null

  const apiUrl = await secureKeyGet('ai_api_url') || 'https://api.openai.com/v1/chat/completions'
  const modelName = await secureKeyGet('ai_model') || 'gpt-3.5-turbo'

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: text },
      ],
      temperature: 0.3,
    }),
  })

  if (!response.ok) throw new Error(`API error: ${response.status}`)

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('No response content')

  let result
  try {
    const cleaned = content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()
    result = JSON.parse(cleaned)
  } catch (parseErr) {
    console.error('AI 返回内容不是有效 JSON:', content)
    throw new Error('AI 响应格式错误')
  }

  const moodNum = Math.max(1, Math.min(5, Math.round(Number(result.mood) || 3)))
  const moodKey = MOOD_KEY_MAP[moodNum]

  return {
    mood: moodKey,
    intensity: moodNum,
    moodLabel: MOOD_TYPES[moodKey]?.label || '一般般',
    confidence: Math.max(0, Math.min(1, Number(result.confidence) || 0.5)),
    analysis: String(result.analysis || '').slice(0, 100),
    keywords: Array.isArray(result.keywords) ? result.keywords.slice(0, 5) : [],
    suggestion: String(result.suggestion || result.advice || '').slice(0, 50),
    method: 'ai',
  }
}

// ============ 主入口 ============

/**
 * 分析情绪 - 主入口
 * 优先级：Workers 代理 → 用户自定义 API → 本地关键词
 * @param {string} text - 用户输入文本
 * @returns {Promise<Object>} 分析结果
 */
export async function analyzeEmotion(text) {
  // 1. 优先尝试 Workers 代理（零配置可用）
  try {
    const workersResult = await aiAnalyzeViaWorkers(text)
    if (workersResult) return workersResult
  } catch (error) {
    console.error('Workers AI 分析失败，尝试用户自定义 API:', error.message)
  }

  // 2. 尝试用户自定义 API
  try {
    const directResult = await aiAnalyzeDirect(text)
    if (directResult) return directResult
  } catch (error) {
    console.error('用户自定义 API 分析失败，降级到本地分析:', error.message)
  }

  // 3. 降级到本地关键词分析
  console.log('使用本地关键词分析器')
  return localAnalyze(text)
}

/**
 * 获取情绪建议
 */
export function getWellnessTips(moodKey) {
  const tipsMap = {
    very_negative: {
      title: '照顾好自己',
      tips: [
        '深呼吸几次，专注于当下的呼吸',
        '找一个信任的人聊聊你的感受',
        '适当运动可以帮助释放负面情绪',
        '如果持续感到低落，建议寻求专业帮助',
      ],
    },
    negative: {
      title: '让自己放松一下',
      tips: [
        '听一首喜欢的歌，让旋律带走烦恼',
        '出去走走，换个环境透透气',
        '写日记梳理一下自己的感受',
        '早点休息，充足的睡眠很重要',
      ],
    },
    neutral: {
      title: '享受平淡的时光',
      tips: [
        '尝试一个小新事物，给生活加点料',
        '整理一下房间，清爽的环境带来好心情',
        '给远方的朋友发条消息',
        '读几页书，充实自己的内心',
      ],
    },
    positive: {
      title: '保持好心情',
      tips: [
        '记录下今天让你开心的事，以后可以回顾',
        '把好心情分享给身边的人',
        '趁状态好处理一些有挑战的事情',
        '做一些感恩练习，珍惜当下的美好',
      ],
    },
    very_positive: {
      title: '快乐加倍',
      tips: [
        '把这份快乐记录下来，低落时拿出来看看',
        '拍照记录这个美好的时刻',
        '分享给朋友，让快乐传递',
        '好好享受当下，这种时刻很珍贵',
      ],
    },
  }
  return tipsMap[moodKey] || tipsMap.neutral
}
