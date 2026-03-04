-- ================================================================
-- CRM Praxis · Clients Billing Migration (Fase 3a)
-- Adiciona campos de contato e faturamento à tabela clients
-- ================================================================

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS email       TEXT,
  ADD COLUMN IF NOT EXISTS phone       TEXT,
  ADD COLUMN IF NOT EXISTS cpf_cnpj    TEXT,
  ADD COLUMN IF NOT EXISTS cep         TEXT,
  ADD COLUMN IF NOT EXISTS logradouro  TEXT,
  ADD COLUMN IF NOT EXISTS numero      TEXT,
  ADD COLUMN IF NOT EXISTS bairro      TEXT,
  ADD COLUMN IF NOT EXISTS cidade      TEXT,
  ADD COLUMN IF NOT EXISTS uf          CHAR(2);
