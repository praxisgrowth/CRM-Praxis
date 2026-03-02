import { Send, Image, Paperclip, Smile, Zap, MessageCircle } from 'lucide-react'
import { useState } from 'react'
import type { Lead } from '../../lib/database.types'

interface Props {
  lead: Lead
}

const QUICK_REPLIES = [
  { label: 'Agendar Reunião', icon: Zap },
  { label: 'Enviar Proposta', icon: Zap },
  { label: 'Pedir Faturamento', icon: Zap },
]

export function SDRChat({ lead }: Props) {
  const [msg, setMsg] = useState('')

  return (
    <div className="flex flex-col h-full bg-black/20 overflow-hidden">
      {/* Header do Chat */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
            <MessageCircle size={16} />
          </div>
          <div>
            <p className="text-xs font-semibold text-white">WhatsApp Direct</p>
            <p className="text-[10px] text-emerald-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Online para conversar
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {QUICK_REPLIES.map(qr => (
            <button 
              key={qr.label}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-[10px] font-bold border border-emerald-500/20 transition-all flex items-center gap-1.5"
            >
              <qr.icon size={10} />
              {qr.label}
            </button>
          ))}
        </div>
      </div>

      {/* Área de Mensagens (Mock) */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="flex flex-col gap-4">
           {/* Balão do Sistema */}
           <div className="mx-auto bg-white/5 rounded-full px-4 py-1 border border-white/5">
              <p className="text-[10px] text-slate-500 font-medium">Cadência iniciada hoje às 09:42</p>
           </div>

           {/* Balão do Lead */}
           <div className="flex items-end gap-2 max-w-[80%]">
              <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] text-blue-400 font-bold flex-shrink-0">
                {lead.name[0]}
              </div>
              <div className="bg-white/5 rounded-2xl rounded-bl-none p-3 border border-white/5">
                <p className="text-xs text-slate-300">
                  Olá! Recebi o interesse de vocês. Como funciona o processo de assessoria?
                </p>
                <p className="text-[9px] text-slate-600 mt-1 text-right italic">09:45</p>
              </div>
           </div>

           {/* Balão do SDR (vazio por enquanto) */}
           <div className="flex flex-col items-center justify-center flex-1 opacity-20 py-20 grayscale">
             <MessageCircle size={48} className="text-slate-500 mb-2" />
             <p className="text-xs text-slate-500 font-medium">O histórico de conversa aparecerá aqui</p>
           </div>
        </div>
      </div>

      {/* Input de Mensagem */}
      <div className="p-4 border-t border-white/5 bg-white/[0.01]">
        <div className="relative group">
          <textarea
            value={msg}
            onChange={e => setMsg(e.target.value)}
            placeholder={`Responder para ${lead.name.split(' ')[0]}...`}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-xs text-white outline-none focus:border-emerald-500/50 transition-all resize-none min-h-[44px] max-h-32"
          />
          <button className="absolute right-2 bottom-2 p-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20">
            <Send size={14} />
          </button>
        </div>
        <div className="flex items-center gap-4 mt-3 px-1">
           <button className="text-slate-500 hover:text-emerald-400 transition-colors"><Zap size={14} /></button>
           <button className="text-slate-500 hover:text-emerald-400 transition-colors"><Image size={14} /></button>
           <button className="text-slate-500 hover:text-emerald-400 transition-colors"><Paperclip size={14} /></button>
           <button className="text-slate-500 hover:text-emerald-400 transition-colors ml-auto"><Smile size={14} /></button>
        </div>
      </div>
    </div>
  )
}
