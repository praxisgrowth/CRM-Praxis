// supabase/functions/create-client-access/index.ts
// Deploy: npx supabase functions deploy create-client-access --project-ref xmfdrtrwpymgkvaeeyyq

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  let debugInfo = ''
  try {
    console.log('--- Início create-client-access ---')
    if (req.method !== 'POST') throw new Error('Method not allowed')

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Célula de autenticação ausente.')

    const { email, password, full_name, client_id } = await req.json()
    console.log(`Criando acesso para: ${email} (${full_name}) - Client: ${client_id}`)
    debugInfo += `Email: ${email}, Client: ${client_id}. `

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    // Validar caller
    const jwt = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: userErr } = await admin.auth.getUser(jwt)
    if (userErr || !caller) {
      console.error('Erro ao validar caller:', userErr)
      throw new Error(`Token inválido: ${userErr?.message || 'usuário não encontrado'}`)
    }
    debugInfo += `Caller: ${caller.email}. `

    const { data: profile, error: profileErr } = await admin
      .from('profiles').select('role').eq('id', caller.id).maybeSingle()
    
    if (profileErr) {
       throw new Error(`Erro ao buscar perfil: ${profileErr.message}`)
    }

    if (!profile) {
      throw new Error('Perfil do administrador não encontrado.')
    }
    debugInfo += `Role no DB: ${profile.role}. `

    if (profile.role !== 'ADMIN') {
      console.warn(`Acesso negado para ${caller.email}`)
      return new Response(JSON.stringify({ 
        error: `Acesso negado: Seu nível é ${profile.role} (necessário ADMIN).`,
        debug: debugInfo
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Criando usuário no Auth...')
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role: 'CLIENT', client_id },
    })
    
    if (createErr) {
      console.error('Erro ao criar user auth:', createErr)
      throw new Error(`Erro no Supabase createUser: ${createErr.message}`)
    }

    if (created.user) {
      console.log('Criando profile CLIENT...')
      const { error: pErr } = await admin.from('profiles').upsert(
        {
          id: created.user.id,
          email,
          full_name,
          position: 'Cliente',
          role: 'CLIENT',
          client_id,
        },
        { onConflict: 'id' },
      )
      if (pErr) {
        console.error('Erro ao criar profile:', pErr)
        await admin.auth.admin.deleteUser(created.user.id)
        throw new Error(`Erro ao criar perfil de cliente: ${pErr.message}`)
      }
    }

    console.log('Acesso cliente criado com sucesso!')
    return new Response(JSON.stringify({ success: true, userId: created.user?.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    console.error('Erro na create-client-access:', err.message)
    return new Response(JSON.stringify({ error: err.message, debug: debugInfo }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
