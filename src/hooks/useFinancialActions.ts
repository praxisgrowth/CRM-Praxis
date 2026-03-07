import { useState, useCallback } from 'react'

export type FinancialAction = 'cancel' | 'refund' | 'postpone' | 'resend' | 'charge' | 'duplicate'

export interface ChargePayload {
  client_id:    string
  description:  string
  value:        number
  billing_type: 'PIX' | 'BOLETO' | 'CREDIT_CARD'
  due_date?:    string
}

export interface ActionPayload {
  asaas_id:     string
  payment_id:   string
  due_date?:    string
  value?:       number
  description?: string
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
    const key = makeKey(action, payload.payment_id)
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

  return { execute, isLoading }
}
