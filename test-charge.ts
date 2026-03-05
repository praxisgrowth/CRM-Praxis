import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envRaw = fs.readFileSync('.env', 'utf-8')
for (const line of envRaw.split('\n')) {
  if (line.includes('=')) {
    const [k, ...v] = line.split('=')
    process.env[k.trim()] = v.join('=').trim()
  }
}

const supa = createClient(
  process.env.VITE_SUPABASE_URL as string,
  process.env.VITE_SUPABASE_ANON_KEY as string
)

async function test() {
  const { data: clients, error: errClients } = await supa.from('clients').select('id, name').limit(1)
  if (errClients || !clients?.length) {
    console.log('Erro ou nenhum cliente:', errClients)
    return
  }

  const client = clients[0]
  console.log(`Usando cliente: ${client.name} (${client.id})`)

  const payload = {
    client_id: client.id,
    client_name: client.name,
    description: 'Cobrança Teste Claude',
    value: 1.99,
    type: 'ONE_OFF',
    billing_type: 'PIX',
    due_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    status: 'PENDING',
    asaas_id: null,
    asaas_customer_id: null,
    payment_link: null
  }

  const { error } = await supa.from('financial_payments').insert(payload)
  
  if (error) {
    console.log('Erro ao criar cobrança:', error)
  } else {
    console.log('Cobrança de teste criada com sucesso. Verifique no Asaas e N8N!')
  }
}

test()
