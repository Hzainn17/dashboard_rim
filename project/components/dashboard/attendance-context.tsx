'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export type AttendanceMode = 'office' | 'site'

type AttendanceState = {
  mode: AttendanceMode
  setMode: (mode: AttendanceMode) => void
  checkedInAt: Date | null
  checkedOutAt: Date | null
  siteProject: string | null
  setSiteProject: (id: string | null) => void
  checkIn: () => void
  checkOut: () => void
  now: Date | null
}

const AttendanceContext = createContext<AttendanceState | null>(null)

export function AttendanceProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<AttendanceMode>('office')
  const [checkedInAt, setCheckedInAt] = useState<Date | null>(null)
  const [checkedOutAt, setCheckedOutAt] = useState<Date | null>(null)
  const [siteProject, setSiteProject] = useState<string | null>(null)
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const checkIn = useCallback(() => {
    setCheckedInAt(new Date())
    setCheckedOutAt(null)
  }, [])

  const checkOut = useCallback(() => setCheckedOutAt(new Date()), [])

  const value = useMemo(
    () => ({ mode, setMode, checkedInAt, checkedOutAt, siteProject, setSiteProject, checkIn, checkOut, now }),
    [mode, checkedInAt, checkedOutAt, siteProject, checkIn, checkOut, now],
  )

  return <AttendanceContext.Provider value={value}>{children}</AttendanceContext.Provider>
}

export function useAttendance() {
  const ctx = useContext(AttendanceContext)
  if (!ctx) throw new Error('useAttendance must be used within AttendanceProvider')
  return ctx
}

export function formatClock(date: Date) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date)
}

export function formatDuration(ms: number) {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000))
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${h}j ${m.toString().padStart(2, '0')}m`
}
