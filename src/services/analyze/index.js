/**
 * 分析模块统一导出
 */
export { KEYWORD_RULES, NEUTRAL_KEYWORDS, SLANG_KEYWORDS, CRISIS_KEYWORDS, hasCrisisKeywords } from './keywords'
export { EMOJI_MOOD_MAP } from './emojiMap'
export { SARCASM_PATTERNS, POSITIVE_SARCASM_WORDS, detectSarcasm } from './sarcasm'
export {
  NEGATION_WORDS, NEGATION_WINDOW, REVERSAL_PATTERNS,
  splitClauses, isNegated, hasRelativeExpression, detectReversal,
} from './negation'
