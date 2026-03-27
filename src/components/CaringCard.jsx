import { useState, useEffect } from 'react'
import { Heart, Phone, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import { getConsecutiveLowDays, getAllRecords } from '../services/storage'
import { MOOD_TYPES } from '../utils/moodUtils'

/**
 * 渐进式关怀等级
 * Level 0: 无需显示
 * Level 1: 轻度关怀（1-2天低落） — 温柔鼓励
 * Level 2: 中度关怀（3-4天低落） — 建议放松 + 热线
 * Level 3: 重度关怀（5+天低落） — 紧急提示 + 热线高亮
 */
function getCareLevel(consecutiveDays, currentMood) {
  if (currentMood === 'very_negative') {
    if (consecutiveDays >= 3) return 3
    if (consecutiveDays >= 1) return 2
    return 1
  }
  if (currentMood === 'negative') {
    if (consecutiveDays >= 5) return 3
    if (consecutiveDays >= 3) return 2
    if (consecutiveDays >= 2) return 1
  }
  return 0
}

const CARE_CONTENT = {
  1: {
    emoji: '🌿',
    title: '最近有点辛苦呢',
    message: '注意到你最近情绪不太好，这很正常。每个人都有低落的时候。',
    tips: [
      '试着做一件让自己放松的小事',
      '和朋友聊聊天，说说心里话',
      '出门走走，换个环境透透气',
    ],
    showHotline: false,
    color: 'border-yellow-500/20 bg-yellow-500/5',
  },
  2: {
    emoji: '💛',
    title: '关心你的人很多',
    message: '你已经连续几天不太开心了。情绪低落是信号，提醒我们该好好照顾自己了。',
    tips: [
      '允许自己难过，不必强颜欢笑',
      '规律作息对情绪恢复很重要',
      '尝试写日记梳理内心的感受',
      '和信任的人说说心里的烦闷',
    ],
    showHotline: true,
    color: 'border-orange-500/20 bg-orange-500/5',
  },
  3: {
    emoji: '🫂',
    title: '你不需要独自承受',
    message: '持续的情绪低落需要认真对待。请记住，寻求帮助是勇敢的表现。',
    tips: [
      '建议和身边信任的人聊聊你的感受',
      '如果持续感到痛苦，专业帮助会很有用',
      '照顾好自己的饮食和睡眠',
    ],
    showHotline: true,
    hotlineProminent: true,
    color: 'border-red-500/20 bg-red-500/5',
  },
}

/**
 * 关怀卡片组件
 * 在保存负面情绪记录后显示渐进式关怀
 */
export default function CaringCard({ mood, onClose }) {
  const [expanded, setExpanded] = useState(false)
  const [consecutiveDays, setConsecutiveDays] = useState(0)

  useEffect(() => {
    const days = getConsecutiveLowDays()
    setConsecutiveDays(days)
  }, [mood])

  // 非负面情绪不显示
  if (mood !== 'negative' && mood !== 'very_negative') return null

  const level = getCareLevel(consecutiveDays, mood)
  if (level === 0) return null

  const content = CARE_CONTENT[level]

  return (
    <div
      className={`rounded-2xl p-5 mb-4 border animate-fade-in-up ${content.color}`}
      role="alert"
      aria-label="情绪关怀提示"
    >
      {/* 头部 */}
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl mt-0.5" aria-hidden="true">{content.emoji}</span>
        <div className="flex-1">
          <h3 className="text-sm font-semibold theme-text">{content.title}</h3>
          <p className="text-xs theme-text-secondary mt-1 leading-relaxed">{content.message}</p>
          {consecutiveDays >= 2 && (
            <p className="text-xs theme-text-tertiary mt-1">
              已连续 {consecutiveDays} 天情绪较低落
            </p>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 theme-text-tertiary"
            aria-label="关闭"
          >
            ✕
          </button>
        )}
      </div>

      {/* 建议 */}
      <div className="space-y-1.5 mb-3">
        {content.tips.slice(0, expanded ? undefined : 2).map((tip, i) => (
          <p key={i} className="text-xs theme-text-secondary flex items-start gap-2">
            <Sparkles size={12} className="text-pink-400 mt-0.5 shrink-0" aria-hidden="true" />
            {tip}
          </p>
        ))}
        {!expanded && content.tips.length > 2 && (
          <button
            onClick={() => setExpanded(true)}
            className="text-xs text-pink-400 hover:text-pink-300 flex items-center gap-1 ml-5"
          >
            展开更多 <ChevronDown size={12} />
          </button>
        )}
      </div>

      {/* 心理热线 */}
      {content.showHotline && (
        <div className={`rounded-xl p-3 ${content.hotlineProminent ? 'bg-red-500/10 border border-red-500/20' : 'bg-white/5'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Phone size={14} className={content.hotlineProminent ? 'text-red-400' : 'text-pink-400'} aria-hidden="true" />
            <span className={`text-xs font-medium ${content.hotlineProminent ? 'text-red-300' : 'theme-text'}`}>
              心理援助热线（24小时）
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href="tel:400-161-9995"
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                content.hotlineProminent
                  ? 'bg-red-500/30 text-red-200 hover:bg-red-500/40'
                  : 'bg-pink-500/20 text-pink-300 hover:bg-pink-500/30'
              }`}
            >
              400-161-9995
            </a>
            <a
              href="tel:12320-5"
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                content.hotlineProminent
                  ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                  : 'bg-white/5 theme-text-secondary hover:bg-white/10'
              }`}
            >
              生命热线 12320-5
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
