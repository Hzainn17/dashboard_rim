'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ArrowUpRight, CalendarClock, MapPin } from 'lucide-react'
import { currentUser, projects, type Project, type ProjectCategory, type Role } from '@/lib/studio-data'
import { cn } from '@/lib/utils'
import { AvatarStack } from './member-avatar'

const filters: ('Semua' | ProjectCategory)[] = ['Semua', 'Residensial', 'Komersial', 'Interior']

const categoryStyle: Record<ProjectCategory, string> = {
  Residensial: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  Komersial: 'bg-stone-100 text-stone-800 ring-stone-300',
  Interior: 'bg-accent text-accent-foreground ring-primary/25',
}

export function ProjectGallery({ role }: { role: Role }) {
  const [filter, setFilter] = useState<(typeof filters)[number]>('Semua')
  const userId = currentUser[role].id
  const scoped = role === 'admin' ? projects : projects.filter((p) => p.team.includes(userId))
  const visible = filter === 'Semua' ? scoped : scoped.filter((p) => p.category === filter)

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
            .sort((a, b) => a.daysLeft - b.daysLeft)
            .map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
        </div>
      )}
    </section>
  )
}

function ProjectCard({ project }: { project: Project }) {
  const urgent = project.daysLeft <= 7
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-[0_8px_30px_-12px_rgb(0_0_0/0.18)]">
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        <Image
          src={project.cover || '/placeholder.svg'}
          alt={`Render 3D ${project.title}`}
          fill
          sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset', categoryStyle[project.category])}>
            {project.category}
          </span>
          <span className="rounded-full bg-background/90 px-2 py-0.5 text-[11px] font-medium backdrop-blur">
            {project.phase}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold">
              <a href="#" className="outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-ring/50">
                {project.title}
              </a>
            </h3>
            <p className="truncate text-xs text-muted-foreground">{project.client}</p>
          </div>
          <ArrowUpRight
            className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground"
            aria-hidden="true"
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progres</span>
            <span className="font-mono font-medium tabular-nums">{project.progress}%</span>
          </div>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label={`Progres ${project.title}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={project.progress}
          >
            <div className="h-full rounded-full bg-primary" style={{ width: `${project.progress}%` }} />
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 border-t pt-3">
          <AvatarStack ids={project.team} max={3} />
          <div className="flex flex-col items-end gap-0.5">
            <span
              className={cn(
                'inline-flex items-center gap-1 text-xs font-medium',
                urgent ? 'text-primary' : 'text-foreground',
              )}
            >
              <CalendarClock className="size-3.5" aria-hidden="true" />
              {project.daysLeft} hari lagi
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <MapPin className="size-3" aria-hidden="true" />
              {project.location}
            </span>
          </div>
        </div>
      </div>
    </article>
  )
}
