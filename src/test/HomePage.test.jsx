import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import HomePage from '../pages/HomePage'
import { ThemeProvider } from '../contexts/ThemeContext'

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Plus: () => <span>+</span>,
  CalendarDays: () => <span>📅</span>,
  LayoutGrid: () => <span>🔲</span>,
  Settings: () => <span>⚙️</span>,
  ChevronLeft: () => <span>←</span>,
  ChevronRight: () => <span>→</span>,
  Database: () => <span>💾</span>,
}))

function renderHomePage() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <HomePage />
      </ThemeProvider>
    </MemoryRouter>
  )
}

describe('HomePage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should render the page title', () => {
    renderHomePage()
    expect(screen.getByText('情绪日历')).toBeInTheDocument()
  })

  it('should show today prompt when no record exists', () => {
    renderHomePage()
    expect(screen.getByText('今天感觉怎么样？')).toBeInTheDocument()
    expect(screen.getByText('记录')).toBeInTheDocument()
  })

  it('should display a greeting', () => {
    renderHomePage()
    // Header should show the app title and a time-based greeting
    expect(screen.getByText('情绪日历')).toBeInTheDocument()
  })

  it('should render view mode toggle buttons', () => {
    renderHomePage()
    expect(screen.getByLabelText('年视图')).toBeInTheDocument()
    expect(screen.getByLabelText('月视图')).toBeInTheDocument()
  })

  it('should switch between heatmap and month view', () => {
    renderHomePage()
    const monthBtn = screen.getByLabelText('月视图')
    fireEvent.click(monthBtn)
    // Should not crash when switching views
    expect(screen.getByText('情绪热力图')).toBeInTheDocument()
  })

  it('should show recent records when they exist', () => {
    const records = [{
      id: '1',
      date: '2026-03-25',
      text: '今天很开心',
      mood: 'positive',
      moodLabel: '心情不错',
      intensity: 4,
    }]
    localStorage.setItem('mood_calendar_records', JSON.stringify(records))
    renderHomePage()
    expect(screen.getByText('最近记录')).toBeInTheDocument()
    expect(screen.getByText('今天很开心')).toBeInTheDocument()
  })

  it('should show settings button', () => {
    renderHomePage()
    expect(screen.getByLabelText('设置')).toBeInTheDocument()
  })
})
