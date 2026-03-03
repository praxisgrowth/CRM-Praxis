-- Função para registrar mudança de estágio
CREATE OR REPLACE FUNCTION public.fn_lead_stage_change_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.stage IS DISTINCT FROM NEW.stage) THEN
    INSERT INTO public.lead_activities (lead_id, type, description, metadata, created_by)
    VALUES (
      NEW.id, 
      'stage_change', 
      'Estágio alterado de ' || OLD.stage || ' para ' || NEW.stage || '.',
      jsonb_build_object('old_stage', OLD.stage, 'new_stage', NEW.stage),
      'Sistema'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger de Update
DROP TRIGGER IF EXISTS trg_lead_stage_change_activity ON public.leads;
CREATE TRIGGER trg_lead_stage_change_activity
  AFTER UPDATE OF stage ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.fn_lead_stage_change_activity();

-- Notifica o PostgREST para recarregar o schema cache
NOTIFY pgrst, 'reload schema';
