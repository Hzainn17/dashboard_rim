import { teamById } from '@/lib/studio-data'
import { cn } from '@/lib/utils'

export function MemberAvatar({ id, className }: { id: string; className?: string }) {
  const member = teamById[id]
  if (!member) return null
  return (
    <span
      title={member.name}
      className={cn(
        'inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ring-2 ring-card',
        member.tone,
        className,
      )}
    >
      <span aria-hidden="true">{member.initials}</span>
      <span className="sr-only">{member.name}</span>
    </span>
  )
}

export function AvatarStack({ ids, max = 4, className }: { ids: string[]; max?: number; className?: string }) {
  const shown = ids.slice(0, max)
  const rest = ids.length - shown.length
  return (
    <div className={cn('flex -space-x-2', className)}>
      {shown.map((id) => (
        <MemberAvatar key={id} id={id} />
      ))}
      {rest > 0 && (
        <span className="inline-flex size-7 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground ring-2 ring-card">
          +{rest}
        </span>
      )}
    </div>
  )
}
