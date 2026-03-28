import { useNavigate } from 'react-router-dom'
import { Home } from 'lucide-react'
import { t } from '../i18n'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-2xl font-bold theme-text mb-2">{t('notfound.title')}</h1>
        <p className="text-sm theme-text-secondary mb-6">
          {t('notfound.desc')}
        </p>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white font-medium text-sm transition-all active:scale-95"
        >
          <Home size={16} />
          {t('notfound.home')}
        </button>
      </div>
    </div>
  )
}
