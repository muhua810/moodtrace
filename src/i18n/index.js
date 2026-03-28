/**
 * 心迹 MoodTrace — i18n 工具模块
 * 轻量级国际化方案，零依赖
 */

import translations from './translations.js'

const STORAGE_KEY = 'moodtrace_lang'
const DEFAULT_LANG = 'zh'

/**
 * 获取当前语言
 */
export function getCurrentLang() {
  try {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG
  } catch {
    return DEFAULT_LANG
  }
}

/**
 * 设置当前语言
 */
export function setCurrentLang(lang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    // localStorage 不可用时静默失败
  }
}

/**
 * 翻译函数
 * @param {string} key — 翻译键名，如 'nav.home'
 * @returns {string} 当前语言对应的文本，找不到则返回 key 本身
 */
export function t(key) {
  const lang = getCurrentLang()
  const dict = translations[lang] || translations[DEFAULT_LANG]
  return dict[key] || translations[DEFAULT_LANG]?.[key] || key
}

/**
 * 获取支持的语言列表
 */
export function getSupportedLangs() {
  return [
    { code: 'zh', label: '中文' },
    { code: 'en', label: 'English' },
    { code: 'ja', label: '日本語' },
    { code: 'ko', label: '한국어' },
    { code: 'fr', label: 'Français' },
    { code: 'es', label: 'Español' },
  ]
}
