/**
 * 关键词云组件
 * 从用户记录的 keywords 字段和文本中提取高频词，按频率渲染为不同大小的标签云
 */
import { useMemo } from 'react'
import { MOOD_TYPES } from '../utils/moodUtils'

// 情绪颜色映射
const MOOD_COLORS = {
  very_negative: '#ef4444',
  negative: '#f97316',
  neutral: '#eab308',
  positive: '#22c55e',
  very_positive: '#6366f1',
}

// 常见停用词（过滤掉无意义的高频词）
const STOP_WORDS = new Set([
  '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一',
  '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有',
  '看', '好', '自己', '这', '他', '她', '它', '们', '那', '些', '什么', '怎么',
  '还是', '因为', '所以', '但是', '然后', '如果', '虽然', '今天', '感觉',
  '觉得', '有点', '真的', '可以', '已经', '没有', '不是', '不想', '不过',
  '一直', '一下', '一些', '这些', '那些', '这样', '那样', '这么', '那么',
  '一天', '一次', '一样', '一点', '一段', '一件', '一场', '一种',
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'am',
])

/**
 * 从文本中提取有意义的关键词
 */
function extractKeywordsFromText(text) {
  if (!text) return []
  const words = []

  // 提取 2-4 字的中文词组
  const cleanText = text.replace(/[^\u4e00-\u9fff\uf900-\ufaffa-zA-Z]/g, ' ')
  const segments = cleanText.split(/\s+/).filter(s => s.length >= 2)

  for (const seg of segments) {
    if (seg.length >= 2 && seg.length <= 6 && !STOP_WORDS.has(seg)) {
      words.push(seg)
    }
  }

  // 额外提取 bigram（过滤掉助词开头/结尾的无意义组合）
  const FUNC_WORDS = new Set(['的', '了', '在', '是', '有', '和', '就', '不', '都', '上', '也', '很', '到', '说', '要', '去', '会', '着', '那', '这', '他', '她', '它', '们', '被', '把', '从', '对', '为', '所', '以', '而', '但', '或', '与', '及', '等', '个', '种', '些', '样', '点'])
  const chars = [...text].filter(c => /[\u4e00-\u9fff]/.test(c))
  for (let i = 0; i < chars.length - 1; i++) {
    if (FUNC_WORDS.has(chars[i]) || FUNC_WORDS.has(chars[i + 1])) continue
    const bigram = chars[i] + chars[i + 1]
    if (!STOP_WORDS.has(bigram)) {
      words.push(bigram)
    }
  }

  return words
}

export default function KeywordCloud({ records, maxWords = 20 }) {
  const keywords = useMemo(() => {
    const freq = new Map()
    const moodScores = new Map() // 记录关键词出现时的情绪均分

    for (const record of records) {
      // 从 keywords 字段提取
      if (Array.isArray(record.keywords)) {
        for (const kw of record.keywords) {
          if (kw && kw.length >= 2 && kw.length <= 10 && !STOP_WORDS.has(kw)) {
            freq.set(kw, (freq.get(kw) || 0) + 1)
            const intensity = MOOD_TYPES[record.mood]?.intensity || 3
            if (!moodScores.has(kw)) moodScores.set(kw, [])
            moodScores.get(kw).push(intensity)
          }
        }
      }

      // 从文本中提取关键词
      const textWords = extractKeywordsFromText(record.text)
      for (const w of textWords) {
        freq.set(w, (freq.get(w) || 0) + 1)
        const intensity = MOOD_TYPES[record.mood]?.intensity || 3
        if (!moodScores.has(w)) moodScores.set(w, [])
        moodScores.get(w).push(intensity)
      }
    }

    // 按频率排序，取前 N 个
    const sorted = [...freq.entries()]
      .filter(([word, count]) => count >= 2) // 至少出现 2 次
      .sort(([, a], [, b]) => b - a)
      .slice(0, maxWords)

    // 计算每个关键词的平均情绪分
    return sorted.map(([word, count]) => {
      const scores = moodScores.get(word) || [3]
      const avgScore = scores.reduce((s, v) => s + v, 0) / scores.length
      let moodKey
      if (avgScore <= 1.5) moodKey = 'very_negative'
      else if (avgScore <= 2.5) moodKey = 'negative'
      else if (avgScore <= 3.5) moodKey = 'neutral'
      else if (avgScore <= 4.5) moodKey = 'positive'
      else moodKey = 'very_positive'

      return { word, count, avgScore, moodKey, color: MOOD_COLORS[moodKey] }
    })
  }, [records, maxWords])

  if (keywords.length < 3) {
    return null
  }

  const maxCount = keywords[0].count

  return (
    <div className="card p-4 mb-4">
      <h2 className="text-sm font-semibold theme-text mb-3">高频关键词</h2>
      <div className="flex flex-wrap gap-2 items-center justify-center">
        {keywords.map(({ word, count, color }, idx) => {
          const ratio = count / maxCount
          const size = Math.round(11 + ratio * 7) // 11px ~ 18px
          const opacity = 0.6 + ratio * 0.4
          return (
            <span
              key={word}
              className="inline-block px-2 py-0.5 rounded-md transition-all duration-200 hover:scale-110 cursor-default"
              style={{
                fontSize: `${size}px`,
                color,
                opacity,
                backgroundColor: `${color}15`,
              }}
              title={`出现 ${count} 次`}
            >
              {word}
            </span>
          )
        })}
      </div>
    </div>
  )
}
