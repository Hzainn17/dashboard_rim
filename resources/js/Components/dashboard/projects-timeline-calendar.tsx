import * as React from 'react';
import { useMemo, useState } from 'react';
import { Link } from '@inertiajs/react';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TimelineStage {
    id: number;
    name: string;
    status: 'pending' | 'active' | 'completed';
    update_design_date?: string | null;
    client_response_date?: string | null;
}

export interface TimelineProject {
    id: number;
    name: string;
    client_name: string;
    pic?: string;
    active_stage?: string;
    status: string;
    start_date?: string | null;
    due_date?: string | null;
    stages: TimelineStage[];
}

type CellKind =
    | 'deadline'
    | 'deadline_internal'
    | 'working'
    | 'owner_ball'
    | 'review';

interface CellState {
    kind: CellKind;
    stageName: string;
    note: string;
}

const cellStyles: Record<CellKind, string> = {
    deadline: 'bg-rose-500 text-white font-bold',
    deadline_internal: 'bg-amber-400 text-amber-950 font-bold',
    working: 'bg-emerald-200/85 text-emerald-950',
    owner_ball: 'bg-sky-200/90 text-sky-950',
    review: 'bg-purple-200/90 text-purple-950',
};

const addDaysIso = (iso: string, days: number): string => {
    const d = new Date(iso + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().split('T')[0];
};

const eachDate = (startIso: string, endIso: string, cb: (iso: string) => void) => {
    if (!startIso || !endIso || startIso > endIso) return;
    let curr = startIso;
    let guard = 0;
    while (curr <= endIso && guard < 370) {
        cb(curr);
        curr = addDaysIso(curr, 1);
        guard++;
    }
};

const toLocalIso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const shortenStage = (name?: string): string => {
    if (!name) return 'Plan';
    const map: Record<string, string> = {
        'Tahap Konseptual V1': 'K V1',
        'Tahap Konseptual V2': 'K V2',
        'Tahap Pengembangan V1': 'P V1',
        'Tahap Pengembangan V2': 'P V2',
    };
    if (map[name]) return map[name];
    if (name.length <= 8) return name;
    return name.slice(0, 8);
};

const stageBadgeClass = (name?: string, status?: string): string => {
    if (status === 'review') return 'bg-purple-600 text-white';
    if (!name) return 'bg-slate-600 text-white';
    const lower = name.toLowerCase();
    if (lower.includes('konseptual')) return 'bg-emerald-600 text-white';
    if (lower.includes('pengembangan')) return 'bg-sky-600 text-white';
    if (lower.includes('ded')) return 'bg-indigo-600 text-white';
    if (lower.includes('rab')) return 'bg-amber-600 text-white';
    return 'bg-teal-700 text-white';
};

export function ProjectsTimelineCalendar({ projects }: { projects: TimelineProject[] }) {
    const todayIso = toLocalIso(new Date());
    const [startDateIso, setStartDateIso] = useState<string>(() => addDaysIso(todayIso, -3));
    const [picFilter, setPicFilter] = useState<string>('all');
    const [projectFilter, setProjectFilter] = useState<string>('all');
    const [stageFilter, setStageFilter] = useState<string>('all');
    const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
    const [selectedCell, setSelectedCell] = useState<{
        project: TimelineProject;
        iso: string;
        note: string;
    } | null>(null);

    const DAYS_COUNT = 26;

    const dateColumns = useMemo(() => {
        const dayNames = ['Mg', 'Sn', 'Sl', 'Rb', 'Km', 'Jm', 'Sb'];
        const cols: Array<{
            iso: string;
            dayNum: number;
            dayName: string;
            monthShort: string;
            monthYearLabel: string;
            isToday: boolean;
            isWeekend: boolean;
        }> = [];
        for (let i = 0; i < DAYS_COUNT; i++) {
            const iso = addDaysIso(startDateIso, i);
            const d = new Date(iso + 'T00:00:00Z');
            const dow = d.getUTCDay();
            cols.push({
                iso,
                dayNum: d.getUTCDate(),
                dayName: dayNames[dow],
                monthShort: d.toLocaleDateString('id-ID', { month: 'short', timeZone: 'UTC' }),
                monthYearLabel: d.toLocaleDateString('id-ID', {
                    month: 'long',
                    year: 'numeric',
                    timeZone: 'UTC',
                }),
                isToday: iso === todayIso,
                isWeekend: dow === 0 || dow === 6,
            });
        }
        return cols;
    }, [startDateIso, todayIso]);

    const monthGroups = useMemo(() => {
        const groups: Array<{ label: string; count: number }> = [];
        dateColumns.forEach((col) => {
            const last = groups[groups.length - 1];
            if (last && last.label === col.monthYearLabel) {
                last.count += 1;
            } else {
                groups.push({ label: col.monthYearLabel, count: 1 });
            }
        });
        return groups;
    }, [dateColumns]);

    const picOptions = useMemo(() => {
        const set = new Set<string>();
        projects.forEach((p) => {
            if (p.pic && p.pic !== '-') set.add(p.pic);
        });
        return Array.from(set).sort();
    }, [projects]);

    const filteredProjects = useMemo(() => {
        return projects.filter((p) => {
            if (picFilter !== 'all' && p.pic !== picFilter) return false;
            if (projectFilter !== 'all' && String(p.id) !== projectFilter) return false;
            if (stageFilter !== 'all') {
                const lower = (p.active_stage ?? '').toLowerCase();
                if (stageFilter === 'review' && p.status !== 'review') return false;
                if (stageFilter !== 'review' && !lower.includes(stageFilter)) return false;
            }
            return true;
        });
    }, [projects, picFilter, projectFilter, stageFilter]);

    // Build date map per project
    const projectCellMaps = useMemo(() => {
        const result: Record<number, Record<string, CellState>> = {};

        filteredProjects.forEach((project) => {
            const map: Record<string, CellState> = {};
            let cursor = project.start_date || '';

            const setCell = (iso: string, next: CellState) => {
                const priority: Record<CellKind, number> = {
                    deadline: 5,
                    deadline_internal: 4,
                    review: 3,
                    owner_ball: 2,
                    working: 1,
                };
                const existing = map[iso];
                if (!existing || priority[next.kind] >= priority[existing.kind]) {
                    map[iso] = next;
                }
            };

            project.stages.forEach((stage) => {
                const designEnd = stage.update_design_date || '';
                const clientEnd = stage.client_response_date || '';

                if (designEnd) {
                    const workStart = cursor && cursor <= designEnd ? cursor : designEnd;
                    eachDate(workStart, designEnd, (iso) => {
                        if (iso === designEnd) {
                            setCell(iso, {
                                kind: 'deadline',
                                stageName: stage.name,
                                note: `Deadline Update Desain: ${stage.name}`,
                            });
                        } else if (stage.status === 'active') {
                            setCell(iso, {
                                kind: project.status === 'review' ? 'review' : 'working',
                                stageName: stage.name,
                                note: `PIC mengerjakan: ${stage.name}`,
                            });
                        }
                    });
                }

                if (clientEnd) {
                    const reviewStart = designEnd ? addDaysIso(designEnd, 1) : clientEnd;
                    eachDate(reviewStart <= clientEnd ? reviewStart : clientEnd, clientEnd, (iso) => {
                        if (iso === clientEnd) {
                            setCell(iso, {
                                kind: 'deadline_internal',
                                stageName: stage.name,
                                note: `Batas Respon Klien: ${stage.name}`,
                            });
                        } else {
                            setCell(iso, {
                                kind: 'owner_ball',
                                stageName: stage.name,
                                note: `Bola di Owner (Review): ${stage.name}`,
                            });
                        }
                    });
                }

                if (clientEnd) cursor = addDaysIso(clientEnd, 1);
                else if (designEnd) cursor = addDaysIso(designEnd, 1);
            });

            if (project.due_date) {
                setCell(project.due_date, {
                    kind: 'deadline',
                    stageName: 'Serah Terima',
                    note: 'Deadline Serah Terima Proyek',
                });
            }

            result[project.id] = map;
        });

        return result;
    }, [filteredProjects]);

    const rangeLabel = `${dateColumns[0]?.dayNum} ${dateColumns[0]?.monthShort} – ${
        dateColumns[dateColumns.length - 1]?.dayNum
    } ${dateColumns[dateColumns.length - 1]?.monthShort}`;

    return (
        <section
            aria-label="Timeline proyek perencanaan"
            className="flex flex-col gap-3 rounded-xl border bg-card p-4"
        >
            {/* Header Bar */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <button
                    type="button"
                    onClick={() => setIsCollapsed((prev) => !prev)}
                    className="flex items-center gap-2 text-left transition-opacity hover:opacity-85"
                >
                    <CalendarDays className="size-4 shrink-0 text-[#46797b]" aria-hidden="true" />
                    <div>
                        <div className="flex items-center gap-1.5">
                            <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">
                                Timeline Proyek Perencanaan
                            </h2>
                            <span className="inline-flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                {isCollapsed ? (
                                    <>
                                        Buka <ChevronDown className="size-3" />
                                    </>
                                ) : (
                                    <>
                                        Tutup <ChevronUp className="size-3" />
                                    </>
                                )}
                            </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                            Rentang {rangeLabel} · {filteredProjects.length} proyek aktif
                            {isCollapsed ? ' · Klik judul untuk menampilkan matriks jadwal' : ''}
                        </p>
                    </div>
                </button>

                {!isCollapsed && (
                    <div className="flex flex-wrap items-center gap-1.5">
                        {projects.length > 1 && (
                            <select
                                value={projectFilter}
                                onChange={(e) => setProjectFilter(e.target.value)}
                                className="h-7 max-w-[190px] truncate rounded-lg border bg-background px-2 text-xs font-medium text-foreground focus:outline-none"
                                aria-label="Pilih Proyek"
                            >
                                <option value="all">Semua Proyek ({projects.length})</option>
                                {projects.map((p) => (
                                    <option key={p.id} value={String(p.id)}>
                                        {p.name}
                                    </option>
                                ))}
                            </select>
                        )}

                        <select
                            value={stageFilter}
                            onChange={(e) => setStageFilter(e.target.value)}
                            className="h-7 rounded-lg border bg-background px-2 text-xs font-medium text-foreground focus:outline-none"
                            aria-label="Filter Tahap"
                        >
                            <option value="all">Semua Tahap</option>
                            <option value="konseptual">Tahap Konseptual</option>
                            <option value="pengembangan">Tahap Pengembangan</option>
                            <option value="ded">Tahap DED</option>
                            <option value="rab">Tahap RAB</option>
                            <option value="review">Sedang Review</option>
                        </select>

                        {picOptions.length > 0 && (
                            <select
                                value={picFilter}
                                onChange={(e) => setPicFilter(e.target.value)}
                                className="h-7 rounded-lg border bg-background px-2 text-xs font-medium text-foreground focus:outline-none"
                                aria-label="Filter PIC"
                            >
                                <option value="all">Semua PIC</option>
                                {picOptions.map((pic) => (
                                    <option key={pic} value={pic}>
                                        PIC: {pic}
                                    </option>
                                ))}
                            </select>
                        )}

                        <div className="inline-flex items-center rounded-lg border bg-background">
                            <button
                                type="button"
                                onClick={() => setStartDateIso((d) => addDaysIso(d, -7))}
                                className="p-1.5 hover:bg-muted rounded-l-lg"
                                title="Mundur 1 minggu"
                            >
                                <ChevronLeft className="size-3.5" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setStartDateIso(addDaysIso(todayIso, -3))}
                                className="border-x px-2.5 py-1 text-[11px] font-semibold hover:bg-muted"
                            >
                                Hari Ini
                            </button>
                            <button
                                type="button"
                                onClick={() => setStartDateIso((d) => addDaysIso(d, 7))}
                                className="p-1.5 hover:bg-muted rounded-r-lg"
                                title="Maju 1 minggu"
                            >
                                <ChevronRight className="size-3.5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {!isCollapsed && (
                <>
                    {/* Matrix Table (bounded vertical & horizontal scroll with sticky headers) */}
                    <div className="max-h-[260px] overflow-auto rounded-lg border border-border">
                        <table className="w-full border-collapse text-[11px]">
                            <thead className="sticky top-0 z-30 bg-card shadow-2xs">
                                {/* Row 1: Sticky Left Headers + Month/Year Groups */}
                                <tr className="border-b bg-muted text-foreground">
                                    <th
                                        rowSpan={2}
                                        className="sticky left-0 z-40 w-8 border-r bg-muted px-2 py-1.5 text-center font-bold align-middle"
                                    >
                                        NO
                                    </th>
                                    <th
                                        rowSpan={2}
                                        className="sticky left-8 z-40 min-w-[165px] border-r bg-muted px-2.5 py-1.5 text-left font-bold align-middle"
                                    >
                                        NAMA PROYEK
                                    </th>
                                    <th
                                        rowSpan={2}
                                        className="border-r bg-muted px-2 py-1.5 text-left font-bold whitespace-nowrap align-middle"
                                    >
                                        PIC
                                    </th>
                                    <th
                                        rowSpan={2}
                                        className="border-r bg-muted px-2 py-1.5 text-center font-bold whitespace-nowrap align-middle"
                                    >
                                        STATUS
                                    </th>
                                    {monthGroups.map((grp, idx) => (
                                        <th
                                            key={`${grp.label}-${idx}`}
                                            colSpan={grp.count}
                                            className="border-r bg-[#e8f0f0] px-2 py-1 text-center text-[10.5px] font-bold uppercase tracking-wider text-[#46797b] last:border-r-0"
                                        >
                                            {grp.label}
                                        </th>
                                    ))}
                                </tr>

                                {/* Row 2: Day Number & Day Name */}
                                <tr className="border-b bg-muted text-foreground">
                                    {dateColumns.map((col) => (
                                        <th
                                            key={col.iso}
                                            className={cn(
                                                'min-w-[28px] border-r px-0.5 py-1 text-center font-bold tabular-nums last:border-r-0',
                                                col.isToday
                                                    ? 'bg-emerald-500 text-white'
                                                    : col.isWeekend
                                                    ? 'bg-zinc-300 text-zinc-700'
                                                    : 'bg-muted text-foreground',
                                            )}
                                            title={col.iso}
                                        >
                                            <div className="leading-none">{col.dayNum}</div>
                                            <div
                                                className={cn(
                                                    'mt-0.5 text-[8.5px] font-semibold leading-none',
                                                    col.isToday ? 'text-emerald-50' : 'text-muted-foreground',
                                                )}
                                            >
                                                {col.dayName}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody className="divide-y">
                                {filteredProjects.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={4 + dateColumns.length}
                                            className="px-4 py-6 text-center text-xs text-muted-foreground"
                                        >
                                            Belum ada proyek yang sesuai filter.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredProjects.map((project, idx) => {
                                const cellMap = projectCellMaps[project.id] || {};
                                return (
                                    <tr key={project.id} className="group hover:bg-muted/20">
                                        <td className="sticky left-0 z-10 border-r bg-card px-2 py-1.5 text-center font-medium text-muted-foreground tabular-nums">
                                            {idx + 1}
                                        </td>
                                        <td className="sticky left-8 z-10 border-r bg-card px-2.5 py-1.5">
                                            <Link
                                                href={route('projects.show', project.id)}
                                                className="block max-w-[165px] truncate font-semibold text-foreground hover:text-[#46797b] hover:underline"
                                                title={`${project.name} (${project.client_name})`}
                                            >
                                                {project.name}
                                            </Link>
                                            <span className="block max-w-[165px] truncate text-[9.5px] text-muted-foreground">
                                                {project.client_name}
                                            </span>
                                        </td>
                                        <td className="border-r px-2 py-1.5 text-muted-foreground whitespace-nowrap font-medium">
                                            {project.pic || '-'}
                                        </td>
                                        <td className="border-r px-1.5 py-1 text-center whitespace-nowrap">
                                            <span
                                                className={cn(
                                                    'inline-block rounded px-1.5 py-0.5 text-[10px] font-bold leading-none',
                                                    stageBadgeClass(project.active_stage, project.status)
                                                )}
                                                title={project.active_stage}
                                            >
                                                {shortenStage(project.active_stage)}
                                            </span>
                                        </td>

                                        {dateColumns.map((col) => {
                                            const cell = cellMap[col.iso];
                                            const isSelectedCell =
                                                selectedCell?.project.id === project.id &&
                                                selectedCell?.iso === col.iso;

                                            return (
                                                <td
                                                    key={col.iso}
                                                    title={cell ? `${project.name} — ${cell.note}` : undefined}
                                                    className={cn(
                                                        'border-r p-0 text-center last:border-r-0',
                                                        col.isWeekend && !cell
                                                            ? 'bg-zinc-200/70'
                                                            : col.isToday && !cell
                                                            ? 'bg-emerald-50/70'
                                                            : '',
                                                        isSelectedCell && 'ring-2 ring-inset ring-foreground'
                                                    )}
                                                >
                                                    {cell ? (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setSelectedCell(
                                                                    isSelectedCell
                                                                        ? null
                                                                        : {
                                                                              project,
                                                                              iso: col.iso,
                                                                              note: cell.note,
                                                                          }
                                                                )
                                                            }
                                                            className={cn(
                                                                'flex h-8 w-full items-center justify-center text-[9px] transition hover:opacity-85',
                                                                cellStyles[cell.kind]
                                                            )}
                                                        >
                                                            {cell.kind === 'deadline'
                                                                ? 'DL'
                                                                : cell.kind === 'deadline_internal'
                                                                ? 'RP'
                                                                : ''}
                                                        </button>
                                                    ) : (
                                                        <div className="h-8 w-full" />
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })
                        )}
                        </tbody>
                    </table>
                </div>

                {selectedCell && (
                    <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <span className="font-bold text-foreground">{selectedCell.project.name}</span>
                            <span className="text-muted-foreground"> ({selectedCell.project.client_name})</span>
                            <span className="mx-1.5 text-muted-foreground">·</span>
                            <span className="font-medium text-[#46797b]">
                                {new Date(selectedCell.iso + 'T00:00:00Z').toLocaleDateString('id-ID', {
                                    weekday: 'short',
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                    timeZone: 'UTC',
                                })}
                            </span>
                            <span className="mx-1.5 text-muted-foreground">·</span>
                            <span className="text-foreground">{selectedCell.note}</span>
                        </div>
                        <Link
                            href={route('projects.show', selectedCell.project.id)}
                            className="shrink-0 font-semibold text-[#46797b] hover:underline"
                        >
                            Buka Detail Proyek →
                        </Link>
                    </div>
                )}

                {/* Compact Color Legend matching Studio Spreadsheet */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10.5px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                        <span className="h-3 w-5 rounded-xs bg-rose-500" /> Deadline (DL)
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <span className="h-3 w-5 rounded-xs bg-amber-400" /> Batas Respon (RP)
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <span className="h-3 w-5 rounded-xs bg-emerald-500" /> Hari Ini
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <span className="h-3 w-5 rounded-xs bg-emerald-200 border border-emerald-300" /> PIC Sedang Mengerjakan
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <span className="h-3 w-5 rounded-xs bg-sky-200 border border-sky-300" /> Bola di Owner
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <span className="h-3 w-5 rounded-xs bg-purple-200 border border-purple-300" /> Review
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <span className="h-3 w-5 rounded-xs bg-zinc-200 border border-zinc-300" /> Akhir Pekan
                    </span>
                </div>
            </>
            )}
        </section>
    );
}
