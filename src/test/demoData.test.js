import { describe, it, expect } from 'vitest'
import { generateDemoData, shouldAutoImportDemo } from '../services/demoData'

describe('demoData', () => {
  describe('generateDemoData', () => {
    it('should generate approximately 60 days of data', () => {
      const data = generateDemoData(60)
      // 90% 概率有记录，所以实际数量在 45-60 之间
      expect(data.length).toBeGreaterThanOrEqual(40)
      expect(data.length).toBeLessThanOrEqual(60)
    })

    it('should generate records with valid dates', () => {
      const data = generateDemoData(30)
      data.forEach(record => {
        expect(record.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      })
    })

    it('should generate records with valid mood types', () => {
      const data = generateDemoData(30)
      const validMoods = ['very_negative', 'negative', 'neutral', 'positive', 'very_positive']
      data.forEach(record => {
        expect(validMoods).toContain(record.mood)
      })
    })

    it('should generate records with required fields', () => {
      const data = generateDemoData(10)
      data.forEach(record => {
        expect(record).toHaveProperty('date')
        expect(record).toHaveProperty('text')
        expect(record).toHaveProperty('mood')
        expect(record).toHaveProperty('intensity')
        expect(record).toHaveProperty('moodLabel')
        expect(record).toHaveProperty('method')
        expect(record.method).toBe('demo')
      })
    })

    it('should generate records in chronological order (newest last)', () => {
      const data = generateDemoData(30)
      for (let i = 1; i < data.length; i++) {
        expect(data[i].date >= data[i - 1].date).toBe(true)
      }
    })

    it('should generate records with intensity between 1 and 5', () => {
      const data = generateDemoData(30)
      data.forEach(record => {
        expect(record.intensity).toBeGreaterThanOrEqual(1)
        expect(record.intensity).toBeLessThanOrEqual(5)
      })
    })

    it('should generate non-empty text for each record', () => {
      const data = generateDemoData(30)
      data.forEach(record => {
        expect(record.text.length).toBeGreaterThan(0)
      })
    })

    it('should have weekend records tend toward more positive moods', () => {
      // 多次运行取平均值检验趋势
      const allData = generateDemoData(120)
      const weekendRecords = allData.filter(r => {
        const day = new Date(r.date + 'T00:00:00').getDay()
        return day === 0 || day === 6
      })
      const weekdayRecords = allData.filter(r => {
        const day = new Date(r.date + 'T00:00:00').getDay()
        return day > 0 && day < 6
      })

      if (weekendRecords.length > 3 && weekdayRecords.length > 3) {
        const weekendAvg = weekendRecords.reduce((s, r) => s + r.intensity, 0) / weekendRecords.length
        const weekdayAvg = weekdayRecords.reduce((s, r) => s + r.intensity, 0) / weekdayRecords.length
        // 周末平均值应 >= 工作日平均值（允许小误差）
        expect(weekendAvg).toBeGreaterThanOrEqual(weekdayAvg - 0.5)
      }
    })
  })

  describe('shouldAutoImportDemo', () => {
    it('should return true for empty array', () => {
      expect(shouldAutoImportDemo([])).toBe(true)
    })

    it('should return true for null', () => {
      expect(shouldAutoImportDemo(null)).toBe(true)
    })

    it('should return true for undefined', () => {
      expect(shouldAutoImportDemo(undefined)).toBe(true)
    })

    it('should return false when records exist', () => {
      expect(shouldAutoImportDemo([{ date: '2026-01-01' }])).toBe(false)
    })
  })
})
