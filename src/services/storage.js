import { format, differenceInCalendarDays, parseISO, subDays } from 'date-fns'
import { secureGet, secureSet, migrateToEncrypted, isLikelyEncrypted } from '../utils/crypto'

const STORAGE_KEY = 'mood_calendar_records'
const ENCRYPTION_ENABLED_KEY = 'mood_calendar_enc_enabled'

// ── 内存缓存：解决加密模式下同步读取为空的问题 ──
let _recordsCache = null
let _cacheDirty = true

/**
 * 是否启用了加密存储
 */
export function isEncryptionEnabled() {
  return localStorage.getItem(ENCRYPTION_ENABLED_KEY) === 'true'
}

/**
 * 设置加密开关
 */
export function setEncryptionEnabled(enabled) {
  localStorage.setItem(ENCRYPTION_ENABLED_KEY, enabled ? 'true' : 'false')
  if (!enabled) {
    // 关闭加密时清空缓存，下次读取走 localStorage
    _recordsCache = null
    _cacheDirty = true
  }
}

/**
 * 启用加密并迁移现有数据
 * @returns {Promise<{success: boolean, count: number}>}
 */
export async function enableEncryption() {
  try {
    const result = await migrateToEncrypted(STORAGE_KEY)
    localStorage.setItem(ENCRYPTION_ENABLED_KEY, 'true')
    // 迁移后刷新缓存
    _cacheDirty = true
    await getAllRecordsAsync()
    return { success: true, count: result.count }
  } catch (e) {
    console.error('加密迁移失败:', e)
    return { success: false, count: 0 }
  }
}

/**
 * 解密数据（导出用）
 * @returns {Promise<Array>}
 */
export async function decryptForExport() {
  return await secureGet(STORAGE_KEY) || []
}

/**
 * 生成唯一 ID
 */
function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // fallback: 时间戳 + 随机数
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * 获取所有记录（同步）— 优先使用内存缓存
 * 加密模式下，如果缓存可用则返回缓存；否则返回空数组并打印警告
 */
export function getAllRecords() {
  try {
    // 加密模式：优先用缓存
    if (isEncryptionEnabled()) {
      if (_recordsCache && !_cacheDirty) return [..._recordsCache]
      // 缓存不可用，尝试从 localStorage 读明文（兼容迁移前的数据）
      const data = localStorage.getItem(STORAGE_KEY)
      if (!data) return []
      if (isLikelyEncrypted(data)) {
        console.warn('数据已加密，请先调用 getAllRecordsAsync() 初始化缓存')
        return []
      }
      return JSON.parse(data)
    }

    // 非加密模式：直接读 localStorage
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) return []
    return JSON.parse(data)
  } catch {
    return []
  }
}

/**
 * 异步获取所有记录（支持加密数据）— 初始化并刷新缓存
 */
export async function getAllRecordsAsync() {
  try {
    const data = await secureGet(STORAGE_KEY)
    const records = data || []
    _recordsCache = records
    _cacheDirty = false
    return records
  } catch {
    _recordsCache = []
    _cacheDirty = false
    return []
  }
}

/**
 * 标记缓存为脏（外部修改 localStorage 后调用）
 */
export function invalidateCache() {
  _cacheDirty = true
}

/**
 * 保存记录到缓存和存储
 */
function _writeRecords(records) {
  _recordsCache = records
  _cacheDirty = false

  if (isEncryptionEnabled()) {
    secureSet(STORAGE_KEY, records).catch(e => console.error('加密保存失败:', e))
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  }
}

