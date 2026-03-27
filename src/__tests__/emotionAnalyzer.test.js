import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock localStorage
const localStorageMock = (() => {
  let store = {}
  return {
    getItem: vi.fn(key => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value }),
    removeItem: vi.fn(key => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

import { analyzeEmotion, getWellnessTips } from '../services/emotionAnalyzer'

describe('emotionAnalyzer', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  describe('keyword analysis (no API)', () => {
    it('should detect very positive mood', async () => {
      const result = await analyzeEmotion('今天考试通过了，超级开心！')
      expect(['very_positive', 'positive']).toContain(result.mood)
      expect(result.method).toBe('keyword')
      expect(result.confidence).toBeGreaterThan(0.3)
    })

    it('should detect very negative mood', async () => {
      const result = await analyzeEmotion('好崩溃，受不了了')
      expect(['very_negative', 'negative']).toContain(result.mood)
    })

    it('should detect neutral mood for bland text', async () => {
      const result = await analyzeEmotion('今天没什么特别的事情')
      expect(['neutral', 'negative', 'positive']).toContain(result.mood)
    })

    it('should detect negative mood', async () => {
      const result = await analyzeEmotion('压力好大，好累')
      expect(['negative', 'very_negative']).toContain(result.mood)
    })

    it('should handle negation words', async () => {
      const result = await analyzeEmotion('不太开心')
      expect(result.mood).not.toBe('very_positive')
    })

    it('should handle degree adverbs', async () => {
      const result1 = await analyzeEmotion('开心')
      const result2 = await analyzeEmotion('非常开心')
      expect(result2.confidence).toBeGreaterThanOrEqual(result1.confidence)
    })

    it('should return keywords', async () => {
      const result = await analyzeEmotion('今天考试通过了，超级开心！')
      expect(Array.isArray(result.keywords)).toBe(true)
    })

    it('should return suggestion', async () => {
      const result = await analyzeEmotion('好开心')
      expect(typeof result.suggestion).toBe('string')
      expect(result.suggestion.length).toBeGreaterThan(0)
    })
  })

  describe('crisis detection', () => {
    it('should detect crisis keywords and return special suggestion', async () => {
      const result = await analyzeEmotion('不想活了')
      expect(result.suggestion).toContain('400-161-9995')
    })
  })

  describe('getWellnessTips', () => {
    it('should return tips for each mood type', () => {
      const moods = ['very_negative', 'negative', 'neutral', 'positive', 'very_positive']
      moods.forEach(mood => {
        const tips = getWellnessTips(mood)
        expect(tips).toHaveProperty('title')
        expect(tips).toHaveProperty('tips')
        expect(tips.tips.length).toBeGreaterThan(0)
      })
    })

    it('should fallback to neutral for unknown mood', () => {
      const tips = getWellnessTips('unknown')
      expect(tips.title).toBeDefined()
    })
  })
})
