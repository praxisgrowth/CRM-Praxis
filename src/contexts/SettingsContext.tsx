import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface AgencySettings {
  id: string | null
  user_name: string
  user_email: string
  user_role: string
  user_phone: string
  agency_name: string
  logo_url: string | null
}

const DEFAULTS: AgencySettings = {
  id: null,
  user_name:   'Gustavo Moura',
  user_email:  'gustavo@praxis.com',
  user_role:   'CEO & Founder',
  user_phone:  '',
  agency_name: 'Praxis CRM',
  logo_url:    null,
}

interface SettingsContextType {
  settings: AgencySettings
  loading: boolean
  saving: boolean
  save: (updates: Partial<Omit<AgencySettings, 'id'>>) => Promise<void>
  uploadLogo: (file: File) => Promise<string | null>
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AgencySettings>(DEFAULTS)
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)

  const load = useCallback(async () => {
    try {
      const { data } = await (supabase as any)
        .from('agency_settings')
        .select('*')
        .limit(1)
        .maybeSingle()

      if (data) setSettings(data as AgencySettings)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const save = useCallback(async (updates: Partial<Omit<AgencySettings, 'id'>>) => {
    setSaving(true)
    const optimistic = { ...settings, ...updates }
    setSettings(optimistic)

    try {
      if (settings.id) {
        await (supabase as any)
          .from('agency_settings')
          .update(updates)
          .eq('id', settings.id)
      } else {
        const { data } = await (supabase as any)
          .from('agency_settings')
          .insert({ ...DEFAULTS, ...updates })
          .select()
          .maybeSingle()

        if (data) setSettings(data as AgencySettings)
      }
    } catch (e) {
      console.error('[SettingsContext] save error:', e)
      // Rollback se necessário, mas para esse caso o optimistic costuma ser ok
    } finally {
      setSaving(false)
    }
  }, [settings])

  const uploadLogo = useCallback(async (file: File): Promise<string | null> => {
    try {
      const ext  = file.name.split('.').pop()
      const path = `logos/agency-logo-${Date.now()}.${ext}`

      const { error: upErr } = await supabase.storage
        .from('agency')
        .upload(path, file, { upsert: true })

      if (upErr) throw upErr

      const { data } = supabase.storage
        .from('agency')
        .getPublicUrl(path)

      return data.publicUrl
    } catch {
      return null
    }
  }, [])

  return (
    <SettingsContext.Provider value={{ settings, loading, saving, save, uploadLogo }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}
