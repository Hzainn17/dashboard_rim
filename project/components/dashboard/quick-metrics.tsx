import { AlarmClock, Briefcase, Building2, CalendarCheck, Clock3, FolderOpen, HardHat, Wallet, type LucideIcon } from 'lucide-react'
import type { Role } from '@/lib/studio-data'
import { cn } from '@/lib/utils'

type Metric = {
  label: string
  value: string
  suffix?: string
  hint: string
  icon: LucideIcon
  ratio?: number
  urgent?: boolean
}

const adminMetrics: Metric[] = [
  { label: 'Hadir di Kantor', value: '12', suffix: '/15', hint: '3 tim sedang di lapangan', icon: Building2, ratio: 12 / 15 },
  { label: 'Site Visit Lapangan', value: '3', suffix: 'tim', hint: 'Bandung · Lembang · Jakarta', icon: HardHat, ratio: 3 / 15 },
  { label: 'Proyek Berjalan', value: '8', suffix: 'aktif', hint: '+2 dibanding bulan lalu', icon: FolderOpen, ratio: 8 / 10 },
  { label: 'Deadline Mendesak', value: '2', suffix: 'proyek', hint: 'Jatuh tempo < 7 hari', icon: AlarmClock, urgent: true },
]

const karyawanMetrics: Metric[] = [
  { label: 'Jam Kerja Minggu Ini', value: '31', suffix: 'jam', hint: 'Target 45 jam / minggu', icon: Clock3, ratio: 31 / 45 },
  { label: 'Proyek Saya', value: '2', suffix: 'aktif', hint: 'Canggu · Sudirman', icon: Briefcase, ratio: 2 / 4 },
  { label: 'Kehadiran Bulan Ini', value: '96', suffix: '%', hint: '11 dari 12 hari kerja tepat waktu', icon: CalendarCheck, ratio: 0.96 },
  { label: 'Estimasi Lembur', value: '4,5', suffix: 'jam', hint: 'Masuk slip gaji November', icon: Wallet },
]

export function QuickMetrics({ role }: { role: Role }) {
  const metrics = role === 'admin' ? adminMetrics : karyawanMetrics
  return (
    <section aria-label="Metrik cepat" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {metrics.map((m) => {
        const Icon = m.icon
        return (
          <div
            key={m.label}
            className={cn(
              'flex flex-col gap-3 rounded-xl border bg-card p-4',
              m.urgent && 'border-primary/30 bg-accent/40',
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">{m.label}</p>
              <Icon className={cn('size-4', m.urgent ? 'text-primary' : 'text-muted-foreground')} aria-hidden="true" />
            </div>
            <p className="flex items-baseline gap-1">
              <span className="text-2xl font-semibold tracking-tight tabular-nums md:text-3xl">{m.value}</span>
              {m.suffix && <span className="text-sm text-muted-foreground">{m.suffix}</span>}
            </p>
            {typeof m.ratio === 'number' ? (
              <div className="h-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                <div className="h-full rounded-full bg-foreground/80" style={{ width: `${m.ratio * 100}%` }} />
              </div>
            ) : (
              <div className="h-1" aria-hidden="true" />
            )}
            <p className={cn('text-[11px] leading-snug', m.urgent ? 'text-accent-foreground' : 'text-muted-foreground')}>{m.hint}</p>
          </div>
        )
      })}
    </section>
  )
}
