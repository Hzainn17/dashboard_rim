import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import {
    AlertTriangle,
    Building2,
    Camera,
    Clock,
    HardHat,
    LogIn,
    LogOut,
    MapPin,
    Navigation,
    Timer,
    X,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { projects } from '@/lib/studio-data';
import { cn } from '@/lib/utils';
import { formatClock, formatCooldown, formatDuration, useAttendance, type AttendanceMode } from './attendance-context';

const TARGET_MS = 9 * 60 * 60 * 1000;
const projectItems = projects.map((p) => ({ value: p.id, label: p.title }));

export function AttendanceWidget() {
    const {
        mode,
        setMode,
        checkedInAt,
        checkedOutAt,
        elapsedMs,
        cooldownRemainingSeconds,
        skipCooldown,
        checkIn,
        checkOut,
        siteProject,
        setSiteProject,
    } = useAttendance();
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [earlyCheckoutModal, setEarlyCheckoutModal] = useState(false);

    useEffect(() => {
        return () => {
            if (photoUrl) URL.revokeObjectURL(photoUrl);
        };
    }, [photoUrl]);

    const isWorking = !!checkedInAt && !checkedOutAt;
    const elapsed = elapsedMs;
    const elapsedMinutes = Math.floor(elapsed / 60000);
    const shortageMinutes = Math.max(0, 540 - elapsedMinutes);
    const progress = Math.min(100, (elapsed / TARGET_MS) * 100);
    const overtime = Math.max(0, elapsed - TARGET_MS);
    const targetEnd = checkedInAt ? new Date(checkedInAt.getTime() + TARGET_MS) : null;
    const siteReady = mode === 'office' || (!!siteProject && !!photoUrl);

    const handleCheckOutClick = () => {
        if (elapsed < TARGET_MS) {
            setEarlyCheckoutModal(true);
            return;
        }
        checkOut();
    };

    return (
        <section
            aria-labelledby="attendance-title"
            className="flex flex-col rounded-xl border border-primary/50 bg-gradient-to-b from-accent/65 via-accent/25 to-card shadow-[0_8px_28px_-6px_rgb(70_121_123/0.22)] ring-1 ring-primary/20"
        >
            {/* Header — flush-aligned with Agenda Studio & Aktivitas Tim */}
            <div className="flex items-center justify-between gap-3 rounded-t-xl border-b border-primary/20 bg-accent/60 px-5 py-4">
                <div className="flex items-center gap-2.5">
                    <span className="h-7 w-1 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                    <div>
                        <h2 id="attendance-title" className="text-sm font-semibold text-foreground">
                            Presensi Hari Ini
                        </h2>
                        <p className="text-xs text-accent-foreground/80">Target kerja 9 jam · Jam masuk 08:00 WIB</p>
                    </div>
                </div>
                <ModeToggle mode={mode} onChange={setMode} disabled={isWorking} />
            </div>

            <div className="flex flex-1 flex-col gap-4 p-5">
                {mode === 'office' ? (
                    <div className="flex items-start gap-3 rounded-lg border border-success/35 bg-card/95 p-3 shadow-2xs">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-success/15 text-success">
                            <Navigation className="size-4" aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-medium">Dalam Radius Kantor</p>
                                <span className="font-mono text-xs font-semibold text-success">45m</span>
                            </div>
                            <p className="truncate text-xs text-muted-foreground">Studio RIM · Jl. Dago No. 88, Bandung</p>
                            <div className="mt-2 h-1 overflow-hidden rounded-full bg-success/15" aria-hidden="true">
                                <div className="h-full w-[45%] rounded-full bg-success" />
                            </div>
                            <p className="mt-1 text-[11px] text-muted-foreground">Radius maksimum 100m · Akurasi GPS ±8m</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3 rounded-lg border border-primary/20 bg-card/95 p-3 shadow-2xs">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-muted-foreground" id="site-project-label">
                                Proyek Site Visit
                            </label>
                            <Select
                                items={projectItems}
                                value={siteProject}
                                onValueChange={(v) => setSiteProject(v as string | null)}
                                disabled={isWorking}
                            >
                                <SelectTrigger className="h-9 w-full bg-background" aria-labelledby="site-project-label">
                                    <SelectValue placeholder="Pilih proyek lapangan" />
                                </SelectTrigger>
                                <SelectContent>
                                    {projectItems.map((p) => (
                                        <SelectItem key={p.value} value={p.value}>
                                            {p.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {photoUrl ? (
                            <div className="relative overflow-hidden rounded-lg border">
                                <img src={photoUrl} alt="Foto bukti lokasi site visit" className="h-28 w-full object-cover" />
                                {!isWorking && (
                                    <button
                                        type="button"
                                        onClick={() => setPhotoUrl(null)}
                                        className="absolute top-2 right-2 rounded-md bg-background/90 p-1 text-foreground shadow-sm outline-none hover:bg-background focus-visible:ring-2 focus-visible:ring-ring/50"
                                    >
                                        <X className="size-3.5" aria-hidden="true" />
                                        <span className="sr-only">Hapus foto</span>
                                    </button>
                                )}
                            </div>
                        ) : (
                            <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed bg-muted/40 px-4 py-5 text-center transition-colors hover:border-primary/50 hover:bg-accent/40">
                                <Camera className="size-5 text-muted-foreground" aria-hidden="true" />
                                <span className="text-sm font-medium">Ambil foto lokasi</span>
                                <span className="text-xs text-muted-foreground">Selfie di lokasi proyek sebagai bukti kehadiran</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    className="sr-only"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) setPhotoUrl(URL.createObjectURL(file));
                                    }}
                                />
                            </label>
                        )}
                        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <MapPin className="size-3" aria-hidden="true" />
                            Lokasi GPS akan direkam otomatis saat check-in
                        </p>
                    </div>
                )}

                <div className="rounded-lg border border-primary/25 bg-card p-4 shadow-2xs">
                    <div className="flex items-end justify-between gap-3">
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">Durasi kerja</p>
                            <p className="font-mono text-2xl font-semibold tracking-tight text-primary tabular-nums">
                                {formatDuration(elapsed)}
                            </p>
                        </div>
                        <StatusPill isWorking={isWorking} hasCheckedOut={!!checkedOutAt} overtime={overtime} />
                    </div>
                    <div
                        className="mt-3 h-2 overflow-hidden rounded-full bg-accent"
                        role="progressbar"
                        aria-label="Progres target 9 jam kerja"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(progress)}
                    >
                        <div
                            className={cn(
                                'h-full rounded-full transition-[width] duration-700',
                                overtime > 0 ? 'bg-warning' : 'bg-primary',
                            )}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 border-t pt-3 text-xs">
                        <TimeStat icon={LogIn} label="Masuk" value={checkedInAt ? formatClock(checkedInAt).slice(0, 5) : '—'} />
                        <TimeStat icon={Clock} label="Target pulang" value={targetEnd ? formatClock(targetEnd).slice(0, 5) : '—'} />
                        <TimeStat
                            icon={Timer}
                            label="Lembur"
                            value={overtime > 0 ? `+${formatDuration(overtime, false)}` : '0j 00m'}
                            highlight={overtime > 0}
                        />
                    </div>
                </div>

                {/* Action Button */}
                <div className="mt-auto">
                    {isWorking ? (
                        <button
                            type="button"
                            onClick={handleCheckOutClick}
                            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-primary/35 bg-card text-sm font-medium text-foreground transition-colors outline-none hover:bg-accent/50 focus-visible:ring-3 focus-visible:ring-ring/30"
                        >
                            <LogOut className="size-4 text-primary" aria-hidden="true" />
                            Check-out
                        </button>
                    ) : checkedOutAt ? (
                        <div className="flex flex-col gap-2">
                            <button
                                type="button"
                                disabled={cooldownRemainingSeconds > 0}
                                onClick={() => router.visit(route('attendance.index'))}
                                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground transition-colors outline-none hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Timer className="size-4" aria-hidden="true" />
                                {cooldownRemainingSeconds > 0
                                    ? `Mulai Lembur (${formatCooldown(cooldownRemainingSeconds)})`
                                    : 'Mulai Lembur Sekarang'}
                            </button>
                            <div className="flex items-center justify-between px-0.5 text-[11px] text-muted-foreground">
                                {cooldownRemainingSeconds > 0 ? (
                                    <button
                                        type="button"
                                        onClick={skipCooldown}
                                        className="font-medium text-primary hover:underline"
                                    >
                                        Lewati jeda 1 jam (Demo)
                                    </button>
                                ) : (
                                    <span className="font-medium text-success">Siap mulai lembur</span>
                                )}
                                <button
                                    type="button"
                                    onClick={checkIn}
                                    className="hover:text-foreground hover:underline"
                                >
                                    Check-in Ulang
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={checkIn}
                            disabled={!siteReady}
                            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground shadow-xs transition-colors outline-none hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <LogIn className="size-4" aria-hidden="true" />
                            {mode === 'office' ? 'Check-in Kantor' : 'Check-in Site Visit'}
                        </button>
                    )}
                </div>
            </div>

            {earlyCheckoutModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="fixed inset-0 bg-black/30 backdrop-blur-xs"
                        onClick={() => setEarlyCheckoutModal(false)}
                    />
                    <div className="relative z-10 w-full max-w-md rounded-xl border bg-card p-6 shadow-xl">
                        <div className="flex items-start gap-3">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-warning/20 text-amber-800">
                                <AlertTriangle className="size-5" />
                            </span>
                            <div>
                                <h3 className="text-base font-semibold">
                                    Durasi Kerja Belum Mencapai 9 Jam
                                </h3>
                                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                    Anda baru bekerja selama{' '}
                                    <strong className="text-foreground">
                                        {formatDuration(elapsed, false)}
                                    </strong>{' '}
                                    dari target 9 jam (540 menit). Checkout sekarang akan mencatat kekurangan{' '}
                                    <strong className="text-amber-700">
                                        {shortageMinutes} menit
                                    </strong>{' '}
                                    dengan status <code className="font-mono">kurang_jam</code>.
                                </p>
                            </div>
                        </div>
                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setEarlyCheckoutModal(false)}
                                className="h-9 rounded-lg border bg-card px-3.5 text-xs font-medium hover:bg-muted"
                            >
                                Batal (Lanjut Kerja)
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setEarlyCheckoutModal(false);
                                    checkOut();
                                }}
                                className="h-9 rounded-lg bg-amber-600 px-3.5 text-xs font-medium text-white hover:bg-amber-700"
                            >
                                Tetap Check-out (Catat Kurang Jam)
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

function ModeToggle({
    mode,
    onChange,
    disabled,
}: {
    mode: AttendanceMode;
    onChange: (m: AttendanceMode) => void;
    disabled: boolean;
}) {
    const options = [
        { value: 'office' as const, label: 'Kantor', icon: Building2 },
        { value: 'site' as const, label: 'Site Visit', icon: HardHat },
    ];
    return (
        <div role="radiogroup" aria-label="Mode presensi" className="flex shrink-0 rounded-lg border bg-card/80 p-0.5">
            {options.map((opt) => {
                const Icon = opt.icon;
                const selected = mode === opt.value;
                return (
                    <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        disabled={disabled && !selected}
                        onClick={() => onChange(opt.value)}
                        className={cn(
                            'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-40',
                            selected ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
                        )}
                    >
                        <Icon className="size-3.5" aria-hidden="true" />
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}

function StatusPill({ isWorking, hasCheckedOut, overtime }: { isWorking: boolean; hasCheckedOut: boolean; overtime: number }) {
    if (overtime > 0)
        return <span className="rounded-full bg-warning/20 px-2 py-0.5 text-[11px] font-medium text-amber-800">Lembur aktif</span>;
    if (isWorking)
        return <span className="rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-medium text-success">Sedang bekerja</span>;
    if (hasCheckedOut)
        return <span className="rounded-full bg-card px-2 py-0.5 text-[11px] font-medium text-muted-foreground border">Selesai</span>;
    return <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-accent-foreground">Belum check-in</span>;
}

function TimeStat({
    icon: Icon,
    label,
    value,
    highlight,
}: {
    icon: typeof Clock;
    label: string;
    value: string;
    highlight?: boolean;
}) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="flex items-center gap-1 text-muted-foreground">
                <Icon className="size-3" aria-hidden="true" />
                {label}
            </span>
            <span className={cn('font-mono font-medium tabular-nums', highlight && 'text-amber-700')}>{value}</span>
        </div>
    );
}
