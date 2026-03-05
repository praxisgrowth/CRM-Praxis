import { supabase } from '../lib/supabase'
import type { AsaasBillingType, SubscriptionCycle } from '../lib/database.types'

export interface CreatePaymentInput {
  client_id:   string
  client_name: string
  description: string
  value:       number
  billing_type: AsaasBillingType
  due_date:    string   // ISO date YYYY-MM-DD
}

export interface CreateSubscriptionInput {
  client_id:   string
  client_name: string
  description: string
  value:       number
  billing_type: AsaasBillingType
  cycle:       SubscriptionCycle
}

export async function createPayment(input: CreatePaymentInput): Promise<void> {
  const { error } = await (supabase as any)
    .from('financial_payments')
    .insert({
      client_id:         input.client_id,
      client_name:       input.client_name,
      description:       input.description,
      value:             input.value,
      type:              'ONE_OFF',
      billing_type:      input.billing_type,
      due_date:          input.due_date,
      status:            'PENDING',
      asaas_id:          null,
      asaas_customer_id: null,
      payment_link:      null,
    })
  if (error) throw new Error(error.message)

  // Dispara webhook n8n para criação imediata
  try {
    const baseUrl = (import.meta.env.VITE_N8N_WEBHOOK_URL as string | undefined) ?? ''
    await fetch(`${baseUrl}/webhook/finance/create-charge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'payment', client_id: input.client_id, value: input.value, due_date: input.due_date }),
    })
  } catch (err) {
    console.error('Falha ao acionar n8n (cobrança já salva no banco local):', err)
  }
}

export async function createSubscription(input: CreateSubscriptionInput): Promise<void> {
  const { error } = await (supabase as any)
    .from('financial_subscriptions')
    .insert({
      client_id:   input.client_id,
      client_name: input.client_name,
      description: input.description,
      value:       input.value,
      billing_type: input.billing_type,
      cycle:       input.cycle,
      status:      'ACTIVE',
      asaas_id:    null,
    })
  if (error) throw new Error(error.message)

  // Dispara webhook n8n para criação imediata
  try {
    const baseUrl = (import.meta.env.VITE_N8N_WEBHOOK_URL as string | undefined) ?? ''
    await fetch(`${baseUrl}/webhook/finance/create-charge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'subscription', client_id: input.client_id, value: input.value, cycle: input.cycle }),
    })
  } catch (err) {
    console.error('Falha ao acionar n8n (assinatura já salva no banco local):', err)
  }
}
