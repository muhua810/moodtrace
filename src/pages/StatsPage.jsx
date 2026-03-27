import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, TrendingUp, Calendar, Award, Flame, Clock, Users, RefreshCw } from 'lucide-react'
import { format, parseISO, subDays, isWeekend, subMonths, getDay } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area, Legend
} from 'recharts'
import { MOOD_TYPES, formatIntensityStars } from '../utils/moodUtils'
import { getAllRecords, getAllRecordsAsync, getStreakDays, getMaxStreak } from '../services/storage'
import { fetchMoodSummary } from '../services/apiService'

const MOOD_COLORS = {
  very_negative: '#ef4444',
  negative: '#f97316',
  neutral: '#eab308',
  positive: '#22c55e',
  very_positive: '#6366f1',
}

const MOOD_SCORE_MAP = {
  very_negative: 1, negative: 2, neutral: 3, positive: 4, very_positive: 5,
}

export default function StatsPage() {
  const [records, setRecords] = useState(() => getAllRecords())
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [communityData, setCommunityData] = useState(null)
  const [communityLoading, setCommunityLoading] = useState(false)

  // 初始化：异步加载（支持加密模式）
  useEffect(() => {
    getAllRecordsAsync().then(setRecords)
  }, [])

  // 监听数据变化，实时更新统计
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

  // 尝试加载群体数据
  useEffect(() => {
    loadCommunityData()
  }, [])

  const loadCommunityData = async (force = false) => {
    const currentMonth = format(new Date(), 'yyyy-MM')
    const cacheKey = `community_cache_${currentMonth}`

    // 检查缓存（5分钟内不重复请求）
    if (!force) {
      try {
        const cached = sessionStorage.getItem(cacheKey)
        if (cached) {
          const { data, timestamp } = JSON.parse(cached)
          if (Date.now() - timestamp < 5 * 60 * 1000 && data) {
            setCommunityData(data)
            return
          }
        }
      } catch { /* ignore */ }
    }

    setCommunityLoading(true)
    try {
      const data = await fetchMoodSummary(currentMonth)
      if (data && data.total > 0) {
        setCommunityData(data)
        // 写入缓存
        try { sessionStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: Date.now() })) } catch {}
      }
    } catch { /* 静默失败 */ }
    setCommunityLoading(false)
  }

  const stats = useMemo(() => {
    if (!records.length) return null

    const moodCounts = {}
    Object.keys(MOOD_TYPES).forEach(k => moodCounts[k] = 0)
    records.forEach(r => { if (moodCounts[r.mood] !== undefined) moodCounts[r.mood]++ })

    const total = records.length
    const topMoods = Object.entries(moodCounts)
      .sort(([, a], [, b]) => b - a)
      .filter(([, count]) => count > 0)
      .slice(0, 3)

    const avgMood = records.reduce((sum, r) => {
      return sum + (MOOD_TYPES[r.mood]?.intensity || 3)
    }, 0) / total

    const sortedByDate = [...records].sort((a, b) => b.date.localeCompare(a.date))
    const streak = getStreakDays()
    const maxStreak = getMaxStreak()

    // 工作日 vs 周末
    const weekdayRecords = records.filter(r => !isWeekend(parseISO(r.date)))
    const weekendRecords = records.filter(r => isWeekend(parseISO(r.date)))
    const weekdayAvg = weekdayRecords.length
      ? weekdayRecords.reduce((s, r) => s + (MOOD_TYPES[r.mood]?.intensity || 3), 0) / weekdayRecords.length
      : 0
    const weekendAvg = weekendRecords.length
      ? weekendRecords.reduce((s, r) => s + (MOOD_TYPES[r.mood]?.intensity || 3), 0) / weekendRecords.length
      : 0

    // 最近 30 天趋势 (用于折线图)
    const trend30 = []
    for (let i = 29; i >= 0; i--) {
      const d = format(subDays(new Date(), i), 'yyyy-MM-dd')
      const rec = records.find(r => r.date === d)
      trend30.push({
        date: format(subDays(new Date(), i), 'M/d'),
        fullDate: d,
        score: rec ? (MOOD_TYPES[rec.mood]?.intensity || 0) : null,
        mood: rec?.mood || null,
        text: rec?.text || '',
        hasRecord: !!rec,
      })
    }

    // 情绪分布 (用于饼图)
    const pieData = Object.entries(moodCounts)
      .filter(([, count]) => count > 0)
      .map(([key, count]) => ({
        name: MOOD_TYPES[key]?.label || key,
        value: count,
        color: MOOD_COLORS[key],
        key,
      }))

    // 月度统计 (用于柱状图)
    const monthlyStats = {}
    records.forEach(r => {
      const month = r.date.slice(0, 7)
      if (!monthlyStats[month]) monthlyStats[month] = { total: 0, sumIntensity: 0, moods: {} }
      monthlyStats[month].total++
      monthlyStats[month].sumIntensity += MOOD_TYPES[r.mood]?.intensity || 3
      monthlyStats[month].moods[r.mood] = (monthlyStats[month].moods[r.mood] || 0) + 1
    })

    // 最近 6 个月柱状图数据
    const barData = Object.entries(monthlyStats)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, data]) => ({
        month: month.replace(/(\d{4})-(\d{2})/, '$2月'),
        avg: Number((data.sumIntensity / data.total).toFixed(1)),
        count: data.total,
        rate: Math.round((data.total / 30) * 100),
      }))

    // 每周情绪均值 (按星期几)
    const weekdayStats = Array.from({ length: 7 }, () => ({ sum: 0, count: 0 }))
    records.forEach(r => {
      const dayOfWeek = getDay(parseISO(r.date))
      weekdayStats[dayOfWeek].sum += MOOD_TYPES[r.mood]?.intensity || 3
      weekdayStats[dayOfWeek].count++
    })
    const weekdayAvgData = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'].map((label, i) => ({
      day: label,
      avg: weekdayStats[i].count ? Number((weekdayStats[i].sum / weekdayStats[i].count).toFixed(1)) : 0,
      count: weekdayStats[i].count,
    }))

    return {
      total, moodCounts, topMoods, avgMood, streak, maxStreak,
      weekdayAvg, weekendAvg, trend30, pieData, barData, weekdayAvgData,
      monthlyStats, sortedByDate,
    }
  }, [records])

  // 群体数据处理：优先用服务端数据，无数据时用本地数据兜底
  const communityChartData = useMemo(() => {
    const source = communityData || (stats ? {
      total: stats.total,
      moods: Object.fromEntries(stats.pieData.map(p => [p.key, p.value])),
    } : null)
    if (!source) return null
    const pie = Object.entries(source.moods)
      .filter(([, count]) => count > 0)
      .map(([key, count]) => ({
        name: MOOD_TYPES[key]?.label || key,
        value: count,
        color: MOOD_COLORS[key],
      }))
    const avg = Object.entries(source.moods).reduce((sum, [key, count]) => {
      return sum + (MOOD_SCORE_MAP[key] || 3) * count
    }, 0) / (source.total || 1)
    return { pie, avg: avg.toFixed(1), total: source.total, isLocal: !communityData }
  }, [communityData, stats])

  if (!stats) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
          <BarChart3 size={28} className="theme-text-tertiary" />
        </div>
        <h2 className="text-lg font-semibold theme-text mb-2">还没有数据</h2>
        <p className="theme-text-secondary text-sm mb-6">记录你的心情，这里会展示有趣的统计</p>
        <button
          onClick={() => navigate('/record')}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white font-medium text-sm transition-all active:scale-95"
        >
          去记录
        </button>
      </div>
    )
  }

  const tabs = [
    { key: 'overview', label: '总览' },
    { key: 'trend', label: '趋势' },
    { key: 'monthly', label: '月度' },
    { key: 'annual', label: '年度' },
    { key: 'community', label: '群体' },
  ]

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
      <h1 className="text-xl font-bold theme-text mb-4">统计分析</h1>

      <div className="flex gap-1 mb-5 bg-white/5 rounded-lg p-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all ${
              activeTab === t.key ? 'bg-pink-500/20 text-pink-400' : 'theme-text-tertiary hover:theme-text-secondary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ============ 总览 Tab ============ */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={<Calendar size={16} />} label="总记录" value={stats.total} unit="天" color="text-pink-400" />
            <StatCard icon={<Flame size={16} />} label="连续记录" value={stats.streak} unit="天" color="text-orange-400" />
            <StatCard icon={<TrendingUp size={16} />} label="平均心情" value={stats.avgMood.toFixed(1)} unit="/5" color="text-green-400" />
            <StatCard icon={<Award size={16} />} label="最长连续" value={stats.maxStreak} unit="天" color="text-indigo-400" />
          </div>

          {/* 情绪分布饼图 */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold theme-text mb-3">情绪分布</h3>
            <div className="flex items-center gap-4">
              <div style={{ width: 140, height: 140 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={60}
                      paddingAngle={2}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {stats.pieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'var(--theme-bg)',
                        border: '1px solid var(--theme-border)',
                        borderRadius: 8,
                        fontSize: 12,
                        color: 'var(--theme-text)',
                      }}
                      formatter={(value, name) => [`${value}次 (${Math.round(value / stats.total * 100)}%)`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {stats.pieData.map(item => (
                  <div key={item.key} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-xs theme-text-secondary flex-1">{item.name}</span>
                    <span className="text-xs theme-text-tertiary">{Math.round(item.value / stats.total * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 工作日 vs 周末 */}
          {stats.weekdayAvg > 0 && stats.weekendAvg > 0 && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold theme-text mb-3 flex items-center gap-2">
                <Clock size={14} className="text-blue-400" /> 工作日 vs 周末
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 rounded-lg bg-white/5">
                  <p className="text-2xl font-bold theme-text">{stats.weekdayAvg.toFixed(1)}</p>
                  <p className="text-xs theme-text-tertiary mt-1">工作日平均</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-white/5">
                  <p className="text-2xl font-bold theme-text">{stats.weekendAvg.toFixed(1)}</p>
                  <p className="text-xs theme-text-tertiary mt-1">周末平均</p>
                </div>
              </div>
              {stats.weekendAvg > stats.weekdayAvg && (
                <p className="text-xs text-green-400/80 mt-2 text-center">✨ 你周末的心情比工作日好！</p>
              )}
              {stats.weekdayAvg > stats.weekendAvg && (
                <p className="text-xs text-blue-400/80 mt-2 text-center">💡 你工作日的状态反而更好呢</p>
              )}
            </div>
          )}

          {/* 按星期几分析 */}
          {stats.weekdayAvgData.some(d => d.count > 0) && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold theme-text mb-3">每周心情节律</h3>
              <div style={{ width: '100%', height: 160 }}>
                <ResponsiveContainer>
                  <BarChart data={stats.weekdayAvgData} barSize={24}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--theme-border)" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--theme-text-tertiary)' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 5]} tick={{ fontSize: 10, fill: 'var(--theme-text-tertiary)' }} axisLine={false} tickLine={false} width={20} />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--theme-bg)',
                        border: '1px solid var(--theme-border)',
                        borderRadius: 8,
                        fontSize: 12,
                        color: 'var(--theme-text)',
                      }}
                      formatter={(value) => [`${value}/5`, '平均心情']}
                    />
                    <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                      {stats.weekdayAvgData.map((entry, index) => {
                        const color = entry.avg >= 4 ? '#22c55e' : entry.avg >= 3 ? '#eab308' : entry.avg >= 2 ? '#f97316' : '#ef4444'
                        return <Cell key={index} fill={entry.count > 0 ? color : 'rgba(255,255,255,0.05)'} />
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 最近记录 */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold theme-text mb-3">最近记录</h3>
            {stats.sortedByDate.slice(0, 5).map(r => {
              const mood = MOOD_TYPES[r.mood]
              return (
                <div key={r.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base" style={{ backgroundColor: mood?.color + '20' }}>
                    {mood?.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm theme-text truncate">{r.text}</p>
                    <p className="text-xs theme-text-tertiary">
                      {format(parseISO(r.date), 'M月d日', { locale: zhCN })} · {r.moodLabel}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ============ 趋势 Tab ============ */}
      {activeTab === 'trend' && (
        <div className="space-y-4">
          {/* 30天趋势折线图 */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold theme-text mb-3">近30天心情趋势</h3>
            <div style={{ width: '100%', height: 200 }}>
              <ResponsiveContainer>
                <AreaChart data={stats.trend30}>
                  <defs>
                    <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#c084fc" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#c084fc" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--theme-border)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: 'var(--theme-text-tertiary)' }}
                    axisLine={false}
                    tickLine={false}
                    interval={4}
                  />
                  <YAxis
                    domain={[0, 5]}
                    ticks={[1, 2, 3, 4, 5]}
                    tick={{ fontSize: 10, fill: 'var(--theme-text-tertiary)' }}
                    axisLine={false}
                    tickLine={false}
                    width={20}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0].payload
                      if (!d.hasRecord) return null
                      const moodInfo = MOOD_TYPES[d.mood]
                      return (
                        <div className="glass rounded-lg p-2 text-xs" style={{ minWidth: 120 }}>
                          <p className="font-medium theme-text">{d.fullDate}</p>
                          <p className="theme-text-secondary mt-1">{moodInfo?.emoji} {moodInfo?.label}</p>
                          {d.text && <p className="theme-text-tertiary mt-0.5 truncate">{d.text}</p>}
                        </div>
                      )
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#c084fc"
                    strokeWidth={2}
                    fill="url(#moodGradient)"
                    connectNulls={false}
                    dot={(props) => {
                      const { cx, cy, payload } = props
                      if (!payload.hasRecord) return null
                      const color = MOOD_COLORS[payload.mood] || '#c084fc'
                      return <circle cx={cx} cy={cy} r={4} fill={color} stroke={color} strokeWidth={1} />
                    }}
                    activeDot={{ r: 6, stroke: '#c084fc', strokeWidth: 2, fill: 'var(--theme-bg)' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 最常出现的心情 */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold theme-text mb-3">最常出现的心情</h3>
            {stats.topMoods.map(([key, count]) => {
              const mood = MOOD_TYPES[key]
              const pct = Math.round((count / stats.total) * 100)
              return (
                <div key={key} className="flex items-center gap-3 mb-2 last:mb-0">
                  <span className="text-lg w-6 text-center">{mood?.emoji}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="theme-text-secondary">{mood?.label}</span>
                      <span className="theme-text-tertiary">{count}次 ({pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: mood?.color }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ============ 月度 Tab ============ */}
      {activeTab === 'monthly' && (
        <div className="space-y-4">
          {/* 月度均值柱状图 */}
          {stats.barData.length > 0 && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold theme-text mb-3">月度心情均值</h3>
              <div style={{ width: '100%', height: 180 }}>
                <ResponsiveContainer>
                  <BarChart data={stats.barData} barSize={28}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--theme-border)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--theme-text-tertiary)' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 5]} tick={{ fontSize: 10, fill: 'var(--theme-text-tertiary)' }} axisLine={false} tickLine={false} width={20} />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--theme-bg)',
                        border: '1px solid var(--theme-border)',
                        borderRadius: 8,
                        fontSize: 12,
                        color: 'var(--theme-text)',
                      }}
                      formatter={(value, name) => {
                        if (name === 'avg') return [`${value}/5`, '平均心情']
                        if (name === 'count') return [`${value}天`, '记录天数']
                        return [value, name]
                      }}
                    />
                    <Bar dataKey="avg" fill="#c084fc" radius={[4, 4, 0, 0]} name="avg" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 月度详情卡片 */}
          {Object.entries(stats.monthlyStats)
            .sort(([a], [b]) => b.localeCompare(a))
            .slice(0, 6)
            .map(([month, data]) => {
              const avg = (data.sumIntensity / data.total).toFixed(1)
              const topMood = Object.entries(data.moods).sort(([,a],[,b]) => b-a)[0]
              const moodInfo = MOOD_TYPES[topMood?.[0]]
              return (
                <div key={month} className="card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold theme-text">
                      {month.replace('-', '年')}月
                    </h3>
                    <span className="text-xs theme-text-tertiary">{data.total} 条记录</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-lg font-bold theme-text">{avg}</p>
                      <p className="text-xs theme-text-tertiary">平均心情</p>
                    </div>
                    <div>
                      <p className="text-lg">{moodInfo?.emoji || '😐'}</p>
                      <p className="text-xs theme-text-tertiary">最常情绪</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold theme-text">{Math.round((data.total / 30) * 100)}%</p>
                      <p className="text-xs theme-text-tertiary">记录率</p>
                    </div>
                  </div>
                  <div className="flex h-2 rounded-full overflow-hidden mt-3 gap-px">
                    {Object.entries(data.moods).map(([moodKey, count]) => (
                      <div
                        key={moodKey}
                        style={{ width: `${(count / data.total) * 100}%`, backgroundColor: MOOD_TYPES[moodKey]?.color }}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
        </div>
      )}

      {/* ============ 年度报告 Tab ============ */}
      {activeTab === 'annual' && (
        <div className="space-y-4">
          <AnnualReport records={records} navigate={navigate} />
        </div>
      )}

      {/* ============ 群体 Tab ============ */}
      {activeTab === 'community' && (
        <div className="space-y-4">
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold theme-text flex items-center gap-2">
                <Users size={14} className="text-cyan-400" /> {communityChartData?.isLocal ? '我的情绪总览' : '本月群体情绪'}
              </h3>
              <button
                onClick={() => loadCommunityData(true)}
                disabled={communityLoading}
                className="p-1.5 rounded-lg hover:bg-white/10 theme-text-tertiary hover:theme-text transition-colors"
                aria-label="刷新"
              >
                <RefreshCw size={14} className={communityLoading ? 'animate-spin' : ''} />
              </button>
            </div>

            {communityChartData ? (
              <>
                {communityChartData.isLocal && (
                  <div className="mb-3 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                    暂无群体数据，当前展示的是你自己的情绪分布。开启"匿名统计"后可汇聚更多人的数据。
                  </div>
                )}
                <div className="flex items-center gap-4 mb-4">
                  <div style={{ width: 120, height: 120 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={communityChartData.pie}
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={52}
                          paddingAngle={2}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          {communityChartData.pie.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: 'var(--theme-bg)',
                            border: '1px solid var(--theme-border)',
                            borderRadius: 8,
                            fontSize: 12,
                            color: 'var(--theme-text)',
                          }}
                          formatter={(value, name) => [`${value}次`, name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1">
                    <p className="text-2xl font-bold theme-text">{communityChartData.avg}<span className="text-sm font-normal theme-text-tertiary">/5</span></p>
                    <p className="text-xs theme-text-tertiary">{communityChartData.isLocal ? '我的平均心情' : '群体平均心情'}</p>
                    <p className="text-xs theme-text-muted mt-1">{communityChartData.total} {communityChartData.isLocal ? '条记录' : '人次参与'}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {communityChartData.pie.map(item => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-xs theme-text-secondary flex-1">{item.name}</span>
                      <span className="text-xs theme-text-tertiary">{item.value}次</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <Users size={32} className="theme-text-muted mx-auto mb-3" />
                <p className="text-sm theme-text-secondary mb-2">还没有数据</p>
                <p className="text-xs theme-text-tertiary">开始记录心情后，这里会展示你的情绪分布</p>
              </div>
            )}
          </div>

          {/* 我 vs 群体对比 — 仅在有服务端群体数据时显示 */}
          {communityChartData && !communityChartData.isLocal && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold theme-text mb-3">我 vs 群体</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 rounded-lg bg-pink-500/10 border border-pink-500/20">
                  <p className="text-2xl font-bold text-pink-400">{stats.avgMood.toFixed(1)}</p>
                  <p className="text-xs theme-text-tertiary mt-1">我的平均心情</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                  <p className="text-2xl font-bold text-cyan-400">{communityChartData.avg}</p>
                  <p className="text-xs theme-text-tertiary mt-1">群体平均心情</p>
                </div>
              </div>
              {Number(stats.avgMood.toFixed(1)) > Number(communityChartData.avg) && (
                <p className="text-xs text-green-400/80 mt-3 text-center">🎉 你的心情比群体平均更好！继续保持~</p>
              )}
              {Number(stats.avgMood.toFixed(1)) < Number(communityChartData.avg) && (
                <p className="text-xs text-blue-400/80 mt-3 text-center">💙 最近可能有些低落，照顾好自己</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, unit, color, delay = 0 }) {
  return (
    <div className="card p-3">
      <div className={`flex items-center gap-1.5 mb-1.5 ${color}`}>{icon}<span className="text-xs">{label}</span></div>
      <p className="text-xl font-bold theme-text animate-count-up" style={{ animationDelay: `${delay}ms` }}>{value}<span className="text-xs font-normal theme-text-tertiary ml-0.5">{unit}</span></p>
    </div>
  )
}

// ============ 年度报告子组件 ============
function AnnualReport({ records, navigate }) {
  const currentYear = new Date().getFullYear()
  const yearRecords = records.filter(r => r.date?.startsWith(String(currentYear)))

  if (yearRecords.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-3">📊</div>
        <p className="theme-text-secondary text-sm">今年还没有记录，开始记录吧！</p>
        <button
          onClick={() => navigate('/record')}
          className="mt-4 px-5 py-2 rounded-xl bg-pink-500 hover:bg-pink-400 text-white text-sm font-medium transition-all"
        >
          去记录
        </button>
      </div>
    )
  }

  // 年度数据
  const yearMoodCounts = {}
  Object.keys(MOOD_TYPES).forEach(k => yearMoodCounts[k] = 0)
  yearRecords.forEach(r => { if (yearMoodCounts[r.mood] !== undefined) yearMoodCounts[r.mood]++ })

  const yearAvg = yearRecords.reduce((s, r) => s + (MOOD_TYPES[r.mood]?.intensity || 3), 0) / yearRecords.length
  const sortedYear = [...yearRecords].sort((a, b) => a.date.localeCompare(b.date))

  // 最佳月份
  const monthScores = {}
  yearRecords.forEach(r => {
    const m = r.date.slice(5, 7)
    if (!monthScores[m]) monthScores[m] = { sum: 0, count: 0 }
    monthScores[m].sum += MOOD_TYPES[r.mood]?.intensity || 3
    monthScores[m].count++
  })
  let bestMonth = null, worstMonth = null
  Object.entries(monthScores).forEach(([m, d]) => {
    const avg = d.sum / d.count
    if (!bestMonth || avg > bestMonth.avg) bestMonth = { month: m, avg, count: d.count }
    if (!worstMonth || avg < worstMonth.avg) worstMonth = { month: m, avg, count: d.count }
  })

  // 最佳连续天数
  let bestStreak = 0, currentStreak = 0
  yearRecords.forEach(r => {
    if (r.mood === 'positive' || r.mood === 'very_positive') {
      currentStreak++
      bestStreak = Math.max(bestStreak, currentStreak)
    } else {
      currentStreak = 0
    }
  })

  // 最常见情绪
  const topYearMood = Object.entries(yearMoodCounts).sort(([,a],[,b]) => b - a)[0]
  const topMoodInfo = MOOD_TYPES[topYearMood?.[0]]

  // 记录率
  const yearStart = new Date(currentYear, 0, 1)
  const daysInYear = Math.max(1, Math.round((new Date() - yearStart) / 86400000))
  const recordRate = Math.round((yearRecords.length / daysInYear) * 100)

  // 12 个月情绪趋势数据
  const monthNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']
  const monthlyTrend = monthNames.map((name, idx) => {
    const monthStr = String(idx + 1).padStart(2, '0')
    const monthRecords = yearRecords.filter(r => r.date.slice(5, 7) === monthStr)
    const avg = monthRecords.length > 0
      ? monthRecords.reduce((s, r) => s + (MOOD_TYPES[r.mood]?.intensity || 3), 0) / monthRecords.length
      : 0
    return { month: name, avg: Number(avg.toFixed(1)), count: monthRecords.length }
  })

  // 年度关键词云（从记录中提取关键词并统计频率）
  const keywordFreq = {}
  yearRecords.forEach(r => {
    if (Array.isArray(r.keywords)) {
      r.keywords.forEach(kw => {
        if (kw && kw.length <= 10) {
          keywordFreq[kw] = (keywordFreq[kw] || 0) + 1
        }
      })
    }
  })
  // 如果没有关键词数据，从文本中提取常见字词
  const hasKeywords = Object.keys(keywordFreq).length > 0
  if (!hasKeywords) {
    yearRecords.forEach(r => {
      if (r.text) {
        // 简单提取：取前4个字作为"关键词"
        const short = r.text.slice(0, 6)
        if (short.length >= 2) {
          keywordFreq[short] = (keywordFreq[short] || 0) + 1
        }
      }
    })
  }
  const sortedKeywords = Object.entries(keywordFreq)
    .sort(([,a],[,b]) => b - a)
    .slice(0, 20)

  // 年度寄语
  const getMessage = () => {
    if (yearAvg >= 4.5) return '🌟 这一年你过得太棒了！满满的正能量，愿你永远保持这份快乐和光芒。'
    if (yearAvg >= 4) return '🎉 这一年你过得很好！多数日子里你都是快乐的，继续保持这份积极的心态~'
    if (yearAvg >= 3.5) return '🌱 这一年总体平稳且积极，你很棒！记录让生活更有觉察力，加油！'
    if (yearAvg >= 3) return '🌈 这一年有起有伏，这就是生活的样子。你坚持记录的情绪，就是最好的成长见证。'
    if (yearAvg >= 2.5) return '💙 这一年可能有些辛苦，但请记住：每一个困难的日子都在让你变得更坚强。'
    return '💛 这一年你经历了不少低谷，但你仍然在记录、在面对。这份勇气很珍贵，新的一年愿你被温柔以待。'
  }

  return (
    <>
      {/* 年度封面 */}
      <div className="card p-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-indigo-500/10" />
        <div className="relative">
          <div className="text-5xl mb-2">{topMoodInfo?.emoji || '📝'}</div>
          <h2 className="text-xl font-bold gradient-text mb-1">{currentYear} 年度情绪报告</h2>
          <p className="text-xs theme-text-tertiary">你的这一年，被情绪记录了 {yearRecords.length} 天</p>
        </div>
      </div>

      {/* 核心数据 */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={<Calendar size={16} />} label="记录天数" value={yearRecords.length} unit="天" color="text-pink-400" delay={0} />
        <StatCard icon={<TrendingUp size={16} />} label="年度均分" value={yearAvg.toFixed(1)} unit="/5" color="text-green-400" delay={100} />
        <StatCard icon={<Award size={16} />} label="记录率" value={recordRate} unit="%" color="text-indigo-400" delay={200} />
        <StatCard icon={<Flame size={16} />} label="最佳连击" value={bestStreak} unit="天" color="text-orange-400" delay={300} />
      </div>

      {/* 最常情绪 */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold theme-text mb-3">年度主旋律</h3>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl" style={{ backgroundColor: topMoodInfo?.color + '20' }}>
            {topMoodInfo?.emoji}
          </div>
          <div>
            <p className="text-lg font-bold theme-text">{topMoodInfo?.label}</p>
            <p className="text-xs theme-text-tertiary">
              出现 {topYearMood?.[1]} 次，占 {Math.round(topYearMood?.[1] / yearRecords.length * 100)}%
            </p>
          </div>
        </div>
      </div>

      {/* 月度对比 */}
      {(bestMonth || worstMonth) && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold theme-text mb-3">月度对比</h3>
          <div className="grid grid-cols-2 gap-3">
            {bestMonth && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                <p className="text-2xl mb-1">🌟</p>
                <p className="text-sm font-medium text-green-400">{parseInt(bestMonth.month)}月</p>
                <p className="text-xs theme-text-tertiary mt-1">最佳月份 ({bestMonth.avg.toFixed(1)}/5)</p>
              </div>
            )}
            {worstMonth && (
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                <p className="text-2xl mb-1">💙</p>
                <p className="text-sm font-medium text-blue-400">{parseInt(worstMonth.month)}月</p>
                <p className="text-xs theme-text-tertiary mt-1">需要关怀 ({worstMonth.avg.toFixed(1)}/5)</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 12 个月情绪趋势面积图 */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold theme-text mb-3">12 个月情绪趋势</h3>
        <div style={{ width: '100%', height: 180 }}>
          <ResponsiveContainer>
            <AreaChart data={monthlyTrend}>
              <defs>
                <linearGradient id="yearMoodGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#c084fc" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#c084fc" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--theme-border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--theme-text-tertiary)' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 5]} tick={{ fontSize: 10, fill: 'var(--theme-text-tertiary)' }} axisLine={false} tickLine={false} width={20} />
              <Tooltip
                contentStyle={{
                  background: 'var(--theme-bg)',
                  border: '1px solid var(--theme-border)',
                  borderRadius: 8,
                  fontSize: 12,
                  color: 'var(--theme-text)',
                }}
                formatter={(value, name) => {
                  if (name === 'avg') return [value > 0 ? `${value}/5` : '无数据', '平均心情']
                  return [value, name]
                }}
              />
              <Area type="monotone" dataKey="avg" stroke="#c084fc" strokeWidth={2} fill="url(#yearMoodGrad)" connectNulls={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 年度情绪分布 */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold theme-text mb-3">年度情绪图谱</h3>
        <div className="space-y-2">
          {Object.entries(yearMoodCounts)
            .filter(([, c]) => c > 0)
            .sort(([,a],[,b]) => b - a)
            .map(([key, count]) => {
              const mood = MOOD_TYPES[key]
              const pct = Math.round((count / yearRecords.length) * 100)
              return (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-base w-5 text-center">{mood?.emoji}</span>
                  <span className="text-xs theme-text-secondary w-14">{mood?.label}</span>
                  <div className="flex-1 h-2 rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: mood?.color }}
                    />
                  </div>
                  <span className="text-xs theme-text-tertiary w-12 text-right">{count}次 ({pct}%)</span>
                </div>
              )
            })}
        </div>
      </div>

      {/* 年度关键词云 */}
      {sortedKeywords.length > 0 && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold theme-text mb-3">年度关键词</h3>
          <div className="flex flex-wrap gap-2 items-center justify-center">
            {sortedKeywords.map(([keyword, count], idx) => {
              const maxCount = sortedKeywords[0][1]
              const ratio = count / maxCount
              const size = Math.round(12 + ratio * 12) // 12px ~ 24px
              const opacity = 0.5 + ratio * 0.5
              const colors = ['#f472b6', '#c084fc', '#818cf8', '#60a5fa', '#34d399', '#fbbf24']
              const color = colors[idx % colors.length]
              return (
                <span
                  key={keyword}
                  className="inline-block px-2 py-1 rounded-lg hover:bg-white/5 transition-colors cursor-default"
                  style={{ fontSize: `${size}px`, color, opacity }}
                  title={`${count}次`}
                >
                  {keyword}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* 年度寄语 */}
      <div className="card p-5 text-center">
        <p className="text-sm theme-text-secondary leading-relaxed">{getMessage()}</p>
      </div>
    </>
  )
}
