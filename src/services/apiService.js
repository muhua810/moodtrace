/**
 * 后端 API 服务 — 匿名情绪统计
 *
 * 用户可在 设置 中开启/关闭匿名数据贡献。
 * 开启后，每次记录情绪时会匿名提交到后端，用于群体情绪统计。
 */

const API_BASE_KEY = 'mood_calendar_api_base'
const ANONYMOUS_SUBMIT_KEY = 'mood_calendar_anonymous_submit'

// 默认 API 地址：优先使用环境变量，fallback 到硬编码地址
const DEFAULT_API_BASE = import.meta.env.VITE_API_BASE || 'https://mood-calendar-api.3497066292.workers.dev'

/**
 * 获取 API 基础地址
 */
export function getApiBase() {
  return localStorage.getItem(API_BASE_KEY) || DEFAULT_API_BASE
}

/**
 * 设置 API 基础地址
 */
export function setApiBase(url) {
  localStorage.setItem(API_BASE_KEY, url)
}

/**
 * 是否开启匿名数据提交
 */
export function isAnonymousSubmitEnabled() {
  return localStorage.getItem(ANONYMOUS_SUBMIT_KEY) === 'true'
}

/**
 * 设置匿名数据提交开关
 */
export function setAnonymousSubmitEnabled(enabled) {
  localStorage.setItem(ANONYMOUS_SUBMIT_KEY, enabled ? 'true' : 'false')
}

/**
 * 提交匿名情绪数据
 * @param {{ mood: string, date: string, keywords?: string[] }} data
 * @returns {Promise<boolean>}
 */
export async function submitMoodStat({ mood, date, keywords }) {
  if (!isAnonymousSubmitEnabled()) return false

  try {
    const apiBase = getApiBase()
    const body = { mood, date }
    // 仅提交关键词（不提交文本内容），增加后端关键词热度统计
    if (Array.isArray(keywords) && keywords.length > 0) {
      body.keywords = keywords.slice(0, 3)
    }
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)
    const response = await fetch(`${apiBase}/api/stats/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response.ok
  } catch {
    // 静默失败，不影响主流程
    return false
  }
}

/**
 * 获取群体情绪统计
 * @param {string} month - YYYY-MM 格式
 * @returns {Promise<Object|null>}
 */
export async function fetchMoodSummary(month) {
  try {
    const apiBase = getApiBase()
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)
    const response = await fetch(`${apiBase}/api/stats/summary?month=${month}`, {
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (!response.ok) {
      console.warn('[MoodTrace] API 响应非 200:', response.status)
      return null
    }
    return await response.json()
  } catch (err) {
    console.warn('[MoodTrace] API 请求失败:', err.message || err)
    return null
  }
}

/**
 * 获取群体周趋势
 * @param {number} months - 查询最近几个月
 * @returns {Promise<Array|null>}
 */
export async function fetchMoodTrends(months = 3) {
  try {
    const apiBase = getApiBase()
    const response = await fetch(`${apiBase}/api/stats/trends?months=${months}`)
    if (!response.ok) return null
    const data = await response.json()
    return data.trends || null
  } catch {
    return null
  }
}

/**
 * 获取关键词热度排行
 * @param {string} month - YYYY-MM 格式
 * @param {number} limit - 返回数量
 * @returns {Promise<Object|null>}
 */
export async function fetchKeywordRanking(month, limit = 20) {
  try {
    const apiBase = getApiBase()
    const response = await fetch(`${apiBase}/api/stats/keywords?month=${month}&limit=${limit}`)
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

/**
 * 检查后端健康状态
 * @returns {Promise<boolean>}
 */
export async function checkApiHealth() {
  try {
    const apiBase = getApiBase()
    const response = await fetch(`${apiBase}/api/health`)
    if (!response.ok) return false
    const data = await response.json()
    return data.status === 'ok'
  } catch {
    return false
  }
}