// 保存记录
export function saveRecord(record) {
  const records = getAllRecords()
  const existingIndex = records.findIndex(r => r.date === record.date)
  const newRecord = {
    id: existingIndex >= 0 ? records[existingIndex].id : generateId(),
    ...record,
    createdAt: existingIndex >= 0 ? records[existingIndex].createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  if (existingIndex >= 0) {
    records[existingIndex] = newRecord
  } else {
    records.push(newRecord)
  }

  _writeRecords(records)
  return newRecord
}

/**
 * 异步保存记录（推荐，支持加密）
 */
export async function saveRecordAsync(record) {
  const records = await getAllRecordsAsync()
  const existingIndex = records.findIndex(r => r.date === record.date)
  const newRecord = {
    id: existingIndex >= 0 ? records[existingIndex].id : generateId(),
    ...record,
    createdAt: existingIndex >= 0 ? records[existingIndex].createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  if (existingIndex >= 0) {
    records[existingIndex] = newRecord
  } else {
    records.push(newRecord)
  }

  _recordsCache = records
  _cacheDirty = false

  if (isEncryptionEnabled()) {
    await secureSet(STORAGE_KEY, records)
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  }

  return newRecord
}

// 获取指定日期的记录
export function getRecordByDate(dateStr) {
  try {
    return getAllRecords().find(r => r.date === dateStr) || null
  } catch {
    return null
  }
}

// 获取最近 N 天的记录
export function getRecentRecords(days = 90) {
  try {
    const records = getAllRecords()
    if (!Array.isArray(records)) return []
    const cutoff = subDays(new Date(), days)
    return records
      .filter(r => r && r.date && parseISO(r.date) >= cutoff)
      .sort((a, b) => b.date.localeCompare(a.date))
  } catch {
    return []
  }
}

// 删除记录
export function deleteRecord(id) {
  const records = getAllRecords().filter(r => r.id !== id)
  _writeRecords(records)
}

// 获取连续低落天数（从最近记录日开始往前计算真正的连续日期）
export function getConsecutiveLowDays() {
  try {
    const records = getAllRecords()
    if (!Array.isArray(records) || records.length === 0) return 0

    // 按日期降序排列
    const sorted = [...records].filter(r => r?.date).sort((a, b) => b.date.localeCompare(a.date))
    if (sorted.length === 0) return 0

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 从最近一条记录开始
    const latestDate = parseISO(sorted[0].date)

    // 如果最近记录超过2天前，连续性已中断
    if (differenceInCalendarDays(today, latestDate) > 2) return 0

    let count = 0
    let expectedDate = latestDate

    for (const record of sorted) {
      const recordDate = parseISO(record.date)
      // 检查是否连续（允许相差1天）
      if (differenceInCalendarDays(expectedDate, recordDate) > 1) break

      if (record.mood === 'very_negative' || record.mood === 'negative') {
        count++
        expectedDate = subDays(recordDate, 1)
      } else {
        break
      }
    }
    return count
  } catch {
    return 0
  }
}

// 计算连续记录天数（真正的连续日期）
export function getStreakDays() {
  try {
    const records = getAllRecords()
    if (!Array.isArray(records) || records.length === 0) return 0

    const sorted = [...records].filter(r => r?.date).sort((a, b) => b.date.localeCompare(a.date))
    if (sorted.length === 0) return 0

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const latestDate = parseISO(sorted[0].date)
    if (differenceInCalendarDays(today, latestDate) > 2) return 0

    let streak = 1
    let expectedDate = subDays(latestDate, 1)

    for (let i = 1; i < sorted.length; i++) {
      const recordDate = parseISO(sorted[i].date)
      if (differenceInCalendarDays(expectedDate, recordDate) === 0) {
        streak++
        expectedDate = subDays(recordDate, 1)
      } else {
        break
      }
    }
    return streak
  } catch {
    return 0
  }
}


// 获取最长连续记录天数
export function getMaxStreak() {
  try {
    const records = getAllRecords()
    if (!Array.isArray(records) || records.length === 0) return 0

    const allDates = [...new Set(records.filter(r => r?.date).map(r => r.date))].sort()
    if (allDates.length === 0) return 0

    let maxStreak = 1, curStreak = 1
    for (let i = 1; i < allDates.length; i++) {
      const diff = differenceInCalendarDays(parseISO(allDates[i]), parseISO(allDates[i - 1]))
      if (diff === 1) { curStreak++; maxStreak = Math.max(maxStreak, curStreak) }
      else curStreak = 1
    }
    return maxStreak
  } catch {
    return 0
  }
}

// 统计数据
export function getStats(days = 30) {
  try {
    const records = getRecentRecords(days)
    const moodCounts = {}
    let totalIntensity = 0

    records.forEach(r => {
      if (r?.mood) {
        moodCounts[r.mood] = (moodCounts[r.mood] || 0) + 1
        totalIntensity += r.intensity || 3
      }
    })

    return {
      totalRecords: records.length,
      moodCounts,
      avgIntensity: records.length > 0 ? (totalIntensity / records.length).toFixed(1) : 0,
      records: records.slice(0, 7)
    }
  } catch {
    return { totalRecords: 0, moodCounts: {}, avgIntensity: 0, records: [] }
  }
}

// 导出数据为 JSON
export async function exportData() {
  // 优先用异步读取（支持加密数据）
  const records = await getAllRecordsAsync()
  const json = JSON.stringify(records, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `mood-calendar-export-${format(new Date(), 'yyyy-MM-dd')}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// 导入数据
export function importData(jsonString) {
  try {
    const imported = JSON.parse(jsonString)
    if (!Array.isArray(imported)) throw new Error('数据格式错误')

    // 验证数据结构
    const valid = imported.every(r => r.date && r.mood)
    if (!valid) throw new Error('记录格式不完整')

    const existing = getAllRecords()
    const existingDates = new Set(existing.map(r => r.date))

    // 合并数据，已存在的日期不覆盖
    let newCount = 0
    for (const record of imported) {
      if (!existingDates.has(record.date)) {
        existing.push({
          id: record.id || generateId(),
          date: record.date,
          text: record.text || '',
          mood: record.mood,
          intensity: record.intensity || 3,
          moodLabel: record.moodLabel || '',
          suggestion: record.suggestion || '',
          keywords: record.keywords || [],
          analysis: record.analysis || '',
          confidence: record.confidence || 0.5,
          method: record.method || 'imported',
          createdAt: record.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        newCount++
      }
    }

    _writeRecords(existing)
    return { success: true, imported: newCount, total: imported.length, skipped: imported.length - newCount }
  } catch (e) {
    return { success: false, error: e.message }
  }
}

// 清除所有数据
export function clearAllData() {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(ENCRYPTION_ENABLED_KEY)
  localStorage.removeItem('mood_calendar_enc_v1') // 加密密钥
  _recordsCache = null
  _cacheDirty = true
}
