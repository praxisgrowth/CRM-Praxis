interface PlaceholderPageProps {
  title: string
  description: string
  phase?: string
}

export function PlaceholderPage({ title, description, phase = 'Fase 2' }: PlaceholderPageProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] space-y-4">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-2"
        style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)' }}
      >
        <span className="text-2xl">🚧</span>
      </div>
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <p className="text-slate-500 text-sm text-center max-w-sm">{description}</p>
      <span
        className="text-xs px-3 py-1 rounded-full font-medium"
        style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}
      >
        {phase}
      </span>
    </div>
  )
}
