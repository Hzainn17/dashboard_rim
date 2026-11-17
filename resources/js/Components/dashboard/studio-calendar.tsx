import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { useMemo, useState } from 'react';
import { calendarEvents, type CalendarEvent } from '@/lib/studio-data';
import { cn } from '@/lib/utils';
import { useAttendance } from './attendance-context';
import { AvatarStack } from './member-avatar';

const FALLBACK_TODAY = '2026-11-17';
const weekdays = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

const eventStyle: Record<CalendarEvent['type'], { label: string; dot: string; chip: string }> = {
    meeting: { label: 'Meeting', dot: 'bg-foreground/60', chip: 'bg-secondary text-secondary-foreground' },
    site: { label: 'Site Visit', dot: 'bg-success', chip: 'bg-success/10 text-success' },
    review: { label: 'Review', dot: 'bg-warning', chip: 'bg-warning/15 text-amber-800' },
    deadline: { label: 'Deadline', dot: 'bg-primary', chip: 'bg-accent text-accent-foreground' },
    holiday: { label: 'Libur', dot: 'bg-destructive', chip: 'bg-destructive/10 text-destructive' },
};

function toKey(y: number, m: number, d: number) {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function jakartaKey(date: Date) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(date);
}

export function StudioCalendar() {
    const { now } = useAttendance();
    const todayKey = now ? jakartaKey(now) : FALLBACK_TODAY;
    const [todayY, todayM] = todayKey.split('-').map(Number);

    const [view, setView] = useState<{ y: number; m: number } | null>(null);
    const [selected, setSelected] = useState<string | null>(null);
    const year = view?.y ?? todayY;
    const month = view?.m ?? todayM - 1;
    const selectedKey = selected ?? todayKey;

    const byDate = useMemo(() => {
        const map = new Map<string, CalendarEvent[]>();
        for (const e of calendarEvents) {
            const list = map.get(e.date) ?? [];
            list.push(e);
            map.set(e.date, list);
        }
        for (const list of map.values()) list.sort((a, b) => a.time.localeCompare(b.time));
        return map;
    }, []);

    const cells = useMemo(() => {
        const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const list: (number | null)[] = Array.from({ length: firstWeekday }, () => null);
        for (let d = 1; d <= daysInMonth; d++) list.push(d);
        while (list.length % 7 !== 0) list.push(null);
        return list;
    }, [year, month]);

    const monthLabel = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(year, month, 1));
    const monthPrefix = toKey(year, month, 1).slice(0, 7);
    const monthEvents = calendarEvents.filter((e) => e.date.startsWith(monthPrefix));
    const deadlineCount = monthEvents.filter((e) => e.type === 'deadline').length;

    const selectedEvents = byDate.get(selectedKey) ?? [];
    const [sy, sm, sd] = selectedKey.split('-').map(Number);
    const selectedLabel = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }).format(
        new Date(sy, sm - 1, sd),
    );

    function shiftMonth(delta: number) {
        const d = new Date(year, month + delta, 1);
        setView({ y: d.getFullYear(), m: d.getMonth() });
    }

    function goToday() {
        setView(null);
        setSelected(null);
    }

    return (
        <section id="kalender-studio" aria-labelledby="calendar-title" className="scroll-mt-24 rounded-xl border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
                <div>
                    <h2 id="calendar-title" className="text-sm font-semibold">
                        Kalender Studio
                    </h2>
                    <p className="text-xs text-muted-foreground">
                        {monthEvents.length} kegiatan bulan ini · {deadlineCount} deadline
                    </p>
                </div>
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={goToday}
                        className="h-8 rounded-md border px-3 text-xs font-medium transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                        Hari ini
                    </button>
                    <button
                        type="button"
                        onClick={() => shiftMonth(-1)}
                        aria-label="Bulan sebelumnya"
                        className="flex size-8 items-center justify-center rounded-md border transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                        <ChevronLeft className="size-4" aria-hidden="true" />
                    </button>
                    <p className="w-32 text-center text-sm font-medium capitalize" aria-live="polite">
                        {monthLabel}
                    </p>
                    <button
                        type="button"
                        onClick={() => shiftMonth(1)}
                        aria-label="Bulan berikutnya"
                        className="flex size-8 items-center justify-center rounded-md border transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                        <ChevronRight className="size-4" aria-hidden="true" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                <div className="p-3 sm:p-4 lg:border-r">
                    <div className="grid grid-cols-7 pb-2" aria-hidden="true">
                        {weekdays.map((w, i) => (
                            <span
                                key={w}
                                className={cn('text-center text-[11px] font-medium text-muted-foreground', i === 6 && 'text-destructive/80')}
                            >
                                {w}
                            </span>
                        ))}
                    </div>
                    <div role="grid" aria-label={`Kalender ${monthLabel}`} className="grid grid-cols-7 gap-1">
                        {cells.map((day, i) => {
                            if (day === null) return <span key={`e-${i}`} aria-hidden="true" />;
                            const key = toKey(year, month, day);
                            const events = byDate.get(key) ?? [];
                            const isToday = key === todayKey;
                            const isSelected = key === selectedKey;
                            const isSunday = i % 7 === 6;
                            const isHoliday = events.some((e) => e.type === 'holiday');
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    role="gridcell"
                                    aria-selected={isSelected}
                                    aria-label={`${day} ${monthLabel}${events.length ? `, ${events.length} kegiatan` : ''}`}
                                    onClick={() => setSelected(key)}
                                    className={cn(
                                        'flex min-h-14 flex-col items-start gap-1 rounded-lg border border-transparent p-1.5 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 sm:min-h-16 sm:p-2',
                                        isSelected && 'border-primary/40 bg-accent hover:bg-accent',
                                    )}
                                >
                                    <span
                                        className={cn(
                                            'flex size-6 items-center justify-center rounded-full font-mono text-xs tabular-nums',
                                            (isSunday || isHoliday) && 'text-destructive',
                                            isToday && 'bg-primary font-semibold text-primary-foreground',
                                        )}
                                    >
                                        {day}
                                    </span>
                                    {events.length > 0 && (
                                        <span className="flex flex-wrap gap-0.5" aria-hidden="true">
                                            {events.slice(0, 4).map((e) => (
                                                <span key={e.id} className={cn('size-1.5 rounded-full', eventStyle[e.type].dot)} />
                                            ))}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 px-1" aria-label="Keterangan">
                        {(Object.keys(eventStyle) as CalendarEvent['type'][]).map((t) => (
                            <li key={t} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                <span className={cn('size-1.5 rounded-full', eventStyle[t].dot)} aria-hidden="true" />
                                {eventStyle[t].label}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="flex flex-col border-t lg:border-t-0">
                    <div className="px-5 pt-4 pb-2">
                        <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                            {selectedKey === todayKey ? 'Hari ini' : 'Tanggal dipilih'}
                        </p>
                        <p className="text-sm font-semibold capitalize">{selectedLabel}</p>
                    </div>
                    {selectedEvents.length === 0 ? (
                        <div className="mx-5 mb-5 flex flex-1 items-center justify-center rounded-lg border border-dashed px-4 py-8 text-center text-xs text-muted-foreground">
                            Tidak ada kegiatan terjadwal.
                        </div>
                    ) : (
                        <ol className="flex flex-col gap-1 px-2 pb-3">
                            {selectedEvents.map((e) => {
                                const style = eventStyle[e.type];
                                return (
                                    <li key={e.id} className="flex gap-3 rounded-lg p-3 transition-colors hover:bg-muted/50">
                                        <span className={cn('mt-1 w-1 shrink-0 self-stretch rounded-full', style.dot)} aria-hidden="true" />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="text-sm leading-snug font-medium">{e.title}</p>
                                                <span className={cn('shrink-0 rounded px-1.5 py-px text-[10px] font-medium', style.chip)}>
                                                    {style.label}
                                                </span>
                                            </div>
                                            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                                                {e.type !== 'holiday' && <span className="font-mono tabular-nums">{e.time} WIB</span>}
                                                {e.type !== 'holiday' && <span aria-hidden="true">·</span>}
                                                <MapPin className="size-3 shrink-0" aria-hidden="true" />
                                                <span className="truncate">{e.place}</span>
                                            </p>
                                            {e.people.length > 0 && (
                                                <AvatarStack ids={e.people} max={4} className="mt-2 [&>span]:size-6 [&>span]:text-[9px]" />
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ol>
                    )}
                </div>
            </div>
        </section>
    );
}
