import { AppShell } from '@/Components/dashboard/app-shell';
import { MemberAvatar } from '@/Components/dashboard/member-avatar';
import { type PageProps } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    Briefcase,
    Building2,
    CalendarCheck2,
    Camera,
    CheckCircle2,
    Clock,
    CreditCard,
    Eye,
    EyeOff,
    FileText,
    FolderKanban,
    KeyRound,
    Lock,
    Mail,
    Phone,
    Printer,
    Save,
    ShieldCheck,
    Trash2,
    UserCheck,
} from 'lucide-react';
import { useRef, useState } from 'react';

interface ProfileData {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    photo_url: string | null;
    employee_code: string;
    position: string;
    department: string;
    employment_status: string;
    join_date_formatted: string;
    tenure_text: string;
    annual_leave_quota: number;
    bank_name: string;
    bank_account_number: string;
    bank_account_holder: string;
    bank_branch: string;
}

interface KpiData {
    present_days_month: number;
    active_projects_count: number;
    total_tasks: number;
    done_tasks: number;
    task_completion_rate: number;
    overtime_hours_month: number;
}

interface SlipItem {
    id: number;
    period_name: string;
    type: 'regular' | 'thr';
    start_date_formatted: string;
    end_date_formatted: string;
    status: 'finalized' | 'paid';
    paid_at: string | null;
    base_salary: number;
    fixed_allowance: number;
    overtime_hours: number;
    overtime_amount: number;
    bonus_amount: number;
    thr_amount: number;
    alpha_deduction: number;
    other_deduction: number;
    total_allowance: number;
    total_deduction: number;
    net_salary: number;
    present_days: number;
    absent_days: number;
    bank_name: string;
    bank_account_number: string;
    bank_account_holder: string;
}

interface Props {
    profile: ProfileData;
    kpi: KpiData;
    slips: SlipItem[];
}

