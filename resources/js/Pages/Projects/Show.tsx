import * as React from 'react';
import { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    AlertCircle,
    AlertTriangle,
    ArrowLeft,
    Calendar,
    Check,
    CheckCircle2,
    ChevronRight,
    Clock,
    Edit3,
    ExternalLink,
    FileText,
    FolderKanban,
    HardHat,
    Layers,
    MapPin,
    MessageSquare,
    MoreHorizontal,
    Phone,
    Plus,
    Send,
    Sparkles,
    Trash2,
    UserCheck,
    Users,
    X,
} from 'lucide-react';
import { AppShell } from '@/Components/dashboard/app-shell';
import { PageProps } from '@/types';
import { cn } from '@/lib/utils';
import { getAvatarTone } from '@/lib/studio-data';

interface ProjectMemberItem {
    id: number;
    name: string;
    photo_url?: string | null;
    role_in_project: string;
    position: string;
    employee_code?: string;
}

interface ProjectStageItem {
    id: number;
    name: string;
    order: number;
    status: 'pending' | 'active' | 'completed';
    tasks_count: number;
    done_count: number;
}

interface ProjectDetailData {
    id: number;
    name: string;
    client_name: string;
    client_phone?: string | null;
    location?: string | null;
    category: string;
    cover_image_url: string;
    drive_url?: string | null;
    description?: string | null;
    status: 'planning' | 'ongoing' | 'review' | 'done' | 'on_hold';
    progress_percent: number;
    start_date?: string | null;
    due_date?: string | null;
    due_date_formatted?: string | null;
    days_left?: number | null;
    total_tasks: number;
    done_tasks: number;
    owner: {
        id?: number;
        name: string;
    };
    members: ProjectMemberItem[];
    stages: ProjectStageItem[];
}

interface TaskAssignee {
    id: number;
    name: string;
    photo_url?: string | null;
    position: string;
}

interface KanbanTaskItem {
    id: number;
    title: string;
    description?: string | null;
    status: 'todo' | 'in_progress' | 'review' | 'done';
    priority: 'low' | 'medium' | 'high';
    order_column: number;
    due_date?: string | null;
    due_date_formatted?: string | null;
    days_left?: number | null;
    is_overdue: boolean;
    stage_id?: number | null;
    stage_name?: string | null;
    assignee?: TaskAssignee | null;
}

interface KanbanColumns {
    todo: KanbanTaskItem[];
    in_progress: KanbanTaskItem[];
    review: KanbanTaskItem[];
    done: KanbanTaskItem[];
}

interface ProjectUpdateItem {
    id: number;
    content: string;
    created_at: string;
    created_at_human: string;
    user: {
        id?: number;
        name: string;
        position: string;
        photo_url?: string | null;
    };
}

interface TeamMemberOption {
    id: number;
    name: string;
    employee_code: string;
    position: string;
    department: string;
    photo_url?: string | null;
}

interface Props extends PageProps {
    project: ProjectDetailData;
    kanban: KanbanColumns;
    updates: ProjectUpdateItem[];
    teamMembers: TeamMemberOption[];
}

const statusOptions: { value: ProjectDetailData['status']; label: string }[] = [
    { value: 'planning', label: 'Perencanaan' },
    { value: 'ongoing', label: 'Sedang Berjalan' },
    { value: 'review', label: 'Asistensi / Review' },
    { value: 'done', label: 'Selesai' },
    { value: 'on_hold', label: 'Ditunda' },
];

const priorityConfig = {
    low: { label: 'Rendah', badge: 'bg-zinc-100 text-zinc-700 border-zinc-200' },
    medium: { label: 'Sedang', badge: 'bg-amber-50 text-amber-800 border-amber-200' },
    high: { label: 'Tinggi', badge: 'bg-rose-50 text-rose-800 border-rose-200' },
};

const kanbanColumnConfig = {
    todo: {
        id: 'todo' as const,
        title: 'To Do',
        subtitle: 'Rencana Tugas',
        headerBorder: 'border-t-zinc-400',
        badge: 'bg-zinc-100 text-zinc-700',
    },
    in_progress: {
        id: 'in_progress' as const,
        title: 'In Progress',
        subtitle: 'Sedang Dikerjakan',
        headerBorder: 'border-t-amber-500',
        badge: 'bg-amber-100 text-amber-800',
    },
    review: {
        id: 'review' as const,
        title: 'In Review',
        subtitle: 'Asistensi & Review Klien',
        headerBorder: 'border-t-purple-500',
        badge: 'bg-purple-100 text-purple-800',
    },
    done: {
        id: 'done' as const,
        title: 'Done',
        subtitle: 'Disetujui / Selesai',
        headerBorder: 'border-t-emerald-500',
        badge: 'bg-emerald-100 text-emerald-800',
    },
};

