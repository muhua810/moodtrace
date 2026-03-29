import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BarChart3, TrendingUp, Calendar, Award, Flame, Clock, Users, RefreshCw } from 'lucide-react'
import { format, parseISO, subDays, isWeekend, subMonths, getDay } from 'date-fns'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area, Legend
} from 'recharts'
import { MOOD_TYPES, formatIntensityStars, getMoodLabel } from '../utils/moodUtils'
import { getAllRecords, getAllRecordsAsync, getStreakDays, getMaxStreak } from '../services/storage'
import { fetchMoodSummary } from '../services/apiService'
import { generateDemoData } from '../services/demoData'
import { t, formatMonthLabel, formatDateLocalized } from '../i18n'

import AnnualReport from './AnnualReport'

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
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'overview')
  const [communityData, setCommunityData] = useState(null)
  const [communityLoading, setCommunityLoading] = useState(false)
  const [demoCommunityData, setDemoCommunityData] = useState(() => {
    try {
      const saved = localStorage.getItem('demo_community_data')
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })

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

  const importDemoToCommunity = () => {
    const demoRecords = generateDemoData(30)
    // 统计情绪比例
    const moodCounts = { very_negative: 0, negative: 0, neutral: 0, positive: 0, very_positive: 0 }
    demoRecords.forEach(r => { if (moodCounts[r.mood] !== undefined) moodCounts[r.mood]++ })
    // 模拟群体规模：30天 × 日均参与人数
    const total = 2847
    const sampleTotal = demoRecords.length || 1
    const moods = {}
    Object.keys(moodCounts).forEach(k => {
      moods[k] = Math.round((moodCounts[k] / sampleTotal) * total)
    })
    const data = {
      total,
      moods,
      isDemo: true,
    }
    setDemoCommunityData(data)
    try { localStorage.setItem('demo_community_data', JSON.stringify(data)) } catch {}
  }

  const clearDemoCommunity = () => {
    setDemoCommunityData(null)
    try { localStorage.removeItem('demo_community_data') } catch {}
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

    // {t('stats.weekdayVsWeekend')}
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

    // {t('stats.moodDistribution')} (用于饼图)
    const pieData = Object.entries(moodCounts)
      .filter(([, count]) => count > 0)
      .map(([key, count]) => ({
        name: getMoodLabel(key),
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
        month: formatMonthLabel(parseInt(month.slice(0,4)), parseInt(month.slice(5,7))),
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
    const weekdayLabels = t('heatmap.weekdays').split(','); const weekdayAvgData = (weekdayLabels.length === 7 ? weekdayLabels : ['S','M','T','W','T','F','S']).map((label, i) => ({
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
    const source = communityData || demoCommunityData || (stats ? {
      total: stats.total,
      moods: Object.fromEntries(stats.pieData.map(p => [p.key, p.value])),
    } : null)
    if (!source) return null
    const pie = Object.entries(source.moods)
      .filter(([, count]) => count > 0)
      .map(([key, count]) => ({
        name: getMoodLabel(key),
        value: count,
        color: MOOD_COLORS[key],
      }))
    const avg = Object.entries(source.moods).reduce((sum, [key, count]) => {
      return sum + (MOOD_SCORE_MAP[key] || 3) * count
    }, 0) / (source.total || 1)
    return { pie, avg: avg.toFixed(1), total: source.total, isLocal: !communityData && !demoCommunityData, isDemo: communityData?.isDemo || demoCommunityData?.isDemo || false }
  }, [communityData, demoCommunityData, stats])

  if (!stats && activeTab !== 'community') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
          <BarChart3 size={28} className="theme-text-tertiary" />
        </div>
        <h2 className="text-lg font-semibold theme-text mb-2">{t('stats.noData')}</h2>
        <p className="theme-text-secondary text-sm mb-6">{t('stats.noDataDesc')}</p>
        <button
          onClick={() => navigate('/record')}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white font-medium text-sm transition-all active:scale-95"
        >
          {t('stats.noRecord')}
        </button>
      </div>
    )
  }

  const tabs = [
    { key: 'overview', label: t('stats.overview') },
    { key: 'trend', label: t('stats.trend') },
    { key: 'monthly', label: t('stats.monthly') },
    { key: 'annual', label: t('stats.annual') },
    { key: 'community', label: t('stats.community') },
  ]

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
      <h1 className="text-xl font-bold theme-text mb-4">{t('stats.title')}</h1>

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
            <StatCard icon={<Calendar size={16} />} label={t('stats.totalRecords')} value={stats.total} unit={t('stats.days')} color="text-pink-400" />
            <StatCard icon={<Flame size={16} />} label={t('stats.streak')} value={stats.streak} unit={t('stats.days')} color="text-orange-400" />
            <StatCard icon={<TrendingUp size={16} />} label={t('stats.avgMood')} value={stats.avgMood.toFixed(1)} unit="/5" color="text-green-400" />
            <StatCard icon={<Award size={16} />} label={t('stats.maxStreak')} value={stats.maxStreak} unit={t('stats.days')} color="text-indigo-400" />
          </div>

          {/* 情绪分布饼图 */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold theme-text mb-3">{t('stats.moodDist')}</h3>
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
                      formatter={(value, name) => [`${value}${t('stats.times')} (${Math.round(value / stats.total * 100)}%)`, name]}
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
                <Clock size={14} className="text-blue-400" /> {t('stats.weekdayVsWeekendLabel')}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 rounded-lg bg-white/5">
                  <p className="text-2xl font-bold theme-text">{stats.weekdayAvg.toFixed(1)}</p>
                  <p className="text-xs theme-text-tertiary mt-1">{t('stats.weekdayAvg')}</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-white/5">
                  <p className="text-2xl font-bold theme-text">{stats.weekendAvg.toFixed(1)}</p>
                  <p className="text-xs theme-text-tertiary mt-1">{t('stats.weekendAvg')}</p>
                </div>
              </div>
              {stats.weekendAvg > stats.weekdayAvg && (
                <p className="text-xs text-green-400/80 mt-2 text-center">{t('stats.weekendBetter')}</p>
              )}
              {stats.weekdayAvg > stats.weekendAvg && (
                <p className="text-xs text-blue-400/80 mt-2 text-center">{t('stats.weekdayBetter')}</p>
              )}
            </div>
          )}

          {/* 按星期几分析 */}
          {stats.weekdayAvgData.some(d => d.count > 0) && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold theme-text mb-3">{t('stats.weeklyRhythm')}</h3>
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
                      formatter={(value) => [`${value}/5`, t('stats.avgMoodLabel')]}
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
            <h3 className="text-sm font-semibold theme-text mb-3">{t('stats.recentRecords')}</h3>
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
                      {formatDateLocalized(parseISO(r.date), 'short')} · {getMoodLabel(r.mood)}
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
            <h3 className="text-sm font-semibold theme-text mb-3">{t('stats.trend30')}</h3>
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
                          <p className="theme-text-secondary mt-1">{moodInfo?.emoji} {getMoodLabel(d.mood)}</p>
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

          {/* {t('stats.topMoods')} */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold theme-text mb-3">{t('stats.topMoods')}</h3>
            {stats.topMoods.map(([key, count]) => {
              const mood = MOOD_TYPES[key]
              const pct = Math.round((count / stats.total) * 100)
              return (
                <div key={key} className="flex items-center gap-3 mb-2 last:mb-0">
                  <span className="text-lg w-6 text-center">{mood?.emoji}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="theme-text-secondary">{getMoodLabel(key)}</span>
                      <span className="theme-text-tertiary">{t('stats.timesPercent').replace('{count}', count).replace('{pct}', pct)}</span>
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
              <h3 className="text-sm font-semibold theme-text mb-3">{t('stats.monthlyAvg')}</h3>
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
                        if (name === 'avg') return [`${value}/5`, t('stats.avgMoodLabel')]
                        if (name === 'count') return [`${value}`+t('stats.days'), t('stats.totalRecords')]
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
                      {formatMonthLabel(parseInt(month.slice(0,4)), parseInt(month.slice(5,7)))}
                    </h3>
                    <span className="text-xs theme-text-tertiary">{t('stats.recordsCount').replace('{count}', data.total)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-lg font-bold theme-text">{avg}</p>
                      <p className="text-xs theme-text-tertiary">{t('stats.avgMoodLabel')}</p>
                    </div>
                    <div>
                      <p className="text-lg">{moodInfo?.emoji || '😐'}</p>
                      <p className="text-xs theme-text-tertiary">{t('stats.topMoodLabel')}</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold theme-text">{Math.round((data.total / 30) * 100)}%</p>
                      <p className="text-xs theme-text-tertiary">{t('stats.recordRate')}</p>
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
                <Users size={14} className="text-cyan-400" /> {communityChartData?.isLocal ? t('stats.communityOverview') : communityChartData?.isDemo ? t('stats.communityDemo') : t('stats.communityMonth')}
              </h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => loadCommunityData(true)}
                  disabled={communityLoading}
                  className="p-1.5 rounded-lg hover:bg-white/10 theme-text-tertiary hover:theme-text transition-colors"
                  aria-label={t('stats.refresh')}
                >
                  <RefreshCw size={14} className={communityLoading ? 'animate-spin' : ''} />
                </button>
                {!demoCommunityData && !communityData && (
                  <button
                    onClick={importDemoToCommunity}
                    className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 text-xs font-medium transition-colors"
                    title={t('stats.importDemoTitle')}
                  >
                    {t('stats.importDemo')}
                  </button>
                )}
                {demoCommunityData && !communityData && (
                  <button
                    onClick={clearDemoCommunity}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 theme-text-tertiary text-xs transition-colors"
                    title={t('stats.clearDemoTitle')}
                  >
                    {t('stats.clearDemo')}
                  </button>
                )}
              </div>
            </div>

            {communityChartData ? (
              <>
                {communityChartData.isLocal && (
                  <div className="mb-3 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                    {t('stats.noCommunityHint')}
                  </div>
                )}
                {communityChartData.isDemo && !communityChartData.isLocal && (
                  <div className="mb-3 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
                    {t('stats.demoHint2')}
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
                          formatter={(value, name) => [`${value}${t('stats.times')}`, name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1">
                    <p className="text-2xl font-bold theme-text">{communityChartData.avg}<span className="text-sm font-normal theme-text-tertiary">/5</span></p>
                    <p className="text-xs theme-text-tertiary">{communityChartData.isLocal ? t('stats.myAvg') : t('stats.communityAvg')}</p>
                    <p className="text-xs theme-text-muted mt-1">{communityChartData.total} {communityChartData.isLocal ? t('stats.records') : t('stats.communityPeople')}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {communityChartData.pie.map(item => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-xs theme-text-secondary flex-1">{item.name}</span>
                      <span className="text-xs theme-text-tertiary">{item.value}{t('stats.times')}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <Users size={32} className="theme-text-muted mx-auto mb-3" />
                <p className="text-sm theme-text-secondary mb-2">{t('stats.noData')}</p>
                <p className="text-xs theme-text-tertiary">{t('stats.noDataDesc')}</p>
              </div>
            )}
          </div>

          {/* 我 vs 群体对比 — 仅在有服务端群体数据时显示 */}
          {communityChartData && !communityChartData.isLocal && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold theme-text mb-3">{t('stats.myVsCommunity')}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 rounded-lg bg-pink-500/10 border border-pink-500/20">
                  <p className="text-2xl font-bold text-pink-400">{stats.avgMood.toFixed(1)}</p>
                  <p className="text-xs theme-text-tertiary mt-1">{t('stats.myAvg')}</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                  <p className="text-2xl font-bold text-cyan-400">{communityChartData.avg}</p>
                  <p className="text-xs theme-text-tertiary mt-1">{t('stats.communityAvg')}</p>
                </div>
              </div>
              {Number(stats.avgMood.toFixed(1)) > Number(communityChartData.avg) && (
                <p className="text-xs text-green-400/80 mt-3 text-center">{t('stats.meBetter')}</p>
              )}
              {Number(stats.avgMood.toFixed(1)) < Number(communityChartData.avg) && (
                <p className="text-xs text-blue-400/80 mt-3 text-center">{t('stats.meWorse')}</p>
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
