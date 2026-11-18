import { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { ArrowUpRight, CalendarClock, MapPin } from 'lucide-react';
import { currentUser, projects as fallbackProjects, type ProjectCategory, type Role } from '@/lib/studio-data';
import { cn } from '@/lib/utils';
import { PageProps } from '@/types';
import { AvatarStack, type AvatarMemberItem } from './member-avatar';

const filters: ('Semua' | ProjectCategory)[] = ['Semua', 'Residensial', 'Komersial', 'Interior'];

export const categoryStyle: Record<string, string> = {
    Residensial: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    Komersial: 'bg-stone-100 text-stone-800 ring-stone-300',
    Interior: 'bg-accent text-accent-foreground ring-primary/25',
    'Villa & Resort': 'bg-sky-50 text-sky-800 ring-sky-200',
    'Masterplan & Lanskap': 'bg-amber-50 text-amber-800 ring-amber-200',
};

export interface UnifiedProjectCardData {
    id: number | string;
    name: string;
    client_name: string;
    location?: string | null;
    category: string;
    phase?: string;
    status?: 'planning' | 'ongoing' | 'review' | 'done' | 'on_hold';
    cover_image_url?: string | null;
    progress_percent: number;
    days_left?: number | null;
    members?: AvatarMemberItem[];
    team?: string[];
}

export function ProjectGallery({ role }: { role: Role }) {
    const pageProps = usePage<PageProps & { projects?: UnifiedProjectCardData[] }>().props;
    const dbProjects = pageProps.projects;
    const authUserId = pageProps.auth?.user?.id;

    const [filter, setFilter] = useState<(typeof filters)[number]>('Semua');

    const normalizedProjects: UnifiedProjectCardData[] =
        dbProjects && dbProjects.length > 0
            ? dbProjects
            : fallbackProjects.map((p) => ({
                  id: p.id,
                  name: p.title,
                  client_name: p.client,
                  location: p.location,
                  category: p.category,
                  phase: p.phase,
                  cover_image_url: p.cover,
                  progress_percent: p.progress,
                  days_left: p.daysLeft,
                  team: p.team,
              }));

    const scoped =
        role === 'admin'
            ? normalizedProjects
            : normalizedProjects.filter((p) => {
                  if (p.members && authUserId) {
                      return p.members.some((m) => Number(m.id) === Number(authUserId));
                  }
                  if (p.team) {
                      return p.team.includes(currentUser[role].id);
                  }
                  return true;
              });

    const visible = filter === 'Semua' ? scoped : scoped.filter((p) => p.category === filter);

    return (
        <section aria-labelledby="projects-title" className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h2 id="projects-title" className="text-base font-semibold tracking-tight">
                        {role === 'admin' ? 'Galeri Proyek Studio' : 'Proyek Saya'}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {scoped.length} proyek aktif · diurutkan berdasarkan deadline terdekat
                    </p>
                </div>
                <div role="tablist" aria-label="Filter kategori proyek" className="flex gap-1 overflow-x-auto">
                    {filters.map((f) => (
                        <button
                            key={f}
                            type="button"
                            role="tab"
                            aria-selected={filter === f}
                            onClick={() => setFilter(f)}
                            className={cn(
                                'shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                                filter === f ? 'border-foreground bg-foreground text-background' : 'bg-card text-muted-foreground hover:text-foreground',
                            )}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {visible.length === 0 ? (
                <div className="rounded-xl border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
                    Tidak ada proyek pada kategori ini.
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {[...visible]
                        .sort((a, b) => (a.days_left ?? 999) - (b.days_left ?? 999))
                        .map((p) => (
                            <ProjectCard key={p.id} project={p} />
                        ))}
                </div>
            )}
        </section>
    );
}

export function ProjectCard({ project }: { project: UnifiedProjectCardData }) {
    const daysLeft = typeof project.days_left === 'number' ? project.days_left : null;
    const urgent = daysLeft !== null && daysLeft <= 7 && project.status !== 'done';
    const phaseLabel =
        project.phase ||
        (project.status === 'done'
            ? 'Selesai'
            : project.status === 'review'
            ? 'Asistensi'
            : 'DED');

    const href =
        typeof project.id === 'number' ? route('projects.show', project.id) : '#';

    return (
        <article className="group relative flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-[0_8px_30px_-12px_rgb(0_0_0/0.18)]">
            <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                <img
                    src={project.cover_image_url || '/project-covers/rumah-tropis.png'}
                    alt={`Render 3D ${project.name}`}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                            '/project-covers/rumah-tropis.png';
                    }}
                />
                <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
                    <span
                        className={cn(
                            'rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset',
                            categoryStyle[project.category] ||
                                'bg-stone-100 text-stone-800 ring-stone-300',
                        )}
                    >
                        {project.category}
                    </span>
                    <span className="rounded-full bg-background/90 px-2 py-0.5 text-[11px] font-medium backdrop-blur">
                        {phaseLabel}
                    </span>
                </div>
            </div>

            <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold">
                            {typeof project.id === 'number' ? (
                                <Link
                                    href={href}
                                    className="outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-ring/50"
                                >
                                    {project.name}
                                </Link>
                            ) : (
                                <a
                                    href={href}
                                    className="outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-ring/50"
                                >
                                    {project.name}
                                </a>
                            )}
                        </h3>
                        <p className="truncate text-xs text-muted-foreground">
                            {project.client_name}
                        </p>
                    </div>
                    <ArrowUpRight
                        className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground"
                        aria-hidden="true"
                    />
                </div>

                <div>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Progres</span>
                        <span className="font-mono font-medium tabular-nums">
                            {project.progress_percent}%
                        </span>
                    </div>
                    <div
                        className="h-1.5 overflow-hidden rounded-full bg-muted"
                        role="progressbar"
                        aria-label={`Progres ${project.name}`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={project.progress_percent}
                    >
                        <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${project.progress_percent}%` }}
                        />
                    </div>
                </div>

                <div className="mt-auto flex items-center justify-between gap-2 border-t pt-3">
                    {project.members && project.members.length > 0 ? (
                        <AvatarStack members={project.members} max={3} />
                    ) : project.team && project.team.length > 0 ? (
                        <AvatarStack ids={project.team} max={3} />
                    ) : (
                        <span className="text-[11px] text-muted-foreground">
                            Belum ada tim
                        </span>
                    )}

                    <div className="flex flex-col items-end gap-0.5">
                        <span
                            className={cn(
                                'inline-flex items-center gap-1 text-xs font-medium',
                                urgent ? 'text-primary' : 'text-foreground',
                            )}
                        >
                            <CalendarClock className="size-3.5" aria-hidden="true" />
                            {daysLeft !== null
                                ? daysLeft < 0
                                    ? 'Lewat deadline'
                                    : daysLeft === 0
                                    ? 'Hari ini'
                                    : `${daysLeft} hari lagi`
                                : 'Tanpa deadline'}
                        </span>
                        {project.location && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                <MapPin className="size-3" aria-hidden="true" />
                                {project.location}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </article>
    );
}
