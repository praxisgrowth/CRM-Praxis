import { useState, useRef, useEffect } from 'react'
import { Sparkles, X, Send, Loader2, ChevronDown } from 'lucide-react'
import clsx from 'clsx'

/* ─── Types ──────────────────────────────────────── */
interface Message {
  id: number
  role: 'assistant' | 'user'
  text: string
  ts: string
}

const QUICK_PROMPTS = [
  'Quais clientes precisam de atenção urgente?',
  'Qual o MRR projetado para próximo trimestre?',
  'Listar leads com maior score hoje',
  'Resumo da saúde da operação',
]

const INITIAL_MESSAGES: Message[] = [
  {
    id: 0,
    role: 'assistant',
    text: 'Olá! Sou o Praxis AI, seu assistente de inteligência comercial. Como posso ajudar você hoje?',
    ts: now(),
  },
]

function now() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

/* Simulated AI responses */
const RESPONSES: Record<string, string> = {
  default: 'Entendido. Analisando dados do CRM...\n\n**Resultado:** Feature em desenvolvimento — integração com backend na Fase 3. Por ora, o Health Score e MRR estão sendo carregados diretamente dos componentes.',
  atenção: '⚠️ **Clientes que precisam de atenção:**\n\n• **Retail Max** · Score 43 · Tendência negativa\n• **DataFlow** · Score 65 · Estagnado há 3 semanas\n\nRecomendo agendar revisão de entregáveis esta semana.',
  mrr: '📈 **Projeção MRR — Q2 2025:**\n\nBase atual: **R$84k**\nGrowth rate: **~6.5%/mês**\nProjeção: **R$95k–R$98k**\n\nAssumindo churn atual de 2.1% e pipeline de R$12k em negociação.',
  leads: '🎯 **Top Leads por Score:**\n\n1. Construmax Engenharia · 94 pts\n2. FinScale Ltda · 88 pts\n3. Agro Dinâmico · 82 pts\n\nTodos com follow-up pendente há +48h.',
  operação: '✅ **Saúde da Operação:**\n\nSLA Geral: **97%** ↑\nTickets abertos: **12** (3 críticos)\nEntregas esta semana: **8/9** concluídas\n\nAlerta: projeto DataFlow com entrega atrasada em 2 dias.',
}

function getResponse(text: string): string {
  const t = text.toLowerCase()
  if (t.includes('atenção') || t.includes('urgente')) return RESPONSES['atenção']
  if (t.includes('mrr') || t.includes('receita') || t.includes('trimestre')) return RESPONSES['mrr']
  if (t.includes('leads') || t.includes('score')) return RESPONSES['leads']
  if (t.includes('operação') || t.includes('saúde')) return RESPONSES['operação']
  return RESPONSES['default']
}

/* ─── Message bubble ─────────────────────────────── */
function Bubble({ msg }: { msg: Message }) {
  const isAI = msg.role === 'assistant'
  return (
    <div className={clsx('flex gap-2.5', !isAI && 'flex-row-reverse')}>
      {isAI && (
        <div
          className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
        >
          <Sparkles size={12} className="text-white" />
        </div>
      )}
      <div className={clsx('max-w-[82%] space-y-1', !isAI && 'items-end flex flex-col')}>
        <div
          className="px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed whitespace-pre-line"
          style={
            isAI
              ? { background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#cbd5e1' }
              : { background: 'rgba(99,102,241,0.85)', color: '#fff' }
          }
          dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
        />
        <p className="text-[10px] text-slate-600">{msg.ts}</p>
      </div>
    </div>
  )
}

/* ─── AI Assistant ───────────────────────────────── */
export function AIAssistant() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  function send(text: string) {
    if (!text.trim() || loading) return
    const userMsg: Message = { id: Date.now(), role: 'user', text: text.trim(), ts: now() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    setTimeout(() => {
      const aiMsg: Message = { id: Date.now() + 1, role: 'assistant', text: getResponse(text), ts: now() }
      setMessages(prev => [...prev, aiMsg])
      setLoading(false)
    }, 900 + Math.random() * 600)
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-13 h-13 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-300 glow-active"
        style={{
          width: 52,
          height: 52,
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          boxShadow: '0 8px 32px rgba(99,102,241,0.4)',
        }}
        title="Praxis AI"
      >
        {open ? <ChevronDown size={20} className="text-white" /> : <Sparkles size={20} className="text-white" />}
      </button>

      {/* Chat panel */}
      <div
        className={clsx(
          'fixed bottom-[72px] right-6 z-50 w-[360px] rounded-2xl overflow-hidden transition-all duration-300 origin-bottom-right',
          open ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-95 opacity-0 pointer-events-none',
        )}
        style={{
          background: 'rgba(8, 12, 20, 0.95)',
          border: '1px solid rgba(99,102,241,0.25)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.1)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3.5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(99,102,241,0.08)' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            >
              <Sparkles size={14} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Praxis AI</p>
              <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                Online
              </p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex flex-col gap-4 p-4 overflow-y-auto" style={{ height: 320 }}>
          {messages.map(m => <Bubble key={m.id} msg={m} />)}
          {loading && (
            <div className="flex gap-2.5">
              <div
                className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
              >
                <Sparkles size={12} className="text-white" />
              </div>
              <div
                className="px-3.5 py-3 rounded-2xl flex items-center gap-1.5"
                style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}
              >
                <Loader2 size={12} className="text-indigo-400 animate-spin" />
                <span className="text-xs text-slate-400">Analisando...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick prompts */}
        <div
          className="px-3 pb-2 flex gap-1.5 overflow-x-auto scrollbar-hide flex-nowrap"
          style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
        >
          {QUICK_PROMPTS.map(p => (
            <button
              key={p}
              onClick={() => send(p)}
              className="flex-shrink-0 text-[10px] px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-colors mt-2"
              style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.15)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.1)')}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input */}
        <div
          className="flex items-center gap-2 px-3 py-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send(input)}
            placeholder="Pergunte ao Praxis AI..."
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 outline-none"
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 flex-shrink-0"
            style={{
              background: input.trim() && !loading ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.05)',
            }}
          >
            <Send size={13} className={input.trim() && !loading ? 'text-white' : 'text-slate-600'} />
          </button>
        </div>
      </div>
    </>
  )
}
