import { getAvatarTone } from '@/lib/studio-data';
import { cn } from '@/lib/utils';

export type AvatarMemberItem = {
    id: number | string;
    name: string;
    photo_url?: string | null;
    role_in_project?: string;
};

function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
}

export function MemberAvatar({
    id,
    name,
    photoUrl,
    title,
    className,
}: {
    id: number | string;
    name?: string;
    photoUrl?: string | null;
    title?: string;
    className?: string;
}) {
    const displayName = name;
    if (!displayName) return null;

    const initials = getInitials(displayName);
    const tone = getAvatarTone(id, displayName);

    return (
        <span
            title={title || displayName}
            className={cn(
                'inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ring-2 ring-card overflow-hidden',
                tone,
                className,
            )}
        >
            {photoUrl ? (
                <img src={photoUrl} alt={displayName} className="h-full w-full object-cover" />
            ) : (
                <span aria-hidden="true">{initials}</span>
            )}
            <span className="sr-only">{displayName}</span>
        </span>
    );
}

export function AvatarStack({
    ids,
    members,
    max = 4,
    className,
}: {
    ids?: string[];
    members?: AvatarMemberItem[];
    max?: number;
    className?: string;
}) {
    if (members && members.length > 0) {
        const shown = members.slice(0, max);
        const rest = members.length - shown.length;
        return (
            <div className={cn('flex -space-x-2', className)}>
                {shown.map((m) => (
                    <MemberAvatar
                        key={m.id}
                        id={m.id}
                        name={m.name}
                        photoUrl={m.photo_url}
                        title={m.role_in_project ? `${m.name} (${m.role_in_project})` : m.name}
                    />
                ))}
                {rest > 0 && (
                    <span className="inline-flex size-7 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground ring-2 ring-card">
                        +{rest}
                    </span>
                )}
            </div>
        );
    }

    const list = ids ?? [];
    const shown = list.slice(0, max);
    const rest = list.length - shown.length;
    return (
        <div className={cn('flex -space-x-2', className)}>
            {shown.map((id) => (
                <MemberAvatar key={id} id={id} />
            ))}
            {rest > 0 && (
                <span className="inline-flex size-7 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground ring-2 ring-card">
                    +{rest}
                </span>
            )}
        </div>
    );
}
