import { useState } from 'react'
import {
  Users, Search, Filter, Plus,
  ExternalLink, Mail, MapPin,
  TrendingUp, TrendingDown, Minus, Trash2, Edit2
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useClients } from '../hooks/useClients'
import { useAudit } from '../hooks/useAudit'
import { BillingOnboardingModal } from '../components/pipeline/BillingOnboardingModal'
import type { Client } from '../lib/database.types'

export function ClientsPage() {
  const { clients, loading, error, addClient, deleteClient, updateClient } = useClients()
  const { logAction } = useAudit()
  const [searchTerm, setSearchTerm]   = useState('')
  const [showNewClient, setShowNewClient] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Métricas
  const totalClients = clients.length
  const avgMRR      = clients.length > 0 ? clients.reduce((s, c) => s + c.mrr, 0) / clients.length : 0
  const avgHealth   = clients.length > 0 ? clients.reduce((s, c) => s + c.health_score, 0) / clients.length : 0

  return (
    <div className="flex flex-col h-full gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Gestão de Clientes</h2>
          <p className="text-slate-500 text-sm mt-1">Monitore a saúde e faturamento da sua base ativa.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors" size={16} />
            <input 
              type="text"
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50 transition-all w-64"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm font-medium text-slate-300 hover:bg-white/10 transition-all">
            <Filter size={16} /> Focar
          </button>
          <button
            onClick={() => setShowNewClient(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:opacity-90"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              boxShadow:  '0 4px 16px rgba(99,102,241,0.3)',
            }}
          >
            <Plus size={15} /> Novo Cliente
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total de Clientes', value: totalClients, icon: Users, color: '#00d2ff' },
          { label: 'Ticket Médio (MRR)', value: `R$ ${avgMRR.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: '#c084fc' },
          { label: 'Saúde da Base (Avg)', value: `${avgHealth.toFixed(1)}%`, icon: TrendingUp, color: '#10b981' },
        ].map((stat) => (
          <div 
            key={stat.label}
            className="p-5 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md relative overflow-hidden group"
          >
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{stat.label}</p>
                <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
              </div>
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `${stat.color}15`, border: `1px solid ${stat.color}30` }}
              >
                <stat.icon size={20} style={{ color: stat.color }} />
              </div>
            </div>
            {/* Glow Effect */}
            <div className="absolute -bottom-8 -right-8 w-24 h-24 blur-3xl rounded-full opacity-20 group-hover:opacity-40 transition-opacity pointer-events-none" style={{ background: stat.color }} />
          </div>
        ))}
      </div>

      {/* Table Section */}
      <div className="flex-1 bg-white/5 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-md flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <p className="text-red-400 font-medium mb-2">Erro ao carregar dados</p>
            <p className="text-slate-500 text-sm">{error}</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4 text-slate-600">
              <Search size={32} />
            </div>
            <p className="text-white font-medium">Nenhum cliente encontrado</p>
            <p className="text-slate-500 text-sm mt-1">Tente ajustar seus termos de busca.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contato & Localização</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">MRR</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Saúde</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 uppercase-none">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-white/[0.03] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center text-lg font-bold text-white uppercase overflow-hidden">
                          {client.avatar ? <img src={client.avatar} className="w-full h-full object-cover" /> : client.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link
                              to={`/comercial/clientes/${client.id}`}
                              className="text-sm font-semibold text-white hover:text-cyan-400 transition-colors"
                            >
                              {client.name}
                            </Link>
                            {(!client.cpf_cnpj || !client.cep) && (
                              <span className="px-1.5 py-0.5 text-[9px] font-bold rounded border"
                                style={{ background: 'rgba(245,158,11,0.12)', color: '#fbbf24', borderColor: 'rgba(245,158,11,0.3)' }}>
                                Incompleto
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500">{client.segment || 'Sem segmento'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Mail size={12} className="text-slate-600" /> {client.email || 'N/A'}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <MapPin size={12} className="text-slate-600" /> {client.cidade || '---'}, {client.uf || '--'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">R$ {client.mrr.toLocaleString('pt-BR')}</span>
                        {client.trend === 'up' && <TrendingUp size={12} className="text-emerald-500" />}
                        {client.trend === 'down' && <TrendingDown size={12} className="text-rose-500" />}
                        {client.trend === 'flat' && <Minus size={12} className="text-slate-600" />}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500"
                            style={{ 
                              width: `${client.health_score}%`,
                              background: client.health_score > 80 ? '#10b981' : client.health_score > 50 ? '#f59e0b' : '#ef4444',
                              boxShadow: `0 0 8px ${client.health_score > 80 ? 'rgba(16,185,129,0.3)' : '#f59e0b30'}`
                            }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500">{client.health_score}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingClient(client)}
                          className="p-2 inline-flex items-center justify-center rounded-lg bg-white/5 hover:bg-cyan-500/20 hover:text-cyan-400 text-slate-400 transition-all border border-transparent hover:border-cyan-500/30"
                          title="Editar faturamento/dados"
                        >
                          <Edit2 size={16} />
                        </button>
                        <Link 
                          to={`/comercial/clientes/${client.id}`}
                          className="p-2 inline-flex items-center justify-center rounded-lg bg-white/5 hover:bg-cyan-500/20 hover:text-cyan-400 text-slate-400 transition-all border border-transparent hover:border-cyan-500/30"
                        >
                          <ExternalLink size={16} />
                        </Link>
                        <button
                          onClick={async () => {
                            if (confirm(`Excluir cliente ${client.name}?`)) {
                              await deleteClient(client.id)
                              await logAction('Delete Client', 'client', client.id, { name: client.name })
                            }
                          }}
                          className="p-2 inline-flex items-center justify-center rounded-lg bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 transition-all border border-transparent hover:border-rose-500/30"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {showNewClient && (
        <BillingOnboardingModal
          isNew
          onClose={() => setShowNewClient(false)}
          onSave={async (data) => {
            const newClient = {
              name: data.name || '',
              email: data.email || null,
              phone: data.phone || null,
              mrr: data.mrr || 0,
              segment: data.segment || null,
              cpf_cnpj: data.cpf_cnpj || null,
              cep: data.cep || null,
              logradouro: data.logradouro || null,
              numero: data.numero || null,
              complemento: data.complemento || null,
              bairro: data.bairro || null,
              cidade: data.cidade || null,
              uf: data.uf || null,
              health_score: 100,
              trend: 'flat' as const,
              avatar: '' as string,
              asaas_id: null
            }
            await addClient(newClient)
            await logAction('Create Client', 'client', 'new', newClient as unknown as Record<string, unknown>)
            setShowNewClient(false)
          }}
        />
      )}

      {editingClient && (
        <BillingOnboardingModal
          clientId={editingClient.id}
          companyName={editingClient.name}
          initialData={editingClient}
          onClose={() => setEditingClient(null)}
          onSave={async (data) => {
            await updateClient(editingClient.id, data)
            await logAction('Update Client', 'client', editingClient.id, data as unknown as Record<string, unknown>)
            setEditingClient(null)
          }}
        />
      )}
    </div>
  )
}
