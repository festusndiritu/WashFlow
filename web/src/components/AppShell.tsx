import React, { useState, type ReactNode } from 'react'
import { Link, useMatch } from 'react-router-dom'
import { LogOut, Menu, X, LayoutDashboard, Package, Users, DollarSign, Settings } from 'lucide-react'
import { useAuthStore } from '../store/auth'
import { ThemeToggle } from './ThemeToggle'

/** WashFlow brand droplet mark — inline SVG so it renders at any size without a network request */
function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="#f97316"/>
      <path d="M16 3C15.3 4.6 7 13.5 7 19C7 23.4 11 27 16 27C21 27 25 23.4 25 19C25 13.5 16.7 4.6 16 3Z" fill="white"/>
      <path d="M11 18.5L12.5 23L14.8 17L16 19.8L17.2 17L19.5 23L21 18.5"
            stroke="#f97316" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
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

  return (
    <div className="flex flex-col h-full" style={{ background: 'linear-gradient(180deg, #111110 0%, #0c0a09 100%)' }}>
      {/* Brand */}
      <div className="px-4 pt-5 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <BrandMark size={30} />
          <div>
            <span className="text-white font-bold text-[15px] tracking-tight leading-none">WashFlow</span>
            <p className="text-stone-500 text-[10px] mt-0.5 leading-none font-medium uppercase tracking-wider">Business</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-stone-500 hover:text-white transition-colors p-1 rounded lg:hidden">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Org badge */}
      <div className="mx-3 mb-3 px-3 py-2.5 rounded-xl bg-stone-800/60 border border-stone-700/40">
        <p className="text-white text-xs font-semibold truncate leading-tight">{orgName}</p>
        <p className="text-stone-400 text-[10px] truncate leading-tight mt-0.5 capitalize">{orgRole}</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-1 px-2 space-y-0.5 overflow-y-auto">
        <p className="px-3 pt-1 pb-1.5 text-[10px] font-semibold tracking-widest text-stone-600 uppercase select-none">Menu</p>
        {sidebarNav}
      </nav>

      {/* User footer */}
      <div className="px-2 py-2 border-t border-stone-800/70">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-stone-800/60 transition-colors group">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-[11px] font-bold shrink-0 select-none shadow-sm">
            {user?.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-xs font-medium truncate leading-tight">{user?.name}</p>
            <p className="text-stone-500 text-[10px] truncate leading-tight capitalize">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="text-stone-600 hover:text-red-400 transition-colors shrink-0 p-1 rounded"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="px-1 pb-1">
          <ThemeToggle className="w-full justify-start" />
        </div>
      </div>
    </div>
  )
}

export function AppShell({ orgName, orgRole, sidebarNav, headerSlot, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const user = useAuthStore((s) => s.user)
  const isOwnerOrAdmin = user?.role === 'owner' || user?.role === 'admin'
  const isWorker = user?.role === 'worker'

  const matchDash = useMatch('/dashboard')
  const matchOrders = useMatch('/orders')
  const matchCustomers = useMatch('/customers')
  const matchExpenses = useMatch('/expenses')
  const matchSettings = useMatch('/settings')

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--page-bg)' }}>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col sticky top-0 h-screen shadow-[1px_0_0_0_rgba(0,0,0,0.08)]">
        <SidebarContent orgName={orgName} orgRole={orgRole} sidebarNav={sidebarNav} />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-72 h-full shadow-2xl">
            <SidebarContent
              orgName={orgName}
              orgRole={orgRole}
              sidebarNav={sidebarNav}
              onClose={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-40 flex items-center gap-3 px-4 py-3" style={{ background: '#0c0a09' }}>
          <button
            onClick={() => setMobileOpen(true)}
            className="text-stone-400 hover:text-white transition-colors p-1"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <BrandMark size={22} />
            <span className="text-white font-bold text-sm tracking-tight">WashFlow</span>
          </div>
        </div>

        {/* Desktop top bar */}
        <div className="hidden lg:flex items-center justify-between px-6 py-3 bg-white border-b border-stone-200 sticky top-0 z-30">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-stone-800">{orgName}</span>
          </div>
          <div className="flex items-center gap-2">
            {headerSlot}
            <ThemeToggle />
          </div>
        </div>

        {/* Mobile headerSlot */}
        {headerSlot && (
          <header className="lg:hidden bg-white border-b border-stone-200 px-4 py-3 sticky top-[49px] z-20">
            {headerSlot}
          </header>
        )}

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-stone-200 flex items-stretch">
          <BottomNavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" active={!!matchDash} />
          <BottomNavItem to="/orders" icon={Package} label="Orders" active={!!matchOrders} />
          <BottomNavItem to="/customers" icon={Users} label="Customers" active={!!matchCustomers} />
          {isOwnerOrAdmin && <BottomNavItem to="/expenses" icon={DollarSign} label="Expenses" active={!!matchExpenses} />}
          <BottomNavItem to="/settings" icon={Settings} label="Settings" active={!!matchSettings} />
        </nav>
      </div>
    </div>
  )
}

function BottomNavItem({ to, icon: Icon, label, active }: { to: string; icon: React.ElementType; label: string; active: boolean }) {
  return (
    <Link to={to} className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-semibold transition-colors ${active ? 'text-orange-500' : 'text-stone-400 hover:text-stone-600'}`}>
      <Icon className="w-5 h-5" />
      {label}
    </Link>
  )
}

/** Sidebar nav item — renders as <Link> when `to` is given, otherwise a <button> */
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
  const cls = `w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
    isActive
      ? 'bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/20'
      : 'text-stone-400 hover:bg-stone-800/70 hover:text-stone-100'
  }`

  if (to) {
    return (
      <Link to={to} className={cls}>
        <span className="shrink-0 w-4 h-4">{icon}</span>
        {label}
      </Link>
    )
  }

  return (
    <button onClick={onClick} className={cls}>
      <span className="shrink-0 w-4 h-4">{icon}</span>
      {label}
    </button>
  )
}
