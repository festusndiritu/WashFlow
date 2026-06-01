import { LayoutDashboard, Building2, TrendingUp, Package, Users } from 'lucide-react'
import { NavItem } from './AppShell'

type PlatformSection = 'overview' | 'tenants' | 'revenue' | 'orders' | 'users'

export function PlatformNav({ active }: { active: PlatformSection }) {
  return (
    <>
      <NavItem icon={<LayoutDashboard />} label="Overview"      to="/platform"          active={active === 'overview'} />
      <NavItem icon={<Building2 />}       label="Organizations" to="/platform/tenants"  active={active === 'tenants'} />
      <NavItem icon={<TrendingUp />}      label="Revenue"       to="/platform/revenue"  active={active === 'revenue'} />
      <NavItem icon={<Package />}         label="All Orders"    to="/platform/orders"   active={active === 'orders'} />
      <NavItem icon={<Users />}           label="Users"         to="/platform/users"    active={active === 'users'} />
    </>
  )
}
