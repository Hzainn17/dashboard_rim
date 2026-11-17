'use client'

import { currentUser, type Role } from '@/lib/studio-data'
import { ActivityFeed, StudioAgenda } from './agenda-activity'
import { useAttendance } from './attendance-context'
import { AttendanceWidget } from './attendance-widget'
import { ProjectGallery } from './project-gallery'
import { QuickMetrics } from './quick-metrics'
import { StudioCalendar } from './studio-calendar'

function greeting(date: Date | null) {
  if (!date) return 'Halo'
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', hour12: false }).format(date),
  )
  if (hour < 11) return 'Selamat pagi'
  if (hour < 15) return 'Selamat siang'
  if (hour < 18) return 'Selamat sore'
  return 'Selamat malam'
}

export function DashboardOverview({ role }: { role: Role }) {
  const { now } = useAttendance()
  const user = currentUser[role]
  const dateLabel = now
    ? new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(now)
    : '\u00a0'

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase" suppressHydrationWarning>
          {dateLabel}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-balance md:text-3xl">
          {greeting(now)}, {user.name.split(' ')[0]}.{' '}
          <span className="text-muted-foreground">Ringkasan hari ini.</span>
        </h1>
      </div>

      <QuickMetrics role={role} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <AttendanceWidget />
        <StudioAgenda />
        <div className="lg:col-span-2 xl:col-span-1">
          <ActivityFeed />
        </div>
      </div>

      <StudioCalendar />

      <ProjectGallery role={role} />
    </div>
  )
}
