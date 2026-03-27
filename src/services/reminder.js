// 每日提醒通知服务

import { getLocalDateString } from '../utils/moodUtils'

const REMINDER_KEY = 'mood_calendar_reminder'

// 回调：当浏览器通知不可用时，调用此回调触发页面内提醒
let onPageReminder = null

export function setPageReminderCallback(cb) {
  onPageReminder = cb
}

// 获取提醒设置
export function getReminderSettings() {
  try {
    const data = localStorage.getItem(REMINDER_KEY)
    return data ? JSON.parse(data) : { enabled: false, hour: 21, minute: 0 }
  } catch {
    return { enabled: false, hour: 21, minute: 0 }
  }
}

// 保存提醒设置
export function saveReminderSettings(settings) {
  localStorage.setItem(REMINDER_KEY, JSON.stringify(settings))
}

// 检查浏览器是否支持通知
export function isNotificationSupported() {
  return 'Notification' in window
}

// 请求通知权限
export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  const result = await Notification.requestPermission()
  return result
}

// 检查今天是否已记录
function hasRecordedToday() {
  try {
    const today = getLocalDateString()
    const data = localStorage.getItem('mood_calendar_records')
    if (!data) return false

    // 可能是加密数据，无法同步解析
    if (!data.startsWith('[') && !data.startsWith('{')) return false

    const records = JSON.parse(data)
    return Array.isArray(records) && records.some(r => r.date === today)
  } catch {
    return false
  }
}

const REMINDER_MESSAGES = [
  '今天的心情怎么样？来记录一下吧 📝',
  '花一分钟，写一句话，记录今天的感受 💭',
  '心情需要被看见，来写今天的日记吧 🌟',
  '今天有什么值得记录的事？来情绪日历看看 📊',
]

function getRandomMessage() {
  return REMINDER_MESSAGES[Math.floor(Math.random() * REMINDER_MESSAGES.length)]
}

// 发送提醒（优先浏览器通知，降级到页面内回调）
export function sendReminder() {
  if (hasRecordedToday()) return

  const body = getRandomMessage()

  // 优先用浏览器通知
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('情绪日历', {
      body,
      icon: '/icons/icon-192.svg',
      badge: '/icons/icon-192.svg',
      tag: 'mood-reminder',
      renotify: true,
    })
    return
  }

  // 降级：触发页面内提醒
  if (onPageReminder) {
    onPageReminder(body)
  }
}

// 启动定时提醒检查（每分钟检查一次是否到了提醒时间）
let reminderInterval = null

export function startReminderCheck() {
  stopReminderCheck()

  const check = () => {
    const settings = getReminderSettings()
    if (!settings.enabled) return

    const now = new Date()
    if (now.getHours() === settings.hour && now.getMinutes() === settings.minute) {
      sendReminder()
    }
  }

  // 立即检查一次
  check()
  // 每分钟检查
  reminderInterval = setInterval(check, 60 * 1000)
}

export function stopReminderCheck() {
  if (reminderInterval) {
    clearInterval(reminderInterval)
    reminderInterval = null
  }
}
