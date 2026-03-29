/**
 * AI 分析服务
 *
 * 职责：封装所有远程 AI 调用逻辑，包括 Workers 代理和用户自定义 API
 *
 * 降级策略：
 *   Workers AI 代理 → 用户自定义 API → 返回 null（由上层降级到本地分析）
 */

import { MOOD_TYPES } from '../utils/moodUtils'
import { t } from '../i18n'
import { secureKeyGet } from '../utils/crypto'
import { getApiBase } from './apiService'

const MOOD_KEY_MAP = {
  1: 'very_negative',
  2: 'negative',
  3: 'neutral',
  4: 'positive',
  5: 'very_positive',
}

// ── AI Prompt ──

const SYSTEM_PROMPT = t('ai.systemPrompt')

// ── Workers AI 代理 ──

/**
 * 通过 Workers 代理调用 AI 分析（零配置，默认可用）
 * @param {string} text
 * @returns {Promise<Object|null>}
 */
export async function aiAnalyzeViaWorkers(text) {
  const apiBase = getApiBase()
  const response = await fetch(`${apiBase}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })

  if (!response.ok) throw new Error(`Workers API error: ${response.status}`)

  const data = await response.json()
  if (data.error) throw new Error(data.error)

  return {
    mood: data.mood,
    intensity: data.intensity,
    moodLabel: data.moodLabel,
    confidence: data.confidence,
    analysis: data.analysis,
    keywords: data.keywords || [],
    suggestion: data.suggestion || '',
    method: 'ai',
  }
}

// ── 用户自定义 API ──

/**
 * 校验并清洗 AI 返回值，防止注入和异常数据
 */
function sanitizeAiResult(raw) {
  const rawMood = Number(raw.mood) || 3
  const moodWasClamped = rawMood < 1 || rawMood > 5 || rawMood !== Math.round(rawMood)
  const moodNum = Math.max(1, Math.min(5, Math.round(rawMood)))
  const moodKey = MOOD_KEY_MAP[moodNum]

  let confidence = Math.max(0, Math.min(1, Number(raw.confidence) || 0.5))
  if (moodWasClamped) confidence = Math.min(confidence, 0.5)

  return {
    mood: moodKey,
    intensity: moodNum,
    moodLabel: MOOD_TYPES[moodKey]?.label || t('mood.neutral'),
    confidence,
    analysis: String(raw.analysis || '').slice(0, 100),
    keywords: Array.isArray(raw.keywords)
      ? raw.keywords.map(k => String(k).slice(0, 20)).slice(0, 5)
      : [],
    suggestion: String(raw.suggestion || raw.advice || '').slice(0, 50),
    method: 'ai',
  }
}

/**
 * 通过用户自定义 API 直接调用 AI 分析
 * @param {string} text
 * @returns {Promise<Object|null>}
 */
export async function aiAnalyzeDirect(text) {
  const apiKey = await secureKeyGet('ai_api_key')
  if (!apiKey) return null

  const apiUrl = await secureKeyGet('ai_api_url') || 'https://api.openai.com/v1/chat/completions'
  const modelName = await secureKeyGet('ai_model') || 'gpt-3.5-turbo'

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: text },
      ],
      temperature: 0.3,
    }),
  })

  if (!response.ok) throw new Error(`API error: ${response.status}`)

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('No response content')

  let parsed
  try {
    const cleaned = content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()
    parsed = JSON.parse(cleaned)
  } catch (parseErr) {
    console.error('AI 返回内容不是有效 JSON:', content)
    throw new Error(t('ai.responseError'))
  }

  return sanitizeAiResult(parsed)
}
