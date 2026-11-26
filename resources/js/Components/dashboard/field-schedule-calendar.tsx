import * as React from 'react';
import { useMemo, useState } from 'react';
import { router, useForm, usePage } from '@inertiajs/react';
import {
    CalendarDays,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Circle,
    Clock,
    HardHat,
    MapPin,
    Plus,
    Trash2,
    Wrench,
    X,
} from 'lucide-react';
import { isAdminRole } from '@/lib/studio-data';
import { cn } from '@/lib/utils';
import { PageProps } from '@/types';
import { MemberAvatar } from './member-avatar';

export interface FieldScheduleChecklistItem {
    text: string;
    done: boolean;
}

export interface FieldScheduleItem {
    id: number;
    title: string;
    description?: string | null;
    checklist_items: FieldScheduleChecklistItem[];
    is_completed: boolean;
    location?: string | null;
    date: string;
    date_formatted: string;
    time: string;
    is_all_day: boolean;
    project_id?: number | null;
    project_name?: string | null;
    creator_id: number;
    creator_name: string;
    participants: Array<{
        id: number;
        name: string;
        photo_url?: string | null;
        position: string;
    }>;
}

interface Props {
    schedules: FieldScheduleItem[];
    projects: Array<{ id: number; name: string; location?: string | null }>;
    teamMembers: Array<{
        id: number;
        name: string;
        position: string;
        work_type: 'lapangan' | 'kantor';
    }>;
}

const weekdays = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

function toKey(y: number, m: number, d: number) {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function todayJakartaKey() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
}

