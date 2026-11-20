import { usePage } from '@inertiajs/react';
import { ArrowUpRight, TrendingDown, TrendingUp } from 'lucide-react';
import type { Role } from '@/lib/studio-data';
import { cn } from '@/lib/utils';
import { PageProps } from '@/types';

type MetricCardData = {
    label: string;
    value: string;
    suffix?: string;
    badge: string;
    badgeTone: 'positive' | 'negative' | 'warning';
    hint: string;
    variant: 'featured' | 'standard' | 'sparkline';
};

type LiveDashboardMetrics = {
    present_count: number;
    total_employees: number;
    site_visit_count: number;
    active_projects_count: number;
    urgent_projects_count: number;
    urgent_project_names?: string;
    my_active_projects_count?: number;
    my_active_project_names?: string;
    my_week_work_hours?: number;
    my_overtime_hours?: number;
    my_month_attendance_days?: number;
};

export function QuickMetrics({ role }: { role: Role }) {
    const { auth, metrics: liveMetrics } = usePage<PageProps & { metrics?: LiveDashboardMetrics }>().props;
    const isFieldWorker = auth?.workType === 'lapangan';
    const dailyTargetHours = auth?.targetWorkHours ?? (isFieldWorker ? 8 : 9);
    const weeklyTargetHours = isFieldWorker ? dailyTargetHours * 6 : dailyTargetHours * 5;

    const totalEmp = liveMetrics?.total_employees ?? 1;
    const presentCount = liveMetrics?.present_count ?? 0;
    const presentPct = Math.round((presentCount / Math.max(1, totalEmp)) * 100);
    const siteVisitCount = liveMetrics?.site_visit_count ?? 0;
    const urgentCount = liveMetrics?.urgent_projects_count ?? 0;
    const activeCount = liveMetrics?.active_projects_count ?? 0;

    const weekHours = liveMetrics?.my_week_work_hours ?? 0;
    const weekPct = Math.min(100, Math.round((weekHours / Math.max(1, weeklyTargetHours)) * 100));
    const myProjectsCount = liveMetrics?.my_active_projects_count ?? 0;
    const myOvertimeHours = liveMetrics?.my_overtime_hours ?? 0;
    const myAttendanceDays = liveMetrics?.my_month_attendance_days ?? 0;

    const adminMetrics: MetricCardData[] = [
        {
            label: 'Hadir di Kantor',
            value: String(presentCount),
            suffix: `/${totalEmp}`,
            badge: `${presentPct}%`,
            badgeTone: 'positive',
            hint: `${siteVisitCount} tim sedang site visit lapangan`,
            variant: 'featured',
        },
        {
            label: 'Site Visit Lapangan',
            value: String(siteVisitCount),
            suffix: 'tim',
            badge: siteVisitCount > 0 ? 'Aktif' : 'Standby',
            badgeTone: 'positive',
            hint: 'Kunjungan proyek terjadwal hari ini',
            variant: 'standard',
        },
        {
            label: 'Deadline Mendesak',
            value: String(urgentCount),
            suffix: 'proyek',
            badge: urgentCount > 0 ? '< 7 hari' : 'Aman',
            badgeTone: urgentCount > 0 ? 'negative' : 'positive',
            hint: liveMetrics?.urgent_project_names || 'Tidak ada deadline mendesak',
            variant: 'standard',
        },
        {
            label: 'Proyek Berjalan',
            value: String(activeCount),
            suffix: 'aktif',
            badge: 'Live DB',
            badgeTone: 'positive',
            hint: 'Proyek aktif dalam fase desain & review',
            variant: 'sparkline',
        },
    ];

    const karyawanMetrics: MetricCardData[] = [
        {
            label: 'Jam Kerja Minggu Ini',
            value: String(weekHours).replace('.', ','),
            suffix: 'jam',
            badge: `${weekPct}%`,
            badgeTone: 'positive',
            hint: isFieldWorker
                ? `Target ${weeklyTargetHours} jam / minggu (Sen–Sab)`
                : `Target ${weeklyTargetHours} jam / minggu (Sen–Jum)`,
            variant: 'featured',
        },
        {
            label: isFieldWorker ? 'Proyek Lapangan Saya' : 'Proyek Perencanaan Saya',
            value: String(myProjectsCount),
            suffix: 'aktif',
            badge: myProjectsCount > 0 ? 'Aktif' : 'Kosong',
            badgeTone: 'positive',
            hint: liveMetrics?.my_active_project_names || 'Belum ada proyek ditugaskan',
            variant: 'standard',
        },
        {
            label: 'Estimasi Lembur',
            value: String(myOvertimeHours).replace('.', ','),
            suffix: 'jam',
            badge: myOvertimeHours > 0 ? 'Bulan ini' : '0 jam',
            badgeTone: myOvertimeHours > 0 ? 'warning' : 'positive',
            hint: 'Tercatat pada periode berjalan',
            variant: 'standard',
        },
        {
            label: 'Kehadiran Bulan Ini',
            value: String(myAttendanceDays),
            suffix: 'hari',
            badge: 'Tercatat',
            badgeTone: 'positive',
            hint: 'Total presensi sah bulan berjalan',
            variant: 'sparkline',
        },
    ];

    const metrics = role === 'admin' ? adminMetrics : karyawanMetrics;

    return (
        <section aria-label="Metrik cepat" className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map((m) => {
                if (m.variant === 'featured') {
                    return <FeaturedMetricCard key={m.label} item={m} />;
                }
                if (m.variant === 'sparkline') {
                    return <SparklineMetricCard key={m.label} item={m} />;
                }
                return <StandardMetricCard key={m.label} item={m} />;
            })}
        </section>
    );
}

