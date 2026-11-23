import * as React from 'react';
import { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    AlertCircle,
    AlertTriangle,
    ArrowDown,
    ArrowLeft,
    ArrowUp,
    Calendar,
    CalendarDays,
    Check,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    Edit3,
    ExternalLink,
    FileText,
    FolderKanban,
    GripVertical,
    HardHat,
    ImagePlus,
    Layers,
    MapPin,
    MessageSquare,
    MoreHorizontal,
    Phone,
    Plus,
    Printer,
    Send,
    Sparkles,
    Trash2,
    UserCheck,
    Users,
    X,
} from 'lucide-react';
import { AppShell } from '@/Components/dashboard/app-shell';
import {
    ProjectBriefTab,
    type ProjectBriefData,
} from '@/Components/client-brief/ProjectBriefTab';
import { PageProps } from '@/types';
import { cn } from '@/lib/utils';
import { getAvatarTone } from '@/lib/studio-data';
import { prepareWebImage } from '@/lib/image-upload';

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
    update_design_date?: string | null;
    update_design_date_formatted?: string | null;
    client_response_date?: string | null;
    client_response_date_formatted?: string | null;
    output_notes?: string | null;
    duration_workdays?: number | null;
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
    package_name?: string | null;
    project_type?: 'perencanaan' | 'pembangunan' | 'desain_bangun' | null;
    building_type?: 'rumah_hunian' | 'komersial' | 'interior' | null;
    package_addons?: string[];
    building_area?: number | null;
    estimated_budget?: number | null;
    custom_scope_notes?: string | null;
    cover_image_url: string;
    drive_url?: string | null;
    description?: string | null;
    status: 'survey' | 'planning' | 'ongoing' | 'review' | 'done' | 'on_hold';
    progress_percent: number;
    start_date?: string | null;
    start_date_formatted?: string | null;
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

interface PackageOption {
    id: string;
    name: string;
    tagline: string;
    price_per_m2: number;
    min_area: number;
    deliverables: string[];
}

interface AddonOption {
    id: string;
    label: string;
    price_per_m2: number | null;
    unit: string;
}

interface Props extends PageProps {
    project: ProjectDetailData;
    kanban: KanbanColumns;
    updates: ProjectUpdateItem[];
    teamMembers: TeamMemberOption[];
    packages?: PackageOption[];
    addons?: AddonOption[];
    clientBrief: ProjectBriefData;
}

