// ================================================================
// Supabase Edge Function: asaas-integration  (v2)
// Proxy seguro para a API Asaas — chave NUNCA exposta ao frontend.
//
// Deploy:
//   supabase functions deploy asaas-integration
//
// Secrets (configurar via Supabase Dashboard → Edge Functions → Secrets):
//   ASAAS_API_KEY            = $aact_xxxxxxxxxxxx  (sandbox → $aact_)
//   ASAAS_ENV                = sandbox | production  (default: sandbox)
//   ASAAS_WEBHOOK_SECRET     = token gerado no painel Asaas
//   SUPABASE_URL             = https://<project>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY = eyJ...  (para n8n gravar via RPC)
//
// Ações disponíveis (POST body: { action, payload }):
//   create_customer  → cria/reutiliza customer no Asaas
//   create_charge    → gera cobrança PIX/BOLETO/CREDIT_CARD
//   sync_payments    → lista pagamentos PENDING/OVERDUE (para n8n cron)
// ================================================================
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function asaasBase(): string {
  const env = Deno.env.get('ASAAS_ENV') ?? 'sandbox'
  return env === 'production'
    ? 'https://api.asaas.com/v3'
    : 'https://sandbox.asaas.com/api/v3'
}

function jsonResp(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
    status,
  })
}

// ── Webhook signature validation ──────────────────────────────
async function validateWebhookSignature(req: Request): Promise<boolean> {
  const secret = Deno.env.get('ASAAS_WEBHOOK_SECRET')
  if (!secret) return true  // sem secret configurado → aceita (ambiente dev)

  const signature = req.headers.get('asaas-access-token')
  return signature === secret
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const apiKey = Deno.env.get('ASAAS_API_KEY')
    if (!apiKey) {
      throw new Error('ASAAS_API_KEY não configurada nas secrets da Edge Function.')
    }

    const body = await req.json() as {
      action:  'create_customer' | 'create_charge' | 'sync_payments'
      payload: Record<string, unknown>
    }
    const { action, payload } = body

    const base    = asaasBase()
    const headers = { 'Content-Type': 'application/json', 'access_token': apiKey }

    let result: unknown

    // ── create_customer ──────────────────────────────────────────
    if (action === 'create_customer') {
      const searchRes  = await fetch(
        `${base}/customers?externalReference=${payload.externalReference}`,
        { headers },
      )
      const searchData = await searchRes.json() as { totalCount: number; data: { id: string }[] }

      if (searchData.totalCount > 0) {
        result = searchData.data[0]
      } else {
        const createRes = await fetch(`${base}/customers`, {
          method:  'POST',
          headers,
          body: JSON.stringify({
            name:                 payload.name,
            email:                payload.email   ?? undefined,
            mobilePhone:          payload.phone   ?? undefined,
            externalReference:    payload.externalReference,
            notificationDisabled: true,           // REGRA DE OURO: silêncio total
          }),
        })
        result = await createRes.json()
      }
    }

    // ── create_charge ────────────────────────────────────────────
    if (action === 'create_charge') {
      const chargeRes = await fetch(`${base}/payments`, {
        method:  'POST',
        headers,
        body: JSON.stringify({
          customer:             payload.asaasCustomerId,
          billingType:          payload.billingType ?? 'PIX',
          value:                payload.value,
          dueDate:              payload.dueDate,
          description:          payload.description,
          externalReference:    payload.externalReference ?? undefined,
          notificationDisabled: true,             // REGRA DE OURO: silêncio total
        }),
      })
      result = await chargeRes.json()
    }

    // ── sync_payments ────────────────────────────────────────────
    // Usado pelo n8n (cron diário) para buscar pagamentos PENDING ou OVERDUE
    // e comparar com o que está no CRM.
    if (action === 'sync_payments') {
      const statuses = (payload.statuses as string[]) ?? ['PENDING', 'OVERDUE']
      const limit    = (payload.limit   as number)    ?? 100

      const allPayments: unknown[] = []

      for (const status of statuses) {
        const url  = `${base}/payments?status=${status}&limit=${limit}`
        const res  = await fetch(url, { headers })
        const data = await res.json() as { data: unknown[] }
        if (Array.isArray(data.data)) {
          allPayments.push(...data.data)
        }
      }

      result = { payments: allPayments, count: allPayments.length }
    }

    if (!result) {
      throw new Error(`Ação desconhecida: ${action}`)
    }

    return jsonResp(result)

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[asaas-integration]', message)
    return jsonResp({ error: message }, 500)
  }
})
