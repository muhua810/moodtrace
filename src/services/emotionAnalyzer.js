import { MOOD_TYPES } from '../utils/moodUtils'
import { t } from '../i18n'
import { statisticalAnalyze, getModelInfo } from './statisticalAnalyzer'
import { aiAnalyzeViaWorkers, aiAnalyzeDirect } from './aiService'

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
      return { score: 3, weight: 1.2, matched: [kw], negated: [] }
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
  let allNegatedKeywords = []

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
    allNegatedKeywords = [...allNegatedKeywords, ...negated]

    const extremity = Math.abs(rule.score - 3)

    if (positive.length > 0) {
      // 有非否定匹配：正常计算权重
      const weighted = positive.length * (extremity + 1) * clauseWeight
      if (weighted > bestWeight) {
        bestWeight = weighted
        bestScore = rule.score
        bestMatched = positive
      }
    }

    if (negated.length > 0 && positive.length === 0) {
      // 全部被否定：翻转情绪
      const flippedScore = rule.score >= 3 ? Math.max(1, rule.score - 2) : Math.min(5, rule.score + 2)
      const flipWeight = negated.length * 0.5 * clauseWeight
      if (flipWeight > bestWeight) {
        bestWeight = flipWeight
        bestScore = flippedScore
        bestMatched = negated.map(n => `非${n}`)
      }
    }
  }

  // 部分否定处理：如果存在否定词，对最终得分进行适度弱化
  // 例："不开心但还不错" → "不开心"被翻转为低分，"还不错"是高分 → 高分胜出
  // 但 "不开心也不顺利" → 两个都被否定翻转 → 取翻转结果
  // 如果一个规则既有 negated 又有 positive，说明有对比，保持 positive 的权重但降低 10%
  if (allNegatedKeywords.length > 0 && bestWeight > 0) {
    // 标记存在否定上下文（用于上层调用感知）
    bestMatched = [...bestMatched]
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

  return { score: bestScore, weight: bestWeight, matched: bestMatched, negated: allNegatedKeywords }
}

// ============ 本地关键词分析 ============

function localAnalyze(text) {
  // 0. 危机关键词检测 → 最高优先级
  if (hasCrisisKeywords(text)) {
    return {
      ...buildResult(1, 0.95, t('analysis.crisis'), [t('analysis.crisisTag')]),
      suggestion: t('analysis.crisisSuggestion'),
      _crisis: true,
    }
  }

  // 0.5 检测反讽（高优先级，直接翻转）
  const sarcasm = detectSarcasm(text)
  if (sarcasm.isSarcasm) {
    const flippedScore = sarcasm.flipTo === 'negative' ? 2 : 4
    return buildResult(flippedScore, 0.75, t('analysis.sarcasm'), [t('analysis.sarcasmTag')])
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
        return buildResult(score, 0.5, t('analysis.emoji').replace('{emoji}', emoji), [emoji])
      }
    }
    return buildResult(3, 0.3, t('analysis.noMatch'), [])
  }

  const avgScore = weightedSum / totalWeight
  const finalScore = Math.round(avgScore)
  const clampedScore = Math.max(1, Math.min(5, finalScore))

  let analysis = t('analysis.keywordMatch').replace('{keywords}', allMatched.slice(0, 5).join('、'))

  // 部分否定检测：某些分句有否定词，某些没有 → 存在对比情绪，适度弱化极端值
  const hasAnyNegation = allNegated.length > 0
  const hasAnyPositive = allMatched.length > 0

  if (hasRelativeExpression(text.toLowerCase()) && Math.abs(clampedScore - 3) >= 2) {
    const adjustedScore = clampedScore > 3 ? clampedScore - 1 : clampedScore + 1
    analysis += t('analysis.softened')
    return buildResult(adjustedScore, Math.min(0.5 + allMatched.length * 0.1, 0.85), analysis, allMatched.slice(0, 5))
  }

  // 部分否定：有否定词但也有正向匹配 → 情绪不那么极端
  if (hasAnyNegation && hasAnyPositive && Math.abs(clampedScore - 3) >= 2) {
    const adjustedScore = clampedScore > 3 ? clampedScore - 1 : clampedScore + 1
    analysis += t('analysis.mixed')
    return buildResult(adjustedScore, Math.min(0.4 + allMatched.length * 0.1, 0.8), analysis, allMatched.slice(0, 5))
  }

  const confidence = clauses.length > 1
    ? Math.min(0.45 + allMatched.length * 0.12, 0.85)
    : Math.min(0.5 + allMatched.length * 0.15, 0.9)

  if (hasReversal) {
    analysis += t('analysis.combined')
  }

  return buildResult(clampedScore, confidence, analysis, allMatched.slice(0, 5))
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
    method: 'keyword',
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
      title: t('wellness.very_negative.title'),
      tips: [
        t('wellness.very_negative.tip1'),
        t('wellness.very_negative.tip2'),
        t('wellness.very_negative.tip3'),
        t('wellness.very_negative.tip4'),
      ],
    },
    negative: {
      title: t('wellness.negative.title'),
      tips: [
        t('wellness.negative.tip1'),
        t('wellness.negative.tip2'),
        t('wellness.negative.tip3'),
        t('wellness.negative.tip4'),
      ],
    },
    neutral: {
      title: t('wellness.neutral.title'),
      tips: [
        t('wellness.neutral.tip1'),
        t('wellness.neutral.tip2'),
        t('wellness.neutral.tip3'),
        t('wellness.neutral.tip4'),
      ],
    },
    positive: {
      title: t('wellness.positive.title'),
      tips: [
        t('wellness.positive.tip1'),
        t('wellness.positive.tip2'),
        t('wellness.positive.tip3'),
        t('wellness.positive.tip4'),
      ],
    },
    very_positive: {
      title: t('wellness.very_positive.title'),
      tips: [
        t('wellness.very_positive.tip1'),
        t('wellness.very_positive.tip2'),
        t('wellness.very_positive.tip3'),
        t('wellness.very_positive.tip4'),
      ],
    },
  }
  return tipsMap[moodKey] || tipsMap.neutral
}
