import { useState, useEffect } from 'react'
import { Heart, Phone, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import { getConsecutiveLowDays, getAllRecords } from '../services/storage'
import { MOOD_TYPES } from '../utils/moodUtils'
import { t } from '../i18n'

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

function getCareContent() {
  return {
    1: {
      emoji: '🌿',
      title: t('care.level1Title'),
      message: t('care.level1Msg'),
      tips: [t('care.level1Tip1'), t('care.level1Tip2'), t('care.level1Tip3')],
      showHotline: false,
      color: 'border-yellow-500/20 bg-yellow-500/5',
    },
    2: {
      emoji: '💛',
      title: t('care.level2Title'),
      message: t('care.level2Msg'),
      tips: [t('care.level2Tip1'), t('care.level2Tip2'), t('care.level2Tip3'), t('care.level2Tip4')],
      showHotline: true,
      color: 'border-orange-500/20 bg-orange-500/5',
    },
    3: {
      emoji: '🫂',
      title: t('care.level3Title'),
      message: t('care.level3Msg'),
      tips: [t('care.level3Tip1'), t('care.level3Tip2'), t('care.level3Tip3')],
      showHotline: true,
      hotlineProminent: true,
      color: 'border-red-500/20 bg-red-500/5',
    },
  }
}

export default function CaringCard({ mood, onClose }) {
  const [expanded, setExpanded] = useState(false)
  const [consecutiveDays, setConsecutiveDays] = useState(0)

  useEffect(() => {
    const days = getConsecutiveLowDays()
    setConsecutiveDays(days)
  }, [mood])

  if (mood !== 'negative' && mood !== 'very_negative') return null

  const level = getCareLevel(consecutiveDays, mood)
  if (level === 0) return null

  const CARE_CONTENT = getCareContent()
  const content = CARE_CONTENT[level]

  return (
    <div
      className={`rounded-2xl p-5 mb-4 border animate-fade-in-up ${content.color}`}
      role="alert"
      aria-label={t('care.level3Title')}
    >
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl mt-0.5" aria-hidden="true">{content.emoji}</span>
        <div className="flex-1">
          <h3 className="text-sm font-semibold theme-text">{content.title}</h3>
          <p className="text-xs theme-text-secondary mt-1 leading-relaxed">{content.message}</p>
          {consecutiveDays >= 2 && (
            <p className="text-xs theme-text-tertiary mt-1">
              {t('care.consecutiveDays').replace('{days}', consecutiveDays)}
            </p>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 theme-text-tertiary"
            aria-label={t('care.close')}
          >
            ✕
          </button>
        )}
      </div>

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
            {t('care.expandMore')} <ChevronDown size={12} />
          </button>
        )}
      </div>

      {content.showHotline && (
        <div className={`rounded-xl p-3 ${content.hotlineProminent ? 'bg-red-500/10 border border-red-500/20' : 'bg-white/5'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Phone size={14} className={content.hotlineProminent ? 'text-red-400' : 'text-pink-400'} aria-hidden="true" />
            <span className={`text-xs font-medium ${content.hotlineProminent ? 'text-red-300' : 'theme-text'}`}>
              {t('care.hotline')}
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
              {t('settings.lifeHotline')} 12320-5
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
