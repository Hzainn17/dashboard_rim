import * as React from 'react';
import { useMemo, useState } from 'react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    ArrowUpRight,
    Building2,
    Calendar,
    Camera,
    CheckCircle2,
    ExternalLink,
    HardHat,
    ImagePlus,
    MapPin,
    Navigation,
    Plus,
    Search,
    ShieldCheck,
    Users,
    X,
} from 'lucide-react';
import { AppShell } from '@/Components/dashboard/app-shell';
import { MemberAvatar } from '@/Components/dashboard/member-avatar';
import { isAdminRole } from '@/lib/studio-data';
import { prepareWebImage } from '@/lib/image-upload';
import { cn } from '@/lib/utils';
import { PageProps } from '@/types';

interface FieldProjectMember {
    id: number;
    name: string;
    photo_url?: string | null;
    role_in_project: string;
}

interface FieldProjectItem {
    id: number;
    name: string;
    client_name: string;
    client_phone?: string | null;
    location?: string | null;
    maps_url?: string | null;
    google_maps_url?: string | null;
    project_type: 'pembangunan' | 'desain_bangun';
    status: 'planning' | 'ongoing' | 'review' | 'retention' | 'done_unpaid' | 'done' | 'on_hold' | string;
    cover_image_url?: string | null;
    description?: string | null;
    start_date?: string | null;
    due_date?: string | null;
    due_date_formatted?: string | null;
    site_visit_count: number;
    members: FieldProjectMember[];
}

interface TeamMemberOption {
    id: number;
    name: string;
    position: string;
    work_type: 'lapangan' | 'kantor';
}

interface Props extends PageProps {
    section: 'field';
    projects: FieldProjectItem[];
    metrics: {
        active_projects: number;
        retention_projects: number;
        today_site_visits: number;
        done_projects: number;
        unpaid_projects?: number;
    };
    teamMembers: TeamMemberOption[];
    filters: {
        search: string;
        status: string;
    };
}

const STATUS_META: Record<
    string,
    { label: string; badgeClass: string }
> = {
    planning: {
        label: 'Persiapan Lapangan',
        badgeClass: 'bg-sky-50 text-sky-700 ring-sky-200',
    },
    ongoing: {
        label: 'Sedang Berjalan',
        badgeClass: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    },
    review: {
        label: 'Inspeksi / BAST 1',
        badgeClass: 'bg-amber-50 text-amber-800 ring-amber-200',
    },
    retention: {
        label: 'Masa Retensi',
        badgeClass: 'bg-purple-50 text-purple-700 ring-purple-200',
    },
    done_unpaid: {
        label: 'Selesai · Menunggu Pelunasan',
        badgeClass: 'bg-orange-50 text-orange-800 ring-orange-200',
    },
    done: {
        label: 'Selesai (Lunas)',
        badgeClass: 'bg-slate-100 text-slate-700 ring-slate-200',
    },
    on_hold: {
        label: 'Ditunda',
        badgeClass: 'bg-rose-50 text-rose-700 ring-rose-200',
    },
};

