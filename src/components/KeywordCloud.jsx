import { useMemo } from 'react'
import { MOOD_TYPES } from '../utils/moodUtils'
import { t } from '../i18n'

const MOOD_COLORS = {
  very_negative: '#ef4444',
  negative: '#f97316',
  neutral: '#eab308',
  positive: '#22c55e',
  very_positive: '#6366f1',
}

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

function extractKeywordsFromText(text) {
  if (!text) return []
  const cleanText = text.replace(/[^\u4e00-\u9fff\uf900-\ufaffa-zA-Z]/g, ' ')
  return cleanText.split(/\s+/).filter(s => s.length >= 2 && s.length <= 6 && !STOP_WORDS.has(s))
}

export default function KeywordCloud({ records, maxWords = 20 }) {
  const keywords = useMemo(() => {
    const freq = new Map()
    const moodScores = new Map()

    for (const record of records) {
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
      const textWords = extractKeywordsFromText(record.text)
      for (const w of textWords) {
        freq.set(w, (freq.get(w) || 0) + 1)
        const intensity = MOOD_TYPES[record.mood]?.intensity || 3
        if (!moodScores.has(w)) moodScores.set(w, [])
        moodScores.get(w).push(intensity)
      }
    }

    const sorted = [...freq.entries()]
      .filter(([, count]) => count >= 2)
      .sort(([, a], [, b]) => b - a)
      .slice(0, maxWords)

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

  if (keywords.length < 3) return null

  const maxCount = keywords[0].count

  return (
    <div className="card p-4 mb-4">
      <h2 className="text-sm font-semibold theme-text mb-3">{t('keyword.title')}</h2>
      <div className="flex flex-wrap gap-2 items-center justify-center">
        {keywords.map(({ word, count, color }) => {
          const ratio = count / maxCount
          const size = Math.round(11 + ratio * 7)
          const opacity = 0.6 + ratio * 0.4
          return (
            <span
              key={word}
              className="inline-block px-2 py-0.5 rounded-md transition-all duration-200 hover:scale-110 cursor-default"
              style={{ fontSize: `${size}px`, color, opacity, backgroundColor: `${color}15` }}
              title={`${count}`}
            >
              {word}
            </span>
          )
        })}
      </div>
    </div>
  )
}
