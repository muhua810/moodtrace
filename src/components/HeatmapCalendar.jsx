import { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import { format, startOfYear, endOfYear, eachDayOfInterval, addDays, startOfWeek, getMonth } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getMoodColor } from '../utils/moodUtils'

const MONTH_LABELS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一', '十二']
const DAY_LABELS = ['', '一', '', '三', '', '五', '']

const CELL_SIZE = 13
const CELL_GAP = 3
const TOTAL_SIZE = CELL_SIZE + CELL_GAP
const HIT_SIZE = Math.max(CELL_SIZE, 44)
const HIT_OFFSET = (HIT_SIZE - CELL_SIZE) / 2

// 移动端更小的尺寸
const CELL_SIZE_MOBILE = 10
const CELL_GAP_MOBILE = 2
const TOTAL_SIZE_MOBILE = CELL_SIZE_MOBILE + CELL_GAP_MOBILE
const HIT_SIZE_MOBILE = Math.max(CELL_SIZE_MOBILE, 44)
const HIT_OFFSET_MOBILE = (HIT_SIZE_MOBILE - CELL_SIZE_MOBILE) / 2

// ── Tooltip 子组件 ──
function HeatmapTooltip({ cellX, cellY, day, moodLabel, svgWidth, cellSize: cs, totalSize: ts }) {
  const TOOLTIP_WIDTH = 110
  const TOOLTIP_HEIGHT = 26
  const below = cellY / ts <= 1
  const y = below ? cellY + cs + 4 : cellY - TOOLTIP_HEIGHT - 4
  let x = cellX - 45
  if (x < 0) x = 0
  if (x + TOOLTIP_WIDTH > svgWidth) x = svgWidth - TOOLTIP_WIDTH
  const textX = x + TOOLTIP_WIDTH / 2

  return (
    <g aria-hidden="true" className="animate-fade-in-up">
      <rect
        x={x} y={y}
        width={TOOLTIP_WIDTH} height={TOOLTIP_HEIGHT}
        rx={6}
        fill="var(--theme-bg)"
        stroke="var(--theme-border-strong)"
        strokeWidth={0.8}
        style={{ pointerEvents: 'none', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.15))' }}
      />
      <text
        x={textX} y={y + 17}
        fill="var(--theme-text)"
        fontSize={10}
        fontWeight="500"
        textAnchor="middle"
        style={{ pointerEvents: 'none' }}
      >
        {format(day, 'M/d')} · {moodLabel}
      </text>
    </g>
  )
}

// ── 单个格子子组件 ──
function HeatmapCell({
  day, dateStr, record, color,
  isToday, isFuture, isHovered, isSelected,
  cellX, cellY, svgWidth, cellSize: cs, totalSize: ts, hitSize: hs, hitOffset: ho,
  onHover, onBlur, onClick,
}) {
  const moodLabel = record?.moodLabel || '未记录'
  const displayDate = format(day, 'M月d日')
  const isActive = isHovered || isSelected

  return (
    <g>
      {/* 扩大触摸区域 */}
      <rect
        x={cellX - ho}
        y={cellY - ho}
        width={hs}
        height={hs}
        fill="transparent"
        className="heatmap-hit-area"
        role="gridcell"
        aria-label={`${displayDate}${record ? '，' + moodLabel : '，未记录'}`}
        tabIndex={isFuture ? -1 : 0}
        onMouseEnter={() => onHover(dateStr)}
        onMouseLeave={onBlur}
        onFocus={() => onHover(dateStr)}
        onBlur={onBlur}
        onClick={() => onClick(dateStr, record, isFuture)}
        onTouchStart={() => !isFuture && onHover(dateStr)}
        onTouchEnd={() => onBlur()}
        style={{ cursor: isFuture ? 'default' : 'pointer', WebkitTapHighlightColor: 'transparent' }}
      />
      {/* 可见格子 */}
      <rect
        x={cellX}
        y={cellY}
        width={cs}
        height={cs}
        rx={2.5}
        fill={isFuture ? 'rgba(160, 140, 170, 0.05)' : color}
        opacity={isFuture ? 0.3 : (isActive && !isFuture ? 1 : record ? 0.8 : 0.1)}
        stroke={isSelected ? '#f472b6' : isToday ? '#6366f1' : 'none'}
        strokeWidth={isSelected ? 2.5 : isToday ? 1.5 : 0}
        pointerEvents="none"
        style={{ transition: 'opacity 0.2s ease, fill 0.2s ease' }}
      />
      {/* 选中发光效果 */}
      {isSelected && !isFuture && (
        <>
          <rect
            x={cellX - 2.5} y={cellY - 2.5}
            width={cs + 5} height={cs + 5}
            rx={5} fill="none"
            stroke="#f472b6" strokeWidth={1.5} opacity={0.5}
            pointerEvents="none"
          />
          <rect
            x={cellX - 4} y={cellY - 4}
            width={cs + 8} height={cs + 8}
            rx={6} fill="none"
            stroke="#f472b6" strokeWidth={0.8} opacity={0.2}
            pointerEvents="none"
          />
        </>
      )}
      {/* Tooltip */}
      {(isHovered || isSelected) && (
        <HeatmapTooltip
          cellX={cellX}
          cellY={cellY}
          day={day}
          moodLabel={moodLabel}
          svgWidth={svgWidth}
          cellSize={cs}
          totalSize={ts}
        />
      )}
    </g>
  )
}