export function FieldScheduleCalendar({ schedules, projects, teamMembers }: Props) {
    const { auth } = usePage<PageProps>().props;
    const isAdmin = isAdminRole(auth?.user?.role);

    const todayKey = todayJakartaKey();
    const [todayY, todayM] = todayKey.split('-').map(Number);

    const [view, setView] = useState<{ y: number; m: number }>({ y: todayY, m: todayM - 1 });
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [checklistText, setChecklistText] = useState('');

    const defaultFieldIds = useMemo(
        () => teamMembers.filter((m) => m.work_type === 'lapangan').map((m) => m.id),
        [teamMembers],
    );

    const form = useForm({
        title: '',
        description: '',
        location: '',
        type: 'field_schedule',
        start_date: todayKey,
        end_date: todayKey,
        start_time: '09:00',
        end_time: '12:00',
        is_all_day: false,
        project_id: '' as string | number,
        participant_ids: defaultFieldIds as number[],
        checklist_items: [] as FieldScheduleChecklistItem[],
    });

    const byDate = useMemo(() => {
        const map = new Map<string, FieldScheduleItem[]>();
        for (const s of schedules) {
            const list = map.get(s.date) ?? [];
            list.push(s);
            map.set(s.date, list);
        }
        return map;
    }, [schedules]);

    const cells = useMemo(() => {
        const firstWeekday = (new Date(view.y, view.m, 1).getDay() + 6) % 7;
        const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
        const list: (number | null)[] = Array.from({ length: firstWeekday }, () => null);
        for (let d = 1; d <= daysInMonth; d++) list.push(d);
        while (list.length % 7 !== 0) list.push(null);
        return list;
    }, [view.y, view.m]);

    const monthLabel = new Intl.DateTimeFormat('id-ID', {
        month: 'long',
        year: 'numeric',
    }).format(new Date(view.y, view.m, 1));

    const visibleSchedules = useMemo(() => {
        if (selectedDate) {
            return byDate.get(selectedDate) ?? [];
        }
        return schedules
            .filter((s) => s.date >= todayKey || !s.is_completed)
            .slice(0, 8);
    }, [selectedDate, byDate, schedules, todayKey]);

    const openCreateModal = (presetDate?: string) => {
        const d = presetDate || selectedDate || todayKey;
        form.reset();
        form.clearErrors();
        form.setData({
            title: '',
            description: '',
            location: '',
            type: 'field_schedule',
            start_date: d,
            end_date: d,
            start_time: '09:00',
            end_time: '12:00',
            is_all_day: false,
            project_id: '',
            participant_ids: defaultFieldIds,
            checklist_items: [],
        });
        setChecklistText('');
        setShowModal(true);
    };

    const handleProjectSelect = (projId: string) => {
        form.setData('project_id', projId);
        const found = projects.find((p) => String(p.id) === projId);
        if (found?.location && !form.data.location) {
            form.setData('location', found.location);
        }
    };

    const toggleParticipant = (uid: number) => {
        const exists = form.data.participant_ids.includes(uid);
        form.setData(
            'participant_ids',
            exists
                ? form.data.participant_ids.filter((id) => id !== uid)
                : [...form.data.participant_ids, uid],
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const parsedChecklist = checklistText
            .split('\n')
            .map((line) => line.replace(/^[-*•\d.)\s]+/, '').trim())
            .filter(Boolean)
            .map((text) => ({ text, done: false }));

        form.transform((data) => ({
            ...data,
            end_date: data.start_date,
            project_id: data.project_id ? Number(data.project_id) : null,
            checklist_items: parsedChecklist,
        }));

        form.post(route('calendar.events.store'), {
            preserveScroll: true,
            onSuccess: () => {
                setShowModal(false);
                setChecklistText('');
            },
        });
    };

    const handleToggleChecklistItem = (scheduleId: number, idx: number) => {
        router.patch(
            route('calendar.events.toggle', scheduleId),
            { checklist_index: idx },
            { preserveScroll: true },
        );
    };

    const handleToggleCompleted = (schedule: FieldScheduleItem) => {
        router.patch(
            route('calendar.events.toggle', schedule.id),
            { is_completed: !schedule.is_completed },
            { preserveScroll: true },
        );
    };

    const handleDelete = (schedule: FieldScheduleItem) => {
        if (!window.confirm(`Hapus jadwal lapangan "${schedule.title}"?`)) {
            return;
        }
        router.delete(route('calendar.events.destroy', schedule.id), {
            preserveScroll: true,
        });
    };

    const shiftMonth = (delta: number) => {
        const d = new Date(view.y, view.m + delta, 1);
        setView({ y: d.getFullYear(), m: d.getMonth() });
    };

    return (
        <section className="overflow-hidden rounded-2xl border border-amber-200/80 bg-card shadow-2xs">
            {/* Compact Header */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 border-b bg-gradient-to-r from-amber-50/80 via-card to-orange-50/40 px-4 py-3">
                <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                        <CalendarDays className="size-4" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-foreground">
                            Kalender Jadwal Lapangan &amp; Perbaikan
                        </h2>
                        <p className="text-[11px] text-muted-foreground">
                            Sinkron otomatis dengan Kalender Studio &amp; pengingat Dashboard Owner
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center rounded-lg border bg-background p-0.5 text-xs">
                        <button
                            type="button"
                            onClick={() => shiftMonth(-1)}
                            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                            aria-label="Bulan sebelumnya"
                        >
                            <ChevronLeft className="size-3.5" />
                        </button>
                        <span className="min-w-[100px] px-1.5 text-center text-xs font-semibold capitalize">
                            {monthLabel}
                        </span>
                        <button
                            type="button"
                            onClick={() => shiftMonth(1)}
                            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                            aria-label="Bulan berikutnya"
                        >
                            <ChevronRight className="size-3.5" />
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={() => openCreateModal()}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-amber-700"
                    >
                        <Plus className="size-3.5" />
                        Tambah Jadwal
                    </button>
                </div>
            </div>

            {/* Compact Body: Left Mini-Calendar (5 cols) + Right Schedule List (7 cols) */}
            <div className="grid grid-cols-1 divide-y lg:grid-cols-12 lg:divide-x lg:divide-y-0">
                {/* Mini Calendar Grid */}
                <div className="p-3.5 lg:col-span-5">
                    <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-muted-foreground">
                        {weekdays.map((wd) => (
                            <div key={wd} className="py-0.5">
                                {wd}
                            </div>
                        ))}
                    </div>

                    <div className="mt-1 grid grid-cols-7 gap-1">
                        {cells.map((day, idx) => {
                            if (day === null) {
                                return <div key={`empty-${idx}`} className="h-9 rounded-md bg-muted/15" />;
                            }

                            const key = toKey(view.y, view.m, day);
                            const daySchedules = byDate.get(key) ?? [];
                            const isToday = key === todayKey;
                            const isSelected = selectedDate === key;
                            const hasPending = daySchedules.some((s) => !s.is_completed);

                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setSelectedDate(isSelected ? null : key)}
                                    title={
                                        daySchedules.length > 0
                                            ? daySchedules.map((s) => s.title).join(', ')
                                            : undefined
                                    }
                                    className={cn(
                                        'relative flex h-9 flex-col items-center justify-center rounded-md border text-xs transition',
                                        isSelected
                                            ? 'border-amber-500 bg-amber-100/80 font-bold text-amber-950 ring-1 ring-amber-500/30'
                                            : isToday
                                              ? 'border-amber-400 bg-amber-50 font-bold text-amber-900'
                                              : daySchedules.length > 0
                                                ? 'border-amber-200/80 bg-amber-50/40 font-semibold text-foreground hover:border-amber-400'
                                                : 'border-transparent bg-background text-foreground/80 hover:border-border hover:bg-muted/40',
                                    )}
                                >
                                    <span className="leading-none">{day}</span>
                                    {daySchedules.length > 0 && (
                                        <span className="mt-1 flex items-center gap-0.5">
                                            <span
                                                className={cn(
                                                    'size-1.5 rounded-full',
                                                    hasPending ? 'bg-amber-600' : 'bg-emerald-600',
                                                )}
                                            />
                                            {daySchedules.length > 1 && (
                                                <span className="text-[8px] font-bold leading-none text-amber-800">
                                                    {daySchedules.length}
                                                </span>
                                            )}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Right Panel: Selected Date or Upcoming Field Schedules */}
                <div className="flex flex-col p-3.5 lg:col-span-7">
                    <div className="mb-2.5 flex items-center justify-between gap-2">
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                                {selectedDate ? `Jadwal Tanggal ${selectedDate}` : 'Jadwal Lapangan Terdekat'}
                            </h3>
                            <p className="text-[11px] text-muted-foreground">
                                {visibleSchedules.length} agenda perbaikan / kunjungan
                            </p>
                        </div>
                        {selectedDate && (
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => openCreateModal(selectedDate)}
                                    className="rounded-lg bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-200"
                                >
                                    + Di Tanggal Ini
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedDate(null)}
                                    className="rounded-lg border px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted"
                                >
                                    Semua
                                </button>
                            </div>
                        )}
                    </div>

                    {visibleSchedules.length === 0 ? (
                        <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 px-4 py-6 text-center">
                            <Wrench className="size-5 text-muted-foreground/60" />
                            <p className="mt-1.5 text-xs font-semibold text-foreground">
                                Belum ada jadwal lapangan
                            </p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                                Klik &ldquo;Tambah Jadwal&rdquo; untuk mencatat jadwal perbaikan (misal: Jatinangor hari Sabtu).
                            </p>
                        </div>
                    ) : (
                        <div className="max-h-[240px] space-y-2.5 overflow-y-auto pr-1">
                            {visibleSchedules.map((schedule) => {
                                const canDelete = isAdmin || schedule.creator_id === auth.user.id;
                                const doneItems = schedule.checklist_items.filter((i) => i.done).length;

                                return (
                                    <div
                                        key={schedule.id}
                                        className={cn(
                                            'rounded-xl border p-3.5 text-xs transition',
                                            schedule.is_completed
                                                ? 'border-emerald-200 bg-emerald-50/30'
                                                : 'border-amber-200/80 bg-amber-50/30',
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0 space-y-1">
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                                                        <Clock className="size-2.5" />
                                                        {schedule.date_formatted} · {schedule.time}
                                                    </span>
                                                    {schedule.is_completed && (
                                                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                                                            Selesai
                                                        </span>
                                                    )}
                                                </div>
                                                <h4
                                                    className={cn(
                                                        'text-sm font-bold text-foreground',
                                                        schedule.is_completed && 'line-through opacity-75',
                                                    )}
                                                >
                                                    {schedule.title}
                                                </h4>
                                                {(schedule.project_name || schedule.location) && (
                                                    <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                                        <MapPin className="size-3 shrink-0 text-amber-700" />
                                                        <span className="truncate">
                                                            {schedule.project_name
                                                                ? `${schedule.project_name}${schedule.location ? ` · ${schedule.location}` : ''}`
                                                                : schedule.location}
                                                        </span>
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex shrink-0 items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleCompleted(schedule)}
                                                    title={
                                                        schedule.is_completed
                                                            ? 'Buka kembali jadwal'
                                                            : 'Tandai jadwal selesai'
                                                    }
                                                    className="rounded-lg p-1 text-muted-foreground hover:bg-background hover:text-emerald-700"
                                                >
                                                    {schedule.is_completed ? (
                                                        <CheckCircle2 className="size-4 text-emerald-600" />
                                                    ) : (
                                                        <Circle className="size-4" />
                                                    )}
                                                </button>
                                                {canDelete && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(schedule)}
                                                        title="Hapus jadwal"
                                                        className="rounded-lg p-1 text-muted-foreground hover:bg-rose-50 hover:text-rose-600"
                                                    >
                                                        <Trash2 className="size-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {schedule.description && (
                                            <p className="mt-2 whitespace-pre-line text-[11px] text-muted-foreground">
                                                {schedule.description}
                                            </p>
                                        )}

                                        {/* Repair Checklist Items */}
                                        {schedule.checklist_items.length > 0 && (
                                            <div className="mt-2.5 space-y-1 rounded-lg border bg-background/80 p-2.5">
                                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                                    Item Perbaikan / Cek ({doneItems}/
                                                    {schedule.checklist_items.length})
                                                </p>
                                                <ul className="space-y-1">
                                                    {schedule.checklist_items.map((item, idx) => (
                                                        <li key={idx}>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleToggleChecklistItem(
                                                                        schedule.id,
                                                                        idx,
                                                                    )
                                                                }
                                                                className="flex w-full items-start gap-2 text-left text-[11px] hover:text-foreground"
                                                            >
                                                                {item.done ? (
                                                                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                                                                ) : (
                                                                    <Circle className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                                                                )}
                                                                <span
                                                                    className={cn(
                                                                        item.done &&
                                                                            'text-muted-foreground line-through',
                                                                    )}
                                                                >
                                                                    {item.text}
                                                                </span>
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Footer: PIC & Creator */}
                                        <div className="mt-2.5 flex items-center justify-between gap-2 border-t pt-2">
                                            <div className="flex items-center gap-1.5">
                                                {schedule.participants.length > 0 ? (
                                                    <div className="flex -space-x-1.5">
                                                        {schedule.participants.slice(0, 4).map((p) => (
                                                            <MemberAvatar
                                                                key={p.id}
                                                                id={p.id}
                                                                name={p.name}
                                                                photoUrl={p.photo_url}
                                                                className="size-5 text-[9px] ring-2 ring-card"
                                                            />
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] text-muted-foreground">
                                                        Tim Lapangan
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-[10px] text-muted-foreground">
                                                Diinput oleh {schedule.creator_name}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Tambah Jadwal Lapangan / Perbaikan */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
                    <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl">
                        <div className="flex items-center justify-between border-b px-5 py-4">
                            <div className="flex items-center gap-2.5">
                                <div className="flex size-8 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                                    <HardHat className="size-4" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-foreground">
                                        Tambah Jadwal Lapangan / Perbaikan
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        Otomatis tersinkron ke Kalender Studio &amp; Dashboard Owner
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
                            >
                                <X className="size-4" />
                            </button>
                        </div>

                        <form
                            onSubmit={handleSubmit}
                            className="flex-1 space-y-3.5 overflow-y-auto px-5 py-4 text-xs"
                        >
                            <div>
                                <label className="mb-1 block font-semibold text-foreground">
                                    Judul Jadwal / Perbaikan <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={form.data.title}
                                    onChange={(e) => form.setData('title', e.target.value)}
                                    placeholder="Contoh: Perbaikan Item Jatinangor / Cek Cibangkonol"
                                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block font-semibold text-foreground">
                                        Tautkan Proyek Lapangan (Opsional)
                                    </label>
                                    <select
                                        value={form.data.project_id}
                                        onChange={(e) => handleProjectSelect(e.target.value)}
                                        className="w-full rounded-lg border border-input bg-background px-2.5 py-2 text-sm outline-none focus:border-amber-500"
                                    >
                                        <option value="">— Pilih Proyek atau Lokasi Bebas —</option>
                                        {projects.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1 block font-semibold text-foreground">
                                        Lokasi Lapangan
                                    </label>
                                    <input
                                        type="text"
                                        value={form.data.location}
                                        onChange={(e) => form.setData('location', e.target.value)}
                                        placeholder="Contoh: Jatinangor / Cibangkonol"
                                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-amber-500"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block font-semibold text-foreground">
                                        Tanggal Pelaksanaan <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={form.data.start_date}
                                        onChange={(e) => form.setData('start_date', e.target.value)}
                                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-amber-500"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block font-semibold text-foreground">
                                        Jam Mulai
                                    </label>
                                    <input
                                        type="time"
                                        disabled={form.data.is_all_day}
                                        value={form.data.start_time}
                                        onChange={(e) => form.setData('start_time', e.target.value)}
                                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-amber-500 disabled:opacity-50"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-1 block font-semibold text-foreground">
                                    Daftar Item Perbaikan / Pekerjaan (1 baris = 1 item checklist)
                                </label>
                                <textarea
                                    rows={4}
                                    value={checklistText}
                                    onChange={(e) => setChecklistText(e.target.value)}
                                    placeholder={
                                        'Contoh:\nPerbaikan bocor talang garasi\nTambal retak rambut dinding ruang tamu\nCek saluran pembuangan kamar mandi'
                                    }
                                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs leading-relaxed outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block font-semibold text-foreground">
                                    Catatan Tambahan (Opsional)
                                </label>
                                <input
                                    type="text"
                                    value={form.data.description}
                                    onChange={(e) => form.setData('description', e.target.value)}
                                    placeholder="Contoh: Bawa cat putih & sealant, janjian dengan klien jam 10.00"
                                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus:border-amber-500"
                                />
                            </div>

                            <div>
                                <label className="mb-1.5 block font-semibold text-foreground">
                                    PIC Tim Lapangan yang Bertugas
                                </label>
                                <div className="max-h-32 space-y-1 overflow-y-auto rounded-lg border bg-muted/20 p-2">
                                    {teamMembers.map((member) => {
                                        const checked = form.data.participant_ids.includes(
                                            member.id,
                                        );
                                        return (
                                            <label
                                                key={member.id}
                                                className={cn(
                                                    'flex cursor-pointer items-center justify-between rounded-md px-2.5 py-1 text-xs',
                                                    checked
                                                        ? 'bg-amber-50 text-amber-950 ring-1 ring-amber-200'
                                                        : 'hover:bg-muted',
                                                )}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={() =>
                                                            toggleParticipant(member.id)
                                                        }
                                                        className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                                                    />
                                                    <span className="font-medium">
                                                        {member.name}
                                                    </span>
                                                    <span className="text-muted-foreground">
                                                        · {member.position}
                                                    </span>
                                                </div>
                                                {member.work_type === 'lapangan' && (
                                                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                                                        Lapangan
                                                    </span>
                                                )}
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 border-t pt-3">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="rounded-lg border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={form.processing}
                                    className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-amber-700 disabled:opacity-50"
                                >
                                    {form.processing ? 'Menyimpan...' : 'Simpan Jadwal Lapangan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
}
