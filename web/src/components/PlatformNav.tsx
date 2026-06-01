import { LayoutDashboard, Building2, TrendingUp, Package, Users, Layers } from 'lucide-react'
import { NavItem } from './AppShell'

export function PlatformNav() {
  return (
    <>
      <NavItem icon={<LayoutDashboard />} label="Overview"      to="/platform" />
      <NavItem icon={<Building2 />}       label="Organizations" to="/platform/tenants" />
      <NavItem icon={<TrendingUp />}      label="Revenue"       to="/platform/revenue" />
      <NavItem icon={<Package />}         label="All Orders"    to="/platform/orders" />
      <NavItem icon={<Users />}           label="Users"         to="/platform/users" />
      <NavItem icon={<Layers />}          label="Plans"         to="/platform/plans" />
    </>
  )
}
