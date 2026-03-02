import { CheckCircle2, MessageSquare, Play, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import type { Lead } from '../../lib/database.types'

interface Props {
  lead: Lead
}

const PLAYBOOK_STEPS = [
  { id: 'd1', label: 'D1: Primeiro Contato', script: 'Olá {{nome}}, vi que você se interessou pela nossa assessoria de {{nicho}}. Podemos conversar?' },
  { id: 'd2', label: 'D2: Follow-up 1', script: 'Oi {{nome}}, ainda aguardo seu retorno sobre a {{nicho}}. Tudo bem por aí?' },
  { id: 'd3', label: 'D3: Prova Social', script: '{{nome}}, olha esse resultado que tivemos com um cliente de {{nicho}} recentemente...' },
  { id: 'd4', label: 'D4: Follow-up 2', script: 'Oi {{nome}}, notei que você ainda não viu minha última mensagem.' },
  { id: 'd5', label: 'D5: Quebra de Gelo', script: '{{nome}}, só passando para avisar que as vagas de {{nicho}} estão acabando.' },
  { id: 'd6', label: 'D6: Despedida (Break-up)', script: '{{nome}}, como não tive retorno, imagino que não seja o momento agora. Sucesso!' },
]

export function SDRPlaybook({ lead }: Props) {
  const [completedSteps, setCompletedSteps] = useState<string[]>([])
  
  const replaceVars = (text: string) => {
    return text
      .replace(/{{nome}}/g, lead.name.split(' ')[0])
      .replace(/{{nicho}}/g, lead.source || 'negócio')
  }

  return (
    <div className="flex flex-col h-full bg-white/[0.01] border-r border-white/5 overflow-hidden">
      <div className="p-4 border-b border-white/5 bg-white/[0.02]">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Play size={14} className="text-blue-400" />
          Playbook de Vendas
        </h3>
        <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wider font-medium">Cadência SDR (D1 a D6)</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {PLAYBOOK_STEPS.map((step) => {
          const isCompleted = completedSteps.includes(step.id)
          const finalScript = replaceVars(step.script)

          return (
            <div 
              key={step.id} 
              className={clsx(
                "rounded-xl border transition-all duration-300",
                isCompleted ? "bg-emerald-500/5 border-emerald-500/20" : "bg-white/[0.03] border-white/10 hover:border-white/20"
              )}
            >
              <div className="p-3 flex items-center justify-between group cursor-pointer" onClick={() => {
                setCompletedSteps(prev => 
                  prev.includes(step.id) ? prev.filter(id => id !== step.id) : [...prev, step.id]
                )
              }}>
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    "w-5 h-5 rounded-full flex items-center justify-center border transition-colors",
                    isCompleted ? "bg-emerald-500 border-emerald-500 text-white" : "border-white/20 text-transparent"
                  )}>
                    <CheckCircle2 size={12} />
                  </div>
                  <span className={clsx("text-xs font-medium", isCompleted ? "text-slate-400 line-through" : "text-slate-200")}>
                    {step.label}
                  </span>
                </div>
                {!isCompleted && <ChevronRight size={14} className="text-slate-600 group-hover:text-blue-400 transition-colors" />}
              </div>

              {!isCompleted && (
                <div className="px-3 pb-3">
                  <div className="bg-black/40 rounded-lg p-2.5 border border-white/5 space-y-2">
                    <p className="text-[11px] text-slate-400 leading-relaxed italic">
                      "{finalScript}"
                    </p>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(finalScript)
                        // TODO: Alert ou toast
                      }}
                      className="w-full py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[10px] font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <MessageSquare size={12} />
                      Copiar Script
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function clsx(...classes: any[]) {
  return classes.filter(Boolean).join(' ')
}
