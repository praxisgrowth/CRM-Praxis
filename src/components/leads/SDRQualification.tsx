import { User, Mail, Phone, Globe, Briefcase, Target, Users, TrendingUp, Clock, UserPlus, Loader2, ChevronDown } from 'lucide-react'
import { useState, useEffect } from 'react'
import type { Lead } from '../../lib/database.types'
import { supabase } from '../../lib/supabase'
import { ActivityTimeline } from './ActivityTimeline'
import { PIPELINE_STAGES } from '../../config/pipeline'
import { FinancialCard } from '../financial/FinancialCard'

interface Props {
  lead:         Lead
  onConverted?: (clientId: string, clientName: string) => void
}

interface FieldProps {
  label: string
  value: string | number | null
  icon: React.ComponentType<{ size?: number; className?: string }>
}

function CRMField({ label, value, icon: Icon }: FieldProps) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-2">
        <Icon size={12} className="text-slate-500" />
        <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-xs text-slate-200 font-medium pl-5">{value || '—'}</p>
    </div>
  )
}

const TEAM_SIZE_OPTIONS = ['1–5 pessoas', '6–20 pessoas', '21–50 pessoas', '51–200 pessoas', '200+ pessoas']

export function SDRQualification({ lead, onConverted }: Props) {
  const [faturamento,   setFaturamento]   = useState(lead.faturamento   ?? '')
  const [teamSize,      setTeamSize]      = useState(lead.team_size      ?? '')
  const [dores,         setDores]         = useState(lead.dores          ?? '')
  const [converting,    setConverting]    = useState(false)
  const [icpSaving,     setIcpSaving]     = useState(false)
  const [convertError,  setConvertError]  = useState<string | null>(null)
  const [stageUpdating, setStageUpdating] = useState(false)
  const [clientId,    setClientId]    = useState<string | null>(null)
  const [billingOpen, setBillingOpen] = useState(false)

  async function handleConvert() {
    setConverting(true)
    setConvertError(null)
    try {
      // 1. Criar cliente
      const { data, error: insertErr } = await (supabase as any)
        .from('clients')
        .insert({
          name:         lead.name,
          email:        lead.email,
          phone:        lead.phone,
          mrr:          0,
          health_score: 50,
          trend:        'flat',
          avatar:       lead.name.charAt(0).toUpperCase(),
          asaas_id:     null,
          segment:      null,
        })
        .select('id, name')
        .single()
      if (insertErr) throw new Error(insertErr.message)

      // 2. Marcar lead como fechado
      await (supabase as any)
        .from('leads')
        .update({ stage: 'fechado' })
        .eq('id', lead.id)

      // 3. Abrir modal de onboarding
      onConverted?.(data.id, data.name)
    } catch (err) {
      setConvertError(err instanceof Error ? err.message : 'Erro ao converter.')
    } finally {
      setConverting(false)
    }
  }

  async function saveICP(patch: { faturamento?: string | null; team_size?: string | null; dores?: string | null }) {
    setIcpSaving(true)
    await (supabase as any)
      .from('leads')
      .update(patch)
      .eq('id', lead.id)
    setIcpSaving(false)
  }

  async function handleStageChange(newStage: string) {
    setStageUpdating(true)
    await (supabase as any)
      .from('leads')
      .update({ stage: newStage })
      .eq('id', lead.id)
    setStageUpdating(false)
  }

  useEffect(() => {
    if (!lead.name) return
    let cancelled = false
    async function fetchClientId() {
      const { data } = await (supabase as any)
        .from('clients')
        .select('id')
        .eq('name', lead.name)
        .maybeSingle()
      if (!cancelled) setClientId(data?.id ?? null)
    }
    fetchClientId()
    return () => { cancelled = true }
  }, [lead.name])

  return (
    <div className="flex flex-col h-full bg-white/[0.01] border-l border-white/5 overflow-hidden">
      <div className="p-4 border-b border-white/5 bg-white/[0.02]">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Target size={14} className="text-purple-400" />
          Dados de Qualificação
        </h3>
        <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wider font-medium">Perfil Ideal de Cliente (ICP)</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Contato Básico */}
        <section className="mb-4">
          <CRMField label="Lead" value={lead.name} icon={User} />
          <CRMField label="E-mail" value={lead.email} icon={Mail} />
          <CRMField label="Telefone" value={lead.phone} icon={Phone} />
          <CRMField label="Origem" value={lead.source} icon={Globe} />
        </section>

        {/* Estágio do Lead */}
        <div className="px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-2 mb-1.5">
            <ChevronDown size={12} className="text-slate-500" />
            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Estágio</span>
          </div>
          <div className="relative">
            <select
              defaultValue={lead.stage}
              onChange={e => handleStageChange(e.target.value)}
              disabled={stageUpdating}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-purple-500/50 transition-all appearance-none cursor-pointer disabled:opacity-60"
            >
              {PIPELINE_STAGES.map(s => (
                <option key={s.id} value={s.id} className="bg-slate-900">{s.label}</option>
              ))}
            </select>
            {stageUpdating && (
              <Loader2 size={11} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-purple-400" />
            )}
          </div>
        </div>

        {/* Diagnóstico editável */}
        <div className="px-4 py-2 bg-purple-500/5 border-y border-purple-500/10 mb-2 flex items-center justify-between">
          <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest">Diagnóstico</p>
          {icpSaving && (
            <Loader2 size={10} className="animate-spin text-purple-400" />
          )}
        </div>

        <section className="px-4 space-y-3 pb-4">
          {/* Faturamento */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <TrendingUp size={12} className="text-slate-500" />
              <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Faturamento Mensal</label>
            </div>
            <input
              type="text"
              value={faturamento}
              onChange={e => setFaturamento(e.target.value)}
              onBlur={e => saveICP({ faturamento: e.target.value.trim() || null })}
              placeholder="ex: R$ 80.000/mês"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-purple-500/50 transition-all placeholder:text-slate-600"
            />
          </div>

          {/* Tamanho do Time */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Users size={12} className="text-slate-500" />
              <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Tamanho do Time</label>
            </div>
            <select
              value={teamSize}
              onChange={e => { setTeamSize(e.target.value); saveICP({ team_size: e.target.value || null }) }}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-purple-500/50 transition-all appearance-none cursor-pointer"
            >
              <option value="" className="bg-slate-900 text-slate-400">Selecionar...</option>
              {TEAM_SIZE_OPTIONS.map(opt => (
                <option key={opt} value={opt} className="bg-slate-900">{opt}</option>
              ))}
            </select>
          </div>

          {/* Dores Principais */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Briefcase size={12} className="text-slate-500" />
              <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Dores Principais</label>
            </div>
            <textarea
              value={dores}
              onChange={e => setDores(e.target.value)}
              onBlur={e => saveICP({ dores: e.target.value.trim() || null })}
              placeholder="Descreva os principais desafios do lead..."
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-purple-500/50 transition-all resize-none placeholder:text-slate-600"
            />
          </div>
        </section>

        {/* Histórico de Atividades — Timeline ao vivo */}
        <div className="p-4 mt-2">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={12} className="text-purple-400" />
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
              Histórico de Atividades
            </p>
          </div>
          <ActivityTimeline leadId={lead.id} />
        </div>

        {/* Cobranças Asaas */}
        <div className="border-t border-white/5 mt-2">
          <button
            onClick={() => setBillingOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                Cobranças Asaas
              </span>
              {clientId && (
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(0,210,255,0.12)', color: '#00d2ff' }}
                >
                  vinculado
                </span>
              )}
            </div>
            <ChevronDown
              size={12}
              className="text-slate-600 transition-transform duration-200"
              style={{ transform: billingOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
          </button>

          {billingOpen && (
            <div className="px-4 pb-4">
              {clientId ? (
                <FinancialCard clientId={clientId} />
              ) : (
                <p className="text-[11px] text-slate-600 text-center py-6">
                  Lead não convertido — sem cobranças vinculadas.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Button */}
      <div className="p-4 border-t border-white/5 space-y-2">
        {convertError && (
          <p className="text-[11px] text-red-400 text-center pb-1">⚠ {convertError}</p>
        )}
        <button
          onClick={handleConvert}
          disabled={converting || lead.stage === 'fechado'}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-bold text-white transition-all duration-200 disabled:opacity-50"
          style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            boxShadow:  '0 4px 16px rgba(99,102,241,0.3)',
          }}
        >
          {converting
            ? <><Loader2 size={12} className="animate-spin" /> Convertendo...</>
            : <><UserPlus size={12} /> {lead.stage === 'fechado' ? 'Já convertido' : 'Converter em Cliente'}</>
          }
        </button>
      </div>
    </div>
  )
}
