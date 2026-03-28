import { Component } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { t } from '../i18n'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center px-4 theme-bg">
          <div className="glass rounded-2xl p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} className="text-red-400" />
            </div>
            <h2 className="text-lg font-semibold theme-text mb-2">{t('error.title')}</h2>
            <p className="text-sm theme-text-secondary mb-6">
              {t('error.desc')}
            </p>
            <div className="space-y-2">
              <button
                onClick={this.handleReset}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-pink-500 hover:bg-pink-400 text-white font-medium transition-all"
              >
                <RefreshCw size={16} />
                {t('error.retry')}
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full py-3 rounded-xl glass theme-text-secondary hover:theme-text transition-colors text-sm"
              >
                {t('error.refresh')}
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
