import { useParams, Link } from 'react-router-dom'
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  Globe, 
  Calendar, 
  DollarSign, 
  Zap,
  TrendingUp,
  Clock,
  ExternalLink
} from 'lucide-react'
import { useLeads } from '../hooks/useLeads' // Reutilizando busca de clientes/leads
import clsx from 'clsx'

export function ClientDetail() {
  const { id } = useParams()
  const { leads, loading } = useLeads()
  
  // No mundo real, buscaríamos o cliente específico pelo ID
  const client = leads.find(l => l.id === id) || leads[0]

  if (loading) return <div className="p-8">Carregando detalhes...</div>

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Link 
          to="/comercial/leads" 
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm w-fit"
        >
          <ArrowLeft size={16} /> Voltar para Clientes
        </Link>
        
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl glass flex items-center justify-center text-3xl font-bold text-blue-400 border-blue-500/20 shadow-glow">
              {client.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">{client.name}</h1>
              <div className="flex items-center gap-3 mt-2">
                <span className={clsx(
                  "px-3 py-1 rounded-full text-xs font-medium border",
                  client.stage === 'fechado' ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                )}>
                  {client.stage === 'fechado' ? 'Cliente Ativo' : 'Lead Qualificado'}
                </span>
                <span className="text-slate-500 text-sm flex items-center gap-1">
                  <Clock size={14} /> Desde {new Date(client.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button className="px-4 py-2 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 transition-all">
              Editar Dados
            </button>
            <button className="px-4 py-2 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20">
              Nova Proposta
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Esquerda: Dados e Contatos */}
        <div className="space-y-6">
          <div className="glass rounded-2xl p-6 border-white/5">
            <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-4">Informações de Contato</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3 group">
                <div className="p-2 rounded-lg bg-white/5 text-slate-400 group-hover:text-blue-400 transition-colors">
                  <Mail size={18} />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 leading-none">E-mail</p>
                  <p className="text-slate-200 text-sm mt-1">{client.email || 'Não informado'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 group">
                <div className="p-2 rounded-lg bg-white/5 text-slate-400 group-hover:text-blue-400 transition-colors">
                  <Phone size={18} />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 leading-none">Telefone</p>
                  <p className="text-slate-200 text-sm mt-1">{client.phone || 'Não informado'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 group">
                <div className="p-2 rounded-lg bg-white/5 text-slate-400 group-hover:text-blue-400 transition-colors">
                  <Globe size={18} />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 leading-none">Origem</p>
                  <p className="text-slate-200 text-sm mt-1">{client.source || 'Tráfego Direto'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="glass rounded-2xl p-6 border-white/5">
            <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-4">KPIs do Cliente</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                <p className="text-slate-500 text-[10px] uppercase">LTV Total</p>
                <p className="text-xl font-bold text-white mt-1">R$ 12.400</p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                <p className="text-slate-500 text-[10px] uppercase">Score</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xl font-bold text-blue-400">{client.score}%</span>
                  <TrendingUp size={14} className="text-green-500" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna Central: Timeline e Projetos */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass rounded-2xl p-6 border-white/5">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Zap size={18} className="text-blue-400" /> Projetos em Andamento
              </h3>
              <button className="text-xs text-blue-400 hover:underline">Ver Todos</button>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-blue-500/30 transition-all cursor-pointer group">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">Rebranding Institucional</h4>
                    <p className="text-xs text-slate-500 mt-1">SLA: 100% • Entrega em 12 dias</p>
                  </div>
                  <ExternalLink size={14} className="text-slate-600 group-hover:text-blue-400" />
                </div>
                <div className="w-full h-1 bg-white/5 rounded-full mt-3 overflow-hidden">
                  <div className="w-3/4 h-full bg-blue-500 rounded-full" />
                </div>
              </div>
              
              <div className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-blue-500/30 transition-all cursor-pointer group">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">Gestão de Tráfego - Março</h4>
                    <p className="text-xs text-slate-500 mt-1">SLA: 92% • Entrega em 5 dias</p>
                  </div>
                  <ExternalLink size={14} className="text-slate-600 group-hover:text-blue-400" />
                </div>
                <div className="w-full h-1 bg-white/5 rounded-full mt-3 overflow-hidden">
                  <div className="w-1/2 h-full bg-blue-500 rounded-full" />
                </div>
              </div>
            </div>
          </div>

          <div className="glass rounded-2xl p-6 border-white/5">
            <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
              <Calendar size={18} className="text-blue-400" /> Histórico de Atividades
            </h3>
            <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[1px] before:bg-white/10">
              <div className="relative pl-8">
                <div className="absolute left-0 top-1 w-6 h-6 rounded-full glass border-white/10 flex items-center justify-center text-[10px] text-blue-400">
                  <DollarSign size={10} />
                </div>
                <p className="text-sm text-white">Pagamento Confirmado</p>
                <p className="text-xs text-slate-500 mt-1">Referente à fatura #2890 • Ontem às 14:20</p>
              </div>
              <div className="relative pl-8">
                <div className="absolute left-0 top-1 w-6 h-6 rounded-full glass border-white/10 flex items-center justify-center text-[10px] text-green-400">
                  <Zap size={10} />
                </div>
                <p className="text-sm text-white">Projeto Finalizado</p>
                <p className="text-xs text-slate-500 mt-1">Design de Landing Page • 02/03/2026</p>
              </div>
              <div className="relative pl-8">
                <div className="absolute left-0 top-1 w-6 h-6 rounded-full glass border-white/10 flex items-center justify-center text-[10px] text-slate-400">
                  <Mail size={10} />
                </div>
                <p className="text-sm text-white">E-mail Enviado</p>
                <p className="text-xs text-slate-500 mt-1">Proposta comercial enviada • 28/02/2026</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
