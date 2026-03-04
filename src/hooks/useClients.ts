import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Client } from '../lib/database.types'

export interface UseClientsReturn {
  clients: Client[]
  loading: boolean
  error: string | null
  refetch: () => void
  addClient: (client: Omit<Client, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  updateClient: (id: string, updates: Partial<Client>) => Promise<void>
  deleteClient: (id: string) => Promise<void>
}

export function useClients(): UseClientsReturn {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refetch = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const { data, error: err } = await supabase
          .from('clients')
          .select('*')
          .order('name', { ascending: true })
        
        if (err) throw err
        setClients((data || []) as Client[])
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erro ao carregar clientes'
        setError(msg)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [tick])

  const addClient = useCallback(async (input: Omit<Client, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error: err } = await (supabase as any)
      .from('clients')
      .insert(input)
      .select()
      .single()

    if (err) throw err
    setClients(prev => [...prev, data as Client])
  }, [])

  const updateClient = useCallback(async (id: string, updates: Partial<Client>) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))
    const { error: err } = await (supabase as any)
      .from('clients')
      .update(updates)
      .eq('id', id)
    
    if (err) {
      console.error('[updateClient]', err.message)
      refetch()
    }
  }, [refetch])

  const deleteClient = useCallback(async (id: string) => {
    setClients(prev => prev.filter(c => c.id !== id))
    const { error: err } = await (supabase as any)
      .from('clients')
      .delete()
      .eq('id', id)
    
    if (err) {
      console.error('[deleteClient]', err.message)
      refetch()
    }
  }, [refetch])

  return { clients, loading, error, refetch, addClient, updateClient, deleteClient }
}
