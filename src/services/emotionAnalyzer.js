import { MOOD_TYPES } from '../utils/moodUtils'
import { secureKeyGet } from '../utils/crypto'
import { getApiBase } from './apiService'
import { statisticalAnalyze, getModelInfo } from './statisticalAnalyzer'

// 从拆分模块导入
import {
  KEYWORD_RULES, NEUTRAL_KEYWORDS, SLANG_KEYWORDS,
  EMOJI_MOOD_MAP,
  detectSarcasm,
  splitClauses, isNegated, hasRelativeExpression, detectReversal,
  hasCrisisKeywords,
} from './analyze'

const MOOD_KEY_MAP = {
  1: 'very_negative',
  2: 'negative',
  3: 'neutral',
  4: 'positive',
  5: 'very_positive',
}

// ============ 分析单个分句的情绪得分 ============

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

  // 合并标准关键词和网络用语关键词
  const allRules = [...KEYWORD_RULES]
  for (const slangRule of SLANG_KEYWORDS) {
    const existingRule = allRules.find(r => r.score === slangRule.score)
    if (existingRule) {
      const newKw = slangRule.keywords.filter(k => !existingRule.keywords.includes(k))
      if (newKw.length > 0) {
        existingRule.keywords = [...existingRule.keywords, ...newKw]
      }
    } else {
      allRules.push({ ...slangRule })
    }
  }

  for (const rule of allRules) {
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

// ============ 本地关键词分析 ============

function localAnalyze(text) {
  // 0. 危机关键词检测 → 最高优先级
  if (hasCrisisKeywords(text)) {
    return {
      ...buildResult(1, 0.95, '⚠️ 检测到你可能正在经历困难时刻', ['⚠️ 需要关怀']),
      suggestion: '你并不孤单。请拨打心理援助热线 400-161-9995，有人愿意倾听。',
      _crisis: true,
    }
  }

  // 0.5 检测反讽（高优先级，直接翻转）
  const sarcasm = detectSarcasm(text)
  if (sarcasm.isSarcasm) {
    const flippedScore = sarcasm.flipTo === 'negative' ? 2 : 4
    return buildResult(flippedScore, 0.75, '检测到反讽/调侃语气，已调整情绪判断', ['反讽语气'])
  }

  // 检测反转模式
  const { hasReversal, afterIndex } = detectReversal(text)

  // 分句
  const clauses = splitClauses(text)

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

    let clauseWeight = 1
    if (hasReversal && reversalClauseIdx >= 0) {
      clauseWeight = i >= reversalClauseIdx ? 2.5 : 0.5
    }

    const result = analyzeClause(clause, clauseWeight)

    if (result.weight > 0) {
      weightedSum += result.score * result.weight
      totalWeight += result.weight
      allMatched = [...allMatched, ...result.matched]
      allNegated = [...allNegated, ...result.negated]
    }
  }

  // 没有匹配到任何关键词
  if (totalWeight === 0) {
    for (const [emoji, score] of Object.entries(EMOJI_MOOD_MAP)) {
      if (text.includes(emoji)) {
        return buildResult(score, 0.5, `基于表情符号分析：${emoji}`, [emoji])
      }
    }
    return buildResult(3, 0.3, '未能识别明确情绪，记录下来就好~', [])
  }

  const avgScore = weightedSum / totalWeight
  const finalScore = Math.round(avgScore)
  const clampedScore = Math.max(1, Math.min(5, finalScore))

  let analysis = `基于关键词匹配：${allMatched.slice(0, 5).join('、')}`

  if (hasRelativeExpression(text.toLowerCase()) && Math.abs(clampedScore - 3) >= 2) {
    const adjustedScore = clampedScore > 3 ? clampedScore - 1 : clampedScore + 1
    analysis += '（情绪有所弱化）'
    return buildResult(adjustedScore, Math.min(0.5 + allMatched.length * 0.1, 0.85), analysis, allMatched.slice(0, 5))
  }

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
 * 校验并清洗 AI 返回值，防止注入和异常数据
 */
function sanitizeAiResult(raw) {
  const moodNum = Math.max(1, Math.min(5, Math.round(Number(raw.mood) || 3)))
  const moodKey = MOOD_KEY_MAP[moodNum]

  return {
    mood: moodKey,
    intensity: moodNum,
    moodLabel: MOOD_TYPES[moodKey]?.label || '一般般',
    confidence: Math.max(0, Math.min(1, Number(raw.confidence) || 0.5)),
    analysis: String(raw.analysis || '').slice(0, 100),
    keywords: Array.isArray(raw.keywords)
      ? raw.keywords.map(k => String(k).slice(0, 20)).slice(0, 5)
      : [],
    suggestion: String(raw.suggestion || raw.advice || '').slice(0, 50),
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

  let parsed
  try {
    const cleaned = content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()
    parsed = JSON.parse(cleaned)
  } catch (parseErr) {
    console.error('AI 返回内容不是有效 JSON:', content)
    throw new Error('AI 响应格式错误')
  }

  return sanitizeAiResult(parsed)
}

// ============ 主入口 ============

/**
 * 分析情绪 - 主入口
 * 降级策略：Workers AI 代理 → 用户自定义 API → 本地关键词分析 → 统计分析器
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

  // 3. 本地关键词分析（中文处理最完善）
  const keywordResult = localAnalyze(text)

  // 4. 关键词置信度足够高时直接返回
  if (keywordResult.confidence > 0.5) {
    return keywordResult
  }

  // 5. 关键词匹配不明确时，用统计分析器兜底
  try {
    const statResult = statisticalAnalyze(text)
    if (statResult && statResult.confidence > keywordResult.confidence) {
      return statResult
    }
  } catch (error) {
    console.error('统计分析器失败:', error.message)
  }

  return keywordResult
}

// 重新导出统计分析器信息
export { getModelInfo, learnFromFeedback } from './statisticalAnalyzer'

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
