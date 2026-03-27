import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  getReminderSettings,
  saveReminderSettings,
  isNotificationSupported,
  sendReminder,
  startReminderCheck,
  stopReminderCheck,
  setPageReminderCallback,
} from '../services/reminder'

describe('reminder', () => {
  beforeEach(() => {
    localStorage.clear()
    stopReminderCheck()
    setPageReminderCallback(null)
  })

  afterEach(() => {
    stopReminderCheck()
  })

  describe('getReminderSettings / saveReminderSettings', () => {
    it('should return default settings when none saved', () => {
      const settings = getReminderSettings()
      expect(settings.enabled).toBe(false)
      expect(settings.hour).toBe(21)
      expect(settings.minute).toBe(0)
    })

    it('should save and retrieve custom settings', () => {
      const custom = { enabled: true, hour: 9, minute: 30 }
      saveReminderSettings(custom)
      const retrieved = getReminderSettings()
      expect(retrieved).toEqual(custom)
    })
  })

  describe('isNotificationSupported', () => {
    it('should return a boolean', () => {
      const result = isNotificationSupported()
      expect(typeof result).toBe('boolean')
    })
  })

  describe('sendReminder', () => {
    it('should not send if already recorded today', () => {
      const today = new Date().toISOString().slice(0, 10)
      localStorage.setItem('mood_calendar_records', JSON.stringify([
        { date: today, mood: 'positive', text: 'test' }
      ]))

      const callback = vi.fn()
      setPageReminderCallback(callback)

      sendReminder()
      expect(callback).not.toHaveBeenCalled()
    })

    it('should call page reminder callback when notification unavailable', () => {
      // Ensure no record today
      localStorage.setItem('mood_calendar_records', '[]')

      const callback = vi.fn()
      setPageReminderCallback(callback)

      sendReminder()
      expect(callback).toHaveBeenCalled()
      expect(typeof callback.mock.calls[0][0]).toBe('string')
    })
  })

  describe('startReminderCheck / stopReminderCheck', () => {
    it('should start and stop without errors', () => {
      expect(() => startReminderCheck()).not.toThrow()
      expect(() => stopReminderCheck()).not.toThrow()
    })

    it('should be safe to stop when not started', () => {
      expect(() => stopReminderCheck()).not.toThrow()
    })
  })
})
