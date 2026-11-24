import * as React from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';

export type AttendanceMode = 'office' | 'site';

type AttendanceState = {
    mode: AttendanceMode;
    setMode: (mode: AttendanceMode) => void;
    checkedInAt: Date | null;
    checkedOutAt: Date | null;
    elapsedMs: number;
    cooldownRemainingSeconds: number;
    skipCooldown: () => void;
    siteProject: string | null;
    setSiteProject: (id: string | null) => void;
    checkIn: (coords?: {
        latitude?: number | null;
        longitude?: number | null;
        distance_meters?: number | null;
        site_visit_project_id?: number | string | null;
        site_visit_photo?: File | null;
        notes?: string | null;
    }) => void;
    checkOut: (coords?: {
        latitude?: number | null;
        longitude?: number | null;
        distance_meters?: number | null;
    }) => void;
    now: Date | null;
};

const AttendanceContext = createContext<AttendanceState | null>(null);

export function AttendanceProvider({ children }: { children: React.ReactNode }) {
    const page = usePage<PageProps>();
    const serverAtt = page.props.auth?.todayAttendance ?? null;

    const isFieldWorker = page.props.auth?.workType === 'lapangan';
    const [mode, setMode] = useState<AttendanceMode>(
        serverAtt ? (serverAtt.mode === 'site_visit' ? 'site' : 'office') : isFieldWorker ? 'site' : 'office',
    );
    const [checkedInAt, setCheckedInAt] = useState<Date | null>(
        serverAtt?.check_in_at ? new Date(serverAtt.check_in_at) : null,
    );
    const [checkedOutAt, setCheckedOutAt] = useState<Date | null>(
        serverAtt?.check_out_at ? new Date(serverAtt.check_out_at) : null,
    );
    const [elapsedSeconds, setElapsedSeconds] = useState<number>(serverAtt?.elapsed_seconds ?? 0);
    const [cooldownRemainingSeconds, setCooldownRemainingSeconds] = useState<number>(
        serverAtt?.cooldown_remaining_seconds ?? 3600,
    );
    const [siteProject, setSiteProject] = useState<string | null>(
        serverAtt?.site_visit_project_id ? String(serverAtt.site_visit_project_id) : null,
    );
    const [now, setNow] = useState<Date | null>(new Date());

    // Sync state whenever server props update (after check-in / check-out)
    useEffect(() => {
        if (serverAtt) {
            setMode(serverAtt.mode === 'site_visit' ? 'site' : 'office');
            setCheckedInAt(serverAtt.check_in_at ? new Date(serverAtt.check_in_at) : null);
            setCheckedOutAt(serverAtt.check_out_at ? new Date(serverAtt.check_out_at) : null);
            setElapsedSeconds(serverAtt.elapsed_seconds ?? 0);
            setCooldownRemainingSeconds(serverAtt.cooldown_remaining_seconds ?? 3600);
            setSiteProject(serverAtt.site_visit_project_id ? String(serverAtt.site_visit_project_id) : null);
        }
    }, [
        serverAtt?.id,
        serverAtt?.check_in_at,
        serverAtt?.check_out_at,
        serverAtt?.elapsed_seconds,
        serverAtt?.cooldown_remaining_seconds,
        serverAtt?.mode,
        serverAtt?.site_visit_project_id,
    ]);

    const isWorking = !!checkedInAt && !checkedOutAt;
    const hasCheckedOut = !!checkedOutAt;

    useEffect(() => {
        const id = window.setInterval(() => {
            setNow(new Date());
            if (isWorking) {
                setElapsedSeconds((prev) => prev + 1);
            }
            if (hasCheckedOut) {
                setCooldownRemainingSeconds((prev) => Math.max(0, prev - 1));
            }
        }, 1000);
        return () => window.clearInterval(id);
    }, [isWorking, hasCheckedOut]);

    const checkIn = useCallback(
        (coords?: {
            latitude?: number | null;
            longitude?: number | null;
            distance_meters?: number | null;
            site_visit_project_id?: number | string | null;
            site_visit_photo?: File | null;
            notes?: string | null;
        }) => {
            router.post(
                route('attendance.check-in'),
                {
                    mode: mode === 'site' ? 'site_visit' : 'office',
                    ...(coords?.latitude != null && coords?.longitude != null
                        ? {
                              latitude: coords.latitude,
                              longitude: coords.longitude,
                          }
                        : {}),
                    ...(coords?.distance_meters != null
                        ? { distance_meters: coords.distance_meters }
                        : {}),
                    ...(mode === 'site' && coords?.site_visit_project_id
                        ? { site_visit_project_id: Number(coords.site_visit_project_id) }
                        : {}),
                    ...(mode === 'site' && coords?.site_visit_photo
                        ? { site_visit_photo: coords.site_visit_photo }
                        : {}),
                    ...(coords?.notes ? { notes: coords.notes } : {}),
                },
                {
                    forceFormData: true,
                    preserveScroll: true,
                    preserveState: true,
                    onSuccess: () => {
                        setCheckedInAt(new Date());
                        setCheckedOutAt(null);
                        setElapsedSeconds(0);
                        setCooldownRemainingSeconds(3600);
                    },
                },
            );
        },
        [mode],
    );

    const checkOut = useCallback(
        (coords?: {
            latitude?: number | null;
            longitude?: number | null;
            distance_meters?: number | null;
        }) => {
            router.post(
                route('attendance.check-out'),
                {
                    simulated_minutes: Math.max(1, Math.floor(elapsedSeconds / 60)),
                    ...(coords?.latitude != null && coords?.longitude != null
                        ? {
                              latitude: coords.latitude,
                              longitude: coords.longitude,
                          }
                        : {}),
                    ...(coords?.distance_meters != null
                        ? { distance_meters: coords.distance_meters }
                        : {}),
                },
                {
                    preserveScroll: true,
                    preserveState: true,
                    onSuccess: () => {
                        setCheckedOutAt(new Date());
                        setCooldownRemainingSeconds(3600);
                    },
                },
            );
        },
        [elapsedSeconds],
    );

    const skipCooldown = useCallback(() => {
        setCooldownRemainingSeconds(0);
    }, []);

    const elapsedMs = elapsedSeconds * 1000;

    const value = useMemo(
        () => ({
            mode,
            setMode,
            checkedInAt,
            checkedOutAt,
            elapsedMs,
            cooldownRemainingSeconds,
            skipCooldown,
            siteProject,
            setSiteProject,
            checkIn,
            checkOut,
            now,
        }),
        [
            mode,
            checkedInAt,
            checkedOutAt,
            elapsedMs,
            cooldownRemainingSeconds,
            skipCooldown,
            siteProject,
            checkIn,
            checkOut,
            now,
        ],
    );

    return <AttendanceContext.Provider value={value}>{children}</AttendanceContext.Provider>;
}

export function useAttendance() {
    const ctx = useContext(AttendanceContext);
    if (!ctx) throw new Error('useAttendance must be used within AttendanceProvider');
    return ctx;
}

export function formatClock(date: Date) {
    return new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    }).format(date);
}

export function formatDuration(ms: number, includeSeconds = true) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (includeSeconds) {
        return `${h}j ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}d`;
    }
    return `${h}j ${m.toString().padStart(2, '0')}m`;
}

export function formatCooldown(seconds: number) {
    const safe = Math.max(0, Math.floor(seconds));
    const m = Math.floor(safe / 60);
    const s = safe % 60;
    return `${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}d`;
}
