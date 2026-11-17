import * as React from 'react';
import { cn } from '@/lib/utils';

type DropdownContextValue = {
    open: boolean;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
    containerRef: React.RefObject<HTMLDivElement | null>;
};

const DropdownContext = React.createContext<DropdownContextValue | null>(null);

function DropdownMenu({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement | null>(null);

    React.useEffect(() => {
        if (!open) return;
        const onMouseDown = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onMouseDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onMouseDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    return (
        <DropdownContext.Provider value={{ open, setOpen, containerRef }}>
            <div ref={containerRef} data-slot="dropdown-menu" className="relative inline-flex">
                {children}
            </div>
        </DropdownContext.Provider>
    );
}

function DropdownMenuTrigger({
    onClick,
    ...props
}: React.ComponentProps<'button'>) {
    const ctx = React.useContext(DropdownContext);
    return (
        <button
            type="button"
            data-slot="dropdown-menu-trigger"
            aria-expanded={ctx?.open}
            onClick={(e) => {
                ctx?.setOpen((prev) => !prev);
                onClick?.(e);
            }}
            {...props}
        />
    );
}

function DropdownMenuContent({
    align = 'start',
    className,
    children,
    ...props
}: React.ComponentProps<'div'> & {
    align?: 'start' | 'end' | 'center';
}) {
    const ctx = React.useContext(DropdownContext);
    if (!ctx?.open) return null;
    return (
        <div
            data-slot="dropdown-menu-content"
            role="menu"
            className={cn(
                'absolute top-full z-50 mt-1.5 min-w-32 overflow-x-hidden overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none',
                align === 'end' ? 'right-0' : align === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-0',
                className,
            )}
            {...props}
        >
            {children}
        </div>
    );
}

function DropdownMenuGroup({ ...props }: React.ComponentProps<'div'>) {
    return <div data-slot="dropdown-menu-group" role="group" {...props} />;
}

function DropdownMenuLabel({
    className,
    inset,
    ...props
}: React.ComponentProps<'div'> & { inset?: boolean }) {
    return (
        <div
            data-slot="dropdown-menu-label"
            className={cn(
                'px-1.5 py-1 text-xs font-medium text-muted-foreground',
                inset && 'pl-7',
                className,
            )}
            {...props}
        />
    );
}

function DropdownMenuItem({
    className,
    inset,
    variant = 'default',
    onClick,
    ...props
}: React.ComponentProps<'div'> & {
    inset?: boolean;
    variant?: 'default' | 'destructive';
}) {
    const ctx = React.useContext(DropdownContext);
    return (
        <div
            role="menuitem"
            tabIndex={0}
            data-slot="dropdown-menu-item"
            data-variant={variant}
            onClick={(e) => {
                onClick?.(e);
                ctx?.setOpen(false);
            }}
            className={cn(
                "group/dropdown-menu-item relative flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-none select-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
                inset && 'pl-7',
                variant === 'destructive' && 'text-destructive hover:bg-destructive/10 hover:text-destructive',
                className,
            )}
            {...props}
        />
    );
}

function DropdownMenuSeparator({
    className,
    ...props
}: React.ComponentProps<'div'>) {
    return (
        <div
            role="separator"
            data-slot="dropdown-menu-separator"
            className={cn('-mx-1 my-1 h-px bg-border', className)}
            {...props}
        />
    );
}

export {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuLabel,
    DropdownMenuItem,
    DropdownMenuSeparator,
};
