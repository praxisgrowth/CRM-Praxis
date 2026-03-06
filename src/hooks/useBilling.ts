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
  const { data, error } = await (supabase as any)
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
    .select('id')
    .single()
  if (error) throw new Error(error.message)

  // Fire-and-forget — falha silenciosa, cron de fallback recupera
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

export async function createSubscription(input: CreateSubscriptionInput): Promise<void> {
  const { data, error } = await (supabase as any)
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
    .select('id')
    .single()
  if (error) throw new Error(error.message)

  // Fire-and-forget — falha silenciosa, cron de fallback recupera
  const baseUrl = (import.meta.env.VITE_N8N_WEBHOOK_URL as string | undefined) ?? ''
  if (baseUrl && data?.id) {
    fetch(`${baseUrl}/webhook/finance/create-subscription`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type:         'subscription',
        subscription_id: data.id,
        client_id:    input.client_id,
        client_name:  input.client_name,
        description:  input.description,
        value:        input.value,
        billing_type: input.billing_type,
        cycle:        input.cycle,
      }),
    }).catch(() => { /* silent fail */ })
  }
}

export interface UpdatePaymentInput {
  asaas_id: string;
  payment_id: string;
  due_date: string; // YYYY-MM-DD
  value: number;
  description: string;
  client_name: string;
  client_phone: string; // só dígitos, sem 55
  client_email: string;
}

export async function updatePayment(input: UpdatePaymentInput): Promise<void> {
  const baseUrl =
    (import.meta.env.VITE_N8N_WEBHOOK_URL as string | undefined) ?? "";
  if (!baseUrl) throw new Error("Webhook URL não configurada");
  const res = await fetch(`${baseUrl}/webhook/finance/postpone`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Erro ao atualizar cobrança");
}

export async function cancelPayment(
  asaas_id: string,
  payment_id: string,
  client_name: string,
  client_phone: string,
  client_email: string,
  description: string,
): Promise<void> {
  const baseUrl =
    (import.meta.env.VITE_N8N_WEBHOOK_URL as string | undefined) ?? "";
  if (!baseUrl) throw new Error("Webhook URL não configurada");
  const res = await fetch(`${baseUrl}/webhook/finance/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      asaas_id,
      payment_id,
      client_name,
      client_phone,
      client_email,
      description,
    }),
  });
  if (!res.ok) throw new Error("Erro ao cancelar cobrança");
}

export async function refundPayment(
  asaas_id: string,
  payment_id: string,
  client_name: string,
  client_phone: string,
  client_email: string,
  description: string,
): Promise<void> {
  const baseUrl =
    (import.meta.env.VITE_N8N_WEBHOOK_URL as string | undefined) ?? "";
  if (!baseUrl) throw new Error("Webhook URL não configurada");
  const res = await fetch(`${baseUrl}/webhook/finance/refund`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      asaas_id,
      payment_id,
      client_name,
      client_phone,
      client_email,
      description,
    }),
  });
  if (!res.ok) throw new Error("Erro ao estornar cobrança");
}

export async function resendPayment(asaas_id: string): Promise<void> {
  const baseUrl =
    (import.meta.env.VITE_N8N_WEBHOOK_URL as string | undefined) ?? "";
  if (!baseUrl) return;
  fetch(`${baseUrl}/webhook/finance/resend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ asaas_id }),
  }).catch(() => {});
}
