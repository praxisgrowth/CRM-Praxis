import { X, LayoutGrid, Maximize2, Minimize2, Pencil, Check, Loader2 } from 'lucide-react'
import { useState } from 'react'
import type { Lead } from '../../lib/database.types'
import { SDRPlaybook } from './SDRPlaybook'
import { SDRChat } from './SDRChat'
import { SDRQualification } from './SDRQualification'
import { BillingOnboardingModal } from '../pipeline/BillingOnboardingModal'
import { syncCustomer } from '../../hooks/useBilling'
import { supabase } from '../../lib/supabase'
import { useAudit } from '../../hooks/useAudit'
import clsx from 'clsx'

interface Props {
  lead:           Lead
  onClose:        () => void
  onLeadUpdated?: (updated: Lead) => void
}

export function ClientDrawer({ lead, onClose, onLeadUpdated }: Props) {
  const { logAction } = useAudit()
  const [isExpanded, setIsExpanded] = useState(true)
  const [chatDraft, setChatDraft] = useState('')
  const [onboarding, setOnboarding] = useState<{ clientId: string; clientName: string } | null>(null)
  const [editMode,    setEditMode]    = useState(false)
  const [editName,    setEditName]    = useState(lead.name)
  const [editEmail,   setEditEmail]   = useState(lead.email ?? '')
  const [editPhone,   setEditPhone]   = useState(lead.phone ?? '')
  const [editCompany, setEditCompany] = useState(lead.company ?? '')
  const [saving,      setSaving]      = useState(false)

  const [saveErr, setSaveErr] = useState('')

  async function handleSave() {
    if (editPhone && editPhone.replace(/\D/g, '').length < 10) {
      setSaveErr('Telefone inválido — informe o DDD + número (mínimo 10 dígitos).')
      return
    }
    setSaveErr('')
    setSaving(true)
    const updates = {
      name:    editName.trim()    || lead.name,
      email:   editEmail.trim()   || null,
      phone:   editPhone.trim()   || null,
      company: editCompany.trim() || null,
    }
    const { error: err } = await (supabase as any)
      .from('leads')
      .update(updates)
      .eq('id', lead.id)
    if (!err) {
      const updated: Lead = { ...lead, ...updates }
      onLeadUpdated?.(updated)
      await logAction('Update Lead', 'lead', lead.id, updates as unknown as Record<string, unknown>)
      setEditMode(false)
    }
    setSaving(false)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 transition-all duration-500"
        style={{ 
          background: 'rgba(0,0,0,0.45)', 
          backdropFilter: 'blur(4px)',
          opacity: 1
        }}
        onClick={onClose}
      />

      {/* Workspace SDR Panel */}
      <aside
        className={clsx(
          "fixed top-0 right-0 z-50 h-full flex flex-col transition-all duration-500 ease-in-out",
          isExpanded ? "w-[min(1440px,95vw)]" : "w-[min(480px,100vw)]"
        )}
        style={{
          background: 'rgba(8,12,20,0.98)',
          borderLeft: '1px solid rgba(99,102,241,0.2)',
          boxShadow: '-24px 0 80px rgba(0,0,0,0.8)',
        }}
      >
        {/* Workspace Header */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ 
            borderBottom: '1px solid rgba(255,255,255,0.06)', 
            background: 'linear-gradient(90deg, rgba(99,102,241,0.08), rgba(139,92,246,0.08))' 
          }}
        >
          <div className="flex items-center gap-4 min-w-0">
             <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold border border-blue-500/20">
                {lead.name[0]}
             </div>
             <div className="min-w-0">
                {editMode ? (
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <input
                      className="bg-white/5 border border-white/15 rounded-lg px-2 py-1 text-sm text-white outline-none focus:border-blue-500/50 w-full"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      placeholder="Nome"
                    />
                    <div className="flex gap-1.5">
                      <input
                        className="bg-white/5 border border-white/15 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-blue-500/50 flex-1 min-w-0"
                        value={editEmail}
                        onChange={e => setEditEmail(e.target.value)}
                        placeholder="E-mail"
                      />
                      <input
                        className="bg-white/5 border border-white/15 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-blue-500/50 flex-1 min-w-0"
                        value={editPhone}
                        onChange={e => setEditPhone(e.target.value)}
                        placeholder="Telefone"
                      />
                    </div>
                    <input
                      className="bg-white/5 border border-white/15 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-blue-500/50 w-full"
                      value={editCompany}
                      onChange={e => setEditCompany(e.target.value)}
                      placeholder="Empresa"
                    />
                    {saveErr && <p className="text-[10px] text-red-400">{saveErr}</p>}
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-white truncate">{lead.name}</h2>
                      <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[9px] font-bold uppercase border border-blue-500/20">
                        SDR Workspace
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">Gestão Ativa & Playbook de Vendas</p>
                  </div>
                )}
             </div>
          </div>

          <div className="flex items-center gap-3">
             <button
               onClick={() => editMode ? handleSave() : (setEditMode(true), setSaveErr(''))}
               disabled={saving}
               className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-50"
               title={editMode ? 'Salvar alterações' : 'Editar lead'}
             >
               {saving ? <Loader2 size={16} className="animate-spin" /> : editMode ? <Check size={16} className="text-green-400" /> : <Pencil size={16} />}
             </button>
             <button
               onClick={() => setIsExpanded(!isExpanded)}
               className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
               title={isExpanded ? "Contrair" : "Expandir Workspace"}
             >
               {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
             </button>
             <div className="w-px h-6 bg-white/5" />
             <button
               onClick={onClose}
               className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
             >
               <X size={18} />
             </button>
          </div>
        </div>

        {/* Workspace Content (3 Columns) */}
        <div className="flex-1 overflow-hidden flex">
          {isExpanded ? (
            <>
              {/* Coluna 1: Playbook (25%) */}
              <div className="w-[320px] flex-shrink-0 h-full border-r border-white/5">
                 <SDRPlaybook lead={lead} onUseInChat={setChatDraft} />
              </div>

              {/* Coluna 2: Omnichannel Chat (45%) */}
              <div className="flex-1 h-full bg-black/10">
                 <SDRChat lead={lead} draft={chatDraft} onDraftChange={setChatDraft} />
              </div>

              {/* Coluna 3: CRM Data (30%) */}
              <div className="w-[360px] flex-shrink-0 h-full border-l border-white/5 bg-white/[0.01]">
                 <SDRQualification
                   lead={lead}
                   onConverted={(clientId, clientName) => setOnboarding({ clientId, clientName })}
                 />
              </div>
            </>
          ) : (
            /* Versão compacta (original mais refinada) */
            <div className="flex-1 overflow-y-auto">
               <SDRQualification lead={lead} />
            </div>
          )}
        </div>

        {/* Global Action Bar (Footer) */}
        {!isExpanded && (
          <div className="p-4 border-t border-white/5 bg-white/[0.01]">
             <button 
               onClick={() => setIsExpanded(true)}
               className="w-full py-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-bold border border-blue-500/20 flex items-center justify-center gap-2 transition-all"
             >
               <LayoutGrid size={14} />
               Abrir Workspace SDR Completo
             </button>
          </div>
        )}
      </aside>

      {onboarding && (
        <BillingOnboardingModal
          clientId={onboarding.clientId}
          companyName={onboarding.clientName}
          initialData={lead as any}
          onClose={() => setOnboarding(null)}
          onSave={async (data) => {
            const { error: updateErr } = await (supabase as unknown as { from: (t: string) => { update: (d: any) => { eq: (k: string, v: any) => Promise<{ error: any }> } } })
              .from('clients')
              .update(data)
              .eq('id', onboarding.clientId)
            
            if (updateErr) throw updateErr

            await logAction('Sync Asaas', 'client', onboarding.clientId, {
              name: onboarding.clientName,
              email: data.email,
              cpf_cnpj: data.cpf_cnpj
            } as unknown as Record<string, unknown>)
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
    </>
  )
}
