import * as React from 'react';
import { useMemo, useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    AlertCircle,
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Clock,
    Eye,
    HardHat,
    Layers,
    ListFilter,
    MapPin,
    Plus,
    Trash2,
    Users,
    X,
} from 'lucide-react';
import { AppShell } from '@/Components/dashboard/app-shell';
import { AvatarStack } from '@/Components/dashboard/member-avatar';
import { PageProps } from '@/types';
import { cn } from '@/lib/utils';
import { getAvatarTone } from '@/lib/studio-data';

interface CalendarEventItem {
    id: string;
    raw_id: number;
    title: string;
    description?: string | null;
    location?: string | null;
    type: 'meeting' | 'site_visit' | 'deadline' | 'milestone' | 'holiday' | 'other';
    start_at: string;
    end_at: string;
    date: string;
    time: string;
    end_time?: string | null;
    is_all_day: boolean;
    is_virtual: boolean;
    project_id?: number | null;
    project_name?: string | null;
    creator_name: string;
    participants: {
        id: number;
        name: string;
        position: string;
        photo_url?: string | null;
    }[];
}

interface ProjectOption {
    id: number;
    name: string;
    location?: string | null;
}

interface TeamMemberOption {
    id: number;
    name: string;
    employee_code: string;
    position: string;
    department: string;
    photo_url?: string | null;
}

interface Props extends PageProps {
    events: CalendarEventItem[];
    projects: ProjectOption[];
    teamMembers: TeamMemberOption[];
    currentMonth: number;
    currentYear: number;
    filterType: string;
}

const weekdays = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

const eventTypeConfig: Record<
    CalendarEventItem['type'],
    { label: string; dot: string; badge: string; border: string }
> = {
    meeting: {
        label: 'Rapat / Koordinasi',
        dot: 'bg-zinc-600',
        badge: 'bg-zinc-100 text-zinc-800 border-zinc-200',
        border: 'border-l-zinc-500',
    },
    site_visit: {
        label: 'Site Visit',
        dot: 'bg-emerald-600',
        badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        border: 'border-l-emerald-500',
    },
    deadline: {
        label: 'Deadline Proyek',
        dot: 'bg-rose-600',
        badge: 'bg-rose-50 text-rose-800 border-rose-200',
        border: 'border-l-rose-500',
    },
    milestone: {
        label: 'Review Klien / Asistensi',
        dot: 'bg-amber-600',
        badge: 'bg-amber-50 text-amber-800 border-amber-200',
        border: 'border-l-amber-500',
    },
    holiday: {
        label: 'Libur Studio',
        dot: 'bg-red-600',
        badge: 'bg-red-50 text-red-800 border-red-200',
        border: 'border-l-red-500',
    },
    other: {
        label: 'Internal Studio',
        dot: 'bg-purple-600',
        badge: 'bg-purple-50 text-purple-800 border-purple-200',
        border: 'border-l-purple-500',
    },
};

