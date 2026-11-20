import * as React from 'react';
import { useRef, useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    Building2,
    Camera,
    CheckCircle2,
    Clock,
    Compass,
    Edit3,
    ExternalLink,
    ImagePlus,
    LocateFixed,
    MapPin,
    Navigation,
    Plus,
    Save,
    Settings,
    Trash2,
    Wallet,
    X,
} from 'lucide-react';
import { AppShell } from '@/Components/dashboard/app-shell';
import { CurrencyInput } from '@/Components/CurrencyInput';
import { PageProps } from '@/types';
import { cn } from '@/lib/utils';
import { prepareWebImage } from '@/lib/image-upload';

interface StudioSettingProps {
    office_name: string;
    company_logo_url?: string | null;
    latitude: number;
    longitude: number;
    radius_meters: number;
    standard_work_hours: number;
    overtime_cooldown_minutes: number;
    overtime_rate_per_hour: number;
}

interface PortfolioItem {
    id: number;
    title: string;
    category: string;
    location: string;
    caption: string;
    image_url: string;
    sort_order: number;
}

interface Props extends PageProps {
    setting: StudioSettingProps;
    portfolios?: PortfolioItem[];
}

const radiusPresets = [50, 100, 150, 250, 500];

export default function SettingsIndex({ auth, setting, portfolios = [] }: Props) {
    const { flash } = usePage<PageProps>().props;
    const initialRole = auth.user.role === 'admin' ? 'admin' : 'karyawan';

    const { data, setData, put, processing, errors } = useForm({
        office_name: setting.office_name || 'RIM Studio Arsitektur',
        latitude: String(setting.latitude),
        longitude: String(setting.longitude),
        radius_meters: setting.radius_meters || 100,
        standard_work_hours: setting.standard_work_hours || 9,
        overtime_cooldown_minutes: setting.overtime_cooldown_minutes ?? 60,
        overtime_rate_per_hour: setting.overtime_rate_per_hour || 25000,
    });

    const [gpsLoading, setGpsLoading] = useState(false);
    const [gpsFeedback, setGpsFeedback] = useState<{
        type: 'success' | 'error';
        message: string;
    } | null>(null);
    const [quickCoordInput, setQuickCoordInput] = useState('');
    const logoInputRef = useRef<HTMLInputElement | null>(null);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [logoError, setLogoError] = useState<string | null>(null);

    // Login Portfolio Management state
    const [isPortfolioModalOpen, setIsPortfolioModalOpen] = useState(false);
    const [editingPortfolio, setEditingPortfolio] = useState<PortfolioItem | null>(null);
    const [portfolioTitle, setPortfolioTitle] = useState('');
    const [portfolioCategory, setPortfolioCategory] = useState('');
    const [portfolioLocation, setPortfolioLocation] = useState('');
    const [portfolioCaption, setPortfolioCaption] = useState('');
    const [portfolioImageUrl, setPortfolioImageUrl] = useState('/project-covers/rumah-tropis.png');
    const [portfolioImageFile, setPortfolioImageFile] = useState<File | null>(null);
    const [portfolioPreview, setPortfolioPreview] = useState<string>('/project-covers/rumah-tropis.png');
    const [portfolioImageError, setPortfolioImageError] = useState<string | null>(null);
    const [savingPortfolio, setSavingPortfolio] = useState(false);

    const openCreatePortfolio = () => {
        setEditingPortfolio(null);
        setPortfolioTitle('');
        setPortfolioCategory('');
        setPortfolioLocation('');
        setPortfolioCaption('');
        setPortfolioImageUrl('/project-covers/rumah-tropis.png');
        setPortfolioImageFile(null);
        setPortfolioImageError(null);
        setPortfolioPreview('/project-covers/rumah-tropis.png');
        setIsPortfolioModalOpen(true);
    };

    const openEditPortfolio = (item: PortfolioItem) => {
        setEditingPortfolio(item);
        setPortfolioTitle(item.title);
        setPortfolioCategory(item.category || '');
        setPortfolioLocation(item.location || '');
        setPortfolioCaption(item.caption || '');
        setPortfolioImageUrl(item.image_url);
        setPortfolioImageFile(null);
        setPortfolioImageError(null);
        setPortfolioPreview(item.image_url);
        setIsPortfolioModalOpen(true);
    };

    const handlePortfolioFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawFile = e.target.files?.[0];
        if (!rawFile) return;
        setPortfolioImageError(null);
        const { file, error } = await prepareWebImage(rawFile, { maxWidth: 1600, maxHeight: 1200, maxBytes: 4 * 1024 * 1024 });
        if (error) {
            setPortfolioImageError(error);
            e.target.value = '';
            return;
        }
        setPortfolioImageFile(file);
        setPortfolioPreview(URL.createObjectURL(file));
    };

    const handlePortfolioSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSavingPortfolio(true);

        const payload = new FormData();
        payload.append('title', portfolioTitle);
        payload.append('category', portfolioCategory);
        payload.append('location', portfolioLocation);
        payload.append('caption', portfolioCaption);
        payload.append('image_url', portfolioImageUrl);
        if (portfolioImageFile) {
            payload.append('image', portfolioImageFile);
        }

        const targetUrl = editingPortfolio
            ? route('settings.portfolios.update', editingPortfolio.id)
            : route('settings.portfolios.store');

        router.post(targetUrl, payload, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => setIsPortfolioModalOpen(false),
            onFinish: () => setSavingPortfolio(false),
        });
    };

    const handleDeletePortfolio = (id: number) => {
        if (!confirm('Hapus slide portofolio ini dari halaman login?')) return;
        router.delete(route('settings.portfolios.destroy', id), { preserveScroll: true });
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) {
            return;
        }
        setLogoError(null);
        setUploadingLogo(true);
        router.post(
            route('settings.logo.update'),
            { logo: file },
            {
                forceFormData: true,
                preserveScroll: true,
                onError: (errs) => {
                    setLogoError(errs.logo ?? 'Gagal mengunggah foto perusahaan.');
                },
                onFinish: () => {
                    setUploadingLogo(false);
                    if (logoInputRef.current) {
                        logoInputRef.current.value = '';
                    }
                },
            },
        );
    };

    const handleDeleteLogo = () => {
        setLogoError(null);
        setUploadingLogo(true);
        router.delete(route('settings.logo.delete'), {
            preserveScroll: true,
            onFinish: () => setUploadingLogo(false),
        });
    };

    const parsedLat = parseFloat(data.latitude);
    const parsedLng = parseFloat(data.longitude);
    const hasValidCoords =
        !Number.isNaN(parsedLat) &&
        !Number.isNaN(parsedLng) &&
        parsedLat >= -90 &&
        parsedLat <= 90 &&
        parsedLng >= -180 &&
        parsedLng <= 180;

    const handleDetectCurrentLocation = () => {
        if (!navigator.geolocation) {
            setGpsFeedback({
                type: 'error',
                message: 'Browser Anda tidak mendukung fitur Geolocation GPS.',
            });
            return;
        }

        setGpsLoading(true);
        setGpsFeedback(null);

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude.toFixed(7);
                const lng = pos.coords.longitude.toFixed(7);
                const acc = Math.round(pos.coords.accuracy);
                setData((prev) => ({
                    ...prev,
                    latitude: lat,
                    longitude: lng,
                }));
                setGpsFeedback({
                    type: 'success',
                    message: `Lokasi GPS berhasil dikunci (${lat}, ${lng}) dengan akurasi ±${acc}m. Jangan lupa klik Simpan Pengaturan.`,
                });
                setGpsLoading(false);
            },
            (err) => {
                let msg = 'Gagal mengambil lokasi GPS.';
                if (err.code === err.PERMISSION_DENIED) {
                    msg = 'Izin akses lokasi ditolak browser. Mohon izinkan akses lokasi pada pengaturan browser Anda.';
                } else if (err.code === err.POSITION_UNAVAILABLE) {
                    msg = 'Sinyal lokasi tidak tersedia saat ini.';
                } else if (err.code === err.TIMEOUT) {
                    msg = 'Waktu pencarian GPS habis. Coba lagi.';
                }
                setGpsFeedback({ type: 'error', message: msg });
                setGpsLoading(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 12000,
                maximumAge: 0,
            },
        );
    };

    const handleQuickCoordParse = (raw: string) => {
        setQuickCoordInput(raw);
        // Match @lat,lng or plain "lat, lng"
        const match = raw.match(/(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
        if (match) {
            const lat = parseFloat(match[1]);
            const lng = parseFloat(match[2]);
            if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                setData((prev) => ({
                    ...prev,
                    latitude: lat.toFixed(7),
                    longitude: lng.toFixed(7),
                }));
                setGpsFeedback({
                    type: 'success',
                    message: `Koordinat berhasil diekstrak: ${lat.toFixed(7)}, ${lng.toFixed(7)}`,
                });
            }
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('settings.update'), {
            preserveScroll: true,
        });
    };

    const googleMapsUrl = hasValidCoords
        ? `https://www.google.com/maps?q=${parsedLat},${parsedLng}`
        : '#';
    const googleMapsEmbedUrl = hasValidCoords
        ? `https://maps.google.com/maps?q=${parsedLat},${parsedLng}&z=17&output=embed`
        : '';

    return (
        <AppShell initialRole={initialRole} initialActive="pengaturan">
            <Head title="Pengaturan Studio" />

            <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
                {/* Page Heading */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="flex flex-col gap-1">
                        <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                            Konfigurasi Sistem & Geofencing
                        </p>
                        <div className="flex items-center gap-2.5">
                            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <Settings className="size-5" />
                            </span>
                            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                                Pengaturan Studio
                            </h1>
                        </div>
                    </div>
                </div>

                {/* Flash Messages */}
                {flash?.success && (
                    <div className="flex items-center gap-2.5 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
                        <CheckCircle2 className="size-4 shrink-0" />
                        <span>{flash.success}</span>
                    </div>
                )}
                {(flash?.error || logoError) && (
                    <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        <AlertTriangle className="size-4 shrink-0" />
                        <span>{logoError ?? flash?.error}</span>
                    </div>
                )}

                {/* Foto / Logo Perusahaan */}
                <section className="rounded-2xl border bg-card p-5 sm:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-background p-2">
                                <img
                                    src={setting.company_logo_url || '/rim-projects-logo.png'}
                                    alt={setting.office_name || 'Logo Perusahaan'}
                                    className="h-full w-full object-contain"
                                />
                            </div>
                            <div>
                                <h2 className="flex items-center gap-2 text-base font-semibold">
                                    <Building2 className="size-4 text-primary" />
                                    Foto / Logo Perusahaan
                                </h2>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    Foto ini akan tampil sebagai identitas perusahaan di Sidebar dan Halaman Login (PNG/JPG/WebP maks. 2MB).
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <input
                                ref={logoInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                className="hidden"
                                onChange={handleLogoChange}
                            />
                            <button
                                type="button"
                                disabled={uploadingLogo}
                                onClick={() => logoInputRef.current?.click()}
                                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                            >
                                <Camera className="size-3.5" />
                                {uploadingLogo
                                    ? 'Mengunggah...'
                                    : setting.company_logo_url
                                      ? 'Ganti Foto Perusahaan'
                                      : 'Upload Foto Perusahaan'}
                            </button>
                            {setting.company_logo_url && (
                                <button
                                    type="button"
                                    disabled={uploadingLogo}
                                    onClick={handleDeleteLogo}
                                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border bg-background px-3 text-xs font-medium text-muted-foreground transition hover:bg-muted disabled:opacity-50"
                                >
                                    <Trash2 className="size-3.5" />
                                    Reset Default
                                </button>
                            )}
                        </div>
                    </div>
                </section>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    {/* Left Column: GPS & Office Location */}
                    <div className="flex flex-col gap-5 lg:col-span-7">
                        <section className="rounded-2xl border bg-card p-5 sm:p-6">
                            <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
                                <div>
                                    <h2 className="flex items-center gap-2 text-base font-semibold">
                                        <MapPin className="size-4 text-primary" />
                                        Lokasi Kantor & Radius GPS Absensi
                                    </h2>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        Titik koordinat ini dipakai untuk validasi jarak check-in mode
                                        Kantor secara real-time.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleDetectCurrentLocation}
                                    disabled={gpsLoading}
                                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-xs font-semibold text-primary-foreground shadow-xs transition hover:bg-primary/90 disabled:opacity-60"
                                >
                                    <LocateFixed className={cn('size-4', gpsLoading && 'animate-spin')} />
                                    <span>
                                        {gpsLoading
                                            ? 'Mencari GPS...'
                                            : 'Ambil Lokasi Saya Saat Ini'}
                                    </span>
                                </button>
                            </div>

                            {gpsFeedback && (
                                <div
                                    className={cn(
                                        'mt-4 flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-xs',
                                        gpsFeedback.type === 'success'
                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                            : 'border-rose-200 bg-rose-50 text-rose-800',
                                    )}
                                >
                                    {gpsFeedback.type === 'success' ? (
                                        <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                                    ) : (
                                        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                                    )}
                                    <span>{gpsFeedback.message}</span>
                                </div>
                            )}

                            <div className="mt-4 flex flex-col gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-foreground">
                                        Nama Studio / Kantor
                                    </label>
                                    <div className="relative mt-1">
                                        <Building2 className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                        <input
                                            type="text"
                                            required
                                            value={data.office_name}
                                            onChange={(e) => setData('office_name', e.target.value)}
                                            className="h-9 w-full rounded-lg border bg-background pl-9 pr-3 text-xs focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                                        />
                                    </div>
                                    {errors.office_name && (
                                        <p className="mt-1 text-xs text-destructive">
                                            {errors.office_name}
                                        </p>
                                    )}
                                </div>

                                {/* Quick paste from Google Maps */}
                                <div className="rounded-xl border border-dashed bg-muted/30 p-3.5">
                                    <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                                        <Compass className="size-3.5 text-primary" />
                                        Tempel Koordinat / Link Google Maps (Opsional)
                                    </label>
                                    <input
                                        type="text"
                                        value={quickCoordInput}
                                        onChange={(e) => handleQuickCoordParse(e.target.value)}
                                        placeholder="Tempel koordinat (-6.2087634, 106.8455990) atau URL Google Maps..."
                                        className="mt-1.5 h-9 w-full rounded-lg border bg-background px-3 text-xs placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                                    />
                                    <p className="mt-1 text-[11px] text-muted-foreground">
                                        Otomatis mengisi kolom Latitude & Longitude di bawah.
                                    </p>
                                </div>

                                {/* Lat & Lng */}
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div>
                                        <label className="text-xs font-semibold text-foreground">
                                            Latitude (Garis Lintang)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.0000001"
                                            required
                                            value={data.latitude}
                                            onChange={(e) => setData('latitude', e.target.value)}
                                            className="mt-1 h-9 w-full rounded-lg border bg-background px-3 font-mono text-xs tabular-nums focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                                        />
                                        {errors.latitude && (
                                            <p className="mt-1 text-xs text-destructive">
                                                {errors.latitude}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="text-xs font-semibold text-foreground">
                                            Longitude (Garis Bujur)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.0000001"
                                            required
                                            value={data.longitude}
                                            onChange={(e) => setData('longitude', e.target.value)}
                                            className="mt-1 h-9 w-full rounded-lg border bg-background px-3 font-mono text-xs tabular-nums focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                                        />
                                        {errors.longitude && (
                                            <p className="mt-1 text-xs text-destructive">
                                                {errors.longitude}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Radius Toleransi */}
                                <div>
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-semibold text-foreground">
                                            Radius Toleransi Absensi Kantor (Meter)
                                        </label>
                                        <span className="font-mono text-xs font-semibold text-primary tabular-nums">
                                            {data.radius_meters} meter
                                        </span>
                                    </div>
                                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                        <input
                                            type="number"
                                            min={10}
                                            max={10000}
                                            required
                                            value={data.radius_meters}
                                            onChange={(e) =>
                                                setData('radius_meters', Number(e.target.value))
                                            }
                                            className="h-9 w-32 rounded-lg border bg-background px-3 font-mono text-xs tabular-nums focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                                        />
                                        <div className="flex flex-wrap gap-1.5">
                                            {radiusPresets.map((r) => (
                                                <button
                                                    key={r}
                                                    type="button"
                                                    onClick={() => setData('radius_meters', r)}
                                                    className={cn(
                                                        'rounded-md border px-2.5 py-1 text-xs font-medium transition',
                                                        data.radius_meters === r
                                                            ? 'border-foreground bg-foreground text-background'
                                                            : 'bg-background text-muted-foreground hover:bg-muted',
                                                    )}
                                                >
                                                    {r}m
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    {errors.radius_meters && (
                                        <p className="mt-1 text-xs text-destructive">
                                            {errors.radius_meters}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </section>

                        {/* Work Hours & Overtime Rules */}
                        <section className="rounded-2xl border bg-card p-5 sm:p-6">
                            <div className="border-b pb-4">
                                <h2 className="flex items-center gap-2 text-base font-semibold">
                                    <Clock className="size-4 text-primary" />
                                    Aturan Jam Kerja & Lembur
                                </h2>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    Standar durasi kerja harian, jeda sebelum lembur, dan tarif
                                    lembur default.
                                </p>
                            </div>

                            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <div>
                                    <label className="text-xs font-semibold text-foreground">
                                        Jam Kerja Harian (Jam)
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={16}
                                        required
                                        value={data.standard_work_hours}
                                        onChange={(e) =>
                                            setData('standard_work_hours', Number(e.target.value))
                                        }
                                        className="mt-1 h-9 w-full rounded-lg border bg-background px-3 font-mono text-xs tabular-nums focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                                    />
                                    <p className="mt-1 text-[11px] text-muted-foreground">
                                        Default: 9 jam/hari
                                    </p>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-foreground">
                                        Cooldown Lembur (Menit)
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={240}
                                        required
                                        value={data.overtime_cooldown_minutes}
                                        onChange={(e) =>
                                            setData(
                                                'overtime_cooldown_minutes',
                                                Number(e.target.value),
                                            )
                                        }
                                        className="mt-1 h-9 w-full rounded-lg border bg-background px-3 font-mono text-xs tabular-nums focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                                    />
                                    <p className="mt-1 text-[11px] text-muted-foreground">
                                        Jeda setelah check-out
                                    </p>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-foreground">
                                        Tarif Lembur / Jam
                                    </label>
                                    <div className="mt-1">
                                        <CurrencyInput
                                            value={data.overtime_rate_per_hour}
                                            onChange={(val) =>
                                                setData('overtime_rate_per_hour', val)
                                            }
                                        />
                                    </div>
                                    <p className="mt-1 text-[11px] text-muted-foreground">
                                        Tarif standar studio
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6 flex items-center justify-end border-t pt-4">
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-foreground px-5 text-xs font-semibold text-background shadow-xs transition hover:bg-foreground/90 disabled:opacity-50"
                                >
                                    <Save className="size-4" />
                                    <span>
                                        {processing ? 'Menyimpan...' : 'Simpan Pengaturan Studio'}
                                    </span>
                                </button>
                            </div>
                        </section>
                    </div>

                    {/* Right Column: Live Map Preview */}
                    <div className="flex flex-col gap-4 lg:col-span-5">
                        <section className="flex h-full flex-col rounded-2xl border bg-card p-5">
                            <div className="flex items-center justify-between border-b pb-3">
                                <div>
                                    <h2 className="flex items-center gap-2 text-sm font-semibold">
                                        <Navigation className="size-4 text-primary" />
                                        Pratinjau Titik Lokasi Kantor
                                    </h2>
                                    <p className="text-xs text-muted-foreground">
                                        Radius aktif:{' '}
                                        <strong className="text-foreground">
                                            {data.radius_meters} meter
                                        </strong>{' '}
                                        dari pin
                                    </p>
                                </div>

                                {hasValidCoords && (
                                    <a
                                        href={googleMapsUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium text-primary hover:bg-muted"
                                    >
                                        <span>Google Maps</span>
                                        <ExternalLink className="size-3" />
                                    </a>
                                )}
                            </div>

                            <div className="mt-4 flex-1 overflow-hidden rounded-xl border bg-muted min-h-[320px]">
                                {hasValidCoords ? (
                                    <iframe
                                        title="Peta Lokasi Studio"
                                        src={googleMapsEmbedUrl}
                                        className="h-full min-h-[320px] w-full border-0"
                                        loading="lazy"
                                        referrerPolicy="no-referrer-when-downgrade"
                                    />
                                ) : (
                                    <div className="flex h-full min-h-[320px] items-center justify-center p-6 text-center text-xs text-muted-foreground">
                                        Masukkan Latitude & Longitude yang valid untuk melihat peta
                                        lokasi.
                                    </div>
                                )}
                            </div>

                            <div className="mt-3 rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
                                <p className="font-medium text-foreground">
                                    Cara Kerja Geofencing Absensi:
                                </p>
                                <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px]">
                                    <li>
                                        Saat karyawan menekan <strong>Check-in Kantor</strong>,
                                        browser mengambil GPS perangkat dan menghitung jarak Haversine
                                        ke koordinat di atas.
                                    </li>
                                    <li>
                                        Jika jarak $\le$ <strong>{data.radius_meters}m</strong>,
                                        absensi kantor langsung diterima.
                                    </li>
                                    <li>
                                        Jika berada di luar radius, karyawan diarahkan menggunakan
                                        mode <strong>Site Visit (Lapangan)</strong> dengan foto
                                        bukti.
                                    </li>
                                </ul>
                            </div>
                        </section>
                    </div>
                </form>

                {/* Portofolio Halaman Login */}
                <section className="rounded-xl border bg-card p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
                        <div>
                            <h2 className="text-sm font-semibold text-foreground">
                                Portofolio Halaman Login
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                Foto karya studio yang tampil bergantian di sisi kiri halaman login.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={openCreatePortfolio}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#46797b] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#3a6668]"
                        >
                            <Plus className="size-3.5" />
                            <span>Tambah Portofolio</span>
                        </button>
                    </div>

                    {portfolios.length === 0 ? (
                        <div className="mt-4 rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
                            Belum ada portofolio halaman login. Klik <strong>Tambah Portofolio</strong> untuk mengunggah foto karya studio.
                        </div>
                    ) : (
                        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {portfolios.map((item) => (
                                <div
                                    key={item.id}
                                    className="group flex flex-col overflow-hidden rounded-xl border bg-background"
                                >
                                    <div className="relative h-40 w-full shrink-0 overflow-hidden bg-muted">
                                        <img
                                            src={item.image_url}
                                            alt={item.title}
                                            className="h-full w-full object-cover"
                                        />
                                    </div>
                                    <div className="flex flex-1 flex-col gap-1 p-3">
                                        {item.category && (
                                            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#46797b]">
                                                {item.category}
                                            </span>
                                        )}
                                        <h3 className="text-xs font-bold text-foreground line-clamp-1">
                                            {item.title}
                                        </h3>
                                        {item.location && (
                                            <p className="text-[11px] text-muted-foreground line-clamp-1">
                                                {item.location}
                                            </p>
                                        )}
                                        {item.caption && (
                                            <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">
                                                {item.caption}
                                            </p>
                                        )}
                                        <div className="mt-auto flex items-center justify-end gap-1.5 pt-2 border-t">
                                            <button
                                                type="button"
                                                onClick={() => openEditPortfolio(item)}
                                                className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold hover:bg-muted"
                                            >
                                                <Edit3 className="size-3" />
                                                <span>Edit</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDeletePortfolio(item.id)}
                                                className="rounded-md border p-1 text-muted-foreground hover:bg-rose-50 hover:text-rose-600"
                                                title="Hapus"
                                            >
                                                <Trash2 className="size-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            {/* Modal Tambah / Edit Portofolio Login */}
            {isPortfolioModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
                    <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border bg-card p-6 shadow-2xl">
                        <div className="flex items-start justify-between border-b pb-3">
                            <div>
                                <h3 className="text-base font-bold text-foreground">
                                    {editingPortfolio ? 'Edit Portofolio Login' : 'Tambah Portofolio Login'}
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Unggah foto karya portofolio langsung dari perangkat Anda.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsPortfolioModalOpen(false)}
                                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
                            >
                                <X className="size-4" />
                            </button>
                        </div>

                        <form onSubmit={handlePortfolioSubmit} className="mt-4 flex flex-col gap-3">
                            <div>
                                <label className="text-xs font-semibold text-foreground">
                                    Gambar Portofolio <span className="text-rose-500">*</span>
                                </label>
                                <div className="mt-1.5 h-48 w-full overflow-hidden rounded-xl border bg-muted">
                                    <img
                                        src={portfolioPreview}
                                        alt="Preview"
                                        className="h-full w-full object-cover"
                                    />
                                </div>

                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted">
                                        <ImagePlus className="size-3.5 text-[#46797b]" />
                                        <span>Unggah Gambar dari Perangkat</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handlePortfolioFileSelect}
                                            className="hidden"
                                        />
                                    </label>
                                    <span className="text-[11px] text-muted-foreground">
                                        Otomatis dikompresi & disesuaikan untuk web (maks. 4 MB).
                                    </span>
                                </div>
                                {portfolioImageError && (
                                    <div className="mt-2 flex items-center gap-2 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                                        <AlertTriangle className="size-4 shrink-0" />
                                        <span>{portfolioImageError}</span>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground">
                                    Judul Proyek <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={portfolioTitle}
                                    onChange={(e) => setPortfolioTitle(e.target.value)}
                                    placeholder="cth: Villa Kayu & Batu Alam Lembang"
                                    className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs focus:border-foreground focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div>
                                    <label className="text-xs font-semibold text-foreground">
                                        Kategori
                                    </label>
                                    <input
                                        type="text"
                                        value={portfolioCategory}
                                        onChange={(e) => setPortfolioCategory(e.target.value)}
                                        placeholder="cth: Hunian Privat"
                                        className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs focus:border-foreground focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-foreground">
                                        Lokasi
                                    </label>
                                    <input
                                        type="text"
                                        value={portfolioLocation}
                                        onChange={(e) => setPortfolioLocation(e.target.value)}
                                        placeholder="cth: Bandung Barat"
                                        className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs focus:border-foreground focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground">
                                    Deskripsi Singkat / Caption
                                </label>
                                <textarea
                                    rows={2}
                                    value={portfolioCaption}
                                    onChange={(e) => setPortfolioCaption(e.target.value)}
                                    placeholder="Harmoni arsitektur tropis modern..."
                                    className="mt-1 w-full rounded-lg border bg-background p-2.5 text-xs focus:border-foreground focus:outline-none"
                                />
                            </div>

                            <div className="mt-2 flex items-center justify-end gap-2 border-t pt-3">
                                <button
                                    type="button"
                                    onClick={() => setIsPortfolioModalOpen(false)}
                                    className="rounded-lg border px-3.5 py-1.5 text-xs font-semibold hover:bg-muted"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingPortfolio}
                                    className="rounded-lg bg-[#46797b] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#3a6668] disabled:opacity-50"
                                >
                                    {savingPortfolio ? 'Menyimpan...' : 'Simpan Portofolio'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppShell>
    );
}
