/**
 * 本地数据加密工具
 * 使用 Web Crypto API (AES-GCM-256) 对 localStorage 数据加密
 * 
 * 注意：密钥存储在 localStorage 中，可防止普通 devtools 直接读取明文。
 * 生产环境建议集成设备安全存储（Keychain/Keystore）。
 */

const ENCRYPTION_KEY_ID = 'mood_calendar_enc_v1'

let _cachedKey = null

/**
 * 获取或生成 AES-GCM 密钥
 */
async function getCryptoKey() {
  if (_cachedKey) return _cachedKey

  const stored = localStorage.getItem(ENCRYPTION_KEY_ID)
  if (stored) {
    try {
      const raw = Uint8Array.from(atob(stored), c => c.charCodeAt(0))
      _cachedKey = await crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt'])
      return _cachedKey
    } catch {
      // 密钥损坏，重新生成
    }
  }

  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
  const exported = await crypto.subtle.exportKey('raw', key)
  localStorage.setItem(ENCRYPTION_KEY_ID, btoa(String.fromCharCode(...new Uint8Array(exported))))
  _cachedKey = key
  return key
}

/**
 * 加密字符串 → base64
 */
export async function encrypt(plaintext) {
  try {
    const key = await getCryptoKey()
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const encoded = new TextEncoder().encode(plaintext)
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
    const combined = new Uint8Array(iv.length + ciphertext.byteLength)
    combined.set(iv)
    combined.set(new Uint8Array(ciphertext), iv.length)
    return btoa(String.fromCharCode(...combined))
  } catch (e) {
    console.error('加密失败:', e)
    return null
  }
}

/**
 * 解密 base64 → 字符串
 */
export async function decrypt(encrypted) {
  try {
    const key = await getCryptoKey()
    const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0))
    const iv = combined.slice(0, 12)
    const ciphertext = combined.slice(12)
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
    return new TextDecoder().decode(decrypted)
  } catch (e) {
    console.error('解密失败:', e)
    return null
  }
}

/**
 * 判断数据是否已加密（base64 + 长度阈值）
 */
export function isLikelyEncrypted(data) {
  if (!data || typeof data !== 'string') return false
  // JSON 数组以 [ 开头，加密数据是纯 base64
  if (data.startsWith('[') || data.startsWith('{')) return false
  // base64 字符验证
  return /^[A-Za-z0-9+/=]{20,}$/.test(data)
}

/**
 * 迁移：将 localStorage 中的明文数据加密
 * @param {string} storageKey - localStorage 的 key
 * @returns {Promise<{migrated: boolean, count: number}>}
 */
export async function migrateToEncrypted(storageKey) {
  const raw = localStorage.getItem(storageKey)
  if (!raw || isLikelyEncrypted(raw)) return { migrated: false, count: 0 }

  try {
    const records = JSON.parse(raw)
    if (!Array.isArray(records)) return { migrated: false, count: 0 }

    const encrypted = await encrypt(raw)
    if (encrypted) {
      localStorage.setItem(storageKey, encrypted)
      return { migrated: true, count: records.length }
    }
  } catch {
    // 不是有效的 JSON，跳过
  }
  return { migrated: false, count: 0 }
}

/**
 * 带加密的读取（兼容未加密数据）
 * @param {string} storageKey
 * @returns {Promise<any|null>}
 */
export async function secureGet(storageKey) {
  const raw = localStorage.getItem(storageKey)
  if (!raw) return null

  if (isLikelyEncrypted(raw)) {
    const decrypted = await decrypt(raw)
    return decrypted ? JSON.parse(decrypted) : null
  }

  // 未加密数据，直接解析
  return JSON.parse(raw)
}

/**
 * 带加密的写入
 * @param {string} storageKey
 * @param {any} data
 */
export async function secureSet(storageKey, data) {
  const json = JSON.stringify(data)
  const encrypted = await encrypt(json)
  localStorage.setItem(storageKey, encrypted || json)
}

// ── API Key 安全存储 ──

const API_KEY_PREFIX = 'mood_enc_'

/**
 * 安全存储 API Key（AES-GCM 加密后存入 localStorage）
 * @param {string} key - localStorage 的 key 名
 * @param {string|null} value - 要存储的值，null 则删除
 */
export async function secureKeySet(key, value) {
  if (!value) {
    localStorage.removeItem(API_KEY_PREFIX + key)
    localStorage.removeItem(key) // 同时清除旧的明文
    return
  }
  const encrypted = await encrypt(value)
  localStorage.setItem(API_KEY_PREFIX + key, encrypted || value)
  // 清除可能存在的旧明文
  localStorage.removeItem(key)
}

/**
 * 安全读取 API Key（自动解密，兼容旧的明文存储）
 * @param {string} key - localStorage 的 key 名
 * @returns {Promise<string|null>}
 */
export async function secureKeyGet(key) {
  // 优先读加密版本
  const enc = localStorage.getItem(API_KEY_PREFIX + key)
  if (enc) {
    if (isLikelyEncrypted(enc)) {
      const decrypted = await decrypt(enc)
      return decrypted
    }
    return enc
  }
  // 兼容旧的明文存储，自动迁移
  const plain = localStorage.getItem(key)
  if (plain) {
    await secureKeySet(key, plain)
    return plain
  }
  return null
}
