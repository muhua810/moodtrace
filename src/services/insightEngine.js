/**
 * 情绪洞察引擎 — 主动关怀模块
 *
 * 基于用户历史记录进行趋势分析，主动发现需要关怀的模式：
 * - 情绪连续下降趋势
 * - 特定关键词频率异常（考试、压力、分手等）
 * - 记录间隔突然增大（可能表示逃避/低落）
 * - 周期性模式（每到周一就低落等）
 */

import { MOOD_TYPES } from '../utils/moodUtils'
import { t } from '../i18n'
import { getAllRecords } from './storage'
import { parseISO, differenceInCalendarDays, subDays, getDay } from 'date-fns'

// ============ 洞察类型 ============

export const INSIGHT_TYPES = {
  DECLINING_TREND: 'declining_trend',
  STRESS_PATTERN: 'stress_pattern',
  RECORD_GAP: 'record_gap',
  WEEKLY_PATTERN: 'weekly_pattern',
  IMPROVEMENT: 'improvement',
  MILESTONE: 'milestone',
}

// 压力相关关键词
const STRESS_KEYWORDS = [
  '考试', '面试', '加班', 'deadline', 'ddl', '论文', '答辩',
  '分手', '吵架', '矛盾', '失业', '挂科', '压力', '焦虑',
  '失眠', '头疼', '生病', '住院',
]

// ============ 分析函数 ============

/**
 * 检测情绪连续下降趋势（最近 3-5 天持续走低）
 */
export function detectDecliningTrend(records) {
  const sorted = [...records]
    .filter(r => r?.date && r?.mood)
    .sort((a, b) => b.date.localeCompare(a.date))

  if (sorted.length < 3) return null

  const recent = sorted.slice(0, 5)
  const scores = recent.map(r => MOOD_TYPES[r.mood]?.intensity || 3)

  // 检查是否连续下降
  let declining = 0
  for (let i = 0; i < scores.length - 1; i++) {
    if (scores[i] < scores[i + 1]) declining++
    else break
  }

  if (declining >= 2) {
    const avgRecent = scores.reduce((a, b) => a + b, 0) / scores.length
    return {
      type: INSIGHT_TYPES.DECLINING_TREND,
      severity: avgRecent <= 2 ? 'high' : avgRecent <= 2.5 ? 'medium' : 'low',
      message: avgRecent <= 2
        ? t('insight.decline')
        : t('insight.declineLight'),
      data: { declining, scores, avgRecent },
    }
  }

  return null
}

/**
 * 检测压力关键词频率异常
 */
export function detectStressPattern(records) {
  const recent = records
    .filter(r => {
      if (!r?.date) return false
      try {
        return differenceInCalendarDays(new Date(), parseISO(r.date)) <= 14
      } catch { return false }
    })

  if (recent.length < 3) return null

  let stressCount = 0
  const matchedKeywords = new Set()

  for (const r of recent) {
    const text = (r.text || '').toLowerCase()
    for (const kw of STRESS_KEYWORDS) {
      if (text.includes(kw)) {
        stressCount++
        matchedKeywords.add(kw)
      }
    }
  }

  if (stressCount >= 3 && matchedKeywords.size >= 2) {
    const keywordList = [...matchedKeywords].slice(0, 3).join('、')
    return {
      type: INSIGHT_TYPES.STRESS_PATTERN,
      severity: stressCount >= 6 ? 'high' : 'medium',
      message: t('insight.stress').replace('{keywords}', keywordList),
      data: { stressCount, keywords: [...matchedKeywords] },
    }
  }

  return null
}

/**
 * 检测记录间隔突然增大
 */
export function detectRecordGap(records) {
  const sorted = records
    .filter(r => r?.date)
    .sort((a, b) => b.date.localeCompare(a.date))

  if (sorted.length < 5) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const latestDate = parseISO(sorted[0].date)
  const gapDays = differenceInCalendarDays(today, latestDate)

  // 计算之前的平均间隔
  let totalGap = 0
  for (let i = 0; i < Math.min(sorted.length - 1, 10); i++) {
    totalGap += differenceInCalendarDays(parseISO(sorted[i].date), parseISO(sorted[i + 1].date))
  }
  const avgGap = totalGap / Math.min(sorted.length - 1, 10)

  // 如果当前间隔是平均间隔的 3 倍以上，且超过 3 天
  if (gapDays >= 3 && gapDays > avgGap * 3) {
    return {
      type: INSIGHT_TYPES.RECORD_GAP,
      severity: gapDays >= 7 ? 'high' : 'medium',
      message: gapDays >= 7
        ? t('insight.gapLong')
        : t('insight.gapShort'),
      data: { gapDays, avgGap: avgGap.toFixed(1) },
    }
  }

  return null
}

