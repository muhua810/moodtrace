import { describe, it, expect, beforeEach } from 'vitest'
import {
  MOOD_TYPES,
  getMoodColor,
  getMoodBgClass,
  getMoodList,
  truncateText,
  formatIntensityStars,
} from '../utils/moodUtils'

describe('moodUtils', () => {
  describe('MOOD_TYPES', () => {
    it('should have all five mood types', () => {
      expect(Object.keys(MOOD_TYPES)).toHaveLength(5)
      expect(MOOD_TYPES).toHaveProperty('very_negative')
      expect(MOOD_TYPES).toHaveProperty('negative')
      expect(MOOD_TYPES).toHaveProperty('neutral')
      expect(MOOD_TYPES).toHaveProperty('positive')
      expect(MOOD_TYPES).toHaveProperty('very_positive')
    })

    it('each mood type should have required properties', () => {
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

    it('intensity should go from 1 (very_negative) to 5 (very_positive)', () => {
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
    })

    it('should return fallback for invalid mood', () => {
      const color = getMoodColor('invalid')
      expect(color).toContain('rgba')
    })
  })

  describe('getMoodBgClass', () => {
    it('should return bg class for valid mood', () => {
      expect(getMoodBgClass('very_positive')).toContain('bg-')
      expect(getMoodBgClass('positive')).toContain('border-')
    })

    it('should return fallback for invalid mood', () => {
      expect(getMoodBgClass('invalid')).toContain('bg-slate')
    })
  })

  describe('getMoodList', () => {
    it('should return array of all moods', () => {
      const list = getMoodList()
      expect(list).toHaveLength(5)
      expect(list[0]).toHaveProperty('key')
    })
  })

  describe('truncateText', () => {
    it('should return original text if short enough', () => {
      expect(truncateText('hello', 10)).toBe('hello')
    })

    it('should truncate and add ellipsis', () => {
      expect(truncateText('hello world', 5)).toBe('hello...')
    })

    it('should handle empty/null input', () => {
      expect(truncateText('')).toBe('')
      expect(truncateText(null)).toBe('')
    })
  })

  describe('formatIntensityStars', () => {
    it('should format stars correctly', () => {
      expect(formatIntensityStars(3)).toBe('★★★☆☆')
      expect(formatIntensityStars(1)).toBe('★☆☆☆☆')
      expect(formatIntensityStars(5)).toBe('★★★★★')
    })
  })
})
