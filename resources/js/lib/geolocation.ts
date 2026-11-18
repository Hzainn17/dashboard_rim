import { useCallback, useEffect, useState } from 'react';

export function calculateHaversineMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
): number {
    const earthRadius = 6371000;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
            Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(earthRadius * c);
}

export type GpsState = {
    status: 'loading' | 'ready' | 'error';
    latitude: number | null;
    longitude: number | null;
    distanceMeters: number | null;
    accuracy: number | null;
    errorMessage: string | null;
    isWithinRadius: boolean;
    refresh: () => void;
};

export function useOfficeGps(
    officeLat: number,
    officeLng: number,
    radiusMeters: number,
): GpsState {
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);
    const [accuracy, setAccuracy] = useState<number | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const refresh = useCallback(() => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
            setStatus('error');
            setErrorMessage('Browser tidak mendukung Geolocation GPS.');
            return;
        }

        setStatus('loading');
        setErrorMessage(null);

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLatitude(pos.coords.latitude);
                setLongitude(pos.coords.longitude);
                setAccuracy(Math.round(pos.coords.accuracy));
                setStatus('ready');
            },
            (err) => {
                let msg = 'Gagal membaca lokasi GPS.';
                if (err.code === err.PERMISSION_DENIED) {
                    msg = 'Izin lokasi ditolak. Aktifkan GPS di pengaturan browser.';
                } else if (err.code === err.POSITION_UNAVAILABLE) {
                    msg = 'Sinyal GPS tidak tersedia.';
                } else if (err.code === err.TIMEOUT) {
                    msg = 'Pencarian GPS timeout. Coba refresh.';
                }
                setStatus('error');
                setErrorMessage(msg);
            },
            {
                enableHighAccuracy: true,
                timeout: 12000,
                maximumAge: 15000,
            },
        );
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const distanceMeters =
        latitude !== null && longitude !== null
            ? calculateHaversineMeters(latitude, longitude, officeLat, officeLng)
            : null;

    const isWithinRadius =
        distanceMeters !== null ? distanceMeters <= radiusMeters : false;

    return {
        status,
        latitude,
        longitude,
        distanceMeters,
        accuracy,
        errorMessage,
        isWithinRadius,
        refresh,
    };
}
