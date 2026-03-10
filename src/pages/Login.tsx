// src/pages/Login.tsx
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Loader2, Lock, Mail, Zap, AlertCircle } from 'lucide-react'

export function LoginPage() {
  const navigate = useNavigate()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) return
    setLoading(true)
    setError(null)

    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (authErr) {
      setError(authErr.message === 'Invalid login credentials'
        ? 'E-mail ou senha incorretos.'
        : authErr.message)
      setLoading(false)
      return
    }

    navigate('/', { replace: true })
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    color: '#e2e8f0',
    padding: '12px 44px',
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.2s',
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(0,210,255,0.06) 0%, #030712 60%)' }}
    >
      {/* Glow effects */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(0,210,255,0.08) 0%, transparent 70%)' }}
      />

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(0,210,255,0.15), rgba(157,80,187,0.15))',
              border: '1px solid rgba(0,210,255,0.2)',
              boxShadow: '0 0 30px rgba(0,210,255,0.15)',
            }}
          >
            <img src="/favicon.png" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Praxis</h1>
          <p className="text-sm text-slate-500 mt-1">Tech Dashboard</p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: 'rgba(10,15,30,0.9)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 25px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,210,255,0.04)',
          }}
        >
          <h2 className="text-lg font-semibold text-white mb-1">Entrar na plataforma</h2>
          <p className="text-xs text-slate-500 mb-6">Use as credenciais fornecidas pela equipe Praxis.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="relative">
              <Mail
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
              />
              <input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={inputStyle}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(0,210,255,0.4)')}
                onBlur={e  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                autoComplete="email"
                autoFocus
                required
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
              />
              <input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={inputStyle}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(0,210,255,0.4)')}
                onBlur={e  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                autoComplete="current-password"
                required
              />
            </div>

            {/* Error */}
            {error && (
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs"
                style={{
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  color: '#f87171',
                }}
              >
                <AlertCircle size={12} />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all duration-200 disabled:opacity-50 hover:opacity-90 active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #00d2ff22, #9d50bb22)',
                border: '1px solid rgba(0,210,255,0.3)',
                boxShadow: loading ? 'none' : '0 0 20px rgba(0,210,255,0.15)',
              }}
            >
              {loading
                ? <Loader2 size={15} className="animate-spin" />
                : <Zap size={15} style={{ color: '#00d2ff' }} />
              }
              {loading ? 'Autenticando…' : 'Entrar'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-slate-700 mt-6">
          Acesso restrito · Praxis Tech Dashboard
        </p>
      </div>
    </div>
  )
}
