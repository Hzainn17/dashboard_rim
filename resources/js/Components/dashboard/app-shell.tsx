import * as React from 'react';
import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Construction } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/Components/ui/sheet';
import { FlashToast } from '@/Components/ui/flash-toast';
import { adminNav, isAdminRole, karyawanNav, type Role } from '@/lib/studio-data';
import { PageProps } from '@/types';
import { AttendanceProvider } from './attendance-context';
import { DashboardOverview } from './dashboard-overview';
import { SidebarContent } from './sidebar-content';
import { TopHeader } from './top-header';

function findLabel(role: Role, id: string) {
    const nav = role === 'admin' ? adminNav : karyawanNav;
    for (const item of nav) {
        if (item.id === id) return item.label;
        const child = item.children?.find((c) => c.id === id);
        if (child) return child.label;
    }
    return '';
}

export function AppShell({
    initialRole = 'admin',
    initialActive = 'dashboard',
    children,
}: {
    initialRole?: Role;
    initialActive?: string;
    children?: React.ReactNode;
}) {
    const { auth } = usePage<PageProps>().props;
    const role: Role = auth?.user?.role
        ? isAdminRole(auth.user.role)
            ? 'admin'
            : 'karyawan'
        : initialRole;
    const [active, setActive] = useState(initialActive);
    const [mobileOpen, setMobileOpen] = useState(false);

    const handleNavigate = (id: string) => {
        setMobileOpen(false);
        if (id === 'dashboard') {
            router.visit(route('dashboard'));
            return;
        }
        if (id === 'karyawan') {
            router.visit(route('employees.index'));
            return;
        }
        if (id === 'presensi-harian' || id === 'presensi-saya') {
            router.visit(route('attendance.index'));
            return;
        }
        if (id === 'presensi-approval') {
            router.visit(route('attendance.approvals'));
            return;
        }
        if (id === 'presensi-rekap') {
            router.visit(route('attendance.monitoring'));
            return;
        }
        if (id === 'projects') {
            router.visit(route('projects.index'));
            return;
        }
        if (id === 'field-projects') {
            router.visit(route('projects.field'));
            return;
        }
        if (id === 'kalender') {
            router.visit(route('calendar.index'));
            return;
        }
        if (id === 'payroll') {
            router.visit(route('payroll.index'));
            return;
        }
        if (id === 'profil' || id === 'slip') {
            router.visit(route('my-profile.index'));
            return;
        }
        if (id === 'pengaturan') {
            router.visit(route('settings.index'));
            return;
        }
        setActive(id);
    };

    const sidebarProps = { role, active, onNavigate: handleNavigate };

    return (
        <AttendanceProvider>
            <div className="flex min-h-dvh">
                <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-r bg-sidebar lg:block">
                    <SidebarContent {...sidebarProps} />
                </aside>

                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                    <SheetContent side="left" className="w-72 gap-0 bg-sidebar p-0" showCloseButton={false}>
                        <SheetTitle className="sr-only">Navigasi</SheetTitle>
                        <SidebarContent {...sidebarProps} />
                    </SheetContent>
                </Sheet>

                <div className="flex min-w-0 flex-1 flex-col">
                    <TopHeader onOpenMenu={() => setMobileOpen(true)} />
                    <main className="flex-1 px-4 py-6 md:px-6 lg:px-8 lg:py-8">
                        {active === initialActive && children ? (
                            children
                        ) : active === 'dashboard' ? (
                            <DashboardOverview role={role} />
                        ) : (
                            <SectionPlaceholder
                                title={findLabel(role, active)}
                                onBack={() => handleNavigate('dashboard')}
                            />
                        )}
                    </main>
                </div>
            </div>
            <FlashToast />
        </AttendanceProvider>
    );
}

function SectionPlaceholder({ title, onBack }: { title: string; onBack: () => void }) {
    return (
        <div className="mx-auto flex max-w-lg flex-col items-center gap-3 rounded-xl border border-dashed bg-card px-6 py-16 text-center">
            <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <Construction className="size-5" aria-hidden="true" />
            </span>
            <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">
                Modul ini sedang disiapkan. Kembali ke ringkasan untuk melihat presensi dan proyek hari ini.
            </p>
            <button
                type="button"
                onClick={onBack}
                className="mt-2 rounded-lg bg-foreground px-3 py-1.5 text-sm font-medium text-background outline-none hover:bg-foreground/90 focus-visible:ring-3 focus-visible:ring-ring/30"
            >
                Kembali ke Ringkasan
            </button>
        </div>
    );
}
