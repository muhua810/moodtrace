import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, CalendarDays, LayoutGrid, Settings, Database, Sparkles, Zap, TrendingUp } from 'lucide-react'
import HeatmapCalendar from '../components/HeatmapCalendar'
import MonthCalendar from '../components/MonthCalendar'
import MiniTrend from '../components/MiniTrend'
import KeywordCloud from '../components/KeywordCloud'
import { getAllRecords, getAllRecordsAsync, saveRecord } from '../services/storage'
import { MOOD_TYPES } from '../utils/moodUtils'
import { getLocalDateString } from '../utils/moodUtils'
import { fetchMoodSummary } from '../services/apiService'
import { generateDemoData, shouldAutoImportDemo } from '../services/demoData'
// 响应式媒体查询 hook
function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  )
  useEffect(() => {
    const mql = window.matchMedia(query)
    const handler = (e) => setMatches(e.matches)
    mql.addEventListener('change', handler)
    setMatches(mql.matches)
    return () => mql.removeEventListener('change', handler)
  }, [query])
  return matches
}


/** 安全截断文本 */
function truncate(str, max = 80) {
  if (!str) return ''
  return str.length > max ? str.slice(0, max) + '…' : str
}

export default function HomePage() {
  const [records, setRecords] = useState(() => getAllRecords())
  const [loading, setLoading] = useState(() => {
    try {
      return localStorage.getItem('mood_calendar_enc_enabled') === 'true'
    } catch { return false }
  })
  // 移动端默认月视图，桌面端默认热力图
  const isMobile = useMediaQuery('(max-width: 767px)')
  const [viewMode, setViewMode] = useState('heatmap')
  useEffect(() => {
    if (isMobile && viewMode === 'heatmap') setViewMode('month')
  }, [isMobile])
  const [importingDemo, setImportingDemo] = useState(false)
  const [showGuide, setShowGuide] = useState(() => {
    try { return localStorage.getItem('mood_calendar_show_guide') === 'true' } catch { return false }
  })
  const [greeting, setGreeting] = useState('')
  const [communityStats, setCommunityStats] = useState(null)
  const navigate = useNavigate()

  // 根据时间设置问候语
  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 6) setGreeting('夜深了，早点休息 🌙')
    else if (hour < 9) setGreeting('早安，新的一天 ☀️')
    else if (hour < 12) setGreeting('上午好 🌤️')
    else if (hour < 14) setGreeting('中午好 🌞')
    else if (hour < 18) setGreeting('下午好 ☁️')
    else if (hour < 22) setGreeting('晚上好 🌆')
    else setGreeting('夜深了 🌙')
  }, [])
  // 内置群体情绪演示数据（API 不可达时的 fallback）— 缓存结果，刷新不随机变化
  const getDemoFallback = useCallback(() => {
    if (getDemoFallback._cached) return getDemoFallback._cached
    const now = new Date()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const days = {}
    const moods = { very_negative: 0, negative: 0, neutral: 0, positive: 0, very_positive: 0 }
    // 固定分布比例，不用随机数，保证刷新一致
    const dayDistribution = [
      { very_negative: 3, negative: 13, neutral: 30, positive: 37, very_positive: 17 },
      { very_negative: 4, negative: 14, neutral: 28, positive: 38, very_positive: 16 },
      { very_negative: 2, negative: 12, neutral: 32, positive: 36, very_positive: 18 },
    ]
    for (let d = 1; d <= Math.min(daysInMonth, now.getDate()); d++) {
      const dayStr = String(d).padStart(2, '0')
      const pattern = dayDistribution[(d - 1) % dayDistribution.length]
      const total = Object.values(pattern).reduce((s, v) => s + v, 0)
      days[dayStr] = { total, moods: { ...pattern } }
      Object.entries(pattern).forEach(([k, v]) => { moods[k] += v })
    }
    const totalRecords = Object.values(days).reduce((s, d) => s + d.total, 0)
    const result = { total: totalRecords, moods, days, isDemo: true }
    getDemoFallback._cached = result
    return result
  }, [])

  // 加载群体情绪统计
  useEffect(() => {
    const month = new Date().toISOString().slice(0, 7)
    fetchMoodSummary(month).then(data => {
      if (data && data.total > 0) {
        setCommunityStats(data)
      } else {
        console.warn('[MoodTrace] API 返回空数据，使用内置演示数据')
        setCommunityStats(getDemoFallback())
      }
    }).catch(err => {
      console.warn('[MoodTrace] API 请求失败，使用内置演示数据:', err?.message)
      setCommunityStats(getDemoFallback())
    })
  }, [])

  // 初始化：异步加载（支持加密模式）
  useEffect(() => {
    getAllRecordsAsync().then(data => {
      setRecords(data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  // 监听 localStorage 变化，实时更新
  useEffect(() => {
    const refresh = async () => {
      const data = await getAllRecordsAsync()
      setRecords(data)
    }
    window.addEventListener('storage', refresh)
    window.addEventListener('mood-record-updated', refresh)
    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener('mood-record-updated', refresh)
    }
  }, [])

  const handleDayClick = useCallback((date, record) => {
    navigate(`/record?date=${date}`)
  }, [navigate])

  // 导入示例数据（365天，支撑完整年度报告）
  const handleImportDemo = useCallback(() => {
    setImportingDemo(true)
    const demoRecords = generateDemoData(365)
    for (const record of demoRecords) {
      saveRecord(record)
    }
    // 触发刷新
    window.dispatchEvent(new Event('mood-record-updated'))
    setTimeout(() => setImportingDemo(false), 500)
  }, [])

  const todayStr = getLocalDateString()
  const todayRecord = records.find(r => r.date === todayStr)
  const recentRecords = useMemo(
    () => [...records].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3),
    [records]
  )

  const isEmpty = records.length === 0

  // 关闭首次引导
  const dismissGuide = useCallback(() => {
    setShowGuide(false)
    localStorage.removeItem('mood_calendar_show_guide')
  }, [])

  // 加密模式加载中：显示骨架屏，避免闪空
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="h-6 w-24 bg-white/10 rounded animate-pulse mb-2" />
            <div className="h-3 w-40 bg-white/5 rounded animate-pulse" />
          </div>
          <div className="w-8 h-8 bg-white/10 rounded-xl animate-pulse" />
        </div>
        <div className="card p-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/10 rounded-xl animate-pulse" />
            <div className="flex-1">
              <div className="h-4 w-32 bg-white/10 rounded animate-pulse mb-2" />
              <div className="h-3 w-24 bg-white/5 rounded animate-pulse" />
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="h-4 w-24 bg-white/10 rounded animate-pulse mb-3" />
          <div className="h-40 bg-white/5 rounded-xl animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold gradient-text">心迹</h1>
          {greeting && <p className="text-xs theme-text-secondary mt-1">{greeting}</p>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs theme-text-tertiary hidden sm:inline">
            {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })}
          </span>
          <button
            onClick={() => navigate('/profile')}
            className="p-2 rounded-xl hover:bg-white/10 theme-text-tertiary hover:theme-text transition-colors"
            aria-label="设置"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* 今日卡片 — 带情绪光晕 */}
      <div className="card p-5 mb-4 hover-float" style={todayRecord ? { boxShadow: `0 0 40px ${MOOD_TYPES[todayRecord.mood]?.color}12` } : undefined}>
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl transition-all duration-500 ${
            todayRecord ? '' : 'bg-white/5'
          }`} style={todayRecord ? {
            background: `linear-gradient(135deg, ${MOOD_TYPES[todayRecord.mood]?.color}18, ${MOOD_TYPES[todayRecord.mood]?.color}08)`,
            boxShadow: `0 4px 20px ${MOOD_TYPES[todayRecord.mood]?.color}15`,
          } : undefined}>
            {todayRecord ? MOOD_TYPES[todayRecord.mood]?.emoji : '📝'}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium theme-text">
              {todayRecord ? '今日已记录' : '今天感觉怎么样？'}
            </p>
            <p className="text-xs theme-text-tertiary mt-0.5">
              {todayRecord ? todayRecord.moodLabel : '一句话记录你的心情'}
            </p>
          </div>
          <button
            onClick={() => navigate(`/record?date=${todayStr}${todayRecord ? '&edit=true' : ''}`)}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-white text-sm font-medium transition-all active:scale-95"
            style={{ background: todayRecord ? MOOD_TYPES[todayRecord.mood]?.gradient : 'linear-gradient(135deg, #a78bfa, #f472b6)' }}
          >
            <Plus size={16} />
            {todayRecord ? '修改' : '记录'}
          </button>
        </div>
      </div>

      {/* 群体情绪概览 — 前后端协作展示 */}
      {communityStats && (
        <div className="card p-4 mb-4 animate-fade-in-up border border-purple-500/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-base">🌐</span>
              <h2 className="text-sm font-semibold theme-text">今日群体情绪</h2>
              {communityStats.isDemo && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400">模拟</span>
              )}
            </div>
            <span className="text-[10px] theme-text-muted">{communityStats.total} 人次</span>
          </div>
          <div className="flex gap-1 h-2 rounded-full overflow-hidden mb-2" role="img" aria-label="群体情绪分布">
            {Object.entries(communityStats.moods).map(([mood, count]) => {
              const pct = communityStats.total > 0 ? (count / communityStats.total * 100) : 0
              if (pct < 1) return null
              const colors = {
                very_negative: '#ef4444', negative: '#f97316',
                neutral: '#eab308', positive: '#22c55e', very_positive: '#6366f1',
              }
              return (
                <div
                  key={mood}
                  style={{ width: `${pct}%`, backgroundColor: colors[mood] }}
                  className="rounded-full transition-all duration-500"
                  title={`${mood}: ${Math.round(pct)}%`}
                />
              )
            })}
          </div>
          <div className="flex items-center justify-between text-[10px] theme-text-tertiary">
            <span>😊 {communityStats.moodPercentages?.positive || Math.round((communityStats.moods.positive / communityStats.total) * 100)}% 心情不错</span>
            <button
              onClick={() => navigate('/stats?tab=community')}
              className="text-purple-400 hover:text-purple-300 transition-colors"
            >
              查看详情 →
            </button>
          </div>
        </div>
      )}

      {/* 数据量不足提示：检测到旧数据（<300天）时提示重新导入完整年份 */}
      {!isEmpty && records.length < 300 && (
        <div className="card p-4 mb-4 border border-amber-500/20 bg-amber-500/5 animate-fade-in-up">
          <div className="flex items-start gap-3">
            <span className="text-xl mt-0.5">✨</span>
            <div className="flex-1">
              <p className="text-sm font-medium theme-text">体验完整年度报告</p>
              <p className="text-xs theme-text-tertiary mt-1">
                当前有 {records.length} 条记录。导入一整年示例数据（365天），可完整体验年度报告、趋势分析等所有功能。
              </p>
              <button
                onClick={handleImportDemo}
                disabled={importingDemo}
                className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-medium transition-all active:scale-95 disabled:opacity-50"
              >
                <Database size={14} />
                {importingDemo ? '导入中...' : '导入 365 天示例数据'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 空状态：导入示例数据 */}
      {isEmpty && (
        <div className="mb-6 animate-fade-in-up">
          {/* 主体验卡片 */}
          <div className="relative overflow-hidden rounded-2xl p-6 sm:p-8 text-center"
            style={{
              background: 'linear-gradient(135deg, rgba(168,85,247,0.15) 0%, rgba(244,114,182,0.15) 50%, rgba(99,102,241,0.1) 100%)',
              border: '1px solid rgba(168,85,247,0.2)',
            }}
          >
            {/* 背景装饰 */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none" aria-hidden="true">
              <div className="absolute -top-6 -left-6 w-24 h-24 rounded-full bg-purple-500/10 blur-2xl" />
              <div className="absolute -bottom-6 -right-6 w-32 h-32 rounded-full bg-pink-500/10 blur-2xl" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-indigo-500/5 blur-3xl" />
            </div>

            <div className="relative z-10">
              <div className="text-5xl mb-4 animate-bounce-soft">✨</div>
              <h2 className="text-xl font-bold gradient-text mb-2">欢迎使用心迹</h2>
              <p className="text-sm theme-text-secondary mb-1">
                AI 驱动的情绪追踪与心理健康可视化
              </p>
              <p className="text-xs theme-text-tertiary mb-6">
                每天一句话记录心情，AI 自动分析，发现情绪规律
              </p>

              {/* 核心功能亮点 */}
              <div className="grid grid-cols-3 gap-3 mb-6 max-w-xs mx-auto">
                <div className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-white/5">
                  <span className="text-lg">🤖</span>
                  <span className="text-[10px] theme-text-secondary">AI 分析</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-white/5">
                  <span className="text-lg">📊</span>
                  <span className="text-[10px] theme-text-secondary">热力图</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-white/5">
                  <span className="text-lg">🔒</span>
                  <span className="text-[10px] theme-text-secondary">隐私保护</span>
                </div>
              </div>

              {/* 主 CTA：一键体验完整功能 */}
              <button
                onClick={handleImportDemo}
                disabled={importingDemo}
                className="w-full max-w-xs mx-auto flex items-center justify-center gap-2.5 py-4 rounded-2xl text-white font-semibold text-base transition-all active:scale-[0.97] hover:shadow-lg hover:shadow-purple-500/20 disabled:opacity-50 mb-3"
                style={{
                  background: 'linear-gradient(135deg, #a855f7, #ec4899, #6366f1)',
                  backgroundSize: '200% 200%',
                  animation: importingDemo ? 'none' : 'gradient-shift 3s ease infinite',
                }}
              >
                <Sparkles size={20} />
                {importingDemo ? '正在导入...' : '一键体验完整功能'}
              </button>
              <p className="text-[10px] theme-text-muted mb-4">
                导入 365 天模拟数据 · 热力图 · 统计 · 年度报告全部解锁
              </p>

              {/* 分隔线 */}
              <div className="flex items-center gap-3 max-w-xs mx-auto mb-4">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-[10px] theme-text-muted">或者</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              {/* 次要 CTA：自己记录 */}
              <button
                onClick={() => navigate(`/record?date=${todayStr}`)}
                className="w-full max-w-xs mx-auto flex items-center justify-center gap-2 py-3 rounded-xl bg-white/10 hover:bg-white/15 theme-text text-sm font-medium transition-all active:scale-[0.98]"
              >
                <Plus size={16} />
                从记录今天的心情开始
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 最近记录 */}
      {recentRecords.length > 0 && (
        <div className="card p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold theme-text">最近记录</h2>
            {records.length > 3 && (
              <button
                onClick={() => navigate('/stats')}
                className="text-xs text-pink-400 hover:text-pink-300 transition-colors focus:outline-none focus:ring-2 focus:ring-pink-400/50 rounded px-1 py-0.5"
              >
                查看全部 ({records.length})
              </button>
            )}
          </div>
          <div className="space-y-2">
            {recentRecords.map(r => (
              <button
                key={r.id}
                onClick={() => navigate(`/record?date=${r.date}`)}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors text-left"
              >
                <span className="text-lg">{MOOD_TYPES[r.mood]?.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm theme-text truncate">{truncate(r.text)}</p>
                  <p className="text-xs theme-text-tertiary">{r.date} · {r.moodLabel}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 迷你7天趋势 */}
      {!isEmpty && <MiniTrend records={records} />}

      {/* 高频关键词云 */}
      {!isEmpty && records.length >= 5 && <KeywordCloud records={records} maxWords={20} />}

      {/* 首次引导：指向热力图 */}
      {showGuide && !isEmpty && (
        <div className="card p-4 mb-4 border border-pink-500/30 bg-pink-500/5 animate-fade-in-up relative">
          <button
            onClick={dismissGuide}
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center theme-text-tertiary hover:theme-text text-xs transition-colors"
            aria-label="关闭引导"
          >
            ✕
          </button>
          <div className="flex items-start gap-3">
            <span className="text-2xl mt-0.5">👇</span>
            <div>
              <p className="text-sm font-medium theme-text mb-1">你的专属心迹在这里！</p>
              <p className="text-xs theme-text-tertiary">
                下方热力图展示了你每一天的情绪记录。点击任意日期可以查看或修改记录。试试切换年/月视图看看不同维度的情绪分布。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 热力图/月视图 */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold theme-text">情绪热力图</h2>
          <div className="flex gap-1 bg-white/5 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('heatmap')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'heatmap' ? 'bg-pink-500/20 text-pink-400' : 'theme-text-tertiary hover:theme-text-secondary'
              }`}
              aria-label="年视图"
              title="年视图"
            >
              <CalendarDays size={14} />
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'month' ? 'bg-pink-500/20 text-pink-400' : 'theme-text-tertiary hover:theme-text-secondary'
              }`}
              aria-label="月视图"
              title="月视图"
            >
              <LayoutGrid size={14} />
            </button>
          </div>
        </div>

        {viewMode === 'heatmap' ? (
          <HeatmapCalendar records={records} onDayClick={handleDayClick} />
        ) : (
          <MonthCalendar records={records} onDayClick={handleDayClick} />
        )}
      </div>
    </div>
  )
}
