import { useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import {
    ArrowUpRight,
    CheckCircle2,
    Circle,
    Clock,
    FolderKanban,
    ListTodo,
    Plus,
    Repeat,
    Trash2,
} from 'lucide-react';
import { type Role } from '@/lib/studio-data';
import { cn } from '@/lib/utils';
import { PageProps } from '@/types';

export interface DailyTaskItem {
    id: number;
    user_id: number;
    work_date: string;
    title: string;
    status: 'in_progress' | 'review' | 'done' | 'carried_over';
    review_target?: 'pm' | 'owner' | null;
    notes?: string | null;
    is_carried_over?: boolean;
    project_id?: number | null;
    project_name?: string | null;
    project_task_id?: number | null;
    project_task_title?: string | null;
    project_task_status?: string | null;
    assigned_by_name?: string | null;
    completed_at?: string | null;
}

export interface AccessibleProjectWithTasks {
    id: number;
    name: string;
    client_name?: string | null;
    tasks: { id: number; title: string; status: string }[];
}

export function DailyFocusWidget({ role }: { role: Role }) {
    const pageProps = usePage<
        PageProps & {
            todayDailyTasks?: DailyTaskItem[];
            dailyTaskProjects?: AccessibleProjectWithTasks[];
        }
    >().props;

    const tasks = pageProps.todayDailyTasks ?? [];
    const projects = pageProps.dailyTaskProjects ?? [];

    const [title, setTitle] = useState('');
    const [projectId, setProjectId] = useState<string>('');
    const [submitting, setSubmitting] = useState(false);

    const doneCount = tasks.filter((t) => t.status === 'done').length;

    const handleQuickAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        setSubmitting(true);
        router.post(
            route('daily-tasks.store'),
            {
                title: title.trim(),
                project_id: projectId ? Number(projectId) : null,
            },
            {
                preserveScroll: true,
                onSuccess: () => setTitle(''),
                onFinish: () => setSubmitting(false),
            },
        );
    };

    const handleToggleDone = (task: DailyTaskItem) => {
        const nextStatus = task.status === 'done' ? 'in_progress' : 'done';
        router.patch(
            route('daily-tasks.update', task.id),
            { status: nextStatus },
            { preserveScroll: true },
        );
    };

    const handleDelete = (task: DailyTaskItem) => {
        router.delete(route('daily-tasks.destroy', task.id), { preserveScroll: true });
    };

    return (
        <section
            aria-labelledby="daily-focus-title"
            className="flex flex-col rounded-xl border bg-card shadow-2xs"
        >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <ListTodo className="size-4" aria-hidden="true" />
                    </span>
                    <div>
                        <h2 id="daily-focus-title" className="text-sm font-semibold">
                            Fokus Kerja Hari Ini
                        </h2>
                        <p className="text-xs text-muted-foreground">
                            {tasks.length === 0
                                ? 'Tulis rencana kerja Anda hari ini agar PM & tim mengetahui progres harian.'
                                : `${doneCount} dari ${tasks.length} to-do hari ini selesai`}
                        </p>
                    </div>
                </div>
                <Link
                    href={route('daily-tasks.index')}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                    <span>{role === 'admin' ? 'Pantauan Kerja Tim' : 'Kelola Kerja Hari Ini'}</span>
                    <ArrowUpRight className="size-3.5" />
                </Link>
            </div>

            <div className="flex flex-col gap-3 p-4">
                {/* WA-speed 1-row quick add */}
                <form onSubmit={handleQuickAdd} className="flex flex-col gap-2 sm:flex-row">
                    <select
                        value={projectId}
                        onChange={(e) => setProjectId(e.target.value)}
                        aria-label="Pilih proyek atau umum"
                        className="h-9 rounded-lg border bg-background px-2.5 text-xs outline-none focus-visible:border-ring sm:w-48"
                    >
                        <option value="">Umum / Internal Divisi</option>
                        {projects.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name}
                            </option>
                        ))}
                    </select>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Ketik to-do hari ini (misal: Konseptual V2 Pak Rudy, cek draft DED)..."
                        className="h-9 flex-1 rounded-lg border bg-background px-3 text-xs outline-none focus-visible:border-ring"
                    />
                    <button
                        type="submit"
                        disabled={submitting || !title.trim()}
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                    >
                        <Plus className="size-3.5" />
                        Tambah
                    </button>
                </form>

                {/* Task list */}
                {tasks.length === 0 ? (
                    <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-5 text-center text-xs text-muted-foreground">
                        Belum ada to-do hari ini. Ketik langsung di kolom atas atau buka halaman{' '}
                        <Link href={route('daily-tasks.index')} className="font-medium text-primary hover:underline">
                            {role === 'admin' ? 'Kerja Tim' : 'Kerja Hari Ini'}
                        </Link>
                        .
                    </div>
                ) : (
                    <>
                        <ul className="max-h-[260px] divide-y overflow-y-auto rounded-lg border bg-background/50">
                            {tasks.slice(0, 6).map((task) => {
                            const isDone = task.status === 'done';
                            const isReview = task.status === 'review';
                            const isCarried = task.status === 'carried_over';
                            return (
                                <li
                                    key={task.id}
                                    className="flex items-start justify-between gap-3 px-3.5 py-2.5 text-xs"
                                >
                                    <div className="flex min-w-0 flex-1 items-start gap-2.5">
                                        <button
                                            type="button"
                                            onClick={() => handleToggleDone(task)}
                                            title={isDone ? 'Tandai belum selesai' : 'Tandai selesai'}
                                            className="mt-0.5 shrink-0 text-muted-foreground transition-colors hover:text-primary"
                                        >
                                            {isDone ? (
                                                <CheckCircle2 className="size-4 text-success" />
                                            ) : (
                                                <Circle className="size-4" />
                                            )}
                                        </button>
                                        <div className="min-w-0 flex-1">
                                            <p
                                                className={cn(
                                                    'font-medium leading-snug',
                                                    isDone && 'text-muted-foreground line-through',
                                                )}
                                            >
                                                {task.title}
                                            </p>
                                            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                                                {task.project_name ? (
                                                    <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-px font-medium text-primary">
                                                        <FolderKanban className="size-2.5" />
                                                        {task.project_name}
                                                    </span>
                                                ) : (
                                                    <span className="rounded bg-muted px-1.5 py-px">Umum</span>
                                                )}
                                                {task.project_task_title && (
                                                    <span className="truncate rounded bg-accent px-1.5 py-px text-accent-foreground">
                                                        Sub-task: {task.project_task_title}
                                                    </span>
                                                )}
                                                {task.is_carried_over && (
                                                    <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-px font-medium text-amber-800">
                                                        <Repeat className="size-2.5" />
                                                        Lanjutan Kemarin
                                                    </span>
                                                )}
                                                {isReview && (
                                                    <span
                                                        className={cn(
                                                            'inline-flex items-center gap-0.5 rounded px-1.5 py-px font-medium',
                                                            task.review_target === 'owner'
                                                                ? 'bg-indigo-100 text-indigo-800'
                                                                : 'bg-purple-100 text-purple-800',
                                                        )}
                                                    >
                                                        <Clock className="size-2.5" />
                                                        {task.review_target === 'owner'
                                                            ? 'Review Owner'
                                                            : 'Review PM'}
                                                    </span>
                                                )}
                                                {isCarried && (
                                                    <span className="rounded bg-amber-50 px-1.5 py-px text-amber-700">
                                                        Dilanjutkan Besok
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(task)}
                                        title="Hapus to-do"
                                        className="rounded p-1 text-muted-foreground/70 hover:bg-destructive/10 hover:text-destructive"
                                    >
                                        <Trash2 className="size-3.5" />
                                    </button>
                                </li>
                            );
                            })}
                        </ul>
                        {tasks.length > 6 && (
                            <Link
                                href={route('daily-tasks.index')}
                                className="text-center text-xs font-medium text-primary hover:underline"
                            >
                                Lihat {tasks.length - 6} to-do lainnya di Kerja Tim →
                            </Link>
                        )}
                    </>
                )}
            </div>
        </section>
    );
}