const statusOptions: { value: ProjectDetailData['status']; label: string }[] = [
    { value: 'survey', label: 'Tahap Survey' },
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

export default function ProjectShow({
    auth,
    project,
    kanban,
    updates,
    teamMembers,
    packages = [],
    addons = [],
    clientBrief,
}: Props) {
    const isAdmin = auth.user.role === 'super_admin' || auth.user.role === 'admin';
    const initialRole = isAdmin ? 'admin' : 'karyawan';
    const isOwnerOrLead =
        isAdmin ||
        project.owner.id === auth.user.id ||
        project.members.some(
            (m) => m.id === auth.user.id && m.role_in_project.toLowerCase().includes('lead')
        );

    const [activeTab, setActiveTab] = useState<'kanban' | 'stages' | 'timeline' | 'updates' | 'brief'>('kanban');

    // Timeline & Calendar state
    const [isStageModalOpen, setIsStageModalOpen] = useState(false);
    const [editingStage, setEditingStage] = useState<ProjectStageItem | null>(null);
    const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
        const firstDatedStage = project.stages.find((s) => s.update_design_date);
        if (firstDatedStage?.update_design_date) {
            return new Date(firstDatedStage.update_design_date + 'T00:00:00');
        }
        return project.start_date ? new Date(project.start_date + 'T00:00:00') : new Date();
    });

    const stageTimelineForm = useForm({
        name: '',
        status: 'pending' as ProjectStageItem['status'],
        update_design_date: '',
        client_response_date: '',
        duration_workdays: '' as string | number,
        output_notes: '',
    });

    const openCreateStageModal = () => {
        setEditingStage(null);
        stageTimelineForm.setData({
            name: '',
            status: 'pending',
            update_design_date: '',
            client_response_date: '',
            duration_workdays: 7,
            output_notes: '',
        });
        setIsStageModalOpen(true);
    };

    const openEditStageModal = (stage: ProjectStageItem) => {
        setEditingStage(stage);
        stageTimelineForm.setData({
            name: stage.name,
            status: stage.status,
            update_design_date: stage.update_design_date || '',
            client_response_date: stage.client_response_date || '',
            duration_workdays: stage.duration_workdays ?? '',
            output_notes: stage.output_notes || '',
        });
        setIsStageModalOpen(true);
    };

    const handleStageUpdateDesignDateChange = (val: string) => {
        let nextClientDate = stageTimelineForm.data.client_response_date;
        if (val) {
            const d = new Date(val + 'T00:00:00Z');
            d.setUTCDate(d.getUTCDate() + 3);
            nextClientDate = d.toISOString().split('T')[0];
        }
        stageTimelineForm.setData((prev) => ({
            ...prev,
            update_design_date: val,
            client_response_date: nextClientDate,
        }));
    };

    const handleStageTimelineSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingStage) {
            stageTimelineForm.put(
                route('projects.stages.update', { project: project.id, stage: editingStage.id }),
                {
                    preserveScroll: true,
                    onSuccess: () => setIsStageModalOpen(false),
                }
            );
        } else {
            stageTimelineForm.post(route('projects.stages.store', project.id), {
                preserveScroll: true,
                onSuccess: () => setIsStageModalOpen(false),
            });
        }
    };

    const handleQuickStageStatus = (stage: ProjectStageItem, nextStatus: ProjectStageItem['status']) => {
        router.put(
            route('projects.stages.update', { project: project.id, stage: stage.id }),
            {
                name: stage.name,
                status: nextStatus,
                update_design_date: stage.update_design_date || '',
                client_response_date: stage.client_response_date || '',
                duration_workdays: stage.duration_workdays ?? '',
                output_notes: stage.output_notes || '',
            },
            { preserveScroll: true }
        );
    };

    const [draggedStageId, setDraggedStageId] = useState<number | null>(null);

    const submitStageReorder = (orderedIds: number[]) => {
        router.patch(
            route('projects.stages.reorder', project.id),
            { stage_ids: orderedIds },
            { preserveScroll: true }
        );
    };

    const handleMoveStage = (index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= project.stages.length) return;
        const nextOrder = [...project.stages];
        const [moved] = nextOrder.splice(index, 1);
        nextOrder.splice(targetIndex, 0, moved);
        submitStageReorder(nextOrder.map((s) => s.id));
    };

    const handleStageDrop = (targetStageId: number) => {
        if (draggedStageId === null || draggedStageId === targetStageId) {
            setDraggedStageId(null);
            return;
        }
        const fromIndex = project.stages.findIndex((s) => s.id === draggedStageId);
        const toIndex = project.stages.findIndex((s) => s.id === targetStageId);
        setDraggedStageId(null);
        if (fromIndex === -1 || toIndex === -1) return;

        const nextOrder = [...project.stages];
        const [moved] = nextOrder.splice(fromIndex, 1);
        nextOrder.splice(toIndex, 0, moved);
        submitStageReorder(nextOrder.map((s) => s.id));
    };

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
        const activeOrFirstStageId =
            project.stages.find((s) => s.status === 'active')?.id ??
            project.stages[0]?.id ??
            '';

        setEditingTask(null);
        setTaskColumnTarget(columnStatus);
        taskForm.clearErrors();
        taskForm.setData({
            title: '',
            description: '',
            stage_id: defaultStageId ?? activeOrFirstStageId,
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

    // Edit Project Form (disamakan dengan Buat Proyek Baru)
    const editProjectForm = useForm({
        name: project.name,
        client_name: project.client_name,
        client_phone: project.client_phone || '',
        location: project.location || '',
        category: project.package_name || project.category || 'Paket 1',
        package_name: project.package_name || project.category || 'Paket 1',
        project_type: (project.project_type || 'perencanaan') as 'perencanaan' | 'pembangunan' | 'desain_bangun',
        building_type: (project.building_type || 'rumah_hunian') as 'rumah_hunian' | 'komersial' | 'interior',
        package_addons: (project.package_addons || []) as string[],
        building_area: project.building_area != null ? String(project.building_area) : '',
        estimated_budget: project.estimated_budget != null ? String(project.estimated_budget) : '',
        custom_scope_notes: project.custom_scope_notes || '',
        cover_image: null as File | null,
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

    const [editCoverPreview, setEditCoverPreview] = useState(
        project.cover_image_url || '/project-covers/rumah-tropis.png'
    );
    const [editCoverError, setEditCoverError] = useState<string | null>(null);

    const calculateEditBudget = (pkgName: string, areaStr: string, selectedAddons: string[]) => {
        const area = parseFloat(areaStr);
        if (!area || isNaN(area) || area <= 0) return '';
        const pkg = packages.find((p) => p.id === pkgName);
        if (!pkg || pkg.price_per_m2 === 0) return '';

        let ratePerM2 = pkg.price_per_m2;
        selectedAddons.forEach((aId) => {
            const addon = addons.find((a) => a.id === aId);
            if (addon && addon.price_per_m2) {
                ratePerM2 += addon.price_per_m2;
            }
        });
        return String(Math.round(area * ratePerM2));
    };

    const handleEditPackageChange = (pkgId: string) => {
        const newBudget = calculateEditBudget(
            pkgId,
            editProjectForm.data.building_area,
            editProjectForm.data.package_addons
        );
        const isInteriorPkg = pkgId.toLowerCase().includes('interior');
        editProjectForm.setData({
            ...editProjectForm.data,
            package_name: pkgId,
            category: pkgId,
            building_type: isInteriorPkg
                ? 'interior'
                : editProjectForm.data.building_type === 'interior'
                ? 'rumah_hunian'
                : editProjectForm.data.building_type,
            estimated_budget: newBudget || editProjectForm.data.estimated_budget,
        });
    };

    const toggleEditAddon = (addonId: string) => {
        const nextAddons = editProjectForm.data.package_addons.includes(addonId)
            ? editProjectForm.data.package_addons.filter((id) => id !== addonId)
            : [...editProjectForm.data.package_addons, addonId];
        const newBudget = calculateEditBudget(
            editProjectForm.data.package_name,
            editProjectForm.data.building_area,
            nextAddons
        );
        editProjectForm.setData({
            ...editProjectForm.data,
            package_addons: nextAddons,
            estimated_budget: newBudget || editProjectForm.data.estimated_budget,
        });
    };

    const handleEditAreaChange = (val: string) => {
        const newBudget = calculateEditBudget(
            editProjectForm.data.package_name,
            val,
            editProjectForm.data.package_addons
        );
        editProjectForm.setData({
            ...editProjectForm.data,
            building_area: val,
            estimated_budget: newBudget || editProjectForm.data.estimated_budget,
        });
    };

    const toggleEditMember = (memberId: number) => {
        if (editProjectForm.data.member_ids.includes(memberId)) {
            editProjectForm.setData(
                'member_ids',
                editProjectForm.data.member_ids.filter((id) => id !== memberId)
            );
        } else {
            editProjectForm.setData('member_ids', [...editProjectForm.data.member_ids, memberId]);
        }
    };

    const handleEditProjectSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        editProjectForm.transform((d) => ({
            ...d,
            _method: 'put',
        }));
        editProjectForm.post(route('projects.update', project.id), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setIsEditProjectModalOpen(false);
                setEditCoverError(null);
                editProjectForm.setData('cover_image', null);
            },
        });
    };

    const handleDeleteProject = () => {
        router.delete(route('projects.destroy', project.id));
    };

    const isUrgent =
        typeof project.days_left === 'number' && project.days_left <= 7 && project.status !== 'done';
    const isOverdue =
        typeof project.days_left === 'number' && project.days_left < 0 && project.status !== 'done';
    const isFieldProject = isAdmin
        ? project.project_type === 'pembangunan'
        : auth?.workType === 'lapangan';

    return (
        <AppShell initialRole={initialRole} initialActive={isFieldProject ? 'field-projects' : 'projects'}>
            <Head title={project.name} />

            <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
                {/* Top Navigation & Breadcrumbs */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Link
                            href={route(isFieldProject ? 'projects.field' : 'projects.index')}
                            className="inline-flex items-center gap-1 font-medium hover:text-foreground"
                        >
                            <ArrowLeft className="size-3.5" />
                            <span>{isFieldProject ? 'Proyek Lapangan' : 'Proyek Perencanaan'}</span>
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
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-[#46797b]/12 px-2.5 py-0.5 text-xs font-semibold text-[#46797b]">
                                    {project.category}
                                </span>
                                <span
                                    className={cn(
                                        'rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1',
                                        project.status === 'survey' &&
                                            'bg-cyan-50 text-cyan-800 ring-cyan-200',
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
                                {project.project_type && (
                                    <span className="rounded-full border bg-muted/50 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                                        {project.project_type === 'pembangunan'
                                            ? 'Pembangunan (Lapangan)'
                                            : project.project_type === 'desain_bangun'
                                            ? 'Desain & Bangun'
                                            : 'Perencanaan'}
                                    </span>
                                )}
                            </div>

                            <h1 className="mt-2.5 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                                {project.name}
                            </h1>

                            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                                <span className="inline-flex items-center gap-1.5">
                                    <Users className="size-3.5 text-[#46797b]" />
                                    <span>
                                        Klien: <strong className="text-foreground">{project.client_name}</strong>
                                    </span>
                                </span>
                                {project.client_phone && (
                                    <span className="inline-flex items-center gap-1.5">
                                        <Phone className="size-3.5 text-muted-foreground/80" />
                                        <span>{project.client_phone}</span>
                                    </span>
                                )}
                                {project.location && (
                                    <span className="inline-flex items-center gap-1.5">
                                        <MapPin className="size-3.5 text-muted-foreground/80" />
                                        <span>{project.location}</span>
                                    </span>
                                )}
                            </div>

                            {project.description && (
                                <p className="mt-3 max-w-3xl text-xs text-muted-foreground leading-relaxed">
                                    {project.description}
                                </p>
                            )}
                        </div>

                        {/* Right Summary Metrics */}
                        <div className="flex shrink-0 flex-col gap-3 rounded-xl border bg-muted/25 p-4 lg:w-80">
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
                                                : 'bg-[#46797b]'
                                        )}
                                        style={{ width: `${project.progress_percent}%` }}
                                    />
                                </div>
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                    {project.done_tasks} dari {project.total_tasks} tugas selesai
                                </p>
                            </div>

                            <div className="flex items-center justify-between border-t pt-2.5 text-xs">
                                <span className="text-muted-foreground">Target Deadline</span>
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
                                            <span className="text-[11px] font-normal text-muted-foreground">
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

                    {/* Team Members & Primary Action Row */}
                    <div className="mt-5 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                            <span className="mr-1 text-xs font-semibold text-muted-foreground">
                                Tim Proyek ({project.members.length}):
                            </span>
                            {project.members.map((m) => {
                                const isLead = m.role_in_project.toLowerCase().includes('lead');
                                return (
                                    <div
                                        key={m.id}
                                        title={`${m.name} — ${m.role_in_project}`}
                                        className={cn(
                                            'inline-flex items-center gap-1.5 rounded-full border py-0.5 pl-1 pr-2.5 text-xs',
                                            isLead
                                                ? 'border-[#46797b]/40 bg-[#46797b]/8'
                                                : 'bg-background'
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                'size-5 shrink-0 rounded-full text-[10px] font-bold flex items-center justify-center overflow-hidden',
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
                                        {isLead && (
                                            <span className="rounded-full bg-[#46797b] px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-white">
                                                Lead
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <button
                            type="button"
                            onClick={() => openCreateTaskModal('todo')}
                            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 self-start rounded-lg bg-foreground px-4 text-xs font-semibold text-background shadow-xs transition-colors hover:bg-foreground/90 sm:self-center"
                        >
                            <Plus className="size-3.5" />
                            <span>Tambah Tugas Baru</span>
                        </button>
                    </div>
                </div>

                {/* Tabs Switcher */}
                <div className="flex items-center gap-2 overflow-x-auto border-b">
                    <button
                        type="button"
                        onClick={() => setActiveTab('kanban')}
                        className={cn(
                            'inline-flex shrink-0 items-center gap-2 border-b-2 py-3 px-4 text-xs font-semibold transition',
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
                        onClick={() => setActiveTab('timeline')}
                        className={cn(
                            'inline-flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-semibold transition',
                            activeTab === 'timeline'
                                ? 'border-foreground text-foreground'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        )}
                    >
                        <CalendarDays className="size-4" />
                        <span>Kalender &amp; Timeline</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('updates')}
                        className={cn(
                            'inline-flex shrink-0 items-center gap-2 border-b-2 py-3 px-4 text-xs font-semibold transition',
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

                    <button
                        type="button"
                        onClick={() => setActiveTab('brief')}
                        className={cn(
                            'inline-flex shrink-0 items-center gap-2 border-b-2 py-3 px-4 text-xs font-semibold transition',
                            activeTab === 'brief'
                                ? 'border-foreground text-foreground'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        )}
                    >
                        <FileText className="size-4" />
                        <span>Data Eksisting Klien</span>
                        <span
                            className={cn(
                                'rounded-full px-2 py-0.5 text-[10px]',
                                clientBrief.status === 'submitted'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : clientBrief.status === 'sent'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-muted text-muted-foreground'
                            )}
                        >
                            {clientBrief.status === 'submitted'
                                ? 'Terisi'
                                : clientBrief.status === 'sent'
                                ? 'Menunggu'
                                : 'Draft'}
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
                                {(() => {
                                    const allKanbanTasks = [
                                        ...(kanban.todo || []),
                                        ...(kanban.in_progress || []),
                                        ...(kanban.review || []),
                                        ...(kanban.done || []),
                                    ];
                                    const unassignedStageTasks = allKanbanTasks.filter(
                                        (t) => !t.stage_id || !project.stages.some((s) => s.id === Number(t.stage_id))
                                    );

                                    return (
                                        <>
                                            {project.stages.map((stage, index) => {
                                                const stageTasks = allKanbanTasks.filter(
                                                    (t) => Number(t.stage_id) === Number(stage.id)
                                                );
                                                const doneCount = stageTasks.filter((t) => t.status === 'done').length;
                                                const totalCount = stageTasks.length;
                                                const percent =
                                                    totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

                                                return (
                                                    <div
                                                        key={stage.id}
                                                        draggable={isOwnerOrLead}
                                                        onDragStart={() => setDraggedStageId(stage.id)}
                                                        onDragOver={(e) => e.preventDefault()}
                                                        onDrop={() => handleStageDrop(stage.id)}
                                                        className={cn(
                                                            'flex flex-col gap-3 rounded-xl border bg-background p-4 transition',
                                                            draggedStageId === stage.id &&
                                                                'opacity-50 border-dashed border-[#46797b]'
                                                        )}
                                                    >
                                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                            <div className="flex items-start gap-3">
                                                                {isOwnerOrLead && (
                                                                    <span
                                                                        className="mt-1 cursor-grab text-muted-foreground hover:text-foreground"
                                                                        title="Geser untuk ubah urutan"
                                                                    >
                                                                        <GripVertical className="size-4" />
                                                                    </span>
                                                                )}
                                                                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-bold text-foreground">
                                                                    {index + 1}
                                                                </span>
                                                                <div>
                                                                    <h4 className="text-sm font-bold text-foreground">
                                                                        {stage.name}
                                                                    </h4>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {doneCount} dari {totalCount} tugas selesai
                                                                        {stage.update_design_date_formatted && (
                                                                            <span className="ml-2 text-[11px] text-[#46797b] font-medium">
                                                                                • Target Update: {stage.update_design_date_formatted}
                                                                            </span>
                                                                        )}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-3">
                                                                {isOwnerOrLead && (
                                                                    <div className="flex items-center gap-0.5">
                                                                        <button
                                                                            type="button"
                                                                            disabled={index === 0}
                                                                            onClick={() => handleMoveStage(index, 'up')}
                                                                            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                                                                            title="Pindah ke Atas"
                                                                        >
                                                                            <ArrowUp className="size-3.5" />
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            disabled={index === project.stages.length - 1}
                                                                            onClick={() => handleMoveStage(index, 'down')}
                                                                            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                                                                            title="Pindah ke Bawah"
                                                                        >
                                                                            <ArrowDown className="size-3.5" />
                                                                        </button>
                                                                    </div>
                                                                )}
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

                                                        {/* Daftar Tugas Tersinkronisasi dengan Kanban Board */}
                                                        {stageTasks.length > 0 && (
                                                            <div className="mt-1 flex flex-col gap-1.5 border-t pt-3 pl-0 sm:pl-10">
                                                                {stageTasks.map((task) => (
                                                                    <div
                                                                        key={task.id}
                                                                        className="flex flex-col gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-xs sm:flex-row sm:items-center sm:justify-between"
                                                                    >
                                                                        <div className="flex items-center gap-2 min-w-0">
                                                                            <span
                                                                                className={cn(
                                                                                    'shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold',
                                                                                    priorityConfig[task.priority]?.badge
                                                                                )}
                                                                            >
                                                                                {priorityConfig[task.priority]?.label}
                                                                            </span>
                                                                            <span
                                                                                className={cn(
                                                                                    'truncate font-semibold',
                                                                                    task.status === 'done'
                                                                                        ? 'line-through text-muted-foreground'
                                                                                        : 'text-foreground'
                                                                                )}
                                                                            >
                                                                                {task.title}
                                                                            </span>
                                                                        </div>

                                                                        <div className="flex items-center gap-2 shrink-0">
                                                                            {task.assignee && (
                                                                                <span className="text-[11px] text-muted-foreground">
                                                                                    {task.assignee.name}
                                                                                </span>
                                                                            )}
                                                                            {task.due_date_formatted && (
                                                                                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                                                                                    <Clock className="size-3" />
                                                                                    {task.due_date_formatted}
                                                                                </span>
                                                                            )}
                                                                            <select
                                                                                value={task.status}
                                                                                onChange={(e) =>
                                                                                    handleQuickMoveStatus(
                                                                                        task.id,
                                                                                        e.target.value as KanbanTaskItem['status']
                                                                                    )
                                                                                }
                                                                                className={cn(
                                                                                    'rounded-md border px-2 py-0.5 text-[11px] font-semibold focus:outline-none',
                                                                                    kanbanColumnConfig[task.status]?.badge
                                                                                )}
                                                                            >
                                                                                <option value="todo">To Do</option>
                                                                                <option value="in_progress">In Progress</option>
                                                                                <option value="review">In Review</option>
                                                                                <option value="done">Done</option>
                                                                            </select>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => openEditTaskModal(task)}
                                                                                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                                                                                title="Edit Tugas"
                                                                            >
                                                                                <Edit3 className="size-3.5" />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}

                                            {unassignedStageTasks.length > 0 && (
                                                <div className="rounded-xl border border-dashed bg-muted/15 p-4">
                                                    <h4 className="text-xs font-bold text-muted-foreground">
                                                        Tugas Belum Masuk Tahapan ({unassignedStageTasks.length})
                                                    </h4>
                                                    <div className="mt-2 flex flex-col gap-1.5">
                                                        {unassignedStageTasks.map((task) => (
                                                            <div
                                                                key={task.id}
                                                                className="flex items-center justify-between rounded-lg border bg-background px-3 py-2 text-xs"
                                                            >
                                                                <span className="font-semibold text-foreground">{task.title}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openEditTaskModal(task)}
                                                                    className="rounded-md border px-2 py-0.5 text-[11px] font-semibold hover:bg-muted"
                                                                >
                                                                    Pilih Tahapan
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB: KALENDER & TIMELINE PEKERJAAN */}
                {activeTab === 'timeline' && (() => {
                    const year = calendarMonth.getFullYear();
                    const month = calendarMonth.getMonth();
                    const firstDayOfMonth = new Date(year, month, 1);
                    const startWeekday = firstDayOfMonth.getDay();
                    const daysInMonth = new Date(year, month + 1, 0).getDate();
                    const monthLabel = calendarMonth.toLocaleDateString('id-ID', {
                        month: 'long',
                        year: 'numeric',
                    });

                    type CalendarDayBlock = {
                        stage: ProjectStageItem;
                        phaseType: 'design_work' | 'design_deadline' | 'client_review' | 'client_deadline';
                        badgeLabel: string;
                    };

                    const blocksByDate: Record<string, CalendarDayBlock[]> = {};

                    const addDaysIso = (iso: string, days: number): string => {
                        const d = new Date(iso + 'T00:00:00Z');
                        d.setUTCDate(d.getUTCDate() + days);
                        return d.toISOString().split('T')[0];
                    };

                    const todayNow = new Date();
                    const todayIso = `${todayNow.getFullYear()}-${String(todayNow.getMonth() + 1).padStart(2, '0')}-${String(todayNow.getDate()).padStart(2, '0')}`;

                    const eachDateBetween = (startIso: string, endIso: string, cb: (iso: string) => void) => {
                        if (!startIso || !endIso || startIso > endIso) return;
                        let curr = startIso;
                        let guard = 0;
                        while (curr <= endIso && guard < 180) {
                            cb(curr);
                            curr = addDaysIso(curr, 1);
                            guard++;
                        }
                    };

                    let cursorDate = project.start_date || '';
                    project.stages.forEach((st) => {
                        const designEnd = st.update_design_date || '';
                        const clientEnd = st.client_response_date || '';

                        if (designEnd) {
                            const workStart = cursorDate && cursorDate <= designEnd ? cursorDate : designEnd;
                            eachDateBetween(workStart, designEnd, (iso) => {
                                blocksByDate[iso] ??= [];
                                const isDeadline = iso === designEnd;
                                blocksByDate[iso].push({
                                    stage: st,
                                    phaseType: isDeadline ? 'design_deadline' : 'design_work',
                                    badgeLabel: isDeadline ? '📌 Batas Update Desain' : 'Pengerjaan Desain',
                                });
                            });
                        }

                        if (clientEnd) {
                            const reviewStart = designEnd ? addDaysIso(designEnd, 1) : clientEnd;
                            const actualReviewStart = reviewStart <= clientEnd ? reviewStart : clientEnd;
                            eachDateBetween(actualReviewStart, clientEnd, (iso) => {
                                blocksByDate[iso] ??= [];
                                const isDeadline = iso === clientEnd;
                                blocksByDate[iso].push({
                                    stage: st,
                                    phaseType: isDeadline ? 'client_deadline' : 'client_review',
                                    badgeLabel: isDeadline ? '⏰ Batas Respon Klien' : 'Diskusi & Review Klien',
                                });
                            });
                        }

                        if (clientEnd) {
                            cursorDate = addDaysIso(clientEnd, 1);
                        } else if (designEnd) {
                            cursorDate = addDaysIso(designEnd, 1);
                        }
                    });

                    const calendarCells: Array<number | null> = [];
                    for (let i = 0; i < startWeekday; i++) calendarCells.push(null);
                    for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);

                    return (
                        <div className="flex flex-col gap-5">
                            {/* Header & Action Bar */}
                            <div className="flex flex-col gap-3 rounded-2xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h3 className="text-sm font-bold text-foreground">
                                        Timeline Pekerjaan &amp; Jadwal Asistensi Klien
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Setiap perubahan jadwal tahapan otomatis tersinkronisasi ke{' '}
                                        <Link href={route('calendar.index')} className="font-semibold text-[#46797b] hover:underline">
                                            Kalender Studio
                                        </Link>.
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <a
                                        href={route('projects.timeline.print', project.id)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                                    >
                                        <Printer className="size-3.5" />
                                        <span>Cetak / PDF Timeline</span>
                                    </a>
                                    {isOwnerOrLead && (
                                        <button
                                            type="button"
                                            onClick={openCreateStageModal}
                                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#46797b] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#3a6668]"
                                        >
                                            <Plus className="size-3.5" />
                                            <span>Tambah Tahap Timeline</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Legend Status Warna Resmi */}
                            <div className="flex flex-wrap items-center gap-4 rounded-xl border bg-muted/20 px-4 py-2.5 text-xs">
                                <span className="font-semibold text-muted-foreground">Keterangan Status:</span>
                                <span className="inline-flex items-center gap-1.5 font-medium text-amber-800">
                                    <span className="size-3 rounded-sm bg-amber-300 border border-amber-400" />
                                    Dalam Proses Pengerjaan
                                </span>
                                <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                                    <span className="size-3 rounded-sm bg-sky-200 border border-sky-300" />
                                    Belum Dimulai
                                </span>
                                <span className="inline-flex items-center gap-1.5 font-medium text-emerald-800">
                                    <span className="size-3 rounded-sm bg-emerald-200 border border-emerald-400" />
                                    Sudah Selesai
                                </span>
                            </div>

                            {/* Tabel Timeline Pekerjaan */}
                            <div className="overflow-hidden rounded-2xl border bg-card">
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse text-left text-xs">
                                        <thead>
                                            <tr className="border-b bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                                <th className="px-4 py-3">Tahap Pekerjaan</th>
                                                <th className="px-4 py-3">Update Desain Maksimal</th>
                                                <th className="px-4 py-3">Diskusi &amp; Respon Maksimal</th>
                                                <th className="px-4 py-3">Status</th>
                                                <th className="px-4 py-3">Output Deliverables</th>
                                                {isOwnerOrLead && <th className="px-4 py-3 text-right">Aksi</th>}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {project.stages.length === 0 ? (
                                                <tr>
                                                    <td colSpan={isOwnerOrLead ? 6 : 5} className="px-4 py-8 text-center text-muted-foreground">
                                                        Belum ada tahapan timeline. Klik "Tambah Tahap Timeline" untuk membuat jadwal.
                                                    </td>
                                                </tr>
                                            ) : (
                                                project.stages.map((stage, stageIdx) => {
                                                    const rowHighlight =
                                                        stage.status === 'active'
                                                            ? 'bg-amber-50/70'
                                                            : stage.status === 'completed'
                                                            ? 'bg-emerald-50/60'
                                                            : 'bg-sky-50/35';

                                                    return (
                                                        <tr
                                                            key={stage.id}
                                                            draggable={isOwnerOrLead}
                                                            onDragStart={() => setDraggedStageId(stage.id)}
                                                            onDragOver={(e) => e.preventDefault()}
                                                            onDrop={() => handleStageDrop(stage.id)}
                                                            className={cn(
                                                                'transition-colors hover:bg-muted/30',
                                                                rowHighlight,
                                                                draggedStageId === stage.id && 'opacity-50'
                                                            )}
                                                        >
                                                            <td className="px-4 py-3 font-bold text-foreground">
                                                                <div className="flex items-center gap-2">
                                                                    {isOwnerOrLead && (
                                                                        <span
                                                                            className="cursor-grab text-muted-foreground hover:text-foreground"
                                                                            title="Geser untuk ubah urutan"
                                                                        >
                                                                            <GripVertical className="size-3.5" />
                                                                        </span>
                                                                    )}
                                                                    <div>
                                                                        <div>{stage.name}</div>
                                                                        {stage.duration_workdays && (
                                                                            <span className="text-[10px] font-normal text-muted-foreground">
                                                                                Est. {stage.duration_workdays} hari kerja
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                                                                {stage.update_design_date_formatted || (
                                                                    <span className="text-muted-foreground italic">Belum diatur</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                                                                {stage.client_response_date_formatted || (
                                                                    <span className="text-muted-foreground italic">Belum diatur</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                {isOwnerOrLead ? (
                                                                    <select
                                                                        value={stage.status}
                                                                        onChange={(e) =>
                                                                            handleQuickStageStatus(
                                                                                stage,
                                                                                e.target.value as ProjectStageItem['status']
                                                                            )
                                                                        }
                                                                        className={cn(
                                                                            'rounded-lg border px-2 py-1 text-[11px] font-semibold focus:outline-none',
                                                                            stage.status === 'active'
                                                                                ? 'border-amber-300 bg-amber-100 text-amber-900'
                                                                                : stage.status === 'completed'
                                                                                ? 'border-emerald-300 bg-emerald-100 text-emerald-900'
                                                                                : 'border-sky-300 bg-sky-100 text-sky-900'
                                                                        )}
                                                                    >
                                                                        <option value="pending">Belum Dimulai</option>
                                                                        <option value="active">Dalam Proses</option>
                                                                        <option value="completed">Sudah Selesai</option>
                                                                    </select>
                                                                ) : (
                                                                    <span
                                                                        className={cn(
                                                                            'inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                                                                            stage.status === 'active'
                                                                                ? 'bg-amber-100 text-amber-900'
                                                                                : stage.status === 'completed'
                                                                                ? 'bg-emerald-100 text-emerald-900'
                                                                                : 'bg-sky-100 text-sky-900'
                                                                        )}
                                                                    >
                                                                        {stage.status === 'active'
                                                                            ? 'Dalam Proses'
                                                                            : stage.status === 'completed'
                                                                            ? 'Sudah Selesai'
                                                                            : 'Belum Dimulai'}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-[11px] text-muted-foreground max-w-xs">
                                                                <p className="line-clamp-2">{stage.output_notes || '-'}</p>
                                                            </td>
                                                            {isOwnerOrLead && (
                                                                <td className="px-4 py-3 text-right whitespace-nowrap">
                                                                    <div className="inline-flex items-center gap-1">
                                                                        <button
                                                                            type="button"
                                                                            disabled={stageIdx === 0}
                                                                            onClick={() => handleMoveStage(stageIdx, 'up')}
                                                                            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                                                                            title="Pindah ke Atas"
                                                                        >
                                                                            <ArrowUp className="size-3.5" />
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            disabled={stageIdx === project.stages.length - 1}
                                                                            onClick={() => handleMoveStage(stageIdx, 'down')}
                                                                            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                                                                            title="Pindah ke Bawah"
                                                                        >
                                                                            <ArrowDown className="size-3.5" />
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => openEditStageModal(stage)}
                                                                            className="rounded-lg border bg-background px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-muted"
                                                                        >
                                                                            Sesuaikan
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleDeleteStage(stage.id)}
                                                                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-rose-50 hover:text-rose-600"
                                                                            title="Hapus Tahap"
                                                                        >
                                                                            <Trash2 className="size-3.5" />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Kalender Visual Timeline Proyek */}
                            <div className="rounded-2xl border bg-card p-5">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
                                    <div>
                                        <h4 className="text-sm font-bold text-foreground">
                                            Kalender Timeline Proyek — {monthLabel}
                                        </h4>
                                        <p className="text-[11px] text-muted-foreground">
                                            Setiap rentang tanggal pengerjaan dan masa diskusi klien diblok penuh agar tim mudah memantau progres harian.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setCalendarMonth(new Date(year, month - 1, 1))
                                            }
                                            className="rounded-lg border p-1.5 hover:bg-muted"
                                            title="Bulan Sebelumnya"
                                        >
                                            <ChevronLeft className="size-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCalendarMonth(new Date())}
                                            className="rounded-lg border px-2.5 py-1 text-xs font-semibold hover:bg-muted"
                                        >
                                            Bulan Ini
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setCalendarMonth(new Date(year, month + 1, 1))
                                            }
                                            className="rounded-lg border p-1.5 hover:bg-muted"
                                            title="Bulan Berikutnya"
                                        >
                                            <ChevronRight className="size-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Legend Kalender */}
                                <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                                    <span className="inline-flex items-center gap-1.5 font-medium">
                                        <span className="size-3 rounded-sm bg-amber-100 border border-amber-300" />
                                        Pengerjaan (Proses)
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 font-medium">
                                        <span className="size-3 rounded-sm bg-emerald-100 border border-emerald-300" />
                                        Tahap Selesai
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 font-medium">
                                        <span className="size-3 rounded-sm bg-slate-100 border border-slate-300" />
                                        Belum Dimulai
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 font-medium">
                                        <span className="size-3 rounded-sm bg-sky-100 border border-sky-300" />
                                        Diskusi &amp; Respon Klien
                                    </span>
                                </div>

                                <div className="mt-3 grid grid-cols-7 gap-1.5 text-center text-[11px] font-bold text-muted-foreground">
                                    {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((d) => (
                                        <div key={d} className="py-1.5">
                                            {d}
                                        </div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-7 gap-1.5">
                                    {calendarCells.map((day, idx) => {
                                        if (day === null) {
                                            return (
                                                <div
                                                    key={`empty-${idx}`}
                                                    className="min-h-[96px] rounded-xl bg-muted/15"
                                                />
                                            );
                                        }

                                        const mm = String(month + 1).padStart(2, '0');
                                        const dd = String(day).padStart(2, '0');
                                        const isoDate = `${year}-${mm}-${dd}`;
                                        const dayBlocks = blocksByDate[isoDate] || [];
                                        const isToday = todayIso === isoDate;
                                        const dayOfWeek = (startWeekday + day - 1) % 7;
                                        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                                        // Determine full-cell block style from primary block of this date
                                        const primary = dayBlocks[0];
                                        let cellBgClass = isWeekend
                                            ? 'border-border/60 bg-muted/25'
                                            : 'border-border bg-background';

                                        if (primary) {
                                            if (
                                                primary.phaseType === 'client_review' ||
                                                primary.phaseType === 'client_deadline'
                                            ) {
                                                cellBgClass = 'border-sky-300 bg-sky-50/90';
                                            } else if (primary.stage.status === 'completed') {
                                                cellBgClass = 'border-emerald-300 bg-emerald-50/90';
                                            } else if (primary.stage.status === 'active') {
                                                cellBgClass = 'border-amber-300 bg-amber-50/95';
                                            } else {
                                                cellBgClass = 'border-slate-300 bg-slate-100/80';
                                            }
                                        }

                                        return (
                                            <div
                                                key={isoDate}
                                                onClick={() => {
                                                    if (isOwnerOrLead && primary) {
                                                        openEditStageModal(primary.stage);
                                                    }
                                                }}
                                                className={cn(
                                                    'min-h-[96px] rounded-xl border p-2 flex flex-col justify-between gap-1.5 transition-all',
                                                    cellBgClass,
                                                    isToday && 'ring-2 ring-[#46797b] ring-offset-1',
                                                    isOwnerOrLead && primary && 'cursor-pointer hover:brightness-95'
                                                )}
                                            >
                                                <div className="flex items-center justify-between">
                                                    {isWeekend && !primary ? (
                                                        <span className="text-[9px] font-medium text-muted-foreground/70">
                                                            Libur
                                                        </span>
                                                    ) : (
                                                        <span />
                                                    )}
                                                    <span
                                                        className={cn(
                                                            'text-[11px] font-bold px-1.5 py-0.5 rounded-md',
                                                            isToday
                                                                ? 'bg-[#46797b] text-white'
                                                                : primary
                                                                ? 'text-foreground/90 bg-white/70'
                                                                : 'text-muted-foreground'
                                                        )}
                                                    >
                                                        {day}
                                                    </span>
                                                </div>

                                                {dayBlocks.length > 0 && (
                                                    <div className="flex flex-col gap-1">
                                                        {dayBlocks.map((blk, bIdx) => {
                                                            const isDeadline =
                                                                blk.phaseType === 'design_deadline' ||
                                                                blk.phaseType === 'client_deadline';

                                                            return (
                                                                <div
                                                                    key={`${blk.stage.id}-${blk.phaseType}-${bIdx}`}
                                                                    className="flex flex-col gap-0.5"
                                                                    title={`${blk.stage.name} — ${blk.badgeLabel}`}
                                                                >
                                                                    <span className="text-[10.5px] font-bold leading-tight text-foreground line-clamp-2">
                                                                        {blk.stage.name}
                                                                    </span>
                                                                    <span
                                                                        className={cn(
                                                                            'inline-block w-fit rounded px-1.5 py-0.5 text-[9.5px] font-semibold leading-none',
                                                                            blk.phaseType === 'design_deadline'
                                                                                ? 'bg-amber-500 text-white'
                                                                                : blk.phaseType === 'client_deadline'
                                                                                ? 'bg-sky-600 text-white'
                                                                                : isDeadline
                                                                                ? 'bg-foreground text-background'
                                                                                : 'bg-white/75 text-foreground/80'
                                                                        )}
                                                                    >
                                                                        {blk.badgeLabel}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                })()}

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

                {/* TAB 5: DATA EKSISTING KLIEN */}
                {activeTab === 'brief' && (
                    <ProjectBriefTab
                        projectId={project.id}
                        projectName={project.name}
                        clientName={project.client_name}
                        clientPhone={project.client_phone}
                        isOwnerOrLead={isOwnerOrLead}
                        brief={clientBrief}
                    />
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

            {/* MODAL EDIT PROYEK (Disamakan dengan Buat Proyek Baru) */}
            {isEditProjectModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
                    <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border bg-card p-6 shadow-2xl">
                        <div className="flex items-start justify-between border-b pb-3">
                            <div>
                                <h3 className="text-base font-bold text-foreground">
                                    Edit Informasi Proyek
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Perbarui lingkup, paket layanan, jadwal, cover, dan penugasan tim proyek.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsEditProjectModalOpen(false)}
                                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        <form onSubmit={handleEditProjectSubmit} className="mt-4 flex flex-col gap-4">
                            {/* Section 1: Info Dasar & Paket Layanan */}
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div className="sm:col-span-2">
                                    <label className="text-xs font-semibold text-foreground">
                                        Nama Proyek <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={editProjectForm.data.name}
                                        onChange={(e) => editProjectForm.setData('name', e.target.value)}
                                        placeholder="cth: Villa Sunset Cliff Jimbaran"
                                        className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                                    />
                                    {editProjectForm.errors.name && (
                                        <p className="mt-1 text-xs text-rose-500">{editProjectForm.errors.name}</p>
                                    )}
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="text-xs font-semibold text-foreground">
                                        Lingkup Proyek <span className="text-rose-500">*</span>
                                    </label>
                                    <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
                                        {[
                                            {
                                                value: 'perencanaan' as const,
                                                title: 'Perencanaan',
                                                desc: 'Desain / gambar saja, tanpa fisik lapangan',
                                            },
                                            {
                                                value: 'pembangunan' as const,
                                                title: 'Pembangunan',
                                                desc: 'Fisik / kontraktor, dikerjakan tim lapangan',
                                            },
                                            {
                                                value: 'desain_bangun' as const,
                                                title: 'Desain & Bangun',
                                                desc: 'Perencanaan dilanjut pembangunan fisik',
                                            },
                                        ].map((opt) => {
                                            const active = editProjectForm.data.project_type === opt.value;
                                            return (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onClick={() => editProjectForm.setData('project_type', opt.value)}
                                                    className={cn(
                                                        'rounded-lg border p-2.5 text-left transition-colors',
                                                        active
                                                            ? 'border-[#46797b] bg-[#46797b]/10 ring-1 ring-[#46797b]'
                                                            : 'bg-background hover:bg-muted',
                                                    )}
                                                >
                                                    <p className="text-xs font-semibold text-foreground">{opt.title}</p>
                                                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                                                        {opt.desc}
                                                    </p>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <p className="mt-1 text-[11px] text-muted-foreground">
                                        Proyek Pembangunan &amp; Desain-Bangun akan muncul di pilihan Site Visit karyawan lapangan.
                                    </p>
                                </div>

                                {packages.length > 0 && (
                                    <div className="sm:col-span-2">
                                        <label className="text-xs font-semibold text-foreground">
                                            Paket Layanan (Pricelist RIM Projects) <span className="text-rose-500">*</span>
                                        </label>
                                        <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                            {packages.map((pkg) => {
                                                const active = editProjectForm.data.package_name === pkg.id;
                                                return (
                                                    <button
                                                        key={pkg.id}
                                                        type="button"
                                                        onClick={() => handleEditPackageChange(pkg.id)}
                                                        className={cn(
                                                            'flex flex-col items-start rounded-xl border p-3 text-left transition-all',
                                                            active
                                                                ? 'border-[#46797b] bg-[#46797b]/5 ring-1 ring-[#46797b]'
                                                                : 'border-border bg-background hover:bg-muted/40'
                                                        )}
                                                    >
                                                        <div className="flex w-full items-center justify-between gap-2">
                                                            <span className="text-xs font-bold text-foreground">
                                                                {pkg.name}
                                                            </span>
                                                            <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold text-foreground">
                                                                {pkg.price_per_m2 > 0
                                                                    ? `Rp ${(pkg.price_per_m2 / 1000).toFixed(0)}.000/m²`
                                                                    : 'Custom'}
                                                            </span>
                                                        </div>
                                                        <p className="mt-1 text-[11px] text-muted-foreground">
                                                            {pkg.tagline}
                                                        </p>
                                                        {pkg.min_area > 0 && (
                                                            <span className="mt-1 text-[10px] text-muted-foreground">
                                                                Min. order {pkg.min_area} m²
                                                            </span>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Jenis Bangunan (Menentukan Template Form Data Eksisting Klien) */}
                                <div className="sm:col-span-2">
                                    <label className="text-xs font-semibold text-foreground">
                                        Jenis Bangunan / Form Data Eksisting Klien <span className="text-rose-500">*</span>
                                    </label>
                                    {editProjectForm.data.package_name.toLowerCase().includes('interior') ? (
                                        <div className="mt-1.5 flex items-center justify-between rounded-lg border border-[#46797b]/40 bg-[#46797b]/10 px-3 py-2 text-xs">
                                            <span className="font-semibold text-foreground">
                                                Interior (Otomatis sesuai Paket Interior)
                                            </span>
                                            <span className="text-[11px] text-muted-foreground">
                                                Form Klien: Interior Designer Documents
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                            {[
                                                {
                                                    value: 'rumah_hunian' as const,
                                                    title: 'Rumah Hunian',
                                                    desc: 'Form data penghuni, ruang Lt. 1–2, gaya hidup & data teknis rumah',
                                                },
                                                {
                                                    value: 'komersial' as const,
                                                    title: 'Komersial / Bisnis',
                                                    desc: 'Form profil bisnis, customer, operasional, area usaha & identitas brand',
                                                },
                                            ].map((opt) => {
                                                const active = editProjectForm.data.building_type === opt.value;
                                                return (
                                                    <button
                                                        key={opt.value}
                                                        type="button"
                                                        onClick={() => editProjectForm.setData('building_type', opt.value)}
                                                        className={cn(
                                                            'rounded-lg border p-2.5 text-left transition-colors',
                                                            active
                                                                ? 'border-[#46797b] bg-[#46797b]/10 ring-1 ring-[#46797b]'
                                                                : 'bg-background hover:bg-muted',
                                                        )}
                                                    >
                                                        <p className="text-xs font-semibold text-foreground">{opt.title}</p>
                                                        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                                                            {opt.desc}
                                                        </p>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Add-on & Custom Scope */}
                                <div className="sm:col-span-2 rounded-xl border bg-muted/20 p-3">
                                    <label className="text-xs font-semibold text-foreground">
                                        Layanan Tambahan (Add-On) &amp; Custom
                                    </label>
                                    {addons.length > 0 && (
                                        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                            {addons.map((addon) => {
                                                const checked = editProjectForm.data.package_addons.includes(addon.id);
                                                return (
                                                    <label
                                                        key={addon.id}
                                                        className={cn(
                                                            'flex cursor-pointer items-start gap-2 rounded-lg border p-2 text-xs transition-colors',
                                                            checked
                                                                ? 'border-[#46797b] bg-[#46797b]/5 font-medium text-foreground'
                                                                : 'border-border bg-background text-muted-foreground hover:bg-muted/40'
                                                        )}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            onChange={() => toggleEditAddon(addon.id)}
                                                            className="mt-0.5 rounded border-gray-300 text-[#46797b] focus:ring-[#46797b]"
                                                        />
                                                        <span className="leading-snug">{addon.label}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    )}

                                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <div>
                                            <label className="text-[11px] font-semibold text-foreground">
                                                Luas Bangunan (m²)
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.5"
                                                value={editProjectForm.data.building_area}
                                                onChange={(e) => handleEditAreaChange(e.target.value)}
                                                placeholder="cth: 120"
                                                className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-semibold text-foreground">
                                                Estimasi Nilai Kontrak Desain (Rp)
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={editProjectForm.data.estimated_budget}
                                                onChange={(e) =>
                                                    editProjectForm.setData('estimated_budget', e.target.value)
                                                }
                                                placeholder="Otomatis terhitung atau isi manual"
                                                className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-2.5">
                                        <label className="text-[11px] font-semibold text-foreground">
                                            Catatan Lingkup Custom / Request Khusus Klien (Opsional)
                                        </label>
                                        <input
                                            type="text"
                                            value={editProjectForm.data.custom_scope_notes}
                                            onChange={(e) =>
                                                editProjectForm.setData('custom_scope_notes', e.target.value)
                                            }
                                            placeholder="cth: Hanya desain fasad + revisi ruang tamu, atau tambahan 3D animasi"
                                            className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-foreground">
                                        Status Proyek <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        value={editProjectForm.data.status}
                                        onChange={(e) =>
                                            editProjectForm.setData(
                                                'status',
                                                e.target.value as ProjectDetailData['status']
                                            )
                                        }
                                        className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                                    >
                                        {statusOptions.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-foreground">
                                        Nama Klien <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={editProjectForm.data.client_name}
                                        onChange={(e) => editProjectForm.setData('client_name', e.target.value)}
                                        placeholder="cth: Bpk. Hendra Wijaya"
                                        className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-foreground">
                                        No. WhatsApp / Telepon Klien
                                    </label>
                                    <input
                                        type="text"
                                        value={editProjectForm.data.client_phone}
                                        onChange={(e) => editProjectForm.setData('client_phone', e.target.value)}
                                        placeholder="cth: 081234567890"
                                        className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-foreground">
                                        Lokasi Lahan / Proyek
                                    </label>
                                    <input
                                        type="text"
                                        value={editProjectForm.data.location}
                                        onChange={(e) => editProjectForm.setData('location', e.target.value)}
                                        placeholder="cth: Bali, Jakarta Selatan, Bandung..."
                                        className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                                    />
                                </div>
                            </div>

                            {/* Section 2: Jadwal & Link Drive */}
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div>
                                    <label className="text-xs font-semibold text-foreground">
                                        Tanggal Mulai
                                    </label>
                                    <input
                                        type="date"
                                        value={editProjectForm.data.start_date}
                                        onChange={(e) => editProjectForm.setData('start_date', e.target.value)}
                                        className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-foreground">
                                        Target Deadline Serah Terima
                                    </label>
                                    <input
                                        type="date"
                                        value={editProjectForm.data.due_date}
                                        onChange={(e) => editProjectForm.setData('due_date', e.target.value)}
                                        className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                                    />
                                    {editProjectForm.errors.due_date && (
                                        <p className="mt-1 text-xs text-rose-500">{editProjectForm.errors.due_date}</p>
                                    )}
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="text-xs font-semibold text-foreground">
                                        Link Folder Google Drive (Asset 3D, CAD, Referensi)
                                    </label>
                                    <input
                                        type="url"
                                        value={editProjectForm.data.drive_url}
                                        onChange={(e) => editProjectForm.setData('drive_url', e.target.value)}
                                        placeholder="https://drive.google.com/drive/folders/..."
                                        className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                                    />
                                </div>
                            </div>

                            {/* Section 3: Gambar Cover */}
                            <div>
                                <label className="text-xs font-semibold text-foreground">
                                    Gambar Cover / 3D Render
                                </label>
                                <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:items-center">
                                    <img
                                        src={editCoverPreview}
                                        alt="Preview"
                                        className="h-16 w-28 rounded-lg object-cover border shrink-0"
                                    />
                                    <div className="flex flex-col gap-2 flex-1">
                                        <label className="inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted">
                                            <ImagePlus className="size-3.5 text-[#46797b]" />
                                            <span>Unggah Gambar dari Perangkat</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={async (e) => {
                                                    const rawFile = e.target.files?.[0];
                                                    if (!rawFile) return;
                                                    setEditCoverError(null);
                                                    const { file, error } = await prepareWebImage(rawFile, {
                                                        maxWidth: 1600,
                                                        maxHeight: 1200,
                                                        maxBytes: 4 * 1024 * 1024,
                                                    });
                                                    if (error) {
                                                        setEditCoverError(error);
                                                        e.target.value = '';
                                                        return;
                                                    }
                                                    editProjectForm.setData('cover_image', file);
                                                    setEditCoverPreview(URL.createObjectURL(file));
                                                }}
                                                className="hidden"
                                            />
                                        </label>
                                        <span className="text-[11px] text-muted-foreground">
                                            Otomatis disesuaikan untuk web (maks. 4 MB). Biarkan kosong untuk mempertahankan cover saat ini.
                                        </span>
                                        {editCoverError && (
                                            <div className="flex items-center gap-2 rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700">
                                                <AlertTriangle className="size-3.5 shrink-0" />
                                                <span>{editCoverError}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Section 4: Penugasan Tim Proyek */}
                            <div className="rounded-xl border bg-muted/20 p-3.5">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Penugasan Tim Proyek
                                </h4>

                                <div className="mt-2.5">
                                    <label className="text-xs font-semibold text-foreground">
                                        Lead Architect / PIC Utama
                                    </label>
                                    <select
                                        value={editProjectForm.data.lead_id}
                                        onChange={(e) => editProjectForm.setData('lead_id', e.target.value)}
                                        className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                                    >
                                        <option value="">Pilih Lead Architect / PIC...</option>
                                        {teamMembers.map((m) => (
                                            <option key={m.id} value={m.id}>
                                                {m.name} ({m.position} - {m.employee_code})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="mt-3">
                                    <label className="text-xs font-semibold text-foreground">
                                        Anggota Tim Desain / Lapangan
                                    </label>
                                    <div className="mt-1.5 grid max-h-36 grid-cols-1 gap-2 overflow-y-auto rounded-lg border bg-background p-2 sm:grid-cols-2">
                                        {teamMembers.map((m) => {
                                            const isChecked = editProjectForm.data.member_ids.includes(m.id);
                                            return (
                                                <label
                                                    key={m.id}
                                                    className={cn(
                                                        'flex items-center gap-2 rounded-md p-1.5 text-xs transition cursor-pointer',
                                                        isChecked
                                                            ? 'bg-primary/10 text-primary font-semibold'
                                                            : 'hover:bg-muted text-foreground'
                                                    )}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => toggleEditMember(m.id)}
                                                        className="size-3.5 rounded border-muted-foreground/30 text-primary focus:ring-primary"
                                                    />
                                                    <span className="truncate">
                                                        {m.name} ({m.position})
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Section 5: Deskripsi */}
                            <div>
                                <label className="text-xs font-semibold text-foreground">
                                    Deskripsi Proyek
                                </label>
                                <textarea
                                    rows={3}
                                    value={editProjectForm.data.description}
                                    onChange={(e) => editProjectForm.setData('description', e.target.value)}
                                    className="mt-1 w-full rounded-lg border bg-background p-2.5 text-xs focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
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
            {/* MODAL TAMBAH / SESUAIKAN TAHAP TIMELINE */}
            {isStageModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
                    <div className="relative w-full max-w-lg rounded-2xl border bg-card p-6 shadow-2xl">
                        <div className="flex items-start justify-between border-b pb-3">
                            <div>
                                <h3 className="text-base font-bold text-foreground">
                                    {editingStage ? 'Sesuaikan Tahapan & Jadwal' : 'Tambah Tahap Timeline'}
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Perubahan jadwal otomatis sinkron dengan Kalender Studio.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsStageModalOpen(false)}
                                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
                            >
                                <X className="size-4" />
                            </button>
                        </div>

                        <form onSubmit={handleStageTimelineSubmit} className="mt-4 flex flex-col gap-3">
                            <div>
                                <label className="text-xs font-semibold text-foreground">
                                    Nama Tahap Pekerjaan <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={stageTimelineForm.data.name}
                                    onChange={(e) => stageTimelineForm.setData('name', e.target.value)}
                                    placeholder="cth: Tahap Konseptual V1"
                                    className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs focus:border-foreground focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div>
                                    <label className="text-xs font-semibold text-foreground">
                                        Update Desain Maksimal
                                    </label>
                                    <input
                                        type="date"
                                        value={stageTimelineForm.data.update_design_date}
                                        onChange={(e) => handleStageUpdateDesignDateChange(e.target.value)}
                                        className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs focus:border-foreground focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-foreground">
                                        Diskusi &amp; Respon Maksimal (+3 Hari)
                                    </label>
                                    <input
                                        type="date"
                                        value={stageTimelineForm.data.client_response_date}
                                        onChange={(e) =>
                                            stageTimelineForm.setData('client_response_date', e.target.value)
                                        }
                                        className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs focus:border-foreground focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div>
                                    <label className="text-xs font-semibold text-foreground">
                                        Status Pengerjaan
                                    </label>
                                    <select
                                        value={stageTimelineForm.data.status}
                                        onChange={(e) =>
                                            stageTimelineForm.setData(
                                                'status',
                                                e.target.value as ProjectStageItem['status']
                                            )
                                        }
                                        className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs focus:border-foreground focus:outline-none"
                                    >
                                        <option value="pending">Belum Dimulai</option>
                                        <option value="active">Dalam Proses Pengerjaan</option>
                                        <option value="completed">Sudah Selesai</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-foreground">
                                        Estimasi Durasi (Hari Kerja)
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={stageTimelineForm.data.duration_workdays}
                                        onChange={(e) =>
                                            stageTimelineForm.setData('duration_workdays', e.target.value)
                                        }
                                        placeholder="cth: 7"
                                        className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs focus:border-foreground focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground">
                                    Penjelasan Output Deliverables
                                </label>
                                <textarea
                                    rows={3}
                                    value={stageTimelineForm.data.output_notes}
                                    onChange={(e) =>
                                        stageTimelineForm.setData('output_notes', e.target.value)
                                    }
                                    placeholder="Rincian output desain pada tahapan ini..."
                                    className="mt-1 w-full rounded-lg border bg-background p-2.5 text-xs focus:border-foreground focus:outline-none"
                                />
                            </div>

                            <div className="mt-2 flex items-center justify-end gap-2 border-t pt-3">
                                <button
                                    type="button"
                                    onClick={() => setIsStageModalOpen(false)}
                                    className="rounded-lg border px-3.5 py-1.5 text-xs font-semibold hover:bg-muted"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={stageTimelineForm.processing}
                                    className="rounded-lg bg-[#46797b] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#3a6668] disabled:opacity-50"
                                >
                                    {stageTimelineForm.processing ? 'Menyimpan...' : 'Simpan Timeline'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppShell>
    );
}
