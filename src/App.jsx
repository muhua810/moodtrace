import { useState, Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import Onboarding from './components/Onboarding'

// 路由懒加载 — 首屏只加载 HomePage，其余按需加载
const HomePage = lazy(() => import('./pages/HomePage'))
const RecordPage = lazy(() => import('./pages/RecordPage'))
const StatsPage = lazy(() => import('./pages/StatsPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const NotFound = lazy(() => import('./pages/NotFound'))

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse-soft text-center">
        <div className="text-3xl mb-3">🎭</div>
        <p className="text-sm theme-text-tertiary">加载中...</p>
      </div>
    </div>
  )
}

export default function App() {
  const [onboarded, setOnboarded] = useState(
    () => localStorage.getItem('mood_calendar_onboarded') === 'true'
  )

  if (!onboarded) {
    return <Onboarding onComplete={() => setOnboarded(true)} />
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/record" element={<RecordPage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}
