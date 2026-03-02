/*
  CRM Praxis - Módulo Financeiro
  Execute este script no SQL Editor do seu projeto Supabase.
*/

-- 1. Tabela de Transações Financeiras
CREATE TABLE IF NOT EXISTS public.financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('receita', 'despesa')),
    category TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pago', 'pendente', 'atrasado')),
    date TIMESTAMPTZ DEFAULT now(),
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela de Histórico de MRR (Para Gráficos)
-- Nota: mrr_history já existe na definição database.types, vamos garantir a tabela.
CREATE TABLE IF NOT EXISTS public.mrr_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    month TEXT NOT NULL, -- Formato 'YYYY-MM'
    mrr DECIMAL(12,2) NOT NULL,
    churn_rate DECIMAL(5,2) DEFAULT 0,
    recorded_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mrr_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read Financial" ON public.financial_transactions FOR SELECT USING (true);
CREATE POLICY "Public Write Financial" ON public.financial_transactions FOR ALL USING (true);

CREATE POLICY "Public Read MRR History" ON public.mrr_history FOR SELECT USING (true);
CREATE POLICY "Public Write MRR History" ON public.mrr_history FOR ALL USING (true);

-- Dados de Exemplo
INSERT INTO public.mrr_history (month, mrr, churn_rate)
VALUES 
('2024-09', 42000.00, 1.2),
('2024-10', 45500.00, 0.8),
('2024-11', 48200.00, 1.5),
('2024-12', 51000.00, 0.5),
('2025-01', 54800.00, 0.9),
('2025-02', 58200.00, 1.1);

INSERT INTO public.financial_transactions (description, amount, type, category, status)
VALUES 
('Assinatura TechVision', 4500.00, 'receita', 'Serviço', 'pago'),
('Aluguel Escritório', 3200.00, 'despesa', 'Estrutura', 'pago'),
('Cloud Services AWS', 850.00, 'despesa', 'Software', 'pago'),
('Assinatura Nexus Corp', 2800.00, 'receita', 'Serviço', 'pendente');
