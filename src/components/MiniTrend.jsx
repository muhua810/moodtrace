import { useMemo } from 'react'
import { format, subDays } from 'date-fns'
import { MOOD_TYPES } from '../utils/moodUtils'
import { t } from '../i18n'

const MOOD_COLORS = {
  very_negative: '#ef4444', negative: '#f97316', neutral: '#eab308',
  positive: '#22c55e', very_positive: '#6366f1',
}

export default function MiniTrend({ records }) {
  const trendData = useMemo(() => {
    const data = []
    for (let i = 6; i >= 0; i--) {
      const d = format(subDays(new Date(), i), 'yyyy-MM-dd')
      const rec = records.find(r => r.date === d)
      data.push({
        date: format(subDays(new Date(), i), 'M/d'),
        score: rec ? (MOOD_TYPES[rec.mood]?.intensity || 0) : null,
        mood: rec?.mood || null,
        emoji: rec ? (MOOD_TYPES[rec.mood]?.emoji || '') : '',
        text: rec?.text || '',
      })
    }
    return data
  }, [records])

  const { pathD, areaD, movingAvgD, dots, hasData } = useMemo(() => {
    const width = 320, height = 80
    const padding = { top: 14, bottom: 18, left: 16, right: 16 }
    const innerW = width - padding.left - padding.right
    const innerH = height - padding.top - padding.bottom
    const validData = trendData.filter(d => d.score !== null)
    if (validData.length < 2) return { pathD: '', areaD: '', movingAvgD: '', dots: [], hasData: false }

    const points = trendData.map((d, i) => {
      const x = padding.left + (i / 6) * innerW
      const y = d.score !== null ? padding.top + innerH - ((d.score - 1) / 4) * innerH : null
      return { x, y, ...d }
    })

    let path = ''
    const validPoints = points.filter(p => p.y !== null)
    if (validPoints.length >= 2) {
      path = `M ${validPoints[0].x} ${validPoints[0].y}`
      for (let i = 1; i < validPoints.length; i++) {
        const prev = validPoints[i - 1], curr = validPoints[i]
        const cpx = (prev.x + curr.x) / 2
        path += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`
      }
    }

    const areaPath = path && validPoints.length >= 2
      ? path + ` L ${validPoints[validPoints.length - 1].x} ${height - padding.bottom} L ${validPoints[0].x} ${height - padding.bottom} Z`
      : ''

    let movingAvgPath = ''
    if (validPoints.length >= 3) {
      const maPoints = []
      for (let i = 0; i <= validPoints.length - 3; i++) {
        const avg = (validPoints[i].y + validPoints[i + 1].y + validPoints[i + 2].y) / 3
        maPoints.push({ x: validPoints[i + 1].x, y: avg })
      }
      if (maPoints.length >= 2) {
        movingAvgPath = `M ${maPoints[0].x} ${maPoints[0].y}`
        for (let i = 1; i < maPoints.length; i++) {
          const prev = maPoints[i - 1], curr = maPoints[i]
          const cpx = (prev.x + curr.x) / 2
          movingAvgPath += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`
        }
      }
    }

    return { pathD: path, areaD: areaPath, movingAvgD: movingAvgPath, dots: validPoints, hasData: true }
  }, [trendData])

  if (!hasData) {
    return (
      <div className="card p-4 mb-4">
        <h2 className="text-sm font-semibold theme-text mb-2">{t('trend.title')}</h2>
        <p className="text-xs theme-text-tertiary text-center py-4">{t('trend.noData')}</p>
      </div>
    )
  }

  const recent3 = trendData.slice(-3).filter(d => d.score !== null)
  const prev3 = trendData.slice(0, 3).filter(d => d.score !== null)
  const recentAvg = recent3.length ? recent3.reduce((s, d) => s + d.score, 0) / recent3.length : 0
  const prevAvg = prev3.length ? prev3.reduce((s, d) => s + d.score, 0) / prev3.length : 0
  let trendText = '', trendColor = 'theme-text-tertiary'
  if (recentAvg > prevAvg + 0.3) { trendText = t('trend.goingUp'); trendColor = 'text-green-400' }
  else if (recentAvg < prevAvg - 0.3) { trendText = t('trend.goingDown'); trendColor = 'text-orange-400' }
  else { trendText = t('trend.stable'); trendColor = 'theme-text-tertiary' }

  const recordDays = trendData.filter(d => d.score !== null).length

  return (
    <div className="card p-4 mb-4">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold theme-text">{t('trend.title')}</h2>
        <span className={`text-xs ${trendColor}`}>{trendText}</span>
      </div>
      <p className="text-[10px] theme-text-muted mb-3">{t('trend.recordDays').replace('{count}', recordDays)}</p>
      <div className="flex justify-center">
        <svg width="320" height="80" viewBox="0 0 320 80" className="overflow-visible">
          <rect x="16" y="14" width="288" height="48" rx="4" fill="rgba(34,197,94,0.03)" />
          <rect x="16" y="38" width="288" height="24" rx="0" fill="rgba(234,179,8,0.03)" />
          <rect x="16" y="52" width="288" height="10" rx="0" fill="rgba(239,68,68,0.03)" />
          <line x1="16" y1="14" x2="304" y2="14" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          <line x1="16" y1="38" x2="304" y2="38" stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="16" y1="50" x2="304" y2="50" stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="16" y1="62" x2="304" y2="62" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          <defs>
            <linearGradient id="miniTrendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c084fc" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#c084fc" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="miniLineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#f472b6" />
            </linearGradient>
          </defs>
          {areaD && <path d={areaD} fill="url(#miniTrendGrad)" />}
          {movingAvgD && <path d={movingAvgD} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeDasharray="4 3" strokeLinecap="round" />}
          {pathD && <path d={pathD} fill="none" stroke="url(#miniLineGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
          {dots.map((dot, i) => (
            <g key={i}>
              <circle cx={dot.x} cy={dot.y} r="7" fill={MOOD_COLORS[dot.mood] || '#c084fc'} opacity="0.15" />
              <circle cx={dot.x} cy={dot.y} r="3.5" fill={MOOD_COLORS[dot.mood] || '#c084fc'} stroke="var(--theme-bg)" strokeWidth="1.5" />
              <text x={dot.x} y="76" textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.3)" dominantBaseline="auto">{dot.date}</text>
              {dot.emoji && <text x={dot.x} y={dot.y - 10} textAnchor="middle" fontSize="10" dominantBaseline="auto">{dot.emoji}</text>}
            </g>
          ))}
          <text x="10" y="16" textAnchor="end" fontSize="7" fill="rgba(255,255,255,0.15)" dominantBaseline="middle">😊</text>
          <text x="10" y="62" textAnchor="end" fontSize="7" fill="rgba(255,255,255,0.15)" dominantBaseline="middle">😢</text>
        </svg>
      </div>
    </div>
  )
}
