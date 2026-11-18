import { PageProps } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import {
    BadgeDollarSign,
    Calendar,
    ChevronDown,
    Clock,
    FolderKanban,
    LayoutDashboard,
    LogOut,
    LucideIcon,
    Menu,
    Receipt,
    Search,
    Settings,
    UserCheck,
    Users,
    X,
} from 'lucide-react';
import { PropsWithChildren, ReactNode, useEffect, useState } from 'react';

interface SubNavItem {
    id: string;
    label: string;
    href: string;
}

interface NavItem {
    id: string;
    label: string;
    href: string;
    icon: LucideIcon;
    hasSubmenu?: boolean;
    submenus?: SubNavItem[];
}

export default function AuthenticatedLayout({
    header,
    children,
}: PropsWithChildren<{ header?: ReactNode }>) {
    const { auth, studio } = usePage<PageProps>().props;
    const user = auth.user;
    const companyLogo = studio?.logo_url || '/rim-projects-logo.png';

    // Perspective switch (defaults to user role, allows previewing the other perspective)
    const [perspective, setPerspective] = useState<'admin' | 'employee'>(
        user?.role === 'admin' ? 'admin' : 'employee'
    );
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [presensiDropdownOpen, setPresensiDropdownOpen] = useState(false);
    const [userDropdownOpen, setUserDropdownOpen] = useState(false);
    const [currentTime, setCurrentTime] = useState<string>('');

    // Real-time WIB server-aligned clock
    useEffect(() => {
        const updateClock = () => {
            const now = new Date();
            const timeString = new Intl.DateTimeFormat('id-ID', {
                timeZone: 'Asia/Jakarta',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
            }).format(now);
            setCurrentTime(`${timeString} WIB`);
        };
        updateClock();
        const timer = setInterval(updateClock, 1000);
        return () => clearInterval(timer);
    }, []);

    // Initials for avatar
    const getInitials = (name?: string) => {
        if (!name) return 'RM';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    };

    const adminNav: NavItem[] = [
        { id: 'dashboard', label: 'Ringkasan', href: route('dashboard'), icon: LayoutDashboard },
        { id: 'karyawan', label: 'Data Karyawan', href: '#', icon: Users },
        { id: 'projects', label: 'Project Management', href: '#', icon: FolderKanban },
        {
            id: 'presensi',
            label: 'Presensi Tim',
            href: '#',
            icon: Clock,
            hasSubmenu: true,
            submenus: [
                { id: 'presensi-saya', label: 'Presensi Saya', href: '#' },
                { id: 'presensi-approval', label: 'Pusat Approval', href: '#' },
                { id: 'presensi-rekap', label: 'Rekap & Monitoring', href: '#' },
            ],
        },
        { id: 'kalender', label: 'Kalender Studio', href: '#', icon: Calendar },
        { id: 'payroll', label: 'Payroll Gaji', href: '#', icon: BadgeDollarSign },
        { id: 'pengaturan', label: 'Pengaturan Studio', href: '#', icon: Settings },
    ];

    const employeeNav: NavItem[] = [
        { id: 'dashboard', label: 'Dashboard', href: route('dashboard'), icon: LayoutDashboard },
        { id: 'karyawan', label: 'Data Karyawan', href: '#', icon: Users },
        { id: 'projects', label: 'Project Saya', href: '#', icon: FolderKanban },
        { id: 'presensi-harian', label: 'Presensi Harian', href: '#', icon: Clock },
        { id: 'slip', label: 'Slip Gaji', href: '#', icon: Receipt },
    ];

    const currentNav = perspective === 'admin' ? adminNav : employeeNav;

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            {/* Desktop Sidebar */}
            <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
                {/* Brand / Logo */}
                <div className="flex h-16 items-center px-5 border-b border-sidebar-border">
                    <div className="flex items-center gap-3">
                        <img
                            src={companyLogo}
                            alt={studio?.name || 'RIM Projects'}
                            className="h-9 w-auto max-w-[110px] object-contain"
                        />
                        <div className="border-l border-sidebar-border pl-3 leading-tight">
                            <p className="text-sm font-semibold tracking-tight text-foreground">Studio</p>
                            <p className="text-[11px] text-muted-foreground">Arsitektur</p>
                        </div>
                    </div>
                </div>

                {/* Perspective Switcher */}
                <div className="px-4 py-3 border-b border-sidebar-border">
                    <p className="mb-1.5 px-1 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                        Perspektif
                    </p>
                    <div
                        role="radiogroup"
                        aria-label="Pilih perspektif peran"
                        className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-card p-1"
                    >
                        <button
                            type="button"
                            onClick={() => setPerspective('admin')}
                            className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                                perspective === 'admin'
                                    ? 'bg-foreground text-background shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Admin Studio
                        </button>
                        <button
                            type="button"
                            onClick={() => setPerspective('employee')}
                            className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                                perspective === 'employee'
                                    ? 'bg-foreground text-background shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Karyawan
                        </button>
                    </div>
                </div>

                {/* Navigation Menu */}
                <nav aria-label="Navigasi utama" className="flex-1 overflow-y-auto px-3 py-3">
                    <p className="mb-1.5 px-2 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                        Menu
                    </p>
                    <ul className="flex flex-col gap-0.5">
                        {currentNav.map((item) => {
                            const Icon = item.icon;
                            const isCurrent = item.id === 'dashboard';

                            if (item.hasSubmenu) {
                                return (
                                    <li key={item.id}>
                                        <button
                                            type="button"
                                            onClick={() => setPresensiDropdownOpen(!presensiDropdownOpen)}
                                            className="relative flex w-full items-center justify-between gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-foreground transition-colors"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <Icon className="size-4 shrink-0" />
                                                <span>{item.label}</span>
                                            </div>
                                            <ChevronDown
                                                className={`size-3.5 transition-transform ${
                                                    presensiDropdownOpen ? 'rotate-180' : ''
                                                }`}
                                            />
                                        </button>
                                        {presensiDropdownOpen && (
                                            <ul className="ml-6 mt-1 flex flex-col gap-1 border-l border-sidebar-border pl-2">
                                                {item.submenus?.map((sub) => (
                                                    <li key={sub.id}>
                                                        <Link
                                                            href={sub.href}
                                                            className="block rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                                                        >
                                                            {sub.label}
                                                        </Link>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </li>
                                );
                            }

                            return (
                                <li key={item.id}>
                                    <Link
                                        href={item.href}
                                        className={`relative flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors ${
                                            isCurrent
                                                ? 'bg-card font-medium text-foreground shadow-[0_0_0_1px_var(--border)]'
                                                : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-foreground'
                                        }`}
                                    >
                                        {isCurrent && (
                                            <span
                                                className="absolute top-1/2 -left-px h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary"
                                                aria-hidden="true"
                                            />
                                        )}
                                        <Icon className="size-4 shrink-0 text-foreground" />
                                        <span>{item.label}</span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                {/* User Profile Footer */}
                <div className="border-t border-sidebar-border p-3">
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                            className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-sidebar-accent transition-colors"
                        >
                            {user?.photo_url ? (
                                <img
                                    src={user.photo_url}
                                    alt={user.name}
                                    className="size-8 rounded-full object-cover"
                                />
                            ) : (
                                <div className="flex size-8 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
                                    {getInitials(user?.name)}
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-semibold text-foreground">
                                    {user?.name || 'Pengguna'}
                                </p>
                                <p className="truncate text-[11px] text-muted-foreground capitalize">
                                    {user?.employee?.position || (user?.role === 'admin' ? 'Admin Studio' : 'Karyawan')}
                                </p>
                            </div>
                            <ChevronDown className="size-3 text-muted-foreground" />
                        </button>

                        {userDropdownOpen && (
                            <div className="absolute bottom-full left-0 mb-2 w-full rounded-lg border border-border bg-card p-1 shadow-lg">
                                <Link
                                    href={route('profile.edit')}
                                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs text-foreground hover:bg-accent"
                                >
                                    <Settings className="size-3.5" />
                                    <span>Pengaturan Akun</span>
                                </Link>
                                <Link
                                    href={route('logout')}
                                    method="post"
                                    as="button"
                                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs text-destructive hover:bg-destructive/10"
                                >
                                    <LogOut className="size-3.5" />
                                    <span>Keluar</span>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* Mobile Sidebar Overlay */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-xs lg:hidden"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Mobile Sidebar Drawer */}
            <div
                className={`fixed inset-y-0 left-0 z-50 w-72 bg-sidebar transition-transform duration-300 lg:hidden border-r border-sidebar-border ${
                    mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="flex h-16 items-center justify-between px-5 border-b border-sidebar-border">
                    <img
                        src={companyLogo}
                        alt={studio?.name || 'RIM Projects'}
                        className="h-8 w-auto max-w-[110px] object-contain"
                    />
                    <button
                        type="button"
                        onClick={() => setMobileMenuOpen(false)}
                        className="rounded-md p-1.5 text-muted-foreground hover:text-foreground"
                    >
                        <X className="size-5" />
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto px-4 py-4">
                    <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Menu</p>
                    <ul className="flex flex-col gap-1">
                        {currentNav.map((item) => {
                            const Icon = item.icon;
                            return (
                                <li key={item.id}>
                                    <Link
                                        href={item.href}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground hover:bg-sidebar-accent"
                                    >
                                        <Icon className="size-4 text-foreground" />
                                        <span>{item.label}</span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>
            </div>

            {/* Main Area */}
            <div className="flex flex-1 flex-col min-w-0">
                {/* Header */}
                <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-sm sm:px-6">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen(true)}
                            className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
                            aria-label="Buka menu"
                        >
                            <Menu className="size-5" />
                        </button>

                        {/* Search Bar */}
                        <div className="relative hidden md:block">
                            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Cari proyek, karyawan, tugas..."
                                className="h-9 w-64 rounded-lg border border-input bg-background pl-9 pr-12 text-xs focus:border-ring focus:outline-hidden focus:ring-1 focus:ring-ring lg:w-80"
                            />
                            <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                ⌘K
                            </kbd>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Real-time WIB Server Clock */}
                        <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5">
                            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="font-mono text-xs font-medium text-foreground tracking-tight">
                                {currentTime || 'WIB'}
                            </span>
                        </div>

                        {/* Role Badge Indicator */}
                        <span className="hidden sm:inline-flex rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-accent-foreground border border-primary/20 capitalize">
                            {perspective === 'admin' ? 'Admin Studio' : 'Karyawan'}
                        </span>
                    </div>
                </header>

                {/* Main Content Slot */}
                <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
