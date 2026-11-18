import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { type PageProps } from '@/types';
import {
    ArrowRight,
    Building2,
    ChevronLeft,
    ChevronRight,
    Compass,
    Eye,
    EyeOff,
    Lock,
    Mail,
    MapPin,
    ShieldCheck,
} from 'lucide-react';
import { FormEventHandler, useEffect, useState } from 'react';

interface PortfolioSlide {
    src: string;
    title: string;
    category: string;
    location: string;
    caption: string;
}

const PORTFOLIO_SLIDES: PortfolioSlide[] = [
    {
        src: '/project-covers/villa-lembang.png',
        title: 'Villa Kayu & Batu Alam Lembang',
        category: 'Residensial & Resort',
        location: 'Bandung Barat, Jawa Barat',
        caption:
            'Harmoni arsitektur tropis modern dengan bukaan alami dan material lokal.',
    },
    {
        src: '/project-covers/rumah-tropis.png',
        title: 'Rumah Tropis Kontemporer',
        category: 'Hunian Privat',
        location: 'Jakarta Selatan',
        caption:
            'Sirkulasi silang optimal dengan tata cahaya alami sepanjang hari.',
    },
    {
        src: '/project-covers/kantor-sudirman.png',
        title: 'Gedung Kantor & Ruang Komersial',
        category: 'Komersial & Perkantoran',
        location: 'SCBD Sudirman, Jakarta',
        caption:
            'Fasad kaca berlapis kisi aluminium untuk efisiensi energi maksimal.',
    },
    {
        src: '/project-covers/interior-kafe.png',
        title: 'Interior Kafe & Ruang Kolaborasi',
        category: 'Desain Interior',
        location: 'Kemang, Jakarta Selatan',
        caption:
            'Nuansa hangat kayu alami berpadu pencahayaan ambient yang intim.',
    },
];

const STUDIO_DIVISIONS = [
    'Perencanaan',
    'Pembangunan',
    'Administrasi',
    'Digital Marketing',
];

