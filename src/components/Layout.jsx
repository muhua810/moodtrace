import { useState, useEffect, useCallback } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Home, PenLine, BarChart3, User, X } from 'lucide-react'
import { setPageReminderCallback } from '../services/reminder'
import { t } from '../i18n'

const navItems = [
  { path: '/', icon: Home, label: t('nav.home'), ariaLabel: t('nav.home') },
  { path: '/record', icon: PenLine, label: t('nav.record'), ariaLabel: t('nav.record') },
  { path: '/stats', icon: BarChart3, label: t('nav.stats'), ariaLabel: t('nav.stats') },
  { path: '/profile', icon: User, label: t('nav.profile'), ariaLabel: t('nav.profile') },
]

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [toast, setToast] = useState(null)

  const showToast = useCallback((message) => {
    setToast(message)
    setTimeout(() => setToast(null), 10000)
  }, [])

  useEffect(() => {
    setPageReminderCallback(showToast)
    return () => setPageReminderCallback(null)
  }, [showToast])

  return (
    <div className="min-h-screen flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-pink-500 focus:text-white focus:rounded-lg"
      >
        {t('layout.skipToContent')}
      </a>

      {toast && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] w-[90%] max-w-md animate-slide-down"
          role="alert"
        >
          <div className="glass rounded-2xl p-4 shadow-lg shadow-pink-500/10">
            <div className="flex items-start gap-3">
              <span className="text-2xl">📝</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-pink-300 mb-1">{t('layout.dailyReminder')}</p>
                <p className="text-sm theme-text-secondary">{toast}</p>
                <button
                  onClick={() => { setToast(null); navigate('/record') }}
                  className="mt-2 text-xs text-pink-400 hover:text-pink-300 transition-colors focus:outline-none focus:ring-2 focus:ring-pink-400/50 rounded"
                >
                  {t('layout.goRecord')}
                </button>
              </div>
              <button
                onClick={() => setToast(null)}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors theme-text-tertiary focus:outline-none focus:ring-2 focus:ring-pink-400/50"
                aria-label={t('layout.closeReminder')}
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      <main id="main-content" className="flex-1 pb-20 overflow-y-auto" role="main">
        <Outlet />
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 glass border-t z-50"
        role="navigation"
        aria-label={t('layout.mainNav')}
      >
        <div className="flex justify-around items-center h-14 sm:h-16 max-w-lg mx-auto px-2">
          {navItems.map(({ path, icon: Icon, label, ariaLabel }) => {
            const isActive = location.pathname === path
            return (
              <NavLink
                key={path}
                to={path}
                aria-label={ariaLabel}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-pink-400/50 ${
                  isActive
                    ? 'text-pink-400 bg-pink-500/10'
                    : 'theme-text-tertiary hover:theme-text-secondary'
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} aria-hidden="true" />
                <span className={`text-xs ${isActive ? 'font-medium' : ''}`}>{label}</span>
              </NavLink>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
