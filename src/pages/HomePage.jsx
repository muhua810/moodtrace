import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, CalendarDays, LayoutGrid, Settings, Database } from 'lucide-react'
import HeatmapCalendar from '../components/HeatmapCalendar'
import MonthCalendar from '../components/MonthCalendar'
import { getAllRecords, getAllRecordsAsync, saveRecord } from '../services/storage'
import { MOOD_TYPES } from '../utils/moodUtils'
import { getLocalDateString } from '../utils/moodUtils'
import { generateDemoData, shouldAutoImportDemo } from '../services/demoData'

/** 安全截断文本 */
function truncate(str, max = 80) {
  if (!str) return ''
  return str.length > max ? str.slice(0, max) + '…' : str
}

export default function HomePage() {
  const [records, setRecords] = useState(() => getAllRecords())
  const [viewMode, setViewMode] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 640) return 'month'
    return 'heatmap'
  })
  const [importingDemo, setImportingDemo] = useState(false)
  const navigate = useNavigate()

  // 初始化：异步加载（支持加密模式）
  useEffect(() => {
    getAllRecordsAsync().then(setRecords)
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold gradient-text">情绪日历</h1>
          <p className="text-xs theme-text-tertiary mt-1">
            {new Date().toLocaleDateString('zh-CN', {
              year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
            })}
          </p>
        </div>
        <button
          onClick={() => navigate('/profile')}
          className="p-2 rounded-xl hover:bg-white/10 theme-text-tertiary hover:theme-text transition-colors"
          aria-label="设置"
        >
          <Settings size={18} />
        </button>
      </header>

      {/* 今日卡片 */}
      <div className="card p-4 mb-4 hover-float">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
            todayRecord ? '' : 'bg-white/5'
          }`} style={todayRecord ? { backgroundColor: MOOD_TYPES[todayRecord.mood]?.color + '20' } : undefined}>
            {todayRecord ? MOOD_TYPES[todayRecord.mood]?.emoji : '📝'}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium theme-text">
              {todayRecord ? '今日已记录' : '今天感觉怎么样？'}
            </p>
            <p className="text-xs theme-text-tertiary mt-0.5">
              {todayRecord ? todayRecord.moodLabel : '点击记录你的心情'}
            </p>
          </div>
          <button
            onClick={() => navigate(`/record?date=${todayStr}${todayRecord ? '&edit=true' : ''}`)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white text-sm font-medium transition-all active:scale-95"
          >
            <Plus size={16} />
            {todayRecord ? '修改' : '记录'}
          </button>
        </div>
      </div>

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
        <div className="card p-6 mb-4 text-center animate-fade-in-up">
          <div className="text-4xl mb-3">✨</div>
          <h2 className="text-base font-semibold theme-text mb-2">欢迎使用情绪日历！</h2>
          <p className="text-sm theme-text-secondary mb-4">
            你可以从记录今天的心情开始，也可以导入示例数据体验功能
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              onClick={() => navigate(`/record?date=${todayStr}`)}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white text-sm font-medium transition-all active:scale-95"
            >
              <Plus size={16} />
              记录今天的心情
            </button>
            <button
              onClick={handleImportDemo}
              disabled={importingDemo}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 theme-text-secondary text-sm font-medium transition-all active:scale-95 disabled:opacity-50"
            >
              <Database size={16} />
              {importingDemo ? '导入中...' : '导入示例数据'}
            </button>
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
