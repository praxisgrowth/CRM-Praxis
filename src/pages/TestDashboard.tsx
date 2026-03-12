// src/pages/TestDashboard.tsx — Sandbox: /test-dashboard
import { useState } from 'react'
import {
  LayoutDashboard, Users, GitMerge, Settings,
  Wallet, GraduationCap, Globe, Bell, Search,
  TrendingUp, Activity, ChevronDown, ChevronRight,
  Maximize2, Minimize2, CheckCircle2,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'

const mrrData = [
  { name: 'Jan', value: 55000 },
  { name: 'Fev', value: 60000 },
  { name: 'Mar', value: 65000 },
  { name: 'Abr', value: 72000 },
  { name: 'Mai', value: 80000 },
  { name: 'Jun', value: 84000 },
]

// ── Sub-components ────────────────────────────────────────────

interface NavItemProps {
  icon: React.ReactNode
  label: string
  active?: boolean
  expanded?: boolean
}

const NavItem = ({ icon, label, active = false, expanded = true }: NavItemProps) => (
  <button className={`
    w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 group
    ${active
      ? 'bg-praxis-cyan/10 border-l-2 border-praxis-cyan text-white'
      : 'text-gray-500 hover:text-gray-200 hover:bg-white/5 border-l-2 border-transparent'}
  `}>
    <span className={`${active ? 'text-praxis-cyan' : 'group-hover:text-praxis-cyan'}`}>{icon}</span>
    {expanded && <span className="text-sm font-medium">{label}</span>}
  </button>
)

interface NavGroupProps {
  label: string
  icon: React.ReactNode
  children?: React.ReactNode
  expanded?: boolean
}

const NavGroup = ({ label, icon, children, expanded = true }: NavGroupProps) => {
  const [isOpen, setIsOpen] = useState(false)
  if (!expanded) return <div className="flex justify-center py-3 text-gray-500">{icon}</div>

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 text-gray-500 hover:text-gray-200 transition-colors group"
      >
        <div className="flex items-center gap-4">
          <span className="group-hover:text-praxis-cyan transition-colors">{icon}</span>
          <span className="text-sm font-medium">{label}</span>
        </div>
        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {isOpen && <div>{children}</div>}
    </div>
  )
}

interface KPICardProps {
  title: string
  value: string
  trend: string
  icon: React.ReactNode
}

const KPICard = ({ title, value, trend, icon }: KPICardProps) => (
  <div className="glass-panel p-6 rounded-2xl hover:-translate-y-1 transition-all duration-300 cursor-default group">
    <div className="flex items-center justify-between mb-4">
      <div className="p-2 bg-white/5 rounded-lg group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <span className="text-[10px] font-bold text-praxis-cyan bg-praxis-cyan/10 px-2 py-0.5 rounded-full">{trend}</span>
    </div>
    <p className="text-3xl font-bold mb-1">{value}</p>
    <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">{title}</p>
  </div>
)

interface ProgressRowProps {
  label: string
  value: number
  color: string
}

const ProgressRow = ({ label, value, color }: ProgressRowProps) => (
  <div className="space-y-1">
    <div className="flex justify-between text-[10px] font-bold uppercase">
      <span className="text-gray-500">{label}</span>
      <span className="text-white">{value}%</span>
    </div>
    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-1000"
        style={{ width: `${value}%`, backgroundColor: color, boxShadow: `0 0 8px ${color}80` }}
      />
    </div>
  </div>
)

interface ClientItemProps {
  name: string
  sub: string
  score: number
  status: 'Excellent' | 'Attention' | 'Critical'
  trend: 'up' | 'down'
}

