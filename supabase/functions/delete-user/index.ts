// supabase/functions/delete-user/index.ts
// Deploy: npx supabase functions deploy delete-user --project-ref xmfdrtrwpymgkvaeeyyq --no-verify-jwt

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  let debugInfo = ''
  try {
    console.log('--- Início delete-user ---')
    if (req.method !== 'POST') throw new Error('Method not allowed')

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Célula de autenticação ausente.')

    const { userId } = await req.json()
    if (!userId) throw new Error('ID do usuário é obrigatório.')
    
    debugInfo += `UserID to delete: ${userId}. `

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    // Validar caller
    const jwt = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: userErr } = await admin.auth.getUser(jwt)
    if (userErr || !caller) {
      throw new Error(`Token inválido: ${userErr?.message || 'usuário não encontrado'}`)
    }
    debugInfo += `Caller: ${caller.email}. `

    // Verificar se o caller é ADMIN
    const { data: profile, error: profileErr } = await admin
      .from('profiles').select('role').eq('id', caller.id).maybeSingle()
    
    if (profileErr || !profile) {
       throw new Error(`Erro ao validar permissões: ${profileErr?.message || 'Perfil não encontrado'}`)
    }

    if (profile.role !== 'ADMIN') {
      return new Response(JSON.stringify({ error: 'Apenas administradores podem excluir usuários.' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Não permitir se excluir
    if (caller.id === userId) {
      throw new Error('Você não pode excluir seu próprio usuário.')
    }

    console.log(`Excluindo usuário ${userId}...`)
    
    // Deletar do perfil primeiro (alguns triggers podem estar ouvindo)
    const { error: delProfileErr } = await admin.from('profiles').delete().eq('id', userId)
    if (delProfileErr) {
      console.error('Erro ao deletar profile:', delProfileErr)
    }

    const { error: delAuthErr } = await admin.auth.admin.deleteUser(userId)
    if (delAuthErr) {
      console.error('Erro ao deletar auth:', delAuthErr)
      throw new Error(`Erro ao excluir do Supabase Auth: ${delAuthErr.message}`)
    }

    console.log('Usuário excluído com sucesso!')
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    console.error('Erro na delete-user:', err.message)
    return new Response(JSON.stringify({ error: err.message, debug: debugInfo }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
