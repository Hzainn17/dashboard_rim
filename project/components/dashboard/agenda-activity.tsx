import { Camera, CheckCheck, HardHat, LogIn, MessageSquare, Upload } from 'lucide-react'
import { activities, agenda, teamById, type Activity, type AgendaItem } from '@/lib/studio-data'
import { cn } from '@/lib/utils'
import { AvatarStack, MemberAvatar } from './member-avatar'

const agendaStyle: Record<AgendaItem['type'], { label: string; dot: string; chip: string }> = {
  meeting: { label: 'Meeting', dot: 'bg-stone-500', chip: 'bg-stone-100 text-stone-700' },
  site: { label: 'Site Visit', dot: 'bg-emerald-600', chip: 'bg-emerald-50 text-emerald-800' },
  review: { label: 'Review', dot: 'bg-amber-500', chip: 'bg-amber-50 text-amber-800' },
  deadline: { label: 'Deadline', dot: 'bg-primary', chip: 'bg-accent text-accent-foreground' },
}

export function StudioAgenda() {
  return (
    <section aria-labelledby="agenda-title" className="flex flex-col rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div>
          <h2 id="agenda-title" className="text-sm font-semibold">
            Agenda Studio
          </h2>
          <p className="text-xs text-muted-foreground">{agenda.length} kegiatan terjadwal hari ini</p>
        </div>
        <a href="#kalender-studio" className="text-xs font-medium text-primary hover:underline">
          Kalender
        </a>
      </div>
      <ol className="flex flex-col p-2">
        {agenda.map((item, i) => {
          const style = agendaStyle[item.type]
          return (
            <li key={item.id} className="flex gap-3 rounded-lg p-3 transition-colors hover:bg-muted/50">
              <div className="flex w-11 shrink-0 flex-col items-end">
                <span className="font-mono text-xs font-medium tabular-nums">{item.time}</span>
                {item.end !== item.time && (
                  <span className="font-mono text-[11px] text-muted-foreground tabular-nums">{item.end}</span>
                )}
              </div>
              <div className="relative flex flex-col items-center" aria-hidden="true">
                <span className={cn('mt-1 size-2 rounded-full', style.dot)} />
                {i < agenda.length - 1 && <span className="mt-1 w-px flex-1 bg-border" />}
              </div>
              <div className="min-w-0 flex-1 pb-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm leading-snug font-medium">{item.title}</p>
                  <span className={cn('shrink-0 rounded px-1.5 py-px text-[10px] font-medium', style.chip)}>{style.label}</span>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.place}</p>
                <AvatarStack ids={item.people} max={4} className="mt-2 [&>span]:size-6 [&>span]:text-[9px]" />
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

const activityIcon: Record<Activity['kind'], typeof Camera> = {
  checkin: LogIn,
  upload: Upload,
  approval: CheckCheck,
  site: HardHat,
  comment: MessageSquare,
}

export function ActivityFeed() {
  return (
    <section aria-labelledby="activity-title" className="flex flex-col rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div>
          <h2 id="activity-title" className="text-sm font-semibold">
            Aktivitas Tim
          </h2>
          <p className="text-xs text-muted-foreground">Pembaruan terbaru dari studio</p>
        </div>
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-success">
          <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
          Live
        </span>
      </div>
      <ul className="flex flex-col p-2">
        {[...activities].reverse().map((a) => {
          const Icon = activityIcon[a.kind]
          const member = teamById[a.who]
          return (
            <li key={a.id} className="flex gap-3 rounded-lg p-3 transition-colors hover:bg-muted/50">
              <div className="relative">
                <MemberAvatar id={a.who} className="size-8 ring-0" />
                <span className="absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full border bg-card">
                  <Icon className="size-2.5 text-muted-foreground" aria-hidden="true" />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-snug">
                  <span className="font-medium">{member.name.split(' ')[0]}</span>{' '}
                  <span className="text-muted-foreground">{a.action}</span>{' '}
                  <span className="font-medium">{a.target}</span>
                </p>
                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground tabular-nums">{a.time} WIB</p>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
