// src/lib/nexus-utils.ts
// Configurações e helpers centralizados para o módulo Nexus.
// Importado por PortalNexus.tsx (Admin) e NexusPortal.tsx (Cliente).

import { ImageIcon, FileText, Video, File } from 'lucide-react'
import type { NexusFileType, NexusFileStatus } from '../hooks/useNexus'

export const TYPE_CONFIG: Record<NexusFileType, { icon: React.ElementType; color: string; label: string }> = {
  imagem:    { icon: ImageIcon, color: '#6366f1', label: 'Imagem'    },
  copy:      { icon: FileText,  color: '#8b5cf6', label: 'Copy'      },
  video:     { icon: Video,     color: '#3b82f6', label: 'Vídeo'     },
  documento: { icon: File,      color: '#10b981', label: 'Documento' },
}

export const STATUS_CONFIG: Record<NexusFileStatus, { color: string; bg: string; label: string }> = {
  pendente: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  label: 'Aguardando' },
  aprovado: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: 'Aprovado'   },
  ajuste:   { color: '#f97316', bg: 'rgba(249,115,22,0.12)', label: 'Em Ajuste'  },
  duvida:   { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', label: 'Em Dúvida'  },
}

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}
