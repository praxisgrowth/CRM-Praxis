import { useState, useRef } from 'react'
import { User, Bell, Shield, Palette, Save, CheckCircle2, Upload, Moon, Sun, Monitor, Loader2 } from 'lucide-react'
import { useSettings } from '../contexts/SettingsContext'
import type { AgencySettings } from '../contexts/SettingsContext'

/* ─── Types ──────────────────────────────────────── */
type TabId = 'perfil' | 'notificacoes' | 'seguranca' | 'aparencia'

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'perfil',       label: 'Perfil',        icon: User    },
  { id: 'notificacoes', label: 'Notificações',   icon: Bell    },
  { id: 'seguranca',    label: 'Segurança',      icon: Shield  },
  { id: 'aparencia',    label: 'Aparência',      icon: Palette },
]

/* ─── Field component ────────────────────────────── */
function InputField({
  label, type = 'text', value, onChange, placeholder,
}: {
  label: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-slate-500 ml-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 rounded-xl text-white text-sm outline-none transition-all"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
        onFocus={e => {
          e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)'
          e.currentTarget.style.background = 'rgba(59,130,246,0.05)'
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
          e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
        }}
      />
    </div>
  )
}

/* ─── Save button ────────────────────────────────── */
function SaveButton({ onSave, saved, saving = false }: { onSave: () => void; saved: boolean; saving?: boolean }) {
  return (
    <button
      onClick={onSave}
      disabled={saving}
      className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-300 disabled:opacity-60"
      style={{
        background: saved ? 'rgba(16,185,129,0.8)' : '#2563eb',
        boxShadow: saved ? '0 4px 16px rgba(16,185,129,0.3)' : '0 4px 16px rgba(37,99,235,0.3)',
      }}
    >
      {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
      {saving ? 'Salvando…' : saved ? 'Salvo!' : 'Salvar Alterações'}
    </button>
  )
}

/* ─── Tab: Perfil ────────────────────────────────── */
function TabPerfil({
  onSaved,
  initial,
  onSave: persistSave,
  saving: extSaving,
  uploadLogo,
}: {
  onSaved: () => void
  initial: AgencySettings
  onSave: (updates: Partial<AgencySettings>) => Promise<void>
  saving: boolean
  uploadLogo: (file: File) => Promise<string | null>
}) {
  const [name,       setName]       = useState(initial.user_name)
  const [email,      setEmail]      = useState(initial.user_email)
  const [role,       setRole]       = useState(initial.user_role)
  const [phone,      setPhone]      = useState(initial.user_phone)
  const [agencyName, setAgencyName] = useState(initial.agency_name)
  const [saved,      setSaved]      = useState(false)
  const [logo,       setLogo]       = useState<string | null>(initial.logo_url)
  const [uploading,  setUploading]  = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleSave() {
    await persistSave({
      user_name:   name,
      user_email:  email,
      user_role:   role,
      user_phone:  phone,
      agency_name: agencyName,
      logo_url:    logo,
    })
    setSaved(true)
    onSaved()
    setTimeout(() => setSaved(false), 3000)
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Preview imediato via FileReader
    const reader = new FileReader()
    reader.onload = ev => setLogo(ev.target?.result as string)
    reader.readAsDataURL(file)

    // Tenta upload real no Supabase Storage
    setUploading(true)
    const url = await uploadLogo(file)
    if (url) setLogo(url)
    setUploading(false)
  }

  return (
    <div className="space-y-6">
      {/* User info */}
      <div
        className="rounded-2xl p-6 space-y-5"
        style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <h3 className="text-white font-semibold text-sm">Perfil do Usuário</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputField label="Nome Completo"  value={name}  onChange={setName}  placeholder="Seu nome" />
          <InputField label="E-mail"         value={email} onChange={setEmail} placeholder="email@empresa.com" type="email" />
          <InputField label="Cargo / Função" value={role}  onChange={setRole}  placeholder="Ex: CEO" />
          <InputField label="Telefone"       value={phone} onChange={setPhone} placeholder="(11) 99999-9999" />
        </div>
        <div className="pt-3 border-t flex justify-end" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          <SaveButton onSave={handleSave} saved={saved} saving={extSaving} />
        </div>
      </div>

      {/* Company / logo */}
      <div
        className="rounded-2xl p-6 space-y-4"
        style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <h3 className="text-white font-semibold text-sm">Configurações da Empresa</h3>
        <div className="space-y-4">
          <InputField label="Nome da Empresa" value={agencyName} onChange={setAgencyName} placeholder="Ex: Antigravity" />
          <div className="flex items-center gap-5">
            {/* Logo preview */}
            <div
              className="relative w-20 h-20 rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <img
                src={logo ?? '/favicon.png'}
                alt="Company Logo"
                className="w-full h-full object-cover"
              />
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
                  <Loader2 size={16} className="text-white animate-spin" />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-white text-sm font-medium">{agencyName}</p>
              <p className="text-xs text-slate-600">Formatos aceitos: PNG, JPG, SVG (máx 2MB)</p>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
              >
                <Upload size={12} />
                {uploading ? 'Enviando…' : 'Alterar Logotipo'}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoChange}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Tab: Notificações ──────────────────────────── */
function TabNotificacoes({ onSaved }: { onSaved: () => void }) {
  const [prefs, setPrefs] = useState({
    novoLead:     true,
    tarefaVencida: true,
    relatorioSemanal: false,
    slaAbaixo:    true,
    novoPagamento: false,
  })
  const [saved, setSaved] = useState(false)

  function toggle(key: keyof typeof prefs) {
    setPrefs(p => ({ ...p, [key]: !p[key] }))
  }

  function handleSave() {
    setSaved(true)
    onSaved()
    setTimeout(() => setSaved(false), 3000)
  }

  const items: { key: keyof typeof prefs; label: string; desc: string }[] = [
    { key: 'novoLead',        label: 'Novo Lead',              desc: 'Notificar quando um novo lead for cadastrado' },
    { key: 'tarefaVencida',   label: 'Tarefa Vencida',         desc: 'Alertar quando uma tarefa passar do prazo' },
    { key: 'slaAbaixo',       label: 'SLA Crítico',            desc: 'Alertar quando SLA de um projeto cair abaixo de 60%' },
    { key: 'relatorioSemanal',label: 'Relatório Semanal',      desc: 'Receber resumo semanal por e-mail toda segunda-feira' },
    { key: 'novoPagamento',   label: 'Novo Pagamento',         desc: 'Notificar ao receber um pagamento confirmado' },
  ]

  return (
    <div
      className="rounded-2xl p-6 space-y-5"
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <h3 className="text-white font-semibold text-sm">Preferências de Notificação</h3>
      <div className="space-y-3">
        {items.map(item => (
          <div
            key={item.key}
            className="flex items-center justify-between gap-4 py-3"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
          >
            <div>
              <p className="text-sm text-white font-medium">{item.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
            </div>
            <button
              onClick={() => toggle(item.key)}
              className="relative flex-shrink-0 w-10 h-5 rounded-full transition-all duration-200"
              style={{ background: prefs[item.key] ? '#2563eb' : 'rgba(255,255,255,0.1)' }}
            >
              <span
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200"
                style={{ left: prefs[item.key] ? '22px' : '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.4)' }}
              />
            </button>
          </div>
        ))}
      </div>
      <div className="pt-2 flex justify-end">
        <SaveButton onSave={handleSave} saved={saved} />
      </div>
    </div>
  )
}

/* ─── Tab: Segurança ─────────────────────────────── */
function TabSeguranca({ onSaved }: { onSaved: () => void }) {
  const [current, setCurrent] = useState('')
  const [next,    setNext]    = useState('')
  const [confirm, setConfirm] = useState('')
  const [saved,   setSaved]   = useState(false)
  const [errMsg,  setErrMsg]  = useState('')

  function handleSave() {
    if (!current) { setErrMsg('Informe sua senha atual.'); return }
    if (next.length < 8) { setErrMsg('A nova senha deve ter ao menos 8 caracteres.'); return }
    if (next !== confirm) { setErrMsg('As senhas não coincidem.'); return }
    setErrMsg('')
    setSaved(true)
    onSaved()
    setCurrent(''); setNext(''); setConfirm('')
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div
      className="rounded-2xl p-6 space-y-5"
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <h3 className="text-white font-semibold text-sm">Alterar Senha</h3>
      <div className="space-y-4 max-w-sm">
        <InputField label="Senha Atual"       value={current} onChange={setCurrent} type="password" />
        <InputField label="Nova Senha"        value={next}    onChange={setNext}    type="password" placeholder="Mínimo 8 caracteres" />
        <InputField label="Confirmar Senha"   value={confirm} onChange={setConfirm} type="password" />
        {errMsg && <p className="text-xs text-red-400 px-1">{errMsg}</p>}
      </div>
      <div className="pt-2 flex justify-end">
        <SaveButton onSave={handleSave} saved={saved} />
      </div>
    </div>
  )
}

/* ─── Tab: Aparência ─────────────────────────────── */
function TabAparencia({ onSaved }: { onSaved: () => void }) {
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark')
  const [accent, setAccent] = useState('#2563eb')
  const [saved, setSaved] = useState(false)

  function handleSave() {
    setSaved(true)
    onSaved()
    setTimeout(() => setSaved(false), 3000)
  }

  const THEMES = [
    { id: 'dark' as const,   label: 'Escuro',   icon: Moon },
    { id: 'light' as const,  label: 'Claro',    icon: Sun },
    { id: 'system' as const, label: 'Sistema',  icon: Monitor },
  ]

  const ACCENTS = ['#2563eb', '#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444']

  return (
    <div
      className="rounded-2xl p-6 space-y-6"
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <h3 className="text-white font-semibold text-sm">Aparência</h3>

      <div className="space-y-2">
        <p className="text-xs text-slate-500">Tema</p>
        <div className="flex gap-3">
          {THEMES.map(t => {
            const Icon = t.icon
            const active = theme === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className="flex flex-col items-center gap-2 px-5 py-3 rounded-xl text-xs font-medium transition-all duration-150"
                style={{
                  background: active ? 'rgba(37,99,235,0.15)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${active ? 'rgba(37,99,235,0.5)' : 'rgba(255,255,255,0.07)'}`,
                  color: active ? '#93c5fd' : '#64748b',
                }}
              >
                <Icon size={18} />
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-slate-500">Cor de destaque</p>
        <div className="flex gap-2">
          {ACCENTS.map(color => (
            <button
              key={color}
              onClick={() => setAccent(color)}
              className="w-8 h-8 rounded-lg transition-all duration-150"
              style={{
                background: color,
                boxShadow: accent === color ? `0 0 0 2px rgba(255,255,255,0.15), 0 0 0 3px ${color}` : 'none',
                transform: accent === color ? 'scale(1.15)' : 'scale(1)',
              }}
            />
          ))}
        </div>
      </div>

      <div className="pt-2 flex justify-end">
        <SaveButton onSave={handleSave} saved={saved} />
      </div>
    </div>
  )
}

/* ─── Page ───────────────────────────────────────── */
export function Settings() {
  const { settings, saving, save, uploadLogo } = useSettings()
  const [activeTab,   setActiveTab]   = useState<TabId>('perfil')
  const [globalSaved, setGlobalSaved] = useState(false)

  function handleSaved() {
    setGlobalSaved(true)
    setTimeout(() => setGlobalSaved(false), 3000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Configurações</h1>
        <p className="text-sm text-slate-500 mt-1">Gerencie as preferências da sua conta e do sistema</p>
      </div>

      {/* Global saved toast */}
      {globalSaved && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
          style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}
        >
          <CheckCircle2 size={14} className="text-emerald-400" />
          <span className="text-emerald-300">Alterações salvas com sucesso!</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar tabs */}
        <div className="space-y-1">
          {TABS.map(tab => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
                style={{
                  background: active ? 'rgba(37,99,235,0.15)' : 'transparent',
                  border: `1px solid ${active ? 'rgba(37,99,235,0.3)' : 'transparent'}`,
                  color: active ? '#93c5fd' : '#64748b',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.color = '#cbd5e1' }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.color = '#64748b' }}
              >
                <Icon size={16} style={{ color: active ? '#60a5fa' : undefined }} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        <div className="md:col-span-3">
          {activeTab === 'perfil' && (
            <TabPerfil
              onSaved={handleSaved}
              initial={settings}
              onSave={save}
              saving={saving}
              uploadLogo={uploadLogo}
            />
          )}
          {activeTab === 'notificacoes' && <TabNotificacoes onSaved={handleSaved} />}
          {activeTab === 'seguranca'    && <TabSeguranca    onSaved={handleSaved} />}
          {activeTab === 'aparencia'    && <TabAparencia    onSaved={handleSaved} />}
        </div>
      </div>
    </div>
  )
}