export default function FieldProjectsIndex({
    projects,
    metrics,
    teamMembers,
    filters,
}: Props) {
    const { auth } = usePage<PageProps>().props;
    const isAdmin = isAdminRole(auth?.user?.role);

    const [search, setSearch] = useState(filters.search || '');
    const [selectedStatus, setSelectedStatus] = useState(filters.status || 'all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [coverPreview, setCoverPreview] = useState<string | null>(null);

    const defaultFieldMemberIds = useMemo(
        () =>
            teamMembers
                .filter((m) => m.work_type === 'lapangan')
                .map((m) => m.id),
        [teamMembers],
    );

    const form = useForm({
        name: '',
        client_name: '',
        client_phone: '',
        location: '',
        maps_url: '',
        project_type: 'pembangunan' as 'pembangunan' | 'desain_bangun',
        status: 'ongoing' as 'planning' | 'ongoing' | 'review' | 'retention' | 'done_unpaid' | 'done' | 'on_hold',
        start_date: new Date().toISOString().split('T')[0],
        due_date: '',
        description: '',
        cover_image: null as File | null,
        member_ids: defaultFieldMemberIds,
    });

    const openCreateModal = () => {
        form.reset();
        form.clearErrors();
        form.setData('member_ids', defaultFieldMemberIds);
        setCoverPreview(null);
        setShowCreateModal(true);
    };

    const applyFilters = (next: { search?: string; status?: string }) => {
        router.get(
            route('projects.field'),
            {
                search: next.search !== undefined ? next.search : search,
                status: next.status !== undefined ? next.status : selectedStatus,
            },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters({ search });
    };

    const handleStatusFilter = (statusVal: string) => {
        setSelectedStatus(statusVal);
        applyFilters({ status: statusVal });
    };

    const toggleMember = (id: number) => {
        const exists = form.data.member_ids.includes(id);
        form.setData(
            'member_ids',
            exists
                ? form.data.member_ids.filter((mid) => mid !== id)
                : [...form.data.member_ids, id],
        );
    };

    const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.files?.[0];
        if (!raw) {
            return;
        }
        const { file: optimized } = await prepareWebImage(raw);
        form.setData('cover_image', optimized);
        setCoverPreview(URL.createObjectURL(optimized));
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(route('projects.field.store'), {
            forceFormData: true,
            onSuccess: () => {
                setShowCreateModal(false);
                setCoverPreview(null);
                form.reset();
            },
        });
    };

    return (
        <AppShell initialActive="field-projects">
            <Head title="Proyek Lapangan" />

            <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex flex-col gap-4 rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/90 via-white to-orange-50/50 p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between sm:p-6">
                    <div className="space-y-1.5">
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100/90 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900 ring-1 ring-amber-300/70">
                            <HardHat className="size-3.5" />
                            Lokasi Pembangunan & Site Visit
                        </div>
                        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                            Proyek Lapangan
                        </h1>
                        <p className="max-w-2xl text-xs text-slate-600 sm:text-sm">
                            Daftar lokasi proyek konstruksi & pemeliharaan (retensi) terpisah dari Perencanaan, agar tim lapangan dapat memilih lokasi saat{' '}
                            <span className="font-medium text-slate-800">Absen Site Visit</span>.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <Link
                            href={route('attendance.index')}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 sm:text-sm"
                        >
                            <Navigation className="size-4 text-amber-600" />
                            Buka Absen Site Visit
                        </Link>
                        {isAdmin && (
                            <button
                                type="button"
                                onClick={openCreateModal}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-amber-700 sm:text-sm"
                            >
                                <Plus className="size-4" />
                                Tambah Proyek Lapangan
                            </button>
                        )}
                    </div>
                </div>

                {/* Summary Metrics */}
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="flex items-center justify-between rounded-xl border bg-card p-4 shadow-2xs">
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">
                                Proyek Berjalan
                            </p>
                            <p className="mt-1 text-2xl font-bold tracking-tight text-foreground tabular-nums">
                                {metrics.active_projects}
                            </p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                                Konstruksi fisik aktif
                            </p>
                        </div>
                        <div className="flex size-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                            <HardHat className="size-5" />
                        </div>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border bg-card p-4 shadow-2xs">
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">
                                Masa Retensi
                            </p>
                            <p className="mt-1 text-2xl font-bold tracking-tight text-foreground tabular-nums">
                                {metrics.retention_projects}
                            </p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                                Masa pemeliharaan pasca-bangun
                            </p>
                        </div>
                        <div className="flex size-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                            <ShieldCheck className="size-5" />
                        </div>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border bg-card p-4 shadow-2xs">
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">
                                Site Visit Hari Ini
                            </p>
                            <p className="mt-1 text-2xl font-bold tracking-tight text-foreground tabular-nums">
                                {metrics.today_site_visits}
                            </p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                                Kunjungan tim lapangan hari ini
                            </p>
                        </div>
                        <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                            <Camera className="size-5" />
                        </div>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border bg-card p-4 shadow-2xs">
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">
                                Proyek Selesai
                            </p>
                            <p className="mt-1 text-2xl font-bold tracking-tight text-foreground tabular-nums">
                                {metrics.done_projects}
                            </p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                                {metrics.unpaid_projects && metrics.unpaid_projects > 0
                                    ? `${metrics.unpaid_projects} masih menunggu pelunasan`
                                    : 'Serah terima akhir tuntas'}
                            </p>
                        </div>
                        <div className="flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                            <CheckCircle2 className="size-5" />
                        </div>
                    </div>
                </div>

                {/* Search & Status Filter */}
                <div className="flex flex-col gap-3 rounded-xl border bg-card p-3.5 shadow-2xs lg:flex-row lg:items-center lg:justify-between">
                    <form onSubmit={handleSearchSubmit} className="relative flex-1 lg:max-w-sm">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Cari nama proyek, klien, atau lokasi..."
                            className="w-full rounded-lg border border-input bg-background py-1.5 pr-8 pl-9 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearch('');
                                    applyFilters({ search: '' });
                                }}
                                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                <X className="size-3.5" />
                            </button>
                        )}
                    </form>

                    <div className="flex flex-wrap items-center gap-1.5">
                        {[
                            { id: 'all', label: 'Semua' },
                            { id: 'ongoing', label: 'Sedang Berjalan' },
                            { id: 'planning', label: 'Persiapan' },
                            { id: 'review', label: 'Inspeksi / BAST' },
                            { id: 'retention', label: 'Masa Retensi' },
                            { id: 'done_unpaid', label: 'Menunggu Pelunasan' },
                            { id: 'on_hold', label: 'Ditunda' },
                            { id: 'done', label: 'Selesai (Lunas)' },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => handleStatusFilter(tab.id)}
                                className={cn(
                                    'rounded-lg px-3 py-1.5 text-xs font-medium transition',
                                    selectedStatus === tab.id
                                        ? 'bg-amber-600 text-white shadow-2xs'
                                        : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground',
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Project Grid */}
                {projects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card px-6 py-14 text-center">
                        <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                            <HardHat className="size-6" />
                        </div>
                        <h2 className="mt-3 text-base font-semibold text-foreground">
                            Belum ada proyek lapangan
                        </h2>
                        <p className="mt-1 max-w-md text-xs text-muted-foreground sm:text-sm">
                            {isAdmin
                                ? 'Tambahkan proyek pembangunan atau desain & bangun agar tim lapangan dapat memilih lokasi saat Check-in Site Visit.'
                                : 'Belum ada lokasi proyek lapangan aktif yang ditugaskan kepada Anda.'}
                        </p>
                        {isAdmin && (
                            <button
                                type="button"
                                onClick={openCreateModal}
                                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-amber-700"
                            >
                                <Plus className="size-4" />
                                Tambah Proyek Lapangan Pertama
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {projects.map((project) => {
                            const statusInfo = STATUS_META[project.status] ?? {
                                label: project.status,
                                badgeClass: 'bg-slate-100 text-slate-700 ring-slate-200',
                            };

                            return (
                                <Link
                                    key={project.id}
                                    href={route('projects.field.show', project.id)}
                                    className="group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-2xs transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md"
                                >
                                    {/* Cover / Banner */}
                                    <div className="relative h-32 w-full overflow-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-amber-950">
                                        {project.cover_image_url ? (
                                            <img
                                                src={project.cover_image_url}
                                                alt={project.name}
                                                className="h-full w-full object-cover opacity-90 transition duration-300 group-hover:scale-105"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-between px-5">
                                                <HardHat className="size-10 text-amber-400/30" />
                                                <Building2 className="size-16 text-white/5" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />

                                        <div className="absolute top-3 right-3 left-3 flex items-center justify-between gap-2">
                                            <span className="inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-0.5 text-[11px] font-medium text-amber-200 backdrop-blur-xs">
                                                <HardHat className="size-3" />
                                                {project.project_type === 'desain_bangun'
                                                    ? 'Desain & Bangun'
                                                    : 'Pembangunan Fisik'}
                                            </span>
                                            <span
                                                className={cn(
                                                    'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1',
                                                    statusInfo.badgeClass,
                                                )}
                                            >
                                                {statusInfo.label}
                                            </span>
                                        </div>

                                        <div className="absolute right-3 bottom-2.5 left-3">
                                            <h2 className="truncate text-base font-bold text-white">
                                                {project.name}
                                            </h2>
                                            <p className="truncate text-xs text-slate-200">
                                                Klien: {project.client_name}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Card Body */}
                                    <div className="flex flex-1 flex-col justify-between gap-3.5 p-4">
                                        <div className="space-y-2.5">
                                            <div className="flex items-start justify-between gap-2 rounded-xl bg-amber-50/70 px-3 py-2.5 text-xs text-amber-950 ring-1 ring-amber-200/60">
                                                <div className="flex min-w-0 items-start gap-2">
                                                    <MapPin className="mt-0.5 size-3.5 shrink-0 text-amber-700" />
                                                    <span className="line-clamp-2 font-medium leading-snug">
                                                        {project.location || 'Lokasi belum diisi'}
                                                    </span>
                                                </div>
                                                {project.google_maps_url && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            window.open(
                                                                project.google_maps_url || '',
                                                                '_blank',
                                                                'noopener,noreferrer',
                                                            );
                                                        }}
                                                        title="Buka di Google Maps"
                                                        className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white px-2 py-1 text-[10px] font-semibold text-amber-800 shadow-2xs ring-1 ring-amber-300/80 transition hover:bg-amber-100"
                                                    >
                                                        Maps
                                                        <ExternalLink className="size-2.5" />
                                                    </button>
                                                )}
                                            </div>

                                            {project.description && (
                                                <p className="line-clamp-2 text-xs text-muted-foreground">
                                                    {project.description}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between border-t pt-3">
                                            <div className="flex items-center gap-2">
                                                {project.members.length > 0 ? (
                                                    <div className="flex -space-x-1.5">
                                                        {project.members.slice(0, 4).map((m) => (
                                                            <MemberAvatar
                                                                key={m.id}
                                                                id={m.id}
                                                                name={m.name}
                                                                photoUrl={m.photo_url}
                                                                className="size-6 text-[10px] ring-2 ring-card"
                                                            />
                                                        ))}
                                                        {project.members.length > 4 && (
                                                            <span className="inline-flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground ring-2 ring-card">
                                                                +{project.members.length - 4}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                                        <Users className="size-3.5" />
                                                        Semua Tim Lapangan
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {project.due_date_formatted && (
                                                    <span className="hidden items-center gap-1 text-[11px] text-muted-foreground sm:inline-flex">
                                                        <Calendar className="size-3" />
                                                        {project.due_date_formatted}
                                                    </span>
                                                )}
                                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                                                    <Camera className="size-3 text-amber-600" />
                                                    {project.site_visit_count} Visit
                                                </span>
                                                <ArrowUpRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-amber-600" />
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal Tambah Proyek Lapangan */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
                    <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border bg-card shadow-xl">
                        <div className="flex items-center justify-between border-b px-5 py-4">
                            <div className="flex items-center gap-2.5">
                                <div className="flex size-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                                    <HardHat className="size-4" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-foreground">
                                        Tambah Proyek Lapangan
                                    </h2>
                                    <p className="text-xs text-muted-foreground">
                                        Khusus menu Proyek Lapangan & pilihan Absen Site Visit
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(false)}
                                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                                <X className="size-4" />
                            </button>
                        </div>

                        <form
                            onSubmit={handleCreateSubmit}
                            className="flex-1 space-y-4 overflow-y-auto px-5 py-4"
                        >
                            <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-2.5 text-xs text-amber-900">
                                Proyek yang ditambahkan di sini <span className="font-semibold">tidak akan mencampuri daftar Proyek Perencanaan</span>, dan otomatis muncul di dropdown lokasi saat karyawan melakukan{' '}
                                <span className="font-semibold">Check-in Site Visit</span>.
                            </div>

                            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                                <div className="sm:col-span-2">
                                    <label className="mb-1 block text-xs font-semibold text-foreground">
                                        Nama Proyek Lapangan <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={form.data.name}
                                        onChange={(e) => form.setData('name', e.target.value)}
                                        placeholder="Contoh: Pembangunan Rumah Bpk. Hendra"
                                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                                    />
                                    {form.errors.name && (
                                        <p className="mt-1 text-xs text-rose-600">{form.errors.name}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-foreground">
                                        Nama Klien / Owner <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={form.data.client_name}
                                        onChange={(e) => form.setData('client_name', e.target.value)}
                                        placeholder="Contoh: Bpk. Hendra"
                                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                                    />
                                    {form.errors.client_name && (
                                        <p className="mt-1 text-xs text-rose-600">{form.errors.client_name}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-foreground">
                                        No. WhatsApp Klien
                                    </label>
                                    <input
                                        type="text"
                                        value={form.data.client_phone}
                                        onChange={(e) => form.setData('client_phone', e.target.value)}
                                        placeholder="0812..."
                                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="mb-1 block text-xs font-semibold text-foreground">
                                        Alamat / Lokasi Proyek <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={form.data.location}
                                        onChange={(e) => form.setData('location', e.target.value)}
                                        placeholder="Contoh: Bumi Adipura, Cluster Cempaka, Jl. Cempaka XI No. 21, Gedebage"
                                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                                    />
                                    {form.errors.location && (
                                        <p className="mt-1 text-xs text-rose-600">{form.errors.location}</p>
                                    )}
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="mb-1 block text-xs font-semibold text-foreground">
                                        Link Titik Google Maps (Opsional)
                                    </label>
                                    <input
                                        type="url"
                                        value={form.data.maps_url}
                                        onChange={(e) => form.setData('maps_url', e.target.value)}
                                        placeholder="https://maps.app.goo.gl/..."
                                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                                    />
                                    <p className="mt-1 text-[11px] text-muted-foreground">
                                        Tempel link Share Google Maps agar tampil sebagai tombol peta rapi (bukan teks URL panjang).
                                    </p>
                                    {form.errors.maps_url && (
                                        <p className="mt-1 text-xs text-rose-600">{form.errors.maps_url}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-foreground">
                                        Lingkup Pekerjaan
                                    </label>
                                    <select
                                        value={form.data.project_type}
                                        onChange={(e) =>
                                            form.setData(
                                                'project_type',
                                                e.target.value as 'pembangunan' | 'desain_bangun',
                                            )
                                        }
                                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                                    >
                                        <option value="pembangunan">Pembangunan Fisik Saja</option>
                                        <option value="desain_bangun">Desain & Bangun</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-foreground">
                                        Tahapan Status Lapangan
                                    </label>
                                    <select
                                        value={form.data.status}
                                        onChange={(e) =>
                                            form.setData(
                                                'status',
                                                e.target.value as
                                                    | 'planning'
                                                    | 'ongoing'
                                                    | 'review'
                                                    | 'retention'
                                                    | 'done_unpaid'
                                                    | 'done'
                                                    | 'on_hold',
                                            )
                                        }
                                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                                    >
                                        <option value="planning">Persiapan Lapangan</option>
                                        <option value="ongoing">Sedang Berjalan (Konstruksi)</option>
                                        <option value="review">Inspeksi / BAST 1</option>
                                        <option value="retention">Masa Retensi (Pemeliharaan)</option>
                                        <option value="done_unpaid">Selesai (Menunggu Pelunasan / Cicilan)</option>
                                        <option value="on_hold">Ditunda Sementara</option>
                                        <option value="done">Selesai (Lunas)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-foreground">
                                        Tanggal Mulai
                                    </label>
                                    <input
                                        type="date"
                                        value={form.data.start_date}
                                        onChange={(e) => form.setData('start_date', e.target.value)}
                                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-foreground">
                                        Target Selesai (Opsional)
                                    </label>
                                    <input
                                        type="date"
                                        value={form.data.due_date}
                                        onChange={(e) => form.setData('due_date', e.target.value)}
                                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <div className="mb-1.5 flex items-center justify-between">
                                        <label className="text-xs font-semibold text-foreground">
                                            Tim Lapangan / Pengawas yang Ditugaskan
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => form.setData('member_ids', defaultFieldMemberIds)}
                                            className="text-[11px] font-medium text-amber-700 hover:underline"
                                        >
                                            Pilih Semua Tim Lapangan
                                        </button>
                                    </div>
                                    <div className="max-h-36 space-y-1 overflow-y-auto rounded-lg border bg-muted/20 p-2">
                                        {teamMembers.map((member) => {
                                            const checked = form.data.member_ids.includes(member.id);
                                            return (
                                                <label
                                                    key={member.id}
                                                    className={cn(
                                                        'flex cursor-pointer items-center justify-between rounded-md px-2.5 py-1.5 text-xs transition',
                                                        checked
                                                            ? 'bg-amber-50 text-amber-950 ring-1 ring-amber-200'
                                                            : 'hover:bg-muted',
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            onChange={() => toggleMember(member.id)}
                                                            className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                                                        />
                                                        <span className="font-medium">{member.name}</span>
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

                                <div className="sm:col-span-2">
                                    <label className="mb-1 block text-xs font-semibold text-foreground">
                                        Catatan Singkat (Opsional)
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={form.data.description}
                                        onChange={(e) => form.setData('description', e.target.value)}
                                        placeholder="Catatan lingkup pekerjaan fisik, patokan lokasi, masa garansi retensi, dll..."
                                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="mb-1 block text-xs font-semibold text-foreground">
                                        Foto Lokasi / Sampul (Opsional)
                                    </label>
                                    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed p-3 text-xs text-muted-foreground transition hover:border-amber-400 hover:bg-amber-50/30">
                                        {coverPreview ? (
                                            <img
                                                src={coverPreview}
                                                alt="Preview"
                                                className="size-12 rounded-md object-cover"
                                            />
                                        ) : (
                                            <div className="flex size-10 items-center justify-center rounded-md bg-muted">
                                                <ImagePlus className="size-4" />
                                            </div>
                                        )}
                                        <span className="flex-1">
                                            {form.data.cover_image
                                                ? form.data.cover_image.name
                                                : 'Klik untuk unggah foto lokasi proyek'}
                                        </span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleCoverChange}
                                            className="hidden"
                                        />
                                    </label>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 border-t pt-3">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="rounded-lg border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={form.processing}
                                    className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-amber-700 disabled:opacity-50"
                                >
                                    {form.processing ? 'Menyimpan...' : 'Simpan Proyek Lapangan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppShell>
    );
}
