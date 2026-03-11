# Nexus Adjustment Webhook — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ao chamar `requestAdjustment` em `useNexus.ts`, disparar um POST fire-and-forget para `${VITE_N8N_WEBHOOK_URL}/webhook/nexus/file-adjustment` com os detalhes do arquivo e comentário do cliente.

**Architecture:** Modificação cirúrgica em `useNexus.ts` — após o insert em `nexus_approvals`, buscar o `title` do arquivo no estado local `files[]` e disparar o fetch. Nenhuma nova dependência. Tratamento de erro silencioso (não bloqueia UX do cliente).

**Tech Stack:** React, TypeScript, fetch API, Vite env vars

---

## Chunk 1: Webhook dispatch em useNexus.ts

### Task 1: Adicionar dispatch do webhook em requestAdjustment

**Files:**
- Modify: `src/hooks/useNexus.ts` (função `requestAdjustment`, linhas 98–119)

Estado atual de `requestAdjustment`:
```typescript
const requestAdjustment = async (fileId: string, comment: string) => {
  if (!comment) return
  try {
    // UPDATE nexus_files status
    // INSERT nexus_approvals
    refetch()
  } catch (err: any) {
    alert(`Erro ao solicitar ajuste: ${err.message}`)
  }
}
```

- [ ] **Step 1: Ler o arquivo atual** — confirmar estrutura de `useNexus.ts` e localizar `requestAdjustment`.

- [ ] **Step 2: Adicionar o dispatch do webhook**

Substituir a função `requestAdjustment` inteira por:

```typescript
const requestAdjustment = async (fileId: string, comment: string) => {
  if (!comment) return
  try {
    const { error: upErr } = await (supabase as any)
      .from('nexus_files')
      .update({ status: 'ajuste' })
      .eq('id', fileId)

    if (upErr) throw upErr

    const clientName = profile?.full_name ?? 'Cliente'

    await (supabase as any).from('nexus_approvals').insert({
      file_id:     fileId,
      action:      'ajuste',
      comment,
      client_name: clientName,
    })

    // ── Notificar equipe via n8n (fire-and-forget) ──────────────────
    const file = files.find(f => f.id === fileId)
    const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL
    if (webhookUrl && file) {
      fetch(`${webhookUrl}/webhook/nexus/file-adjustment`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_id:     fileId,
          file_name:   file.title,
          client_name: clientName,
          comment,
        }),
      }).catch(err => console.error('[useNexus] Falha ao notificar n8n:', err))
    }

    refetch()
  } catch (err: any) {
    alert(`Erro ao solicitar ajuste: ${err.message}`)
  }
}
```

> Nota: o `fetch` é chamado sem `await` e o `.catch` é encadeado — garante fire-and-forget. Se `VITE_N8N_WEBHOOK_URL` não estiver configurado ou o arquivo não for encontrado, o webhook é silenciosamente ignorado.

- [ ] **Step 3: Verificar TypeScript** — rodar `npx tsc --noEmit`, 0 erros.

- [ ] **Step 4: Verificar que `files` está em escopo**

`files` é declarado via `const [files, setFiles] = useState<NexusFile[]>([])` na linha 33 do hook — está no closure de `requestAdjustment`. Confirmar que a função usa `files` do estado (não de um parâmetro).

- [ ] **Step 5: Commit**
```bash
git add src/hooks/useNexus.ts
git commit -m "feat(nexus): dispatch n8n webhook on requestAdjustment"
```
