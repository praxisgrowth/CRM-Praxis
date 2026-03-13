import { supabase } from '../lib/supabase'
import type { AsaasBillingType, SubscriptionCycle } from '../lib/database.types'

export interface CreatePaymentInput {
  client_id:   string
  client_name: string
  description: string
  value:       number
  billing_type: AsaasBillingType
  due_date:    string   // ISO date YYYY-MM-DD
  asaas_sync?: boolean
  category_id?: string
}

export interface CreateSubscriptionInput {
  client_id:   string
  client_name: string
  description: string
  value:       number
  billing_type: AsaasBillingType
  cycle:       SubscriptionCycle
  due_date:    string   // ISO date YYYY-MM-DD
  asaas_sync?: boolean
  category_id?: string
}

export async function createPayment(input: CreatePaymentInput): Promise<void> {
  const { data, error } = await (supabase as any)
    .from('finance_transactions')
    .insert({
      cliente_id:        input.client_id,
      description:       input.description,
      amount:            input.value,
      kind:              'income',
      forma_pagamento:   input.billing_type,
      vencimento:        input.due_date,
      date:              input.due_date,
      status:            'PENDENTE',
      category_id:       input.category_id ? parseInt(input.category_id, 10) : null,
      reference:         input.asaas_sync ? null : 'manual',
    })
    .select('id')
    .single()
  
  if (error) throw new Error(error.message)

  // Fire-and-forget — falha silenciosa, cron de fallback recupera
  if (input.asaas_sync !== false) {
    const baseUrl = (import.meta.env.VITE_N8N_WEBHOOK_URL as string | undefined) ?? ''
    if (baseUrl && data?.id) {
      fetch(`${baseUrl}/webhook/finance/create-charge`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_id:   data.id,
          client_id:    input.client_id,
          client_name:  input.client_name,
          description:  input.description,
          value:        input.value,
          billing_type: input.billing_type,
          due_date:     input.due_date,
        }),
      }).catch(() => { /* silent fail */ })
    }
  }
}

export async function createSubscription(input: CreateSubscriptionInput): Promise<void> {
  // 1. Criar o contrato recorrente
  const { data: subData, error: subError } = await (supabase as any)
    .from('finance_recurring_contracts')
    .insert({
      cliente_id:      input.client_id,
      title:           input.description,
      amount:          input.value,
      forma_pagamento: input.billing_type,
      frequency:       input.cycle.toLowerCase(), // asaas cycles align with these lowercase strings
      start_date:      input.due_date,
      next_due_date:   input.due_date,
      is_active:       true,
      category_id:     input.category_id ? parseInt(input.category_id, 10) : null,
    })
    .select('id')
    .single()
  
  if (subError) throw new Error(subError.message)

  // 2. Criar a primeira parcela no financeiro para visibilidade imediata
  // Isso evita que o usuário ache que "nada aconteceu" enquanto o n8n não processa
  const { error: txError } = await (supabase as any)
    .from('finance_transactions')
    .insert({
      cliente_id:      input.client_id,
      description:     `${input.description} (1ª Parcela)`,
      amount:          input.value,
      kind:            'income',
      forma_pagamento: input.billing_type,
      vencimento:      input.due_date,
      date:            input.due_date,
      status:          'PENDENTE',
      category_id:     input.category_id ? parseInt(input.category_id, 10) : null,
      notes:           `Assinatura #${subData?.id}`,
      reference:       input.asaas_sync === false ? 'manual' : null,
    })

  if (txError) {
    console.error('[createSubscription] Erro ao criar transação inicial:', txError)
    // Não travamos o erro principal pois o contrato foi criado
  }

  // Fire-and-forget — falha silenciosa, cron de fallback recupera
  if (input.asaas_sync !== false) {
    const baseUrl = (import.meta.env.VITE_N8N_WEBHOOK_URL as string | undefined) ?? ''
    if (baseUrl && subData?.id) {
      fetch(`${baseUrl}/webhook/finance/create-subscription`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type:         'subscription',
          subscription_id: subData.id,
          client_id:    input.client_id,
          client_name:  input.client_name,
          description:  input.description,
          value:        input.value,
          billing_type: input.billing_type,
          cycle:        input.cycle,
          due_date:     input.due_date,
        }),
      }).catch(() => { /* silent fail */ })
    }
  }
}

export interface SyncCustomerInput {
  client_id: string
  name:      string
  email:     string
  phone:     string
  cpf_cnpj:  string
}

export function syncCustomer(input: SyncCustomerInput): void {
  const baseUrl = (import.meta.env.VITE_N8N_WEBHOOK_URL as string | undefined) ?? ''
  if (!baseUrl) return
  fetch(`${baseUrl}/webhook/finance/create-customer`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  }).catch(() => { /* silent fail */ })
}

export async function deletePayment(id: string | number): Promise<void> {
  const { error } = await (supabase as any)
    .from('finance_transactions')
    .delete()
    .eq('id', id)
  
  if (error) throw new Error(error.message)
}

export async function deleteSubscription(id: string | number): Promise<void> {
  const { error } = await (supabase as any)
    .from('finance_recurring_contracts')
    .delete()
    .eq('id', id)
  
  if (error) throw new Error(error.message)
}