const ClientItem = ({ name, sub, score, status, trend }: ClientItemProps) => (
  <div className="flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-colors group">
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 glass-panel rounded-lg flex items-center justify-center">
        <Users size={18} className="text-praxis-cyan" />
      </div>
      <div>
        <p className="font-bold text-sm">{name}</p>
        <p className="text-[10px] text-gray-500">{sub}</p>
      </div>
    </div>
    <div className="flex items-center gap-6">
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
        status === 'Excellent' ? 'bg-praxis-cyan/10 text-praxis-cyan' :
        status === 'Attention' ? 'bg-orange-400/10 text-orange-400' :
        'bg-red-400/10 text-red-400'
      }`}>
        {status}
      </span>
      <div className="w-16 h-6 flex items-end gap-0.5">
        {[4, 6, 5, 8, 7, 9].map((h, i) => (
          <div
            key={i}
            className={`flex-1 rounded-t-[1px] ${trend === 'up' ? 'bg-praxis-cyan/30' : 'bg-orange-400/30'}`}
            style={{ height: `${h * 2}px` }}
          />
        ))}
      </div>
      <span className="font-bold text-lg w-8 text-right">{score}</span>
    </div>
  </div>
)

// ── Main component ────────────────────────────────────────────

export function TestDashboard() {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true)

  return (
    <div className="flex h-screen bg-praxis-bg text-gray-100 font-sans overflow-hidden">

      {/* SIDEBAR */}
      <aside className={`
        ${isSidebarExpanded ? 'w-64' : 'w-20'}
        glass-panel border-r transition-all duration-300 flex flex-col z-20
      `}>
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-praxis-cyan to-white flex items-center justify-center rounded-lg font-bold text-black text-xl italic shrink-0">
            AX
          </div>
          {isSidebarExpanded && (
            <div className="overflow-hidden whitespace-nowrap">
              <h1 className="font-bold text-lg leading-tight">Praxis <span className="text-praxis-cyan">CRM</span></h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">Tech Dashboard</p>
            </div>
          )}
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" active expanded={isSidebarExpanded} />
          <NavItem icon={<Users size={20} />} label="Clientes" expanded={isSidebarExpanded} />

          <NavGroup label="Comercial" icon={<GitMerge size={20} />} expanded={isSidebarExpanded}>
            <button className="w-full text-left px-11 py-2 text-sm text-gray-500 hover:text-praxis-cyan transition-colors">Leads</button>
            <button className="w-full text-left px-11 py-2 text-sm text-gray-500 hover:text-praxis-cyan transition-colors">Pipeline</button>
            <button className="w-full text-left px-11 py-2 text-sm text-gray-500 hover:text-praxis-cyan transition-colors">Social Selling</button>
          </NavGroup>

          <NavGroup label="Operação" icon={<Activity size={20} />} expanded={isSidebarExpanded}>
            <button className="w-full text-left px-11 py-2 text-sm text-gray-500 hover:text-praxis-cyan transition-colors">Tarefas</button>
            <button className="w-full text-left px-11 py-2 text-sm text-gray-500 hover:text-praxis-cyan transition-colors">Projetos</button>
          </NavGroup>

          <NavItem icon={<Wallet size={20} />} label="Financeiro" expanded={isSidebarExpanded} />
          <NavItem icon={<GraduationCap size={20} />} label="Universidade" expanded={isSidebarExpanded} />
          <NavItem icon={<Globe size={20} />} label="Portal Nexus" expanded={isSidebarExpanded} />

          <div className="pt-4 mt-4 border-t border-white/5">
            <NavGroup label="Configurações" icon={<Settings size={20} />} expanded={isSidebarExpanded}>
              <button className="w-full text-left px-11 py-2 text-sm text-gray-500 hover:text-praxis-cyan transition-colors">Geral</button>
              <button className="w-full text-left px-11 py-2 text-sm text-gray-500 hover:text-praxis-cyan transition-colors">Equipe</button>
            </NavGroup>
          </div>
        </nav>

        <button
          onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
          className="p-4 border-t border-white/5 flex items-center justify-center hover:bg-white/5 transition-colors"
        >
          {isSidebarExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
      </aside>

      {/* HEADER + MAIN */}
      <div className="flex-1 flex flex-col relative overflow-hidden">

        {/* HEADER */}
        <header className="h-20 glass-panel border-b flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-4">
            <span className="font-bold text-xl hidden md:inline">Praxis <span className="text-praxis-cyan">CRM</span></span>
            <div className="relative w-96 hidden lg:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="text"
                placeholder="Quick Search — Cmd + K"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-12 pr-4 focus:outline-none focus:ring-1 focus:ring-praxis-cyan transition-all text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button className="relative p-2 text-gray-400 hover:text-praxis-cyan transition-colors">
              <Bell size={22} />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-praxis-cyan rounded-full border-2 border-praxis-bg" />
            </button>
            <div className="flex items-center gap-3 pl-6 border-l border-white/10">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold">Gustavo</p>
                <p className="text-[10px] text-praxis-cyan uppercase font-bold tracking-tighter">Admin</p>
              </div>
              <div className="w-10 h-10 rounded-full border border-praxis-cyan/50 overflow-hidden">
                <img src="https://ui-avatars.com/api/?name=Gustavo&background=00d2ff&color=000" alt="Profile" />
              </div>
            </div>
          </div>
        </header>

        {/* CONTENT */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto space-y-8">

            <div>
              <h2 className="text-3xl font-bold">Dashboard</h2>
              <p className="text-gray-500 text-sm">Visão geral do negócio em tempo real</p>
            </div>

            {/* KPI GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KPICard title="Leads Ativos"    value="2"       trend="+12%" icon={<Users        className="text-praxis-cyan"   />} />
              <KPICard title="MRR"             value="R$ 84k"  trend="+8%"  icon={<TrendingUp   className="text-praxis-purple" />} />
              <KPICard title="Taxa Conversão"  value="24%"     trend="+3%"  icon={<Activity     className="text-orange-400"   />} />
              <KPICard title="SLA Operação"    value="97%"     trend="+5%"  icon={<CheckCircle2 className="text-green-400"    />} />
            </div>

            {/* CHARTS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* MRR Chart */}
              <div className="lg:col-span-2 glass-panel p-8 rounded-3xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-praxis-cyan/5 blur-[100px] -z-10 group-hover:bg-praxis-cyan/10 transition-all duration-700" />
                <div className="flex items-center justify-between mb-8">
                  <h3 className="font-bold text-lg">MRR Evolution — Last 6 Months</h3>
                  <div className="flex gap-2">
                    <button className="px-3 py-1 text-xs bg-white/10 rounded-md hover:bg-white/20">PDF</button>
                    <button className="px-3 py-1 text-xs bg-white/10 rounded-md hover:bg-white/20">CSV</button>
                  </div>
                </div>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={mrrData}>
                      <defs>
                        <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#00d2ff" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#00d2ff" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="name" stroke="#4b5563" fontSize={12} axisLine={false} tickLine={false} />
                      <YAxis stroke="#4b5563" fontSize={12} axisLine={false} tickLine={false} tickFormatter={(v: number) => `R$${v / 1000}k`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                        itemStyle={{ color: '#00d2ff' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#00d2ff"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorMrr)"
                        dot={{ r: 4, fill: '#00d2ff', strokeWidth: 2, stroke: '#fff' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Health Score */}
              <div className="glass-panel p-8 rounded-3xl">
                <h3 className="font-bold text-lg mb-8 text-center">Agency Health Score</h3>
                <div className="flex flex-col items-center justify-center relative py-4">
                  <div className="relative w-48 h-24 overflow-hidden">
                    <div className="w-48 h-48 border-[14px] border-white/5 rounded-full" />
                    <div
                      className="absolute top-0 left-0 w-48 h-48 border-[14px] border-praxis-cyan rounded-full neon-glow-cyan"
                      style={{ clipPath: 'inset(0 0 50% 0)', transform: 'rotate(140deg)' }}
                    />
                  </div>
                  <div className="text-center mt-[-30px]">
                    <p className="text-4xl font-black">78<span className="text-lg font-normal text-gray-500">/100</span></p>
                    <p className="text-green-400 font-bold text-xs uppercase tracking-widest mt-1">Excellent</p>
                  </div>
                </div>
                <div className="mt-8 space-y-4">
                  <ProgressRow label="Retenção"   value={80} color="#00d2ff" />
                  <ProgressRow label="Entrega"    value={77} color="#9d50bb" />
                  <ProgressRow label="Satisfação" value={70} color="#00d2ff" />
                  <ProgressRow label="Financeiro" value={66} color="#9d50bb" />
                </div>
              </div>
            </div>

            {/* CLIENTS TABLE */}
            <div className="glass-panel p-8 rounded-3xl">
              <h3 className="font-bold text-lg mb-6">Client Health Score</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                <ClientItem name="TechVision" sub="SaaS - R$ 18k/mês"       score={92} status="Excellent" trend="up"   />
                <ClientItem name="Nexus Corp" sub="Indústria - R$ 14k/mês"  score={78} status="Attention" trend="up"   />
                <ClientItem name="DataFlow"   sub="Fintech - R$ 22k/mês"    score={65} status="Attention" trend="down" />
                <ClientItem name="Retail Max" sub="Varejo - R$ 9k/mês"      score={43} status="Critical"  trend="down" />
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  )
}
