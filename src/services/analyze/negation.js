/**
 * 否定词检测、分句、反转模式模块
 */

// 否定词列表（长否定词优先匹配）
export const NEGATION_WORDS = [
  // 基础否定
  '不', '没', '没有', '不是', '不会', '别', '从不', '绝不', '毫不', '毫无', '并非',
  '再也不', '不再', '无法',
  // 新增否定词
  '远非', '远没有', '算不得', '称不上',
  // 复合否定（更长的优先匹配）
  '不太', '不怎么', '没那么', '不算', '算不上', '谈不上', '说不上', '不至于',
  '不那么', '不太那么', '并非真的',
]

export const NEGATION_WINDOW = 10

// 反转模式（"虽然...但是..."后半句权重更高）
export const REVERSAL_PATTERNS = [
  { before: '虽然', after: '但是' },
  { before: '虽然', after: '但' },
  { before: '尽管', after: '但是' },
  { before: '尽管', after: '但' },
  { before: '虽说', after: '但是' },
  { before: '虽说', after: '但' },
  { before: '虽然', after: '不过' },
  { before: '尽管', after: '不过' },
]

/**
 * 按标点/空格分割句子
 */
export function splitClauses(text) {
  const parts = text.split(/[,，。！？；、\s!?\.;]+/).filter(s => s.trim().length > 0)
  return parts.length > 0 ? parts : [text]
}

/**
 * 检查关键词是否被否定词修饰
 * 在关键词前面一定窗口内查找否定词（长否定词优先匹配）
 */
export function isNegated(text, keyword) {
  const idx = text.indexOf(keyword)
  if (idx <= 0) return false

  const windowStart = Math.max(0, idx - NEGATION_WINDOW)
  const prefix = text.substring(windowStart, idx)

  // 按长度降序排列，长否定词优先匹配
  const sortedNeg = [...NEGATION_WORDS].sort((a, b) => b.length - a.length)
  for (const neg of sortedNeg) {
    if (prefix.endsWith(neg)) return true
  }
  return false
}

/**
 * 检测相对化表达（"没那么难过" → 弱化情绪强度）
 */
export function hasRelativeExpression(text) {
  const patterns = ['没那么', '不那么', '不至于', '还算', '勉强']
  return patterns.some(p => text.includes(p))
}

/**
 * 检测反转模式（"虽然...但是..."后半句权重更高）
 * @returns {{ hasReversal: boolean, afterIndex: number }}
 */
export function detectReversal(text) {
  for (const pattern of REVERSAL_PATTERNS) {
    const beforeIdx = text.indexOf(pattern.before)
    if (beforeIdx < 0) continue
    const afterIdx = text.indexOf(pattern.after, beforeIdx + pattern.before.length)
    if (afterIdx > beforeIdx) {
      return { hasReversal: true, afterIndex: afterIdx }
    }
  }
  return { hasReversal: false, afterIndex: 0 }
}
