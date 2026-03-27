import { useNavigate } from 'react-router-dom'
import { Home } from 'lucide-react'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-2xl font-bold theme-text mb-2">页面走丢了</h1>
        <p className="text-sm theme-text-secondary mb-6">
          你要找的页面不存在或已被移除
        </p>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white font-medium text-sm transition-all active:scale-95"
        >
          <Home size={16} />
          回到首页
        </button>
      </div>
    </div>
  )
}
