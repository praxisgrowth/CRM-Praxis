-- Migração de Categorias para o Novo Fluxo de Despesas
-- Data: 2026-03-13

-- 1. Limpar categorias de despesa antigas que não batem com a nova estrutura
-- (Opcional, mas recomendado para manter a consistência pedida)
DELETE FROM finance_categories 
WHERE kind = 'expense' 
AND name NOT IN (
    'FUNCIONÁRIO', 
    'ANÚNCIOS', 
    'CUSTO FIXO', 
    'CUSTO VARIÁVEL', 
    'FERRAMENTAS/SOFTWARE', 
    'IMPOSTOS', 
    'TAXAS BANCÁRIAS', 
    'OUTROS'
);

-- 2. Inserir as novas categorias se não existirem
INSERT INTO finance_categories (name, kind)
SELECT name, 'expense'
FROM (VALUES 
    ('FUNCIONÁRIO'), 
    ('ANÚNCIOS'), 
    ('CUSTO FIXO'), 
    ('CUSTO VARIÁVEL'), 
    ('FERRAMENTAS/SOFTWARE'), 
    ('IMPOSTOS'), 
    ('TAXAS BANCÁRIAS'), 
    ('OUTROS')
) AS t(name)
WHERE NOT EXISTS (
    SELECT 1 FROM finance_categories 
    WHERE finance_categories.name = t.name 
    AND finance_categories.kind = 'expense'
);

-- 3. (Opcional) Adicionar coluna para sub-categorias se desejado no futuro
-- Por enquanto, usaremos hardcoded conforme pedido pelo usuário.
