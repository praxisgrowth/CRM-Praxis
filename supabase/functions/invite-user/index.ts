// supabase/functions/invite-user/index.ts
// Deploy: npx supabase functions deploy invite-user --project-ref xmfdrtrwpymgkvaeeyyq

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  let debugInfo = ''
  try {
    console.log('--- Início create-user (antigo invite-user) ---')
    if (req.method !== 'POST') throw new Error('Method not allowed')

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Célula de autenticação ausente.')

    const { email, password, full_name, position, role = 'MEMBER' } = await req.json()
    console.log(`Criando usuário: ${email} (${full_name}) como ${role}`)
    debugInfo += `Email: ${email}, Role: ${role}. `

    if (!password || password.length < 6) {
      throw new Error('Uma senha de pelo menos 6 caracteres é obrigatória.')
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    // Pegar o usuário logado via JWT (ou ignorar se --no-verify-jwt estiver ativo, mas aqui pegamos do header)
    const jwt = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: userErr } = await admin.auth.getUser(jwt)
    
    if (userErr || !caller) {
      console.error('Erro ao validar caller:', userErr)
      throw new Error(`Token inválido: ${userErr?.message || 'usuário não encontrado'}`)
    }
    console.log('Caller validado: ', caller.email)
    debugInfo += `Caller: ${caller.email}. `

    // Verificar role do caller
    const { data: profile, error: profileErr } = await admin
      .from('profiles').select('role').eq('id', caller.id).maybeSingle()
    
    if (profileErr) {
      console.error('Erro ao buscar perfil do caller:', profileErr)
      throw new Error(`Erro ao buscar perfil no DB: ${profileErr.message}`)
    }

    if (!profile) {
      throw new Error(`Perfil não encontrado para o ID: ${caller.id}`)
    }

    console.log(`Role encontrado: ${profile.role}`)
    debugInfo += `Role no DB: ${profile.role}. `

    if (profile.role !== 'ADMIN') {
      console.warn(`Acesso negado: ${caller.email} tem role ${profile.role}`)
      return new Response(JSON.stringify({ 
        error: `Acesso negado: Seu usuário tem nível ${profile.role} (necessário ADMIN).`,
        debug: debugInfo
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Criar usuário diretamente no Auth
    console.log('Executando createUser no Auth...')
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role },
    })
    
    if (createErr) {
      console.error('Erro no Supabase Auth CreateUser:', createErr)
      throw new Error(`Erro no Supabase Auth: ${createErr.message}`)
    }

    if (created.user) {
      console.log('Criando profile associado...')
      const { error: upsertErr } = await admin.from('profiles').upsert(
        { id: created.user.id, email, full_name, position: position ?? null, role },
        { onConflict: 'id' },
      )
      if (upsertErr) {
        console.error('Erro ao criar profile inicial:', upsertErr)
        // Rollback opcional
        await admin.auth.admin.deleteUser(created.user.id)
        throw new Error(`Erro ao criar perfil no banco: ${upsertErr.message}`)
      }
    }

    console.log('Sucesso!')
    return new Response(JSON.stringify({ success: true, userId: created.user?.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    console.error('Erro Crítico na Function:', err.message)
    return new Response(JSON.stringify({ error: err.message, debug: debugInfo }), {
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
