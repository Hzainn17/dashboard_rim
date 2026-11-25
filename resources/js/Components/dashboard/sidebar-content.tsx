import * as React from 'react';
import { router, usePage } from '@inertiajs/react';
import { ChevronDown, LogOut } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/Components/ui/collapsible';
import {
    adminNav,
    isAdminRole,
    isSuperAdminRole,
    karyawanNav,
    regularAdminNav,
    type Role,
} from '@/lib/studio-data';
import { cn } from '@/lib/utils';
import { PageProps } from '@/types';
import { MemberAvatar } from './member-avatar';

type SidebarContentProps = {
    role: Role;
    active: string;
    onNavigate: (id: string) => void;
};

export function BrandMark() {
    const { studio } = usePage<PageProps>().props;
    const logoUrl = studio?.logo_url || '/rim-projects-logo.png';

    return (
        <div className="flex items-center gap-3">
            <img src={logoUrl} alt={studio?.name || 'RIM Projects'} width={705} height={354} className="h-9 w-auto max-w-[110px] object-contain" />
            <div className="border-l pl-3 leading-tight">
                <p className="text-sm font-semibold tracking-tight">Studio</p>
                <p className="text-[11px] text-muted-foreground">Arsitektur</p>
            </div>
        </div>
    );
}

export function SidebarContent({ role, active, onNavigate }: SidebarContentProps) {
    const { auth, sidebarBadges } = usePage<PageProps>().props;
    const approvalsBadge = sidebarBadges?.approvals ?? 0;
    const dailyReviewsBadge = sidebarBadges?.daily_reviews ?? 0;
    const isSuperAdmin = isSuperAdminRole(auth?.user?.role);
    const isAdmin = isAdminRole(auth?.user?.role) || role === 'admin';
    const isFieldWorker = auth?.workType === 'lapangan';
    const isFreelancer = Boolean(auth?.isFreelancer);
    const nav = isSuperAdmin
        ? adminNav
        : isAdmin
        ? regularAdminNav
        : karyawanNav.filter((item) => {
              if (isFreelancer && (item.id === 'presensi-saya' || item.id === 'slip-gaji')) return false;
              if (isFieldWorker && item.id === 'projects') return false;
              if (!isFieldWorker && item.id === 'field-projects') return false;
              return true;
          });
    const displayName = auth?.user?.name || 'Tim Studio';
    const roleLabel =
        auth?.user?.employee?.position ||
        (isSuperAdmin ? 'Super Admin' : isAdmin ? 'Admin Studio' : 'Karyawan');

    return (
        <div className="flex h-full flex-col">
            <div className="flex h-16 items-center px-5">
                <BrandMark />
            </div>

            <nav aria-label="Navigasi utama" className="flex-1 overflow-y-auto px-3 pt-2">
                <p className="mb-1.5 px-2 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">Menu</p>
                <ul className="flex flex-col gap-0.5">
                    {nav.map((item) => {
                        const Icon = item.icon;
                        if (item.children) {
                            const childActive = item.children.some((c) => c.id === active);
                            return (
                                <li key={item.id}>
                                    <Collapsible defaultOpen={childActive}>
                                        <CollapsibleTrigger
                                            className={cn(
                                                'group flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring/50',
                                                childActive ? 'text-foreground' : 'text-sidebar-foreground/80',
                                            )}
                                        >
                                            <Icon className="size-4 shrink-0" aria-hidden="true" />
                                            <span className="flex-1 text-left">{item.label}</span>
                                            {item.id === 'presensi' && approvalsBadge > 0 && (
                                                <span
                                                    aria-label={`${approvalsBadge} approval menunggu`}
                                                    className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 text-[10px] font-bold text-white tabular-nums"
                                                >
                                                    {approvalsBadge > 99 ? '99+' : approvalsBadge}
                                                </span>
                                            )}
                                            <ChevronDown
                                                className="size-3.5 text-muted-foreground transition-transform group-data-[panel-open]:rotate-180"
                                                aria-hidden="true"
                                            />
                                        </CollapsibleTrigger>
                                        <CollapsibleContent>
                                            <ul className="mt-0.5 ml-[17px] flex flex-col gap-0.5 border-l pl-3">
                                                {item.children.map((child) => (
                                                    <li key={child.id}>
                                                        <NavButton active={active === child.id} onClick={() => onNavigate(child.id)}>
                                                            <span className="flex-1">{child.label}</span>
                                                            {child.id === 'presensi-approval' && approvalsBadge > 0 && (
                                                                <span className="inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-rose-600 px-1.5 text-[10px] font-bold text-white tabular-nums">
                                                                    {approvalsBadge > 99 ? '99+' : approvalsBadge}
                                                                </span>
                                                            )}
                                                        </NavButton>
                                                    </li>
                                                ))}
                                            </ul>
                                        </CollapsibleContent>
                                    </Collapsible>
                                </li>
                            );
                        }
                        return (
                            <li key={item.id}>
                                <NavButton active={active === item.id} onClick={() => onNavigate(item.id)}>
                                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                                    <span className="flex-1">{item.label}</span>
                                    {item.id === 'daily-tasks' && dailyReviewsBadge > 0 && (
                                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-purple-600 px-1.5 text-[10px] font-bold text-white tabular-nums">
                                            {dailyReviewsBadge > 99 ? '99+' : dailyReviewsBadge}
                                        </span>
                                    )}
                                </NavButton>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            <div className="border-t p-3">
                <div className="flex items-center gap-3 rounded-lg p-2">
                    <button
                        type="button"
                        onClick={() => router.visit(route('my-profile.index'))}
                        title="Buka Profil Saya"
                        className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-left outline-none transition hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                        <MemberAvatar
                            id={auth?.user?.id ?? 0}
                            name={displayName}
                            photoUrl={auth?.user?.photo_url}
                            className="size-9 shrink-0 text-xs ring-0"
                        />
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{displayName}</p>
                            <span
                                className={cn(
                                    'mt-0.5 inline-flex rounded-full px-1.5 py-px text-[10px] font-medium',
                                    role === 'admin' ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground',
                                )}
                            >
                                {roleLabel}
                            </span>
                        </div>
                    </button>
                    <button
                        type="button"
                        onClick={() => router.post(route('logout'))}
                        title="Keluar"
                        className="rounded-md p-1.5 text-muted-foreground transition-colors outline-none hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                        <LogOut className="size-4" aria-hidden="true" />
                        <span className="sr-only">Keluar</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

function NavButton({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-current={active ? 'page' : undefined}
            className={cn(
                'relative flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                active
                    ? 'bg-card font-medium text-foreground shadow-[0_0_0_1px_var(--border)]'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-foreground',
            )}
        >
            {active && <span className="absolute top-1/2 -left-px h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary" aria-hidden="true" />}
            {children}
        </button>
    );
}
