import React, { useState, type ReactNode } from 'react'
import { Link, useMatch } from 'react-router-dom'
import { LogOut, Menu, X, LayoutDashboard, Package, Users, DollarSign, Settings, Sun, Moon, Monitor } from 'lucide-react'
import { useAuthStore } from '../store/auth'
import { useThemeStore, type ThemeMode } from '../store/theme'

const THEME_CYCLE: Record<ThemeMode, ThemeMode> = { light: 'dark', dark: 'system', system: 'light' }
const THEME_ICON = { light: Sun, dark: Moon, system: Monitor } as const

function BrandMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="#f97316"/>
      <path d="M16 3C15.3 4.6 7 13.5 7 19C7 23.4 11 27 16 27C21 27 25 23.4 25 19C25 13.5 16.7 4.6 16 3Z" fill="white"/>
      <path d="M11 18.5L12.5 23L14.8 17L16 19.8L17.2 17L19.5 23L21 18.5"
            stroke="#f97316" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

interface Props {
  orgName: string
  orgRole: string
  sidebarNav: ReactNode
  headerSlot?: ReactNode
  children: ReactNode
}

function SidebarContent({ orgName, sidebarNav, onClose }: {
  orgName: string
  sidebarNav: ReactNode
  onClose?: () => void
}) {
  const user   = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { mode, setMode } = useThemeStore()
  const ThemeIcon = THEME_ICON[mode]

  return (
    <div className="flex flex-col h-full" style={{ background: '#111110' }}>

      {/* Brand */}
      <div className="flex items-center justify-between pl-4 pr-3 h-[52px] shrink-0">
        <div className="flex items-center gap-2.5">
          <BrandMark size={26} />
          <span className="text-white font-semibold text-[14px] tracking-[-0.01em]">WashFlow</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md text-[#525252] hover:text-white hover:bg-white/8 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Workspace row */}
      <div className="px-3 mb-1">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md">
          <div className="w-[18px] h-[18px] rounded bg-orange-500/20 flex items-center justify-center shrink-0">
            <span className="text-orange-400 text-[9px] font-bold leading-none">
              {orgName.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase() || '?'}
            </span>
          </div>
          <span className="text-[12px] font-medium truncate" style={{ color: '#525252' }}>{orgName}</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 pt-2 pb-1 overflow-y-auto" style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
        {sidebarNav}
      </nav>

      {/* Footer */}
      <div className="px-2 pb-2.5 pt-1">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md">
          <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
            {user?.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium leading-none truncate" style={{ color: '#d4d4d4' }}>{user?.name}</p>
            <p className="text-[11px] leading-none mt-0.5 truncate" style={{ color: '#525252' }}>{user?.email}</p>
          </div>
          <button
            onClick={() => setMode(THEME_CYCLE[mode])}
            title={`Theme: ${mode}`}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/8 transition-colors shrink-0"
            style={{ color: '#525252' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#d4d4d4')}
            onMouseLeave={e => (e.currentTarget.style.color = '#525252')}
          >
            <ThemeIcon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={logout}
            title="Sign out"
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/8 transition-colors shrink-0"
            style={{ color: '#525252' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
            onMouseLeave={e => (e.currentTarget.style.color = '#525252')}
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

    </div>
  )
}

export function AppShell({ orgName, orgRole, sidebarNav, headerSlot, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const user = useAuthStore((s) => s.user)
  const isOwnerOrAdmin = user?.role === 'owner' || user?.role === 'admin'
  const { mode, setMode } = useThemeStore()
  const ThemeIcon = THEME_ICON[mode]

  const matchDash      = useMatch('/dashboard')
  const matchOrders    = useMatch('/orders')
  const matchCustomers = useMatch('/customers')
  const matchExpenses  = useMatch('/expenses')
  const matchSettings  = useMatch('/settings')

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--page-bg)' }}>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-[220px] shrink-0 flex-col sticky top-0 h-screen" style={{ borderRight: '1px solid rgba(255,255,255,0.05)' }}>
        <SidebarContent orgName={orgName} sidebarNav={sidebarNav} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={() => setMobileOpen(false)} />
          <div className="relative w-[220px] h-full shadow-2xl">
            <SidebarContent orgName={orgName} sidebarNav={sidebarNav} onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile topbar */}
        <div className="lg:hidden sticky top-0 z-40 flex items-center gap-3 px-3 h-11" style={{ background: '#111110', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <button onClick={() => setMobileOpen(true)} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/8 transition-colors" style={{ color: '#737373' }}>
            <Menu className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <BrandMark size={20} />
            <span className="text-white font-semibold text-[13px] tracking-[-0.01em]">WashFlow</span>
          </div>
        </div>

        {/* Desktop topbar */}
        <div className="hidden lg:flex items-center gap-3 px-5 h-11 shrink-0 sticky top-0 z-30" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
          <div className="flex-1 min-w-0">
            {headerSlot}
          </div>
          <button
            onClick={() => setMode(THEME_CYCLE[mode])}
            title={`Theme: ${mode}`}
            className="w-7 h-7 flex items-center justify-center rounded-md transition-colors shrink-0"
            style={{ color: 'var(--text-3)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-alt)'; e.currentTarget.style.color = 'var(--text-1)' }}
            onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--text-3)' }}
          >
            <ThemeIcon className="w-[14px] h-[14px]" />
          </button>
        </div>

        {/* Mobile headerSlot */}
        {headerSlot && (
          <div className="lg:hidden px-4 py-2.5 sticky top-11 z-20" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
            {headerSlot}
          </div>
        )}

        <main className="flex-1 p-4 lg:p-6 pb-20 lg:pb-6">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex h-14" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
          <BottomNavItem to="/dashboard" icon={LayoutDashboard} label="Home"      active={!!matchDash} />
          <BottomNavItem to="/orders"    icon={Package}         label="Orders"    active={!!matchOrders} />
          <BottomNavItem to="/customers" icon={Users}           label="Customers" active={!!matchCustomers} />
          {isOwnerOrAdmin && <BottomNavItem to="/expenses" icon={DollarSign} label="Expenses" active={!!matchExpenses} />}
          <BottomNavItem to="/settings"  icon={Settings}        label="Settings"  active={!!matchSettings} />
        </nav>

      </div>
    </div>
  )
}

function BottomNavItem({ to, icon: Icon, label, active }: { to: string; icon: React.ElementType; label: string; active: boolean }) {
  return (
    <Link to={to} className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors"
      style={{ color: active ? '#f97316' : 'var(--text-4)' }}>
      <Icon className="w-[18px] h-[18px]" />
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  )
}

export function NavItem({ icon, label, to, active: activeProp, onClick }: {
  icon: ReactNode
  label: string
  to?: string
  active?: boolean
  onClick?: () => void
}) {
  const match    = useMatch(to ?? '__no_match__')
  const isActive = activeProp !== undefined ? activeProp : !!match

  const cls = [
    'relative w-full flex items-center gap-2.5 pl-2.5 pr-2.5 h-[34px] rounded-md text-[13px] font-medium transition-colors',
    isActive
      ? 'text-white bg-white/[0.09]'
      : 'text-[#737373] hover:text-[#d4d4d4] hover:bg-white/[0.05]',
  ].join(' ')

  const content = (
    <>
      {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-[16px] w-[2px] rounded-full bg-orange-500" style={{ left: '-1px' }} />}
      <span className={`shrink-0 w-[15px] h-[15px] flex items-center justify-center ${isActive ? 'text-orange-400' : ''}`}>{icon}</span>
      <span className="truncate leading-none">{label}</span>
    </>
  )

  if (to) return <Link to={to} className={cls}>{content}</Link>
  return <button onClick={onClick} className={cls}>{content}</button>
}
