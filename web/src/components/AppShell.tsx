import React, { useState, type ReactNode } from 'react'
import { Link, useMatch } from 'react-router-dom'
import { LogOut, Menu, X, LayoutDashboard, Package, Users, DollarSign, Settings } from 'lucide-react'
import { useAuthStore } from '../store/auth'
import { ThemeToggle } from './ThemeToggle'

/** WashFlow brand droplet mark */
function BrandMark({ size = 28 }: { size?: number }) {
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

function SidebarContent({
  orgName,
  orgRole,
  sidebarNav,
  onClose,
}: {
  orgName: string
  orgRole: string
  sidebarNav: ReactNode
  onClose?: () => void
}) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const initials = orgName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  return (
    <div className="flex flex-col h-full select-none" style={{ background: '#0f0e0d' }}>

      {/* ── Brand ──────────────────────────────── */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <div className="flex items-center gap-3">
          <BrandMark size={32} />
          <div className="leading-none">
            <p className="text-white font-bold text-[15px] tracking-tight">WashFlow</p>
            <p className="text-stone-600 text-[10px] font-semibold uppercase tracking-widest mt-0.5">Platform</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-stone-500 hover:text-stone-200 transition-colors p-1.5 rounded-lg hover:bg-white/8">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Org chip ───────────────────────────── */}
      <div className="mx-3 mb-2">
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="w-7 h-7 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center shrink-0">
            <span className="text-orange-400 text-[10px] font-bold">{initials || '?'}</span>
          </div>
          <div className="min-w-0">
            <p className="text-stone-200 text-xs font-semibold truncate leading-tight">{orgName}</p>
            <p className="text-stone-500 text-[10px] truncate capitalize leading-tight mt-0.5">{orgRole}</p>
          </div>
        </div>
      </div>

      {/* ── Divider ────────────────────────────── */}
      <div className="mx-5 my-2 h-px bg-white/5" />

      {/* ── Nav ────────────────────────────────── */}
      <nav className="flex-1 px-3 py-1 space-y-0.5 overflow-y-auto">
        {sidebarNav}
      </nav>

      {/* ── Divider ────────────────────────────── */}
      <div className="mx-5 h-px bg-white/5" />

      {/* ── Footer ─────────────────────────────── */}
      <div className="px-3 py-3 space-y-1">
        {/* Theme toggle */}
        <ThemeToggle variant="sidebar" showLabel className="w-full justify-start px-3 py-2 rounded-xl text-stone-400 hover:text-stone-200 hover:bg-white/5" />

        {/* User row */}
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors group">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-[11px] font-bold shrink-0 shadow-sm">
            {user?.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-stone-200 text-xs font-semibold truncate leading-tight">{user?.name}</p>
            <p className="text-stone-500 text-[10px] truncate leading-tight mt-0.5">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="text-stone-600 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-white/8 shrink-0"
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

  const matchDash      = useMatch('/dashboard')
  const matchOrders    = useMatch('/orders')
  const matchCustomers = useMatch('/customers')
  const matchExpenses  = useMatch('/expenses')
  const matchSettings  = useMatch('/settings')

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--page-bg)' }}>

      {/* ── Desktop sidebar ─────────────────────── */}
      <aside className="hidden lg:flex w-[230px] shrink-0 flex-col sticky top-0 h-screen" style={{ borderRight: '1px solid rgba(0,0,0,0.12)' }}>
        <SidebarContent orgName={orgName} orgRole={orgRole} sidebarNav={sidebarNav} />
      </aside>

      {/* ── Mobile sidebar overlay ──────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative w-[230px] h-full shadow-2xl">
            <SidebarContent orgName={orgName} orgRole={orgRole} sidebarNav={sidebarNav} onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* ── Main ────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile topbar */}
        <div className="lg:hidden sticky top-0 z-40 flex items-center gap-3 px-4 h-12" style={{ background: '#0f0e0d', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={() => setMobileOpen(true)} className="text-stone-400 hover:text-white transition-colors p-1.5 -ml-1.5 rounded-lg hover:bg-white/8">
            <Menu className="w-4.5 h-4.5" />
          </button>
          <div className="flex items-center gap-2">
            <BrandMark size={22} />
            <span className="text-white font-bold text-sm tracking-tight">WashFlow</span>
          </div>
        </div>

        {/* Desktop topbar */}
        <div className="hidden lg:flex items-center justify-between px-6 h-12 sticky top-0 z-30" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{orgName}</p>
          <div className="flex items-center gap-1">
            {headerSlot}
            <ThemeToggle variant="topbar" showLabel={false} />
          </div>
        </div>

        {/* Mobile headerSlot */}
        {headerSlot && (
          <header className="lg:hidden px-4 py-3 sticky top-12 z-20" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
            {headerSlot}
          </header>
        )}

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex items-stretch" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
          <BottomNavItem to="/dashboard" icon={LayoutDashboard} label="Home" active={!!matchDash} />
          <BottomNavItem to="/orders"    icon={Package}         label="Orders"   active={!!matchOrders} />
          <BottomNavItem to="/customers" icon={Users}           label="Customers" active={!!matchCustomers} />
          {isOwnerOrAdmin && <BottomNavItem to="/expenses" icon={DollarSign} label="Expenses" active={!!matchExpenses} />}
          <BottomNavItem to="/settings" icon={Settings} label="Settings" active={!!matchSettings} />
        </nav>

      </div>
    </div>
  )
}

function BottomNavItem({ to, icon: Icon, label, active }: { to: string; icon: React.ElementType; label: string; active: boolean }) {
  return (
    <Link
      to={to}
      className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-1 text-[10px] font-semibold transition-colors ${
        active ? 'text-orange-500' : 'text-stone-400 hover:text-stone-600'
      }`}
      style={active ? undefined : { color: 'var(--text-4)' }}
    >
      <Icon className="w-[18px] h-[18px]" />
      {label}
    </Link>
  )
}

/** Sidebar nav item */
export function NavItem({
  icon,
  label,
  to,
  active: activeProp,
  onClick,
}: {
  icon: ReactNode
  label: string
  to?: string
  active?: boolean
  onClick?: () => void
}) {
  const match = useMatch(to ?? '__no_match__')
  const isActive = activeProp !== undefined ? activeProp : !!match

  const inner = (
    <>
      {/* Active left bar */}
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-orange-500" />
      )}
      <span className={`shrink-0 w-[16px] h-[16px] ${isActive ? 'text-orange-400' : ''}`}>{icon}</span>
      <span className="truncate">{label}</span>
    </>
  )

  const cls = `relative w-full flex items-center gap-2.5 px-3 py-[8px] rounded-lg text-[13px] font-medium transition-all ${
    isActive
      ? 'text-white bg-white/8'
      : 'text-stone-400 hover:text-stone-100 hover:bg-white/6'
  }`

  if (to) return <Link to={to} className={cls}>{inner}</Link>
  return <button onClick={onClick} className={cls}>{inner}</button>
}

