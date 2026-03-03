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
  const { error } = await supabase
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
}
