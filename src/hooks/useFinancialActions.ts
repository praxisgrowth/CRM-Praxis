import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export type FinancialAction = 'cancel' | 'refund' | 'postpone' | 'resend' | 'charge' | 'duplicate'

export interface ChargePayload {
  client_id:    string
  description:  string
  value:        number
  billing_type: 'PIX' | 'BOLETO' | 'CREDIT_CARD'
  due_date?:    string
}

export interface ActionPayload {
  asaas_id:      string
  payment_id:    string | number
  due_date?:     string
  value?:        number
  description?:  string
  client_name?:  string
  client_phone?: string
  client_email?: string
}

export function useFinancialActions() {
  const [loadingKeys, setLoadingKeys] = useState<Set<string>>(new Set())

  function makeKey(action: FinancialAction, paymentId: string) {
    return `${action}:${paymentId}`
  }

  function isLoading(action: FinancialAction, paymentId: string) {
    return loadingKeys.has(makeKey(action, paymentId))
  }

  const execute = useCallback(async (
    action: FinancialAction,
    payload: ActionPayload,
  ): Promise<boolean> => {
    const key = makeKey(action, String(payload.payment_id))
    setLoadingKeys(prev => new Set(prev).add(key))

    try {
      const baseUrl = (import.meta.env.VITE_N8N_WEBHOOK_URL as string | undefined) ?? ''
      const res = await fetch(`${baseUrl}/webhook/finance/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return true
    } catch {
      return false
    } finally {
      setLoadingKeys(prev => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }, [])

  const approvePurchase = useCallback(async (requestId: number, data: any) => {
    try {
      const { 
        amount, description, category_id, recipient_name, 
        due_date, client_id, is_recurring, category_name 
      } = data

      // 1. Insert into finance_transactions
      const { error: insErr } = await (supabase as any)
        .from('finance_transactions')
        .insert({
          description: `${category_name}: ${description}`,
          amount: amount,
          kind: 'expense',
          status: 'PENDENTE',
          category_id: category_id,
          vencimento: due_date || new Date().toISOString().split('T')[0],
          cliente_id: client_id || null,
          notes: `Recebedor: ${recipient_name}${is_recurring ? ' (Recorrente)' : ''}`
        })
      if (insErr) throw insErr

      // 2. If it's recurring, create a record in finance_recurring_expenses
      if (is_recurring) {
        const { error: recErr } = await (supabase as any)
          .from('finance_recurring_expenses')
          .insert({
            category_id: category_id,
            description: `${category_name}: ${description}`,
            amount: amount,
            party_name_custom: recipient_name,
            start_date: due_date || new Date().toISOString().split('T')[0],
            next_due_date: due_date || new Date().toISOString().split('T')[0], // Will be advanced by worker
            is_active: true
          })
        if (recErr) console.error('[approvePurchase] Warning: Failed to create recurring expense record:', recErr)
      }

      // 3. Update compra_pendente
      const { error: upErr } = await (supabase as any)
        .from('compra_pendente')
        .update({ status: 'aprovado', data_aprovacao: new Date().toISOString() })
        .eq('id', requestId)
      if (upErr) throw upErr

      return true
    } catch (e) {
      console.error('[approvePurchase] Error:', e)
      return false
    }
  }, [])

  const rejectPurchase = useCallback(async (requestId: number) => {
    try {
      const { error: upErr } = await (supabase as any)
        .from('compra_pendente')
        .update({ status: 'rejeitado' })
        .eq('id', requestId)
      if (upErr) throw upErr
      return true
    } catch (e) {
      console.error('[rejectPurchase] Error:', e)
      return false
    }
  }, [])

  return { execute, isLoading, approvePurchase, rejectPurchase }
}
