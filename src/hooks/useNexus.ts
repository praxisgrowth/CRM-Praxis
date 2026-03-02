import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { NexusFile, ApprovalAction } from '../lib/database.types'

export function useNexus() {
  const [files, setFiles] = useState<NexusFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refetch = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    async function fetchFiles() {
      setLoading(true)
      try {
        const { data, error: err } = await supabase
          .from('nexus_files')
          .select(`
            *,
            project:projects(name),
            client:leads(name)
          `)
          .order('created_at', { ascending: false })

        if (err) throw err

        // Adaptando o retorno para o formato esperado pelo frontend
        const formattedFiles = (data || []).map((f: any) => ({
          ...f,
          project_name: f.project?.name || null,
          client_name: f.client?.name || null,
        }))

        setFiles(formattedFiles as NexusFile[])
      } catch (e) {
        console.error('[useNexus] fetchFiles error:', e)
        setError(e instanceof Error ? e.message : 'Erro ao carregar arquivos do Nexus')
        
        // Dados de fallback para demonstração se houver erro
        setFiles([
          {
            id: '1',
            title: 'Logo Principal - Versão Dark',
            description: 'Arquivo final da logo para aprovação.',
            type: 'imagem',
            status: 'pendente',
            uploaded_by: 'Design Team',
            client_name: 'TechVision',
            project_name: 'Rebranding',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            url: null,
            thumbnail_url: null,
            client_id: null,
            project_id: null
          },
          {
            id: '2',
            title: 'Copy de Lançamento - Março',
            description: 'Texto para os ads de Facebook/Instagram.',
            type: 'copy',
            status: 'pendente',
            uploaded_by: 'Copywriter',
            client_name: 'Nexus Corp',
            project_name: 'Campanha Q1',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            url: null,
            thumbnail_url: null,
            client_id: null,
            project_id: null
          }
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchFiles()
  }, [tick])

  const submitApproval = useCallback(async (fileId: string, action: ApprovalAction, comment: string) => {
    try {
      // 1. Atualizar o status do arquivo (otimista)
      setFiles(prev => prev.map(f => 
        f.id === fileId 
          ? { ...f, status: action === 'sugestao' ? 'pendente' : (action as any) } 
          : f
      ))

      // 2. Registrar a aprovação/comentário no banco
      const { error: approvalErr } = await (supabase as any)
        .from('nexus_approvals')
        .insert({
          file_id: fileId,
          action,
          comment,
          user_name: 'Cliente (Portal)',
        })

      if (approvalErr) throw approvalErr

      // 3. Atualizar o status do arquivo no banco (se não for apenas sugestão)
      if (action !== 'sugestao') {
        const { error: fileErr } = await (supabase as any)
          .from('nexus_files')
          .update({ status: action })
          .eq('id', fileId)
        
        if (fileErr) throw fileErr
      }

    } catch (e) {
      console.error('[useNexus] submitApproval error:', e)
      refetch() // Reverte estado otimista em caso de erro
      throw e
    }
  }, [refetch])

  return { files, loading, error, submitApproval, refetch }
}
