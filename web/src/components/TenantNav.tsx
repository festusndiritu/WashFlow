import { BarChart3, LayoutDashboard, Package, Ruler, Settings, Tag, TrendingDown, UserCheck, Users } from 'lucide-react'
import { NavItem } from './AppShell'

interface TenantNavProps {
  role: string
}

export function TenantNav({ role }: TenantNavProps) {
  const isManagement = role === 'owner' || role === 'admin'
  return (
    <>
      <NavItem icon={<LayoutDashboard size={18} />} label="Dashboard" to="/dashboard" />
      <NavItem icon={<Package size={18} />} label="Orders" to="/orders" />
      <NavItem icon={<UserCheck size={18} />} label="Customers" to="/customers" />
      <NavItem icon={<Tag size={18} />} label="Services" to="/services" />
      {isManagement && <NavItem icon={<TrendingDown size={18} />} label="Expenses" to="/expenses" />}
      {isManagement && <NavItem icon={<BarChart3 size={18} />} label="Reports" to="/reports" />}
      {isManagement && <NavItem icon={<Ruler size={18} />} label="Units" to="/units" />}
      {isManagement && <NavItem icon={<Users size={18} />} label="Team" to="/team" />}
      <NavItem icon={<Settings size={18} />} label="Settings" to="/settings" />
    </>
  )
}
