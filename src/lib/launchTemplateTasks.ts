// src/lib/launchTemplateTasks.ts
// Lança as tarefas do template (project_templates) num projeto via 2-pass insert.
// Pass 1: insere todas as tasks sem depends_on_id.
// Pass 2: resolve depends_on_id referenciando os UUIDs do Pass 1.
import { supabase as _supabase } from './supabase'
import type { ProjectTemplate } from './database.types'

const db = _supabase as unknown as { from(t: string): any }

/**
 * @returns número de tarefas lançadas
 * @throws Error se algum insert/update falhar
 */
export async function launchTemplateTasks(
  projectId: string,
  clientId: string | null,
  serviceType?: string,
): Promise<number> {
  let tplQuery = db
    .from('project_templates')
    .select('*')
    .order('task_number', { ascending: true })

  if (serviceType) tplQuery = tplQuery.eq('service_type', serviceType)

  const { data: templates, error: tplErr } = await tplQuery

  if (tplErr) throw new Error(tplErr.message)
  if (!templates || templates.length === 0) return 0

  const tpls = templates as ProjectTemplate[]

  // ── Pass 1: inserir sem depends_on_id ──────────────────────────────────
  const taskNumberToId: Record<number, string> = {}

  for (const tpl of tpls) {
    // compute due_date = today + sla_days
    const dueDate = tpl.sla_days > 0
      ? new Date(Date.now() + tpl.sla_days * 86_400_000).toISOString().split('T')[0]
      : null

    const { data, error: insertErr } = await db.from('tasks').insert({
      title:               tpl.title,
      description:         null,
      status:              tpl.depends_on_task_number ? 'blocked' : 'todo',
      priority:            'media',
      project_id:          projectId,
      client_id:           clientId ?? null,
      template_id:         tpl.id,
      assignee_id:         null,
      due_date:            dueDate,
      deadline:            null,
      estimated_hours:     tpl.sla_days > 0 ? tpl.sla_days * 8 : 0,
      actual_hours:        0,
      current_timer_start: null,
      depends_on_id:       null,
    }).select('id').single()

    if (insertErr) throw new Error(insertErr.message)
    if (!data) throw new Error('Insert returned no data for task: ' + tpl.title)
    taskNumberToId[tpl.task_number] = data.id
  }

  // ── Pass 2: resolver depends_on_id ────────────────────────────────────
  for (const tpl of tpls) {
    if (!tpl.depends_on_task_number) continue
    const parentId = taskNumberToId[tpl.depends_on_task_number]
    if (!parentId) continue
    const taskId = taskNumberToId[tpl.task_number]
    const { error: updErr } = await db
      .from('tasks')
      .update({ depends_on_id: parentId })
      .eq('id', taskId)
    if (updErr) throw new Error(updErr.message)
  }

  return tpls.length
}
