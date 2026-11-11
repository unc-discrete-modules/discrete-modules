import { Outlet } from 'react-router-dom'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import ModuleSidebar from '@/components/ModuleSidebar'
import AccountControls from './AccountControls'
import { useProgress } from '@/context/progress-context-value'
import { ErrorState } from './RequestState'

export default function Layout() {
  const progress = useProgress()
  return (
    <SidebarProvider>
      <ModuleSidebar />
      <SidebarInset>
        <AccountControls />
        {progress?.error && (
          <ErrorState
            error={
              new Error(`Unable to load progress: ${progress.error.message}`)
            }
            retry={progress.retry}
          />
        )}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
