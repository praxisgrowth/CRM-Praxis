import type { PipelineStage } from '../lib/database.types'

export interface StageConfig {
  id:    PipelineStage
  label: string
  color: string
  glow:  string
}

export const PIPELINE_STAGES: StageConfig[] = [
  { id: 'prospeccao', label: 'Prospecção', color: '#6366f1', glow: 'rgba(99,102,241,0.6)'  },
  { id: 'reuniao',    label: 'Reunião',    color: '#8b5cf6', glow: 'rgba(139,92,246,0.6)'  },
  { id: 'proposta',   label: 'Proposta',   color: '#f59e0b', glow: 'rgba(245,158,11,0.6)'  },
  { id: 'negociacao', label: 'Negociação', color: '#10b981', glow: 'rgba(16,185,129,0.6)'  },
  { id: 'fechado',    label: 'Fechado',    color: '#64748b', glow: 'rgba(100,116,139,0.6)' },
]
