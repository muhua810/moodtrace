import { t } from '../i18n'

// 情绪类型定义 — 丰富色彩 + 渐变
const MOOD_I18N_KEYS = {
  very_negative: 'mood.very_negative',
  negative: 'mood.negative',
  neutral: 'mood.neutral',
  positive: 'mood.positive',
  very_positive: 'mood.very_positive',
}

export const MOOD_TYPES = {
  very_negative: {
    key: 'very_negative',
    label: '非常低落',
    emoji: '🌧️',
    color: '#ef4444',
    colorLight: '#fca5a5',
    gradient: 'linear-gradient(135deg, #ef4444, #dc2626)',
    bgClass: 'bg-red-500/20 border-red-500/30',
    glowColor: 'rgba(239, 68, 68, 0.15)',
    intensity: 1,
  },
  negative: {
    key: 'negative',
    label: '有点难过',
    emoji: '🌥️',
    color: '#f97316',
    colorLight: '#fdba74',
    gradient: 'linear-gradient(135deg, #f97316, #ea580c)',
    bgClass: 'bg-orange-500/20 border-orange-500/30',
    glowColor: 'rgba(249, 115, 22, 0.15)',
    intensity: 2,
  },
  neutral: {
    key: 'neutral',
    label: '一般般',
    emoji: '🌤️',
    color: '#eab308',
    colorLight: '#fde047',
    gradient: 'linear-gradient(135deg, #eab308, #ca8a04)',
    bgClass: 'bg-yellow-500/20 border-yellow-500/30',
    glowColor: 'rgba(234, 179, 8, 0.15)',
    intensity: 3,
  },
  positive: {
    key: 'positive',
    label: '心情不错',
    emoji: '☀️',
    color: '#22c55e',
    colorLight: '#86efac',
    gradient: 'linear-gradient(135deg, #22c55e, #16a34a)',
    bgClass: 'bg-green-500/20 border-green-500/30',
    glowColor: 'rgba(34, 197, 94, 0.15)',
    intensity: 4,
  },
  very_positive: {
    key: 'very_positive',
    label: '超级开心',
    emoji: '🌈',
    color: '#6366f1',
    colorLight: '#a5b4fc',
    gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    bgClass: 'bg-indigo-500/20 border-indigo-500/30',
    glowColor: 'rgba(99, 102, 241, 0.15)',
    intensity: 5,
  },
}

// 获取情绪对应的颜色
export function getMoodColor(moodKey) {
  return MOOD_TYPES[moodKey]?.color || 'rgba(180, 160, 190, 0.2)'
}

// 获取情绪渐变
export function getMoodGradient(moodKey) {
  return MOOD_TYPES[moodKey]?.gradient || MOOD_TYPES.neutral.gradient
}

// 获取情绪发光色
export function getMoodGlow(moodKey) {
  return MOOD_TYPES[moodKey]?.glowColor || 'rgba(0,0,0,0)'
}

// 获取情绪浅色
export function getMoodColorLight(moodKey) {
  return MOOD_TYPES[moodKey]?.colorLight || '#e5e7eb'
}

// 获取情绪对应的 CSS 类
export function getMoodBgClass(moodKey) {
  return MOOD_TYPES[moodKey]?.bgClass || 'bg-slate-800/30 border-slate-700/30'
}

// 获取情绪的多语言标签
export function getMoodLabel(moodKey) {
  const i18nKey = MOOD_I18N_KEYS[moodKey]
  if (i18nKey) {
    const translated = t(i18nKey)
    // 如果翻译结果和 key 不同（说明找到了翻译），返回翻译结果
    // 否则 fallback 到 key 本身，而不是硬编码中文
    if (translated !== i18nKey) return translated
  }
  return moodKey
}

// 获取所有情绪类型列表
export function getMoodList() {
  return Object.values(MOOD_TYPES)
}

// 安全转义 HTML
export function escapeHtml(text) {
  if (!text) return ''
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// 截断文本
export function truncateText(text, maxLength = 100) {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

// 格式化情绪强度为星星
export function formatIntensityStars(intensity) {
  return '★'.repeat(intensity) + '☆'.repeat(5 - intensity)
}

// 格式化相对日期
export function formatRelativeDate(dateStr) {
  const MS_PER_DAY = 86400000
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const date = new Date(dateStr + 'T00:00:00')
  const diff = Math.round((today - date) / MS_PER_DAY)
  if (diff === 0) return t('record.today')
  if (diff === 1) return t('record.yesterday')
  if (diff === 2) return t('record.beforeYesterday')
  if (diff > 0 && diff <= 6) {
    return t('date.daysAgo').replace('{count}', diff)
  }
  return dateStr
}

// 获取本地日期字符串
export function getLocalDateString(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
