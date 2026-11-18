import * as React from 'react';
import { useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    Briefcase,
    CheckCircle2,
    Eye,
    FolderKanban,
    HardHat,
    Plus,
    Search,
    X,
} from 'lucide-react';
import { AppShell } from '@/Components/dashboard/app-shell';
import {
    ProjectCard,
    type UnifiedProjectCardData,
} from '@/Components/dashboard/project-gallery';
import { PageProps } from '@/types';
import { cn } from '@/lib/utils';

interface ProjectMemberItem {
    id: number;
    name: string;
    photo_url?: string | null;
    role_in_project: string;
    position: string;
}

interface ProjectCardData extends UnifiedProjectCardData {
    id: number;
    client_phone?: string | null;
    drive_url?: string | null;
    description?: string | null;
    status: 'planning' | 'ongoing' | 'review' | 'done' | 'on_hold';
    start_date?: string | null;
    due_date?: string | null;
    due_date_formatted?: string | null;
    total_tasks: number;
    done_tasks: number;
    stages_count: number;
    members: ProjectMemberItem[];
}

interface TeamMemberOption {
    id: number;
    name: string;
    employee_code: string;
    position: string;
    department: string;
    photo_url?: string | null;
}

interface Metrics {
    total_projects: number;
    ongoing_projects: number;
    review_projects: number;
    done_projects: number;
    urgent_projects: number;
}

interface Props extends PageProps {
    projects: ProjectCardData[];
    metrics: Metrics;
    filters: {
        search?: string;
        category?: string;
        status?: string;
        tab?: string;
    };
    categories: string[];
    teamMembers: TeamMemberOption[];
}

const defaultStages = [
    'Konsep',
    'Pra-Rancangan',
    'DED',
    '3D Visualisasi',
    'Konstruksi',
];

const presetImages = [
    { label: 'Rumah Tropis', url: '/project-covers/rumah-tropis.png' },
    { label: 'Kantor Sudirman', url: '/project-covers/kantor-sudirman.png' },
    { label: 'Kopi Senja Interior', url: '/project-covers/interior-kafe.png' },
    { label: 'Villa Lembang', url: '/project-covers/villa-lembang.png' },
];

