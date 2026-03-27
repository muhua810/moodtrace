import { describe, it, expect, beforeEach } from 'vitest'
import { analyzeEmotion, getWellnessTips } from '../services/emotionAnalyzer'

describe('emotionAnalyzer', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('analyzeEmotion (local keyword analysis)', () => {
    it('should detect very positive emotions', async () => {
      const result = await analyzeEmotion('今天考试通过了，超级开心！')
      expect(result.mood).toBe('very_positive')
      expect(result.method).toMatch(/keyword|ai/)
    })

    it('should detect positive emotions', async () => {
      const result = await analyzeEmotion('今天天气不错，心情挺好')
      expect(['positive', 'very_positive']).toContain(result.mood)
    })

    it('should detect negative emotions', async () => {
      const result = await analyzeEmotion('好难过，压力大，好累')
      expect(['negative', 'very_negative']).toContain(result.mood)
    })

    it('should detect very negative emotions', async () => {
      const result = await analyzeEmotion('崩溃了，受不了了，太难受了')
      expect(result.mood).toBe('very_negative')
    })

    it('should default to neutral for ambiguous input', async () => {
      const result = await analyzeEmotion('今天吃了个苹果')
      expect(result.mood).toBe('neutral')
    })

    it('should return all required fields', async () => {
      const result = await analyzeEmotion('开心')
      expect(result).toHaveProperty('mood')
      expect(result).toHaveProperty('intensity')
      expect(result).toHaveProperty('suggestion')
      expect(result).toHaveProperty('confidence')
      expect(result).toHaveProperty('method')
      expect(result.intensity).toBeGreaterThanOrEqual(1)
      expect(result.intensity).toBeLessThanOrEqual(5)
    })

    // ====== 否定词检测测试 ======

    it('should flip positive to negative when negated ("不开心")', async () => {
      const result = await analyzeEmotion('今天不开心')
      expect(['negative', 'very_negative']).toContain(result.mood)
    })

    it('should flip positive to negative when negated ("不太开心")', async () => {
      const result = await analyzeEmotion('今天不太开心')
      expect(['negative', 'very_negative']).toContain(result.mood)
    })

    it('should flip positive to negative when negated ("没有开心")', async () => {
      const result = await analyzeEmotion('今天没有开心')
      expect(['negative', 'very_negative']).toContain(result.mood)
    })

    it('should flip positive to negative when negated ("并不开心")', async () => {
      const result = await analyzeEmotion('其实并不开心')
      expect(['negative', 'very_negative']).toContain(result.mood)
    })

    it('should detect negative directly without negation ("好难过")', async () => {
      const result = await analyzeEmotion('好难过')
      expect(['negative', 'very_negative']).toContain(result.mood)
    })

    it('should detect positive when not negated ("今天很开心")', async () => {
      const result = await analyzeEmotion('今天很开心')
      expect(['positive', 'very_positive']).toContain(result.mood)
    })

    // ====== 新增否定词测试 ======

    it('should handle "并非" negation', async () => {
      const result = await analyzeEmotion('今天并非开心')
      expect(['negative', 'very_negative', 'neutral']).toContain(result.mood)
    })

    it('should handle "远非" negation', async () => {
      const result = await analyzeEmotion('心情远非开心')
      expect(['negative', 'very_negative', 'neutral']).toContain(result.mood)
    })

    it('should handle "算不得" negation', async () => {
      const result = await analyzeEmotion('今天算不得开心')
      expect(['negative', 'very_negative', 'neutral']).toContain(result.mood)
    })

    // ====== 混合情绪测试 ======

    it('should handle mixed emotions ("考试挂了但是吃到好吃的")', async () => {
      const result = await analyzeEmotion('今天考试挂了但是晚上吃到了好吃的')
      // 反转模式下后半句权重更高，应偏正面
      expect(['positive', 'neutral']).toContain(result.mood)
    })

    it('should handle "虽然...但是..." pattern (正面结尾)', async () => {
      const result = await analyzeEmotion('虽然今天很累，但是心情不错')
      // 后半句权重更高
      expect(['positive', 'very_positive']).toContain(result.mood)
    })

    it('should handle "虽然...但是..." pattern (负面结尾)', async () => {
      const result = await analyzeEmotion('虽然吃到了好吃的，但是好难过')
      // 后半句权重更高
      expect(['negative', 'very_negative']).toContain(result.mood)
    })

    // ====== Emoji 情绪测试 ======

    it('should detect positive emoji', async () => {
      const result = await analyzeEmotion('今天好开心 😀')
      expect(['positive', 'very_positive']).toContain(result.mood)
    })

    it('should detect crying emoji as negative', async () => {
      const result = await analyzeEmotion('😭')
      expect(['negative', 'very_negative']).toContain(result.mood)
    })

    it('should detect angry emoji as very negative', async () => {
      const result = await analyzeEmotion('😡')
      expect(['negative', 'very_negative']).toContain(result.mood)
    })

    it('should detect neutral emoji', async () => {
      const result = await analyzeEmotion('😐')
      expect(result.mood).toBe('neutral')
    })

    // ====== 边界情况测试 ======

    it('should handle empty input gracefully', async () => {
      const result = await analyzeEmotion('')
      expect(result.mood).toBe('neutral')
    })

    it('should handle very long input', async () => {
      const longText = '今天很开心'.repeat(50)
      const result = await analyzeEmotion(longText)
      expect(result.mood).toBeDefined()
      expect(result.intensity).toBeGreaterThanOrEqual(1)
      expect(result.intensity).toBeLessThanOrEqual(5)
    })

    it('should handle whitespace-only input', async () => {
      const result = await analyzeEmotion('   ')
      expect(result.mood).toBe('neutral')
    })

    it('should handle special characters', async () => {
      const result = await analyzeEmotion('~!@#$%^&*()')
      expect(result.mood).toBeDefined()
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

    it('should return neutral tips for unknown mood', () => {
      const tips = getWellnessTips('unknown')
      expect(tips.title).toBeDefined()
    })
  })
})
