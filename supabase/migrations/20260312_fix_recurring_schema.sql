-- Migration: Fix Recurring Schema
-- Descrição: Adiciona colunas fundamentais para faturamento e categorias em contratos recorrentes.

-- 1. Adicionar colunas faltantes em finance_recurring_contracts
ALTER TABLE finance_recurring_contracts 
ADD COLUMN IF NOT EXISTS forma_pagamento VARCHAR(40),
ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES finance_categories(id);

-- 2. Garantir que is_active seja booleano (já está na original, mas para segurança)
-- Caso queira renomear colunas para bater com o código antigo, mas o blueprint manda nomes novos.
-- Vamos garantir que o useBilling.ts use os nomes do blueprint.

-- 3. Índice para performance
CREATE INDEX IF NOT EXISTS idx_reccontr_category ON finance_recurring_contracts(category_id);
