import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { syncCustomer } from '../hooks/useBilling'
import { BillingOnboardingModal } from '../components/pipeline/BillingOnboardingModal'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import {
  Plus, AlertCircle, RefreshCw, TrendingUp,
  CheckSquare, X, Trash2, ArrowRight,
} from 'lucide-react'
import { KanbanColumn } from '../components/pipeline/KanbanColumn'
import { DealCard } from '../components/pipeline/DealCard'
import { NewDealModal } from '../components/pipeline/NewDealModal'
import { ClientDrawer } from '../components/leads/ClientDrawer'
import { useLeads } from '../hooks/useLeads'
import type { Lead, PipelineStage } from '../lib/database.types'
import type { NewDealInput } from '../hooks/usePipeline'
import { PIPELINE_STAGES } from '../config/pipeline'

/* ─── Column definitions ─────────────────────────── */
const COLUMNS = PIPELINE_STAGES

function formatBigValue(v: number) {
  if (v >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1000)      return `R$${Math.round(v / 1000)}k`
  return `R$${v}`
}

/* ─── Page ───────────────────────────────────────── */
export function PipelinePage() {
  const { leads, loading, error, moveLead, addLead, deleteLead, refetch } = useLeads('crm')
  const [activeLead,   setActiveLead]   = useState<Lead | null>(null)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [showModal,    setShowModal]    = useState(false)
  const [onboarding,   setOnboarding]   = useState<{ clientId: string; clientName: string; leadData?: Partial<Lead> } | null>(null)

  /* ── Bulk Mode ───────────────────────────────────── */
  const [bulkMode,    setBulkMode]    = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const toggleBulkMode = useCallback(() => {
    setBulkMode(m => !m)
    setSelectedIds(new Set())
  }, [])

  const handleToggleCard = useCallback((id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  const handleToggleAll = useCallback((ids: string[], selectAll: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      ids.forEach(id => selectAll ? next.add(id) : next.delete(id))
      return next
    })
  }, [])

  async function handleBulkDelete() {
    const ids = [...selectedIds]
    setSelectedIds(new Set())
    await Promise.all(ids.map(id => deleteLead(id)))
  }

  async function handleBulkMove(stage: PipelineStage) {
    const ids = [...selectedIds]
    setSelectedIds(new Set())
    await Promise.all(ids.map(id => moveLead(id, stage)))
  }

  async function handleConvertLead(lead: Lead) {
    try {
      // 1. Verificar se já existe cliente com esse nome ou se já foi convertido
      const { data: existing } = await (supabase as unknown as { from: any })
        .from('clients')
        .select('id')
        .eq('name', lead.company ?? lead.name)
        .maybeSingle()

      if (existing) {
        // Cliente já convertido — silenciosamente pular para evitar re-onboarding
        return
      }

      const clientName = lead.company ?? lead.name
      const { data, error: err } = await (supabase as unknown as { from: any })
        .from('clients')
        .insert({
          name:         clientName,
          email:        lead.email,
          phone:        lead.phone,
          mrr:          lead.value,
          health_score: 50,
          trend:        'flat',
          avatar:       clientName.charAt(0).toUpperCase(),
          asaas_id:     null,
          segment:      null,
        })
        .select('id, name')
        .single()
      if (err) throw err
      setOnboarding({ clientId: data.id, clientName: data.name, leadData: lead })
    } catch (e) {
      console.error('[handleConvertLead]', e)
    }
  }

  /* dnd-kit sensors — require 8px movement to start drag */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  function handleDragStart(e: DragStartEvent) {
    const lead = e.active.data.current?.deal as Lead | undefined
    if (lead) setActiveLead(lead)
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveLead(null)
    const { active, over } = e
    if (!over || !active) return

    const leadId   = active.id as string
    const newStage = over.id as PipelineStage

    const currentLead = leads.find(l => l.id === leadId)
    if (!currentLead || currentLead.stage === newStage) return

    moveLead(leadId, newStage)

    if (newStage === 'fechado') {
      handleConvertLead(currentLead)
    }
  }

  /* Bridge: NewDealModal uses NewDealInput, addLead uses NewLeadInput */
  async function handleAddDeal(data: NewDealInput) {
    await addLead({
      name:     data.contact_name || data.company,
      email:    null,
      phone:    null,
      stage:    data.stage,
      score:    50,
      source:   null,
      title:    data.title,
      company:  data.company,
      value:    data.value,
      priority: data.priority,
      category: 'crm',
    })
  }

  /* Summary stats */
  const openLeads     = leads.filter(l => l.stage !== 'fechado')
  const closedLeads   = leads.filter(l => l.stage === 'fechado')
  const totalPipeline = openLeads.reduce((s, l) => s + l.value, 0)
  const totalClosed   = closedLeads.reduce((s, l) => s + l.value, 0)

  return (
    <div className="flex flex-col h-full gap-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-xl font-semibold text-white">Pipeline de Vendas</h2>
          <p className="text-sm text-slate-500 mt-1">Gerencie negócios com drag &amp; drop</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Selecionar toggle */}
          <button
            onClick={toggleBulkMode}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
            style={bulkMode
              ? { background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)', color: '#a5b4fc' }
              : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#64748b' }
            }
          >
            <CheckSquare size={14} />
            {bulkMode ? `${selectedIds.size} selecionados` : 'Selecionar'}
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
            }}
          >
            <Plus size={15} />
            Novo Negócio
          </button>
        </div>
      </div>

      {/* Bulk action bar */}
      {bulkMode && selectedIds.size > 0 && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl flex-shrink-0"
          style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}
        >
          <span className="text-xs text-slate-400 mr-1">
            <span className="text-indigo-300 font-semibold">{selectedIds.size}</span> negócio{selectedIds.size !== 1 ? 's' : ''} selecionado{selectedIds.size !== 1 ? 's' : ''}
          </span>

          <span className="text-slate-700 text-xs">Mover para →</span>
          {COLUMNS.map(col => (
            <button
              key={col.id}
              onClick={() => handleBulkMove(col.id)}
              className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-all duration-150 hover:opacity-80"
              style={{ background: `${col.color}15`, color: col.color, border: `1px solid ${col.color}30` }}
            >
              <ArrowRight size={10} />
              {col.label}
            </button>
          ))}

          <div className="flex-1" />

          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-150 hover:opacity-80"
            style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}
          >
            <Trash2 size={12} />
            Excluir
          </button>

          <button
            onClick={toggleBulkMode}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div
          className="flex items-center justify-between px-4 py-3 rounded-xl text-sm flex-shrink-0"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <span className="flex items-center gap-2 text-red-400">
            <AlertCircle size={14} />
            {error} — exibindo dados de demonstração.
          </span>
          <button
            onClick={refetch}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors ml-4 flex-shrink-0"
          >
            <RefreshCw size={12} /> Tentar novamente
          </button>
        </div>
      )}

      {/* Summary strip */}
      {!loading && (
        <div className="flex items-center gap-4 flex-shrink-0">
          {[
            { label: 'Em aberto',       value: openLeads.length,              unit: 'negócios', color: '#6366f1' },
            { label: 'Valor no funil',  value: formatBigValue(totalPipeline), unit: '',         color: '#f59e0b' },
            { label: 'Fechados',        value: closedLeads.length,            unit: 'negócios', color: '#10b981' },
            { label: 'Receita fechada', value: formatBigValue(totalClosed),   unit: '',         color: '#10b981' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-2">
              <TrendingUp size={12} style={{ color: s.color }} />
              <span className="text-xs text-slate-500">{s.label}:</span>
              <span className="text-xs font-bold" style={{ color: s.color }}>
                {s.value}{s.unit ? ` ${s.unit}` : ''}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Kanban board */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4 flex-1 items-start">
          {loading
            ? COLUMNS.map(col => (
                <div
                  key={col.id}
                  className="min-w-[260px] max-w-[260px] rounded-xl animate-pulse"
                  style={{ height: 320, background: 'rgba(255,255,255,0.03)' }}
                />
              ))
            : COLUMNS.map(col => (
                <KanbanColumn
                  key={col.id}
                  column={col}
                  leads={leads.filter(l => l.stage === col.id)}
                  onDelete={deleteLead}
                  activeDealId={activeLead?.id ?? null}
                  bulkMode={bulkMode}
                  selectedIds={selectedIds}
                  onToggleCard={handleToggleCard}
                  onToggleAll={handleToggleAll}
                  onCardClick={setSelectedLead}
                />
              ))
          }
        </div>

        {/* Ghost card while dragging */}
        <DragOverlay dropAnimation={null}>
          {activeLead && (
            <DealCard
              deal={activeLead}
              onDelete={() => {}}
              isDragOverlay
            />
          )}
        </DragOverlay>
      </DndContext>

      {/* New deal modal */}
      {showModal && (
        <NewDealModal
          onClose={() => setShowModal(false)}
          onSave={handleAddDeal}
        />
      )}

      {/* Client 360 Drawer on card click */}
      {selectedLead && (
        <ClientDrawer
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onLeadUpdated={(updated) => {
            setSelectedLead(updated)
            refetch()
          }}
        />
      )}

      {/* Billing onboarding after Kanban conversion */}
      {onboarding && (
        <BillingOnboardingModal
          clientId={onboarding.clientId}
          companyName={onboarding.clientName}
          initialData={onboarding.leadData as any}
          onClose={() => setOnboarding(null)}
          onSave={async (data) => {
            await (supabase as unknown as { from: any })
              .from('clients')
              .update(data)
              .eq('id', onboarding.clientId)
            syncCustomer({
              client_id: onboarding.clientId,
              name:      onboarding.clientName,
              email:     data.email     ?? '',
              phone:     data.phone     ?? '',
              cpf_cnpj:  data.cpf_cnpj  ?? '',
            })
          }}
        />
      )}
    </div>
  )
}
