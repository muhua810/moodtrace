/**
 * 群体情绪统计路由
 * POST /api/stats/submit   — 提交匿名情绪数据
 * GET  /api/stats/summary  — 获取群体情绪统计
 * GET  /api/stats/trends   — 获取月趋势
 * GET  /api/stats/keywords — 获取关键词热度
 */

import { corsResponse } from '../utils.js'

// ============ 演示用群体统计数据 ============
function getDemoStats(month) {
  const demoData = {
    '2026-03': {
      total: 2847,
      moods: { very_negative: 98, negative: 398, neutral: 854, positive: 1054, very_positive: 443 },
      days: Object.fromEntries(
        Array.from({ length: 26 }, (_, i) => {
          const day = String(i + 1).padStart(2, '0')
          const total = 80 + Math.floor(Math.random() * 30)
          return [day, {
            total,
            moods: {
              very_negative: Math.floor(total * 0.03),
              negative: Math.floor(total * 0.14),
              neutral: Math.floor(total * 0.30),
              positive: Math.floor(total * 0.37),
              very_positive: Math.floor(total * 0.16),
            },
          }]
        })
      ),
    },
  }

  if (demoData[month]) return demoData[month]

  // 当月模拟数据
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  if (month === currentMonth) {
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const days = {}
    const moods = { very_negative: 0, negative: 0, neutral: 0, positive: 0, very_positive: 0 }
    for (let d = 1; d <= Math.min(daysInMonth, now.getDate()); d++) {
      const dayStr = String(d).padStart(2, '0')
      const total = 80 + Math.floor(Math.random() * 30)
      const dayMoods = {
        very_negative: Math.floor(total * 0.03),
        negative: Math.floor(total * 0.14),
        neutral: Math.floor(total * 0.30),
        positive: Math.floor(total * 0.37),
        very_positive: Math.floor(total * 0.16),
      }
      days[dayStr] = { total, moods: dayMoods }
      Object.entries(dayMoods).forEach(([k, v]) => { moods[k] += v })
    }
    const totalRecords = Object.values(days).reduce((s, d) => s + d.total, 0)
    return { total: totalRecords, moods, days, isDemo: true }
  }

  return null
}

// ============ 提交情绪 ============
export async function handleSubmit(request, env) {
  try {
    const body = await request.json()
    const { mood, date, keywords } = body

    const validMoods = ['very_negative', 'negative', 'neutral', 'positive', 'very_positive']
    if (!mood || !validMoods.includes(mood)) {
      return corsResponse({ error: '无效的情绪类型' }, 400)
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return corsResponse({ error: '无效的日期格式' }, 400)
    }

    const month = date.slice(0, 7)
    const day = date.slice(8, 10)
    const statsKey = `stats:${month}`
    const keywordsKey = `keywords:${month}`

    const raw = await env.MOOD_STATS.get(statsKey)
    let stats = raw ? JSON.parse(raw) : {
      total: 0,
      moods: { very_negative: 0, negative: 0, neutral: 0, positive: 0, very_positive: 0 },
      days: {},
    }

    stats.total += 1
    stats.moods[mood] = (stats.moods[mood] || 0) + 1

    if (!stats.days[day]) {
      stats.days[day] = { total: 0, moods: {} }
    }
    stats.days[day].total += 1
    stats.days[day].moods[mood] = (stats.days[day].moods[mood] || 0) + 1

    await env.MOOD_STATS.put(statsKey, JSON.stringify(stats))

    // 更新关键词热度（已做长度和格式限制，防注入）
    if (Array.isArray(keywords) && keywords.length > 0) {
      const kwRaw = await env.MOOD_STATS.get(keywordsKey)
      let kwData = kwRaw ? JSON.parse(kwRaw) : {}
      for (const kw of keywords.slice(0, 3)) {
        // 仅保留中文、字母、数字，防止通过关键词注入特殊字符
        const cleanKw = String(kw).slice(0, 20).replace(/[^\u4e00-\u9fff\u3400-\u4dbf\w\s-]/g, '').trim()
        if (cleanKw && cleanKw.length >= 1) {
          kwData[cleanKw] = (kwData[cleanKw] || 0) + 1
        }
      }
      await env.MOOD_STATS.put(keywordsKey, JSON.stringify(kwData))
    }

    return corsResponse({ success: true })
  } catch (e) {
    return corsResponse({ error: '请求处理失败' }, 500)
  }
}

// ============ 群体情绪统计 ============
export async function handleSummary(request, env) {
  const url = new URL(request.url)
  const month = url.searchParams.get('month')

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return corsResponse({ error: '请提供有效的月份参数 ?month=YYYY-MM' }, 400)
  }

  const statsKey = `stats:${month}`
  const raw = await env.MOOD_STATS.get(statsKey)
  let stats = raw ? JSON.parse(raw) : null

  if (!stats || stats.total < 50) {
    const demo = getDemoStats(month)
    if (demo) {
      const moodPercentages = {}
      if (demo.total > 0) {
        for (const [mood, count] of Object.entries(demo.moods)) {
          moodPercentages[mood] = Math.round((count / demo.total) * 100)
        }
      }
      return corsResponse({
        month, total: demo.total, moods: demo.moods,
        moodPercentages, days: demo.days, isDemo: true,
      })
    }
    stats = { total: 0, moods: { very_negative: 0, negative: 0, neutral: 0, positive: 0, very_positive: 0 }, days: {} }
  }

  const moodPercentages = {}
  if (stats.total > 0) {
    for (const [mood, count] of Object.entries(stats.moods)) {
      moodPercentages[mood] = Math.round((count / stats.total) * 100)
    }
  }

  return corsResponse({ month, total: stats.total, moods: stats.moods, moodPercentages, days: stats.days })
}

// ============ 月趋势 ============
export async function handleTrends(request, env) {
  const url = new URL(request.url)
  const monthsParam = url.searchParams.get('months') || '3'
  const monthsCount = Math.min(Math.max(parseInt(monthsParam, 10) || 3, 1), 12)
  const now = new Date()
  const monthKeys = []

  for (let i = 0; i < monthsCount; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const results = []
  for (const month of monthKeys) {
    const raw = await env.MOOD_STATS.get(`stats:${month}`)
    if (raw) {
      const stats = JSON.parse(raw)
      const avg = stats.total > 0
        ? Object.entries(stats.moods).reduce((sum, [key, count]) => {
            const score = { very_negative: 1, negative: 2, neutral: 3, positive: 4, very_positive: 5 }[key] || 3
            return sum + score * count
          }, 0) / stats.total
        : 0
      results.push({ month, total: stats.total, avgMood: Number(avg.toFixed(2)), moods: stats.moods })
    }
  }

  return corsResponse({ trends: results.reverse() })
}

// ============ 关键词热度 ============
export async function handleKeywords(request, env) {
  const url = new URL(request.url)
  const month = url.searchParams.get('month') || new Date().toISOString().slice(0, 7)
  const limit = Math.min(parseInt(url.searchParams.get('limit'), 10) || 20, 50)

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return corsResponse({ error: '无效的月份格式' }, 400)
  }

  const kwRaw = await env.MOOD_STATS.get(`keywords:${month}`)
  const kwData = kwRaw ? JSON.parse(kwRaw) : {}

  const ranked = Object.entries(kwData)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([keyword, count], index) => ({ rank: index + 1, keyword, count }))

  return corsResponse({ month, keywords: ranked, total: ranked.reduce((s, k) => s + k.count, 0) })
}
