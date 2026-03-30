/**
 * Worker 公共工具函数
 */

// 允许的前端域名（仅这些域名可以跨域请求 API）
const ALLOWED_ORIGINS = [
  'https://moodtrace.pages.dev',
  'https://moodtrace-api.3497066292.workers.dev',
  // 开发环境
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
]

/**
 * 根据请求 Origin 动态生成 CORS 头
 * 只允许白名单域名，不回传任意 Origin
 */
function getCorsHeaders(request) {
  const origin = request.headers.get('Origin') || ''
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : 'https://moodtrace.pages.dev'
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  }
}

export function corsResponse(body, status = 200, request) {
  // 兼容旧调用：无 request 时 fallback 到默认域名
  const headers = request ? getCorsHeaders(request) : {
    'Access-Control-Allow-Origin': 'https://moodtrace.pages.dev',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  }
  return new Response(JSON.stringify(body), { status, headers })
}

/**
 * 带限流头的响应（仅限流 429 场景使用）
 */
export function rateLimitedResponse(request) {
  const headers = request ? getCorsHeaders(request) : {}
  headers['Retry-After'] = '60'
  headers['X-RateLimit-Limit'] = String(RATE_LIMIT_MAX)
  headers['X-RateLimit-Remaining'] = '0'
  headers['X-RateLimit-Reset'] = String(Math.ceil(Date.now() / 1000) + RATE_LIMIT_WINDOW)
  return new Response(JSON.stringify({ error: '请求过于频繁，请稍后再试' }), {
    status: 429,
    headers,
  })
}

export function handleOptions(request) {
  return new Response(null, { headers: getCorsHeaders(request) })
}

// ============ 限流 ============
const RATE_LIMIT_WINDOW = 60
const RATE_LIMIT_MAX = 30

export async function checkRateLimit(request, env) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown'
  const key = `ratelimit:${ip}`
  const now = Math.floor(Date.now() / 1000)
  const windowStart = now - RATE_LIMIT_WINDOW

  try {
    const raw = await env.MOOD_STATS.get(key)
    let data = raw ? JSON.parse(raw) : { requests: [], windowStart: now }
    data.requests = data.requests.filter(t => t > windowStart)

    if (data.requests.length >= RATE_LIMIT_MAX) {
      return false
    }

    data.requests.push(now)
    await env.MOOD_STATS.put(key, JSON.stringify(data), { expirationTtl: RATE_LIMIT_WINDOW * 2 })
    return true
  } catch {
    return true
  }
}
