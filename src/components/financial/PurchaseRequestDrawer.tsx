import { useState, useEffect } from 'react'
import { X, Loader2, Save, ShoppingCart, ChevronDown } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface PurchaseRequestDrawerProps {
  open: boolean
  onClose: () => void
  onSuccess: (msg: string) => void
}

interface CategoryOption { id: number; name: string }
interface ProfileOption { id: string; full_name: string }
interface ClientOption { id: string; name: string }

const FIELD_BASE: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
  padding: '12px 14px',
  color: '#f0f4ff',
  fontSize: 14,
  outline: 'none',
  transition: 'all 0.2s',
}

const SERVICE_MAP: Record<string, string[]> = {
  'FUNCIONÁRIO': ['GESTÃO DE TRÁFEGO', 'IMPLEMENTAÇÃO/GMN', 'SITE', 'SUPERVISÃO', 'COMERCIAL', 'Outro...'],
  'ANÚNCIOS': ['FACEBOOK ADS', 'GOOGLE ADS', 'YOUTUBE ADS', 'TIKTOK ADS', 'Outro...'],
  'CUSTO FIXO': ['INTERNET', 'ENERGIA', 'ALUGUEL', 'CONTABILIDADE', 'SERVIDOR/DOMÍNIO', 'Outro...'],
  'CUSTO VARIÁVEL': ['REEMBOLSO', 'MATERIAL DE ESCRITÓRIO', 'Outro...'],
  'FERRAMENTAS/SOFTWARE': ['KOMMO / CHATBOT', 'UMBLER / CHATBOT', 'BOTCONVERSA / CHATBOT', 'CANVA / DESIGN', 'Outro...'],
  'IMPOSTOS': ['DAS', 'FGTS', 'Outro...'],
  'TAXAS BANCÁRIAS': ['MANUTENÇÃO DE CONTA', 'TARIFAS', 'IOF', 'TRANSFERÊNCIA', 'Outro...'],
  'OUTROS': ['DIVERSOS', 'EXTRA', 'DESCONHECIDO', 'Outro...'],
}

