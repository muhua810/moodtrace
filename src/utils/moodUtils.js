// 情绪类型定义
export const MOOD_TYPES = {
  very_negative: {
    key: 'very_negative',
    label: '非常低落',
    emoji: '😢',
    color: '#ef4444',
    bgClass: 'bg-red-500/20 border-red-500/30',
    intensity: 1
  },
  negative: {
    key: 'negative',
    label: '有点难过',
    emoji: '😟',
    color: '#f97316',
    bgClass: 'bg-orange-500/20 border-orange-500/30',
    intensity: 2
  },
  neutral: {
    key: 'neutral',
    label: '一般般',
    emoji: '😐',
    color: '#eab308',
    bgClass: 'bg-yellow-500/20 border-yellow-500/30',
    intensity: 3
  },
  positive: {
    key: 'positive',
    label: '心情不错',
    emoji: '😊',
    color: '#22c55e',
    bgClass: 'bg-green-500/20 border-green-500/30',
    intensity: 4
  },
  very_positive: {
    key: 'very_positive',
    label: '超级开心',
    emoji: '🥰',
    color: '#6366f1',
    bgClass: 'bg-indigo-500/20 border-indigo-500/30',
    intensity: 5
  }
}

// 获取情绪对应的颜色（用于热力图）
export function getMoodColor(moodKey) {
  const mood = MOOD_TYPES[moodKey]
  if (!mood) return 'rgba(180, 160, 190, 0.2)'
  return mood.color
}

// 获取情绪对应的 CSS 类
export function getMoodBgClass(moodKey) {
  const mood = MOOD_TYPES[moodKey]
  return mood?.bgClass || 'bg-slate-800/30 border-slate-700/30'
}

// 获取所有情绪类型列表
export function getMoodList() {
  return Object.values(MOOD_TYPES)
}

// 安全转义 HTML，防止 XSS
export function escapeHtml(text) {
  if (!text) return ''
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// 截断文本，超出部分显示省略号
export function truncateText(text, maxLength = 100) {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

// 格式化情绪强度为星星
export function formatIntensityStars(intensity) {
  const filled = '★'.repeat(intensity)
  const empty = '☆'.repeat(5 - intensity)
  return filled + empty
}

/**
 * 格式化相对日期
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {string}
 */
export function formatRelativeDate(dateStr) {
  const MS_PER_DAY = 86400000
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const date = new Date(dateStr + 'T00:00:00')
  const diff = Math.round((today - date) / MS_PER_DAY)

  if (diff === 0) return '今天'
  if (diff === 1) return '昨天'
  if (diff === 2) return '前天'
  if (diff > 0 && diff <= 6) return `${diff}天前`
  return dateStr
}

/**
 * 获取本地日期字符串 YYYY-MM-DD（避免 toISOString 的时区问题）
 * @param {Date} date - 日期对象，默认当前时间
 * @returns {string} YYYY-MM-DD
 */
export function getLocalDateString(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
