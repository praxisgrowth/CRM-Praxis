import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { PipelineDeal, PipelineStage, Priority } from '../lib/database.types'

export type { PipelineDeal }

export interface NewDealInput {
  title: string
  company: string
  contact_name: string
  value: number
  stage: PipelineStage
  priority: Priority
}

export interface UsePipelineReturn {
  deals: PipelineDeal[]
  loading: boolean
  error: string | null
  moveDeal: (dealId: string, newStage: PipelineStage) => Promise<void>
  addDeal: (data: NewDealInput) => Promise<void>
  deleteDeal: (dealId: string) => Promise<void>
  refetch: () => void
}


export function usePipeline(): UsePipelineReturn {
  const [deals, setDeals] = useState<PipelineDeal[]>([])
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
          .from('pipeline_deals')
          .select('*')
          .order('created_at', { ascending: true })
        
        if (err) throw err
        setDeals((data || []) as PipelineDeal[])
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erro ao carregar pipeline'
        setError(msg)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [tick])

  /** Move card — optimistic + persist */
  const moveDeal = useCallback(async (dealId: string, newStage: PipelineStage) => {
    setDeals(prev =>
      prev.map(d => d.id === dealId ? { ...d, stage: newStage } : d)
    )
    const { error: err } = await (supabase as any)
      .from('pipeline_deals')
      .update({ stage: newStage })
      .eq('id', dealId)
    if (err) {
      console.error('[moveDeal]', err.message)
      refetch() // reverte via refetch
    }
  }, [refetch])

  /** Add new deal */
  const addDeal = useCallback(async (input: NewDealInput) => {
    const optimistic: PipelineDeal = {
      ...input,
      id: `tmp-${Date.now()}`,
      tags: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    setDeals(prev => [optimistic, ...prev])

    const { data, error: err } = await (supabase as any)
      .from('pipeline_deals')
      .insert(input)
      .select()
      .single()

    if (err) {
      setDeals(prev => prev.filter(d => d.id !== optimistic.id))
      throw err
    }
    setDeals(prev => prev.map(d => d.id === optimistic.id ? data as PipelineDeal : d))
  }, [])

  /** Delete deal */
  const deleteDeal = useCallback(async (dealId: string) => {
    setDeals(prev => prev.filter(d => d.id !== dealId))
    const { error: err } = await (supabase as any)
      .from('pipeline_deals')
      .delete()
      .eq('id', dealId)
    if (err) {
      console.error('[deleteDeal]', err.message)
      refetch()
    }
  }, [refetch])

  return { deals, loading, error, moveDeal, addDeal, deleteDeal, refetch }
}
