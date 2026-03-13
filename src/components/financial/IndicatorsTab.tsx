import React, { useState } from 'react'
import { 
  Users, Target, Activity, Heart, BarChart, 
  TrendingUp, Clock, ArrowUpRight, 
  DollarSign, BarChart2, CheckCircle2, XCircle, Info,
  ChevronRight, RefreshCw
} from 'lucide-react'
import { 
  BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip as ReTooltip, ResponsiveContainer
} from 'recharts'

/* ─── Types & Mock Data ──────────────────────────── */
interface IndicatorCardProps {
  label: string
  value: string
  subLabel?: string
  icon: React.ReactNode
  color: string
  linkText?: string
  onLinkClick?: () => void
  loading?: boolean
  tooltipText?: string
}

const PLAN_DATA = [
  { name: '3 MESES', novos: 3, renovacoes: 0 },
  { name: '6 MESES', novos: 1, renovacoes: 2 },
  { name: '12 MESES', novos: 0, renovacoes: 1 },
]

/* ─── Components ────────────────────────────────── */

const IndicatorCard: React.FC<IndicatorCardProps> = ({ 
  label, value, subLabel, icon, color, linkText, onLinkClick, tooltipText 
}) => {
  return (
    <div className="glass rounded-2xl p-5 relative overflow-hidden group transition-all hover:bg-white/[0.02]">
      <div className="absolute top-0 left-0 w-1 h-full" style={{ background: color }} />
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
          {tooltipText && (
            <div className="group/tip relative">
              <Info size={12} className="text-slate-700 cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 text-[10px] text-slate-300 rounded-lg opacity-0 group-hover/tip:opacity-100 pointer-events-none transition-opacity z-50 border border-white/10 backdrop-blur-xl">
                {tooltipText}
              </div>
            </div>
          )}
        </div>
        <div className="p-2 rounded-xl bg-white/[0.03] text-slate-400 group-hover:scale-110 group-hover:text-white transition-all">
          {icon}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
        {subLabel && <p className="text-[11px] text-slate-500 font-medium">{subLabel}</p>}
      </div>

      {linkText && (
        <button 
          onClick={onLinkClick}
          className="mt-4 flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-widest group/link"
        >
          {linkText}
          <ChevronRight size={12} className="transition-transform group-hover/link:translate-x-0.5" />
        </button>
      )}
    </div>
  )
}

const SectionHeader: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
  <div className="flex items-center gap-2 mb-4 mt-6 first:mt-0">
    <div className="text-slate-400">{icon}</div>
    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">{title}</h3>
  </div>
)

interface ModalProps {
  title: string
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
}

const Modal: React.FC<ModalProps> = ({ title, isOpen, onClose, children }) => {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="glass w-full max-w-2xl rounded-2xl overflow-hidden relative animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
          <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-colors">
            <XCircle size={20} />
          </button>
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  )
}

import type { FinancialKPIsExtended } from '../../hooks/useFinancial'

