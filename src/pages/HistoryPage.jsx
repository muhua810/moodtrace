import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, Calendar, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { getAllRecords } from '../services/storage'
import { MOOD_TYPES, getMoodColor } from '../utils/moodUtils'

export default function HistoryPage() {
  const navigate = useNavigate()
  const [searchText, setSearchText] = useState('')
  const [filterMood, setFilterMood] = useState('all')

  const allRecords = useMemo(() => getAllRecords().sort((a, b) => b.date.localeCompare(a.date)), [])

  const filteredRecords = useMemo(() => {
    let result = allRecords
    if (filterMood !== 'all') {
      result = result.filter(r => r.mood === filterMood)
    }
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase()
      result = result.filter(r =>
        r.text.toLowerCase().includes(q) ||
        (r.keywords || []).some(k => k.toLowerCase().includes(q))
      )
    }
    return result
  }, [allRecords, filterMood, searchText])

  // 按月分组
  const groupedRecords = useMemo(() => {
    const groups = {}
    filteredRecords.forEach(r => {
      const month = r.date.slice(0, 7) // yyyy-MM
      if (!groups[month]) groups[month] = []
      groups[month].push(r)
    })
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filteredRecords])

  const cardStyle = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-light)',
    boxShadow: 'var(--shadow-warm)',
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-4 pb-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl hover:bg-pink-50 transition-colors"
        >
          <ArrowLeft size={20} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <h1 className="text-lg font-semibold">情绪回顾</h1>
        <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>
          共 {allRecords.length} 条记录
        </span>
      </div>

      {/* 搜索框 */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
        <input
          type="text"
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          placeholder="搜索记录内容或关键词..."
          className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-light)',
            color: 'var(--text-primary)',
            boxShadow: 'var(--shadow-warm)',
          }}
        />
      </div>

      {/* 情绪筛选 */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        <button
          onClick={() => setFilterMood('all')}
          className="px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-all"
          style={{
            background: filterMood === 'all' ? 'linear-gradient(135deg, #f472b6, #fb7185)' : 'var(--bg-card)',
            color: filterMood === 'all' ? '#fff' : 'var(--text-secondary)',
            border: `1px solid ${filterMood === 'all' ? 'transparent' : 'var(--border-light)'}`,
          }}
        >
          全部
        </button>
        {Object.values(MOOD_TYPES).map(mood => (
          <button
            key={mood.key}
            onClick={() => setFilterMood(mood.key)}
            className="px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-all flex items-center gap-1"
            style={{
              background: filterMood === mood.key ? mood.color + '20' : 'var(--bg-card)',
              color: filterMood === mood.key ? mood.color : 'var(--text-secondary)',
              border: `1px solid ${filterMood === mood.key ? mood.color + '40' : 'var(--border-light)'}`,
            }}
          >
            {mood.emoji} {mood.label}
          </button>
        ))}
      </div>

      {/* 记录列表 */}
      {groupedRecords.length === 0 ? (
        <div className="text-center py-12">
          <Calendar size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p style={{ color: 'var(--text-muted)' }}>
            {allRecords.length === 0 ? '还没有记录，去记录今天的心情吧！' : '没有找到匹配的记录'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedRecords.map(([month, records]) => (
            <div key={month}>
              <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
                {month.replace('-', '年')}月
                <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                  ({records.length} 条)
                </span>
              </h3>
              <div className="rounded-2xl overflow-hidden" style={cardStyle}>
                {records.map((record, idx) => (
                  <div
                    key={record.id}
                    onClick={() => navigate(`/record?date=${record.date}`)}
                    className="flex items-center gap-3 p-3.5 cursor-pointer transition-colors hover:bg-pink-50/30"
                    style={{
                      borderBottom: idx < records.length - 1 ? '1px solid var(--border-light)' : 'none',
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                      style={{ backgroundColor: getMoodColor(record.mood) + '12' }}
                    >
                      {MOOD_TYPES[record.mood]?.emoji || '😐'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{record.text}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {record.date}
                        </span>
                        <span
                          className="text-xs px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: getMoodColor(record.mood) + '12',
                            color: getMoodColor(record.mood),
                          }}
                        >
                          {MOOD_TYPES[record.mood]?.label}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
