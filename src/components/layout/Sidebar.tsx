import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Briefcase,
  DollarSign,
  GraduationCap,
  ChevronRight,
  ChevronDown,
  Zap,
  Menu,
  X,
  Globe,
  Settings as SettingsIcon,
  Users,
} from 'lucide-react'
import clsx from 'clsx'

/* ─── Types ──────────────────────────────────────── */
interface NavItem {
  label: string
  icon: React.ElementType
  to?: string
  children?: { label: string; to: string }[]
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    to: '/',
  },
  {
    label: 'Comercial',
    icon: Briefcase,
    children: [
      { label: 'Leads',    to: '/comercial/leads' },
      { label: 'Pipeline', to: '/comercial/pipeline' },
    ],
  },
  {
    label: 'Clientes',
    icon: Users,
    to: '/comercial/clientes',
  },
  {
    label: 'Operação',
    icon: Zap,
    to: '/operacao',
  },
  {
    label: 'Financeiro',
    icon: DollarSign,
    to: '/financeiro',
  },
  {
    label: 'Universidade',
    icon: GraduationCap,
    to: '/universidade',
  },
  {
    label: 'Portal Nexus',
    icon: Globe,
    to: '/nexus',
  },
  {
    label: 'Configurações',
    icon: SettingsIcon,
    to: '/settings',
  },
]

/* ─── Sub-item ───────────────────────────────────── */
function SubItem({ label, to }: { label: string; to: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-2 px-4 py-2 ml-9 rounded-lg text-xs font-medium transition-all duration-200',
          isActive
            ? 'text-cyan-400 bg-cyan-500/10'
            : 'text-slate-500 hover:text-slate-300 hover:bg-white/5',
        )
      }
    >
      <span className="w-1 h-1 rounded-full bg-current opacity-60" />
      {label}
    </NavLink>
  )
}

/* ─── Nav Item ───────────────────────────────────── */
function NavItemRow({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const location = useLocation()
  const hasChildren = !!item.children

  const isChildActive = item.children?.some(c => location.pathname.startsWith(c.to)) ?? false
  const [open, setOpen] = useState(isChildActive)

  const Icon = item.icon

  if (!hasChildren && item.to) {
    return (
      <NavLink
        to={item.to}
        end={item.to === '/'}
        className={({ isActive }) =>
          clsx(
            'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative overflow-hidden',
            isActive
              ? 'text-white'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5',
          )
        }
        style={({ isActive }) => isActive ? {
          background: 'linear-gradient(90deg, rgba(0,210,255,0.13), rgba(157,80,187,0.07))',
          borderLeft: '2px solid #00d2ff',
          boxShadow: '-3px 0 18px rgba(0,210,255,0.25)',
        } : {}}
      >
        {({ isActive }) => (
          <>
            <Icon
              size={17}
              className={clsx(
                'flex-shrink-0 transition-colors',
                isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300',
              )}
              style={isActive ? { filter: 'drop-shadow(0 0 8px rgba(0,210,255,0.7))' } : {}}
            />
            {!collapsed && (
              <span className={isActive ? 'text-cyan-300' : ''}>{item.label}</span>
            )}
          </>
        )}
      </NavLink>
    )
  }

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className={clsx(
          'group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
          isChildActive
            ? 'text-cyan-300 bg-cyan-500/8'
            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5',
        )}
      >
        <Icon
          size={17}
          className={clsx(
            'flex-shrink-0 transition-colors',
            isChildActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300',
          )}
        />
        {!collapsed && (
          <>
            <span className="flex-1 text-left truncate">{item.label}</span>
            {open ? (
              <ChevronDown size={13} className="text-slate-600" />
            ) : (
              <ChevronRight size={13} className="text-slate-600" />
            )}
          </>
        )}
      </button>

      {open && !collapsed && (
        <div className="mt-1 space-y-0.5">
          {item.children!.map(child => (
            <SubItem key={child.to} {...child} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Sidebar ────────────────────────────────────── */
export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={clsx(
        'relative flex flex-col h-full transition-all duration-300 ease-in-out',
        'border-r',
        collapsed ? 'w-[64px]' : 'w-[240px]',
      )}
      style={{
        background: 'rgba(4, 8, 20, 0.92)',
        borderColor: 'rgba(0,210,255,0.08)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-4 py-5"
        style={{ borderBottom: '1px solid rgba(0,210,255,0.07)' }}
      >
        <div
          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(0,210,255,0.2), rgba(157,80,187,0.2))', border: '1px solid rgba(0,210,255,0.2)' }}
        >
          <img src="/favicon.png" alt="Logo" className="w-full h-full object-cover" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-white leading-none tracking-wide">Praxis</p>
            <p className="text-[10px] mt-0.5 font-medium" style={{ color: 'rgba(0,210,255,0.65)' }}>Tech Dashboard</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {NAV_ITEMS.map(item => (
          <NavItemRow key={item.label} item={item} collapsed={collapsed} />
        ))}
      </nav>

      {/* Footer / Collapse toggle */}
      <div className="px-2 py-3 border-t border-white/[0.06]">
        <button
          onClick={() => setCollapsed(c => !c)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all duration-200 text-sm"
        >
          {collapsed ? <Menu size={16} /> : <><X size={16} /><span>Recolher</span></>}
        </button>
      </div>
    </aside>
  )
}