function FeaturedMetricCard({ item }: { item: MetricCardData }) {
    return (
        <div className="group relative flex min-h-[152px] flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-[#46797b] via-[#3b696b] to-[#2b5052] p-5 text-primary-foreground shadow-[0_10px_28px_-8px_rgb(43_80_82/0.45)]">
            {/* Soft decorative arcs in background */}
            <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-8 -bottom-10 size-36 rounded-full bg-white/10 transition-transform duration-500 group-hover:scale-105"
            />
            <span
                aria-hidden="true"
                className="pointer-events-none absolute right-8 -bottom-16 size-28 rounded-full bg-white/6"
            />

            {/* Top Row */}
            <div className="relative z-10 flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-white/90">{item.label}</p>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-xs transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                    <ArrowUpRight className="size-4" aria-hidden="true" />
                </span>
            </div>

            {/* Bottom Row */}
            <div className="relative z-10 mt-4">
                <div className="flex flex-wrap items-center gap-2.5">
                    <p className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold tracking-tight tabular-nums md:text-3xl">
                            {item.value}
                        </span>
                        {item.suffix && (
                            <span className="text-sm font-medium text-white/80">{item.suffix}</span>
                        )}
                    </p>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-xs">
                        <TrendingUp className="size-3" aria-hidden="true" />
                        {item.badge}
                    </span>
                </div>
                <p className="mt-1.5 text-[11px] text-white/75">{item.hint}</p>
            </div>
        </div>
    );
}

function StandardMetricCard({ item }: { item: MetricCardData }) {
    const isNegative = item.badgeTone === 'negative';
    const isWarning = item.badgeTone === 'warning';

    return (
        <div className="group relative flex min-h-[152px] flex-col justify-between overflow-hidden rounded-2xl border bg-card p-5 shadow-2xs transition-shadow hover:shadow-md">
            {/* Soft corner accent */}
            <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-10 -bottom-12 size-32 rounded-full bg-accent/50"
            />

            {/* Top Row */}
            <div className="relative z-10 flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full border bg-background text-foreground transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:bg-accent">
                    <ArrowUpRight className="size-4" aria-hidden="true" />
                </span>
            </div>

            {/* Bottom Row */}
            <div className="relative z-10 mt-4">
                <div className="flex flex-wrap items-center gap-2.5">
                    <p className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold tracking-tight text-foreground tabular-nums md:text-3xl">
                            {item.value}
                        </span>
                        {item.suffix && (
                            <span className="text-sm font-medium text-muted-foreground">
                                {item.suffix}
                            </span>
                        )}
                    </p>
                    <span
                        className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                            isNegative
                                ? 'bg-destructive/12 text-destructive'
                                : isWarning
                                ? 'bg-warning/20 text-amber-800'
                                : 'bg-success/15 text-success',
                        )}
                    >
                        {isNegative ? (
                            <TrendingDown className="size-3" aria-hidden="true" />
                        ) : (
                            <TrendingUp className="size-3" aria-hidden="true" />
                        )}
                        {item.badge}
                    </span>
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">{item.hint}</p>
            </div>
        </div>
    );
}

function SparklineMetricCard({ item }: { item: MetricCardData }) {
    const gradId = `spark-${item.label.replace(/\s+/g, '-').toLowerCase()}`;

    return (
        <div className="group relative flex min-h-[152px] flex-col justify-between overflow-hidden rounded-2xl border bg-card p-5 pb-3.5 shadow-2xs transition-shadow hover:shadow-md">
            {/* Top Row: Label & Value + Pill */}
            <div className="relative z-10">
                <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full border bg-background text-foreground transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:bg-accent">
                        <ArrowUpRight className="size-4" aria-hidden="true" />
                    </span>
                </div>

                <div className="mt-1 flex items-center gap-2">
                    <p className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold tracking-tight text-primary tabular-nums">
                            {item.value}
                        </span>
                        {item.suffix && (
                            <span className="text-xs font-medium text-muted-foreground">
                                {item.suffix}
                            </span>
                        )}
                    </p>
                    <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-semibold text-success">
                        <TrendingUp className="size-3" aria-hidden="true" />
                        {item.badge}
                    </span>
                </div>
            </div>

            {/* Crisp Contained Area Sparkline Chart */}
            <div className="relative mt-2 h-12 w-full overflow-hidden rounded-lg">
                <svg
                    viewBox="0 0 240 48"
                    className="h-full w-full"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                >
                    <defs>
                        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#46797b" stopOpacity="0.28" />
                            <stop offset="100%" stopColor="#46797b" stopOpacity="0.04" />
                        </linearGradient>
                    </defs>
                    {/* Area fill */}
                    <path
                        d="M 0,36 C 22,36 34,18 56,18 C 78,18 90,34 114,32 C 136,30 148,10 172,10 C 194,10 206,28 224,22 C 232,19 236,15 240,14 L 240,48 L 0,48 Z"
                        fill={`url(#${gradId})`}
                    />
                    {/* Uniform non-scaling stroke line */}
                    <path
                        d="M 0,36 C 22,36 34,18 56,18 C 78,18 90,34 114,32 C 136,30 148,10 172,10 C 194,10 206,28 224,22 C 232,19 236,15 240,14"
                        fill="none"
                        stroke="#46797b"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                    />
                </svg>
            </div>
        </div>
    );
}
