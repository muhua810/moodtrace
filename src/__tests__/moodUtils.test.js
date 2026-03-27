import { describe, it, expect, beforeEach } from 'vitest'
import { MOOD_TYPES, getMoodColor, getMoodBgClass, getMoodTextClass, getMoodList } from '../utils/moodUtils'

describe('moodUtils', () => {
  describe('MOOD_TYPES', () => {
    it('should have 5 mood types', () => {
      expect(Object.keys(MOOD_TYPES)).toHaveLength(5)
    })

    it('should have all required properties for each mood', () => {
      Object.values(MOOD_TYPES).forEach(mood => {
        expect(mood).toHaveProperty('key')
        expect(mood).toHaveProperty('label')
        expect(mood).toHaveProperty('emoji')
        expect(mood).toHaveProperty('color')
        expect(mood).toHaveProperty('intensity')
        expect(mood.intensity).toBeGreaterThanOrEqual(1)
        expect(mood.intensity).toBeLessThanOrEqual(5)
      })
    })

    it('should have correct intensity ordering', () => {
      expect(MOOD_TYPES.very_negative.intensity).toBe(1)
      expect(MOOD_TYPES.negative.intensity).toBe(2)
      expect(MOOD_TYPES.neutral.intensity).toBe(3)
      expect(MOOD_TYPES.positive.intensity).toBe(4)
      expect(MOOD_TYPES.very_positive.intensity).toBe(5)
    })
  })

  describe('getMoodColor', () => {
    it('should return correct color for valid mood', () => {
      expect(getMoodColor('very_positive')).toBe('#8b5cf6')
      expect(getMoodColor('positive')).toBe('#22c55e')
      expect(getMoodColor('negative')).toBe('#f97316')
    })

    it('should return fallback for invalid mood', () => {
      expect(getMoodColor('invalid')).toBe('#e8ddd4')
      expect(getMoodColor('')).toBe('#e8ddd4')
      expect(getMoodColor(null)).toBe('#e8ddd4')
    })
  })

  describe('getMoodBgClass', () => {
    it('should return bg class for valid mood', () => {
      expect(getMoodBgClass('positive')).toContain('bg-')
    })

    it('should return fallback for invalid mood', () => {
      expect(getMoodBgClass('invalid')).toContain('bg-gray')
    })
  })

  describe('getMoodTextClass', () => {
    it('should return text class for valid mood', () => {
      expect(getMoodTextClass('positive')).toContain('text-')
    })

    it('should return fallback for invalid mood', () => {
      expect(getMoodTextClass('invalid')).toContain('text-gray')
    })
  })

  describe('getMoodList', () => {
    it('should return array of all moods', () => {
      const list = getMoodList()
      expect(list).toHaveLength(5)
      expect(list.map(m => m.key)).toEqual(
        expect.arrayContaining(['very_negative', 'negative', 'neutral', 'positive', 'very_positive'])
      )
    })
  })
})
