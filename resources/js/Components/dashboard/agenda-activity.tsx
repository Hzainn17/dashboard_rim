import { Link, usePage } from '@inertiajs/react';
import {
    CalendarDays,
    CheckCheck,
    FolderKanban,
    HardHat,
    LogIn,
    LogOut,
    MessageSquare,
    Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageProps } from '@/types';
import { useAttendance } from './attendance-context';
import { AvatarStack, MemberAvatar } from './member-avatar';
import { calendarEventStyle, type UnifiedCalendarEvent } from './studio-calendar';

type LiveActivityItem = {
    id: number;
    user_id?: number | null;
    action: string;
    description: string;
    time?: string;
    created_at: string;
    created_at_human?: string;
    user?: {
        id: number;
        name: string;
        photo_url?: string | null;
    } | null;
};

function jakartaKey(date: Date) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(date);
}

export function StudioAgenda() {
    const { calendarEvents = [] } = usePage<PageProps & { calendarEvents?: UnifiedCalendarEvent[] }>().props;
    const { now } = useAttendance();
    const todayKey = jakartaKey(now ?? new Date());

    const todayEvents = calendarEvents
        .filter((e) => e.date === todayKey)
        .sort((a, b) => a.time.localeCompare(b.time));

    return (
        <section aria-labelledby="agenda-title" className="flex flex-col rounded-xl border bg-card">
            <div className="flex items-center justify-between border-b px-5 py-4">
                <div>
                    <h2 id="agenda-title" className="text-sm font-semibold">
                        Agenda Studio
                    </h2>
                    <p className="text-xs text-muted-foreground">
                        {todayEvents.length} kegiatan terjadwal hari ini
                    </p>
                </div>
                <Link href={route('calendar.index')} className="text-xs font-medium text-primary hover:underline">
                    Kalender
                </Link>
            </div>
            {todayEvents.length === 0 ? (
                <div className="m-4 flex flex-1 items-center justify-center rounded-lg border border-dashed px-4 py-10 text-center text-xs text-muted-foreground">
                    Tidak ada agenda studio terjadwal hari ini.
                </div>
            ) : (
                <ol className="flex flex-col p-2">
                    {todayEvents.slice(0, 5).map((item, i) => {
                        const style = calendarEventStyle[item.type] ?? calendarEventStyle.meeting;
                        return (
                            <li key={item.id} className="flex gap-3 rounded-lg p-3 transition-colors hover:bg-muted/50">
                                <div className="flex w-11 shrink-0 flex-col items-end">
                                    <span className="font-mono text-xs font-medium tabular-nums">
                                        {item.is_all_day ? 'Hari' : item.time}
                                    </span>
                                    {item.end_time && item.end_time !== item.time && (
                                        <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                                            {item.end_time}
                                        </span>
                                    )}
                                </div>
                                <div className="relative flex flex-col items-center" aria-hidden="true">
                                    <span className={cn('mt-1 size-2 rounded-full', style.dot)} />
                                    {i < Math.min(todayEvents.length, 5) - 1 && (
                                        <span className="mt-1 w-px flex-1 bg-border" />
                                    )}
                                </div>
                                <div className="min-w-0 flex-1 pb-1">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="text-sm leading-snug font-medium">{item.title}</p>
                                        <span className={cn('shrink-0 rounded px-1.5 py-px text-[10px] font-medium', style.chip)}>
                                            {style.label}
                                        </span>
                                    </div>
                                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                        {item.location || item.project_name || 'Studio RIM'}
                                    </p>
                                    {item.participants && item.participants.length > 0 && (
                                        <AvatarStack
                                            members={item.participants}
                                            max={4}
                                            className="mt-2 [&>span]:size-6 [&>span]:text-[9px]"
                                        />
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ol>
            )}
        </section>
    );
}

function getActivityIcon(action: string) {
    if (action.includes('checkin')) return LogIn;
    if (action.includes('checkout')) return LogOut;
    if (action.includes('site_visit')) return HardHat;
    if (action.includes('approval') || action.includes('leave') || action.includes('overtime')) return CheckCheck;
    if (action.includes('project') || action.includes('task')) return FolderKanban;
    if (action.includes('calendar')) return CalendarDays;
    if (action.includes('upload')) return Upload;
    return MessageSquare;
}

export function ActivityFeed() {
    const { activities = [] } = usePage<PageProps & { activities?: LiveActivityItem[] }>().props;

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
            {activities.length === 0 ? (
                <div className="m-4 flex flex-1 items-center justify-center rounded-lg border border-dashed px-4 py-10 text-center text-xs text-muted-foreground">
                    Belum ada aktivitas terbaru di studio.
                </div>
            ) : (
                <ul className="flex flex-col p-2">
                    {activities.map((a) => {
                        const Icon = getActivityIcon(a.action);
                        const userName = a.user?.name ?? 'Sistem Studio';
                        return (
                            <li key={a.id} className="flex gap-3 rounded-lg p-3 transition-colors hover:bg-muted/50">
                                <div className="relative">
                                    <MemberAvatar
                                        id={a.user?.id ?? 1}
                                        name={userName}
                                        photoUrl={a.user?.photo_url}
                                        className="size-8 ring-0"
                                    />
                                    <span className="absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full border bg-card">
                                        <Icon className="size-2.5 text-muted-foreground" aria-hidden="true" />
                                    </span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm leading-snug text-foreground">{a.description}</p>
                                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground tabular-nums">
                                        {a.time ? `${a.time} WIB` : ''}
                                        {a.created_at_human ? ` · ${a.created_at_human}` : ''}
                                    </p>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}