// ── 主组件 ──
export default function HeatmapCalendar({ records = [], year: initialYear, onDayClick }) {
  const [hoveredDay, setHoveredDay] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)
  const [year, setYear] = useState(initialYear || new Date().getFullYear())
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const scrollRef = useRef(null)
  const currentYear = new Date().getFullYear()

  // 响应式尺寸
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
  const cellSize = isMobile ? CELL_SIZE_MOBILE : CELL_SIZE
  const cellGap = isMobile ? CELL_GAP_MOBILE : CELL_GAP
  const totalSize = isMobile ? TOTAL_SIZE_MOBILE : TOTAL_SIZE
  const hitSize = isMobile ? HIT_SIZE_MOBILE : HIT_SIZE
  const hitOffset = isMobile ? HIT_OFFSET_MOBILE : HIT_OFFSET

  const recordMap = useMemo(() => {
    const map = {}
    records.forEach(r => { map[r.date] = r })
    return map
  }, [records])

  const weeks = useMemo(() => {
    const start = startOfYear(new Date(year, 0, 1))
    const end = endOfYear(new Date(year, 0, 1))
    const days = eachDayOfInterval({ start, end })
    const gridStart = startOfWeek(start, { weekStartsOn: 0 })
    const gridDays = []
    let current = gridStart
    while (current <= end) {
      gridDays.push(current)
      current = addDays(current, 1)
    }
    const result = []
    for (let i = 0; i < gridDays.length; i += 7) {
      result.push(gridDays.slice(i, i + 7))
    }
    return result
  }, [year])

  const monthPositions = useMemo(() => {
    const positions = []
    let lastMonth = -1
    weeks.forEach((week, weekIdx) => {
      const month = getMonth(week[0])
      if (month !== lastMonth) {
        if (month === 11 && weekIdx < 3) return
        positions.push({ month, weekIdx })
        lastMonth = month
      }
    })
    return positions
  }, [weeks])

  const svgWidth = weeks.length * totalSize + cellGap

  const handleDayClick = useCallback((dateStr, record, isFuture) => {
    if (isFuture) return
    setSelectedDay(prev => prev === dateStr ? null : dateStr)
    onDayClick?.(dateStr, record)
  }, [onDayClick])

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 2)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    updateScrollState()
    el.addEventListener('scroll', updateScrollState, { passive: true })
    window.addEventListener('resize', updateScrollState)
    return () => {
      el.removeEventListener('scroll', updateScrollState)
      window.removeEventListener('resize', updateScrollState)
    }
  }, [year, updateScrollState])

  const scrollBy = useCallback((dir) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: dir * el.clientWidth * 0.6, behavior: 'smooth' })
  }, [])

  const handleHover = useCallback((dateStr) => setHoveredDay(dateStr), [])
  const handleBlur = useCallback(() => setHoveredDay(null), [])

  return (
    <div
      className="relative group"
      role="img"
      aria-label={`${year}年情绪热力图日历`}
    >
      {/* 渐变遮罩 */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-[var(--theme-card)] to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity sm:opacity-60" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-[var(--theme-card)] to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity sm:opacity-60" />

      <div
        ref={scrollRef}
        className="overflow-x-auto overflow-y-hidden"
        style={{
          WebkitOverflowScrolling: 'touch',
          scrollBehavior: 'smooth',
          msOverflowStyle: 'none',
          scrollbarWidth: 'none',
        }}
      >
        <div className="inline-block min-w-full">
          {/* 年份导航 */}
          <div className="flex items-center justify-between mb-2 ml-8">
            <button
              onClick={() => setYear(y => y - 1)}
              className="p-1 rounded-lg hover:bg-white/10 theme-text-secondary hover:theme-text transition-colors focus:outline-none focus:ring-2 focus:ring-pink-400/50 active:scale-90"
              aria-label={`${year - 1}年`}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-medium theme-text">{year}年</span>
            <button
              onClick={() => setYear(y => Math.min(y + 1, currentYear))}
              disabled={year >= currentYear}
              className="p-1 rounded-lg hover:bg-white/10 theme-text-secondary hover:theme-text transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-pink-400/50 active:scale-90"
              aria-label={`${year + 1}年`}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* 月份标签 */}
          <div className="flex mb-1 ml-8" aria-hidden="true">
            <svg width={svgWidth} height={16}>
              {monthPositions.map(({ month, weekIdx }) => (
                <text
                  key={month}
                  x={weekIdx * totalSize + cellGap}
                  y={12}
                  fill="var(--theme-text-tertiary)"
                  fontSize={10}
                >
                  {MONTH_LABELS[month]}
                </text>
              ))}
            </svg>
          </div>

          {/* 热力图网格 */}
          <div className="flex">
            {/* 星期标签 */}
            <div className="flex flex-col mr-1" style={{ gap: cellGap }} aria-hidden="true">
              {DAY_LABELS.map((label, i) => (
                <div
                  key={i}
                  className="flex items-center justify-end theme-text-tertiary"
                  style={{ width: 24, height: cellSize, fontSize: isMobile ? 7 : 9 }}
                >
                  {label}
                </div>
              ))}
            </div>

            {/* SVG 格子 */}
            <svg
              width={svgWidth}
              height={7 * totalSize + cellGap}
              role="grid"
              aria-label={`${year}年每日情绪记录`}
              style={{ touchAction: 'pan-x' }}
            >
              {weeks.map((week, weekIdx) =>
                week.map((day, dayIdx) => {
                  const dateStr = format(day, 'yyyy-MM-dd')
                  const record = recordMap[dateStr]
                  const color = record ? getMoodColor(record.mood) : 'var(--theme-border)'
                  const isToday = dateStr === format(new Date(), 'yyyy-MM-dd')
                  const isFuture = day > new Date()
                  const cellX = weekIdx * totalSize + cellGap
                  const cellY = dayIdx * totalSize + cellGap

                  return (
                    <HeatmapCell
                      key={dateStr}
                      day={day}
                      dateStr={dateStr}
                      record={record}
                      color={color}
                      isToday={isToday}
                      isFuture={isFuture}
                      isHovered={hoveredDay === dateStr}
                      isSelected={selectedDay === dateStr}
                      cellX={cellX}
                      cellY={cellY}
                      svgWidth={svgWidth}
                      cellSize={cellSize}
                      totalSize={totalSize}
                      hitSize={hitSize}
                      hitOffset={hitOffset}
                      onHover={handleHover}
                      onBlur={handleBlur}
                      onClick={handleDayClick}
                    />
                  )
                })
              )}
            </svg>
          </div>

          {/* 图例 */}
          <div className="flex items-center gap-3 mt-3 ml-8 text-xs theme-text-secondary flex-wrap" aria-label="图例">
            <span className="theme-text-tertiary">情绪：</span>
            {[
              { color: '#ef4444', label: '非常低落' },
              { color: '#f97316', label: '有点难过' },
              { color: '#eab308', label: '一般般' },
              { color: '#22c55e', label: '心情不错' },
              { color: '#6366f1', label: '超级开心' },
            ].map(({ color, label }) => (
              <span key={label} className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} aria-hidden="true" />
                {label}
              </span>
            ))}
            <span className="flex items-center gap-1 ml-1">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--theme-border)', opacity: 0.3 }} aria-hidden="true" />
              未记录
            </span>
            <span className="flex items-center gap-1 ml-1">
              <div className="w-3 h-3 rounded-sm" style={{ border: '1.5px solid #6366f1' }} aria-hidden="true" />
              今天
            </span>
          </div>
        </div>
      </div>

      {/* 滚动按钮 */}
      {canScrollLeft && (
        <button
          onClick={() => scrollBy(-1)}
          className="absolute left-1 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-[var(--theme-card)] border border-[var(--theme-border)] shadow-lg flex items-center justify-center theme-text-secondary hover:theme-text hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 active:scale-90"
          aria-label="向左滚动"
          tabIndex={-1}
        >
          <ChevronLeft size={16} />
        </button>
      )}
      {canScrollRight && (
        <button
          onClick={() => scrollBy(1)}
          className="absolute right-1 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-[var(--theme-card)] border border-[var(--theme-border)] shadow-lg flex items-center justify-center theme-text-secondary hover:theme-text hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 active:scale-90"
          aria-label="向右滚动"
          tabIndex={-1}
        >
          <ChevronRight size={16} />
        </button>
      )}
    </div>
  )
}
