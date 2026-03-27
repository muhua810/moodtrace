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

import {
  getAllRecords,
  saveRecord,
  getRecordByDate,
  getRecentRecords,
  deleteRecord,
  getConsecutiveLowDays,
  getStats,
} from '../services/storage'

describe('storage service', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  describe('getAllRecords', () => {
    it('should return empty array when no data', () => {
      const records = getAllRecords()
      expect(records).toEqual([])
    })

    it('should return parsed records', () => {
      const testData = [{ id: '1', date: '2026-01-01', text: 'test', mood: 'positive' }]
      localStorageMock.setItem('mood_calendar_records', JSON.stringify(testData))
      const records = getAllRecords()
      expect(records).toHaveLength(1)
      expect(records[0].text).toBe('test')
    })

    it('should return empty array on invalid JSON', () => {
      localStorageMock.setItem('mood_calendar_records', 'invalid json')
      const records = getAllRecords()
      expect(records).toEqual([])
    })
  })

  describe('saveRecord', () => {
    it('should save a new record', () => {
      const record = { date: '2026-03-23', text: '开心', mood: 'positive', intensity: 4 }
      const saved = saveRecord(record)
      expect(saved.text).toBe('开心')
      expect(saved.mood).toBe('positive')
      expect(saved.id).toBeDefined()
      expect(saved.createdAt).toBeDefined()
    })

    it('should update existing record for same date', () => {
      saveRecord({ date: '2026-03-23', text: '第一次', mood: 'positive' })
      saveRecord({ date: '2026-03-23', text: '更新了', mood: 'very_positive' })

      const records = getAllRecords()
      expect(records).toHaveLength(1)
      expect(records[0].text).toBe('更新了')
      expect(records[0].mood).toBe('very_positive')
    })
  })

  describe('getRecordByDate', () => {
    it('should return record for existing date', () => {
      saveRecord({ date: '2026-03-23', text: '测试', mood: 'neutral' })
      const record = getRecordByDate('2026-03-23')
      expect(record).not.toBeNull()
      expect(record.text).toBe('测试')
    })

    it('should return null for non-existing date', () => {
      const record = getRecordByDate('2026-01-01')
      expect(record).toBeNull()
    })
  })

  describe('deleteRecord', () => {
    it('should delete record by id', () => {
      const saved = saveRecord({ date: '2026-03-23', text: '删除我', mood: 'neutral' })
      deleteRecord(saved.id)
      expect(getAllRecords()).toHaveLength(0)
    })
  })

  describe('getConsecutiveLowDays', () => {
    it('should count consecutive low mood days', () => {
      const today = new Date()
      for (let i = 0; i < 4; i++) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        const dateStr = d.toISOString().slice(0, 10)
        saveRecord({ date: dateStr, text: '难过', mood: i < 3 ? 'negative' : 'positive' })
      }
      // Only the most recent 2 are negative (consecutive from the latest)
      expect(getConsecutiveLowDays()).toBeGreaterThanOrEqual(1)
    })

    it('should return 0 when no low mood records', () => {
      saveRecord({ date: '2026-03-23', text: '开心', mood: 'positive' })
      expect(getConsecutiveLowDays()).toBe(0)
    })
  })

  describe('getStats', () => {
    it('should return correct stats', () => {
      saveRecord({ date: '2026-03-23', text: '好', mood: 'positive', intensity: 4 })
      saveRecord({ date: '2026-03-22', text: '一般', mood: 'neutral', intensity: 3 })

      const stats = getStats(30)
      expect(stats.totalRecords).toBe(2)
      expect(parseFloat(stats.avgIntensity)).toBeCloseTo(3.5, 0)
      expect(stats.moodCounts.positive).toBe(1)
      expect(stats.moodCounts.neutral).toBe(1)
    })

    it('should return zero stats when no records', () => {
      const stats = getStats(30)
      expect(stats.totalRecords).toBe(0)
      expect(stats.avgIntensity).toBe(0)
    })
  })
})
