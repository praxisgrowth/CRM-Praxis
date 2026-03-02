import { User, Mail, Phone, Globe, Briefcase, Target, Users, TrendingUp } from 'lucide-react'
import type { Lead } from '../../lib/database.types'

interface Props {
  lead: Lead
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

export function SDRQualification({ lead }: Props) {
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

        {/* Qualificação Profunda (Fase 2) */}
        <div className="px-4 py-2 bg-purple-500/5 border-y border-purple-500/10 mb-2">
           <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest">Diagnóstico</p>
        </div>

        <section>
           <CRMField label="Faturamento Mensal" value="A definir" icon={TrendingUp} />
           <CRMField label="Tamanho do Time" value="A definir" icon={Users} />
           <CRMField label="Dores Principais" value="Mapeando..." icon={Briefcase} />
        </section>

        {/* Notas Adicionais */}
        <div className="p-4 mt-2">
           <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-2">Observações Internas</label>
           <textarea 
             className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-[11px] text-slate-400 min-h-[100px] outline-none focus:border-purple-500/50 transition-all resize-none"
             placeholder="Adicione notas sobre o comportamento do lead..."
           />
        </div>
      </div>

      {/* Action Button */}
      <div className="p-4 border-t border-white/5 space-y-2">
        <button className="w-full py-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-xs font-bold border border-purple-500/20 transition-all">
           Atualizar Lead
        </button>
        <button 
          className="w-full py-2.5 rounded-xl text-[11px] font-bold text-white transition-all duration-200"
          style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
          }}
        >
          Converter em Cliente
        </button>
      </div>
    </div>
  )
}
