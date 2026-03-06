import { useParams, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  TrendingUp,
  Clock,
  Loader2,
  DollarSign,
  User,
  FileText,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Client } from '../lib/database.types'
import { FinancialCard } from '../components/financial/FinancialCard'

function fmtCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function healthColor(score: number) {
  if (score >= 75) return '#10b981'
  if (score >= 50) return '#f59e0b'
  return '#ef4444'
}

export function ClientDetail() {
  const { id } = useParams<{ id: string }>()
  const [client,  setClient]  = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) { setNotFound(true); setLoading(false); return }

    async function load() {
      setLoading(true)
      const { data } = await (supabase as any)
        .from('clients')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (!data) {
        setNotFound(true)
      } else {
        setClient(data as Client)
      }
      setLoading(false)
    }

    load()
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={28} className="text-indigo-400 animate-spin" />
      </div>
    )
  }

  if (notFound || !client) {
    return (
      <div className="space-y-4 animate-in fade-in duration-500">
        <Link
          to="/comercial/clientes"
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm w-fit"
        >
          <ArrowLeft size={16} /> Voltar para Clientes
        </Link>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <User size={32} className="text-slate-700 mb-3" />
          <p className="text-sm font-semibold text-slate-400">Cliente não encontrado</p>
          <p className="text-xs text-slate-600 mt-1">Verifique o ID e tente novamente.</p>
        </div>
      </div>
    )
  }

  const hColor = healthColor(client.health_score)

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* ── Back + Header ────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <Link
          to="/comercial/clientes"
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm w-fit"
        >
          <ArrowLeft size={16} /> Voltar para Clientes
        </Link>

        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-indigo-300 flex-shrink-0"
              style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)' }}
            >
              {client.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white leading-tight">{client.name}</h1>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                {client.segment && (
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                    style={{ background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.2)' }}
                  >
                    {client.segment}
                  </span>
                )}
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Clock size={12} />
                  Cliente desde {new Date(client.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Strip ────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div
          className="rounded-xl px-4 py-3"
          style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}
        >
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1">
            <DollarSign size={10} /> MRR
          </p>
          <p className="text-lg font-bold text-white">{fmtCurrency(client.mrr)}</p>
        </div>
        <div
          className="rounded-xl px-4 py-3"
          style={{ background: `${hColor}08`, border: `1px solid ${hColor}20` }}
        >
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1">
            <TrendingUp size={10} /> Health Score
          </p>
          <p className="text-lg font-bold" style={{ color: hColor }}>{client.health_score}%</p>
        </div>
        {client.cpf_cnpj && (
          <div
            className="rounded-xl px-4 py-3"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1">
              <FileText size={10} /> CPF / CNPJ
            </p>
            <p className="text-sm font-semibold text-slate-300 tabular-nums">{client.cpf_cnpj}</p>
          </div>
        )}
      </div>

      {/* ── Main grid ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: contact info */}
        <div className="space-y-4">
          <div
            className="rounded-2xl p-5"
            style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4">
              Informações de Contato
            </h3>
            <div className="space-y-3">
              <ContactRow icon={Mail} label="E-mail" value={client.email} />
              <ContactRow icon={Phone} label="Telefone" value={client.phone} />
              {(client.cidade || client.uf) && (
                <ContactRow
                  icon={MapPin}
                  label="Localização"
                  value={[client.cidade, client.uf].filter(Boolean).join(' – ')}
                />
              )}
              {client.logradouro && (
                <ContactRow
                  icon={MapPin}
                  label="Endereço"
                  value={[client.logradouro, client.numero, client.complemento].filter(Boolean).join(', ')}
                />
              )}
            </div>
          </div>
        </div>

        {/* Right column: financial payments */}
        <div className="lg:col-span-2">
          <div
            className="rounded-2xl p-5"
            style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4">
              Cobranças
            </h3>
            <FinancialCard clientId={client.id} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Small helper ──────────────────────────────────────────────
function ContactRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string | null | undefined
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="p-1.5 rounded-lg flex-shrink-0 mt-0.5"
        style={{ background: 'rgba(255,255,255,0.04)' }}
      >
        <Icon size={13} className="text-slate-500" />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] text-slate-600 uppercase tracking-wide">{label}</p>
        <p className="text-xs text-slate-300 mt-0.5 break-words">{value || 'Não informado'}</p>
      </div>
    </div>
  )
}
