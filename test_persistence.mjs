/**
 * CRM Praxis — Sanity check de persistência no Supabase
 * Uso: node test_persistence.mjs
 *
 * Requer variáveis de ambiente:
 *   VITE_SUPABASE_URL  e  VITE_SUPABASE_ANON_KEY
 * (lidas automaticamente do .env via --env-file se Node >= 20.6,
 *  ou defina-as no shell antes de rodar)
 */

import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

// ── Carrega .env manualmente (compatível com Node < 20.6) ────────────────────
try {
  const env = readFileSync('.env', 'utf8')
  for (const line of env.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const [key, ...rest] = trimmed.split('=')
    if (key && rest.length) process.env[key.trim()] = rest.join('=').trim()
  }
} catch {
  console.warn('[setup] Arquivo .env não encontrado — usando variáveis do shell.')
}

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.error('❌  VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias.')
  process.exit(1)
}

const supabase = createClient(url, key)

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function assertUUID(val, label) {
  if (!UUID_RE.test(val)) throw new Error(`${label} não é um UUID válido: "${val}"`)
  console.log(`  ✅  ${label}: ${val}`)
}

async function run() {
  console.log('\n══════════════════════════════════════════')
  console.log(' CRM Praxis · Teste de Persistência Supabase')
  console.log('══════════════════════════════════════════\n')

  let leadId = null
  let projectId = null

  // ── 1. Inserir lead de teste ────────────────────────────────────────────────
  console.log('▶  Inserindo lead de teste...')
  {
    const { data, error } = await supabase
      .from('leads')
      .insert({
        name: '[TESTE] Lead Sanity Check',
        email: 'test@praxis-crm.dev',
        phone: null,
        stage: 'novo',
        score: 0,
        source: 'test_persistence',
      })
      .select()
      .single()

    if (error) throw new Error(`Leads insert: ${error.message}`)
    assertUUID(data.id, 'Lead ID')
    leadId = data.id
  }

  // ── 2. Inserir projeto de teste ─────────────────────────────────────────────
  console.log('▶  Inserindo projeto de teste...')
  {
    const { data, error } = await supabase
      .from('projects')
      .insert({
        name: '[TESTE] Projeto Sanity Check',
        client_name: 'Praxis Test Client',
        status: 'ativo',
        service_type: 'Teste',
        sla_percent: 100,
        due_date: null,
      })
      .select()
      .single()

    if (error) throw new Error(`Projects insert: ${error.message}`)
    assertUUID(data.id, 'Project ID')
    projectId = data.id
  }

  // ── 3. Limpeza ──────────────────────────────────────────────────────────────
  console.log('\n▶  Removendo registros de teste...')
  await supabase.from('leads').delete().eq('id', leadId)
  await supabase.from('projects').delete().eq('id', projectId)
  console.log('  ✅  Registros de teste removidos.')

  console.log('\n══════════════════════════════════════════')
  console.log(' ✅  TODOS OS TESTES PASSARAM')
  console.log('     Persistência Supabase está funcional.')
  console.log('══════════════════════════════════════════\n')
}

run().catch(err => {
  console.error('\n❌  FALHA NO TESTE:', err.message)
  process.exit(1)
})
