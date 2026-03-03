-- ================================================================
-- CRM Praxis · Sales → Ops Trigger  (v2 — tabela correta)
-- Quando um deal do Pipeline tem stage alterado para 'fechado',
-- cria automaticamente um projeto na tabela `projects`.
--
-- ATENÇÃO: O Pipeline usa `pipeline_deals`, NÃO `leads`.
-- Execute no Supabase Dashboard → SQL Editor
-- ================================================================

-- 0. Remove trigger antigo (v1 — estava na tabela errada)
DROP TRIGGER IF EXISTS trg_lead_closed_to_project ON public.leads;
DROP FUNCTION IF EXISTS public.fn_lead_closed_to_project();

-- 1. Função principal
CREATE OR REPLACE FUNCTION public.fn_deal_closed_to_project()
RETURNS TRIGGER AS $$
BEGIN
  -- Só dispara na transição X → 'fechado'
  IF NEW.stage = 'fechado' AND (OLD.stage IS DISTINCT FROM 'fechado') THEN

    INSERT INTO public.projects (
      name,
      client_name,
      status,
      service_type,
      sla_percent,
      due_date
    )
    VALUES (
      NEW.title,                                  -- ex: "Gestão de Tráfego Full"
      NEW.company,                                -- ex: "Construmax Engenharia"
      'ativo',
      NEW.title,                                  -- tipo de serviço = título do deal
      100,
      CURRENT_DATE + INTERVAL '30 days'
    );

  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger na tabela correta
DROP TRIGGER IF EXISTS trg_deal_closed_to_project ON public.pipeline_deals;
CREATE TRIGGER trg_deal_closed_to_project
  AFTER UPDATE OF stage ON public.pipeline_deals
  FOR EACH ROW EXECUTE FUNCTION public.fn_deal_closed_to_project();

-- 3. Notifica PostgREST para recarregar schema cache
NOTIFY pgrst, 'reload schema';
