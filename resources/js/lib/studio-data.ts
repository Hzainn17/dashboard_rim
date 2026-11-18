import {
    Banknote,
    CalendarDays,
    ClipboardCheck,
    FileText,
    FolderKanban,
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
    { id: 'projects', label: 'Project Management', icon: FolderKanban },
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
    { id: 'projects', label: 'Project Saya', icon: FolderKanban },
    { id: 'kalender', label: 'Kalender Tim', icon: CalendarDays },
    { id: 'profil', label: 'Profil Saya', icon: User },
];

export type TeamMember = {
    id: string;
    name: string;
    initials: string;
    role: string;
    tone: string;
};

export const team: TeamMember[] = [
    { id: 'rm', name: 'Rizky Maulana', initials: 'RM', role: 'Principal Architect', tone: 'bg-stone-800 text-stone-50' },
    { id: 'ap', name: 'Ayu Pratiwi', initials: 'AP', role: 'Senior Architect', tone: 'bg-orange-200 text-orange-900' },
    { id: 'dk', name: 'Dimas Kurniawan', initials: 'DK', role: 'Interior Designer', tone: 'bg-emerald-200 text-emerald-900' },
    { id: 'ns', name: 'Nadia Salsabila', initials: 'NS', role: '3D Visualizer', tone: 'bg-amber-200 text-amber-900' },
    { id: 'fh', name: 'Fajar Hidayat', initials: 'FH', role: 'Drafter', tone: 'bg-stone-300 text-stone-800' },
    { id: 'sa', name: 'Sinta Anggraini', initials: 'SA', role: 'Site Supervisor', tone: 'bg-rose-200 text-rose-900' },
];

export const teamById = Object.fromEntries(team.map((m) => [m.id, m])) as Record<string, TeamMember>;

export const avatarTones = [
    'bg-stone-800 text-stone-50',
    'bg-orange-200 text-orange-900',
    'bg-emerald-200 text-emerald-900',
    'bg-amber-200 text-amber-900',
    'bg-rose-200 text-rose-900',
    'bg-stone-300 text-stone-800',
];

export function getAvatarTone(id: number | string, name?: string): string {
    if (typeof id === 'string' && teamById[id]) {
        return teamById[id].tone;
    }
    if (name) {
        const found = team.find((t) => t.name.toLowerCase() === name.toLowerCase());
        if (found) return found.tone;
    }
    const seed =
        typeof id === 'number'
            ? Math.max(0, id - 1)
            : name
            ? name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
            : 0;
    return avatarTones[Math.abs(seed) % avatarTones.length];
}

export const currentUser: Record<Role, TeamMember & { roleLabel: string }> = {
    admin: { ...team[0], roleLabel: 'Admin Studio' },
    karyawan: { ...team[1], roleLabel: 'Karyawan' },
};

export type ProjectCategory = 'Residensial' | 'Komersial' | 'Interior';

export type Project = {
    id: string;
    title: string;
    client: string;
    location: string;
    category: ProjectCategory;
    progress: number;
    daysLeft: number;
    phase: string;
    cover: string;
    team: string[];
};

export const projects: Project[] = [
    {
        id: 'p1',
        title: 'Rumah Tropis Canggu',
        client: 'Bpk. Hendra Wijaya',
        location: 'Bali',
        category: 'Residensial',
        progress: 72,
        daysLeft: 5,
        phase: 'DED',
        cover: '/project-covers/rumah-tropis.png',
        team: ['ap', 'ns', 'fh'],
    },
    {
        id: 'p2',
        title: 'Menara Kantor Sudirman',
        client: 'PT Graha Nusantara',
        location: 'Jakarta Selatan',
        category: 'Komersial',
        progress: 41,
        daysLeft: 38,
        phase: 'Pra-Rancangan',
        cover: '/project-covers/kantor-sudirman.png',
        team: ['rm', 'ap', 'sa', 'fh'],
    },
    {
        id: 'p3',
        title: 'Kopi Senja Japandi',
        client: 'CV Senja Rasa',
        location: 'Bandung',
        category: 'Interior',
        progress: 88,
        daysLeft: 3,
        phase: 'Konstruksi',
        cover: '/project-covers/interior-kafe.png',
        team: ['dk', 'ns'],
    },
    {
        id: 'p4',
        title: 'Villa Kabut Lembang',
        client: 'Ibu Larasati Putri',
        location: 'Lembang',
        category: 'Residensial',
        progress: 24,
        daysLeft: 61,
        phase: 'Konsep',
        cover: '/project-covers/villa-lembang.png',
        team: ['rm', 'dk', 'sa'],
    },
];

export type AgendaItem = {
    id: string;
    time: string;
    end: string;
    title: string;
    place: string;
    type: 'meeting' | 'site' | 'review' | 'deadline';
    people: string[];
};

