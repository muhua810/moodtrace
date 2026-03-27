import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { format, addDays, subDays, isAfter, startOfDay } from 'date-fns'
import DOMPurify from 'dompurify'
import { ArrowLeft, Sparkles, Send, Loader2, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { analyzeEmotion, getWellnessTips } from '../services/emotionAnalyzer'
import { saveRecordAsync, getAllRecordsAsync } from '../services/storage'
import { MOOD_TYPES, getMoodColor, getMoodBgClass, getMoodList } from '../utils/moodUtils'
import { submitMoodStat } from '../services/apiService'
import CaringCard from '../components/CaringCard'

export default function RecordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const dateParam = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd')
  const autoEdit = searchParams.get('edit') === 'true'
  const isToday = dateParam === format(new Date(), 'yyyy-MM-dd')
  const textareaRef = useRef(null)

  const [text, setText] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [editing, setEditing] = useState(false)
  const [showQuickJump, setShowQuickJump] = useState(false)
  const [error, setError] = useState(null)
  const [showCaring, setShowCaring] = useState(false)
  const dateInputRef = useRef(null)
  const quickJumpRef = useRef(null)

  const currentDate = new Date(dateParam + 'T00:00:00')
  const todayStart = startOfDay(new Date())
  const isFuture = isAfter(currentDate, todayStart)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const records = await getAllRecordsAsync()
      if (cancelled) return
      const existing = records.find(r => r.date === dateParam)
      if (existing) {
        setText(existing.text)
        setResult({
          mood: existing.mood,
          intensity: existing.intensity,
          suggestion: existing.suggestion,
          keywords: existing.keywords || [],
          analysis: existing.analysis || '',
          confidence: existing.confidence || 0.8,
          method: existing.method || 'saved'
        })
        setSaved(true)
        if (autoEdit) setEditing(true)
      }
    })()
    return () => { cancelled = true }
  }, [dateParam])

  // 自动聚焦输入框（新建记录时）
  useEffect(() => {
    if (!saved && textareaRef.current) {
      textareaRef.current.focus()
    }
    // 进入编辑模式时也聚焦
    if (editing && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [saved, editing])

  // 点击外部关闭快捷跳转面板
  useEffect(() => {
    if (!showQuickJump) return
    const handleClickOutside = (e) => {
      if (quickJumpRef.current && !quickJumpRef.current.contains(e.target)) {
        setShowQuickJump(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showQuickJump])

  // 安全处理：使用 DOMPurify 彻底清除 HTML/脚本，再移除零宽字符和控制字符
  const sanitizeInput = (input) => {
    const purified = DOMPurify.sanitize(input, { ALLOWED_TAGS: [] })
    return purified
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // 零宽字符
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // 控制字符
      .trim()
  }

  const handleAnalyze = async () => {
    const clean = sanitizeInput(text)
    if (!clean) return
    setText(clean)
    setLoading(true)
    setError(null)
    try {
      const analysis = await analyzeEmotion(clean)
      setResult(analysis)
      setEditing(false) // 分析完成后退出编辑模式
    } catch (e) {
      console.error('分析失败:', e)
      setError('分析失败，请稍后重试或手动选择情绪')
      setTimeout(() => setError(null), 4000)
    }
    setLoading(false)
  }

  const handleSave = async () => {
    if (!result) return
    const clean = sanitizeInput(text)
    await saveRecordAsync({
      date: dateParam,
      text: clean,
      mood: result.mood,
      intensity: result.intensity,
      moodLabel: MOOD_TYPES[result.mood]?.label,
      suggestion: result.suggestion,
      keywords: result.keywords,
      analysis: result.analysis,
      confidence: result.confidence,
      method: result.method
    })
    // 提交匿名统计（静默），附带关键词用于热度排行
    submitMoodStat({ mood: result.mood, date: dateParam, keywords: result.keywords })
    setSaved(true)
    // 负面情绪触发关怀卡片
    if (result.mood === 'negative' || result.mood === 'very_negative') {
      setShowCaring(true)
    } else {
      setShowCaring(false)
    }
    // 通知其他页面数据已更新
    window.dispatchEvent(new Event('mood-record-updated'))
  }

  const handleManualSelect = (moodKey) => {
    setResult({
      mood: moodKey,
      intensity: MOOD_TYPES[moodKey].intensity,
      suggestion: '',
      keywords: [],
      analysis: '手动选择',
      confidence: 1,
      method: 'manual'
    })
    setEditing(false)
  }

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      if ((!saved || editing) && text.trim()) {
        handleAnalyze()
      }
    }
  }

  const tips = result ? getWellnessTips(result.mood) : null

  return (
    <div
      className="max-w-2xl mx-auto px-4 pt-4 pb-6 animate-fade-in-up"
      role="main"
      onKeyDown={handleKeyDown}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-pink-400/50"
          aria-label="返回"
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold theme-text">
            {isToday ? '记录今天的心情' : '记录心情'}
          </h1>
          <p className="text-xs theme-text-tertiary">
            {result?.method === 'ai' ? '🤖 AI 分析' : result?.method === 'keyword' ? '📝 关键词分析' : ''}
          </p>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm text-center animate-fade-in-up" role="alert">
          ⚠️ {error}
        </div>
      )}

      {/* 日期导航 */}
      <div className="flex items-center justify-center gap-4 mb-5 relative">
        <button
          onClick={() => {
            const prev = format(subDays(currentDate, 1), 'yyyy-MM-dd')
            navigate(`/record?date=${prev}`)
          }}
          className="p-2 rounded-lg hover:bg-white/10 theme-text-secondary hover:theme-text transition-colors focus:outline-none focus:ring-2 focus:ring-pink-400/50"
          aria-label="前一天"
        >
          <ChevronLeft size={18} />
        </button>
        {/* 日期按钮：点击弹出快捷跳转 */}
        <div className="relative" ref={quickJumpRef}>
          <button
            onClick={() => setShowQuickJump(v => !v)}
            className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-pink-400/50"
            aria-label="选择日期"
            aria-expanded={showQuickJump}
          >
            <CalendarDays size={14} className="theme-text-tertiary" aria-hidden="true" />
            <span className={`font-medium ${isToday ? 'text-pink-400' : 'theme-text'}`}>
              {format(currentDate, 'yyyy年MM月dd日')}
            </span>
            {isToday && <span className="text-xs text-pink-400/70">今天</span>}
          </button>
          {/* 隐藏的原生日期选择器 */}
          <input
            ref={dateInputRef}
            type="date"
            value={dateParam}
            max={format(new Date(), 'yyyy-MM-dd')}
            onChange={(e) => {
              if (e.target.value) {
                navigate(`/record?date=${e.target.value}`)
                setShowQuickJump(false)
              }
            }}
            className="absolute opacity-0 w-0 h-0 pointer-events-none"
            tabIndex={-1}
            aria-hidden="true"
          />
          {/* 快捷跳转面板 */}
          {showQuickJump && (
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 glass rounded-xl p-3 shadow-xl border border-white/10 min-w-[200px] animate-fade-in-up">
              {/* 快捷日期 */}
              <div className="flex gap-2 mb-3">
                {[
                  { label: '今天', offset: 0 },
                  { label: '昨天', offset: -1 },
                  { label: '前天', offset: -2 },
                ].map(({ label, offset }) => {
                  const d = addDays(new Date(), offset)
                  const ds = format(d, 'yyyy-MM-dd')
                  const isActive = ds === dateParam
                  return (
                    <button
                      key={label}
                      onClick={() => { navigate(`/record?date=${ds}`); setShowQuickJump(false) }}
                      className={`flex-1 text-xs py-2 rounded-lg transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-pink-400/50 ${
                        isActive
                          ? 'bg-pink-500/30 text-pink-300 font-medium'
                          : 'hover:bg-white/10 theme-text-secondary'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
              {/* 打开完整日历 */}
              <button
                onClick={() => {
                  setShowQuickJump(false)
                  // 延迟打开原生日期选择器，确保面板关闭后再触发
                  setTimeout(() => dateInputRef.current?.showPicker?.() || dateInputRef.current?.click(), 100)
                }}
                className="w-full flex items-center justify-center gap-2 text-xs py-2.5 rounded-lg hover:bg-white/10 theme-text-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-pink-400/50"
              >
                <CalendarDays size={13} aria-hidden="true" />
                选择其他日期
              </button>
            </div>
          )}
        </div>
        <button
          onClick={() => {
            const next = format(addDays(currentDate, 1), 'yyyy-MM-dd')
            if (!isAfter(addDays(currentDate, 1), todayStart)) {
              navigate(`/record?date=${next}`)
            }
          }}
          disabled={isFuture}
          className="p-2 rounded-lg hover:bg-white/10 theme-text-secondary hover:theme-text transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-pink-400/50"
          aria-label="后一天"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* 输入区 */}
      <div className="glass rounded-2xl p-5 mb-5">
        <label htmlFor="mood-input" className="text-sm theme-text-secondary block mb-3">
          用一句话描述你现在的感受
        </label>
        <textarea
          id="mood-input"
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="比如：今天考试通过了，超级开心！"
          className="w-full bg-transparent border-none outline-none text-lg resize-none min-h-[80px] theme-text placeholder:theme-text-muted"
          rows={3}
          maxLength={500}
          disabled={saved && !editing}
          aria-describedby="char-count hint-text"
        />
        <div className="flex items-center justify-between mt-2">
          <span id="char-count" className="text-xs theme-text-muted" aria-live="polite">
            {text.length}/500
          </span>
          {!saved || editing ? (
            <button
              onClick={handleAnalyze}
              disabled={!text.trim() || loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-400 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-pink-400/50"
              aria-label="AI 分析情绪"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles size={16} aria-hidden="true" />
              )}
              {loading ? '分析中...' : 'AI 分析'}
            </button>
          ) : null}
        </div>
        <p id="hint-text" className="text-xs theme-text-muted mt-2">
          提示：按 Ctrl+Enter 快速分析
        </p>
      </div>

      {/* 手动选择情绪 */}
      {!result && !saved && (
        <div className="mb-5" role="group" aria-label="手动选择情绪">
          <p className="text-sm theme-text-secondary mb-3">或者直接选择情绪：</p>
          <div className="flex gap-2 flex-wrap">
            {getMoodList().map(mood => (
              <MoodButton key={mood.key} mood={mood} onSelect={handleManualSelect} />
            ))}
          </div>
        </div>
      )}

      {/* 分析结果 */}
      {result && (
        <div className="animate-fade-in-up">
          {/* 情绪卡片 */}
          <div
            className={`rounded-2xl p-5 mb-4 border ${getMoodBgClass(result.mood)}`}
            role="status"
            aria-label={`分析结果：${MOOD_TYPES[result.mood]?.label}，情绪强度 ${result.intensity}`}
          >
            <div className="flex items-center gap-4 mb-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                style={{ backgroundColor: getMoodColor(result.mood) + '30' }}
                aria-hidden="true"
              >
                {MOOD_TYPES[result.mood]?.emoji}
              </div>
              <div>
                <p className="text-2xl font-bold theme-text">{MOOD_TYPES[result.mood]?.label}</p>
                <p className="text-sm theme-text-secondary mt-1">
                  情绪强度: {'★'.repeat(result.intensity)}{'☆'.repeat(5 - result.intensity)}
                </p>
              </div>
            </div>

            {/* 关键词 */}
            {result.keywords?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3" aria-label="关键词">
                {result.keywords.map((kw, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-lg bg-white/10 text-xs theme-text-secondary">
                    {kw}
                  </span>
                ))}
              </div>
            )}

            {/* AI 分析 */}
            {result.analysis && (
              <p className="text-sm theme-text-secondary leading-relaxed">
                💭 {result.analysis}
              </p>
            )}
          </div>

          {/* 建议 */}
          {tips && (
            <div className="glass rounded-2xl p-5 mb-4">
              <h3 className="text-sm font-medium theme-text mb-3">{tips.title}</h3>
              <ul className="space-y-2" role="list">
                {tips.tips.map((tip, i) => (
                  <li key={i} className="text-sm theme-text-secondary flex items-start gap-2">
                    <span className="text-pink-400 mt-0.5 shrink-0" aria-hidden="true">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 保存按钮 */}
          {!saved || editing ? (
            <button
              onClick={() => { handleSave(); setEditing(false) }}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white font-medium transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-pink-400/50"
            >
              <Send size={18} aria-hidden="true" />
              {editing ? '重新保存' : '保存记录'}
            </button>
          ) : (
            <>
              <div className="text-center py-3 animate-success-pulse" role="status">
                <p className="text-green-400 text-sm font-medium">✓ 已保存</p>
                <div className="flex items-center justify-center gap-4 mt-2">
                  <button
                    onClick={() => setEditing(true)}
                    className="text-sm text-pink-400 hover:text-pink-300 transition-colors focus:outline-none focus:ring-2 focus:ring-pink-400/50 rounded-lg px-2 py-1"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => navigate('/')}
                    className="text-sm theme-text-tertiary hover:theme-text-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-pink-400/50 rounded-lg px-2 py-1"
                  >
                    返回首页
                  </button>
                </div>
              </div>

              {/* 关怀卡片（负面情绪时显示） */}
              {showCaring && (
                <CaringCard
                  mood={result?.mood}
                  onClose={() => setShowCaring(false)}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// 情绪按钮组件（带弹跳动画）
function MoodButton({ mood, onSelect }) {
  const [bouncing, setBouncing] = useState(false)

  const handleClick = () => {
    setBouncing(true)
    onSelect(mood.key)
    setTimeout(() => setBouncing(false), 400)
  }

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all active:scale-95 ${mood.bgClass} hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-pink-400/50`}
      aria-label={`选择情绪：${mood.label}`}
    >
      <span className={`text-lg ${bouncing ? 'animate-emoji-bounce' : ''}`} aria-hidden="true">
        {mood.emoji}
      </span>
      <span className="text-sm">{mood.label}</span>
    </button>
  )
}
