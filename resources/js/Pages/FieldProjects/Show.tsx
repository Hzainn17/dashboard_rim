import * as React from 'react';
import { useState } from 'react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    Calendar,
    Camera,
    Clock,
    Edit3,
    ExternalLink,
    HardHat,
    MapPin,
    MessageSquarePlus,
    Navigation,
    Phone,
    Send,
    Trash2,
    Users,
    X,
} from 'lucide-react';
import { AppShell } from '@/Components/dashboard/app-shell';
import { MemberAvatar } from '@/Components/dashboard/member-avatar';
import { isAdminRole } from '@/lib/studio-data';
import { cn } from '@/lib/utils';
import { PageProps } from '@/types';

interface MemberItem {
    id: number;
    name: string;
    photo_url?: string | null;
    position: string;
    role_in_project: string;
}

interface SiteVisitItem {
    id: number;
    date: string;
    user_name: string;
    position: string;
    check_in_time?: string | null;
    check_out_time?: string | null;
    photo_url?: string | null;
    site_visit_status?: 'none' | 'pending' | 'approved' | 'rejected' | string | null;
    notes?: string | null;
}

interface UpdateItem {
    id: number;
    content: string;
    author_name: string;
    created_at?: string | null;
}

interface TeamMemberOption {
    id: number;
    name: string;
    position: string;
    work_type: 'lapangan' | 'kantor';
}

interface Props extends PageProps {
    project: {
        id: number;
        name: string;
        client_name: string;
        client_phone?: string | null;
        location?: string | null;
        maps_url?: string | null;
        google_maps_url?: string | null;
        embed_maps_url?: string | null;
        project_type: 'pembangunan' | 'desain_bangun';
        status: 'planning' | 'ongoing' | 'review' | 'retention' | 'done' | 'on_hold' | string;
        start_date?: string | null;
        start_date_formatted?: string | null;
        due_date?: string | null;
        due_date_formatted?: string | null;
        description?: string | null;
        member_ids: number[];
        members: MemberItem[];
    };
    siteVisits: SiteVisitItem[];
    updates: UpdateItem[];
    teamMembers: TeamMemberOption[];
}

const STATUS_META: Record<string, { label: string; badgeClass: string }> = {
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
        label: 'Masa Retensi (Pemeliharaan)',
        badgeClass: 'bg-purple-50 text-purple-700 ring-purple-200',
    },
    done: {
        label: 'Selesai',
        badgeClass: 'bg-slate-100 text-slate-700 ring-slate-200',
    },
    on_hold: {
        label: 'Ditunda',
        badgeClass: 'bg-rose-50 text-rose-700 ring-rose-200',
    },
};

