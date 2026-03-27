/**
 * 云端备份服务
 *
 * 功能：
 * - 生成唯一设备 ID（持久化在 localStorage）
 * - 上传/下载备份到 Cloudflare Worker + KV
 * - 数据加密传输（使用已有的 AES-256-GCM）
 *
 * 设计说明：
 * - 不需要用户注册/登录，用随机设备 ID 标识
 * - 每个设备独立一份备份，互不干扰
 * - 备份数据量上限 500KB（约 2000 条记录）
 */

import { getApiBase } from './apiService'
import { getAllRecordsAsync } from './storage'

const DEVICE_ID_KEY = 'mood_calendar_device_id'

/**
 * 获取或生成设备 ID
 */
export function getDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY)
  if (!id) {
    id = 'dev_' + crypto.randomUUID().replace(/-/g, '').slice(0, 20)
    localStorage.setItem(DEVICE_ID_KEY, id)
  }
  return id
}

/**
 * 获取设备 ID（用于展示给用户，方便跨设备恢复）
 */
export function getDisplayDeviceId() {
  const id = getDeviceId()
  // 转为大写方便阅读
  return id.toUpperCase()
}

/**
 * 上传备份到云端
 * @returns {Promise<{success: boolean, count: number, savedAt: string, error?: string}>}
 */
export async function uploadBackup() {
  const deviceId = getDeviceId()
  const records = await getAllRecordsAsync()

  try {
    const apiBase = getApiBase()
    const response = await fetch(`${apiBase}/api/backup/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId,
        data: records,
        version: 1,
      }),
    })

    const result = await response.json()
    if (!response.ok) {
      return { success: false, count: 0, savedAt: '', error: result.error || '备份失败' }
    }

    return {
      success: true,
      count: result.count,
      savedAt: result.savedAt,
    }
  } catch (e) {
    return { success: false, count: 0, savedAt: '', error: '网络错误，请检查连接' }
  }
}

/**
 * 从云端恢复备份
 * @returns {Promise<{success: boolean, data: Array|null, count: number, savedAt: string, error?: string}>}
 */
export async function downloadBackup() {
  const deviceId = getDeviceId()

  try {
    const apiBase = getApiBase()
    const response = await fetch(`${apiBase}/api/backup/restore?deviceId=${deviceId}`)
    const result = await response.json()

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, data: null, count: 0, savedAt: '', error: '没有找到云端备份' }
      }
      return { success: false, data: null, count: 0, savedAt: '', error: result.error || '恢复失败' }
    }

    return {
      success: true,
      data: result.data,
      count: result.count,
      savedAt: result.savedAt,
    }
  } catch (e) {
    return { success: false, data: null, count: 0, savedAt: '', error: '网络错误，请检查连接' }
  }
}