export default function ProjectIndex({
    auth,
    projects,
    metrics,
    filters,
    categories,
    teamMembers,
}: Props) {
    const { flash } = usePage<PageProps>().props;
    const initialRole = auth.user.role === 'admin' ? 'admin' : 'karyawan';
    const isAdmin = auth.user.role === 'admin';
    const [search, setSearch] = useState(filters.search || '');
    const [selectedCategory, setSelectedCategory] = useState(filters.category || 'all');
    const [selectedStatus, setSelectedStatus] = useState(filters.status || 'all');
    const [activeTab, setActiveTab] = useState(filters.tab || (isAdmin ? 'all' : 'my'));
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const applyFilters = (
        newFilters: Partial<{
            search: string;
            category: string;
            status: string;
            tab: string;
        }>
    ) => {
        router.get(
            route('projects.index'),
            {
                search: newFilters.search !== undefined ? newFilters.search : search,
                category:
                    newFilters.category !== undefined ? newFilters.category : selectedCategory,
                status: newFilters.status !== undefined ? newFilters.status : selectedStatus,
                tab: newFilters.tab !== undefined ? newFilters.tab : activeTab,
            },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters({ search });
    };

    const handleCategoryClick = (cat: string) => {
        const next = selectedCategory === cat ? 'all' : cat;
        setSelectedCategory(next);
        applyFilters({ category: next });
    };

    const handleStatusChange = (val: string) => {
        setSelectedStatus(val);
        applyFilters({ status: val });
    };

    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        applyFilters({ tab });
    };

    // Modal Form State
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        client_name: '',
        client_phone: '',
        location: '',
        category: 'Residensial',
        cover_image_url: '/project-covers/rumah-tropis.png',
        drive_url: '',
        description: '',
        start_date: new Date().toISOString().split('T')[0],
        due_date: '',
        status: 'ongoing',
        lead_id: '',
        member_ids: [] as number[],
        stages: defaultStages,
    });

    const [customStageInput, setCustomStageInput] = useState('');

    const handleAddStage = () => {
        if (!customStageInput.trim()) return;
        setData('stages', [...data.stages, customStageInput.trim()]);
        setCustomStageInput('');
    };

    const handleRemoveStage = (index: number) => {
        setData(
            'stages',
            data.stages.filter((_, i) => i !== index)
        );
    };

    const toggleMember = (memberId: number) => {
        if (data.member_ids.includes(memberId)) {
            setData(
                'member_ids',
                data.member_ids.filter((id) => id !== memberId)
            );
        } else {
            setData('member_ids', [...data.member_ids, memberId]);
        }
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('projects.store'), {
            onSuccess: () => {
                setIsCreateModalOpen(false);
                reset();
            },
        });
    };

    const total = Math.max(1, metrics.total_projects);
    const metricCards = [
        {
            label: 'Total Proyek',
            value: String(metrics.total_projects),
            suffix: 'proyek',
            hint: 'Portofolio studio terdaftar',
            icon: Briefcase,
            ratio: 1,
        },
        {
            label: 'Sedang Berjalan',
            value: String(metrics.ongoing_projects),
            suffix: 'aktif',
            hint: 'Fase desain & gambar kerja',
            icon: HardHat,
            ratio: metrics.ongoing_projects / total,
        },
        {
            label: 'Asistensi / Review',
            value: String(metrics.review_projects),
            suffix: 'proyek',
            hint: 'Menunggu persetujuan klien',
            icon: Eye,
            ratio: metrics.review_projects / total,
        },
        {
            label: 'Proyek Selesai',
            value: String(metrics.done_projects),
            suffix: 'proyek',
            hint: 'Serah terima dokumen tuntas',
            icon: CheckCircle2,
            ratio: metrics.done_projects / total,
        },
        {
            label: 'Deadline Mendesak',
            value: String(metrics.urgent_projects),
            suffix: '≤ 7 hari',
            hint: 'Prioritas penyelesaian minggu ini',
            icon: AlertTriangle,
            ratio: metrics.urgent_projects / total,
            urgent: metrics.urgent_projects > 0,
        },
    ];

    return (
        <AppShell initialRole={initialRole} initialActive="projects">
            <Head title="Project Management" />

            <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
                {/* Page Heading */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="flex flex-col gap-1">
                        <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                            Manajemen Portofolio & Tahapan Desain
                        </p>
                        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                            {isAdmin ? 'Galeri Proyek Studio' : 'Proyek Saya'}{' '}
                            <span className="text-muted-foreground font-normal">
                                ({projects.length} proyek)
                            </span>
                        </h1>
                    </div>

                    {isAdmin && (
                        <button
                            type="button"
                            onClick={() => setIsCreateModalOpen(true)}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors outline-none hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/30"
                        >
                            <Plus className="size-4" aria-hidden="true" />
                            Buat Proyek Baru
                        </button>
                    )}
                </div>

                {/* Flash Messages */}
                {flash?.success && (
                    <div className="flex items-center gap-2.5 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
                        <CheckCircle2 className="size-4 shrink-0" />
                        <span>{flash.success}</span>
                    </div>
                )}
                {flash?.error && (
                    <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        <AlertTriangle className="size-4 shrink-0" />
                        <span>{flash.error}</span>
                    </div>
                )}

                {/* 5 Quick Metric Cards */}
                <section
                    aria-label="Statistik proyek"
                    className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
                >
                    {metricCards.map((m) => {
                        const Icon = m.icon;
                        return (
                            <div
                                key={m.label}
                                className="flex flex-col gap-3 rounded-xl border bg-card p-4"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-xs font-medium text-muted-foreground">
                                        {m.label}
                                    </p>
                                    <Icon
                                        className={cn(
                                            'size-4',
                                            m.urgent ? 'text-primary' : 'text-muted-foreground'
                                        )}
                                        aria-hidden="true"
                                    />
                                </div>
                                <p className="flex items-baseline gap-1">
                                    <span className="text-2xl font-semibold tracking-tight tabular-nums md:text-3xl">
                                        {m.value}
                                    </span>
                                    {m.suffix && (
                                        <span className="text-sm text-muted-foreground">
                                            {m.suffix}
                                        </span>
                                    )}
                                </p>
                                <div
                                    className="h-1 overflow-hidden rounded-full bg-muted"
                                    aria-hidden="true"
                                >
                                    <div
                                        className={cn(
                                            'h-full rounded-full',
                                            m.urgent ? 'bg-primary' : 'bg-foreground/80'
                                        )}
                                        style={{ width: `${Math.min(100, m.ratio * 100)}%` }}
                                    />
                                </div>
                                <p className="text-[11px] text-muted-foreground">{m.hint}</p>
                            </div>
                        );
                    })}
                </section>

                {/* Filter & Search Bar */}
                <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        {/* Tab Switcher: Semua vs Proyek Saya */}
                        <div className="inline-flex rounded-lg border bg-muted/40 p-1">
                            <button
                                type="button"
                                onClick={() => handleTabChange('all')}
                                className={cn(
                                    'rounded-md px-3.5 py-1.5 text-xs font-medium transition',
                                    activeTab === 'all'
                                        ? 'bg-background text-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground'
                                )}
                            >
                                Semua Proyek Studio
                            </button>
                            <button
                                type="button"
                                onClick={() => handleTabChange('my')}
                                className={cn(
                                    'rounded-md px-3.5 py-1.5 text-xs font-medium transition',
                                    activeTab === 'my'
                                        ? 'bg-background text-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground'
                                )}
                            >
                                Proyek Saya
                            </button>
                        </div>

                        {/* Search Input & Status Dropdown */}
                        <div className="flex flex-1 items-center gap-2 sm:max-w-md sm:justify-end">
                            <form onSubmit={handleSearchSubmit} className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Cari nama proyek, klien, atau lokasi..."
                                    className="h-9 w-full rounded-lg border bg-background pl-9 pr-8 text-xs placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                                />
                                {search && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearch('');
                                            applyFilters({ search: '' });
                                        }}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="size-3.5" />
                                    </button>
                                )}
                            </form>

                            <select
                                value={selectedStatus}
                                onChange={(e) => handleStatusChange(e.target.value)}
                                className="h-9 rounded-lg border bg-background px-3 text-xs font-medium text-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                            >
                                <option value="all">Semua Status</option>
                                <option value="ongoing">Sedang Berjalan</option>
                                <option value="review">Asistensi / Review</option>
                                <option value="planning">Perencanaan</option>
                                <option value="done">Selesai</option>
                                <option value="on_hold">Ditunda</option>
                            </select>
                        </div>
                    </div>

                    {/* Category Filter Pills (matching Ringkasan Hari Ini tablist) */}
                    <div
                        role="tablist"
                        aria-label="Filter kategori proyek"
                        className="flex items-center gap-1 overflow-x-auto pt-1"
                    >
                        <button
                            type="button"
                            role="tab"
                            aria-selected={selectedCategory === 'all'}
                            onClick={() => handleCategoryClick('all')}
                            className={cn(
                                'shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                                selectedCategory === 'all'
                                    ? 'border-foreground bg-foreground text-background'
                                    : 'bg-card text-muted-foreground hover:text-foreground'
                            )}
                        >
                            Semua
                        </button>
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                type="button"
                                role="tab"
                                aria-selected={selectedCategory === cat}
                                onClick={() => handleCategoryClick(cat)}
                                className={cn(
                                    'shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                                    selectedCategory === cat
                                        ? 'border-foreground bg-foreground text-background'
                                        : 'bg-card text-muted-foreground hover:text-foreground'
                                )}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Projects Grid — Uses the exact same ProjectCard component as Ringkasan Hari Ini */}
                {projects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 py-16 text-center">
                        <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                            <FolderKanban className="size-6" />
                        </div>
                        <h3 className="mt-3 text-sm font-semibold text-foreground">
                            Tidak ada proyek pada kategori ini
                        </h3>
                        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                            Tidak ditemukan proyek dengan kriteria filter saat ini. Cobalah ubah
                            kata kunci pencarian atau reset filter.
                        </p>
                        <div className="mt-4 flex gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setSearch('');
                                    setSelectedCategory('all');
                                    setSelectedStatus('all');
                                    applyFilters({ search: '', category: 'all', status: 'all' });
                                }}
                                className="rounded-lg border bg-background px-3.5 py-1.5 text-xs font-medium hover:bg-muted"
                            >
                                Reset Filter
                            </button>
                            {isAdmin && (
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(true)}
                                    className="rounded-lg bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                                >
                                    + Buat Proyek Baru
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {projects.map((p) => (
                            <ProjectCard key={p.id} project={p} />
                        ))}
                    </div>
                )}
            </div>

            {/* Modal Buat Proyek Baru (Admin-Only) */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
                    <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border bg-card p-6 shadow-2xl">
                        <div className="flex items-start justify-between border-b pb-4">
                            <div>
                                <h2 className="text-lg font-bold text-foreground">
                                    Buat Proyek Arsitektur Baru
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    Inisialisasi data proyek, folder Drive, penugasan tim, dan
                                    tahapan desain.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsCreateModalOpen(false)}
                                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateSubmit} className="mt-4 flex flex-col gap-4">
                            {/* Section 1: Info Dasar */}
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div className="sm:col-span-2">
                                    <label className="text-xs font-semibold text-foreground">
                                        Nama Proyek <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        placeholder="cth: Villa Sunset Cliff Jimbaran"
                                        className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                                    />
                                    {errors.name && (
                                        <p className="mt-1 text-xs text-rose-500">{errors.name}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-foreground">
                                        Kategori Desain <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        value={data.category}
                                        onChange={(e) => setData('category', e.target.value)}
                                        className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                                    >
                                        {categories.map((c) => (
                                            <option key={c} value={c}>
                                                {c}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-foreground">
                                        Status Awal <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        value={data.status}
                                        onChange={(e) => setData('status', e.target.value)}
                                        className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                                    >
                                        <option value="ongoing">Sedang Berjalan</option>
                                        <option value="planning">Perencanaan</option>
                                        <option value="review">Asistensi / Review</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-foreground">
                                        Nama Klien <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={data.client_name}
                                        onChange={(e) => setData('client_name', e.target.value)}
                                        placeholder="cth: Bpk. Hendra Wijaya"
                                        className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                                    />
                                    {errors.client_name && (
                                        <p className="mt-1 text-xs text-rose-500">
                                            {errors.client_name}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-foreground">
                                        No. WhatsApp / Telepon Klien
                                    </label>
                                    <input
                                        type="text"
                                        value={data.client_phone}
                                        onChange={(e) => setData('client_phone', e.target.value)}
                                        placeholder="cth: 081234567890"
                                        className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="text-xs font-semibold text-foreground">
                                        Lokasi Lahan / Proyek
                                    </label>
                                    <input
                                        type="text"
                                        value={data.location}
                                        onChange={(e) => setData('location', e.target.value)}
                                        placeholder="cth: Bali, Jakarta Selatan, Bandung..."
                                        className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                                    />
                                </div>
                            </div>

                            {/* Section 2: Jadwal & Link Drive */}
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div>
                                    <label className="text-xs font-semibold text-foreground">
                                        Tanggal Mulai
                                    </label>
                                    <input
                                        type="date"
                                        value={data.start_date}
                                        onChange={(e) => setData('start_date', e.target.value)}
                                        className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-foreground">
                                        Target Deadline Serah Terima
                                    </label>
                                    <input
                                        type="date"
                                        value={data.due_date}
                                        onChange={(e) => setData('due_date', e.target.value)}
                                        className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                                    />
                                    {errors.due_date && (
                                        <p className="mt-1 text-xs text-rose-500">
                                            {errors.due_date}
                                        </p>
                                    )}
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="text-xs font-semibold text-foreground">
                                        Link Folder Google Drive (Asset 3D, CAD, Referensi)
                                    </label>
                                    <input
                                        type="url"
                                        value={data.drive_url}
                                        onChange={(e) => setData('drive_url', e.target.value)}
                                        placeholder="https://drive.google.com/drive/folders/..."
                                        className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                                    />
                                    {errors.drive_url && (
                                        <p className="mt-1 text-xs text-rose-500">
                                            {errors.drive_url}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Section 3: Gambar Cover */}
                            <div>
                                <label className="text-xs font-semibold text-foreground">
                                    Gambar Cover / 3D Render
                                </label>
                                <div className="mt-1 flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={data.cover_image_url}
                                        onChange={(e) => setData('cover_image_url', e.target.value)}
                                        placeholder="/project-covers/rumah-tropis.png"
                                        className="h-9 flex-1 rounded-lg border bg-background px-3 text-xs focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                                    />
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                    <span className="text-[11px] text-muted-foreground">
                                        Preset Cover Studio:
                                    </span>
                                    {presetImages.map((p) => (
                                        <button
                                            key={p.url}
                                            type="button"
                                            onClick={() => setData('cover_image_url', p.url)}
                                            className={cn(
                                                'rounded-md border px-2 py-0.5 text-[11px] font-medium transition',
                                                data.cover_image_url === p.url
                                                    ? 'border-primary bg-primary/10 text-primary'
                                                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                                            )}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Section 4: Tim Penugasan */}
                            <div className="rounded-xl border bg-muted/20 p-3.5">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Penugasan Tim Proyek
                                </h3>

                                <div className="mt-2.5">
                                    <label className="text-xs font-semibold text-foreground">
                                        Lead Architect (Penanggung Jawab Utama)
                                    </label>
                                    <select
                                        value={data.lead_id}
                                        onChange={(e) => setData('lead_id', e.target.value)}
                                        className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                                    >
                                        <option value="">Pilih Lead Architect...</option>
                                        {teamMembers.map((m) => (
                                            <option key={m.id} value={m.id}>
                                                {m.name} ({m.position} - {m.employee_code})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="mt-3">
                                    <label className="text-xs font-semibold text-foreground">
                                        Anggota Tim Desain / Drafter
                                    </label>
                                    <div className="mt-1.5 grid max-h-36 grid-cols-1 gap-2 overflow-y-auto rounded-lg border bg-background p-2 sm:grid-cols-2">
                                        {teamMembers.map((m) => {
                                            const isChecked = data.member_ids.includes(m.id);
                                            return (
                                                <label
                                                    key={m.id}
                                                    className={cn(
                                                        'flex items-center gap-2 rounded-md p-1.5 text-xs transition cursor-pointer',
                                                        isChecked
                                                            ? 'bg-primary/10 text-primary font-semibold'
                                                            : 'hover:bg-muted text-foreground'
                                                    )}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => toggleMember(m.id)}
                                                        className="size-3.5 rounded border-muted-foreground/30 text-primary focus:ring-primary"
                                                    />
                                                    <span className="truncate">
                                                        {m.name} ({m.position})
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Section 5: Tahapan Desain Arsitektur */}
                            <div className="rounded-xl border bg-muted/20 p-3.5">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        Tahapan Desain Arsitektur
                                    </h3>
                                    <span className="text-[11px] text-muted-foreground">
                                        {data.stages.length} Tahap
                                    </span>
                                </div>

                                <div className="mt-2 flex flex-col gap-1.5">
                                    {data.stages.map((stage, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between rounded-lg border bg-background px-3 py-1.5 text-xs text-foreground"
                                        >
                                            <span className="font-medium">{stage}</span>
                                            {data.stages.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveStage(idx)}
                                                    className="text-muted-foreground hover:text-rose-500"
                                                >
                                                    <X className="size-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-2.5 flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={customStageInput}
                                        onChange={(e) => setCustomStageInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleAddStage();
                                            }
                                        }}
                                        placeholder="Tambah tahapan kustom..."
                                        className="h-8 flex-1 rounded-lg border bg-background px-3 text-xs placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddStage}
                                        className="h-8 rounded-lg border bg-background px-3 text-xs font-semibold hover:bg-muted"
                                    >
                                        + Tambah
                                    </button>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="mt-2 flex items-center justify-end gap-2 border-t pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="rounded-lg border px-4 py-2 text-xs font-semibold hover:bg-muted"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                                >
                                    {processing ? 'Menyimpan...' : 'Simpan & Buka Kanban'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppShell>
    );
}