export default function ProjectShow({ auth, project, kanban, updates, teamMembers }: Props) {
    const initialRole = auth.user.role === 'admin' ? 'admin' : 'karyawan';
    const isAdmin = auth.user.role === 'admin';
    const isOwnerOrLead =
        isAdmin ||
        project.owner.id === auth.user.id ||
        project.members.some(
            (m) => m.id === auth.user.id && m.role_in_project.toLowerCase().includes('lead')
        );

    const [activeTab, setActiveTab] = useState<'kanban' | 'stages' | 'updates'>('kanban');

    // Modals
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<KanbanTaskItem | null>(null);
    const [taskColumnTarget, setTaskColumnTarget] = useState<KanbanTaskItem['status']>('todo');

    const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    // Drag and Drop state
    const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);

    // Task Form
    const taskForm = useForm({
        title: '',
        description: '',
        stage_id: '' as string | number,
        assignee_id: '' as string | number,
        status: 'todo' as KanbanTaskItem['status'],
        priority: 'medium' as KanbanTaskItem['priority'],
        due_date: '',
    });

    const openCreateTaskModal = (
        columnStatus: KanbanTaskItem['status'] = 'todo',
        defaultStageId?: number
    ) => {
        setEditingTask(null);
        setTaskColumnTarget(columnStatus);
        taskForm.reset();
        taskForm.setData({
            title: '',
            description: '',
            stage_id: defaultStageId || (project.stages[0]?.id ?? ''),
            assignee_id: auth.user.id,
            status: columnStatus,
            priority: 'medium',
            due_date: '',
        });
        setIsTaskModalOpen(true);
    };

    const openEditTaskModal = (task: KanbanTaskItem) => {
        setEditingTask(task);
        taskForm.setData({
            title: task.title,
            description: task.description || '',
            stage_id: task.stage_id || '',
            assignee_id: task.assignee?.id || '',
            status: task.status,
            priority: task.priority,
            due_date: task.due_date || '',
        });
        setIsTaskModalOpen(true);
    };

    const handleTaskSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingTask) {
            taskForm.put(route('projects.tasks.update', [project.id, editingTask.id]), {
                preserveScroll: true,
                onSuccess: () => {
                    setIsTaskModalOpen(false);
                    setEditingTask(null);
                },
            });
        } else {
            taskForm.post(route('projects.tasks.store', project.id), {
                preserveScroll: true,
                onSuccess: () => {
                    setIsTaskModalOpen(false);
                    taskForm.reset();
                },
            });
        }
    };

    const handleDeleteTask = (taskId: number) => {
        if (!confirm('Yakin ingin menghapus tugas ini?')) return;
        router.delete(route('projects.tasks.destroy', [project.id, taskId]), {
            preserveScroll: true,
        });
    };

    const handleQuickMoveStatus = (taskId: number, newStatus: KanbanTaskItem['status']) => {
        router.patch(
            route('projects.tasks.update-status', [project.id, taskId]),
            { status: newStatus },
            { preserveScroll: true }
        );
    };

    // Drag and Drop handlers
    const handleDragStart = (e: React.DragEvent, taskId: number) => {
        e.dataTransfer.setData('text/plain', taskId.toString());
        setDraggedTaskId(taskId);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent, targetStatus: KanbanTaskItem['status']) => {
        e.preventDefault();
        const taskIdStr = e.dataTransfer.getData('text/plain');
        const taskId = parseInt(taskIdStr, 10);
        if (!taskId) return;

        setDraggedTaskId(null);
        handleQuickMoveStatus(taskId, targetStatus);
    };

    // Updates Feed Form
    const updateForm = useForm({
        content: '',
    });

    const handleUpdateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!updateForm.data.content.trim()) return;
        updateForm.post(route('projects.updates.store', project.id), {
            preserveScroll: true,
            onSuccess: () => updateForm.reset(),
        });
    };

    // Stage Form
    const stageForm = useForm({
        name: '',
    });

    const handleStageSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!stageForm.data.name.trim()) return;
        stageForm.post(route('projects.stages.store', project.id), {
            preserveScroll: true,
            onSuccess: () => stageForm.reset(),
        });
    };

    const handleDeleteStage = (stageId: number) => {
        if (!confirm('Hapus tahapan ini? Tugas yang terhubung akan dilepas dari tahapan ini.'))
            return;
        router.delete(route('projects.stages.destroy', [project.id, stageId]), {
            preserveScroll: true,
        });
    };

    // Edit Project Form
    const editProjectForm = useForm({
        name: project.name,
        client_name: project.client_name,
        client_phone: project.client_phone || '',
        location: project.location || '',
        category: project.category,
        cover_image_url: project.cover_image_url,
        drive_url: project.drive_url || '',
        description: project.description || '',
        start_date: project.start_date || '',
        due_date: project.due_date || '',
        status: project.status,
        member_ids: project.members.map((m) => m.id),
        lead_id:
            project.members.find((m) => m.role_in_project.toLowerCase().includes('lead'))?.id || '',
    });

    const handleEditProjectSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        editProjectForm.put(route('projects.update', project.id), {
            preserveScroll: true,
            onSuccess: () => setIsEditProjectModalOpen(false),
        });
    };

    const handleDeleteProject = () => {
        router.delete(route('projects.destroy', project.id));
    };

    const isUrgent =
        typeof project.days_left === 'number' && project.days_left <= 7 && project.status !== 'done';
    const isOverdue =
        typeof project.days_left === 'number' && project.days_left < 0 && project.status !== 'done';

    return (
        <AppShell initialRole={initialRole} initialActive="projects">
            <Head title={project.name} />

            <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
                {/* Top Navigation & Breadcrumbs */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Link
                            href={route('projects.index')}
                            className="inline-flex items-center gap-1 font-medium hover:text-foreground"
                        >
                            <ArrowLeft className="size-3.5" />
                            <span>Semua Proyek</span>
                        </Link>
                        <span>/</span>
                        <span className="font-semibold text-foreground truncate max-w-xs">
                            {project.name}
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {project.drive_url && (
                            <a
                                href={project.drive_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-semibold text-foreground shadow-xs hover:bg-muted"
                            >
                                <ExternalLink className="size-3.5 text-muted-foreground" />
                                <span>Buka Folder Drive</span>
                            </a>
                        )}

                        {isOwnerOrLead && (
                            <button
                                type="button"
                                onClick={() => setIsEditProjectModalOpen(true)}
                                className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-semibold text-foreground shadow-xs hover:bg-muted"
                            >
                                <Edit3 className="size-3.5 text-muted-foreground" />
                                <span>Edit Info</span>
                            </button>
                        )}

                        {isAdmin && (
                            <button
                                type="button"
                                onClick={() => setIsDeleteConfirmOpen(true)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50/50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100/70"
                            >
                                <Trash2 className="size-3.5" />
                                <span>Hapus</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Project Header Banner & Summary */}
                <div className="relative overflow-hidden rounded-2xl border bg-card p-5 sm:p-6 shadow-xs">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                                    {project.category}
                                </span>
                                <span
                                    className={cn(
                                        'rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1',
                                        project.status === 'ongoing' &&
                                            'bg-emerald-50 text-emerald-800 ring-emerald-200',
                                        project.status === 'review' &&
                                            'bg-amber-50 text-amber-800 ring-amber-200',
                                        project.status === 'planning' &&
                                            'bg-zinc-100 text-zinc-800 ring-zinc-200',
                                        project.status === 'done' &&
                                            'bg-blue-50 text-blue-800 ring-blue-200',
                                        project.status === 'on_hold' &&
                                            'bg-rose-50 text-rose-800 ring-rose-200'
                                    )}
                                >
                                    {statusOptions.find((s) => s.value === project.status)?.label}
                                </span>
                            </div>

                            <h1 className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                                {project.name}
                            </h1>

                            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1.5">
                                    <Users className="size-3.5" />
                                    <span>
                                        Klien: <strong className="text-foreground">{project.client_name}</strong>
                                    </span>
                                </span>
                                {project.client_phone && (
                                    <span className="flex items-center gap-1.5">
                                        <Phone className="size-3.5" />
                                        <span>{project.client_phone}</span>
                                    </span>
                                )}
                                {project.location && (
                                    <span className="flex items-center gap-1.5">
                                        <MapPin className="size-3.5" />
                                        <span>{project.location}</span>
                                    </span>
                                )}
                            </div>

                            {project.description && (
                                <p className="mt-2.5 max-w-3xl text-xs text-muted-foreground leading-relaxed">
                                    {project.description}
                                </p>
                            )}
                        </div>

                        {/* Right Summary Metrics */}
                        <div className="flex flex-col gap-3 rounded-xl border bg-muted/30 p-4 lg:w-72">
                            <div>
                                <div className="flex items-center justify-between text-xs font-semibold">
                                    <span className="text-muted-foreground">Progres Keseluruhan</span>
                                    <span className="text-foreground font-bold">
                                        {project.progress_percent}%
                                    </span>
                                </div>
                                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                                    <div
                                        className={cn(
                                            'h-full rounded-full transition-all duration-500',
                                            project.progress_percent === 100
                                                ? 'bg-blue-600'
                                                : project.progress_percent >= 60
                                                ? 'bg-emerald-500'
                                                : 'bg-primary'
                                        )}
                                        style={{ width: `${project.progress_percent}%` }}
                                    />
                                </div>
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                    {project.done_tasks} dari {project.total_tasks} tugas selesai
                                </p>
                            </div>

                            <div className="flex items-center justify-between border-t pt-2.5 text-xs">
                                <span className="text-muted-foreground">Target Deadline:</span>
                                {project.due_date ? (
                                    <span
                                        className={cn(
                                            'font-semibold',
                                            isOverdue
                                                ? 'text-rose-600'
                                                : isUrgent
                                                ? 'text-amber-600'
                                                : 'text-foreground'
                                        )}
                                    >
                                        {project.due_date_formatted}{' '}
                                        {project.days_left !== null && (
                                            <span className="text-[11px] font-normal">
                                                ({project.days_left} hr)
                                            </span>
                                        )}
                                    </span>
                                ) : (
                                    <span className="text-muted-foreground">Belum diatur</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Team Members Row */}
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold text-muted-foreground mr-1">
                                Tim Proyek:
                            </span>
                            {project.members.map((m) => (
                                <div
                                    key={m.id}
                                    className="inline-flex items-center gap-1.5 rounded-full border bg-background py-0.5 pl-1 pr-2.5 text-xs shadow-xs"
                                >
                                    <div
                                        className={cn(
                                            'size-5 rounded-full text-[10px] font-bold flex items-center justify-center overflow-hidden',
                                            getAvatarTone(m.id, m.name)
                                        )}
                                    >
                                        {m.photo_url ? (
                                            <img
                                                src={m.photo_url}
                                                alt={m.name}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            m.name.charAt(0)
                                        )}
                                    </div>
                                    <span className="font-medium text-foreground">{m.name}</span>
                                    <span className="text-[10px] text-muted-foreground">
                                        ({m.role_in_project})
                                    </span>
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={() => openCreateTaskModal('todo')}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3.5 py-1.5 text-xs font-semibold text-background shadow-xs hover:bg-foreground/90"
                        >
                            <Plus className="size-3.5" />
                            <span>Tambah Tugas Baru</span>
                        </button>
                    </div>
                </div>

                {/* Tabs Switcher */}
                <div className="flex items-center gap-2 border-b">
                    <button
                        type="button"
                        onClick={() => setActiveTab('kanban')}
                        className={cn(
                            'inline-flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-semibold transition',
                            activeTab === 'kanban'
                                ? 'border-foreground text-foreground'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        )}
                    >
                        <FolderKanban className="size-4" />
                        <span>Kanban Board</span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">
                            {project.total_tasks}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('stages')}
                        className={cn(
                            'inline-flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-semibold transition',
                            activeTab === 'stages'
                                ? 'border-foreground text-foreground'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        )}
                    >
                        <Layers className="size-4" />
                        <span>Tahapan Desain</span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">
                            {project.stages.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('updates')}
                        className={cn(
                            'inline-flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-semibold transition',
                            activeTab === 'updates'
                                ? 'border-foreground text-foreground'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        )}
                    >
                        <MessageSquare className="size-4" />
                        <span>Catatan & Feed Progres</span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">
                            {updates.length}
                        </span>
                    </button>
                </div>

                {/* TAB 1: KANBAN BOARD */}
                {activeTab === 'kanban' && (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {(
                            Object.keys(kanbanColumnConfig) as Array<keyof typeof kanbanColumnConfig>
                        ).map((colKey) => {
                            const config = kanbanColumnConfig[colKey];
                            const tasks = kanban[colKey] || [];

                            return (
                                <div
                                    key={colKey}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, colKey)}
                                    className="flex flex-col rounded-2xl border bg-muted/25 p-3"
                                >
                                    {/* Column Header */}
                                    <div
                                        className={cn(
                                            'flex items-center justify-between border-t-2 pt-2.5 pb-2 px-1',
                                            config.headerBorder
                                        )}
                                    >
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-xs font-bold text-foreground">
                                                {config.title}
                                            </h3>
                                            <span
                                                className={cn(
                                                    'rounded-full px-2 py-0.5 text-[11px] font-bold',
                                                    config.badge
                                                )}
                                            >
                                                {tasks.length}
                                            </span>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => openCreateTaskModal(colKey)}
                                            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                                            title="Tambah tugas di kolom ini"
                                        >
                                            <Plus className="size-4" />
                                        </button>
                                    </div>

                                    {/* Task Cards List */}
                                    <div className="mt-2 flex flex-1 flex-col gap-2.5 min-h-[160px]">
                                        {tasks.length === 0 ? (
                                            <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-muted-foreground/20 p-4 text-center text-xs text-muted-foreground">
                                                Belum ada tugas
                                                <button
                                                    type="button"
                                                    onClick={() => openCreateTaskModal(colKey)}
                                                    className="mt-1.5 text-[11px] font-semibold text-primary hover:underline"
                                                >
                                                    + Tambah Tugas
                                                </button>
                                            </div>
                                        ) : (
                                            tasks.map((task) => (
                                                <div
                                                    key={task.id}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, task.id)}
                                                    className="group relative flex flex-col gap-2 rounded-xl border bg-card p-3.5 shadow-xs transition hover:border-foreground/40 hover:shadow-md cursor-grab active:cursor-grabbing"
                                                >
                                                    {/* Top Card Info: Priority & Stage */}
                                                    <div className="flex items-center justify-between gap-1 text-[11px]">
                                                        <span
                                                            className={cn(
                                                                'rounded-md border px-1.5 py-0.5 font-semibold text-[10px]',
                                                                priorityConfig[task.priority]?.badge
                                                            )}
                                                        >
                                                            {priorityConfig[task.priority]?.label}
                                                        </span>

                                                        {task.stage_name && (
                                                            <span className="truncate max-w-[120px] rounded bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground font-medium">
                                                                {task.stage_name}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Task Title */}
                                                    <h4 className="text-xs font-bold text-foreground leading-snug">
                                                        {task.title}
                                                    </h4>

                                                    {task.description && (
                                                        <p className="line-clamp-2 text-[11px] text-muted-foreground leading-relaxed">
                                                            {task.description}
                                                        </p>
                                                    )}

                                                    {/* Footer: Due Date & Assignee */}
                                                    <div className="mt-1 flex items-center justify-between border-t pt-2 text-[11px]">
                                                        {task.due_date ? (
                                                            <span
                                                                className={cn(
                                                                    'flex items-center gap-1 font-medium text-[10px]',
                                                                    task.is_overdue
                                                                        ? 'text-rose-600 font-semibold'
                                                                        : 'text-muted-foreground'
                                                                )}
                                                            >
                                                                <Clock className="size-3" />
                                                                <span>{task.due_date_formatted}</span>
                                                            </span>
                                                        ) : (
                                                            <span />
                                                        )}

                                                        <div className="flex items-center gap-1.5">
                                                            {task.assignee ? (
                                                                <div
                                                                    title={`${task.assignee.name} (${task.assignee.position})`}
                                                                    className={cn(
                                                                        'flex size-5 items-center justify-center rounded-full text-[10px] font-bold overflow-hidden border',
                                                                        getAvatarTone(task.assignee.id, task.assignee.name)
                                                                    )}
                                                                >
                                                                    {task.assignee.photo_url ? (
                                                                        <img
                                                                            src={task.assignee.photo_url}
                                                                            alt={task.assignee.name}
                                                                            className="h-full w-full object-cover"
                                                                        />
                                                                    ) : (
                                                                        task.assignee.name.charAt(0)
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="text-[10px] text-muted-foreground italic">
                                                                    Unassigned
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Quick 1-Click Status Move & Action Bar */}
                                                    <div className="mt-1 flex items-center justify-between border-t border-dashed pt-1.5 opacity-90 transition group-hover:opacity-100">
                                                        <div className="flex items-center gap-1">
                                                            {colKey !== 'todo' && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleQuickMoveStatus(
                                                                            task.id,
                                                                            colKey === 'done'
                                                                                ? 'review'
                                                                                : colKey === 'review'
                                                                                ? 'in_progress'
                                                                                : 'todo'
                                                                        )
                                                                    }
                                                                    className="rounded px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-muted"
                                                                    title="Mundur status"
                                                                >
                                                                    ←
                                                                </button>
                                                            )}
                                                            {colKey !== 'done' && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleQuickMoveStatus(
                                                                            task.id,
                                                                            colKey === 'todo'
                                                                                ? 'in_progress'
                                                                                : colKey === 'in_progress'
                                                                                ? 'review'
                                                                                : 'done'
                                                                        )
                                                                    }
                                                                    className="rounded bg-muted/80 px-1.5 py-0.5 text-[10px] font-semibold text-foreground hover:bg-muted"
                                                                    title="Lanjut status berikutnya"
                                                                >
                                                                    Maju →
                                                                </button>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                type="button"
                                                                onClick={() => openEditTaskModal(task)}
                                                                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                                                                title="Edit Tugas"
                                                            >
                                                                <Edit3 className="size-3" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteTask(task.id)}
                                                                className="rounded p-1 text-muted-foreground hover:bg-rose-50 hover:text-rose-600"
                                                                title="Hapus Tugas"
                                                            >
                                                                <Trash2 className="size-3" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* TAB 2: TAHAPAN DESAIN (STAGES) */}
                {activeTab === 'stages' && (
                    <div className="flex flex-col gap-4">
                        <div className="rounded-xl border bg-card p-5">
                            <div className="flex items-center justify-between border-b pb-3">
                                <div>
                                    <h3 className="text-sm font-bold text-foreground">
                                        Tahapan Desain Arsitektur Proyek
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        Pantau kemajuan gambar kerja DED, visualisasi 3D, dan koordinasi asistensi bertahap.
                                    </p>
                                </div>

                                {isOwnerOrLead && (
                                    <form onSubmit={handleStageSubmit} className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={stageForm.data.name}
                                            onChange={(e) => stageForm.setData('name', e.target.value)}
                                            placeholder="Nama tahapan baru..."
                                            className="h-8 rounded-lg border bg-background px-3 text-xs placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                                        />
                                        <button
                                            type="submit"
                                            disabled={stageForm.processing}
                                            className="h-8 rounded-lg bg-foreground px-3 text-xs font-semibold text-background hover:bg-foreground/90 disabled:opacity-50"
                                        >
                                            + Tambah Tahapan
                                        </button>
                                    </form>
                                )}
                            </div>

                            <div className="mt-4 flex flex-col gap-3">
                                {project.stages.map((stage, index) => {
                                    const percent =
                                        stage.tasks_count > 0
                                            ? Math.round((stage.done_count / stage.tasks_count) * 100)
                                            : 0;

                                    return (
                                        <div
                                            key={stage.id}
                                            className="flex flex-col gap-3 rounded-xl border bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
                                        >
                                            <div className="flex items-start gap-3">
                                                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-bold text-foreground">
                                                    {index + 1}
                                                </span>
                                                <div>
                                                    <h4 className="text-sm font-bold text-foreground">
                                                        {stage.name}
                                                    </h4>
                                                    <p className="text-xs text-muted-foreground">
                                                        {stage.done_count} dari {stage.tasks_count} tugas selesai
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                {/* Progress Bar */}
                                                <div className="w-36">
                                                    <div className="flex justify-between text-[11px] font-semibold text-muted-foreground">
                                                        <span>Progres</span>
                                                        <span>{percent}%</span>
                                                    </div>
                                                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                                        <div
                                                            className="h-full rounded-full bg-primary transition-all duration-300"
                                                            style={{ width: `${percent}%` }}
                                                        />
                                                    </div>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => openCreateTaskModal('todo', stage.id)}
                                                    className="rounded-lg border px-2.5 py-1 text-xs font-semibold hover:bg-muted"
                                                >
                                                    + Tugas
                                                </button>

                                                {isOwnerOrLead && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteStage(stage.id)}
                                                        className="text-muted-foreground hover:text-rose-600 p-1"
                                                        title="Hapus Tahapan"
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 3: CATATAN & FEED PROGRES */}
                {activeTab === 'updates' && (
                    <div className="flex flex-col gap-5 max-w-3xl">
                        {/* New Post Form */}
                        <div className="rounded-xl border bg-card p-4 shadow-xs">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Kirim Catatan Asistensi / Update Progres
                            </h3>
                            <form onSubmit={handleUpdateSubmit} className="mt-2.5 flex flex-col gap-2.5">
                                <textarea
                                    rows={3}
                                    required
                                    value={updateForm.data.content}
                                    onChange={(e) => updateForm.setData('content', e.target.value)}
                                    placeholder="Tuliskan catatan revisi klien, hasil asistensi denah, atau laporan progres gambar kerja..."
                                    className="w-full rounded-lg border bg-background p-3 text-xs placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                                />
                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={updateForm.processing}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-xs font-semibold text-background hover:bg-foreground/90 disabled:opacity-50"
                                    >
                                        <Send className="size-3.5" />
                                        <span>{updateForm.processing ? 'Mengirim...' : 'Kirim Catatan'}</span>
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Feed Timeline */}
                        <div className="flex flex-col gap-3">
                            {updates.length === 0 ? (
                                <div className="rounded-xl border border-dashed p-8 text-center text-xs text-muted-foreground">
                                    Belum ada catatan progres pada proyek ini. Mulai bagikan catatan asistensi pertama Anda!
                                </div>
                            ) : (
                                updates.map((up) => (
                                    <div
                                        key={up.id}
                                        className="flex gap-3 rounded-xl border bg-card p-4 shadow-xs"
                                    >
                                        <div className="size-8 shrink-0 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center overflow-hidden border">
                                            {up.user.photo_url ? (
                                                <img
                                                    src={up.user.photo_url}
                                                    alt={up.user.name}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                up.user.name.charAt(0)
                                            )}
                                        </div>

                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <span className="text-xs font-bold text-foreground">
                                                        {up.user.name}
                                                    </span>
                                                    <span className="ml-1.5 text-[11px] text-muted-foreground">
                                                        · {up.user.position}
                                                    </span>
                                                </div>
                                                <span className="text-[11px] text-muted-foreground">
                                                    {up.created_at_human}
                                                </span>
                                            </div>

                                            <p className="mt-1.5 text-xs text-foreground whitespace-pre-line leading-relaxed">
                                                {up.content}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL TAMBAH / EDIT TUGAS */}
            {isTaskModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
                    <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border bg-card p-6 shadow-2xl">
                        <div className="flex items-start justify-between border-b pb-3">
                            <div>
                                <h3 className="text-base font-bold text-foreground">
                                    {editingTask ? 'Edit Tugas Proyek' : 'Tambah Tugas Baru'}
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Proyek: {project.name}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsTaskModalOpen(false)}
                                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        <form onSubmit={handleTaskSubmit} className="mt-4 flex flex-col gap-3.5">
                            <div>
                                <label className="text-xs font-semibold text-foreground">
                                    Judul Tugas <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={taskForm.data.title}
                                    onChange={(e) => taskForm.setData('title', e.target.value)}
                                    placeholder="cth: Gambar Detail Tangga & Railing Lantai 2"
                                    className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                                />
                                {taskForm.errors.title && (
                                    <p className="mt-1 text-xs text-rose-500">{taskForm.errors.title}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-foreground">
                                        Tahapan Desain
                                    </label>
                                    <select
                                        value={taskForm.data.stage_id}
                                        onChange={(e) => taskForm.setData('stage_id', e.target.value)}
                                        className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                                    >
                                        <option value="">Pilih Tahapan...</option>
                                        {project.stages.map((st) => (
                                            <option key={st.id} value={st.id}>
                                                {st.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-foreground">
                                        Penanggung Jawab (Assignee)
                                    </label>
                                    <select
                                        value={taskForm.data.assignee_id}
                                        onChange={(e) => taskForm.setData('assignee_id', e.target.value)}
                                        className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                                    >
                                        <option value="">Belum Ditugaskan</option>
                                        {teamMembers.map((m) => (
                                            <option key={m.id} value={m.id}>
                                                {m.name} ({m.position})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-foreground">
                                        Status Pengerjaan <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        value={taskForm.data.status}
                                        onChange={(e) =>
                                            taskForm.setData(
                                                'status',
                                                e.target.value as KanbanTaskItem['status']
                                            )
                                        }
                                        className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                                    >
                                        <option value="todo">To Do (Rencana)</option>
                                        <option value="in_progress">In Progress (Pengerjaan)</option>
                                        <option value="review">In Review (Asistensi)</option>
                                        <option value="done">Done (Selesai)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-foreground">
                                        Prioritas <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        value={taskForm.data.priority}
                                        onChange={(e) =>
                                            taskForm.setData(
                                                'priority',
                                                e.target.value as KanbanTaskItem['priority']
                                            )
                                        }
                                        className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                                    >
                                        <option value="low">Rendah</option>
                                        <option value="medium">Sedang</option>
                                        <option value="high">Tinggi</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground">
                                    Tenggat Waktu Tugas
                                </label>
                                <input
                                    type="date"
                                    value={taskForm.data.due_date}
                                    onChange={(e) => taskForm.setData('due_date', e.target.value)}
                                    className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground">
                                    Deskripsi Teknis / Instruksi Gambar
                                </label>
                                <textarea
                                    rows={3}
                                    value={taskForm.data.description}
                                    onChange={(e) => taskForm.setData('description', e.target.value)}
                                    placeholder="Tentukan spesifikasi material, skala gambar (1:20 / 1:50), atau catatan referensi..."
                                    className="mt-1 w-full rounded-lg border bg-background p-2.5 text-xs placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                                />
                            </div>

                            <div className="mt-2 flex items-center justify-end gap-2 border-t pt-3">
                                <button
                                    type="button"
                                    onClick={() => setIsTaskModalOpen(false)}
                                    className="rounded-lg border px-3.5 py-1.5 text-xs font-semibold hover:bg-muted"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={taskForm.processing}
                                    className="rounded-lg bg-foreground px-4 py-1.5 text-xs font-semibold text-background hover:bg-foreground/90 disabled:opacity-50"
                                >
                                    {taskForm.processing
                                        ? 'Menyimpan...'
                                        : editingTask
                                        ? 'Perbarui Tugas'
                                        : 'Simpan Tugas'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL EDIT PROYEK */}
            {isEditProjectModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
                    <div className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border bg-card p-6 shadow-2xl">
                        <div className="flex items-start justify-between border-b pb-3">
                            <h3 className="text-base font-bold text-foreground">
                                Edit Informasi Proyek
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsEditProjectModalOpen(false)}
                                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        <form onSubmit={handleEditProjectSubmit} className="mt-4 flex flex-col gap-3.5">
                            <div>
                                <label className="text-xs font-semibold text-foreground">
                                    Nama Proyek
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={editProjectForm.data.name}
                                    onChange={(e) => editProjectForm.setData('name', e.target.value)}
                                    className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs focus:border-foreground focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-foreground">
                                        Klien
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={editProjectForm.data.client_name}
                                        onChange={(e) => editProjectForm.setData('client_name', e.target.value)}
                                        className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs focus:border-foreground focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-foreground">
                                        Status
                                    </label>
                                    <select
                                        value={editProjectForm.data.status}
                                        onChange={(e) =>
                                            editProjectForm.setData(
                                                'status',
                                                e.target.value as ProjectDetailData['status']
                                            )
                                        }
                                        className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs focus:border-foreground focus:outline-none"
                                    >
                                        {statusOptions.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-foreground">
                                        No. Telepon Klien
                                    </label>
                                    <input
                                        type="text"
                                        value={editProjectForm.data.client_phone}
                                        onChange={(e) => editProjectForm.setData('client_phone', e.target.value)}
                                        className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs focus:border-foreground focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-foreground">
                                        Lokasi
                                    </label>
                                    <input
                                        type="text"
                                        value={editProjectForm.data.location}
                                        onChange={(e) => editProjectForm.setData('location', e.target.value)}
                                        className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs focus:border-foreground focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-foreground">
                                        Tanggal Mulai
                                    </label>
                                    <input
                                        type="date"
                                        value={editProjectForm.data.start_date}
                                        onChange={(e) => editProjectForm.setData('start_date', e.target.value)}
                                        className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs focus:border-foreground focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-foreground">
                                        Target Deadline
                                    </label>
                                    <input
                                        type="date"
                                        value={editProjectForm.data.due_date}
                                        onChange={(e) => editProjectForm.setData('due_date', e.target.value)}
                                        className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs focus:border-foreground focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground">
                                    Link Folder Google Drive
                                </label>
                                <input
                                    type="url"
                                    value={editProjectForm.data.drive_url}
                                    onChange={(e) => editProjectForm.setData('drive_url', e.target.value)}
                                    placeholder="https://drive.google.com/..."
                                    className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs focus:border-foreground focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground">
                                    Deskripsi Proyek
                                </label>
                                <textarea
                                    rows={3}
                                    value={editProjectForm.data.description}
                                    onChange={(e) => editProjectForm.setData('description', e.target.value)}
                                    className="mt-1 w-full rounded-lg border bg-background p-2.5 text-xs focus:border-foreground focus:outline-none"
                                />
                            </div>

                            <div className="mt-2 flex items-center justify-end gap-2 border-t pt-3">
                                <button
                                    type="button"
                                    onClick={() => setIsEditProjectModalOpen(false)}
                                    className="rounded-lg border px-3.5 py-1.5 text-xs font-semibold hover:bg-muted"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={editProjectForm.processing}
                                    className="rounded-lg bg-foreground px-4 py-1.5 text-xs font-semibold text-background hover:bg-foreground/90 disabled:opacity-50"
                                >
                                    {editProjectForm.processing ? 'Menyimpan...' : 'Perbarui Proyek'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL KONFIRMASI HAPUS PROYEK */}
            {isDeleteConfirmOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
                    <div className="relative w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl">
                        <div className="flex items-center gap-3 text-rose-600">
                            <span className="flex size-10 items-center justify-center rounded-xl bg-rose-100">
                                <AlertTriangle className="size-5" />
                            </span>
                            <div>
                                <h3 className="text-base font-bold text-foreground">
                                    Hapus Proyek Ini?
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Tindakan ini tidak dapat dibatalkan.
                                </p>
                            </div>
                        </div>

                        <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
                            Apakah Anda yakin ingin menghapus proyek{' '}
                            <strong className="text-foreground">{project.name}</strong>? Seluruh tugas,
                            tahapan desain, dan catatan progres terkait akan dihapus.
                        </p>

                        <div className="mt-5 flex items-center justify-end gap-2 border-t pt-3">
                            <button
                                type="button"
                                onClick={() => setIsDeleteConfirmOpen(false)}
                                className="rounded-lg border px-4 py-2 text-xs font-semibold hover:bg-muted"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteProject}
                                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700"
                            >
                                Ya, Hapus Proyek
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppShell>
    );
}
