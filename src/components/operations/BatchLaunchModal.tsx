// src/components/operations/BatchLaunchModal.tsx
// Modal para lançar as tarefas padrão (project_templates) em um projeto existente.
// Usa 2-pass insert: pass 1 cria todas as tasks, pass 2 resolve depends_on_id.
import { useState, useEffect } from 'react'
import { X, Rocket, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { supabase as _supabase } from '../../lib/supabase'
import type { ProjectWithTasks } from '../../hooks/useOperations'
import type { ProjectTemplate } from '../../lib/database.types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = _supabase as unknown as { from(t: string): any }

interface Props {
  projects: ProjectWithTasks[]
  onClose: () => void
  onDone: () => void
}

const inputStyle = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  color: '#e2e8f0',
  outline: 'none',
  padding: '10px 12px',
  fontSize: 13,
  width: '100%',
} as const

type Phase = 'select' | 'confirm' | 'running' | 'done' | 'error'

export function BatchLaunchModal({ projects, onClose, onDone }: Props) {
  const [templates, setTemplates] = useState<ProjectTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [projectId, setProjectId] = useState('')
  const [phase, setPhase] = useState<Phase>('select')
  const [error, setError] = useState<string | null>(null)
  const [launched, setLaunched] = useState(0)

  useEffect(() => {
    db.from('project_templates')
      .select('*')
      .order('task_number', { ascending: true })
      .then(({ data, error: err }: { data: ProjectTemplate[] | null; error: any }) => {
        if (!err) setTemplates(data ?? [])
        setLoadingTemplates(false)
      })
  }, [])

  const selectedProject = projects.find(p => p.id === projectId)

  async function handleLaunch() {
    if (!projectId || !selectedProject) return
    setPhase('running')
    setError(null)

    try {
      // ── Pass 1: Insert all tasks without depends_on_id ──────────────────
      // Map: task_number → inserted task UUID
      const taskNumberToId: Record<number, string> = {}

      for (const tpl of templates) {
        const { data, error: insertErr } = await db.from('tasks').insert({
          title:           tpl.title,
          description:     null,
          status:          'todo',
          priority:        'media',
          project_id:      projectId,
          client_id:       selectedProject.client_id ?? null,
          template_id:     tpl.id,
          assignee_id:     null,
          deadline:        null,
          estimated_hours: tpl.sla_days > 0 ? tpl.sla_days * 8 : 0,
          actual_hours:    0,
          current_timer_start: null,
          depends_on_id:   null,   // resolved in pass 2
        }).select('id').single()

        if (insertErr) throw insertErr
        taskNumberToId[tpl.task_number] = data.id
      }

      // ── Pass 2: Resolve depends_on_id ──────────────────────────────────
      for (const tpl of templates) {
        if (!tpl.depends_on_task_number) continue
        const parentId = taskNumberToId[tpl.depends_on_task_number]
        if (!parentId) continue
        const taskId = taskNumberToId[tpl.task_number]
        await db.from('tasks').update({ depends_on_id: parentId }).eq('id', taskId)
      }

      setLaunched(templates.length)
      setPhase('done')
      onDone()
    } catch (e: any) {
      setError(e.message ?? 'Erro desconhecido.')
      setPhase('error')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget && phase !== 'running') onClose() }}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(10,14,22,0.99)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Rocket size={15} style={{ color: '#6366f1' }} />
            Lançar Tarefas Padrão
          </h3>
          {phase !== 'running' && (
            <button onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-white/10"
              style={{ color: '#475569' }}>
              <X size={15} />
            </button>
          )}
        </div>

        <div className="p-6 space-y-4">
          {/* Phase: select */}
          {(phase === 'select' || phase === 'confirm') && (
            <>
              {loadingTemplates ? (
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <Loader2 size={14} className="animate-spin" /> Carregando templates…
                </div>
              ) : templates.length === 0 ? (
                <div className="text-sm text-slate-500">
                  Nenhum template em <code className="text-slate-400">project_templates</code>.
                  Crie templates via SQL antes de lançar.
                </div>
              ) : (
                <>
                  {/* Project selector */}
                  <div>
                    <label className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider block mb-1.5">
                      Projeto destino *
                    </label>
                    <select
                      style={{ ...inputStyle, cursor: 'pointer' }}
                      value={projectId}
                      onChange={e => { setProjectId(e.target.value); setPhase('select') }}
                    >
                      <option value="" style={{ background: '#0a0e16' }}>— Selecione o projeto —</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id} style={{ background: '#0a0e16' }}>
                          {p.client_name} · {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Summary */}
                  {projectId && (
                    <div className="rounded-xl p-4 space-y-1"
                      style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
                      <p className="text-xs font-semibold text-indigo-300">Resumo do lançamento</p>
                      <p className="text-xs text-slate-400">
                        <span className="font-bold text-white">{templates.length}</span> tarefas serão criadas
                        com dependências resolvidas (2-pass insert).
                      </p>
                      <p className="text-xs text-slate-500">
                        Projeto: <span className="text-slate-300">{selectedProject?.name}</span>
                        {' '}· Cliente: <span className="text-slate-300">{selectedProject?.client_name}</span>
                      </p>
                    </div>
                  )}

                  {/* Action */}
                  <button
                    onClick={handleLaunch}
                    disabled={!projectId || loadingTemplates}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-40"
                    style={{
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
                    }}
                  >
                    <Rocket size={14} />
                    Lançar {templates.length} tarefas
                  </button>
                </>
              )}
            </>
          )}

          {/* Phase: running */}
          {phase === 'running' && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 size={32} className="text-indigo-400 animate-spin" />
              <p className="text-sm font-semibold text-white">Criando tarefas…</p>
              <p className="text-xs text-slate-500">Pass 1: inserindo · Pass 2: resolvendo dependências</p>
            </div>
          )}

          {/* Phase: done */}
          {phase === 'done' && (
            <div className="flex flex-col items-center gap-3 py-6">
              <CheckCircle2 size={32} className="text-green-400" />
              <p className="text-sm font-semibold text-white">{launched} tarefas lançadas com sucesso!</p>
              <p className="text-xs text-slate-500">Dependências resolvidas · Status inicial: A Fazer</p>
              <button
                onClick={onClose}
                className="mt-2 px-6 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)' }}
              >
                Fechar
              </button>
            </div>
          )}

          {/* Phase: error */}
          {phase === 'error' && (
            <div className="space-y-3">
              <div className="flex items-start gap-2 px-4 py-3 rounded-xl text-sm"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
              <button
                onClick={() => setPhase('select')}
                className="w-full py-2 rounded-xl text-sm font-medium transition-all hover:bg-white/10"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8' }}
              >
                Tentar novamente
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
