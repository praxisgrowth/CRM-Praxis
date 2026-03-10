-- =============================================================
-- CRIAÇÃO DE USUÁRIO ADMIN (GUSTAVO TIZONI)
-- Execute este bloco no SQL Editor do Supabase.
-- =============================================================

-- 1. Habilitar pgcrypto se não estiver habilitado
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Inserir usuário no Auth (ID aleatório)
DO $$
DECLARE
  new_user_id uuid := gen_random_uuid();
BEGIN
  -- Verificar se o usuário já existe para não dar erro
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'tizoni.gustavo@gmail.com') THEN
    
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      new_user_id,
      'authenticated',
      'authenticated',
      'tizoni.gustavo@gmail.com',
      crypt('@Tizo#293001', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Gustavo Tizoni","role":"ADMIN"}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    -- O Trigger handle_new_user() deve criar o profile automaticamente agora.
    -- Mas por garantia, se ele não criar (ex: se o trigger ainda não foi rodado),
    -- vamos garantir que o profile exista com a role correta:
    
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (new_user_id, 'tizoni.gustavo@gmail.com', 'Gustavo Tizoni', 'ADMIN')
    ON CONFLICT (id) DO UPDATE SET role = 'ADMIN';

    RAISE NOTICE 'Usuário Admin criado com sucesso!';
  ELSE
    -- Se já existe, apenas garante que é ADMIN no profile
    UPDATE public.profiles 
    SET role = 'ADMIN' 
    WHERE email = 'tizoni.gustavo@gmail.com';
    
    RAISE NOTICE 'Usuário já existia. Permissão de ADMIN garantida.';
  END IF;
END $$;
