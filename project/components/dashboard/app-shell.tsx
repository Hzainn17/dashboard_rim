'use client'

import { useState } from 'react'
import { Construction } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { adminNav, karyawanNav, type Role } from '@/lib/studio-data'
import { AttendanceProvider } from './attendance-context'
import { DashboardOverview } from './dashboard-overview'
import { SidebarContent } from './sidebar-content'
import { TopHeader } from './top-header'

function findLabel(role: Role, id: string) {
  const nav = role === 'admin' ? adminNav : karyawanNav
  for (const item of nav) {
    if (item.id === id) return item.label
    const child = item.children?.find((c) => c.id === id)
    if (child) return child.label
  }
  return ''
}

export function AppShell() {
  const [role, setRole] = useState<Role>('admin')
  const [active, setActive] = useState('dashboard')
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleRoleChange = (next: Role) => {
    setRole(next)
    setActive('dashboard')
  }

  const handleNavigate = (id: string) => {
    setActive(id)
    setMobileOpen(false)
  }

  const sidebarProps = { role, onRoleChange: handleRoleChange, active, onNavigate: handleNavigate }

  return (
    <AttendanceProvider>
      <div className="flex min-h-dvh">
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-r bg-sidebar lg:block">
          <SidebarContent {...sidebarProps} />
        </aside>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-72 gap-0 bg-sidebar p-0" showCloseButton={false}>
            <SheetTitle className="sr-only">Navigasi</SheetTitle>
            <SidebarContent {...sidebarProps} />
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col">
          <TopHeader onOpenMenu={() => setMobileOpen(true)} />
          <main className="flex-1 px-4 py-6 md:px-6 lg:px-8 lg:py-8">
            {active === 'dashboard' ? (
              <DashboardOverview role={role} />
            ) : (
              <SectionPlaceholder title={findLabel(role, active)} onBack={() => setActive('dashboard')} />
            )}
          </main>
        </div>
      </div>
    </AttendanceProvider>
  )
}

function SectionPlaceholder({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-3 rounded-xl border border-dashed bg-card px-6 py-16 text-center">
      <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
        <Construction className="size-5" aria-hidden="true" />
      </span>
      <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground">
        Modul ini sedang disiapkan. Kembali ke ringkasan untuk melihat presensi dan proyek hari ini.
      </p>
      <button
        type="button"
        onClick={onBack}
        className="mt-2 rounded-lg bg-foreground px-3 py-1.5 text-sm font-medium text-background outline-none hover:bg-foreground/90 focus-visible:ring-3 focus-visible:ring-ring/30"
      >
        Kembali ke Ringkasan
      </button>
    </div>
  )
}
