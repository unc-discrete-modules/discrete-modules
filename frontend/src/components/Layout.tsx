import { Outlet } from 'react-router-dom'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import ModuleSidebar from '@/components/ModuleSidebar'
import AccountControls from './AccountControls'

export default function Layout() {
  return (
    <SidebarProvider>
      <ModuleSidebar />
      <SidebarInset>
        <AccountControls />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