/**
 * 检测周期性模式（如周一总是低落）
 */
export function detectWeeklyPattern(records) {
  const recent = records
    .filter(r => {
      if (!r?.date || !r?.mood) return false
      try {
        return differenceInCalendarDays(new Date(), parseISO(r.date)) <= 60
      } catch { return false }
    })

  if (recent.length < 14) return null

  // 按星期几分组
  const dayGroups = Array.from({ length: 7 }, () => [])
  for (const r of recent) {
    try {
      const dow = getDay(parseISO(r.date))
      dayGroups[dow].push(MOOD_TYPES[r.mood]?.intensity || 3)
    } catch { /* skip */ }
  }

  // 找到最低迷的星期几
  let worstDay = -1
  let worstAvg = 5
  for (let i = 0; i < 7; i++) {
    if (dayGroups[i].length >= 3) {
      const avg = dayGroups[i].reduce((a, b) => a + b, 0) / dayGroups[i].length
      if (avg < worstAvg) {
        worstAvg = avg
        worstDay = i
      }
    }
  }

  const dayNames = t('insight.weekdays').split(',')

  if (worstDay >= 0 && worstAvg <= 2.8) {
    return {
      type: INSIGHT_TYPES.WEEKLY_PATTERN,
      severity: worstAvg <= 2 ? 'medium' : 'low',
      message: t('insight.weeklyPattern').replace('{day}', dayNames[worstDay]),
      data: { worstDay: dayNames[worstDay], worstAvg: worstAvg.toFixed(1) },
    }
  }

  return null
}

/**
 * 检测积极改善
 */
export function detectImprovement(records) {
  const sorted = records
    .filter(r => r?.date && r?.mood)
    .sort((a, b) => b.date.localeCompare(a.date))

  if (sorted.length < 7) return null

  const recent3 = sorted.slice(0, 3).map(r => MOOD_TYPES[r.mood]?.intensity || 3)
  const prev3 = sorted.slice(3, 6).map(r => MOOD_TYPES[r.mood]?.intensity || 3)

  const recentAvg = recent3.reduce((a, b) => a + b, 0) / recent3.length
  const prevAvg = prev3.reduce((a, b) => a + b, 0) / prev3.length

  if (recentAvg - prevAvg >= 1.0 && recentAvg >= 3.5) {
    return {
      type: INSIGHT_TYPES.IMPROVEMENT,
      severity: 'low',
      message: t('insight.improvement'),
      data: { recentAvg: recentAvg.toFixed(1), prevAvg: prevAvg.toFixed(1) },
    }
  }

  return null
}

/**
 * 检测里程碑（连续记录天数）
 */
export function detectMilestone(records) {
  const sorted = records
    .filter(r => r?.date)
    .sort((a, b) => b.date.localeCompare(a.date))

  if (sorted.length < 7) return null

  // 计算连续记录天数
  let streak = 1
  let expected = parseISO(sorted[0].date)
  for (let i = 1; i < sorted.length; i++) {
    const d = parseISO(sorted[i].date)
    const diff = differenceInCalendarDays(expected, d)
    if (diff === 1) {
      streak++
      expected = d
    } else break
  }

  const milestones = [7, 14, 30, 60, 100, 180, 365]
  if (milestones.includes(streak)) {
    return {
      type: INSIGHT_TYPES.MILESTONE,
      severity: 'low',
      message: t('insight.milestone').replace('{streak}', streak),
      data: { streak },
    }
  }

  return null
}

// ============ 主入口 ============

/**
 * 运行所有洞察分析，返回需要展示的洞察列表
 * 按严重程度排序，最多返回 2 条（避免信息过载）
 * @returns {Array<Object>} 洞察列表
 */
export function runInsightAnalysis() {
  try {
    const records = getAllRecords()
    if (!Array.isArray(records) || records.length < 3) return []

    const insights = []

    const checks = [
      detectDecliningTrend(records),
      detectStressPattern(records),
      detectRecordGap(records),
      detectWeeklyPattern(records),
      detectImprovement(records),
      detectMilestone(records),
    ]

    for (const result of checks) {
      if (result) insights.push(result)
    }

    // 按严重程度排序：high > medium > low
    const severityOrder = { high: 0, medium: 1, low: 2 }
    insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

    // 最多展示 2 条
    return insights.slice(0, 2)
  } catch (e) {
    console.error('[InsightEngine] 分析失败:', e)
    return []
  }
}