function toDateKey(year: number, month: number, day: number): string {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function CalendarIndex({
    auth,
    events,
    projects,
    teamMembers,
    currentMonth,
    currentYear,
    filterType,
}: Props) {
    const isAdmin = auth.user.role === 'super_admin' || auth.user.role === 'admin';
    const initialRole = isAdmin ? 'admin' : 'karyawan';

    const today = new Date();
    const todayKey = toDateKey(
        today.getFullYear(),
        today.getMonth() + 1,
        today.getDate()
    );

    const [selectedDateKey, setSelectedDateKey] = useState<string>(todayKey);
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
    const [selectedType, setSelectedType] = useState<string>(filterType || 'all');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedEventForDetail, setSelectedEventForDetail] = useState<CalendarEventItem | null>(
        null
    );

    // Group events by date
    const eventsByDate = useMemo(() => {
        const map = new Map<string, CalendarEventItem[]>();
        for (const e of events) {
            const list = map.get(e.date) ?? [];
            list.push(e);
            map.set(e.date, list);
        }
        return map;
    }, [events]);

    // Calendar grid calculations
    const calendarDays = useMemo(() => {
        const firstDayOfWeek = (new Date(currentYear, currentMonth - 1, 1).getDay() + 6) % 7;
        const totalDaysInMonth = new Date(currentYear, currentMonth, 0).getDate();

        const cells: {
            day: number | null;
            dateKey: string | null;
            isCurrentMonth: boolean;
        }[] = [];

        for (let i = 0; i < firstDayOfWeek; i++) {
            cells.push({ day: null, dateKey: null, isCurrentMonth: false });
        }

        for (let d = 1; d <= totalDaysInMonth; d++) {
            const dateKey = toDateKey(currentYear, currentMonth, d);
            cells.push({ day: d, dateKey, isCurrentMonth: true });
        }

        while (cells.length % 7 !== 0) {
            cells.push({ day: null, dateKey: null, isCurrentMonth: false });
        }

        return cells;
    }, [currentYear, currentMonth]);

    const monthLabel = new Intl.DateTimeFormat('id-ID', {
        month: 'long',
        year: 'numeric',
    }).format(new Date(currentYear, currentMonth - 1, 1));

    const selectedEvents = eventsByDate.get(selectedDateKey) || [];

    const navigateMonth = (delta: number) => {
        let newMonth = currentMonth + delta;
        let newYear = currentYear;

        if (newMonth < 1) {
            newMonth = 12;
            newYear -= 1;
        } else if (newMonth > 12) {
            newMonth = 1;
            newYear += 1;
        }

        router.get(
            route('calendar.index'),
            { month: newMonth, year: newYear, type: selectedType },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleFilterTypeChange = (type: string) => {
        setSelectedType(type);
        router.get(
            route('calendar.index'),
            { month: currentMonth, year: currentYear, type },
            { preserveState: true, preserveScroll: true }
        );
    };

    const goToToday = () => {
        const now = new Date();
        setSelectedDateKey(todayKey);
        router.get(
            route('calendar.index'),
            { month: now.getMonth() + 1, year: now.getFullYear(), type: selectedType },
            { preserveState: true, preserveScroll: true }
        );
    };

    // Create Event Form
    const eventForm = useForm({
        title: '',
        type: 'meeting' as CalendarEventItem['type'],
        project_id: '' as string | number,
        start_date: selectedDateKey,
        start_time: '09:00',
        end_date: selectedDateKey,
        end_time: '10:00',
        is_all_day: false,
        location: '',
        description: '',
        participant_ids: [] as number[],
    });

    const handleCreateEventSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        eventForm.post(route('calendar.events.store'), {
            preserveScroll: true,
            onSuccess: () => {
                setIsCreateModalOpen(false);
                eventForm.reset();
            },
        });
    };

    const handleDeleteEvent = (event: CalendarEventItem) => {
        if (event.is_virtual) {
            alert('Agenda ini dibuat otomatis dari sistem (Presensi / Proyek) dan tidak dapat dihapus manual.');
            return;
        }
        if (!confirm('Hapus agenda studio ini?')) return;

        router.delete(route('calendar.events.destroy', event.raw_id), {
            preserveScroll: true,
            onSuccess: () => setSelectedEventForDetail(null),
        });
    };

    const toggleParticipant = (memberId: number) => {
        if (eventForm.data.participant_ids.includes(memberId)) {
            eventForm.setData(
                'participant_ids',
                eventForm.data.participant_ids.filter((id) => id !== memberId)
            );
        } else {
            eventForm.setData('participant_ids', [...eventForm.data.participant_ids, memberId]);
        }
    };

    return (
        <AppShell initialRole={initialRole} initialActive="kalender">
            <Head title="Kalender Studio" />

            <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <CalendarIcon className="size-5" />
                            </span>
                            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                                Kalender Studio & Tim
                            </h1>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Pantau rapat asistensi klien, kunjungan site visit, dan deadline serah terima
                            proyek.
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={() => {
                                eventForm.setData('start_date', selectedDateKey);
                                eventForm.setData('end_date', selectedDateKey);
                                setIsCreateModalOpen(true);
                            }}
                            className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-background shadow-xs hover:bg-foreground/90"
                        >
                            <Plus className="size-4" />
                            <span>Buat Agenda Studio</span>
                        </button>
                    </div>
                </div>

                {/* Calendar Navigation & Filters */}
                <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-xs">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        {/* Month navigation */}
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => navigateMonth(-1)}
                                    className="rounded-lg border p-1.5 hover:bg-muted"
                                    title="Bulan sebelumnya"
                                >
                                    <ChevronLeft className="size-4" />
                                </button>
                                <span className="min-w-[170px] text-center text-base font-bold text-foreground">
                                    {monthLabel}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => navigateMonth(1)}
                                    className="rounded-lg border p-1.5 hover:bg-muted"
                                    title="Bulan berikutnya"
                                >
                                    <ChevronRight className="size-4" />
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={goToToday}
                                className="rounded-lg border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                            >
                                Hari Ini
                            </button>
                        </div>

                        {/* View Switcher: Kalender vs List */}
                        <div className="inline-flex rounded-lg border bg-muted/40 p-1">
                            <button
                                type="button"
                                onClick={() => setViewMode('calendar')}
                                className={cn(
                                    'rounded-md px-3 py-1 text-xs font-semibold transition',
                                    viewMode === 'calendar'
                                        ? 'bg-background text-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground'
                                )}
                            >
                                Tampilan Kalender
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('list')}
                                className={cn(
                                    'rounded-md px-3 py-1 text-xs font-semibold transition',
                                    viewMode === 'list'
                                        ? 'bg-background text-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground'
                                )}
                            >
                                Daftar Agenda ({events.length})
                            </button>
                        </div>
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t">
                        <span className="shrink-0 text-xs font-semibold text-muted-foreground mr-1">
                            Filter Jenis:
                        </span>
                        <button
                            type="button"
                            onClick={() => handleFilterTypeChange('all')}
                            className={cn(
                                'shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition',
                                selectedType === 'all'
                                    ? 'border-foreground bg-foreground text-background'
                                    : 'bg-background text-muted-foreground hover:bg-muted'
                            )}
                        >
                            Semua Kegiatan
                        </button>
                        {(
                            Object.keys(eventTypeConfig) as Array<keyof typeof eventTypeConfig>
                        ).map((key) => {
                            const cfg = eventTypeConfig[key];
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => handleFilterTypeChange(key)}
                                    className={cn(
                                        'shrink-0 flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition',
                                        selectedType === key
                                            ? 'border-foreground bg-foreground text-background'
                                            : 'bg-background text-muted-foreground hover:bg-muted'
                                    )}
                                >
                                    <span className={cn('size-1.5 rounded-full', cfg.dot)} />
                                    <span>{cfg.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* VIEW 1: MONTHLY CALENDAR GRID + DAILY AGENDA SIDEBAR */}
                {viewMode === 'calendar' && (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        {/* Left: 7xN Calendar Grid */}
                        <div className="rounded-2xl border bg-card p-4 shadow-xs lg:col-span-2">
                            {/* Days of Week Header */}
                            <div className="grid grid-cols-7 gap-1 border-b pb-2 text-center text-xs font-bold text-muted-foreground">
                                {weekdays.map((w, idx) => (
                                    <div
                                        key={w}
                                        className={cn(
                                            idx >= 5 ? 'text-rose-500' : 'text-foreground'
                                        )}
                                    >
                                        {w}
                                    </div>
                                ))}
                            </div>

                            {/* Calendar Days */}
                            <div className="mt-2 grid grid-cols-7 gap-1.5">
                                {calendarDays.map((cell, idx) => {
                                    if (!cell.day || !cell.dateKey) {
                                        return (
                                            <div
                                                key={`empty-${idx}`}
                                                className="min-h-[90px] rounded-xl border border-transparent bg-muted/10 p-1.5 opacity-40"
                                            />
                                        );
                                    }

                                    const dayEvents = eventsByDate.get(cell.dateKey) || [];
                                    const isToday = cell.dateKey === todayKey;
                                    const isSelected = cell.dateKey === selectedDateKey;

                                    return (
                                        <div
                                            key={cell.dateKey}
                                            onClick={() => setSelectedDateKey(cell.dateKey!)}
                                            className={cn(
                                                'group relative flex min-h-[90px] flex-col rounded-xl border p-1.5 transition cursor-pointer',
                                                isSelected
                                                    ? 'border-foreground bg-accent/40 shadow-xs ring-1 ring-foreground'
                                                    : 'bg-card hover:bg-muted/40 hover:border-foreground/40',
                                                isToday && !isSelected && 'border-primary/60 bg-primary/5'
                                            )}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span
                                                    className={cn(
                                                        'flex size-6 items-center justify-center rounded-full text-xs font-bold',
                                                        isToday
                                                            ? 'bg-foreground text-background'
                                                            : isSelected
                                                            ? 'font-extrabold text-foreground'
                                                            : 'text-foreground'
                                                    )}
                                                >
                                                    {cell.day}
                                                </span>

                                                {dayEvents.length > 0 && (
                                                    <span className="text-[10px] font-bold text-muted-foreground">
                                                        {dayEvents.length}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Event Chips List */}
                                            <div className="mt-1.5 flex flex-1 flex-col gap-1 overflow-hidden">
                                                {dayEvents.slice(0, 2).map((ev) => (
                                                    <button
                                                        key={ev.id}
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedEventForDetail(ev);
                                                        }}
                                                        className={cn(
                                                            'flex items-center gap-1 truncate rounded px-1.5 py-0.5 text-left text-[10px] font-medium transition shadow-2xs',
                                                            eventTypeConfig[ev.type]?.badge
                                                        )}
                                                    >
                                                        <span
                                                            className={cn(
                                                                'size-1.5 shrink-0 rounded-full',
                                                                eventTypeConfig[ev.type]?.dot
                                                            )}
                                                        />
                                                        <span className="truncate">{ev.title}</span>
                                                    </button>
                                                ))}

                                                {dayEvents.length > 2 && (
                                                    <span className="text-[10px] font-semibold text-muted-foreground pl-1">
                                                        +{dayEvents.length - 2} lainnya
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Right: Selected Date Agenda List */}
                        <div className="flex flex-col rounded-2xl border bg-card p-5 shadow-xs">
                            <div className="flex items-center justify-between border-b pb-3">
                                <div>
                                    <h3 className="text-sm font-bold text-foreground">
                                        Agenda Harian
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        {selectedDateKey}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        eventForm.setData('start_date', selectedDateKey);
                                        eventForm.setData('end_date', selectedDateKey);
                                        setIsCreateModalOpen(true);
                                    }}
                                    className="rounded-lg bg-foreground px-2.5 py-1 text-xs font-semibold text-background hover:bg-foreground/90"
                                >
                                    + Tambah
                                </button>
                            </div>

                            <div className="mt-3 flex flex-1 flex-col gap-3 overflow-y-auto">
                                {selectedEvents.length === 0 ? (
                                    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-xs text-muted-foreground">
                                        <CalendarIcon className="size-8 text-muted-foreground/40 mb-2" />
                                        <span>Tidak ada agenda pada tanggal ini.</span>
                                    </div>
                                ) : (
                                    selectedEvents.map((ev) => (
                                        <div
                                            key={ev.id}
                                            onClick={() => setSelectedEventForDetail(ev)}
                                            className={cn(
                                                'flex flex-col gap-1.5 rounded-xl border border-l-4 p-3 transition hover:shadow-xs cursor-pointer',
                                                eventTypeConfig[ev.type]?.border,
                                                'bg-card hover:bg-muted/30'
                                            )}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span
                                                    className={cn(
                                                        'rounded-md px-2 py-0.5 text-[10px] font-bold border',
                                                        eventTypeConfig[ev.type]?.badge
                                                    )}
                                                >
                                                    {eventTypeConfig[ev.type]?.label}
                                                </span>
                                                <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                                                    <Clock className="size-3" />
                                                    <span>{ev.time}</span>
                                                </span>
                                            </div>

                                            <h4 className="text-xs font-bold text-foreground leading-snug">
                                                {ev.title}
                                            </h4>

                                            {ev.project_name && (
                                                <span className="text-[11px] font-medium text-primary">
                                                    Proyek: {ev.project_name}
                                                </span>
                                            )}

                                            {ev.location && (
                                                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                                    <MapPin className="size-3 shrink-0" />
                                                    <span className="truncate">{ev.location}</span>
                                                </span>
                                            )}

                                            {ev.participants.length > 0 && (
                                                <AvatarStack
                                                    members={ev.participants}
                                                    max={4}
                                                    className="mt-1.5 [&>span]:size-6 [&>span]:text-[9px]"
                                                />
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* VIEW 2: LIST AGENDA (CHRONOLOGICAL) */}
                {viewMode === 'list' && (
                    <div className="flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-xs">
                        <h3 className="text-sm font-bold text-foreground">
                            Semua Agenda & Tenggat Waktu Bulan Ini
                        </h3>

                        {events.length === 0 ? (
                            <div className="p-12 text-center text-xs text-muted-foreground">
                                Tidak ada agenda studio yang ditemukan untuk periode ini.
                            </div>
                        ) : (
                            <div className="flex flex-col divide-y">
                                {events.map((ev) => (
                                    <div
                                        key={ev.id}
                                        onClick={() => setSelectedEventForDetail(ev)}
                                        className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between transition hover:bg-muted/20 px-2 rounded-lg cursor-pointer"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="flex min-w-[70px] flex-col items-center justify-center rounded-lg border bg-background p-2 text-center">
                                                <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                                                    {new Intl.DateTimeFormat('id-ID', {
                                                        month: 'short',
                                                    }).format(new Date(ev.date))}
                                                </span>
                                                <span className="text-base font-bold text-foreground">
                                                    {new Date(ev.date).getDate()}
                                                </span>
                                            </div>

                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className={cn(
                                                            'rounded-md px-2 py-0.5 text-[10px] font-bold border',
                                                            eventTypeConfig[ev.type]?.badge
                                                        )}
                                                    >
                                                        {eventTypeConfig[ev.type]?.label}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {ev.time} {ev.end_time ? `- ${ev.end_time}` : ''}
                                                    </span>
                                                </div>

                                                <h4 className="mt-1 text-sm font-bold text-foreground">
                                                    {ev.title}
                                                </h4>

                                                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                                    {ev.project_name && (
                                                        <span className="font-medium text-primary">
                                                            {ev.project_name}
                                                        </span>
                                                    )}
                                                    {ev.location && (
                                                        <span className="flex items-center gap-1">
                                                            <MapPin className="size-3" />
                                                            <span>{ev.location}</span>
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 sm:self-center">
                                            {ev.participants.length > 0 && (
                                                <div className="flex -space-x-1.5 overflow-hidden">
                                                    {ev.participants.slice(0, 3).map((p) => (
                                                        <div
                                                            key={p.id}
                                                            title={p.name}
                                                            className={cn(
                                                                'flex size-6 items-center justify-center rounded-full border text-[10px] font-bold overflow-hidden',
                                                                getAvatarTone(p.id, p.name)
                                                            )}
                                                        >
                                                            {p.photo_url ? (
                                                                <img
                                                                    src={p.photo_url}
                                                                    alt={p.name}
                                                                    className="h-full w-full object-cover"
                                                                />
                                                            ) : (
                                                                p.name.charAt(0)
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* MODAL BUAT AGENDA STUDIO */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
                    <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border bg-card p-6 shadow-2xl">
                        <div className="flex items-start justify-between border-b pb-3">
                            <div>
                                <h3 className="text-base font-bold text-foreground">
                                    Buat Agenda Studio Baru
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Tambahkan rapat, review desain klien, atau agenda studio lainnya.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsCreateModalOpen(false)}
                                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateEventSubmit} className="mt-4 flex flex-col gap-3.5">
                            <div>
                                <label className="text-xs font-semibold text-foreground">
                                    Judul Agenda <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={eventForm.data.title}
                                    onChange={(e) => eventForm.setData('title', e.target.value)}
                                    placeholder="cth: Rapat Asistensi Denah Lt. 2 dengan Ibu Maya"
                                    className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                                />
                                {eventForm.errors.title && (
                                    <p className="mt-1 text-xs text-rose-500">{eventForm.errors.title}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-foreground">
                                        Jenis Agenda <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        value={eventForm.data.type}
                                        onChange={(e) =>
                                            eventForm.setData(
                                                'type',
                                                e.target.value as CalendarEventItem['type']
                                            )
                                        }
                                        className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs focus:border-foreground focus:outline-none"
                                    >
                                        <option value="meeting">Rapat / Koordinasi</option>
                                        <option value="milestone">Review Klien / Asistensi</option>
                                        <option value="site_visit">Site Visit / Lapangan</option>
                                        <option value="other">Internal Studio</option>
                                        <option value="holiday">Libur Studio</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-foreground">
                                        Proyek Terkait (Opsional)
                                    </label>
                                    <select
                                        value={eventForm.data.project_id}
                                        onChange={(e) => eventForm.setData('project_id', e.target.value)}
                                        className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs focus:border-foreground focus:outline-none"
                                    >
                                        <option value="">Tanpa Proyek</option>
                                        {projects.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Date & Time */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-foreground">
                                        Tanggal <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={eventForm.data.start_date}
                                        onChange={(e) => {
                                            eventForm.setData('start_date', e.target.value);
                                            eventForm.setData('end_date', e.target.value);
                                        }}
                                        className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs focus:border-foreground focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-foreground">
                                        Jam Mulai
                                    </label>
                                    <input
                                        type="time"
                                        value={eventForm.data.start_time}
                                        onChange={(e) => eventForm.setData('start_time', e.target.value)}
                                        className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs focus:border-foreground focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground">
                                    Lokasi / Ruang Meeting / Link Google Meet
                                </label>
                                <input
                                    type="text"
                                    value={eventForm.data.location}
                                    onChange={(e) => eventForm.setData('location', e.target.value)}
                                    placeholder="cth: Meeting Room Lt. 2 / Google Meet"
                                    className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground">
                                    Deskripsi / Catatan Agenda
                                </label>
                                <textarea
                                    rows={2}
                                    value={eventForm.data.description}
                                    onChange={(e) => eventForm.setData('description', e.target.value)}
                                    placeholder="Catatan persiapan agenda, materi gambar yang perlu disiapkan..."
                                    className="mt-1 w-full rounded-lg border bg-background p-2.5 text-xs placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
                                />
                            </div>

                            {/* Participant selection */}
                            <div className="rounded-xl border bg-muted/20 p-3">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Peserta Tim Studio
                                </label>
                                <div className="mt-2 grid max-h-32 grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2">
                                    {teamMembers.map((m) => {
                                        const isChecked = eventForm.data.participant_ids.includes(m.id);
                                        return (
                                            <label
                                                key={m.id}
                                                className={cn(
                                                    'flex items-center gap-2 rounded-md p-1 text-xs cursor-pointer',
                                                    isChecked
                                                        ? 'bg-primary/10 font-semibold text-primary'
                                                        : 'hover:bg-muted text-foreground'
                                                )}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => toggleParticipant(m.id)}
                                                    className="size-3.5 rounded border-muted-foreground/30 text-primary"
                                                />
                                                <span className="truncate">{m.name}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="mt-2 flex items-center justify-end gap-2 border-t pt-3">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="rounded-lg border px-3.5 py-1.5 text-xs font-semibold hover:bg-muted"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={eventForm.processing}
                                    className="rounded-lg bg-foreground px-4 py-1.5 text-xs font-semibold text-background hover:bg-foreground/90 disabled:opacity-50"
                                >
                                    {eventForm.processing ? 'Menyimpan...' : 'Simpan Agenda'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL DETAIL EVENT */}
            {selectedEventForDetail && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
                    <div className="relative w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl">
                        <div className="flex items-start justify-between border-b pb-3">
                            <span
                                className={cn(
                                    'rounded-md px-2.5 py-0.5 text-xs font-bold border',
                                    eventTypeConfig[selectedEventForDetail.type]?.badge
                                )}
                            >
                                {eventTypeConfig[selectedEventForDetail.type]?.label}
                            </span>
                            <button
                                type="button"
                                onClick={() => setSelectedEventForDetail(null)}
                                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        <div className="mt-4 flex flex-col gap-3">
                            <h3 className="text-base font-bold text-foreground">
                                {selectedEventForDetail.title}
                            </h3>

                            <div className="flex flex-col gap-2 rounded-xl border bg-muted/20 p-3 text-xs">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Clock className="size-3.5 text-foreground" />
                                    <span>
                                        {selectedEventForDetail.date} · {selectedEventForDetail.time}{' '}
                                        {selectedEventForDetail.end_time
                                            ? `- ${selectedEventForDetail.end_time}`
                                            : ''}
                                    </span>
                                </div>

                                {selectedEventForDetail.location && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <MapPin className="size-3.5 text-foreground" />
                                        <span>{selectedEventForDetail.location}</span>
                                    </div>
                                )}

                                {selectedEventForDetail.project_name && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Layers className="size-3.5 text-foreground" />
                                        <span>Proyek: <strong className="text-foreground">{selectedEventForDetail.project_name}</strong></span>
                                    </div>
                                )}
                            </div>

                            {selectedEventForDetail.description && (
                                <p className="text-xs text-foreground whitespace-pre-line leading-relaxed">
                                    {selectedEventForDetail.description}
                                </p>
                            )}

                            {selectedEventForDetail.participants.length > 0 && (
                                <div className="border-t pt-2.5">
                                    <h4 className="text-xs font-bold text-muted-foreground mb-1.5">
                                        Peserta Tim:
                                    </h4>
                                    <div className="flex flex-wrap gap-1.5">
                                        {selectedEventForDetail.participants.map((p) => (
                                            <span
                                                key={p.id}
                                                className="rounded-full border bg-background px-2.5 py-0.5 text-xs font-medium text-foreground"
                                            >
                                                {p.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="mt-2 flex items-center justify-between border-t pt-3">
                                {!selectedEventForDetail.is_virtual && isAdmin ? (
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteEvent(selectedEventForDetail)}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                                    >
                                        <Trash2 className="size-3.5" />
                                        <span>Hapus Agenda</span>
                                    </button>
                                ) : (
                                    <span />
                                )}

                                <button
                                    type="button"
                                    onClick={() => setSelectedEventForDetail(null)}
                                    className="rounded-lg bg-foreground px-4 py-1.5 text-xs font-semibold text-background hover:bg-foreground/90"
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AppShell>
    );
}