export default function Login({
    status,
    canResetPassword,
}: {
    status?: string;
    canResetPassword: boolean;
}) {
    const { studio } = usePage<PageProps>().props;
    const companyLogo = studio?.logo_url || '/rim-projects-logo.png';
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false as boolean,
    });

    const [activeSlide, setActiveSlide] = useState(0);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        const timer = window.setInterval(() => {
            setActiveSlide((prev) => (prev + 1) % PORTFOLIO_SLIDES.length);
        }, 4500);
        return () => window.clearInterval(timer);
    }, []);

    const goPrev = () => {
        setActiveSlide(
            (prev) =>
                (prev - 1 + PORTFOLIO_SLIDES.length) % PORTFOLIO_SLIDES.length,
        );
    };

    const goNext = () => {
        setActiveSlide((prev) => (prev + 1) % PORTFOLIO_SLIDES.length);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    const currentSlide = PORTFOLIO_SLIDES[activeSlide];

    return (
        <>
            <Head title="Masuk" />

            <div className="min-h-dvh bg-background text-foreground md:p-4 lg:p-6">
                <div className="mx-auto grid min-h-dvh max-w-[1560px] grid-cols-1 md:min-h-[calc(100dvh-2rem)] md:grid-cols-12 md:gap-4 lg:min-h-[calc(100dvh-3rem)] lg:gap-6">
                    {/* Showcase Portfolio Slider */}
                    <div className="relative md:col-span-6 lg:col-span-7">
                        <div className="relative h-64 w-full overflow-hidden bg-stone-900 sm:h-80 md:h-full md:min-h-[600px] md:rounded-3xl md:border md:border-border/60 md:shadow-lg">
                            {PORTFOLIO_SLIDES.map((slide, index) => (
                                <img
                                    key={slide.src}
                                    src={slide.src}
                                    alt={slide.title}
                                    className={`absolute inset-0 h-full w-full object-cover transition-all duration-1000 ease-out ${index === activeSlide
                                        ? 'scale-100 opacity-100'
                                        : 'scale-105 opacity-0'
                                        }`}
                                />
                            ))}

                            {/* Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/35 to-stone-950/25" />

                            {/* Top Badge + Controls */}
                            <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4 sm:p-6">
                                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-stone-950/45 px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur-md">
                                    <Building2 className="h-3.5 w-3.5 text-amber-300" />
                                    <span>Portofolio Desain Studio RIM</span>
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={goPrev}
                                        aria-label="Slide sebelumnya"
                                        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-stone-950/40 text-white backdrop-blur-md transition hover:bg-stone-950/70"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={goNext}
                                        aria-label="Slide berikutnya"
                                        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-stone-950/40 text-white backdrop-blur-md transition hover:bg-stone-950/70"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Bottom Caption & Slide Indicators */}
                            <div className="absolute inset-x-0 bottom-0 p-5 pb-10 sm:p-7 md:pb-8 lg:p-9">
                                <div className="max-w-xl">
                                    <span className="inline-block rounded-full bg-primary/90 px-3 py-0.5 text-[11px] font-semibold tracking-wide text-primary-foreground">
                                        {currentSlide.category}
                                    </span>
                                    <h2 className="mt-2.5 text-xl font-bold tracking-tight text-white sm:text-2xl lg:text-3xl">
                                        {currentSlide.title}
                                    </h2>
                                    <p className="mt-1.5 hidden text-sm leading-relaxed text-stone-200 sm:block">
                                        {currentSlide.caption}
                                    </p>
                                    <div className="mt-2.5 flex items-center gap-1.5 text-xs text-stone-300">
                                        <MapPin className="h-3.5 w-3.5 text-amber-300" />
                                        <span>{currentSlide.location}</span>
                                    </div>
                                </div>

                                {/* Progress Dots */}
                                <div className="mt-4 flex items-center gap-2">
                                    {PORTFOLIO_SLIDES.map((slide, idx) => (
                                        <button
                                            key={slide.src}
                                            type="button"
                                            onClick={() => setActiveSlide(idx)}
                                            aria-label={`Pilih slide ${idx + 1}`}
                                            className={`h-1.5 rounded-full transition-all duration-300 ${idx === activeSlide
                                                ? 'w-9 bg-white'
                                                : 'w-2 bg-white/40 hover:bg-white/70'
                                                }`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Form Login Panel: Full-Height Sejajar Banner di iPad & Desktop, Sheet Elevated di Mobile */}
                    <div className="relative z-10 -mt-5 flex flex-col justify-between rounded-t-3xl border-t border-border bg-card px-5 pt-7 pb-8 shadow-xl md:col-span-6 md:mt-0 md:h-full md:rounded-3xl md:border md:px-8 md:py-8 md:shadow-lg lg:col-span-5 lg:px-11 lg:py-10">
                        {/* Top Studio Header */}
                        <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-5">
                            <div className="flex items-center gap-3.5">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-background p-1.5 shadow-2xs sm:h-13 sm:w-13">
                                    <img
                                        src={companyLogo}
                                        alt="Logo RIM Studio Arsitektur"
                                        className="h-full w-full object-contain"
                                    />
                                </div>
                                <div>
                                    <h1 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                                        RIM Studio Arsitektur
                                    </h1>
                                    <p className="text-xs text-muted-foreground">
                                        Workspace Terpadu Proyek, Presensi &
                                        Payroll
                                    </p>
                                </div>
                            </div>
                            <span className="hidden items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-foreground sm:inline-flex">
                                <Compass className="h-3.5 w-3.5 text-primary" />
                                Studio Hub
                            </span>
                        </div>

                        {/* Middle Main Form */}
                        <div className="my-auto py-6 md:py-8">
                            <div className="mb-6">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                    Akses Tim Internal
                                </span>
                                <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-[26px]">
                                    Selamat Datang Kembali
                                </h2>
                                <p className="mt-1.5 text-sm text-muted-foreground">
                                    Masuk dengan akun email studio untuk
                                    mengakses ringkasan proyek, absensi GPS, dan
                                    profil Anda.
                                </p>
                            </div>

                            {status && (
                                <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800">
                                    {status}
                                </div>
                            )}

                            <form onSubmit={submit} className="space-y-5">
                                <div>
                                    <label
                                        htmlFor="email"
                                        className="mb-2 block text-xs font-semibold tracking-wide text-foreground uppercase"
                                    >
                                        Email Studio
                                    </label>
                                    <div className="relative">
                                        <Mail className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <input
                                            id="email"
                                            type="email"
                                            name="email"
                                            value={data.email}
                                            autoComplete="username"
                                            autoFocus
                                            required
                                            placeholder="nama@rimstudio.com"
                                            onChange={(e) =>
                                                setData('email', e.target.value)
                                            }
                                            className="h-12 w-full rounded-xl border border-input bg-background pr-4 pl-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                        />
                                    </div>
                                    <InputError
                                        message={errors.email}
                                        className="mt-1.5"
                                    />
                                </div>

                                <div>
                                    <div className="mb-2 flex items-center justify-between">
                                        <label
                                            htmlFor="password"
                                            className="block text-xs font-semibold tracking-wide text-foreground uppercase"
                                        >
                                            Kata Sandi
                                        </label>
                                        {canResetPassword && (
                                            <Link
                                                href={route('password.request')}
                                                className="text-xs font-medium text-primary hover:underline"
                                            >
                                                Lupa kata sandi?
                                            </Link>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <Lock className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <input
                                            id="password"
                                            type={
                                                showPassword
                                                    ? 'text'
                                                    : 'password'
                                            }
                                            name="password"
                                            value={data.password}
                                            autoComplete="current-password"
                                            required
                                            placeholder="Masukkan kata sandi Anda"
                                            onChange={(e) =>
                                                setData(
                                                    'password',
                                                    e.target.value,
                                                )
                                            }
                                            className="h-12 w-full rounded-xl border border-input bg-background pr-11 pl-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowPassword((prev) => !prev)
                                            }
                                            aria-label={
                                                showPassword
                                                    ? 'Sembunyikan kata sandi'
                                                    : 'Lihat kata sandi'
                                            }
                                            className="absolute top-1/2 right-3.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                            {showPassword ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </button>
                                    </div>
                                    <InputError
                                        message={errors.password}
                                        className="mt-1.5"
                                    />
                                </div>

                                <div className="flex items-center justify-between pt-0.5">
                                    <label className="flex cursor-pointer items-center gap-2.5">
                                        <Checkbox
                                            name="remember"
                                            checked={data.remember}
                                            onChange={(e) =>
                                                setData(
                                                    'remember',
                                                    (e.target.checked ||
                                                        false) as false,
                                                )
                                            }
                                        />
                                        <span className="text-xs font-medium text-muted-foreground">
                                            Ingat sesi saya di perangkat ini
                                        </span>
                                    </label>
                                </div>

                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none disabled:opacity-50"
                                >
                                    <span>
                                        {processing
                                            ? 'Memproses...'
                                            : 'Masuk ke Dashboard'}
                                    </span>
                                    {!processing && (
                                        <ArrowRight className="h-4 w-4" />
                                    )}
                                </button>
                            </form>
                        </div>

                        {/* Bottom Divisions & Copyright */}
                        <div className="border-t border-border/70 pt-4">
                            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:justify-start">
                                {STUDIO_DIVISIONS.map((div) => (
                                    <span
                                        key={div}
                                        className="rounded-lg border border-border/80 bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                                    >
                                        {div}
                                    </span>
                                ))}
                            </div>
                            <p className="mt-3 text-center text-[11px] text-muted-foreground sm:text-left">
                                © {new Date().getFullYear()} RIM Project
                                · Sistem Internal Manajemen Studio
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
