import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export type NexusFileStatus = 'pendente' | 'aprovado' | 'ajuste' | 'duvida'
export type NexusFileType = 'imagem' | 'copy' | 'video' | 'documento'

export interface NexusFile {
  id: string
  client_id: string
  project_id: string | null
  title: string
  description: string | null
  type: NexusFileType
  url: string | null
  thumbnail_url: string | null
  uploaded_by: string
  status: NexusFileStatus
  created_at: string
}

export interface TeamMember {
  id: string
  name: string
  role: string | null
  email: string | null
  initials: string | null
  avatar_url: string | null
}

export function useNexus() {
  const { profile } = useAuth()
  const [files, setFiles] = useState<NexusFile[]>([])
  const [team, setTeam] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refetch = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    async function loadData() {
      if (!profile) return
      setLoading(true)
      setError(null)

      try {
        // Fetch files (RLS filters by client_id automatically for clients)
        const { data: filesData, error: filesErr } = await supabase
          .from('nexus_files')
          .select('*')
          .order('created_at', { ascending: false })

        if (filesErr) throw filesErr

        // Fetch praxis team members
        const { data: teamData, error: teamErr } = await supabase
          .from('team_members')
          .select('*')
          .order('name')

        if (teamErr) throw teamErr

        setFiles(filesData ?? [])
        setTeam(teamData ?? [])
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [profile, tick])

  const approveFile = async (fileId: string, comment?: string) => {
    try {
      const { error: upErr } = await (supabase as any)
        .from('nexus_files')
        .update({ status: 'aprovado' })
        .eq('id', fileId)

      if (upErr) throw upErr

      await (supabase as any).from('nexus_approvals').insert({
        file_id: fileId,
        action: 'aprovado',
        comment: comment ?? 'Aprovado via Portal Nexus',
        client_name: profile?.full_name ?? 'Cliente'
      })

      refetch()
    } catch (err: any) {
      alert(`Erro ao aprovar: ${err.message}`)
    }
  }

  const requestAdjustment = async (fileId: string, comment: string) => {
    if (!comment) return
    try {
      const { error: upErr } = await (supabase as any)
        .from('nexus_files')
        .update({ status: 'ajuste' })
        .eq('id', fileId)

      if (upErr) throw upErr

      const clientName = profile?.full_name ?? 'Cliente'

      await (supabase as any).from('nexus_approvals').insert({
        file_id:     fileId,
        action:      'ajuste',
        comment,
        client_name: clientName,
      })

      // ── Notificar equipe via n8n (fire-and-forget) ──────────────────
      const file = files.find(f => f.id === fileId)
      const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL
      if (webhookUrl && file) {
        fetch(`${webhookUrl}/webhook/nexus/file-adjustment`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file_id:     fileId,
            file_name:   file.title,
            client_name: clientName,
            comment,
          }),
        }).catch(err => console.error('[useNexus] Falha ao notificar n8n:', err))
      }

      refetch()
    } catch (err: any) {
      alert(`Erro ao solicitar ajuste: ${err.message}`)
    }
  }

  return {
    files,
    team,
    loading,
    error,
    refetch,
    approveFile,
    requestAdjustment
  }
}
