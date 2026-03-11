-- supabase/social_selling_migration.sql
-- Adiciona coluna category à tabela leads para separar funil CRM de Social Selling
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'crm';

-- Garante que registros existentes fiquem como 'crm'
UPDATE leads SET category = 'crm' WHERE category IS NULL OR category = '';
