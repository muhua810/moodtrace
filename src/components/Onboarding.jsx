import { useState } from 'react'
import { PenLine, Sparkles, BarChart3, Shield, ChevronRight } from 'lucide-react'

const steps = [
  {
    icon: PenLine,
    iconColor: 'text-pink-400',
    iconBg: 'bg-pink-400/20',
    title: '每天一句话',
    desc: '用一句话描述你的感受，不需要长篇大论，轻松记录心情。',
    example: '"今天考试通过了，超级开心！"',
  },
  {
    icon: Sparkles,
    iconColor: 'text-purple-400',
    iconBg: 'bg-purple-400/20',
    title: 'AI 自动分析',
    desc: 'AI 自动识别你的情绪类型和强度，你也可以手动选择。',
    example: null,
  },
  {
    icon: BarChart3,
    iconColor: 'text-green-400',
    iconBg: 'bg-green-400/20',
    title: '可视化洞察',
    desc: '情绪热力图和统计图表帮你发现情绪规律，更好地了解自己。',
    example: null,
  },
  {
    icon: Shield,
    iconColor: 'text-blue-400',
    iconBg: 'bg-blue-400/20',
    title: '隐私优先',
    desc: '所有情绪数据只存在你的设备本地，可选加密存储。匿名群体统计可随时关闭。',
    example: null,
  },
]

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0)
  const current = steps[step]
  const isLast = step === steps.length - 1
  const Icon = current.icon

  const handleNext = () => {
    if (isLast) {
      localStorage.setItem('mood_calendar_onboarded', 'true')
      onComplete()
    } else {
      setStep(step + 1)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 theme-bg">
      <div className="max-w-sm w-full text-center animate-fade-in">
        {/* Logo */}
        <h1 className="text-2xl font-bold gradient-text mb-10">情绪日历</h1>

        {/* Icon */}
        <div className={`w-20 h-20 rounded-3xl ${current.iconBg} flex items-center justify-center mx-auto mb-6`}>
          <Icon size={36} className={current.iconColor} />
        </div>

        {/* Content */}
        <h2 className="text-xl font-semibold theme-text mb-3">{current.title}</h2>
        <p className="theme-text-secondary text-sm leading-relaxed mb-4">{current.desc}</p>

        {current.example && (
          <p className="theme-text-tertiary text-xs italic bg-white/5 rounded-lg px-4 py-2 inline-block">
            {current.example}
          </p>
        )}

        {/* Dots */}
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

        {/* Button */}
        <button
          onClick={handleNext}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white font-medium transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-pink-400/50"
        >
          {isLast ? '开始使用' : '下一步'}
          <ChevronRight size={18} />
        </button>

        {!isLast && (
          <button
            onClick={() => { localStorage.setItem('mood_calendar_onboarded', 'true'); onComplete() }}
            className="mt-3 text-sm theme-text-muted hover:theme-text-secondary transition-colors focus:outline-none"
          >
            跳过引导
          </button>
        )}
      </div>
    </div>
  )
}
