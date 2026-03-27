import { describe, it, expect, beforeEach } from 'vitest'
import { MOOD_TYPES, getMoodColor, getMoodBgClass, getMoodList } from '../utils/moodUtils'

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
      expect(getMoodColor('very_positive')).toBe('#6366f1')
      expect(getMoodColor('positive')).toBe('#22c55e')
      expect(getMoodColor('negative')).toBe('#f97316')
    })

    it('should return fallback for invalid mood', () => {
      expect(getMoodColor('invalid')).toBe('rgba(180, 160, 190, 0.2)')
      expect(getMoodColor('')).toBe('rgba(180, 160, 190, 0.2)')
      expect(getMoodColor(null)).toBe('rgba(180, 160, 190, 0.2)')
    })
  })

  describe('getMoodBgClass', () => {
    it('should return bg class for valid mood', () => {
      expect(getMoodBgClass('positive')).toContain('bg-')
    })

    it('should return fallback for invalid mood', () => {
      expect(getMoodBgClass('invalid')).toContain('bg-slate')
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