export function PurchaseRequestDrawer({ open, onClose, onSuccess }: PurchaseRequestDrawerProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form State
  const [categoryName, setCategoryName] = useState('')
  const [serviceType, setServiceType] = useState('')
  const [customServiceType, setCustomServiceType] = useState('')
  const [recipientId, setRecipientId] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [amount, setAmount] = useState('R$ 0,00')
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0])
  const [refersToClient, setRefersToClient] = useState(false)
  const [clientId, setClientId] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  
  // Options State
  const [profiles, setProfiles] = useState<ProfileOption[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])

  useEffect(() => {
    if (!open) return
    
    // Load categories (expenses)
    supabase.from('finance_categories').select('id, name').eq('kind', 'expense').order('name')
      .then(({ data }) => data && setCategories(data))

    // Load profiles (team)
    supabase.from('profiles').select('id, full_name').neq('role', 'CLIENT').order('full_name')
      .then(({ data }) => data && setProfiles(data as any))

    // Load clients
    supabase.from('clients').select('id, name').order('name')
      .then(({ data }) => data && setClients(data as any))
  }, [open])

  useEffect(() => {
    if (!open) {
      setCategoryName(''); setServiceType(''); setCustomServiceType(''); setRecipientId(''); setRecipientName('');
      setAmount('R$ 0,00'); setDueDate(new Date().toISOString().split('T')[0]); setRefersToClient(false);
      setClientId(''); setIsRecurring(false); setError(null)
    }
  }, [open])

  function fmtBRL(raw: string): string {
    const n = parseInt(raw.replace(/\D/g, '') || '0', 10)
    return (n / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  async function handleSend() {
    const val = parseInt(amount.replace(/\D/g, '') || '0', 10) / 100
    if (!categoryName) return setError('Selecione a categoria.')
    if (!serviceType) return setError('Selecione o tipo do serviço.')
    if (serviceType === 'Outro...' && !customServiceType.trim()) return setError('Especifique o tipo do serviço.')
    if (categoryName === 'FUNCIONÁRIO' && !recipientId) return setError('Selecione o funcionário.')
    if (categoryName !== 'FUNCIONÁRIO' && !recipientName.trim()) return setError('Informe quem irá receber.')
    if (val <= 0) return setError('Informe o valor.')
    if (refersToClient && !clientId) return setError('Selecione o cliente.')
    
    setLoading(true); setError(null)
    try {
      const selectedCategory = categories.find(c => c.name === categoryName)
      const description = serviceType === 'Outro...' ? customServiceType : serviceType
      
      const { error: insErr } = await (supabase as any)
        .from('compra_pendente')
        .insert({
          status: 'pendente',
          dados_compra: {
            description,
            amount: val,
            category_id: selectedCategory?.id || null,
            category_name: categoryName,
            service_type: serviceType,
            custom_service_type: customServiceType,
            recipient_id: recipientId || null,
            recipient_name: recipientId ? profiles.find(p => p.id === recipientId)?.full_name : recipientName,
            due_date: dueDate,
            refers_to_client: refersToClient,
            client_id: refersToClient ? clientId : null,
            is_recurring: isRecurring,
            notes: `Lançado via "Lançar Despesa" - ${categoryName}`
          }
        })
      
      if (insErr) throw insErr
      onSuccess('Despesa lançada com sucesso! Aguarda aprovação.')
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao lançar despesa.')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  const selectedSubServices = SERVICE_MAP[categoryName] || []

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-[#080c14] border-l border-white/10 shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-250">
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-blue-500/10 to-transparent">
          <div>
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <ShoppingCart size={20} className="text-blue-400" />
              Lançar Nova Despesa
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-400">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

          {/* Categoria e Tipo do Serviço */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Categoria do Serviço</label>
              <div className="relative">
                <select 
                  style={{ ...FIELD_BASE, appearance: 'none', paddingRight: 32 }}
                  value={categoryName}
                  onChange={e => { setCategoryName(e.target.value); setServiceType(''); }}
                >
                  <option value="" style={{ background: '#080c14' }}>Selecione a categoria</option>
                  {Object.keys(SERVICE_MAP).map(cat => (
                    <option key={cat} value={cat} style={{ background: '#080c14' }}>{cat}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tipo do Serviço</label>
              <div className="relative">
                <select 
                  style={{ ...FIELD_BASE, appearance: 'none', paddingRight: 32 }}
                  value={serviceType}
                  onChange={e => setServiceType(e.target.value)}
                  disabled={!categoryName}
                >
                  <option value="" style={{ background: '#080c14' }}>Selecione</option>
                  {selectedSubServices.map(sub => (
                    <option key={sub} value={sub} style={{ background: '#080c14' }}>{sub}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Especificar "Outro" */}
          {serviceType === 'Outro...' && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Especifique o tipo do serviço</label>
              <input 
                style={FIELD_BASE} 
                placeholder="Descreva o serviço..." 
                value={customServiceType} 
                onChange={e => setCustomServiceType(e.target.value)} 
              />
            </div>
          )}

          {/* Quem irá receber */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              {categoryName === 'FUNCIONÁRIO' ? 'Funcionário que irá receber' : 'Nome da Empresa/Pessoa que irá receber'}
            </label>
            {categoryName === 'FUNCIONÁRIO' ? (
              <div className="relative">
                <select 
                  style={{ ...FIELD_BASE, appearance: 'none', paddingRight: 32 }}
                  value={recipientId}
                  onChange={e => setRecipientId(e.target.value)}
                >
                  <option value="" style={{ background: '#080c14' }}>Selecione um funcionário</option>
                  {profiles.map(p => <option key={p.id} value={p.id} style={{ background: '#080c14' }}>{p.full_name}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
              </div>
            ) : (
              <input 
                style={FIELD_BASE} 
                placeholder="Digite o nome..." 
                value={recipientName} 
                onChange={e => setRecipientName(e.target.value)} 
              />
            )}
          </div>

          {/* Valor e Vencimento */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Valor da Despesa</label>
              <input 
                style={FIELD_BASE} 
                value={amount} 
                onChange={e => setAmount(fmtBRL(e.target.value))} 
                onFocus={e => e.target.select()}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Data do Vencimento</label>
              <input 
                type="date"
                style={{ ...FIELD_BASE, colorScheme: 'dark' }} 
                value={dueDate} 
                onChange={e => setDueDate(e.target.value)}
              />
            </div>
          </div>

          {/* Vínculo com Cliente */}
          <div className="space-y-3 pt-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Esta despesa se refere a algum cliente?</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="radio" 
                  className="w-4 h-4 accent-blue-500" 
                  checked={!refersToClient} 
                  onChange={() => setRefersToClient(false)} 
                />
                <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Não</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="radio" 
                  className="w-4 h-4 accent-blue-500" 
                  checked={refersToClient} 
                  onChange={() => setRefersToClient(true)} 
                />
                <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Sim</span>
              </label>
            </div>

            {refersToClient && (
              <div className="relative animate-in fade-in slide-in-from-top-2">
                <select 
                  style={{ ...FIELD_BASE, appearance: 'none', paddingRight: 32 }}
                  value={clientId}
                  onChange={e => setClientId(e.target.value)}
                >
                  <option value="" style={{ background: '#080c14' }}>Selecione o cliente</option>
                  {clients.map(c => <option key={c.id} value={c.id} style={{ background: '#080c14' }}>{c.name}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
              </div>
            )}
          </div>

          {/* Recorrência */}
          <div className="pt-4 border-t border-white/5">
            <label className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 cursor-pointer hover:bg-blue-500/10 transition-colors group">
              <div className="flex items-center justify-center w-5 h-5 rounded border border-blue-500/30 group-hover:border-blue-500 transition-colors bg-white/5">
                {isRecurring && <Save size={12} className="text-blue-500" />}
                <input 
                  type="checkbox" 
                  className="hidden" 
                  checked={isRecurring} 
                  onChange={e => setIsRecurring(e.target.checked)} 
                />
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium text-blue-400">Tornar esta despesa recorrente (todo mês)</span>
                <p className="text-[10px] text-slate-500 mt-0.5">O sistema irá sugerir esta despesa para aprovação no próximo mês automaticamente.</p>
              </div>
            </label>
          </div>
        </div>

        <div className="p-6 border-t border-white/5 bg-white/[0.01]">
          <button 
            onClick={handleSend}
            disabled={loading}
            className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={18} />}
            Salvar Despesa
          </button>
        </div>
      </div>
    </div>
  )
}
