import { Link, usePage } from '@inertiajs/react';
import { AlertTriangle, ArrowUpRight, CheckCircle2, HardHat, MapPin } from 'lucide-react';
import { type Role } from '@/lib/studio-data';
import { PageProps } from '@/types';
import { ActivityFeed, StudioAgenda } from './agenda-activity';
import { useAttendance } from './attendance-context';
import { AttendanceWidget } from './attendance-widget';
import { DailyFocusWidget } from './daily-focus-widget';
import { ProjectGallery } from './project-gallery';
import { QuickMetrics } from './quick-metrics';
import { StudioCalendar, type UnifiedCalendarEvent } from './studio-calendar';

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
    const { auth, flash, upcomingFieldSchedules = [] } = usePage<
        PageProps & { upcomingFieldSchedules?: UnifiedCalendarEvent[] }
    >().props;
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

            {upcomingFieldSchedules.length > 0 && (
                <section className="rounded-xl border border-amber-200/90 bg-gradient-to-r from-amber-50/90 via-card to-orange-50/40 p-4 shadow-2xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <span className="flex size-7 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                                <HardHat className="size-4" />
                            </span>
                            <div>
                                <h2 className="text-xs font-bold text-amber-950 sm:text-sm">
                                    Pengingat Jadwal Lapangan &amp; Perbaikan Terdekat ({upcomingFieldSchedules.length})
                                </h2>
                                <p className="text-[11px] text-amber-900/75">
                                    Agenda perbaikan / kunjungan lapangan dalam 7 hari ke depan
                                </p>
                            </div>
                        </div>
                        <Link
                            href={route('projects.field')}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 hover:underline"
                        >
                            Buka Kalender Lapangan
                            <ArrowUpRight className="size-3.5" />
                        </Link>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {upcomingFieldSchedules.map((ev) => {
                            const itemCount = ev.checklist_items?.length ?? 0;
                            return (
                                <Link
                                    key={ev.id}
                                    href={route('projects.field')}
                                    className="flex flex-col gap-1 rounded-lg border border-amber-200/70 bg-white/90 px-3 py-2.5 text-xs transition hover:border-amber-400 hover:shadow-2xs"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-mono text-[10px] font-bold text-amber-800">
                                            {ev.date} · {ev.time}
                                        </span>
                                        {itemCount > 0 && (
                                            <span className="rounded-full bg-amber-100 px-1.5 py-px text-[10px] font-semibold text-amber-900">
                                                {itemCount} item
                                            </span>
                                        )}
                                    </div>
                                    <p className="truncate font-semibold text-foreground">
                                        {ev.title}
                                    </p>
                                    {(ev.location || ev.project_name) && (
                                        <p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                                            <MapPin className="size-3 shrink-0 text-amber-700" />
                                            {ev.project_name || ev.location}
                                        </p>
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                </section>
            )}

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
