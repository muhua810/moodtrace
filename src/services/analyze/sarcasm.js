/**
 * 反讽/阴阳怪气检测模块
 */

export const POSITIVE_SARCASM_WORDS = [
  '开心', '高兴', '棒', '好', '厉害', '优秀', '完美',
  '幸福', '美好', '快乐', '精彩', '太爽',
]

export const SARCASM_PATTERNS = [
  // "呢"结尾 + 正面词 → 大概率反讽
  {
    test: (text) =>
      /呢[！!~～。.]*$/.test(text) &&
      POSITIVE_SARCASM_WORDS.some(w => text.includes(w)),
    flipTo: 'negative',
  },
  // "呵呵"独立出现 → 反讽
  {
    test: (text) =>
      /呵呵[！!~～。.]*$/.test(text) || /^呵呵/.test(text),
    flipTo: 'negative',
  },
  // "真是太X了呢"结构 → 反讽
  {
    test: (text) =>
      /真是.{0,6}(好|棒|开心|高兴|厉害|优秀|完美|精彩)啊?[呢！!~～]+$/.test(text),
    flipTo: 'negative',
  },
  // "好一个" + 正面词 → 反讽
  {
    test: (text) =>
      /好一个.{0,6}(开心|高兴|幸福|美好)/.test(text),
    flipTo: 'negative',
  },
  // "哈哈" + 负面emoji → 反讽（笑哭）
  {
    test: (text) =>
      /哈哈/.test(text) && /😭|💀|🤡|😰|😅/.test(text),
    flipTo: 'negative',
  },
  // 纯粹一串"哈"或"笑"后跟负面词
  {
    test: (text) =>
      /^[哈嘻]{3,}/.test(text) && /了|完|死|没/.test(text),
    flipTo: 'negative',
  },
]

/**
 * 检测反讽表达
 * @param {string} text
 * @returns {{ isSarcasm: boolean, flipTo: string|null }}
 */
export function detectSarcasm(text) {
  for (const pattern of SARCASM_PATTERNS) {
    if (pattern.test(text)) {
      return { isSarcasm: true, flipTo: pattern.flipTo }
    }
  }
  return { isSarcasm: false, flipTo: null }
}
