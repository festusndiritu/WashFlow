import React, { useState, type ReactNode } from 'react'
import { Link, useMatch } from 'react-router-dom'
import { LogOut, Menu, X, Shirt, LayoutDashboard, Package, Users, DollarSign, Settings } from 'lucide-react'
import { useAuthStore } from '../store/auth'

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
    <div className="flex flex-col h-full bg-stone-950">
      {/* Brand */}
      <div className="px-4 py-4 flex items-center justify-between border-b border-stone-800/60">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-6 h-6 bg-orange-500 rounded-md flex items-center justify-center shrink-0">
              <Shirt className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-white font-bold text-sm tracking-tight">WashFlow</span>
          </div>
          <p className="text-stone-500 text-[11px] truncate pl-8 max-w-[160px]">{orgName}</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-stone-500 hover:text-white transition-colors p-1 rounded lg:hidden">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {sidebarNav}
      </nav>

      {/* User footer */}
      <div className="px-3 py-3 border-t border-stone-800/60">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-white text-[11px] font-bold shrink-0 select-none">
            {user?.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-xs font-medium truncate leading-tight">{user?.name}</p>
            <p className="text-stone-500 text-[10px] truncate leading-tight capitalize">{orgRole}</p>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="text-stone-500 hover:text-white transition-colors shrink-0 p-1.5 rounded hover:bg-stone-800"
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
  const isWorker = user?.role === 'worker'

  const matchDash = useMatch('/dashboard')
  const matchOrders = useMatch('/orders')
  const matchCustomers = useMatch('/customers')
  const matchExpenses = useMatch('/expenses')
  const matchSettings = useMatch('/settings')

  return (
    <div className="min-h-screen flex bg-stone-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col sticky top-0 h-screen">
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
        <div className="lg:hidden bg-stone-950 px-4 py-3 flex items-center gap-3 sticky top-0 z-40">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-stone-400 hover:text-white transition-colors p-1"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-orange-500 rounded flex items-center justify-center">
              <Shirt className="w-3 h-3 text-white" />
            </div>
            <span className="text-white font-bold text-sm tracking-tight">WashFlow</span>
          </div>
        </div>

        {headerSlot && (
          <header className="bg-white border-b border-stone-200 px-4 lg:px-6 py-4 sticky top-0 lg:top-0 z-30">
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
  const cls = `w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
    isActive
      ? 'bg-orange-500 text-white'
      : 'text-stone-400 hover:bg-stone-800 hover:text-stone-100'
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