export const IndicatorsTab: React.FC<{ kpis: FinancialKPIsExtended }> = ({ kpis }) => {
  const [modal, setModal] = useState<{ type: string; title: string } | null>(null)

  const openModal = (type: string, title: string) => setModal({ type, title })
  const closeModal = () => setModal(null)

  const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {/* Fluxo de Valor */}
      <section>
        <SectionHeader icon={<DollarSign size={14} />} title="Fluxo de Valor" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <IndicatorCard 
            label="Recebido (Caixa)"
            value={fmtBRL(kpis.recebimentoEfetivo)}
            subLabel="Dinheiro efetivamente no banco"
            icon={<CheckCircle2 size={18} />}
            color="#10b981"
            tooltipText="Soma de todas as transações pagas no período selecionado."
          />
          <IndicatorCard 
            label="Vendas Fechadas"
            value={fmtBRL(kpis.faturamentoTotal)}
            subLabel={`${kpis.numeroVendas} vendas no período`}
            icon={<DollarSign size={18} />}
            color="#3b82f6"
          />
          <IndicatorCard 
            label="Previsão (MRR)"
            value={fmtBRL(kpis.mrrAtual)}
            subLabel={`${kpis.mrrDelta > 0 ? '+' : ''}${kpis.mrrDelta.toFixed(1)}% vs mês anterior`}
            icon={<Clock size={18} />}
            color="#a855f7"
          />
          <IndicatorCard 
            label="Ticket Médio (Real)"
            value={fmtBRL(kpis.recebimentoEfetivo / (kpis.baseAtiva || 1))}
            subLabel="Recebimento médio por cliente ativo"
            icon={<Target size={18} />}
            color="#6366f1"
            linkText="Ver Pagantes"
            onLinkClick={() => openModal('ticket', 'Prova Real: Clientes Pagantes')}
          />
        </div>
      </section>

      {/* Saúde da Base */}
      <section>
        <SectionHeader icon={<Users size={14} />} title="Saúde da Base" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <IndicatorCard 
            label="Base Ativa (Famílias)"
            value={`${kpis.baseAtiva} cliente${kpis.baseAtiva !== 1 ? 's' : ''}`}
            subLabel="Contratos recorrentes ativos"
            icon={<Activity size={18} />}
            color="#0ea5e9"
          />
          <IndicatorCard 
            label="Movimentação"
            value={`+${kpis.movimentacaoNovos} Novos`}
            subLabel={`-${kpis.movimentacaoCancelados} Cancelados`}
            icon={<ArrowUpRight size={18} />}
            color="#f59e0b"
            tooltipText="Comparativo de entrada vs saída de clientes no período."
          />
          <IndicatorCard 
            label="Lifespan Real"
            value={`${kpis.lifespanReal.toFixed(1)} meses`}
            subLabel="Média de retenção histórica"
            icon={<Heart size={18} />}
            color="#ec4899"
            linkText="Ver Ranking"
            onLinkClick={() => openModal('lifespan', 'Ranking Lifespan')}
          />
          <IndicatorCard 
            label="Taxa de Renovação"
            value={`${kpis.taxaRenovacao.toFixed(1)}%`}
            subLabel="Taxa de ciclo de vida"
            icon={<RefreshCw size={18} />}
            color="#10b981"
            linkText="Ver Detalhes"
            onLinkClick={() => openModal('renewal', 'Renovações do Mês')}
          />
        </div>
      </section>

      {/* Eficiência */}
      <section>
        <SectionHeader icon={<BarChart size={14} />} title="Eficiência do Negócio" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <IndicatorCard 
            label="LTV Histórico (Real)"
            value={fmtBRL(kpis.ltvHistoricoReal)}
            subLabel="Recebimento total / clientes totais"
            icon={<BarChart2 size={18} />}
            color="#6366f1"
            linkText="Ver Ranking dos Clientes"
            onLinkClick={() => openModal('ltv', 'Ranking LTV')}
          />
          <IndicatorCard 
            label="LTV Projetado"
            value={fmtBRL(kpis.ltvProjetado)}
            subLabel="Baseado no Churn + Ticket atual"
            icon={<TrendingUp size={18} />}
            color="#8b5cf6"
          />
          <IndicatorCard 
            label="CAC (Custo de Aquisição)"
            value={fmtBRL(kpis.cac)}
            subLabel={`Investimento: ${fmtBRL(kpis.investimentoTotal)}`}
            icon={<Target size={18} />}
            color="#ef4444"
            linkText="Ver Detalhamento"
            onLinkClick={() => openModal('cac', 'Detalhamento do CAC')}
          />
        </div>
      </section>

      {/* Distribuição de Planos */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm font-bold text-white mb-6">Novos Planos por Duração</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ReBarChart data={PLAN_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                <ReTooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                />
                <Bar dataKey="novos" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
              </ReBarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-2xl p-6 flex flex-col items-center justify-center min-h-[300px]">
          <h3 className="text-sm font-bold text-white mb-6 self-start w-full">Renovações Vendidas</h3>
          <p className="text-slate-600 text-sm font-medium italic">Sem dados registrados no período.</p>
        </div>
      </section>

      {/* Modais */}
      {modal && (
        <Modal title={modal.title} isOpen={!!modal} onClose={closeModal}>
          {modal.type === 'ticket' && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-slate-400">Lista de clientes com pagamentos efetivados (Status: PAGO) neste mês.</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 text-[11px] uppercase tracking-wider border-b border-white/5">
                    <th className="py-2">#</th>
                    <th className="py-2">Cliente</th>
                    <th className="py-2 text-right">Total Pago</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={3} className="py-12 text-center text-slate-500 italic">Nenhum pagamento recebido.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          {modal.type === 'lifespan' && (
             <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-white">1</div>
                    <span className="font-semibold text-white">Gustavo Tizoni</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">Ativo</span>
                  </div>
                  <span className="font-bold text-white tabular-nums">1.0 meses</span>
                </div>
             </div>
          )}
          {modal.type === 'ltv' && (
             <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-white">1</div>
                    <span className="font-semibold text-white">Gustavo Tizoni</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">Ativo</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-bold text-white tabular-nums">{fmtBRL(0)}</span>
                    <span className="text-[10px] text-slate-500">1 contratos • 1.0 meses</span>
                  </div>
                </div>
             </div>
          )}
          {modal.type === 'renewal' && (
            <p className="text-center py-8 text-slate-500 italic">Nenhuma renovação este mês.</p>
          )}
          {modal.type === 'cac' && (
            <p className="text-center py-8 text-slate-500 italic">Nenhuma despesa de aquisição registrada.</p>
          )}
        </Modal>
      )}

    </div>
  )
}

