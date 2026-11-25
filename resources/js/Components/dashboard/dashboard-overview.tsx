import { usePage } from '@inertiajs/react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { type Role } from '@/lib/studio-data';
import { PageProps } from '@/types';
import { ActivityFeed, StudioAgenda } from './agenda-activity';
import { useAttendance } from './attendance-context';
import { AttendanceWidget } from './attendance-widget';
import { DailyFocusWidget } from './daily-focus-widget';
import { ProjectGallery } from './project-gallery';
import { QuickMetrics } from './quick-metrics';
import { StudioCalendar } from './studio-calendar';

function greeting(date: Date | null) {
    if (!date) return 'Halo';
    const hour = Number(
        new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', hour12: false }).format(date),
    );
    if (hour < 11) return 'Selamat pagi';
    if (hour < 15) return 'Selamat siang';
    if (hour < 18) return 'Selamat sore';
    return 'Selamat malam';
}

export function DashboardOverview({ role }: { role: Role }) {
    const { auth, flash } = usePage<PageProps>().props;
    const { now } = useAttendance();
    const displayName = auth?.user?.name || 'Tim Studio';
    const dateLabel = now
        ? new Intl.DateTimeFormat('id-ID', {
              timeZone: 'Asia/Jakarta',
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
          }).format(now)
        : '\u00a0';

    return (
        <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
            <div className="flex flex-col gap-1">
                <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase" suppressHydrationWarning>
                    {dateLabel}
                </p>
                <h1 className="text-2xl font-semibold tracking-tight text-balance md:text-3xl">
                    {greeting(now)}, {displayName.split(' ')[0]}.{' '}
                    <span className="text-muted-foreground">Ringkasan hari ini.</span>
                </h1>
            </div>

            {flash?.success && (
                <div className="flex items-center gap-2.5 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
                    <CheckCircle2 className="size-4 shrink-0" />
                    <span>{flash.success}</span>
                </div>
            )}
            {flash?.error && (
                <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    <AlertTriangle className="size-4 shrink-0" />
                    <span>{flash.error}</span>
                </div>
            )}

            <QuickMetrics role={role} />

            <DailyFocusWidget role={role} />

            <div
                className={
                    auth?.isFreelancer
                        ? 'grid grid-cols-1 gap-4 lg:grid-cols-2'
                        : 'grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3'
                }
            >
                {!auth?.isFreelancer && <AttendanceWidget />}
                <StudioAgenda />
                <div className={auth?.isFreelancer ? '' : 'lg:col-span-2 xl:col-span-1'}>
                    <ActivityFeed />
                </div>
            </div>

            <StudioCalendar />

            <ProjectGallery role={role} />
        </div>
    );
}
