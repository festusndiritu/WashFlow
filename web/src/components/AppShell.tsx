import React, { useState, type ReactNode } from 'react'
import { Link, useMatch } from 'react-router-dom'
import { LogOut, Menu, X, LayoutDashboard, Package, Users, Settings, Sun, Moon, Monitor, DollarSign, MoreHorizontal } from 'lucide-react'
import { useAuthStore } from '../store/auth'
import { useThemeStore, type ThemeMode } from '../store/theme'
import { initials } from '../lib/utils'

const THEME_CYCLE: Record<ThemeMode, ThemeMode> = { light: 'dark', dark: 'system', system: 'light' }
const THEME_ICON = { light: Sun, dark: Moon, system: Monitor } as const
const THEME_LABEL: Record<ThemeMode, string> = { light: 'Light', dark: 'Dark', system: 'System' }

function BrandMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#f97316"/>
      <path d="M16 4C15.3 5.6 7 14.5 7 20C7 24.4 11 28 16 28C21 28 25 24.4 25 20C25 14.5 16.7 5.6 16 4Z" fill="white"/>
      <path d="M11 19.5L12.5 24L14.8 18L16 20.8L17.2 18L19.5 24L21 19.5"
            stroke="#f97316" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
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
    <div className="flex flex-col h-full" style={{ background: 'var(--sidebar-bg)' }}>

      {/* Brand header */}
      <div className="flex items-center justify-between px-3 h-14 shrink-0" style={{ borderBottom: '1px solid var(--sidebar-border)' }}>
        <div className="flex items-center gap-2.5">
          <BrandMark size={28} />
          <span className="text-white font-bold text-[15px] tracking-tight">WashFlow</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: 'var(--sidebar-text)' }}
            onFocus={(e) => { e.currentTarget.style.background = 'var(--sidebar-active)'; e.currentTarget.style.color = 'white' }}
            onBlur={(e) => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--sidebar-text)' }}
            aria-label="Close menu"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Workspace indicator */}
      <div className="px-3 pt-3 pb-1">
        <div className="flex items-center gap-2 px-2 py-2 rounded-lg" style={{ background: 'var(--sidebar-active)' }}>
          <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0" style={{ background: 'rgba(249,115,22,0.25)' }}>
            <span className="text-orange-400 text-[9px] font-bold leading-none">
              {orgName.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?'}
            </span>
          </div>
          <span className="text-[12px] font-medium truncate" style={{ color: 'var(--sidebar-text)' }}>{orgName}</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2 overflow-y-auto flex flex-col gap-px">
        {sidebarNav}
      </nav>

      {/* User footer */}
      <div className="px-2 pb-3 pt-2 shrink-0" style={{ borderTop: '1px solid var(--sidebar-border)' }}>
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-white text-[11px] font-bold shrink-0 leading-none">
            {user?.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold leading-none truncate text-white">{user?.name}</p>
            <p className="text-[11px] leading-none mt-1 truncate" style={{ color: 'var(--sidebar-text)' }}>{user?.email}</p>
          </div>
          <button
            onClick={() => setMode(THEME_CYCLE[mode])}
            title={`Theme: ${THEME_LABEL[mode]}`}
            className="w-6 h-6 flex items-center justify-center rounded-md transition-colors shrink-0 focus-visible:outline-2 focus-visible:outline-orange-500"
            style={{ color: 'var(--sidebar-text)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--sidebar-active)'; e.currentTarget.style.color = '#d4d4d4' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--sidebar-text)' }}
          >
            <ThemeIcon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={logout}
            title="Sign out"
            className="w-6 h-6 flex items-center justify-center rounded-md transition-colors shrink-0 focus-visible:outline-2 focus-visible:outline-orange-500"
            style={{ color: 'var(--sidebar-text)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(248,113,113,0.12)'; e.currentTarget.style.color = '#f87171' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--sidebar-text)' }}
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

interface Props {
  orgName: string
  orgRole: string
  sidebarNav: ReactNode
  headerSlot?: ReactNode
  title?: string
  actions?: ReactNode
  children: ReactNode
}

export function AppShell({ orgName, orgRole, sidebarNav, headerSlot, title, actions, children }: Props) {
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
    <div className="min-h-screen flex" style={{ background: 'var(--bg-page)' }}>

      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex w-[224px] shrink-0 flex-col sticky top-0 h-screen"
        style={{ borderRight: '1px solid var(--sidebar-border)' }}
      >
        <SidebarContent orgName={orgName} sidebarNav={sidebarNav} />
      </aside>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 backdrop-blur-[2px]"
            style={{ background: 'var(--bg-overlay)' }}
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-[224px] h-full shadow-xl">
            <SidebarContent orgName={orgName} sidebarNav={sidebarNav} onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile topbar — logo + hamburger + theme only */}
        <div
          className="lg:hidden sticky top-0 z-40 flex items-center gap-3 px-4 h-14 shrink-0"
          style={{ background: 'var(--sidebar-bg)', borderBottom: '1px solid var(--sidebar-border)' }}
        >
          <button
            onClick={() => setMobileOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: '#a8a8a5' }}
            aria-label="Open menu"
          >
            <Menu className="w-[18px] h-[18px]" />
          </button>
          <div className="flex items-center gap-2">
            <BrandMark size={22} />
            <span className="text-white font-bold text-[14px] tracking-tight">WashFlow</span>
          </div>
          <div className="flex-1" />
          <button
            onClick={() => setMode(THEME_CYCLE[mode])}
            title={`Theme: ${THEME_LABEL[mode]}`}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors shrink-0"
            style={{ color: '#a8a8a5' }}
          >
            <ThemeIcon className="w-[15px] h-[15px]" />
          </button>
        </div>

        {/* Mobile page header — title + action button */}
        {headerSlot && (
          <div
            className="lg:hidden sticky top-14 z-30 px-4 py-3 shrink-0"
            style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-default)' }}
          >
            {headerSlot}
          </div>
        )}

        {/* Desktop topbar */}
        <div
          className="hidden lg:flex topbar"
          style={{ backdropFilter: 'blur(8px)', background: 'var(--bg-surface)' }}
        >
          {title && (
            <h1 className="text-[15px] font-semibold text-[var(--text-primary)] leading-none shrink-0">{title}</h1>
          )}
          {headerSlot && <div className="flex-1 flex items-center gap-3 min-w-0">{headerSlot}</div>}
          {!headerSlot && <div className="flex-1" />}
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
          <button
            onClick={() => setMode(THEME_CYCLE[mode])}
            title={`Theme: ${THEME_LABEL[mode]}`}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors shrink-0 ml-1"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-muted)'; e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--text-tertiary)' }}
          >
            <ThemeIcon className="w-[15px] h-[15px]" />
          </button>
        </div>

        {/* Main content */}
        <main className="flex-1 p-4 lg:p-6 pb-24 lg:pb-8">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav
          className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex h-16 px-1"
          style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border-default)' }}
        >
          <BottomNavItem to="/dashboard" icon={LayoutDashboard} label="Home"      active={!!matchDash} />
          <BottomNavItem to="/orders"    icon={Package}         label="Orders"    active={!!matchOrders} />
          <BottomNavItem to="/customers" icon={Users}           label="Customers" active={!!matchCustomers} />
          {isOwnerOrAdmin && (
            <BottomNavItem to="/expenses" icon={DollarSign} label="Expenses" active={!!matchExpenses} />
          )}
          <BottomNavItem to="/settings" icon={Settings} label="Settings" active={!!matchSettings} />
        </nav>
      </div>
    </div>
  )
}

