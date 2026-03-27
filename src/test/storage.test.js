import { describe, it, expect, beforeEach } from 'vitest'
import {
  getAllRecords,
  saveRecord,
  getRecordByDate,
  getRecentRecords,
  deleteRecord,
  getConsecutiveLowDays,
  getStreakDays,
  getMaxStreak,
  getStats,
  importData,
  clearAllData,
} from '../services/storage'

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('saveRecord and getRecordByDate', () => {
    it('should save and retrieve a record', () => {
      const record = {
        date: '2026-03-20',
        text: '今天很开心',
        mood: 'very_positive',
        intensity: 5,
      }
      const saved = saveRecord(record)
      expect(saved.id).toBeDefined()
      expect(saved.createdAt).toBeDefined()

      const retrieved = getRecordByDate('2026-03-20')
      expect(retrieved).not.toBeNull()
      expect(retrieved.text).toBe('今天很开心')
      expect(retrieved.mood).toBe('very_positive')
    })

    it('should update existing record for same date', () => {
      saveRecord({ date: '2026-03-20', text: 'first', mood: 'neutral', intensity: 3 })
      saveRecord({ date: '2026-03-20', text: 'updated', mood: 'positive', intensity: 4 })

      const records = getAllRecords()
      expect(records).toHaveLength(1)
      expect(records[0].text).toBe('updated')
    })

    it('should return null for non-existent date', () => {
      expect(getRecordByDate('2026-01-01')).toBeNull()
    })

    it('should preserve createdAt on update', () => {
      const first = saveRecord({ date: '2026-03-20', text: 'first', mood: 'neutral', intensity: 3 })
      const second = saveRecord({ date: '2026-03-20', text: 'second', mood: 'positive', intensity: 4 })
      expect(second.createdAt).toBe(first.createdAt)
    })

    it('should set updatedAt on save', () => {
      const saved = saveRecord({ date: '2026-03-20', text: 'test', mood: 'neutral', intensity: 3 })
      expect(saved.updatedAt).toBeDefined()
    })
  })

  describe('getAllRecords', () => {
    it('should return empty array when no records', () => {
      expect(getAllRecords()).toEqual([])
    })

    it('should return all saved records', () => {
      saveRecord({ date: '2026-03-20', text: 'a', mood: 'neutral', intensity: 3 })
      saveRecord({ date: '2026-03-21', text: 'b', mood: 'positive', intensity: 4 })
      expect(getAllRecords()).toHaveLength(2)
    })
  })

  describe('deleteRecord', () => {
    it('should delete a record by id', () => {
      const saved = saveRecord({ date: '2026-03-20', text: 'test', mood: 'neutral', intensity: 3 })
      deleteRecord(saved.id)
      expect(getAllRecords()).toHaveLength(0)
    })

    it('should not affect other records when deleting', () => {
      const a = saveRecord({ date: '2026-03-20', text: 'a', mood: 'neutral', intensity: 3 })
      saveRecord({ date: '2026-03-21', text: 'b', mood: 'positive', intensity: 4 })
      deleteRecord(a.id)
      expect(getAllRecords()).toHaveLength(1)
      expect(getAllRecords()[0].date).toBe('2026-03-21')
    })
  })

  describe('getStats', () => {
    it('should return zero stats for empty records', () => {
      const stats = getStats(30)
      expect(stats.totalRecords).toBe(0)
      expect(stats.avgIntensity).toBe(0)
    })

    it('should calculate stats correctly', () => {
      saveRecord({ date: '2026-03-20', text: 'a', mood: 'positive', intensity: 4 })
      saveRecord({ date: '2026-03-21', text: 'b', mood: 'negative', intensity: 2 })
      const stats = getStats(30)
      expect(stats.totalRecords).toBe(2)
      expect(parseFloat(stats.avgIntensity)).toBe(3)
    })

    it('should count mood distribution', () => {
      saveRecord({ date: '2026-03-20', text: 'a', mood: 'positive', intensity: 4 })
      saveRecord({ date: '2026-03-21', text: 'b', mood: 'positive', intensity: 4 })
      saveRecord({ date: '2026-03-22', text: 'c', mood: 'negative', intensity: 2 })
      const stats = getStats(30)
      expect(stats.moodCounts.positive).toBe(2)
      expect(stats.moodCounts.negative).toBe(1)
    })
  })

  describe('importData', () => {
    it('should import valid records', () => {
      const data = JSON.stringify([
        { date: '2026-03-20', text: 'a', mood: 'positive' },
        { date: '2026-03-21', text: 'b', mood: 'neutral' },
      ])
      const result = importData(data)
      expect(result.success).toBe(true)
      expect(result.imported).toBe(2)
      expect(getAllRecords()).toHaveLength(2)
    })

    it('should skip duplicate dates', () => {
      saveRecord({ date: '2026-03-20', text: 'existing', mood: 'neutral', intensity: 3 })
      const data = JSON.stringify([
        { date: '2026-03-20', text: 'duplicate', mood: 'positive' },
        { date: '2026-03-21', text: 'new', mood: 'positive' },
      ])
      const result = importData(data)
      expect(result.imported).toBe(1)
      expect(result.skipped).toBe(1)
    })

    it('should reject invalid JSON', () => {
      const result = importData('not json')
      expect(result.success).toBe(false)
    })

    it('should reject non-array data', () => {
      const result = importData('{"date": "2026-03-20"}')
      expect(result.success).toBe(false)
    })

    it('should reject records without date', () => {
      const data = JSON.stringify([{ text: 'a', mood: 'positive' }])
      const result = importData(data)
      expect(result.success).toBe(false)
    })

    it('should reject records without mood', () => {
      const data = JSON.stringify([{ date: '2026-03-20', text: 'a' }])
      const result = importData(data)
      expect(result.success).toBe(false)
    })
  })

  describe('clearAllData', () => {
    it('should remove all records', () => {
      saveRecord({ date: '2026-03-20', text: 'a', mood: 'neutral', intensity: 3 })
      clearAllData()
      expect(getAllRecords()).toHaveLength(0)
    })
  })

  describe('getMaxStreak', () => {
    it('should return 0 for empty records', () => {
      expect(getMaxStreak()).toBe(0)
    })

    it('should return 1 for single record', () => {
      saveRecord({ date: '2026-03-20', text: 'a', mood: 'neutral', intensity: 3 })
      expect(getMaxStreak()).toBe(1)
    })

    it('should calculate consecutive streak correctly', () => {
      saveRecord({ date: '2026-03-18', text: 'a', mood: 'neutral', intensity: 3 })
      saveRecord({ date: '2026-03-19', text: 'b', mood: 'positive', intensity: 4 })
      saveRecord({ date: '2026-03-20', text: 'c', mood: 'positive', intensity: 4 })
      saveRecord({ date: '2026-03-22', text: 'd', mood: 'neutral', intensity: 3 })
      expect(getMaxStreak()).toBe(3)
    })

    it('should handle multiple streaks and return longest', () => {
      saveRecord({ date: '2026-03-10', text: 'a', mood: 'neutral', intensity: 3 })
      saveRecord({ date: '2026-03-11', text: 'b', mood: 'neutral', intensity: 3 })
      // gap at 03-12 ~ 03-14
      saveRecord({ date: '2026-03-15', text: 'c', mood: 'positive', intensity: 4 })
      saveRecord({ date: '2026-03-16', text: 'd', mood: 'positive', intensity: 4 })
      saveRecord({ date: '2026-03-17', text: 'e', mood: 'positive', intensity: 4 })
      saveRecord({ date: '2026-03-18', text: 'f', mood: 'positive', intensity: 4 })
      expect(getMaxStreak()).toBe(4)
    })
  })

  describe('getStreakDays edge cases', () => {
    it('should return 0 when no records exist', () => {
      expect(getStreakDays()).toBe(0)
    })

    it('should return 1 for today record only', () => {
      const today = new Date().toISOString().slice(0, 10)
      saveRecord({ date: today, text: 'today', mood: 'positive', intensity: 4 })
      expect(getStreakDays()).toBe(1)
    })

    it('should return 2 for today and yesterday', () => {
      const today = new Date().toISOString().slice(0, 10)
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
      saveRecord({ date: today, text: 'today', mood: 'positive', intensity: 4 })
      saveRecord({ date: yesterday, text: 'yesterday', mood: 'neutral', intensity: 3 })
      expect(getStreakDays()).toBe(2)
    })

    it('should return 0 when latest record is too old', () => {
      saveRecord({ date: '2026-01-01', text: 'old', mood: 'neutral', intensity: 3 })
      expect(getStreakDays()).toBe(0)
    })
  })

  describe('getConsecutiveLowDays', () => {
    it('should return 0 for empty records', () => {
      expect(getConsecutiveLowDays()).toBe(0)
    })

    it('should count consecutive low mood days', () => {
      const today = new Date().toISOString().slice(0, 10)
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
      const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10)
      saveRecord({ date: today, text: 'sad', mood: 'negative', intensity: 2 })
      saveRecord({ date: yesterday, text: 'sadder', mood: 'very_negative', intensity: 1 })
      saveRecord({ date: twoDaysAgo, text: 'ok', mood: 'positive', intensity: 4 })
      expect(getConsecutiveLowDays()).toBe(2)
    })

    it('should stop counting at positive mood', () => {
      const today = new Date().toISOString().slice(0, 10)
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
      saveRecord({ date: today, text: 'sad', mood: 'negative', intensity: 2 })
      saveRecord({ date: yesterday, text: 'happy', mood: 'positive', intensity: 4 })
      expect(getConsecutiveLowDays()).toBe(1)
    })
  })

  describe('getRecentRecords', () => {
    it('should return recent records within specified days', () => {
      const today = new Date().toISOString().slice(0, 10)
      saveRecord({ date: today, text: 'today', mood: 'positive', intensity: 4 })
      const recent = getRecentRecords(7)
      expect(recent.length).toBeGreaterThanOrEqual(1)
    })

    it('should return empty array for no records', () => {
      const recent = getRecentRecords(30)
      expect(recent).toEqual([])
    })
  })
})
