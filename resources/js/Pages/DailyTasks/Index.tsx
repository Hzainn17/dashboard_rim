import * as React from 'react';
import { useMemo, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import {
    CalendarDays,
    Check,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Circle,
    Clock,
    Copy,
    FolderKanban,
    History,
    ListTodo,
    MessageSquare,
    Pencil,
    Plus,
    Repeat,
    Send,
    Trash2,
    Users,
    X,
} from 'lucide-react';
import { AppShell } from '@/Components/dashboard/app-shell';
import {
    type AccessibleProjectWithTasks,
    type DailyTaskItem,
} from '@/Components/dashboard/daily-focus-widget';
import { MemberAvatar } from '@/Components/dashboard/member-avatar';
import { cn } from '@/lib/utils';
import { PageProps } from '@/types';

interface TeamMemberBoard {
    id: number;
    name: string;
    photo_url?: string | null;
    position: string;
    department: string;
    is_lead?: boolean;
    presence_status: 'hadir' | 'site_visit' | 'izin' | 'freelance' | 'belum_absen';
    presence_label: string;
    tasks: DailyTaskItem[];
    done_count: number;
    total_count: number;
}

interface SummaryMetrics {
    total_staff: number;
    staff_with_plan: number;
    total_tasks: number;
    in_review_count: number;
    done_count: number;
}

interface Props {
    selectedDate: string;
    selectedDateFormatted: string;
    todayDate: string;
    selectedDepartment: string;
    departments: string[];
    canFilterAllDepartments: boolean;
    canManageTeam: boolean;
    myTasks: DailyTaskItem[];
    unfinishedPreviousCount: number;
    accessibleProjects: AccessibleProjectWithTasks[];
    teamBoard: TeamMemberBoard[];
    summary: SummaryMetrics;
}

const presenceBadgeStyle: Record<TeamMemberBoard['presence_status'], string> = {
    hadir: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200',
    site_visit: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
    izin: 'bg-purple-50 text-purple-800 ring-1 ring-purple-200',
    freelance: 'bg-indigo-50 text-indigo-800 ring-1 ring-indigo-200',
    belum_absen: 'bg-stone-100 text-stone-600 ring-1 ring-stone-200',
};

const statusConfig: Record<
    DailyTaskItem['status'],
    { label: string; badge: string }
> = {
    in_progress: {
        label: 'Dikerjakan',
        badge: 'bg-sky-50 text-sky-800 ring-1 ring-sky-200',
    },
    review: {
        label: 'Minta Review',
        badge: 'bg-purple-50 text-purple-800 ring-1 ring-purple-200',
    },
    done: {
        label: 'Selesai',
        badge: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200',
    },
    carried_over: {
        label: 'Lanjut Besok',
        badge: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
    },
};

export default function DailyTasksIndex({
    selectedDate,
    selectedDateFormatted,
    todayDate,
    selectedDepartment,
    departments,
    canFilterAllDepartments,
    canManageTeam,
    myTasks,
    unfinishedPreviousCount,
    accessibleProjects,
    teamBoard,
    summary,
}: Props) {
    const { auth, flash } = usePage<PageProps>().props;
    const isSuperAdmin = auth?.user?.role === 'super_admin';
    const isAdmin = isSuperAdmin || auth?.user?.role === 'admin';
    const initialRole = isAdmin ? 'admin' : 'karyawan';

    const [activeTab, setActiveTab] = useState<'team' | 'mine'>(canManageTeam ? 'team' : 'mine');
    const [teamFilter, setTeamFilter] = useState<'all' | 'review' | 'empty'>('all');
    const [copiedWa, setCopiedWa] = useState(false);
    const [expandedCards, setExpandedCards] = useState<Record<number, boolean>>({});
    const [myProjectFilter, setMyProjectFilter] = useState<string>('all');

    // Quick-add state (WA-speed)
    const [newProjectId, setNewProjectId] = useState<string>('');
    const [newKanbanTaskId, setNewKanbanTaskId] = useState<string>('');
    const [newTitle, setNewTitle] = useState('');
    const [newNotes, setNewNotes] = useState('');
    const [addingTask, setAddingTask] = useState(false);

    // Editing notes inline
    const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
    const [editingNoteText, setEditingNoteText] = useState('');

    // Editing full daily task inline (fix typos / project / notes without deleting)
    const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
    const [editTaskTitle, setEditTaskTitle] = useState('');
    const [editTaskProjectId, setEditTaskProjectId] = useState('');
    const [editTaskKanbanId, setEditTaskKanbanId] = useState('');
    const [editTaskNotes, setEditTaskNotes] = useState('');
    const [savingTaskEdit, setSavingTaskEdit] = useState(false);

    // PM Assign-to-staff modal
    const [assignTarget, setAssignTarget] = useState<TeamMemberBoard | null>(null);
    const [assignProjectId, setAssignProjectId] = useState('');
    const [assignKanbanId, setAssignKanbanId] = useState('');
    const [assignTitle, setAssignTitle] = useState('');
    const [assignNotes, setAssignNotes] = useState('');
    const [assignSubmitting, setAssignSubmitting] = useState(false);

    const selectedProjectObj = useMemo(
        () => accessibleProjects.find((p) => String(p.id) === newProjectId) ?? null,
        [accessibleProjects, newProjectId],
    );

    const assignProjectObj = useMemo(
        () => accessibleProjects.find((p) => String(p.id) === assignProjectId) ?? null,
        [accessibleProjects, assignProjectId],
    );

    const editTaskProjectObj = useMemo(
        () => accessibleProjects.find((p) => String(p.id) === editTaskProjectId) ?? null,
        [accessibleProjects, editTaskProjectId],
    );

    const startEditingTask = (task: DailyTaskItem) => {
        setEditingNoteId(null);
        setEditingTaskId(task.id);
        setEditTaskTitle(task.title);
        setEditTaskProjectId(task.project_id ? String(task.project_id) : '');
        setEditTaskKanbanId(task.project_task_id ? String(task.project_task_id) : '');
        setEditTaskNotes(task.notes ?? '');
    };

    const cancelEditingTask = () => {
        setEditingTaskId(null);
        setEditTaskTitle('');
        setEditTaskProjectId('');
        setEditTaskKanbanId('');
        setEditTaskNotes('');
    };

    const handleSaveTaskEdit = (e: React.FormEvent, taskId: number) => {
        e.preventDefault();
        if (!editTaskTitle.trim()) return;
        setSavingTaskEdit(true);
        router.patch(
            route('daily-tasks.update', taskId),
            {
                title: editTaskTitle.trim(),
                project_id: editTaskProjectId ? Number(editTaskProjectId) : null,
                project_task_id: editTaskKanbanId ? Number(editTaskKanbanId) : null,
                notes: editTaskNotes.trim() || null,
            },
            {
                preserveScroll: true,
                onSuccess: () => cancelEditingTask(),
                onFinish: () => setSavingTaskEdit(false),
            },
        );
    };

    const filteredTeamBoard = useMemo(() => {
        if (teamFilter === 'review') {
            return teamBoard.filter((m) => m.tasks.some((t) => t.status === 'review'));
        }
        if (teamFilter === 'empty') {
            return teamBoard.filter((m) => m.total_count === 0);
        }
        return teamBoard;
    }, [teamBoard, teamFilter]);

    const applyFilter = (params: { date?: string; department?: string }) => {
        router.get(
            route('daily-tasks.index'),
            {
                date: params.date ?? selectedDate,
                department: params.department ?? selectedDepartment,
            },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handleQuickAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim()) return;
        setAddingTask(true);
        router.post(
            route('daily-tasks.store'),
            {
                title: newTitle.trim(),
                work_date: selectedDate,
                project_id: newProjectId ? Number(newProjectId) : null,
                project_task_id: newKanbanTaskId ? Number(newKanbanTaskId) : null,
                notes: newNotes.trim() || null,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setNewTitle('');
                    setNewNotes('');
                    setNewKanbanTaskId('');
                },
                onFinish: () => setAddingTask(false),
            },
        );
    };

    const handleAssignSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!assignTarget || !assignTitle.trim()) return;
        setAssignSubmitting(true);
        router.post(
            route('daily-tasks.store'),
            {
                user_id: assignTarget.id,
                title: assignTitle.trim(),
                work_date: selectedDate,
                project_id: assignProjectId ? Number(assignProjectId) : null,
                project_task_id: assignKanbanId ? Number(assignKanbanId) : null,
                notes: assignNotes.trim() || null,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setAssignTarget(null);
                    setAssignTitle('');
                    setAssignNotes('');
                    setAssignProjectId('');
                    setAssignKanbanId('');
                },
                onFinish: () => setAssignSubmitting(false),
            },
        );
    };

    const handleUpdateStatus = (
        task: DailyTaskItem,
        status: DailyTaskItem['status'],
        syncKanbanStatus?: 'in_progress' | 'review' | 'done',
        reviewTarget?: 'pm' | 'owner',
    ) => {
        router.patch(
            route('daily-tasks.update', task.id),
            {
                status,
                ...(reviewTarget ? { review_target: reviewTarget } : {}),
                ...(syncKanbanStatus ? { sync_kanban_status: syncKanbanStatus } : {}),
            },
            { preserveScroll: true },
        );
    };

    const handleSaveNote = (task: DailyTaskItem) => {
        router.patch(
            route('daily-tasks.update', task.id),
            {
                status: task.status,
                notes: editingNoteText,
            },
            {
                preserveScroll: true,
                onSuccess: () => setEditingNoteId(null),
            },
        );
    };

    const handleDeleteTask = (task: DailyTaskItem) => {
        router.delete(route('daily-tasks.destroy', task.id), { preserveScroll: true });
    };

    const handlePullPrevious = () => {
        router.post(
            route('daily-tasks.carry-over'),
            {
                mode: 'pull_previous',
                target_date: selectedDate,
            },
            { preserveScroll: true },
        );
    };

    const handleCopyWhatsAppRecap = () => {
        const divLabel =
            selectedDepartment === 'Semua'
                ? 'Seluruh Divisi Studio'
                : `Tim ${selectedDepartment}`;
        const lines: string[] = [`*To Do List ${divLabel}*`, selectedDateFormatted, ''];

        filteredTeamBoard.forEach((member) => {
            lines.push(`*${member.name}* (${member.presence_label})`);
            if (member.tasks.length === 0) {
                lines.push('- Belum mengisi target hari ini');
            } else {
                member.tasks.forEach((t) => {
                    const prefix = t.project_name ? `[${t.project_name}] ` : '';
                    const st = statusConfig[t.status]?.label ?? t.status;
                    const noteSuffix = t.notes ? ` — _${t.notes}_` : '';
                    lines.push(`- ${prefix}${t.title} (${st})${noteSuffix}`);
                });
            }
            lines.push('');
        });

        const text = lines.join('\n').trim();
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                setCopiedWa(true);
                setTimeout(() => setCopiedWa(false), 2500);
            });
        }
    };

    const yesterdayDate = useMemo(() => {
        const d = new Date(todayDate);
        d.setDate(d.getDate() - 1);
        return d.toISOString().slice(0, 10);
    }, [todayDate]);

    return (
        <>
            <Head title="Kerja Tim" />
            <AppShell initialRole={initialRole} initialActive="daily-tasks">
                <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
                    {/* Header */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div className="flex flex-col gap-1">
                            <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                                {canFilterAllDepartments
                                    ? 'Pantauan Aktivitas Harian & Sub-task Proyek Seluruh Divisi'
                                    : `Aktivitas Harian Divisi ${selectedDepartment} & PM`}
                            </p>
                            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                                {canFilterAllDepartments
                                    ? 'Kerja Tim Harian'
                                    : `Kerja Tim ${selectedDepartment}`}{' '}
                                <span className="font-normal text-muted-foreground">
                                    · {selectedDateFormatted}
                                </span>
                            </h1>
                        </div>

                        {/* Date Controls + Copy WA Recap */}
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="inline-flex rounded-lg border bg-card p-0.5 text-xs">
                                <button
                                    type="button"
                                    onClick={() => applyFilter({ date: yesterdayDate })}
                                    className={cn(
                                        'rounded-md px-2.5 py-1.5 font-medium transition-colors',
                                        selectedDate === yesterdayDate
                                            ? 'bg-primary text-primary-foreground'
                                            : 'text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    Kemarin
                                </button>
                                <button
                                    type="button"
                                    onClick={() => applyFilter({ date: todayDate })}
                                    className={cn(
                                        'rounded-md px-2.5 py-1.5 font-medium transition-colors',
                                        selectedDate === todayDate
                                            ? 'bg-primary text-primary-foreground'
                                            : 'text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    Hari Ini
                                </button>
                            </div>

                            <div className="relative flex items-center">
                                <CalendarDays className="pointer-events-none absolute left-2.5 size-3.5 text-muted-foreground" />
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => applyFilter({ date: e.target.value })}
                                    className="h-9 rounded-lg border bg-card pr-2.5 pl-8 text-xs font-medium outline-none focus-visible:border-ring"
                                />
                            </div>

                            {canManageTeam && activeTab === 'team' && (
                                <button
                                    type="button"
                                    onClick={handleCopyWhatsAppRecap}
                                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 text-xs font-semibold text-emerald-900 transition-colors hover:bg-emerald-100"
                                >
                                    {copiedWa ? (
                                        <>
                                            <Check className="size-3.5 text-emerald-700" />
                                            Tersalin ke Clipboard!
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="size-3.5 text-emerald-700" />
                                            Salin Rekap WA
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Flash Messages */}
                    {flash?.success && (
                        <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-xs font-medium text-success">
                            <CheckCircle2 className="size-4 shrink-0" />
                            <span>{flash.success}</span>
                        </div>
                    )}
                    {flash?.error && (
                        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs font-medium text-destructive">
                            <X className="size-4 shrink-0" />
                            <span>{flash.error}</span>
                        </div>
                    )}

                    {/* Tab Switcher: Pantauan Tim Divisi vs Fokus Saya */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="inline-flex rounded-lg border bg-muted/40 p-1">
                            <button
                                type="button"
                                onClick={() => setActiveTab('team')}
                                className={cn(
                                    'inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors',
                                    activeTab === 'team'
                                        ? 'bg-background text-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                <Users className="size-3.5" />
                                {canFilterAllDepartments
                                    ? `Pantauan Tim (${summary.total_staff})`
                                    : `Tim ${selectedDepartment} (${summary.total_staff})`}
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('mine')}
                                className={cn(
                                    'inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors',
                                    activeTab === 'mine'
                                        ? 'bg-background text-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                <ListTodo className="size-3.5" />
                                Fokus Saya ({myTasks.length})
                            </button>
                        </div>
                    </div>

                    {/* ==================== TAB 1: PANTAUAN TIM (PER DIVISI / ALL FOR SUPER ADMIN) ==================== */}
                    {activeTab === 'team' && (
                        <div className="flex flex-col gap-5">
                            {/* Summary Metrics */}
                            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                                <div className="rounded-xl border bg-card p-4">
                                    <p className="text-xs text-muted-foreground">Staf Mengisi Target</p>
                                    <p className="mt-1 text-2xl font-bold tabular-nums">
                                        {summary.staff_with_plan}
                                        <span className="text-sm font-normal text-muted-foreground">
                                            /{summary.total_staff}
                                        </span>
                                    </p>
                                    <p className="mt-1 text-[11px] text-muted-foreground">
                                        Personel aktif di divisi terpilih
                                    </p>
                                </div>
                                <div className="rounded-xl border bg-card p-4">
                                    <p className="text-xs text-muted-foreground">Total Aktivitas Hari Ini</p>
                                    <p className="mt-1 text-2xl font-bold tabular-nums">
                                        {summary.total_tasks}
                                    </p>
                                    <p className="mt-1 text-[11px] text-muted-foreground">
                                        Gabungan sub-task proyek &amp; umum
                                    </p>
                                </div>
                                <div className="rounded-xl border bg-card p-4">
                                    <p className="text-xs text-muted-foreground">Menunggu Review PM</p>
                                    <p className="mt-1 text-2xl font-bold text-purple-700 tabular-nums">
                                        {summary.in_review_count}
                                    </p>
                                    <p className="mt-1 text-[11px] text-muted-foreground">
                                        Siap diperiksa &amp; di-ACC selesai
                                    </p>
                                </div>
                                <div className="rounded-xl border bg-card p-4">
                                    <p className="text-xs text-muted-foreground">Tugas Tuntas</p>
                                    <p className="mt-1 text-2xl font-bold text-success tabular-nums">
                                        {summary.done_count}
                                    </p>
                                    <p className="mt-1 text-[11px] text-muted-foreground">
                                        Selesai pada {selectedDateFormatted}
                                    </p>
                                </div>
                            </div>

                            {/* Division & Status Filters */}
                            <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex flex-wrap items-center gap-1.5">
                                    {canFilterAllDepartments ? (
                                        departments.map((dept) => (
                                            <button
                                                key={dept}
                                                type="button"
                                                onClick={() => applyFilter({ department: dept })}
                                                className={cn(
                                                    'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                                                    selectedDepartment === dept
                                                        ? 'border-foreground bg-foreground text-background'
                                                        : 'bg-background text-muted-foreground hover:text-foreground',
                                                )}
                                            >
                                                {dept === 'Semua' ? 'Semua Divisi' : dept}
                                            </button>
                                        ))
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                                            Divisi {selectedDepartment}
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-1.5 text-xs">
                                    <button
                                        type="button"
                                        onClick={() => setTeamFilter('all')}
                                        className={cn(
                                            'rounded-md px-2.5 py-1 font-medium',
                                            teamFilter === 'all'
                                                ? 'bg-accent text-accent-foreground'
                                                : 'text-muted-foreground hover:bg-muted',
                                        )}
                                    >
                                        Semua
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTeamFilter('review')}
                                        className={cn(
                                            'rounded-md px-2.5 py-1 font-medium',
                                            teamFilter === 'review'
                                                ? 'bg-purple-100 text-purple-900'
                                                : 'text-muted-foreground hover:bg-muted',
                                        )}
                                    >
                                        Minta Review
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTeamFilter('empty')}
                                        className={cn(
                                            'rounded-md px-2.5 py-1 font-medium',
                                            teamFilter === 'empty'
                                                ? 'bg-amber-100 text-amber-900'
                                                : 'text-muted-foreground hover:bg-muted',
                                        )}
                                    >
                                        Belum Isi Target
                                    </button>
                                </div>
                            </div>

                            {/* Per-Employee Cards Grid */}
                            {filteredTeamBoard.length === 0 ? (
                                <div className="rounded-xl border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
                                    Tidak ada personel yang cocok dengan filter saat ini.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                                    {filteredTeamBoard.map((member) => {
                                        const pct =
                                            member.total_count > 0
                                                ? Math.round((member.done_count / member.total_count) * 100)
                                                : 0;
                                        return (
                                            <div
                                                key={member.id}
                                                className="flex flex-col rounded-xl border bg-card shadow-2xs"
                                            >
                                                {/* Member Header */}
                                                <div className="flex items-start justify-between gap-2 border-b px-4 py-3.5">
                                                    <div className="flex min-w-0 items-center gap-2.5">
                                                        <MemberAvatar
                                                            id={member.id}
                                                            name={member.name}
                                                            photoUrl={member.photo_url}
                                                            className="size-9 shrink-0 text-xs ring-0"
                                                        />
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-1.5">
                                                                <p className="truncate text-sm font-semibold">
                                                                    {member.name}
                                                                </p>
                                                                {member.is_lead && (
                                                                    <span className="shrink-0 rounded bg-primary/15 px-1.5 py-px text-[9px] font-bold text-primary uppercase">
                                                                        PM / Lead
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="truncate text-[11px] text-muted-foreground">
                                                                {member.position} · {member.department}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <span
                                                        className={cn(
                                                            'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                                                            presenceBadgeStyle[member.presence_status],
                                                        )}
                                                    >
                                                        {member.presence_label}
                                                    </span>
                                                </div>

                                                {/* Member Task List (Compact 3 items default + internal scroll when expanded) */}
                                                <div className="flex flex-1 flex-col gap-2 p-4">
                                                    {member.tasks.length === 0 ? (
                                                        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed bg-muted/20 px-3 py-6 text-center text-xs text-muted-foreground">
                                                            Belum mengisi target kerja hari ini.
                                                        </div>
                                                    ) : (
                                                        (() => {
                                                            const COLLAPSED_LIMIT = 3;
                                                            const isExpanded = !!expandedCards[member.id];
                                                            const statusPriority: Record<string, number> = {
                                                                review: 0,
                                                                in_progress: 1,
                                                                carried_over: 2,
                                                                done: 3,
                                                            };
                                                            const sortedTasks = [...member.tasks].sort(
                                                                (a, b) =>
                                                                    (statusPriority[a.status] ?? 9) -
                                                                    (statusPriority[b.status] ?? 9),
                                                            );
                                                            const visibleTasks = isExpanded
                                                                ? sortedTasks
                                                                : sortedTasks.slice(0, COLLAPSED_LIMIT);
                                                            const hiddenCount = Math.max(
                                                                0,
                                                                sortedTasks.length - COLLAPSED_LIMIT,
                                                            );

                                                            return (
                                                                <>
                                                                    <ul
                                                                        className={cn(
                                                                            'flex flex-col gap-2',
                                                                            isExpanded &&
                                                                                'max-h-[380px] overflow-y-auto pr-1',
                                                                        )}
                                                                    >
                                                                        {visibleTasks.map((task) => {
                                                                            const st =
                                                                                statusConfig[task.status] ??
                                                                                statusConfig.in_progress;
                                                                            return (
                                                                                <li
                                                                                    key={task.id}
                                                                                    className="rounded-lg border bg-background/60 p-2.5 text-xs"
                                                                                >
                                                                                    <div className="flex items-start justify-between gap-2">
                                                                                        <p
                                                                                            className={cn(
                                                                                                'font-medium leading-snug',
                                                                                                task.status === 'done' &&
                                                                                                    'text-muted-foreground line-through',
                                                                                            )}
                                                                                        >
                                                                                            {task.title}
                                                                                        </p>
                                                                                        <span
                                                                                            className={cn(
                                                                                                'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold',
                                                                                                task.status === 'review' &&
                                                                                                    task.review_target ===
                                                                                                        'owner'
                                                                                                    ? 'bg-indigo-100 text-indigo-900 ring-1 ring-indigo-200'
                                                                                                    : st.badge,
                                                                                            )}
                                                                                        >
                                                                                            {task.status === 'review'
                                                                                                ? task.review_target ===
                                                                                                  'owner'
                                                                                                    ? 'Review Owner'
                                                                                                    : 'Review PM'
                                                                                                : st.label}
                                                                                        </span>
                                                                                    </div>

                                                                                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                                                                                        {task.project_name ? (
                                                                                            <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-px font-medium text-primary">
                                                                                                <FolderKanban className="size-2.5" />
                                                                                                {task.project_name}
                                                                                            </span>
                                                                                        ) : (
                                                                                            <span className="rounded bg-muted px-1.5 py-px">
                                                                                                Umum
                                                                                            </span>
                                                                                        )}
                                                                                        {task.project_task_title && (
                                                                                            <span className="rounded bg-accent px-1.5 py-px text-accent-foreground">
                                                                                                Kanban:{' '}
                                                                                                {task.project_task_title}
                                                                                            </span>
                                                                                        )}
                                                                                        {task.is_carried_over && (
                                                                                            <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-px text-amber-800">
                                                                                                <Repeat className="size-2.5" />
                                                                                                Lanjutan
                                                                                            </span>
                                                                                        )}
                                                                                    </div>

                                                                                    {task.notes && (
                                                                                        <p
                                                                                            title={task.notes}
                                                                                            className={cn(
                                                                                                'mt-1.5 rounded bg-muted/50 px-2 py-1 text-[11px] text-muted-foreground italic',
                                                                                                !isExpanded && 'line-clamp-2',
                                                                                            )}
                                                                                        >
                                                                                            “{task.notes}”
                                                                                        </p>
                                                                                    )}

                                                                                    {canManageTeam &&
                                                                                        task.status === 'review' &&
                                                                                        (task.review_target !== 'owner' ||
                                                                                            isSuperAdmin) && (
                                                                                            <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t pt-2">
                                                                                                <button
                                                                                                    type="button"
                                                                                                    onClick={() =>
                                                                                                        handleUpdateStatus(
                                                                                                            task,
                                                                                                            'done',
                                                                                                            task.project_task_id
                                                                                                                ? 'done'
                                                                                                                : undefined,
                                                                                                        )
                                                                                                    }
                                                                                                    className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
                                                                                                >
                                                                                                    <Check className="size-3" />
                                                                                                    ACC Selesai
                                                                                                    {task.project_task_id
                                                                                                        ? ' (+ Kanban)'
                                                                                                        : ''}
                                                                                                </button>
                                                                                                <button
                                                                                                    type="button"
                                                                                                    onClick={() =>
                                                                                                        handleUpdateStatus(
                                                                                                            task,
                                                                                                            'in_progress',
                                                                                                        )
                                                                                                    }
                                                                                                    className="inline-flex items-center gap-1 rounded-md border bg-card px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted"
                                                                                                >
                                                                                                    Revisi Lagi
                                                                                                </button>
                                                                                            </div>
                                                                                        )}
                                                                                    {canManageTeam &&
                                                                                        task.status === 'review' &&
                                                                                        task.review_target === 'owner' &&
                                                                                        !isSuperAdmin && (
                                                                                            <p className="mt-2 border-t pt-1.5 text-[10px] font-medium text-indigo-700">
                                                                                                Menunggu ACC langsung dari Owner
                                                                                                (Super Admin)
                                                                                            </p>
                                                                                        )}
                                                                                </li>
                                                                            );
                                                                        })}
                                                                    </ul>

                                                                    {sortedTasks.length > COLLAPSED_LIMIT && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                setExpandedCards((prev) => ({
                                                                                    ...prev,
                                                                                    [member.id]: !prev[member.id],
                                                                                }))
                                                                            }
                                                                            className="mt-0.5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed bg-muted/30 py-1.5 text-[11px] font-semibold text-primary transition-colors hover:bg-accent/60"
                                                                        >
                                                                            {isExpanded ? (
                                                                                <>
                                                                                    <ChevronUp className="size-3.5" />
                                                                                    Ringkas tampilan (tampilkan 3)
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <ChevronDown className="size-3.5" />
                                                                                    Lihat {hiddenCount} tugas lainnya
                                                                                </>
                                                                            )}
                                                                        </button>
                                                                    )}
                                                                </>
                                                            );
                                                        })()
                                                    )}
                                                </div>

                                                {/* Card Footer */}
                                                <div className="flex items-center justify-between border-t px-4 py-2.5 text-xs">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-[11px] text-muted-foreground">
                                                            {member.done_count}/{member.total_count} selesai
                                                        </span>
                                                        {member.total_count > 0 && (
                                                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                                                                <div
                                                                    className="h-full rounded-full bg-primary"
                                                                    style={{ width: `${pct}%` }}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                    {canManageTeam && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setAssignTarget(member)}
                                                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10"
                                                        >
                                                            <Plus className="size-3" />
                                                            Titip Tugas
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ==================== TAB 2: FOKUS SAYA (EMPLOYEE & PERSONAL ADMIN) ==================== */}
                    {activeTab === 'mine' && (
                        <div className="flex flex-col gap-5">
                            {/* Pull Unfinished Yesterday Banner */}
                            {unfinishedPreviousCount > 0 && selectedDate === todayDate && (
                                <div className="flex flex-col gap-2 rounded-xl border border-amber-300 bg-amber-50/90 px-4 py-3 text-xs text-amber-950 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-2">
                                        <History className="size-4 shrink-0 text-amber-700" />
                                        <span>
                                            Ada <strong>{unfinishedPreviousCount} tugas dari hari sebelumnya</strong>{' '}
                                            yang belum selesai. Ingin langsung dilanjutkan hari ini?
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handlePullPrevious}
                                        className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-3 text-xs font-semibold text-white hover:bg-amber-700"
                                    >
                                        <Repeat className="size-3.5" />
                                        Tarik ke Hari Ini
                                    </button>
                                </div>
                            )}

                            {/* Quick-Add Bar (WA-speed) */}
                            <form
                                onSubmit={handleQuickAdd}
                                className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-2xs"
                            >
                                <div className="flex items-center justify-between">
                                    <h2 className="text-sm font-semibold">
                                        Tambah Rencana Kerja ({selectedDateFormatted})
                                    </h2>
                                    <span className="text-[11px] text-muted-foreground">
                                        Sub-task harian tidak membuat kotak duplikat di Kanban proyek
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 gap-2.5 md:grid-cols-12">
                                    <div className="md:col-span-3">
                                        <select
                                            value={newProjectId}
                                            onChange={(e) => {
                                                setNewProjectId(e.target.value);
                                                setNewKanbanTaskId('');
                                            }}
                                            aria-label="Pilih Proyek atau Umum"
                                            className="h-9 w-full rounded-lg border bg-background px-2.5 text-xs outline-none focus-visible:border-ring"
                                        >
                                            <option value="">Umum / Internal Divisi</option>
                                            {accessibleProjects.map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {selectedProjectObj && selectedProjectObj.tasks.length > 0 && (
                                        <div className="md:col-span-3">
                                            <select
                                                value={newKanbanTaskId}
                                                onChange={(e) => setNewKanbanTaskId(e.target.value)}
                                                aria-label="Pilih Kartu Kanban Induk (Opsional)"
                                                className="h-9 w-full rounded-lg border bg-background px-2.5 text-xs outline-none focus-visible:border-ring"
                                            >
                                                <option value="">Sub-task Kanban (Opsional)</option>
                                                {selectedProjectObj.tasks.map((t) => (
                                                    <option key={t.id} value={t.id}>
                                                        {t.title}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div
                                        className={
                                            selectedProjectObj && selectedProjectObj.tasks.length > 0
                                                ? 'md:col-span-4'
                                                : 'md:col-span-7'
                                        }
                                    >
                                        <input
                                            type="text"
                                            required
                                            value={newTitle}
                                            onChange={(e) => setNewTitle(e.target.value)}
                                            placeholder="Ketik aktivitas hari ini (misal: Konseptual V2 Pak Rudy, cek draft DED)..."
                                            className="h-9 w-full rounded-lg border bg-background px-3 text-xs outline-none focus-visible:border-ring"
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <button
                                            type="submit"
                                            disabled={addingTask || !newTitle.trim()}
                                            className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                                        >
                                            <Plus className="size-3.5" />
                                            Tambah
                                        </button>
                                    </div>
                                </div>

                                <input
                                    type="text"
                                    value={newNotes}
                                    onChange={(e) => setNewNotes(e.target.value)}
                                    placeholder="Catatan singkat / kendala (opsional, misal: Menunggu revisi ukuran dari klien)"
                                    className="h-8 w-full rounded-lg border border-dashed bg-muted/20 px-3 text-xs outline-none focus-visible:border-ring"
                                />
                            </form>

                            {/* My Tasks List */}
                            <div className="rounded-xl border bg-card">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3.5">
                                    <div>
                                        <h2 className="text-sm font-semibold">
                                            Daftar To-Do Saya ({myTasks.length})
                                        </h2>
                                        <p className="text-xs text-muted-foreground">
                                            {myTasks.filter((t) => t.status === 'done').length} selesai ·{' '}
                                            {myTasks.filter((t) => t.status === 'in_progress').length} dikerjakan ·{' '}
                                            {myTasks.filter((t) => t.status === 'review').length} menunggu review
                                        </p>
                                    </div>
                                    {myTasks.length > 3 && (
                                        <select
                                            value={myProjectFilter}
                                            onChange={(e) => setMyProjectFilter(e.target.value)}
                                            aria-label="Filter proyek to-do saya"
                                            className="h-8 rounded-lg border bg-background px-2.5 text-xs font-medium outline-none focus-visible:border-ring"
                                        >
                                            <option value="all">Semua Proyek ({myTasks.length})</option>
                                            <option value="general">Umum / Internal</option>
                                            {Array.from(
                                                new Map(
                                                    myTasks
                                                        .filter((t) => t.project_id && t.project_name)
                                                        .map((t) => [String(t.project_id), t.project_name!]),
                                                ).entries(),
                                            ).map(([pid, pname]) => (
                                                <option key={pid} value={pid}>
                                                    {pname}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                {myTasks.length === 0 ? (
                                    <div className="p-10 text-center text-xs text-muted-foreground">
                                        Belum ada to-do yang dicatat pada tanggal {selectedDateFormatted}.
                                    </div>
                                ) : (
                                    <ul className="max-h-[520px] divide-y overflow-y-auto">
                                        {myTasks
                                            .filter((task) => {
                                                if (myProjectFilter === 'all') return true;
                                                if (myProjectFilter === 'general') return !task.project_id;
                                                return String(task.project_id) === myProjectFilter;
                                            })
                                            .map((task) => {
                                            const st = statusConfig[task.status] ?? statusConfig.in_progress;
                                            const isDone = task.status === 'done';

                                            if (editingTaskId === task.id) {
                                                return (
                                                    <li key={task.id} className="bg-muted/30 px-5 py-4">
                                                        <form
                                                            onSubmit={(e) => handleSaveTaskEdit(e, task.id)}
                                                            className="flex flex-col gap-2.5"
                                                        >
                                                            <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                                                                <span>Edit To-Do Harian</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={cancelEditingTask}
                                                                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                                                                >
                                                                    <X className="size-3.5" />
                                                                </button>
                                                            </div>
                                                            <div className="grid grid-cols-1 gap-2 md:grid-cols-12">
                                                                <div className="md:col-span-3">
                                                                    <select
                                                                        value={editTaskProjectId}
                                                                        onChange={(e) => {
                                                                            setEditTaskProjectId(e.target.value);
                                                                            setEditTaskKanbanId('');
                                                                        }}
                                                                        aria-label="Ubah proyek"
                                                                        className="h-9 w-full rounded-lg border bg-background px-2.5 text-xs outline-none focus-visible:border-ring"
                                                                    >
                                                                        <option value="">Umum / Internal Divisi</option>
                                                                        {accessibleProjects.map((p) => (
                                                                            <option key={p.id} value={p.id}>
                                                                                {p.name}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                                {editTaskProjectObj && editTaskProjectObj.tasks.length > 0 && (
                                                                    <div className="md:col-span-3">
                                                                        <select
                                                                            value={editTaskKanbanId}
                                                                            onChange={(e) => setEditTaskKanbanId(e.target.value)}
                                                                            aria-label="Ubah kartu Kanban induk"
                                                                            className="h-9 w-full rounded-lg border bg-background px-2.5 text-xs outline-none focus-visible:border-ring"
                                                                        >
                                                                            <option value="">Sub-task Kanban (Opsional)</option>
                                                                            {editTaskProjectObj.tasks.map((t) => (
                                                                                <option key={t.id} value={t.id}>
                                                                                    {t.title}
                                                                                </option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                )}
                                                                <div
                                                                    className={
                                                                        editTaskProjectObj && editTaskProjectObj.tasks.length > 0
                                                                            ? 'md:col-span-6'
                                                                            : 'md:col-span-9'
                                                                    }
                                                                >
                                                                    <input
                                                                        type="text"
                                                                        required
                                                                        autoFocus
                                                                        value={editTaskTitle}
                                                                        onChange={(e) => setEditTaskTitle(e.target.value)}
                                                                        placeholder="Perbaiki judul aktivitas hari ini..."
                                                                        className="h-9 w-full rounded-lg border bg-background px-3 text-xs outline-none focus-visible:border-ring"
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                                                <input
                                                                    type="text"
                                                                    value={editTaskNotes}
                                                                    onChange={(e) => setEditTaskNotes(e.target.value)}
                                                                    placeholder="Catatan singkat / kendala (opsional)"
                                                                    className="h-8 flex-1 rounded-lg border bg-background px-3 text-xs outline-none focus-visible:border-ring"
                                                                />
                                                                <div className="flex items-center justify-end gap-1.5">
                                                                    <button
                                                                        type="button"
                                                                        onClick={cancelEditingTask}
                                                                        className="h-8 rounded-lg border bg-background px-3 text-xs font-medium text-muted-foreground hover:bg-muted"
                                                                    >
                                                                        Batal
                                                                    </button>
                                                                    <button
                                                                        type="submit"
                                                                        disabled={savingTaskEdit || !editTaskTitle.trim()}
                                                                        className="inline-flex h-8 items-center gap-1 rounded-lg bg-primary px-3.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                                                                    >
                                                                        <Check className="size-3.5" />
                                                                        {savingTaskEdit ? 'Menyimpan...' : 'Simpan'}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </form>
                                                    </li>
                                                );
                                            }

                                            return (
                                                <li key={task.id} className="flex flex-col gap-2.5 px-5 py-4">
                                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                        <div className="flex min-w-0 flex-1 items-start gap-3">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleUpdateStatus(
                                                                        task,
                                                                        isDone ? 'in_progress' : 'done',
                                                                    )
                                                                }
                                                                className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary"
                                                            >
                                                                {isDone ? (
                                                                    <CheckCircle2 className="size-5 text-success" />
                                                                ) : (
                                                                    <Circle className="size-5" />
                                                                )}
                                                            </button>
                                                            <div className="min-w-0 flex-1">
                                                                <p
                                                                    className={cn(
                                                                        'text-sm font-medium',
                                                                        isDone &&
                                                                            'text-muted-foreground line-through',
                                                                    )}
                                                                >
                                                                    {task.title}
                                                                </p>
                                                                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                                                                    {task.project_name ? (
                                                                        <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 font-medium text-primary">
                                                                            <FolderKanban className="size-3" />
                                                                            {task.project_name}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="rounded bg-muted px-2 py-0.5">
                                                                            Umum / Internal
                                                                        </span>
                                                                    )}
                                                                    {task.project_task_title && (
                                                                        <span className="rounded bg-accent px-2 py-0.5 text-accent-foreground">
                                                                            Induk Kanban: {task.project_task_title} (
                                                                            {task.project_task_status})
                                                                        </span>
                                                                    )}
                                                                    {task.is_carried_over && (
                                                                        <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 font-medium text-amber-800">
                                                                            <Repeat className="size-3" />
                                                                            Lanjutan Kemarin
                                                                        </span>
                                                                    )}
                                                                    {task.assigned_by_name && (
                                                                        <span className="rounded bg-stone-100 px-2 py-0.5 text-stone-700">
                                                                            Dititipkan oleh {task.assigned_by_name}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Status Controls */}
                                                        <div className="flex flex-wrap items-center gap-1.5 pl-8 sm:pl-0">
                                                            <span
                                                                className={cn(
                                                                    'rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                                                                    task.status === 'review' &&
                                                                        task.review_target === 'owner'
                                                                        ? 'bg-indigo-100 text-indigo-900 ring-1 ring-indigo-200'
                                                                        : st.badge,
                                                                )}
                                                            >
                                                                {task.status === 'review'
                                                                    ? task.review_target === 'owner'
                                                                        ? 'Review Owner'
                                                                        : 'Review PM'
                                                                    : st.label}
                                                            </span>

                                                            <select
                                                                value={
                                                                    task.status === 'review'
                                                                        ? task.review_target === 'owner'
                                                                            ? 'review_owner'
                                                                            : 'review_pm'
                                                                        : task.status
                                                                }
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    if (val === 'review_pm') {
                                                                        handleUpdateStatus(task, 'review', undefined, 'pm');
                                                                    } else if (val === 'review_owner') {
                                                                        handleUpdateStatus(task, 'review', undefined, 'owner');
                                                                    } else {
                                                                        handleUpdateStatus(
                                                                            task,
                                                                            val as DailyTaskItem['status'],
                                                                        );
                                                                    }
                                                                }}
                                                                aria-label="Ubah status to-do"
                                                                className="h-8 rounded-lg border bg-background px-2 text-xs outline-none"
                                                            >
                                                                <option value="in_progress">Dikerjakan</option>
                                                                <option value="review_pm">Minta Review ke PM / Lead</option>
                                                                <option value="review_owner">Minta Review ke Owner</option>
                                                                <option value="done">Selesai</option>
                                                            </select>

                                                            {task.project_task_id &&
                                                                task.project_task_status !== 'review' &&
                                                                task.project_task_status !== 'done' && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            handleUpdateStatus(
                                                                                task,
                                                                                'review',
                                                                                'review',
                                                                            )
                                                                        }
                                                                        title="Ajukan kartu Kanban induk untuk di-review PM"
                                                                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-2.5 text-[11px] font-semibold text-purple-800 hover:bg-purple-100"
                                                                    >
                                                                        <Send className="size-3" />
                                                                        Review Kanban
                                                                    </button>
                                                                )}

                                                            <button
                                                                type="button"
                                                                onClick={() => startEditingTask(task)}
                                                                title="Edit judul / proyek to-do"
                                                                className="inline-flex h-8 items-center gap-1 rounded-lg border bg-card px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                                                            >
                                                                <Pencil className="size-3.5" />
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setEditingNoteId(
                                                                        editingNoteId === task.id ? null : task.id,
                                                                    );
                                                                    setEditingNoteText(task.notes ?? '');
                                                                }}
                                                                title="Tambah/edit catatan kendala"
                                                                className="inline-flex h-8 items-center gap-1 rounded-lg border bg-card px-2 text-xs text-muted-foreground hover:bg-muted"
                                                            >
                                                                <MessageSquare className="size-3.5" />
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteTask(task)}
                                                                title="Hapus to-do"
                                                                className="inline-flex h-8 items-center rounded-lg border bg-card px-2 text-muted-foreground hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                                                            >
                                                                <Trash2 className="size-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Display or Edit Notes */}
                                                    {editingNoteId === task.id ? (
                                                        <div className="flex gap-2 pl-8">
                                                            <input
                                                                type="text"
                                                                value={editingNoteText}
                                                                onChange={(e) => setEditingNoteText(e.target.value)}
                                                                placeholder="Tulis progres atau kendala hari ini..."
                                                                className="h-8 flex-1 rounded-lg border bg-background px-3 text-xs outline-none focus-visible:border-ring"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSaveNote(task)}
                                                                className="h-8 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground"
                                                            >
                                                                Simpan
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        task.notes && (
                                                            <p className="pl-8 text-xs text-muted-foreground italic">
                                                                Catatan: “{task.notes}”
                                                            </p>
                                                        )
                                                    )}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal: PM Titip Tugas Harian ke Karyawan */}
                {assignTarget && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div
                            className="fixed inset-0 bg-black/35 backdrop-blur-xs"
                            onClick={() => setAssignTarget(null)}
                        />
                        <form
                            onSubmit={handleAssignSubmit}
                            className="relative z-10 w-full max-w-md rounded-xl border bg-card p-6 shadow-xl"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <h3 className="text-base font-semibold">
                                        Titip Tugas ke {assignTarget.name}
                                    </h3>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        Akan langsung muncul di Fokus Hari Ini ({selectedDateFormatted}).
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setAssignTarget(null)}
                                    className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                                >
                                    <X className="size-4" />
                                </button>
                            </div>

                            <div className="mt-4 flex flex-col gap-3">
                                <div>
                                    <label className="mb-1 block text-xs font-medium">
                                        Proyek / Kategori
                                    </label>
                                    <select
                                        value={assignProjectId}
                                        onChange={(e) => {
                                            setAssignProjectId(e.target.value);
                                            setAssignKanbanId('');
                                        }}
                                        className="h-9 w-full rounded-lg border bg-background px-2.5 text-xs outline-none"
                                    >
                                        <option value="">Umum / Internal Divisi</option>
                                        {accessibleProjects.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {assignProjectObj && assignProjectObj.tasks.length > 0 && (
                                    <div>
                                        <label className="mb-1 block text-xs font-medium">
                                            Kartu Kanban Induk (Opsional)
                                        </label>
                                        <select
                                            value={assignKanbanId}
                                            onChange={(e) => setAssignKanbanId(e.target.value)}
                                            className="h-9 w-full rounded-lg border bg-background px-2.5 text-xs outline-none"
                                        >
                                            <option value="">Tanpa kartu induk spesifik</option>
                                            {assignProjectObj.tasks.map((t) => (
                                                <option key={t.id} value={t.id}>
                                                    {t.title}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div>
                                    <label className="mb-1 block text-xs font-medium">
                                        Judul Aktivitas / Tugas *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={assignTitle}
                                        onChange={(e) => setAssignTitle(e.target.value)}
                                        placeholder="Contoh: Cek revisi potongan A-A Pak Rudy"
                                        className="h-9 w-full rounded-lg border bg-background px-3 text-xs outline-none focus-visible:border-ring"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-medium">
                                        Catatan / Arahan (Opsional)
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={assignNotes}
                                        onChange={(e) => setAssignNotes(e.target.value)}
                                        placeholder="Arahan singkat dari PM..."
                                        className="w-full rounded-lg border bg-background p-2.5 text-xs outline-none focus-visible:border-ring"
                                    />
                                </div>
                            </div>

                            <div className="mt-5 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setAssignTarget(null)}
                                    className="h-9 rounded-lg border bg-card px-3.5 text-xs font-medium hover:bg-muted"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={assignSubmitting || !assignTitle.trim()}
                                    className="h-9 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                                >
                                    {assignSubmitting ? 'Menyimpan…' : 'Titipkan Tugas'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </AppShell>
        </>
    );
}