function BottomNavItem({ to, icon: Icon, label, active }: {
  to: string; icon: React.ElementType; label: string; active: boolean
}) {
  return (
    <Link
      to={to}
      className="flex-1 flex flex-col items-center justify-center gap-1 transition-colors"
      style={{ color: active ? 'var(--brand)' : 'var(--text-disabled)' }}
    >
      <Icon className="w-[20px] h-[20px]" />
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  )
}

export function NavItem({ icon, label, to, active: activeProp, onClick, badge }: {
  icon: ReactNode
  label: string
  to?: string
  active?: boolean
  onClick?: () => void
  badge?: number
}) {
  const match    = useMatch(to ?? '__no_match__')
  const isActive = activeProp !== undefined ? activeProp : !!match

  const base = 'relative w-full flex items-center gap-2.5 px-2.5 h-8 rounded-lg text-[13px] font-medium transition-all outline-none focus-visible:ring-1 focus-visible:ring-orange-500'
  const activeStyle = { background: 'var(--sidebar-active)', color: 'white' }
  const inactiveStyle = { color: 'var(--sidebar-text)' }

  const content = (
    <>
      {isActive && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-full"
          style={{ background: 'var(--brand)', left: '-1px' }}
        />
      )}
      <span className={`shrink-0 flex items-center justify-center [&>svg]:w-[15px] [&>svg]:h-[15px] ${isActive ? 'text-orange-400' : ''}`}>
        {icon}
      </span>
      <span className="flex-1 truncate leading-none">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none"
          style={{ background: 'var(--brand)', color: 'white' }}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </>
  )

  if (to) {
    return (
      <Link to={to} className={base} style={isActive ? activeStyle : inactiveStyle}
        onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = 'var(--sidebar-hover)'; e.currentTarget.style.color = '#d4d4d4' }}}
        onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--sidebar-text)' }}}
      >
        {content}
      </Link>
    )
  }
  return (
    <button onClick={onClick} className={base} style={isActive ? activeStyle : inactiveStyle}
      onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = 'var(--sidebar-hover)'; e.currentTarget.style.color = '#d4d4d4' }}}
      onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--sidebar-text)' }}}
    >
      {content}
    </button>
  )
}

