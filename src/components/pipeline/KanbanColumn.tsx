import { useDroppable } from '@dnd-kit/core'
import clsx from 'clsx'
import { DealCard } from './DealCard'
import type { PipelineDeal, PipelineStage } from '../../lib/database.types'

export interface ColumnConfig {
  id: PipelineStage
  label: string
  color: string
  glow: string
}

interface Props {
  column: ColumnConfig
  deals: PipelineDeal[]
  onDelete: (id: string) => void
  activeDealId: string | null
  bulkMode?: boolean
  selectedIds?: Set<string>
  onToggleCard?: (id: string, checked: boolean) => void
  onToggleAll?: (ids: string[], selectAll: boolean) => void
}

function formatTotal(deals: PipelineDeal[]) {
  const total = deals.reduce((s, d) => s + d.value, 0)
  if (total >= 1000) return `R$${(total / 1000).toFixed(0)}k`
  return `R$${total}`
}

export function KanbanColumn({
  column, deals, onDelete, activeDealId,
  bulkMode = false, selectedIds = new Set(), onToggleCard, onToggleAll,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  const columnIds    = deals.map(d => d.id)
  const allSelected  = columnIds.length > 0 && columnIds.every(id => selectedIds.has(id))
  const someSelected = columnIds.some(id => selectedIds.has(id)) && !allSelected

  function handleToggleAll() {
    onToggleAll?.(columnIds, !allSelected)
  }

  return (
    <div className="flex flex-col min-w-[260px] max-w-[260px]">
      {/* Column header */}
      <div
        className="flex items-center justify-between px-3 py-2.5 rounded-xl mb-2"
        style={{
          background: `${column.color}12`,
          border: `1px solid ${column.color}25`,
        }}
      >
        <div className="flex items-center gap-2">
          {/* Bulk: select-all checkbox */}
          {bulkMode && (
            <button
              onClick={handleToggleAll}
              className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all duration-150"
              style={{
                background: allSelected
                  ? column.color
                  : someSelected
                  ? `${column.color}40`
                  : 'rgba(255,255,255,0.08)',
                border: `1px solid ${allSelected || someSelected ? column.color : 'rgba(255,255,255,0.2)'}`,
              }}
              title={allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
            >
              {allSelected && (
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
              {someSelected && !allSelected && (
                <span className="w-1.5 h-px rounded-full bg-white block" />
              )}
            </button>
          )}

          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: column.color, boxShadow: `0 0 6px ${column.glow}` }}
          />
          <span className="text-xs font-semibold text-white">{column.label}</span>
          <span
            className="text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: `${column.color}25`, color: column.color }}
          >
            {deals.length}
          </span>
        </div>
        <span className="text-[10px] font-semibold" style={{ color: column.color }}>
          {formatTotal(deals)}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={clsx(
          'flex-1 flex flex-col gap-1.5 rounded-xl p-2 min-h-[120px] transition-all duration-200',
          isOver
            ? 'outline outline-2 outline-offset-[-2px]'
            : 'outline outline-2 outline-transparent',
        )}
        style={{
          background: isOver ? `${column.color}08` : 'rgba(255,255,255,0.02)',
          outlineColor: isOver ? `${column.color}50` : undefined,
        }}
      >
        {deals.map(deal => (
          <DealCard
            key={deal.id}
            deal={deal}
            onDelete={onDelete}
            isDragOverlay={deal.id === activeDealId}
            bulkMode={bulkMode}
            checked={selectedIds.has(deal.id)}
            onCheck={onToggleCard}
          />
        ))}

        {deals.length === 0 && (
          <div className="flex-1 flex items-center justify-center min-h-[80px]">
            <p
              className="text-[11px] text-center px-4 py-6 rounded-xl w-full"
              style={{
                color: isOver ? column.color : '#334155',
                background: isOver ? `${column.color}08` : 'transparent',
                border: `1px dashed ${isOver ? column.color + '40' : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              {isOver ? 'Soltar aqui' : 'Vazio'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
