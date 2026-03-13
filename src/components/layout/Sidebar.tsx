import { useState, useMemo } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Briefcase,
  DollarSign,
  GraduationCap,
  ChevronRight,
  ChevronDown,
  Zap,
  Maximize2,
  Minimize2,
  Globe,
  Settings as SettingsIcon,
  Users,
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../../contexts/AuthContext'
import type { UserRole } from '../../lib/database.types'

/* ─── Types ──────────────────────────────────────── */
interface NavItem {
  label: string
  icon: React.ElementType
  to?: string
  children?: { label: string; to: string }[]
  allowedRoles?: UserRole[]
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    to: '/',
    allowedRoles: ['ADMIN', 'MEMBER'],
  },
  {
    label: 'Clientes',
    icon: Users,
    to: '/comercial/clientes',
    allowedRoles: ['ADMIN', 'MEMBER'],
  },
  {
    label: 'Comercial',
    icon: Briefcase,
    allowedRoles: ['ADMIN'],
    children: [
      { label: 'Leads',         to: '/comercial/leads' },
      { label: 'Pipeline',      to: '/comercial/pipeline' },
      { label: 'Social Selling', to: '/comercial/social' },
    ],
  },
  {
    label: 'Operação',
    icon: Zap,
    allowedRoles: ['ADMIN', 'MEMBER'],
    children: [
      { label: 'Tarefas',  to: '/operacao/tarefas' },
      { label: 'Projetos', to: '/operacao/projetos' },
    ],
  },
  {
    label: 'Financeiro',
    icon: DollarSign,
    to: '/financeiro',
    allowedRoles: ['ADMIN'],
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
]

const CONFIG_ITEM: NavItem = {
  label: 'Configurações',
  icon: SettingsIcon,
  allowedRoles: ['ADMIN'],
  children: [
    { label: 'Geral',         to: '/settings' },
    { label: 'Equipe',        to: '/settings/team' },
    { label: 'Setores',       to: '/settings/sectors' },
    { label: 'Deliverables',    to: '/settings/deliverables' },
    { label: 'Tarefas Padrão',    to: '/settings/templates' },
    { label: 'Linhas Editoriais', to: '/settings/editorial-lines' },
  ],
}

/* ─── Sub-item ───────────────────────────────────── */
function SubItem({ label, to }: { label: string; to: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        clsx(
          'w-full text-left px-11 py-2 text-sm transition-colors block',
          isActive
            ? 'text-praxis-cyan font-bold'
            : 'text-gray-500 hover:text-praxis-cyan',
        )
      }
    >
      {label}
    </NavLink>
  )
}

/* ─── Nav Item Row ───────────────────────────────── */
function NavItemRow({ 
  item, 
  collapsed, 
  isOpen, 
  onToggle 
}: { 
  item: NavItem; 
  collapsed: boolean; 
  isOpen: boolean; 
  onToggle: () => void 
}) {
  const location = useLocation()
  const hasChildren = !!item.children
  const isChildActive = item.children?.some(c => location.pathname.startsWith(c.to)) ?? false

  const Icon = item.icon

  if (!hasChildren && item.to) {
    return (
      <NavLink
        to={item.to}
        end={item.to === '/'}
        className={({ isActive }) =>
          clsx(
            'w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 group relative',
            isActive 
              ? 'bg-praxis-cyan/10 border-l-2 border-praxis-cyan text-white shadow-[0_0_15px_rgba(0,210,255,0.1)]' 
              : 'text-gray-500 hover:text-gray-200 hover:bg-white/5 border-l-2 border-transparent',
          )
        }
      >
        {({ isActive }) => (
          <>
            <Icon
              size={20}
              className={clsx(
                'flex-shrink-0 transition-colors',
                isActive ? 'text-praxis-cyan' : 'group-hover:text-praxis-cyan',
              )}
            />
            {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
          </>
        )}
      </NavLink>
    )
  }

  return (
    <div>
      <button
        onClick={onToggle}
        className={clsx(
          'w-full flex items-center justify-between px-4 py-3 transition-colors group',
          isChildActive || isOpen
            ? 'text-white'
            : 'text-gray-500 hover:text-gray-200',
        )}
      >
        <div className="flex items-center gap-4">
          <Icon
            size={20}
            className={clsx(
              'flex-shrink-0 transition-colors',
              isChildActive ? 'text-praxis-cyan' : 'group-hover:text-praxis-cyan',
            )}
          />
          {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
        </div>
        {!collapsed && (
          <div className="opacity-40 group-hover:opacity-100 transition-opacity">
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
        )}
      </button>

      {isOpen && !collapsed && (
        <div className="animate-in slide-in-from-top-1 duration-200">
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
  const { profile, user } = useAuth()
  const location = useLocation()
  const [manualExpandedLabel, setManualExpandedLabel] = useState<string | null>(null)
  const [lastPath, setLastPath] = useState(location.pathname)

  // Reset manual toggle on navigation
  if (location.pathname !== lastPath) {
    setLastPath(location.pathname)
    setManualExpandedLabel(null)
  }

  const activeSectionLabel = useMemo(() => {
    return [...NAV_ITEMS, CONFIG_ITEM].find(item => 
      item.children?.some(c => location.pathname.startsWith(c.to))
    )?.label ?? null
  }, [location.pathname])

  const expandedLabel = manualExpandedLabel ?? activeSectionLabel
  const role: UserRole = user === null ? 'ADMIN' : (profile?.role ?? 'MEMBER')

  const visibleItems = NAV_ITEMS.filter(item => {
    if (!item.allowedRoles) return true
    return item.allowedRoles.includes(role)
  })

  const showConfigs = !CONFIG_ITEM.allowedRoles || CONFIG_ITEM.allowedRoles.includes(role)

  return (
    <aside
      className={clsx(
        'glass-panel border-r transition-all duration-300 flex flex-col z-20 h-full',
        collapsed ? 'w-20' : 'w-64',
      )}
      style={{
        background: 'var(--color-praxis-sidebar, #0a0d12)',
        borderColor: 'rgba(255, 255, 255, 0.05)',
      }}
    >
      {/* Logo */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-praxis-cyan to-white flex items-center justify-center rounded-lg font-bold text-black text-xl italic shrink-0">
          AX
        </div>
        {!collapsed && (
          <div className="overflow-hidden whitespace-nowrap">
            <h1 className="font-bold text-lg leading-tight">Praxis <span className="text-praxis-cyan">CRM</span></h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Tech Dashboard</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar pt-4">
        {visibleItems.map(item => (
          <NavItemRow 
            key={item.label} 
            item={item} 
            collapsed={collapsed} 
            isOpen={expandedLabel === item.label}
            onToggle={() => setManualExpandedLabel(expandedLabel === item.label ? "NONE" : item.label)}
          />
        ))}

        {showConfigs && (
          <div className="pt-4 mt-4 border-t border-white/5">
            <NavItemRow 
              item={CONFIG_ITEM} 
              collapsed={collapsed} 
              isOpen={expandedLabel === CONFIG_ITEM.label}
              onToggle={() => setManualExpandedLabel(expandedLabel === CONFIG_ITEM.label ? "NONE" : CONFIG_ITEM.label)}
            />
          </div>
        )}
      </nav>

      {/* Footer / Toggle */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="p-4 border-t border-white/5 flex items-center justify-center hover:bg-white/5 transition-colors text-gray-500 hover:text-gray-200"
      >
        {collapsed ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
      </button>
    </aside>
  )
}