export const agenda: AgendaItem[] = [
    { id: 'a1', time: '09:30', end: '10:00', title: 'Stand-up Studio Mingguan', place: 'Ruang Studio Utama', type: 'meeting', people: ['rm', 'ap', 'dk', 'ns'] },
    { id: 'a2', time: '11:00', end: '13:00', title: 'Site Visit — Kopi Senja', place: 'Jl. Braga No. 21, Bandung', type: 'site', people: ['dk', 'sa'] },
    { id: 'a3', time: '14:00', end: '15:30', title: 'Review Fasad Menara Sudirman', place: 'Meeting Room B', type: 'review', people: ['rm', 'ap', 'fh'] },
    { id: 'a4', time: '17:00', end: '17:00', title: 'Submit Gambar DED Canggu', place: 'Drive Proyek', type: 'deadline', people: ['ap', 'fh'] },
];

export type Activity = {
    id: string;
    who: string;
    action: string;
    target: string;
    time: string;
    kind: 'checkin' | 'upload' | 'approval' | 'site' | 'comment';
};

export const activities: Activity[] = [
    { id: 'e1', who: 'sa', action: 'check-in site visit di', target: 'Villa Kabut Lembang', time: '08:12', kind: 'site' },
    { id: 'e2', who: 'ns', action: 'mengunggah render final', target: 'Kopi Senja Japandi', time: '08:40', kind: 'upload' },
    { id: 'e3', who: 'rm', action: 'menyetujui lembur', target: 'Fajar Hidayat — 2 jam', time: '08:55', kind: 'approval' },
    { id: 'e4', who: 'ap', action: 'berkomentar pada', target: 'Denah Lt. 2 Canggu', time: '09:02', kind: 'comment' },
    { id: 'e5', who: 'dk', action: 'check-in kantor', target: 'Dalam radius — 22m', time: '09:08', kind: 'checkin' },
];

export const notifications = [
    { id: 'n1', title: '3 pengajuan lembur menunggu approval', time: '5 mnt lalu', unread: true },
    { id: 'n2', title: 'Deadline DED Rumah Tropis Canggu dalam 5 hari', time: '1 jam lalu', unread: true },
    { id: 'n3', title: 'Sinta check-in site visit di Lembang', time: '1 jam lalu', unread: true },
    { id: 'n4', title: 'Payroll November siap ditinjau', time: 'Kemarin', unread: false },
];

export type CalendarEvent = {
    id: string;
    date: string;
    time: string;
    title: string;
    place: string;
    type: AgendaItem['type'] | 'holiday';
    people: string[];
};

export const calendarEvents: CalendarEvent[] = [
    { id: 'c1', date: '2026-11-03', time: '10:00', title: 'Kick-off Villa Kabut Lembang', place: 'Ruang Studio Utama', type: 'meeting', people: ['rm', 'sa', 'ns'] },
    { id: 'c2', date: '2026-11-05', time: '09:00', title: 'Site Visit — Villa Lembang', place: 'Lembang, Bandung Barat', type: 'site', people: ['sa', 'dk'] },
    { id: 'c3', date: '2026-11-10', time: '13:30', title: 'Presentasi Konsep Kantor Sudirman', place: 'Kantor Klien, Jakarta', type: 'review', people: ['rm', 'ap'] },
    { id: 'c4', date: '2026-11-12', time: '17:00', title: 'Submit Render Kopi Senja', place: 'Drive Proyek', type: 'deadline', people: ['ns'] },
    { id: 'c5', date: '2026-11-13', time: '15:00', title: 'Review Interior Kafe', place: 'Meeting Room B', type: 'review', people: ['ns', 'fh'] },
    ...agenda.map((a) => ({ ...a, date: '2026-11-17' })),
    { id: 'c6', date: '2026-11-19', time: '08:30', title: 'Site Visit — Menara Sudirman', place: 'Jl. Jend. Sudirman, Jakarta', type: 'site', people: ['dk', 'fh'] },
    { id: 'c7', date: '2026-11-20', time: '17:00', title: 'Deadline IMB Rumah Tropis', place: 'Dinas Tata Ruang', type: 'deadline', people: ['rm', 'ap'] },
    { id: 'c8', date: '2026-11-24', time: '09:30', title: 'Stand-up Studio Mingguan', place: 'Ruang Studio Utama', type: 'meeting', people: ['rm', 'ap', 'dk', 'ns', 'sa', 'fh'] },
    { id: 'c9', date: '2026-11-25', time: '14:00', title: 'Review Struktur Villa Lembang', place: 'Meeting Room A', type: 'review', people: ['sa', 'fh'] },
    { id: 'c10', date: '2026-11-27', time: '17:00', title: 'Serah Terima Gambar Kerja Kafe', place: 'Drive Proyek', type: 'deadline', people: ['ns', 'ap'] },
    { id: 'c11', date: '2026-12-01', time: '09:30', title: 'Stand-up Studio Mingguan', place: 'Ruang Studio Utama', type: 'meeting', people: ['rm', 'ap', 'dk', 'ns'] },
    { id: 'c12', date: '2026-12-25', time: '00:00', title: 'Libur Hari Raya Natal', place: 'Studio tutup', type: 'holiday', people: [] },
];
