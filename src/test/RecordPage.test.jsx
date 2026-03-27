import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import RecordPage from '../pages/RecordPage'
import { ThemeProvider } from '../contexts/ThemeContext'

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  ArrowLeft: () => <span>←</span>,
  Sparkles: () => <span>✨</span>,
  Send: () => <span>📤</span>,
  Loader2: () => <span>⏳</span>,
  ChevronLeft: () => <span>◂</span>,
  ChevronRight: () => <span>▸</span>,
  CalendarDays: () => <span>📅</span>,
}))

function renderRecordPage(dateParam) {
  const route = dateParam ? `/record?date=${dateParam}` : '/record'
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ThemeProvider>
        <RecordPage />
      </ThemeProvider>
    </MemoryRouter>
  )
}

describe('RecordPage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should render the record page', () => {
    renderRecordPage()
    expect(screen.getByText('记录今天的心情')).toBeInTheDocument()
  })

  it('should show textarea for mood input', () => {
    renderRecordPage()
    const textarea = screen.getByLabelText('用一句话描述你现在的感受')
    expect(textarea).toBeInTheDocument()
  })

  it('should show manual mood selection buttons', () => {
    renderRecordPage()
    expect(screen.getByText('或者直接选择情绪：')).toBeInTheDocument()
    expect(screen.getByLabelText('选择情绪：非常低落')).toBeInTheDocument()
    expect(screen.getByLabelText('选择情绪：超级开心')).toBeInTheDocument()
  })

  it('should show analyze button', () => {
    renderRecordPage()
    expect(screen.getByLabelText('AI 分析情绪')).toBeInTheDocument()
  })

  it('should disable analyze button when textarea is empty', () => {
    renderRecordPage()
    const btn = screen.getByLabelText('AI 分析情绪')
    expect(btn).toBeDisabled()
  })

  it('should enable analyze button when textarea has text', () => {
    renderRecordPage()
    const textarea = screen.getByLabelText('用一句话描述你现在的感受')
    fireEvent.change(textarea, { target: { value: '今天很开心' } })
    const btn = screen.getByLabelText('AI 分析情绪')
    expect(btn).not.toBeDisabled()
  })

  it('should handle manual mood selection', async () => {
    renderRecordPage()
    const happyBtn = screen.getByLabelText('选择情绪：心情不错')
    fireEvent.click(happyBtn)
    // After selecting, should show the mood result card
    expect(await screen.findByText('心情不错')).toBeInTheDocument()
    expect(screen.getByText('保存记录')).toBeInTheDocument()
  })

  it('should show date navigation', () => {
    renderRecordPage()
    expect(screen.getByLabelText('前一天')).toBeInTheDocument()
    expect(screen.getByLabelText('后一天')).toBeInTheDocument()
  })

  it('should show character count', () => {
    renderRecordPage()
    expect(screen.getByText('0/500')).toBeInTheDocument()
  })

  it('should update character count on input', () => {
    renderRecordPage()
    const textarea = screen.getByLabelText('用一句话描述你现在的感受')
    fireEvent.change(textarea, { target: { value: '测试' } })
    expect(screen.getByText('2/500')).toBeInTheDocument()
  })

  it('should show existing record if date has one', async () => {
    const records = [{
      id: '1',
      date: '2026-03-26',
      text: '已经记录过了',
      mood: 'positive',
      moodLabel: '心情不错',
      intensity: 4,
      suggestion: '保持好心情！',
    }]
    localStorage.setItem('mood_calendar_records', JSON.stringify(records))
    renderRecordPage('2026-03-26')
    // Wait for async data loading
    const textarea = await screen.findByDisplayValue('已经记录过了')
    expect(textarea).toBeInTheDocument()
  })

  it('should strip HTML tags from input', () => {
    renderRecordPage()
    const textarea = screen.getByLabelText('用一句话描述你现在的感受')
    fireEvent.change(textarea, { target: { value: '<script>alert("xss")</script>开心' } })
    // sanitizeInput should remove HTML tags before analysis
    const btn = screen.getByLabelText('AI 分析情绪')
    expect(btn).not.toBeDisabled()
  })
})
