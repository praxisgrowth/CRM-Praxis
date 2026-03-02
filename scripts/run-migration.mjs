/**
 * CRM Praxis — Migration Runner
 * Executa os SQLs pendentes via Supabase Management API.
 *
 * Uso:
 *   1. Adicione SUPABASE_SERVICE_KEY no .env (chave service_role do dashboard)
 *   2. node scripts/run-migration.mjs
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))

// ── Credenciais ───────────────────────────────────────────────
const URL_ENV  = process.env.VITE_SUPABASE_URL        || ''
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY   || ''
const SVC_KEY  = process.env.SUPABASE_SERVICE_KEY     || process.env.VITE_SUPABASE_SERVICE_KEY || ''

if (!URL_ENV) { console.error('❌  VITE_SUPABASE_URL não encontrado'); process.exit(1) }

const PROJECT_REF = URL_ENV.replace('https://', '').replace('.supabase.co', '')

// ── Arquivos SQL a executar ───────────────────────────────────
const SQL_FILES = [
  resolve(__dir, '../supabase/leads_rls_patch.sql'),
  resolve(__dir, '../supabase/nexus_migration.sql'),
]

async function execSQL(sql, label) {
  const key = SVC_KEY || ANON_KEY
  const endpoint = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({ query: sql }),
  })

  const body = await res.json().catch(() => ({}))

  if (!res.ok) {
    console.error(`❌  ${label} — HTTP ${res.status}:`, body.message || JSON.stringify(body))
    return false
  }

  console.log(`✅  ${label}`)
  return true
}

// ── Main ──────────────────────────────────────────────────────
if (!SVC_KEY) {
  console.warn('\n⚠️  SUPABASE_SERVICE_KEY não encontrado no ambiente.')
  console.warn('   Adicione ao .env:  SUPABASE_SERVICE_KEY=eyJ...')
  console.warn('   Obtenha em: https://supabase.com/dashboard/project/' + PROJECT_REF + '/settings/api\n')
}

console.log(`🚀  Executando migrações no projeto ${PROJECT_REF}\n`)

for (const file of SQL_FILES) {
  const sql  = readFileSync(file, 'utf-8')
  const name = file.split('/').pop()
  await execSQL(sql, name)
}

console.log('\n🎉  Migrações concluídas!')
