import { useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useSettings } from '../contexts/SettingsContext'

export function useAudit() {
  const { settings } = useSettings()
  
  const logAction = useCallback(async (
    action: string,
    entity_type: string,
    entity_id: string | null = null,
    details: Record<string, unknown> | null = null
  ) => {
    try {
      const { error } = await (supabase as any)
        .from('audit_logs')
        .insert({
          user_name: settings.user_name || 'Sistema/Admin',
          action,
          entity_type,
          entity_id,
          details: details || {},
        })
      
      if (error) throw error
    } catch (e) {
      console.error('[logAction Error]', e)
    }
  }, [settings.user_name])

  return { logAction }
}