export default function FieldProjectsShow({
    project,
    siteVisits,
    updates,
    teamMembers,
}: Props) {
    const { auth } = usePage<PageProps>().props;
    const isAdmin = isAdminRole(auth?.user?.role);

    const [showEditModal, setShowEditModal] = useState(false);
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

    const editForm = useForm({
        name: project.name,
        client_name: project.client_name,
        client_phone: project.client_phone || '',
        location: project.location || '',
        maps_url: project.maps_url || '',
        project_type: project.project_type,
        status: (['planning', 'ongoing', 'review', 'retention', 'done', 'on_hold'].includes(
            project.status,
        )
            ? project.status
            : 'ongoing') as
            | 'planning'
            | 'ongoing'
            | 'review'
            | 'retention'
            | 'done'
            | 'on_hold',
        start_date: project.start_date || '',
        due_date: project.due_date || '',
        description: project.description || '',
        member_ids: project.member_ids || [],
    });

    const noteForm = useForm({
        content: '',
    });

    const toggleMember = (id: number) => {
        const exists = editForm.data.member_ids.includes(id);
        editForm.setData(
            'member_ids',
            exists
                ? editForm.data.member_ids.filter((mid) => mid !== id)
                : [...editForm.data.member_ids, id],
        );
    };

    const handleUpdateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        editForm.put(route('projects.field.update', project.id), {
            preserveScroll: true,
            onSuccess: () => setShowEditModal(false),
        });
    };

    const handleNoteSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        noteForm.post(route('projects.updates.store', project.id), {
            preserveScroll: true,
            onSuccess: () => noteForm.reset(),
        });
    };

    const handleDelete = () => {
        if (!window.confirm(`Hapus proyek lapangan "${project.name}"?`)) {
            return;
        }
        router.delete(route('projects.field.destroy', project.id));
    };

    const statusInfo = STATUS_META[project.status] ?? {
        label: project.status,
        badgeClass: 'bg-slate-100 text-slate-700 ring-slate-200',
    };

    return (
        <AppShell initialActive="field-projects">
            <Head title={`${project.name} · Proyek Lapangan`} />

            <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                {/* Top Navigation & Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link
                        href={route('projects.field')}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground sm:text-sm"
                    >
                        <ArrowLeft className="size-4" />
                        Kembali ke Proyek Lapangan
                    </Link>

                    <div className="flex flex-wrap items-center gap-2">
                        <Link
                            href={route('attendance.index')}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-amber-700"
                        >
                            <Navigation className="size-3.5" />
                            Absen Site Visit
                        </Link>

                        {isAdmin && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(true)}
                                    className="inline-flex items-center gap-1.5 rounded-xl border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-2xs transition hover:bg-muted"
                                >
                                    <Edit3 className="size-3.5" />
                                    Edit Proyek
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                                >
                                    <Trash2 className="size-3.5" />
                                    Hapus
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Project Header Card */}
                <div className="rounded-2xl border bg-card p-5 shadow-2xs sm:p-6">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900">
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

                    <h1 className="mt-2.5 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                        {project.name}
                    </h1>
                    {project.description && (
                        <p className="mt-1.5 max-w-3xl text-xs text-muted-foreground sm:text-sm">
                            {project.description}
                        </p>
                    )}

                    <div className="mt-4 grid grid-cols-1 gap-3 border-t pt-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="flex flex-col justify-between gap-2.5 rounded-xl bg-amber-50/70 p-3.5 ring-1 ring-amber-200/70">
                            <div className="flex items-start gap-2.5">
                                <MapPin className="mt-0.5 size-4 shrink-0 text-amber-700" />
                                <div className="min-w-0">
                                    <p className="text-[11px] font-medium text-amber-800/80">
                                        Lokasi Proyek
                                    </p>
                                    <p className="mt-0.5 text-xs font-semibold leading-relaxed text-amber-950">
                                        {project.location || 'Belum diisi'}
                                    </p>
                                </div>
                            </div>

                            {project.google_maps_url && (
                                <a
                                    href={project.google_maps_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-amber-900 shadow-2xs ring-1 ring-amber-300/80 transition hover:bg-amber-100"
                                >
                                    <MapPin className="size-3 text-rose-600" />
                                    {project.maps_url
                                        ? 'Buka Titik Google Maps'
                                        : 'Cari di Google Maps'}
                                    <ExternalLink className="size-3 text-amber-700" />
                                </a>
                            )}
                        </div>

                        <div className="flex items-start gap-2.5 rounded-xl bg-muted/40 p-3.5">
                            <Phone className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                            <div className="min-w-0">
                                <p className="text-[11px] font-medium text-muted-foreground">
                                    Klien / Owner
                                </p>
                                <p className="mt-0.5 truncate text-xs font-semibold text-foreground">
                                    {project.client_name}
                                </p>
                                {project.client_phone && (
                                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                                        {project.client_phone}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-start gap-2.5 rounded-xl bg-muted/40 p-3.5">
                            <Calendar className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                            <div className="min-w-0">
                                <p className="text-[11px] font-medium text-muted-foreground">
                                    Jadwal Pelaksanaan
                                </p>
                                <p className="mt-0.5 text-xs font-semibold text-foreground">
                                    {project.start_date_formatted || '-'} s/d{' '}
                                    {project.due_date_formatted || 'Berjalan'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-2.5 rounded-xl bg-muted/40 p-3.5">
                            <Camera className="mt-0.5 size-4 shrink-0 text-amber-600" />
                            <div className="min-w-0">
                                <p className="text-[11px] font-medium text-muted-foreground">
                                    Total Kunjungan
                                </p>
                                <p className="mt-0.5 text-xs font-semibold text-foreground">
                                    {siteVisits.length} Absensi Site Visit
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Interactive Google Maps Preview */}
                    {project.embed_maps_url && (
                        <div className="mt-4 overflow-hidden rounded-xl border bg-muted/20">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-3.5 py-2">
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                                    <MapPin className="size-3.5 text-rose-600" />
                                    Peta Lokasi Proyek
                                    {project.maps_url && (
                                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                                            Link Pin Google Maps Tersimpan
                                        </span>
                                    )}
                                </div>
                                {project.google_maps_url && (
                                    <a
                                        href={project.google_maps_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:underline"
                                    >
                                        Navigasi di Google Maps
                                        <ExternalLink className="size-3" />
                                    </a>
                                )}
                            </div>
                            <iframe
                                title={`Peta lokasi ${project.name}`}
                                src={project.embed_maps_url}
                                className="h-48 w-full border-0 sm:h-56"
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                            />
                        </div>
                    )}

                    {/* Assigned Field Team */}
                    <div className="mt-4 border-t pt-4">
                        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                            <Users className="size-3.5" />
                            Tim Lapangan / Pengawas
                        </p>
                        {project.members.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                                Belum ada pengawas khusus yang dipilih (seluruh karyawan lapangan tetap dapat memilih proyek ini saat Site Visit).
                            </p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {project.members.map((m) => (
                                    <div
                                        key={m.id}
                                        className="inline-flex items-center gap-2 rounded-full border bg-background px-2.5 py-1 text-xs"
                                    >
                                        <MemberAvatar
                                            id={m.id}
                                            name={m.name}
                                            photoUrl={m.photo_url}
                                            className="size-5 text-[10px]"
                                        />
                                        <span className="font-medium text-foreground">{m.name}</span>
                                        <span className="text-[11px] text-muted-foreground">
                                            · {m.position}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Main 2-Column Content: Site Visit History & Quick Field Notes */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Site Visit Attendance History */}
                    <div className="space-y-4 lg:col-span-2">
                        <div className="rounded-2xl border bg-card p-5 shadow-2xs">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
                                        <Camera className="size-4 text-amber-600" />
                                        Riwayat Absensi & Foto Site Visit
                                    </h2>
                                    <p className="text-xs text-muted-foreground">
                                        Rekap otomatis setiap kali tim lapangan melakukan Check-in Site Visit ke lokasi ini
                                    </p>
                                </div>
                            </div>

                            {siteVisits.length === 0 ? (
                                <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-10 text-center">
                                    <Camera className="mx-auto size-7 text-muted-foreground/60" />
                                    <p className="mt-2 text-sm font-medium text-foreground">
                                        Belum ada riwayat Site Visit
                                    </p>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        Foto dan jam kehadiran tim lapangan akan otomatis muncul di sini saat mereka Check-in Site Visit.
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {siteVisits.map((visit) => {
                                        const approvalBadge =
                                            visit.site_visit_status === 'approved'
                                                ? {
                                                      label: 'Disetujui',
                                                      cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
                                                  }
                                                : visit.site_visit_status === 'rejected'
                                                  ? {
                                                        label: 'Ditolak',
                                                        cls: 'bg-rose-50 text-rose-700 ring-rose-200',
                                                    }
                                                  : {
                                                        label: 'Menunggu Approval',
                                                        cls: 'bg-amber-50 text-amber-800 ring-amber-200',
                                                    };

                                        return (
                                            <div
                                                key={visit.id}
                                                className="flex flex-col gap-3 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between"
                                            >
                                                <div className="flex items-start gap-3">
                                                    {visit.photo_url ? (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setLightboxUrl(visit.photo_url || null)
                                                            }
                                                            className="group relative size-14 shrink-0 overflow-hidden rounded-xl border bg-muted"
                                                        >
                                                            <img
                                                                src={visit.photo_url}
                                                                alt={visit.user_name}
                                                                className="h-full w-full object-cover transition group-hover:scale-105"
                                                            />
                                                        </button>
                                                    ) : (
                                                        <div className="flex size-14 shrink-0 items-center justify-center rounded-xl border bg-muted/50 text-muted-foreground">
                                                            <Camera className="size-5" />
                                                        </div>
                                                    )}

                                                    <div className="space-y-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="text-sm font-semibold text-foreground">
                                                                {visit.user_name}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground">
                                                                · {visit.position}
                                                            </span>
                                                            <span
                                                                className={cn(
                                                                    'rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1',
                                                                    approvalBadge.cls,
                                                                )}
                                                            >
                                                                {approvalBadge.label}
                                                            </span>
                                                        </div>

                                                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                                            <span className="inline-flex items-center gap-1">
                                                                <Calendar className="size-3.5" />
                                                                {visit.date}
                                                            </span>
                                                            <span className="inline-flex items-center gap-1 font-medium text-foreground">
                                                                <Clock className="size-3.5 text-amber-600" />
                                                                Masuk {visit.check_in_time || '--:--'} · Pulang{' '}
                                                                {visit.check_out_time || 'Masih di lokasi'}
                                                            </span>
                                                        </div>

                                                        {visit.notes && (
                                                            <p className="text-xs text-slate-600">
                                                                “{visit.notes}”
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Field Notes */}
                    <div className="space-y-4">
                        <div className="rounded-2xl border bg-card p-5 shadow-2xs">
                            <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
                                <MessageSquarePlus className="size-4 text-amber-600" />
                                Catatan Lapangan
                            </h2>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                Catat progres singkat, kendala, atau perbaikan masa retensi
                            </p>

                            <form onSubmit={handleNoteSubmit} className="mt-3 space-y-2.5">
                                <textarea
                                    rows={3}
                                    required
                                    value={noteForm.data.content}
                                    onChange={(e) => noteForm.setData('content', e.target.value)}
                                    placeholder="Contoh: Pengecoran sloof selesai, cuaca cerah..."
                                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 sm:text-sm"
                                />
                                {noteForm.errors.content && (
                                    <p className="text-xs text-rose-600">{noteForm.errors.content}</p>
                                )}
                                <button
                                    type="submit"
                                    disabled={noteForm.processing || !noteForm.data.content.trim()}
                                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                                >
                                    <Send className="size-3.5" />
                                    {noteForm.processing ? 'Mengirim...' : 'Kirim Catatan'}
                                </button>
                            </form>

                            <div className="mt-5 space-y-3 border-t pt-4">
                                {updates.length === 0 ? (
                                    <p className="py-4 text-center text-xs text-muted-foreground">
                                        Belum ada catatan lapangan.
                                    </p>
                                ) : (
                                    updates.map((u) => (
                                        <div
                                            key={u.id}
                                            className="space-y-1 rounded-xl bg-muted/40 p-3 text-xs"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-semibold text-foreground">
                                                    {u.author_name}
                                                </span>
                                                <span className="text-[11px] text-muted-foreground">
                                                    {u.created_at}
                                                </span>
                                            </div>
                                            <p className="whitespace-pre-line text-slate-700">
                                                {u.content}
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Lightbox Preview Foto Site Visit */}
            {lightboxUrl && (
                <div
                    onClick={() => setLightboxUrl(null)}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
                >
                    <div className="relative max-h-[85vh] max-w-3xl">
                        <button
                            type="button"
                            onClick={() => setLightboxUrl(null)}
                            className="absolute -top-3 -right-3 rounded-full bg-white p-1.5 text-slate-900 shadow-md"
                        >
                            <X className="size-4" />
                        </button>
                        <img
                            src={lightboxUrl}
                            alt="Foto Site Visit"
                            className="max-h-[82vh] rounded-2xl object-contain shadow-2xl"
                        />
                    </div>
                </div>
            )}

            {/* Modal Edit Proyek Lapangan */}
            {showEditModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
                    <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border bg-card shadow-xl">
                        <div className="flex items-center justify-between border-b px-5 py-4">
                            <h2 className="text-base font-bold text-foreground">
                                Edit Proyek Lapangan
                            </h2>
                            <button
                                type="button"
                                onClick={() => setShowEditModal(false)}
                                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                                <X className="size-4" />
                            </button>
                        </div>

                        <form
                            onSubmit={handleUpdateSubmit}
                            className="flex-1 space-y-4 overflow-y-auto px-5 py-4"
                        >
                            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                                <div className="sm:col-span-2">
                                    <label className="mb-1 block text-xs font-semibold text-foreground">
                                        Nama Proyek Lapangan <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={editForm.data.name}
                                        onChange={(e) => editForm.setData('name', e.target.value)}
                                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-foreground">
                                        Nama Klien <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={editForm.data.client_name}
                                        onChange={(e) =>
                                            editForm.setData('client_name', e.target.value)
                                        }
                                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-foreground">
                                        No. WhatsApp Klien
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.data.client_phone}
                                        onChange={(e) =>
                                            editForm.setData('client_phone', e.target.value)
                                        }
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
                                        value={editForm.data.location}
                                        onChange={(e) => editForm.setData('location', e.target.value)}
                                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="mb-1 block text-xs font-semibold text-foreground">
                                        Link Titik Google Maps (Opsional)
                                    </label>
                                    <input
                                        type="url"
                                        value={editForm.data.maps_url}
                                        onChange={(e) => editForm.setData('maps_url', e.target.value)}
                                        placeholder="https://maps.app.goo.gl/..."
                                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                                    />
                                    {editForm.errors.maps_url && (
                                        <p className="mt-1 text-xs text-rose-600">
                                            {editForm.errors.maps_url}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-foreground">
                                        Lingkup Pekerjaan
                                    </label>
                                    <select
                                        value={editForm.data.project_type}
                                        onChange={(e) =>
                                            editForm.setData(
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
                                        value={editForm.data.status}
                                        onChange={(e) =>
                                            editForm.setData(
                                                'status',
                                                e.target.value as
                                                    | 'planning'
                                                    | 'ongoing'
                                                    | 'review'
                                                    | 'retention'
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
                                        <option value="on_hold">Ditunda Sementara</option>
                                        <option value="done">Selesai (Serah Terima Akhir)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-foreground">
                                        Tanggal Mulai
                                    </label>
                                    <input
                                        type="date"
                                        value={editForm.data.start_date}
                                        onChange={(e) =>
                                            editForm.setData('start_date', e.target.value)
                                        }
                                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-foreground">
                                        Target Selesai
                                    </label>
                                    <input
                                        type="date"
                                        value={editForm.data.due_date}
                                        onChange={(e) => editForm.setData('due_date', e.target.value)}
                                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="mb-1.5 block text-xs font-semibold text-foreground">
                                        Tim Lapangan / Pengawas
                                    </label>
                                    <div className="max-h-36 space-y-1 overflow-y-auto rounded-lg border bg-muted/20 p-2">
                                        {teamMembers.map((member) => {
                                            const checked = editForm.data.member_ids.includes(
                                                member.id,
                                            );
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
                                        Catatan Singkat
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={editForm.data.description}
                                        onChange={(e) =>
                                            editForm.setData('description', e.target.value)
                                        }
                                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 border-t pt-3">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="rounded-lg border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={editForm.processing}
                                    className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-amber-700 disabled:opacity-50"
                                >
                                    {editForm.processing ? 'Menyimpan...' : 'Simpan Perubahan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppShell>
    );
}
