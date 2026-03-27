import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Key, Database, Trash2, Info, Heart, Shield, ExternalLink, Upload, Bell, Sun, Moon, Lock, X, Cloud, CloudUpload, CloudDownload, Copy } from 'lucide-react'
import { getDisplayDeviceId, uploadBackup, downloadBackup } from '../services/backupService'
import { exportData, importData, clearAllData, isEncryptionEnabled, enableEncryption, setEncryptionEnabled, saveRecordAsync } from '../services/storage'
import { getReminderSettings, saveReminderSettings, requestNotificationPermission, startReminderCheck, stopReminderCheck, isNotificationSupported } from '../services/reminder'
import { useTheme } from '../contexts/ThemeContext'
import { isAnonymousSubmitEnabled, setAnonymousSubmitEnabled, getApiBase, setApiBase } from '../services/apiService'
import { secureKeyGet, secureKeySet } from '../utils/crypto'

// ── 自定义确认弹窗 ──
function ConfirmModal({ title, message, confirmText = '确定', cancelText = '取消', danger = false, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onCancel}>
      <div className="glass rounded-2xl p-5 max-w-sm w-full shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold theme-text">{title}</h3>
          <button onClick={onCancel} className="p-1 rounded-lg hover:bg-white/10 theme-text-tertiary" aria-label="关闭">
            <X size={16} />
          </button>
        </div>
        <p className="text-sm theme-text-secondary mb-5">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-medium theme-text-secondary transition-colors">
            {cancelText}
          </button>
          <button onClick={onConfirm} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-[0.98] ${
            danger ? 'bg-red-500 hover:bg-red-400 text-white' : 'bg-pink-500 hover:bg-pink-400 text-white'
          }`}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Toast 提示 ──
function Toast({ message, type = 'success', onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  const styles = {
    success: 'bg-green-500/10 border-green-500/20 text-green-300',
    error: 'bg-red-500/10 border-red-500/20 text-red-300',
    info: 'bg-blue-500/10 border-blue-500/20 text-blue-300',
  }

  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl border text-sm animate-slide-down ${styles[type] || styles.info}`} role="alert">
      {message}
    </div>
  )
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const fileInputRef = useRef(null)
  const [apiKey, setApiKey] = useState('')
  const [apiUrl, setApiUrl] = useState('')
  const [model, setModel] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [saved, setSaved] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [reminder, setReminder] = useState(getReminderSettings())
  const [anonymousSubmit, setAnonymousSubmit] = useState(isAnonymousSubmitEnabled())
  const [encryptionOn, setEncryptionOn] = useState(isEncryptionEnabled())
  const [encMigrating, setEncMigrating] = useState(false)
  const [notifStatus, setNotifStatus] = useState(
    'Notification' in window ? Notification.permission : 'unsupported'
  )
  const [confirmConfig, setConfirmConfig] = useState(null)
  const [toast, setToast] = useState(null)
  const [backupLoading, setBackupLoading] = useState(false)
  const [deviceId] = useState(() => getDisplayDeviceId())
  const [copied, setCopied] = useState(false)

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, key: Date.now() })
  }, [])
  const dismissToast = useCallback(() => setToast(null), [])

  useEffect(() => {
    // 使用加密存储读取 API 配置
    ;(async () => {
      setApiKey(await secureKeyGet('ai_api_key') || '')
      setApiUrl(await secureKeyGet('ai_api_url') || '')
      setModel(await secureKeyGet('ai_model') || '')
    })()

    if (reminder.enabled) {
      startReminderCheck()
    }
    return () => stopReminderCheck()
  }, [])

  const handleSaveSettings = async () => {
    await secureKeySet('ai_api_key', apiKey || null)
    await secureKeySet('ai_api_url', apiUrl || null)
    await secureKeySet('ai_model', model || null)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleClearData = () => {
    setConfirmConfig({
      title: '清除所有数据',
      message: '确定要清除所有情绪记录吗？此操作不可恢复。',
      confirmText: '确认清除',
      danger: true,
      onConfirm: () => {
        clearAllData()
        setConfirmConfig(null)
        showToast('已清除所有记录')
        setTimeout(() => navigate('/'), 1000)
      },
      onCancel: () => setConfirmConfig(null),
    })
  }

  const handleExportData = async () => {
    try {
      await exportData()
      showToast('数据导出成功')
    } catch (e) {
      showToast('导出失败：' + e.message, 'error')
    }
  }

  const handleToggleReminder = async () => {
    if (!reminder.enabled) {
      if (isNotificationSupported()) {
        const perm = await requestNotificationPermission()
        setNotifStatus(perm)
      }
    }

    const newSettings = { ...reminder, enabled: !reminder.enabled }
    setReminder(newSettings)
    saveReminderSettings(newSettings)

    if (newSettings.enabled) {
      startReminderCheck()
    } else {
      stopReminderCheck()
    }
  }

  const handleReminderTimeChange = (field, value) => {
    const newSettings = { ...reminder, [field]: parseInt(value, 10) }
    setReminder(newSettings)
    saveReminderSettings(newSettings)
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target.result
      const result = importData(content)
      setImportResult(result)
      setTimeout(() => setImportResult(null), 5000)
    }
    reader.onerror = () => {
      setImportResult({ success: false, error: '读取文件失败' })
      setTimeout(() => setImportResult(null), 3000)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const notifSupported = isNotificationSupported()

  const handleUploadBackup = async () => {
    setBackupLoading(true)
    const result = await uploadBackup()
    setBackupLoading(false)
    if (result.success) {
      showToast(`备份成功！已上传 ${result.count} 条记录`)
    } else {
      showToast(result.error || '备份失败', 'error')
    }
  }

  const handleDownloadBackup = () => {
    setConfirmConfig({
      title: '从云端恢复',
      message: '恢复将与本地数据合并（已有日期不覆盖）。确定继续？',
      confirmText: '确认恢复',
      danger: false,
      onConfirm: async () => {
        setConfirmConfig(null)
        setBackupLoading(true)
        const result = await downloadBackup()
        setBackupLoading(false)
        if (result.success && result.data) {
          let imported = 0
          for (const record of result.data) {
            if (record?.date && record?.mood) {
              await saveRecordAsync(record)
              imported++
            }
          }
          showToast(`恢复成功！已同步 ${imported} 条记录`)
          window.dispatchEvent(new Event('mood-record-updated'))
        } else {
          showToast(result.error || '恢复失败', 'error')
        }
      },
      onCancel: () => setConfirmConfig(null),
    })
  }

  const handleCopyDeviceId = () => {
    navigator.clipboard.writeText(deviceId).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleToggleEncryption = async () => {
    if (!encryptionOn) {
      setEncMigrating(true)
      const result = await enableEncryption()
      setEncMigrating(false)
      if (result.success) {
        setEncryptionOn(true)
      }
    } else {
      setEncryptionEnabled(false)
      setEncryptionOn(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-4 pb-6 animate-fade-in-up" role="main">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-pink-400/50"
          aria-label="返回"
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <h1 className="text-lg font-semibold theme-text">设置</h1>
      </div>

      {/* 主题切换 */}
      <section className="glass rounded-2xl p-4 mb-4" aria-label="外观设置">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {theme === 'dark' ? (
              <Moon size={16} className="text-purple-400" aria-hidden="true" />
            ) : (
              <Sun size={16} className="text-yellow-500" aria-hidden="true" />
            )}
            <span className="text-sm font-medium theme-text">外观模式</span>
          </div>
          <button
            onClick={toggleTheme}
            className="relative w-14 h-7 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-pink-400/50 bg-slate-700"
            role="switch"
            aria-checked={theme === 'dark'}
            aria-label="切换深色/浅色模式"
          >
            <span
              className={`absolute top-0.5 flex items-center justify-center w-6 h-6 rounded-full transition-all duration-300 ${
                theme === 'dark'
                  ? 'translate-x-7 bg-purple-500'
                  : 'translate-x-0.5 bg-yellow-400'
              }`}
            >
              {theme === 'dark' ? (
                <Moon size={12} className="text-white" aria-hidden="true" />
              ) : (
                <Sun size={12} className="text-white" aria-hidden="true" />
              )}
            </span>
          </button>
        </div>
      </section>

      {/* AI 设置 */}
      <section className="glass rounded-2xl p-4 mb-4" aria-label="AI 分析设置">
        <div className="flex items-center gap-2 mb-4">
          <Key size={16} className="text-pink-400" aria-hidden="true" />
          <h2 className="text-sm font-medium theme-text">AI 分析设置</h2>
        </div>
        <p className="text-xs theme-text-tertiary mb-4">
          配置 OpenAI 兼容 API 后，可以使用 AI 进行更精准的情绪分析。
          不配置也可以使用本地关键词分析。
        </p>
        <div className="mb-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-300/90 text-xs">
          🔒 安全提示：API Key 仅存储在本地浏览器中，不会上传至任何服务器。
          为安全起见，建议使用有限额的子密钥，避免使用账户主密钥。
          清除浏览器数据将同时清除 Key。
        </div>

        <div className="space-y-3">
          <div>
            <label htmlFor="api-key" className="text-xs theme-text-secondary block mb-1">API Key</label>
            <div className="flex gap-2">
              <input
                id="api-key"
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="sk-..."
                autoComplete="off"
                className="flex-1 theme-input rounded-lg px-3 py-2 text-sm outline-none focus:border-pink-400 transition-colors"
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="px-3 py-2 text-xs theme-text-tertiary hover:theme-text-secondary focus:outline-none focus:ring-2 focus:ring-pink-400/50 rounded-lg"
                aria-label={showApiKey ? '隐藏 API Key' : '显示 API Key'}
              >
                {showApiKey ? '隐藏' : '显示'}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="api-url" className="text-xs theme-text-secondary block mb-1">API URL（可选）</label>
            <input
              id="api-url"
              type="text"
              value={apiUrl}
              onChange={e => setApiUrl(e.target.value)}
              placeholder="https://api.openai.com/v1/chat/completions"
              className="w-full theme-input rounded-lg px-3 py-2 text-sm outline-none focus:border-pink-400 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="ai-model" className="text-xs theme-text-secondary block mb-1">模型名称（可选）</label>
            <input
              id="ai-model"
              type="text"
              value={model}
              onChange={e => setModel(e.target.value)}
              placeholder="gpt-3.5-turbo"
              className="w-full theme-input rounded-lg px-3 py-2 text-sm outline-none focus:border-pink-400 transition-colors"
            />
          </div>

          <button
            onClick={handleSaveSettings}
            className="w-full py-2.5 rounded-xl bg-pink-500 hover:bg-pink-400 text-white text-sm font-medium transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-pink-400/50"
          >
            {saved ? '✓ 已保存' : '保存设置'}
          </button>
        </div>
      </section>

      {/* 数据管理 */}
      <section className="glass rounded-2xl p-4 mb-4" aria-label="数据管理">
        <div className="flex items-center gap-2 mb-4">
          <Database size={16} className="text-green-400" aria-hidden="true" />
          <h2 className="text-sm font-medium theme-text">数据管理</h2>
        </div>

        {importResult && (
          <div
            role="alert"
            className={`mb-3 p-3 rounded-xl text-sm ${
              importResult.success
                ? 'bg-green-500/10 border border-green-500/20 text-green-300'
                : 'bg-red-500/10 border border-red-500/20 text-red-300'
            }`}
          >
            {importResult.success
              ? `导入成功！新增 ${importResult.imported} 条记录${importResult.skipped > 0 ? `，跳过 ${importResult.skipped} 条重复记录` : ''}`
              : `导入失败：${importResult.error}`}
          </div>
        )}

        <div className="space-y-2">
          <button
            onClick={handleExportData}
            className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors focus:outline-none focus:ring-2 focus:ring-pink-400/50"
          >
            <span className="text-sm theme-text">导出数据</span>
            <ExternalLink size={14} className="theme-text-tertiary" aria-hidden="true" />
          </button>

          <button
            onClick={handleImportClick}
            className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors focus:outline-none focus:ring-2 focus:ring-pink-400/50"
          >
            <span className="text-sm theme-text">导入数据</span>
            <Upload size={14} className="theme-text-tertiary" aria-hidden="true" />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
            aria-label="选择要导入的 JSON 文件"
          />

          <button
            onClick={handleClearData}
            className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-red-500/10 transition-colors text-red-400 focus:outline-none focus:ring-2 focus:ring-red-400/50"
          >
            <span className="text-sm">清除所有数据</span>
            <Trash2 size={14} aria-hidden="true" />
          </button>
        </div>
      </section>

      {/* 云端备份 */}
      <section className="glass rounded-2xl p-4 mb-4" aria-label="云端备份">
        <div className="flex items-center gap-2 mb-4">
          <Cloud size={16} className="text-sky-400" aria-hidden="true" />
          <h2 className="text-sm font-medium theme-text">云端备份</h2>
        </div>
        <p className="text-xs theme-text-tertiary mb-3">
          无需注册，一键备份到云端。换设备时输入设备 ID 即可恢复数据。
        </p>

        {/* 设备 ID */}
        <div className="mb-3 p-3 rounded-xl bg-white/5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs theme-text-tertiary">你的设备 ID</span>
            <button
              onClick={handleCopyDeviceId}
              className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition-colors"
              aria-label="复制设备 ID"
            >
              <Copy size={12} /> {copied ? '已复制' : '复制'}
            </button>
          </div>
          <p className="text-sm font-mono theme-text tracking-wider">{deviceId}</p>
          <p className="text-[10px] theme-text-muted mt-1">保存此 ID，换设备时可用于恢复数据</p>
        </div>

        <div className="space-y-2">
          <button
            onClick={handleUploadBackup}
            disabled={backupLoading}
            className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400/50 disabled:opacity-50"
          >
            <div className="flex items-center gap-2">
              <CloudUpload size={14} className="text-sky-400" aria-hidden="true" />
              <span className="text-sm theme-text">{backupLoading ? '备份中...' : '上传备份到云端'}</span>
            </div>
          </button>

          <button
            onClick={handleDownloadBackup}
            disabled={backupLoading}
            className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400/50 disabled:opacity-50"
          >
            <div className="flex items-center gap-2">
              <CloudDownload size={14} className="text-sky-400" aria-hidden="true" />
              <span className="text-sm theme-text">{backupLoading ? '恢复中...' : '从云端恢复数据'}</span>
            </div>
          </button>
        </div>
      </section>

      {/* 每日提醒 */}
      <section className="glass rounded-2xl p-4 mb-4" aria-label="每日提醒">
        <div className="flex items-center gap-2 mb-4">
          <Bell size={16} className="text-yellow-400" aria-hidden="true" />
          <h2 className="text-sm font-medium theme-text">每日提醒</h2>
        </div>
        <p className="text-xs theme-text-tertiary mb-4">
          设置每日提醒，帮助你养成记录心情的习惯。
          {!notifSupported && ' 当前浏览器不支持系统通知，将使用页面内提醒。'}
        </p>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm theme-text">开启提醒</span>
            <button
              onClick={handleToggleReminder}
              className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-pink-400/50 ${
                reminder.enabled ? 'bg-pink-500' : 'bg-slate-700'
              }`}
              role="switch"
              aria-checked={reminder.enabled}
              aria-label="开启每日提醒"
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  reminder.enabled ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>

          {reminder.enabled && (
            <div className="flex items-center gap-2">
              <label htmlFor="reminder-hour" className="text-sm theme-text-secondary">提醒时间</label>
              <select
                id="reminder-hour"
                value={reminder.hour}
                onChange={e => handleReminderTimeChange('hour', e.target.value)}
                className="theme-input rounded-lg px-2 py-1.5 text-sm outline-none focus:border-pink-400"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
                ))}
              </select>
              <span className="theme-text-tertiary">:</span>
              <select
                id="reminder-minute"
                value={reminder.minute}
                onChange={e => handleReminderTimeChange('minute', e.target.value)}
                className="theme-input rounded-lg px-2 py-1.5 text-sm outline-none focus:border-pink-400"
              >
                {[0, 15, 30, 45].map(m => (
                  <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                ))}
              </select>
            </div>
          )}

          {notifStatus === 'denied' && (
            <p className="text-xs text-yellow-400/80">
              通知权限已拒绝，将使用页面内提醒代替。
            </p>
          )}
        </div>
      </section>


      {/* 数据加密 */}
      <section className="glass rounded-2xl p-4 mb-4" aria-label="数据加密">
        <div className="flex items-center gap-2 mb-3">
          <Lock size={16} className="text-emerald-400" aria-hidden="true" />
          <h2 className="text-sm font-medium theme-text">本地数据加密</h2>
        </div>
        <p className="text-xs theme-text-tertiary mb-3">
          启用后，使用 AES-256-GCM 对本地存储的情绪记录进行加密，
          即使他人打开浏览器开发者工具也无法直接读取明文数据。
        </p>
        <div className="flex items-center justify-between">
          <span className="text-sm theme-text">{encMigrating ? '正在加密...' : '启用加密存储'}</span>
          <button
            onClick={handleToggleEncryption}
            disabled={encMigrating}
            className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-pink-400/50 disabled:opacity-50 ${
              encryptionOn ? 'bg-emerald-500' : 'bg-slate-700'
            }`}
            role="switch"
            aria-checked={encryptionOn}
            aria-label="启用数据加密"
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                encryptionOn ? 'translate-x-5' : ''
              }`}
            />
          </button>
        </div>
      </section>

      {/* 匿名统计 */}
      <section className="glass rounded-2xl p-4 mb-4" aria-label="匿名情绪统计">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={16} className="text-cyan-400" aria-hidden="true" />
          <h2 className="text-sm font-medium theme-text">匿名情绪统计</h2>
        </div>
        <p className="text-xs theme-text-tertiary mb-3">
          开启后，你的情绪记录（仅含情绪类型和日期，不含任何文字内容）将匿名提交，
          用于生成群体情绪统计图表，帮助大家了解"今天大家的心情怎么样"。
        </p>
        <div className="flex items-center justify-between">
          <span className="text-sm theme-text">参与匿名统计</span>
          <button
            onClick={() => {
              const next = !anonymousSubmit
              setAnonymousSubmit(next)
              setAnonymousSubmitEnabled(next)
            }}
            className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-pink-400/50 ${
              anonymousSubmit ? 'bg-cyan-500' : 'bg-slate-700'
            }`}
            role="switch"
            aria-checked={anonymousSubmit}
            aria-label="开启匿名统计"
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                anonymousSubmit ? 'translate-x-5' : ''
              }`}
            />
          </button>
        </div>
      </section>
      {/* 隐私说明 */}
      <section className="glass rounded-2xl p-4 mb-4" aria-label="隐私保护">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={16} className="text-blue-400" aria-hidden="true" />
          <h2 className="text-sm font-medium theme-text">隐私保护</h2>
        </div>
        <ul className="space-y-2 text-xs theme-text-secondary" role="list">
          <li className="flex items-start gap-2">
            <span className="text-green-400 mt-0.5" aria-hidden="true">✓</span>
            所有数据存储在你的设备本地，不上传到任何服务器
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400 mt-0.5" aria-hidden="true">✓</span>
            AI 分析时，仅发送你输入的文字到配置的 API
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400 mt-0.5" aria-hidden="true">✓</span>
            不收集任何个人信息或使用数据
          </li>
        </ul>
      </section>

      {/* 心理援助 */}
      <section className="glass rounded-2xl p-4 mb-4" aria-label="心理援助资源">
        <div className="flex items-center gap-2 mb-3">
          <Heart size={16} className="text-red-400" aria-hidden="true" />
          <h2 className="text-sm font-medium theme-text">心理援助资源</h2>
        </div>
        <div className="space-y-2 text-sm">
          <a href="tel:400-161-9995" className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors focus:outline-none focus:ring-2 focus:ring-pink-400/50">
            <span className="theme-text">全国心理援助热线</span>
            <span className="text-pink-400">400-161-9995</span>
          </a>
          <a href="tel:010-82951332" className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors focus:outline-none focus:ring-2 focus:ring-pink-400/50">
            <span className="theme-text">北京心理危机研究与干预中心</span>
            <span className="text-pink-400">010-82951332</span>
          </a>
          <a href="tel:12320-5" className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors focus:outline-none focus:ring-2 focus:ring-pink-400/50">
            <span className="theme-text">生命热线</span>
            <span className="text-pink-400">12320-5</span>
          </a>
        </div>
      </section>

      {/* 关于 */}
      <section className="glass rounded-2xl p-4" aria-label="关于">
        <div className="flex items-center gap-2 mb-3">
          <Info size={16} className="theme-text-tertiary" aria-hidden="true" />
          <h2 className="text-sm font-medium theme-text">关于</h2>
        </div>
        <div className="text-xs theme-text-tertiary space-y-1">
          <p>情绪日历 v1.9.1</p>
          <p>中国大学生计算机设计大赛参赛作品</p>
          <p>AI 驱动的情绪追踪与可视化应用</p>
          <p className="mt-2 theme-text-muted">
            * 本应用提供的分析和建议仅供参考，不构成专业心理咨询或医疗建议。
            如有需要，请寻求专业帮助。
          </p>
        </div>
      </section>

      {/* 自定义弹窗 */}
      {confirmConfig && <ConfirmModal {...confirmConfig} />}
      {/* Toast 提示 */}
      {toast && <Toast key={toast.key} message={toast.message} type={toast.type} onDismiss={dismissToast} />}
    </div>
  )
}
