/**
 * 心迹 MoodTrace — Cloudflare Worker 后端
 *
 * 架构：模块化路由分离
 *   routes/analyze.js  — AI 情绪分析代理（DeepSeek）
 *   routes/stats.js    — 群体情绪统计（提交/查询/趋势/关键词）
 *   routes/backup.js   — 云端备份/恢复
 *   utils.js           — CORS、限流等公共工具
 *
 * API：
 *   POST /api/analyze          AI 情绪分析代理
 *   POST /api/stats/submit     提交匿名情绪数据
 *   GET  /api/stats/summary    获取群体情绪统计
 *   GET  /api/stats/trends     获取月趋势
 *   GET  /api/stats/keywords   获取关键词热度
 *   POST /api/backup/save      云端备份数据
 *   GET  /api/backup/restore   恢复云端数据
 *   GET  /api/health           健康检查
 */

import { corsResponse, handleOptions, checkRateLimit, rateLimitedResponse } from './utils.js'
import { handleAnalyze } from './routes/analyze.js'
import { handleSubmit, handleSummary, handleTrends, handleKeywords } from './routes/stats.js'
import { handleBackupSave, handleBackupRestore } from './routes/backup.js'

// ============ 健康检查 ============
function handleHealth() {
  return corsResponse({
    status: 'ok',
    service: 'moodtrace-api',
    version: '2.0.0',
    time: new Date().toISOString(),
    endpoints: [
      'POST /api/analyze',
      'POST /api/stats/submit',
      'GET  /api/stats/summary?month=YYYY-MM',
      'GET  /api/stats/trends?months=3',
      'GET  /api/stats/keywords?month=YYYY-MM&limit=20',
      'POST /api/backup/save',
      'GET  /api/backup/restore?deviceId=xxx',
      'GET  /api/health',
    ],
  })
}

// ============ 路由表 ============
export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (request.method === 'OPTIONS') return handleOptions(request)

    // 健康检查不限流
    if (url.pathname === '/api/health' && request.method === 'GET') return handleHealth()

    // 其他接口限流（返回标准限流头）
    const allowed = await checkRateLimit(request, env)
    if (!allowed) return rateLimitedResponse(request)

    // 路由分发
    if (url.pathname === '/api/analyze' && request.method === 'POST') return handleAnalyze(request, env)
    if (url.pathname === '/api/stats/submit' && request.method === 'POST') return handleSubmit(request, env)
    if (url.pathname === '/api/stats/summary' && request.method === 'GET') return handleSummary(request, env)
    if (url.pathname === '/api/stats/trends' && request.method === 'GET') return handleTrends(request, env)
    if (url.pathname === '/api/stats/keywords' && request.method === 'GET') return handleKeywords(request, env)
    if (url.pathname === '/api/backup/save' && request.method === 'POST') return handleBackupSave(request, env)
    if (url.pathname === '/api/backup/restore' && request.method === 'GET') return handleBackupRestore(request, env)

    return corsResponse({ error: 'Not Found' }, 404)
  },
}
