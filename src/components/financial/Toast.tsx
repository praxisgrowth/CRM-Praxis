import { useEffect } from 'react'
import { Check, X, AlertCircle } from 'lucide-react'

interface ToastProps {
  message: string
  type?: 'success' | 'error'
  onClose: () => void
  duration?: number
}

export function Toast({ message, type = 'success', onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, duration)
    return () => clearTimeout(t)
  }, [duration, onClose])

  const isSuccess = type === 'success'
  const color = isSuccess ? '#10b981' : '#ef4444'
  const bg    = isSuccess ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)'
  const bdr   = isSuccess ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-4 py-3 rounded-xl"
      style={{
        background: bg,
        border: `1px solid ${bdr}`,
        backdropFilter: 'blur(16px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        animation: 'fade-in 0.2s ease-out',
        minWidth: 280,
        maxWidth: 420,
      }}
    >
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}20` }}
      >
        {isSuccess
          ? <Check size={13} style={{ color }} />
          : <AlertCircle size={13} style={{ color }} />
        }
      </div>
      <p className="text-sm font-medium flex-1" style={{ color: isSuccess ? '#6ee7b7' : '#fca5a5' }}>
        {message}
      </p>
      <button
        onClick={onClose}
        className="text-slate-600 hover:text-slate-400 transition-colors flex-shrink-0"
      >
        <X size={13} />
      </button>
    </div>
  )
}
