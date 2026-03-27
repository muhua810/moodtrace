import { describe, it, expect, beforeEach } from 'vitest'
import { analyzeEmotion, getWellnessTips } from '../services/emotionAnalyzer'

describe('emotionAnalyzer edge cases', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('edge case inputs', () => {
    it('should handle empty string', async () => {
      const result = await analyzeEmotion('')
      expect(result).toHaveProperty('mood')
      expect(result).toHaveProperty('intensity')
    })

    it('should handle very long input', async () => {
      const longText = '开心'.repeat(100)
      const result = await analyzeEmotion(longText)
      expect(result.mood).toBe('positive')
    })

    it('should handle mixed emotions (positive + negative)', async () => {
      const result = await analyzeEmotion('考试通过了很开心但朋友生病了很难过')
      expect(result).toHaveProperty('mood')
      expect([1, 2, 3, 4, 5]).toContain(result.intensity)
    })

    it('should handle English input', async () => {
      const result = await analyzeEmotion('I feel so happy and great today')
      expect(result.mood).toBe('positive')
    })

    it('should handle special characters', async () => {
      const result = await analyzeEmotion('！！！超级开心！！！🎉🎉🎉')
      expect(result.mood).toBe('very_positive')
    })
  })

  describe('confidence levels', () => {
    it('should have higher confidence for clear positive', async () => {
      const result = await analyzeEmotion('超级开心，太棒了，完美的一天')
      expect(result.confidence).toBeGreaterThan(0.5)
    })

    it('should have lower confidence for unclear input', async () => {
      const result = await analyzeEmotion('今天中午吃了个苹果')
      expect(result.confidence).toBeLessThan(0.6)
    })
  })

  describe('keyword matching', () => {
    it('should detect neutral keywords', async () => {
      const result = await analyzeEmotion('还行吧，一般般')
      expect(result.mood).toBe('neutral')
    })

    it('should detect weak negative keywords', async () => {
      const result = await analyzeEmotion('有点累，压力大')
      expect(['negative', 'neutral']).toContain(result.mood)
    })

    it('should detect very negative keywords with high priority', async () => {
      const result = await analyzeEmotion('崩溃了')
      expect(result.mood).toBe('very_negative')
    })
  })

  describe('suggestion generation', () => {
    it('should return appropriate suggestions for each mood level', async () => {
      const levels = [
        { text: '绝望', expectedMood: 'very_negative' },
        { text: '好难过', expectedMood: 'negative' },
        { text: '还行', expectedMood: 'neutral' },
        { text: '很开心', expectedMood: 'positive' },
        { text: '超级开心', expectedMood: 'very_positive' },
      ]

      for (const { text } of levels) {
        const result = await analyzeEmotion(text)
        expect(result.suggestion).toBeTruthy()
        expect(typeof result.suggestion).toBe('string')
        expect(result.suggestion.length).toBeGreaterThan(5)
      }
    })
  })
})
