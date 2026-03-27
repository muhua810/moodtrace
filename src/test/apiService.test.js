import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getApiBase,
  setApiBase,
  isAnonymousSubmitEnabled,
  setAnonymousSubmitEnabled,
  submitMoodStat,
  fetchMoodSummary,
  checkApiHealth,
} from '../services/apiService'

describe('apiService', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  describe('getApiBase / setApiBase', () => {
    it('should return default URL when not set', () => {
      const url = getApiBase()
      expect(url).toContain('workers.dev')
    })

    it('should return custom URL when set', () => {
      setApiBase('https://my-api.example.com')
      expect(getApiBase()).toBe('https://my-api.example.com')
    })
  })

  describe('anonymousSubmit toggle', () => {
    it('should default to false', () => {
      expect(isAnonymousSubmitEnabled()).toBe(false)
    })

    it('should toggle on', () => {
      setAnonymousSubmitEnabled(true)
      expect(isAnonymousSubmitEnabled()).toBe(true)
    })

    it('should toggle off', () => {
      setAnonymousSubmitEnabled(true)
      setAnonymousSubmitEnabled(false)
      expect(isAnonymousSubmitEnabled()).toBe(false)
    })
  })

  describe('submitMoodStat', () => {
    it('should not submit when anonymous is disabled', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch')
      const result = await submitMoodStat({ mood: 'positive', date: '2026-03-20' })
      expect(result).toBe(false)
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('should submit when anonymous is enabled', async () => {
      setAnonymousSubmitEnabled(true)
      setApiBase('https://test.example.com')

      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })

      const result = await submitMoodStat({ mood: 'positive', date: '2026-03-20' })
      expect(result).toBe(true)
    })

    it('should return false on fetch failure', async () => {
      setAnonymousSubmitEnabled(true)
      setApiBase('https://test.example.com')

      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'))

      const result = await submitMoodStat({ mood: 'positive', date: '2026-03-20' })
      expect(result).toBe(false)
    })
  })

  describe('fetchMoodSummary', () => {
    it('should return null on fetch failure', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'))
      const result = await fetchMoodSummary('2026-03')
      expect(result).toBeNull()
    })

    it('should return data on success', async () => {
      setApiBase('https://test.example.com')
      const mockData = { month: '2026-03', total: 100, moods: {} }

      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => mockData,
      })

      const result = await fetchMoodSummary('2026-03')
      expect(result).toEqual(mockData)
    })
  })

  describe('checkApiHealth', () => {
    it('should return true when API is healthy', async () => {
      setApiBase('https://test.example.com')
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ok' }),
      })

      const result = await checkApiHealth()
      expect(result).toBe(true)
    })

    it('should return false on network error', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('error'))
      const result = await checkApiHealth()
      expect(result).toBe(false)
    })
  })
})
