import {
    Banknote,
    CalendarDays,
    ClipboardCheck,
    FolderKanban,
    HardHat,
    LayoutDashboard,
    MapPinCheck,
    Settings,
    User,
    Users,
    type LucideIcon,
} from 'lucide-react';

export type Role = 'admin' | 'karyawan';

export type NavItem = {
    id: string;
    label: string;
    icon: LucideIcon;
    children?: { id: string; label: string }[];
};

export const adminNav: NavItem[] = [
    { id: 'dashboard', label: 'Ringkasan', icon: LayoutDashboard },
    { id: 'karyawan', label: 'Data Karyawan', icon: Users },
    { id: 'projects', label: 'Proyek Perencanaan', icon: FolderKanban },
    { id: 'field-projects', label: 'Proyek Lapangan', icon: HardHat },
    {
        id: 'presensi',
        label: 'Presensi Tim',
        icon: ClipboardCheck,
        children: [
            { id: 'presensi-saya', label: 'Presensi Saya' },
            { id: 'presensi-approval', label: 'Pusat Approval' },
            { id: 'presensi-rekap', label: 'Rekap & Monitoring' },
        ],
    },
    { id: 'kalender', label: 'Kalender Studio', icon: CalendarDays },
    { id: 'payroll', label: 'Payroll Gaji', icon: Banknote },
    { id: 'pengaturan', label: 'Pengaturan Studio', icon: Settings },
];

export const karyawanNav: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'presensi-harian', label: 'Presensi Harian', icon: MapPinCheck },
    { id: 'projects', label: 'Proyek Perencanaan', icon: FolderKanban },
    { id: 'field-projects', label: 'Proyek Lapangan', icon: HardHat },
    { id: 'kalender', label: 'Kalender Tim', icon: CalendarDays },
    { id: 'profil', label: 'Profil Saya', icon: User },
];

export type ProjectCategory = 'Residensial' | 'Komersial' | 'Interior';

export const avatarTones = [
    'bg-stone-800 text-stone-50',
    'bg-orange-200 text-orange-900',
    'bg-emerald-200 text-emerald-900',
    'bg-amber-200 text-amber-900',
    'bg-rose-200 text-rose-900',
    'bg-stone-300 text-stone-800',
];

export function getAvatarTone(id: number | string, name?: string): string {
    const seed =
        typeof id === 'number'
            ? Math.max(0, id - 1)
            : (name ?? '')
                  .split('')
                  .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return avatarTones[seed % avatarTones.length];
}