export default function MyProfile({ profile, kpi, slips }: Props) {
    const { auth, flash } = usePage<PageProps>().props;
    const initialRole = auth.user.role === 'admin' ? 'admin' : 'karyawan';

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [photoError, setPhotoError] = useState<string | null>(null);
    const [showSlips, setShowSlips] = useState(false);

    const formatRp = (val: number) =>
        new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0,
        }).format(val);

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) {
            return;
        }
        setPhotoError(null);
        setUploadingPhoto(true);
        router.post(
            route('my-profile.photo.update'),
            { photo: file },
            {
                forceFormData: true,
                preserveScroll: true,
                onError: (errors) => {
                    setPhotoError(
                        errors.photo ?? 'Gagal mengunggah foto profil.',
                    );
                },
                onFinish: () => {
                    setUploadingPhoto(false);
                    if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                    }
                },
            },
        );
    };

    const handleDeletePhoto = () => {
        setPhotoError(null);
        setUploadingPhoto(true);
        router.delete(route('my-profile.photo.delete'), {
            preserveScroll: true,
            onFinish: () => setUploadingPhoto(false),
        });
    };

    const contactForm = useForm({
        phone: profile.phone ?? '',
    });

    const passwordForm = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });
    const [showPasswords, setShowPasswords] = useState(false);

    const handleUpdateContact = (e: React.FormEvent) => {
        e.preventDefault();
        contactForm.patch(route('my-profile.contact.update'), {
            preserveScroll: true,
        });
    };

    const handleUpdatePassword = (e: React.FormEvent) => {
        e.preventDefault();
        passwordForm.put(route('my-profile.password.update'), {
            preserveScroll: true,
            onSuccess: () => passwordForm.reset(),
        });
    };

    return (
        <AppShell initialRole={initialRole} initialActive="profil">
            <Head title="Profil Saya" />

            <div className="space-y-6 pb-10">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-stone-900">
                        Profil Saya
                    </h1>
                    <p className="mt-0.5 text-sm text-stone-500">
                        Informasi kepegawaian, ringkasan kinerja pribadi, serta
                        akses privat slip gaji Anda.
                    </p>
                </div>

                {flash?.success && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        {flash.success}
                    </div>
                )}
                {(flash?.error || photoError) && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                        {photoError ?? flash?.error}
                    </div>
                )}

                {/* Header Profil & Upload Foto */}
                <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <MemberAvatar
                                    id={profile.id}
                                    name={profile.name}
                                    photoUrl={profile.photo_url}
                                    className="h-20 w-20 text-xl ring-4 ring-stone-100"
                                />
                            </div>
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-xl font-bold text-stone-900">
                                        {profile.name}
                                    </h2>
                                    <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-700">
                                        {profile.employee_code}
                                    </span>
                                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                                        {profile.employment_status}
                                    </span>
                                </div>
                                <p className="mt-1 text-sm font-medium text-stone-700">
                                    {profile.position} · {profile.department}
                                </p>
                                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
                                    <span className="inline-flex items-center gap-1.5">
                                        <Mail className="h-3.5 w-3.5" />
                                        {profile.email}
                                    </span>
                                    {profile.phone && (
                                        <span className="inline-flex items-center gap-1.5">
                                            <Phone className="h-3.5 w-3.5" />
                                            {profile.phone}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                className="hidden"
                                onChange={handlePhotoChange}
                            />
                            <button
                                type="button"
                                disabled={uploadingPhoto}
                                onClick={() => fileInputRef.current?.click()}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-stone-800 disabled:opacity-50"
                            >
                                <Camera className="h-3.5 w-3.5" />
                                {uploadingPhoto
                                    ? 'Mengunggah...'
                                    : profile.photo_url
                                      ? 'Ganti Foto'
                                      : 'Upload Foto'}
                            </button>
                            {profile.photo_url && (
                                <button
                                    type="button"
                                    disabled={uploadingPhoto}
                                    onClick={handleDeletePhoto}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-600 transition hover:bg-stone-50 disabled:opacity-50"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Reset Default
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* KPI & Kinerja Pribadi */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold tracking-wide text-stone-700 uppercase">
                            Ringkasan KPI & Kinerja Pribadi
                        </h3>
                        <span className="text-xs text-stone-400">
                            Data realtime dari absensi, project, & lembur
                        </span>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                            <div className="flex items-center justify-between text-xs font-medium text-stone-500">
                                <span>Kehadiran Bulan Ini</span>
                                <CalendarCheck2 className="h-4 w-4 text-emerald-600" />
                            </div>
                            <p className="mt-2 text-2xl font-bold text-stone-900">
                                {kpi.present_days_month} Hari
                            </p>
                            <p className="mt-1 text-xs text-stone-500">
                                Tercatat hadir / terlambat bulan berjalan
                            </p>
                        </div>

                        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                            <div className="flex items-center justify-between text-xs font-medium text-stone-500">
                                <span>Proyek Aktif</span>
                                <FolderKanban className="h-4 w-4 text-amber-600" />
                            </div>
                            <p className="mt-2 text-2xl font-bold text-stone-900">
                                {kpi.active_projects_count} Proyek
                            </p>
                            <p className="mt-1 text-xs text-stone-500">
                                Proyek yang Anda ikuti saat ini
                            </p>
                        </div>

                        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                            <div className="flex items-center justify-between text-xs font-medium text-stone-500">
                                <span>Tugas Kanban Selesai</span>
                                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                            </div>
                            <p className="mt-2 text-2xl font-bold text-stone-900">
                                {kpi.done_tasks}/{kpi.total_tasks}
                                <span className="ml-2 text-sm font-semibold text-blue-600">
                                    ({kpi.task_completion_rate}%)
                                </span>
                            </p>
                            <p className="mt-1 text-xs text-stone-500">
                                Tingkat penyelesaian tugas yang ditugaskan
                            </p>
                        </div>

                        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                            <div className="flex items-center justify-between text-xs font-medium text-stone-500">
                                <span>Jam Lembur Disetujui</span>
                                <Clock className="h-4 w-4 text-purple-600" />
                            </div>
                            <p className="mt-2 text-2xl font-bold text-stone-900">
                                {kpi.overtime_hours_month} Jam
                            </p>
                            <p className="mt-1 text-xs text-stone-500">
                                Akumulasi lembur disetujui bulan ini
                            </p>
                        </div>
                    </div>
                </div>

                {/* Informasi Kepegawaian & Rekening (Read-Only, Tanpa Nominal Gaji) */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                        <div className="mb-4 flex items-center gap-2 border-b border-stone-100 pb-3">
                            <Briefcase className="h-4 w-4 text-stone-700" />
                            <h3 className="text-sm font-semibold text-stone-900">
                                Informasi Kepegawaian
                            </h3>
                        </div>
                        <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                            <div>
                                <dt className="text-xs text-stone-500">
                                    Posisi / Jabatan
                                </dt>
                                <dd className="mt-0.5 font-medium text-stone-900">
                                    {profile.position}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs text-stone-500">
                                    Departemen
                                </dt>
                                <dd className="mt-0.5 flex items-center gap-1.5 font-medium text-stone-900">
                                    <Building2 className="h-3.5 w-3.5 text-stone-400" />
                                    {profile.department}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs text-stone-500">
                                    Tanggal Bergabung
                                </dt>
                                <dd className="mt-0.5 font-medium text-stone-900">
                                    {profile.join_date_formatted}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs text-stone-500">
                                    Lama Kerja (Masa Kerja)
                                </dt>
                                <dd className="mt-0.5 font-semibold text-stone-900">
                                    {profile.tenure_text}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs text-stone-500">
                                    Status Karyawan
                                </dt>
                                <dd className="mt-0.5 flex items-center gap-1.5 font-medium text-stone-900">
                                    <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                                    {profile.employment_status}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs text-stone-500">
                                    Kuota Cuti Tahunan
                                </dt>
                                <dd className="mt-0.5 font-medium text-stone-900">
                                    {profile.annual_leave_quota} Hari / Tahun
                                </dd>
                            </div>
                        </dl>
                    </div>

                    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                        <div className="mb-4 flex items-center justify-between border-b border-stone-100 pb-3">
                            <div className="flex items-center gap-2">
                                <CreditCard className="h-4 w-4 text-stone-700" />
                                <h3 className="text-sm font-semibold text-stone-900">
                                    Rekening Penerima Payroll
                                </h3>
                            </div>
                            <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600">
                                <Lock className="h-3 w-3" />
                                Hanya Admin
                            </span>
                        </div>
                        <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                            <div>
                                <dt className="text-xs text-stone-500">
                                    Nama Bank
                                </dt>
                                <dd className="mt-0.5 font-medium text-stone-900">
                                    {profile.bank_name}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs text-stone-500">
                                    Nomor Rekening
                                </dt>
                                <dd className="mt-0.5 font-mono font-medium text-stone-900">
                                    {profile.bank_account_number}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs text-stone-500">
                                    Atas Nama
                                </dt>
                                <dd className="mt-0.5 font-medium text-stone-900">
                                    {profile.bank_account_holder}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs text-stone-500">
                                    Cabang Bank
                                </dt>
                                <dd className="mt-0.5 font-medium text-stone-900">
                                    {profile.bank_branch}
                                </dd>
                            </div>
                        </dl>
                        <p className="mt-4 rounded-xl bg-stone-50 px-3 py-2 text-xs text-stone-500">
                            Perubahan rekening hanya dapat dilakukan oleh HR /
                            Admin Studio untuk keamanan payroll.
                        </p>
                    </div>
                </div>

                {/* Kontak & Keamanan Akun (Mandiri) */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <form
                        onSubmit={handleUpdateContact}
                        className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
                    >
                        <div className="mb-4 flex items-center gap-2 border-b border-stone-100 pb-3">
                            <Phone className="h-4 w-4 text-stone-700" />
                            <h3 className="text-sm font-semibold text-stone-900">
                                Nomor Kontak Pribadi
                            </h3>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="mb-1 block text-xs font-medium text-stone-600">
                                    Nomor WhatsApp / HP Aktif
                                </label>
                                <input
                                    type="text"
                                    value={contactForm.data.phone}
                                    onChange={(e) =>
                                        contactForm.setData(
                                            'phone',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="Contoh: 081234567890"
                                    className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm text-stone-900 focus:border-stone-400 focus:outline-none"
                                />
                                {contactForm.errors.phone && (
                                    <p className="mt-1 text-xs text-rose-600">
                                        {contactForm.errors.phone}
                                    </p>
                                )}
                            </div>
                            <p className="text-xs text-stone-500">
                                Digunakan untuk koordinasi internal proyek dan
                                kontak darurat studio.
                            </p>
                            <div className="pt-1">
                                <button
                                    type="submit"
                                    disabled={contactForm.processing}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-stone-800 disabled:opacity-50"
                                >
                                    <Save className="h-3.5 w-3.5" />
                                    {contactForm.processing
                                        ? 'Menyimpan...'
                                        : 'Simpan Nomor Kontak'}
                                </button>
                            </div>
                        </div>
                    </form>

                    <form
                        onSubmit={handleUpdatePassword}
                        className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
                    >
                        <div className="mb-4 flex items-center justify-between border-b border-stone-100 pb-3">
                            <div className="flex items-center gap-2">
                                <KeyRound className="h-4 w-4 text-stone-700" />
                                <h3 className="text-sm font-semibold text-stone-900">
                                    Ganti Kata Sandi Akun
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() =>
                                    setShowPasswords((prev) => !prev)
                                }
                                className="inline-flex items-center gap-1 text-xs font-medium text-stone-500 hover:text-stone-800"
                            >
                                {showPasswords ? (
                                    <>
                                        <EyeOff className="h-3.5 w-3.5" />
                                        Sembunyikan
                                    </>
                                ) : (
                                    <>
                                        <Eye className="h-3.5 w-3.5" />
                                        Lihat
                                    </>
                                )}
                            </button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="mb-1 block text-xs font-medium text-stone-600">
                                    Kata Sandi Saat Ini
                                </label>
                                <input
                                    type={showPasswords ? 'text' : 'password'}
                                    value={passwordForm.data.current_password}
                                    onChange={(e) =>
                                        passwordForm.setData(
                                            'current_password',
                                            e.target.value,
                                        )
                                    }
                                    required
                                    className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm text-stone-900 focus:border-stone-400 focus:outline-none"
                                />
                                {passwordForm.errors.current_password && (
                                    <p className="mt-1 text-xs text-rose-600">
                                        {passwordForm.errors.current_password}
                                    </p>
                                )}
                            </div>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-stone-600">
                                        Kata Sandi Baru (min. 8 karakter)
                                    </label>
                                    <input
                                        type={
                                            showPasswords ? 'text' : 'password'
                                        }
                                        value={passwordForm.data.password}
                                        onChange={(e) =>
                                            passwordForm.setData(
                                                'password',
                                                e.target.value,
                                            )
                                        }
                                        required
                                        className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm text-stone-900 focus:border-stone-400 focus:outline-none"
                                    />
                                    {passwordForm.errors.password && (
                                        <p className="mt-1 text-xs text-rose-600">
                                            {passwordForm.errors.password}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-stone-600">
                                        Konfirmasi Kata Sandi Baru
                                    </label>
                                    <input
                                        type={
                                            showPasswords ? 'text' : 'password'
                                        }
                                        value={
                                            passwordForm.data
                                                .password_confirmation
                                        }
                                        onChange={(e) =>
                                            passwordForm.setData(
                                                'password_confirmation',
                                                e.target.value,
                                            )
                                        }
                                        required
                                        className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm text-stone-900 focus:border-stone-400 focus:outline-none"
                                    />
                                </div>
                            </div>
                            <div className="pt-1">
                                <button
                                    type="submit"
                                    disabled={passwordForm.processing}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-stone-800 disabled:opacity-50"
                                >
                                    <KeyRound className="h-3.5 w-3.5" />
                                    {passwordForm.processing
                                        ? 'Memperbarui...'
                                        : 'Perbarui Kata Sandi'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Slip Gaji & THR Resmi (Tersembunyi Secara Default) */}
                <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-700">
                                <ShieldCheck className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-stone-900">
                                    Slip Gaji & THR Resmi (Privat)
                                </h3>
                                <p className="text-xs text-stone-500">
                                    Disembunyikan secara default untuk menjaga
                                    privasi nominal gaji Anda di lingkungan
                                    kerja.
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowSlips((prev) => !prev)}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-stone-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-stone-800"
                        >
                            {showSlips ? (
                                <>
                                    <EyeOff className="h-4 w-4" />
                                    Sembunyikan Slip Gaji
                                </>
                            ) : (
                                <>
                                    <Eye className="h-4 w-4" />
                                    Tampilkan Slip Gaji ({slips.length})
                                </>
                            )}
                        </button>
                    </div>

                    {showSlips && (
                        <div className="mt-5 border-t border-stone-100 pt-5">
                            {slips.length === 0 ? (
                                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-stone-200 py-10 text-center">
                                    <FileText className="mb-2 h-8 w-8 text-stone-300" />
                                    <p className="text-sm font-medium text-stone-700">
                                        Belum ada slip gaji yang diterbitkan
                                    </p>
                                    <p className="mt-1 text-xs text-stone-500">
                                        Slip gaji akan muncul di sini setelah
                                        periode payroll difinalisasi oleh Admin.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {slips.map((slip) => (
                                        <div
                                            key={slip.id}
                                            className="rounded-xl border border-stone-200 bg-stone-50/40 p-4"
                                        >
                                            <div className="flex flex-col justify-between gap-3 border-b border-stone-200/70 pb-3 sm:flex-row sm:items-center">
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h4 className="font-semibold text-stone-900">
                                                            {slip.period_name}
                                                        </h4>
                                                        {slip.type === 'thr' && (
                                                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                                                                THR Keagamaan
                                                            </span>
                                                        )}
                                                        <span
                                                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                                                slip.status ===
                                                                'paid'
                                                                    ? 'bg-emerald-100 text-emerald-700'
                                                                    : 'bg-blue-100 text-blue-700'
                                                            }`}
                                                        >
                                                            {slip.status ===
                                                            'paid'
                                                                ? 'Sudah Ditransfer'
                                                                : 'Final'}
                                                        </span>
                                                    </div>
                                                    <p className="mt-0.5 text-xs text-stone-500">
                                                        {slip.type === 'thr'
                                                            ? `Tanggal Acuan: ${slip.end_date_formatted}`
                                                            : `Periode: ${slip.start_date_formatted} – ${slip.end_date_formatted}`}
                                                    </p>
                                                </div>

                                                <a
                                                    href={route(
                                                        'payroll.slip',
                                                        slip.id,
                                                    )}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 shadow-xs transition hover:bg-stone-50"
                                                >
                                                    <Printer className="h-3.5 w-3.5" />
                                                    Cetak / Simpan PDF
                                                </a>
                                            </div>

                                            <div className="mt-3 grid grid-cols-1 gap-4 text-xs sm:grid-cols-3">
                                                <div className="space-y-1">
                                                    <p className="font-semibold text-stone-700">
                                                        Penerimaan
                                                    </p>
                                                    {slip.type === 'thr' ? (
                                                        <div className="flex justify-between text-stone-600">
                                                            <span>THR</span>
                                                            <span>
                                                                {formatRp(
                                                                    slip.thr_amount,
                                                                )}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="flex justify-between text-stone-600">
                                                                <span>
                                                                    Gaji Pokok
                                                                </span>
                                                                <span>
                                                                    {formatRp(
                                                                        slip.base_salary,
                                                                    )}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between text-stone-600">
                                                                <span>
                                                                    Tunjangan
                                                                    Tetap
                                                                </span>
                                                                <span>
                                                                    {formatRp(
                                                                        slip.fixed_allowance,
                                                                    )}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between text-stone-600">
                                                                <span>
                                                                    Lembur (
                                                                    {
                                                                        slip.overtime_hours
                                                                    }{' '}
                                                                    j)
                                                                </span>
                                                                <span>
                                                                    {formatRp(
                                                                        slip.overtime_amount,
                                                                    )}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between text-stone-600">
                                                                <span>
                                                                    Insentif /
                                                                    Bonus
                                                                </span>
                                                                <span>
                                                                    {formatRp(
                                                                        slip.bonus_amount,
                                                                    )}
                                                                </span>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>

                                                <div className="space-y-1">
                                                    <p className="font-semibold text-stone-700">
                                                        Potongan
                                                    </p>
                                                    <div className="flex justify-between text-stone-600">
                                                        <span>
                                                            Alpha (
                                                            {slip.absent_days}{' '}
                                                            hr)
                                                        </span>
                                                        <span>
                                                            {formatRp(
                                                                slip.alpha_deduction,
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between text-stone-600">
                                                        <span>
                                                            Kasbon / Lainnya
                                                        </span>
                                                        <span>
                                                            {formatRp(
                                                                slip.other_deduction,
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col justify-between rounded-lg bg-white p-3 ring-1 ring-stone-200/70">
                                                    <div>
                                                        <p className="text-[11px] font-medium text-stone-500">
                                                            Take-Home Pay
                                                        </p>
                                                        <p className="mt-1 text-base font-bold text-stone-900">
                                                            {formatRp(
                                                                slip.net_salary,
                                                            )}
                                                        </p>
                                                    </div>
                                                    <p className="mt-2 text-[11px] text-stone-500">
                                                        Transfer ke{' '}
                                                        {slip.bank_name} ·{' '}
                                                        {
                                                            slip.bank_account_number
                                                        }
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </AppShell>
    );
}
