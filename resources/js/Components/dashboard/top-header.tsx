import { useEffect, useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Bell, CheckCircle2, LogIn, Menu, Search } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';
import { Kbd } from '@/Components/ui/kbd';
import { cn } from '@/lib/utils';
import { type PageProps } from '@/types';
import { formatClock, useAttendance } from './attendance-context';

export function TopHeader({ onOpenMenu }: { onOpenMenu: () => void }) {
    const { notifications: serverNotifications = [] } = usePage<PageProps>().props;
    const inputRef = useRef<HTMLInputElement>(null);
    const [isMac, setIsMac] = useState(true);
    const [items, setItems] = useState(serverNotifications);
    const { now, checkedInAt, checkedOutAt, checkIn } = useAttendance();

    useEffect(() => {
        setItems(serverNotifications);
    }, [serverNotifications]);

    const unread = items.filter((n) => n.unread).length;
    const isWorking = !!checkedInAt && !checkedOutAt;
    const hasCheckedOut = !!checkedOutAt;

    const handleMarkAllRead = () => {
        setItems((prev) => prev.map((n) => ({ ...n, unread: false })));
        router.post(
            route('notifications.mark-read'),
            {},
            { preserveScroll: true, preserveState: true },
        );
    };

    const handleNotificationClick = (item: (typeof items)[number]) => {
        if (item.unread) {
            setItems((prev) =>
                prev.map((x) => (x.id === item.id ? { ...x, unread: false } : x)),
            );
            router.post(
                route('notifications.mark-read'),
                {},
                {
                    preserveScroll: true,
                    preserveState: true,
                    onFinish: () => {
                        if (item.url) {
                            router.visit(item.url);
                        }
                    },
                },
            );
            return;
        }
        if (item.url) {
            router.visit(item.url);
        }
    };

    useEffect(() => {
        setIsMac(/Mac|iPhone|iPad/.test(navigator.platform));
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                inputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur-md md:px-6">
            <button
                type="button"
                onClick={onOpenMenu}
                className="-ml-1 rounded-md p-2 text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 lg:hidden"
            >
                <Menu className="size-5" aria-hidden="true" />
                <span className="sr-only">Buka menu navigasi</span>
            </button>

            <div className="relative max-w-md flex-1">
                <label htmlFor="global-search" className="sr-only">
                    Cari proyek, karyawan, atau dokumen
                </label>
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <input
                    ref={inputRef}
                    id="global-search"
                    type="search"
                    placeholder="Cari proyek, karyawan, dokumen…"
                    className="h-9 w-full rounded-lg border bg-card pr-16 pl-9 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20"
                />
                <span className="pointer-events-none absolute top-1/2 right-2 hidden -translate-y-1/2 items-center gap-0.5 sm:flex">
                    <Kbd>{isMac ? '⌘' : 'Ctrl'}</Kbd>
                    <Kbd>K</Kbd>
                </span>
            </div>

            <div className="ml-auto flex items-center gap-2">
                <div
                    className="hidden items-center gap-2 rounded-lg border bg-card px-2.5 py-1.5 md:flex"
                    aria-label="Jam server"
                >
                    <span className="relative flex size-1.5">
                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
                        <span className="relative inline-flex size-1.5 rounded-full bg-success" />
                    </span>
                    <span className="text-[11px] font-medium text-muted-foreground">WIB</span>
                    <time className="font-mono text-xs font-medium tabular-nums" suppressHydrationWarning>
                        {now ? formatClock(now) : '--:--:--'}
                    </time>
                </div>

                <button
                    type="button"
                    onClick={() => router.visit(route('attendance.index'))}
                    disabled={isWorking || hasCheckedOut}
                    className={cn(
                        'inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/30',
                        isWorking || hasCheckedOut
                            ? 'border bg-card text-success'
                            : 'bg-primary text-primary-foreground hover:bg-primary/90',
                    )}
                >
                    {isWorking || hasCheckedOut ? (
                        <CheckCircle2 className="size-4" aria-hidden="true" />
                    ) : (
                        <LogIn className="size-4" aria-hidden="true" />
                    )}
                    <span className="hidden sm:inline">
                        {hasCheckedOut
                            ? 'Presensi Selesai'
                            : isWorking
                              ? 'Sudah Check-in'
                              : 'Check-in Cepat'}
                    </span>
                    <span className="sm:hidden">
                        {hasCheckedOut ? 'Selesai' : isWorking ? 'Hadir' : 'Check-in'}
                    </span>
                </button>

                <DropdownMenu>
                    <DropdownMenuTrigger className="relative inline-flex size-9 items-center justify-center rounded-lg border bg-card text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30">
                        <Bell className="size-4" aria-hidden="true" />
                        <span className="sr-only">Notifikasi, {unread} belum dibaca</span>
                        {unread > 0 && (
                            <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                                {unread}
                            </span>
                        )}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-80">
                        <DropdownMenuGroup>
                            <DropdownMenuLabel className="flex items-center justify-between">
                                <span>Notifikasi</span>
                                {unread > 0 && (
                                    <button
                                        type="button"
                                        onClick={handleMarkAllRead}
                                        className="text-xs font-normal text-primary hover:underline"
                                    >
                                        Tandai dibaca
                                    </button>
                                )}
                            </DropdownMenuLabel>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            {items.length === 0 ? (
                                <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                                    Belum ada notifikasi aktivitas terbaru.
                                </div>
                            ) : (
                                items.map((n) => (
                                    <DropdownMenuItem
                                        key={n.id}
                                        onClick={() => handleNotificationClick(n)}
                                        className="cursor-pointer items-start gap-2.5 py-2"
                                    >
                                        <span
                                            className={cn('mt-1.5 size-1.5 shrink-0 rounded-full', n.unread ? 'bg-primary' : 'bg-transparent')}
                                            aria-hidden="true"
                                        />
                                        <span className="flex flex-col gap-0.5">
                                            <span className={cn('text-sm leading-snug', n.unread ? 'font-medium' : 'text-muted-foreground')}>
                                                {n.title}
                                            </span>
                                            <span className="text-xs text-muted-foreground">{n.time}</span>
                                        </span>
                                    </DropdownMenuItem>
                                ))
                            )}
                        </DropdownMenuGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
