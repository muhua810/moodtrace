import { useState } from 'react'
import { PenLine, Sparkles, BarChart3, Shield, ChevronRight, Database } from 'lucide-react'
import { generateDemoData } from '../services/demoData'
import { saveRecord } from '../services/storage'
import { t } from '../i18n'

function getSteps() {
  return [
    {
      icon: PenLine,
      iconColor: 'text-pink-400',
      iconBg: 'bg-pink-400/20',
      title: t('onboard.step1Title'),
      desc: t('onboard.step1Desc'),
      example: t('onboard.step1Example'),
    },
    {
      icon: Sparkles,
      iconColor: 'text-purple-400',
      iconBg: 'bg-purple-400/20',
      title: t('onboard.step2Title'),
      desc: t('onboard.step2Desc'),
      example: null,
    },
    {
      icon: BarChart3,
      iconColor: 'text-green-400',
      iconBg: 'bg-green-400/20',
      title: t('onboard.step3Title'),
      desc: t('onboard.step3Desc'),
      example: null,
    },
    {
      icon: Shield,
      iconColor: 'text-blue-400',
      iconBg: 'bg-blue-400/20',
      title: t('onboard.step4Title'),
      desc: t('onboard.step4Desc'),
      example: null,
    },
  ]
}

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0)
  const [importing, setImporting] = useState(false)
  const steps = getSteps()
  const current = steps[step]
  const isLast = step === steps.length - 1
  const Icon = current.icon

  const handleComplete = (withDemo = false) => {
    localStorage.setItem('mood_calendar_onboarded', 'true')
    localStorage.setItem('mood_calendar_show_guide', 'true')

    if (withDemo) {
      setImporting(true)
      requestAnimationFrame(() => {
        setTimeout(() => {
          const demoRecords = generateDemoData(365)
          for (const record of demoRecords) {
            saveRecord(record)
          }
          window.dispatchEvent(new Event('mood-record-updated'))
          onComplete()
        }, 100)
      })
    } else {
      onComplete()
    }
  }

  const handleNext = () => {
    if (isLast) {
      handleComplete(false)
    } else {
      setStep(step + 1)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 theme-bg">
      <div className="max-w-sm w-full text-center animate-fade-in">
        <h1 className="text-2xl font-bold gradient-text mb-10">{t('onboard.brand')}</h1>

        <div className={`w-20 h-20 rounded-3xl ${current.iconBg} flex items-center justify-center mx-auto mb-6`}>
          <Icon size={36} className={current.iconColor} />
        </div>

        <h2 className="text-xl font-semibold theme-text mb-3">{current.title}</h2>
        <p className="theme-text-secondary text-sm leading-relaxed mb-4">{current.desc}</p>

        {current.example && (
          <p className="theme-text-tertiary text-xs italic bg-white/5 rounded-lg px-4 py-2 inline-block">
            {current.example}
          </p>
        )}

        <div className="flex items-center justify-center gap-2 mt-8 mb-8">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? 'w-6 bg-pink-400' : 'w-1.5 bg-slate-600'
              }`}
            />
          ))}
        </div>

        {isLast ? (
          <div className="space-y-3">
            <button
              onClick={() => handleComplete(true)}
              disabled={importing}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white font-medium transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-pink-400/50 disabled:opacity-50"
            >
              <Database size={18} />
              {importing ? t('onboard.importing') : t('onboard.importDemo')}
            </button>
            <button
              onClick={() => handleComplete(false)}
              disabled={importing}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 hover:bg-white/10 theme-text-secondary text-sm font-medium transition-all active:scale-[0.98] focus:outline-none disabled:opacity-50"
            >
              {t('onboard.startFresh')}
              <ChevronRight size={16} />
            </button>
            <p className="text-xs theme-text-tertiary mt-2">
              {t('onboard.demoHint')}
            </p>
          </div>
        ) : (
          <>
            <button
              onClick={handleNext}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white font-medium transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-pink-400/50"
            >
              {t('onboard.next')}
              <ChevronRight size={18} />
            </button>
            <button
              onClick={() => handleComplete(false)}
              className="mt-3 text-sm theme-text-muted hover:theme-text-secondary transition-colors focus:outline-none"
            >
              {t('onboard.skip')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
