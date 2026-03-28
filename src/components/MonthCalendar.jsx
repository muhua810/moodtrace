import { useState, useMemo, useCallback } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isToday, isFuture, getDay } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getMoodColor, MOOD_TYPES } from '../utils/moodUtils'
import { t } from '../i18n'

const getWeekdays = () => t('heatmap.weekdays').split(',')

export default function MonthCalendar({ records = [], onDayClick }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const recordMap = useMemo(() => {
    const map = {}
    records.forEach(r => { map[r.date] = r })
    return map
  }, [records])

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [currentMonth])

  const handlePrev = useCallback(() => {
    setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  }, [])

  const handleNext = useCallback(() => {
    const next = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    if (next <= new Date()) setCurrentMonth(next)
  }, [currentMonth])

  const canGoNext = useMemo(() => {
    const next = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    return next <= new Date()
  }, [currentMonth])

  return (
    <div className="w-full">
      {/* 月份导航 */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrev}
          className="p-2 rounded-lg hover:bg-white/10 theme-text-secondary hover:theme-text transition-colors"
          aria-label={t('calendar.prevMonth')}
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-semibold theme-text">
          {format(currentMonth, 'yyyy/M')}
        </span>
        <button
          onClick={handleNext}
          disabled={!canGoNext}
          className="p-2 rounded-lg hover:bg-white/10 theme-text-secondary hover:theme-text transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label={t('calendar.nextMonth')}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* 星期标题 */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {getWeekdays().map(day => (
          <div key={day} className="text-center text-xs theme-text-tertiary py-1 font-medium">
            {day}
          </div>
        ))}
      </div>

      {/* 日期网格 */}
      <div className="grid grid-cols-7 gap-1">
        {days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const record = recordMap[dateStr]
          const inMonth = isSameMonth(day, currentMonth)
          const today = isToday(day)
          const future = isFuture(day)
          const mood = record ? MOOD_TYPES[record.mood] : null

          return (
            <button
              key={dateStr}
              onClick={() => !future && onDayClick?.(dateStr, record)}
              disabled={future}
              className={`
                relative aspect-square rounded-lg flex flex-col items-center justify-center
                transition-all active:scale-95 text-sm
                ${!inMonth ? 'opacity-20' : ''}
                ${future ? 'opacity-30 cursor-default' : 'cursor-pointer hover:bg-white/10'}
                ${today ? 'ring-1 ring-indigo-400/60' : ''}
                ${record ? '' : 'bg-white/[0.03]'}
              `}
              style={record ? { backgroundColor: mood?.color + '25' } : undefined}
              aria-label={`${format(day, 'M/d')}${record ? ' - ' + record.moodLabel : ' - ' + t('heatmap.unrecorded')}`}
            >
              <span className={`text-xs font-medium ${today ? 'text-indigo-400' : record ? 'theme-text' : 'theme-text-tertiary'}`}>
                {format(day, 'd')}
              </span>
              {record && (
                <span className="text-xs mt-0.5">{mood?.emoji}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* 当月统计 */}
      {(() => {
        const monthRecords = records.filter(r => {
          const d = new Date(r.date + 'T00:00:00')
          return d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear()
        })
        if (!monthRecords.length) return null

        const avgMood = monthRecords.reduce((s, r) => s + (MOOD_TYPES[r.mood]?.intensity || 3), 0) / monthRecords.length
        const daysInMonth = endOfMonth(currentMonth).getDate()
        const rate = Math.round((monthRecords.length / daysInMonth) * 100)

        return (
          <div className="flex items-center justify-center gap-4 mt-3 text-xs theme-text-tertiary">
            <span>{t('calendar.recorded').replace('{count}', monthRecords.length)}</span>
            <span>{t('calendar.avgMood').replace('{avg}', avgMood.toFixed(1))}</span>
            <span>{t('calendar.coverage').replace('{rate}', rate)}</span>
          </div>
        )
      })()}
      {/* 图例说明 */}
      <div className="flex items-center justify-center gap-3 mt-3 pt-3 border-t border-white/5">
        <span className="text-[10px] theme-text-muted">{t('calendar.legendTitle')}</span>
        {Object.values(MOOD_TYPES).map(m => (
          <div key={m.key} className="flex items-center gap-1">
            <span className="text-xs">{m.emoji}</span>
            <span className="text-[10px] theme-text-tertiary">{m.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
