import { Component } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { t } from '../i18n'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null, retryCount: 0 }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
    this.setState({ errorInfo })
    // 可在此上报错误到监控服务
  }

  handleReset = () => {
    this.setState(prev => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prev.retryCount + 1,
    }))
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development'

      return (
        <div className="min-h-screen flex items-center justify-center px-4 theme-bg">
          <div className="glass rounded-2xl p-8 max-w-md w-full text-center animate-fade-in-up">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} className="text-red-400" />
            </div>
            <h2 className="text-lg font-semibold theme-text mb-2">{t('error.title')}</h2>
            <p className="text-sm theme-text-secondary mb-4">
              {t('error.desc')}
            </p>

            {/* 开发环境显示错误详情 */}
            {isDev && this.state.error && (
              <details className="mb-4 text-left">
                <summary className="text-xs theme-text-tertiary cursor-pointer hover:theme-text-secondary">
                  {t('error.details')}
                </summary>
                <pre className="mt-2 p-3 rounded-lg bg-black/30 text-xs text-red-300 overflow-auto max-h-32 whitespace-pre-wrap">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="space-y-2">
              <button
                onClick={this.handleReset}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-pink-500 hover:bg-pink-400 text-white font-medium transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-pink-400/50"
              >
                <RefreshCw size={16} />
                {t('error.retry')}
              </button>
              <button
                onClick={this.handleGoHome}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl glass theme-text-secondary hover:theme-text transition-colors text-sm focus:outline-none focus:ring-2 focus:ring-pink-400/50"
              >
                <Home size={16} />
                {t('error.goHome')}
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full py-2 rounded-xl theme-text-muted hover:theme-text-secondary transition-colors text-xs focus:outline-none"
              >
                {t('error.refresh')}
              </button>
            </div>

            {this.state.retryCount >= 3 && (
              <p className="text-xs text-yellow-400/70 mt-4">
                {t('error.persistent')}
              </p>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
