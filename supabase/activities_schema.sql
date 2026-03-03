-- Tabela de Atividades de Leads
CREATE TABLE IF NOT EXISTS public.lead_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'status_change', 'note', 'contact', 'created'
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

-- Política simples para desenvolvimento (ajustar em prod)
CREATE POLICY "Permitir tudo para atividades de leads"
ON public.lead_activities
FOR ALL
USING (true)
WITH CHECK (true);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON public.lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_created_at ON public.lead_activities(created_at DESC);

-- Trigger para registrar criação automática (opcional, faremos via código para ter mais controle)
