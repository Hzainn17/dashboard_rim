import * as React from 'react';
import { XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type SheetContextValue = {
    open: boolean;
    onOpenChange?: (open: boolean) => void;
};

const SheetContext = React.createContext<SheetContextValue | null>(null);

function Sheet({
    open = false,
    onOpenChange,
    children,
}: {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    children: React.ReactNode;
}) {
    React.useEffect(() => {
        if (!open) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onOpenChange?.(false);
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [open, onOpenChange]);

    return (
        <SheetContext.Provider value={{ open, onOpenChange }}>
            {children}
        </SheetContext.Provider>
    );
}

function SheetContent({
    className,
    children,
    side = 'right',
    showCloseButton = true,
    ...props
}: React.ComponentProps<'div'> & {
    side?: 'top' | 'right' | 'bottom' | 'left';
    showCloseButton?: boolean;
}) {
    const ctx = React.useContext(SheetContext);
    if (!ctx?.open) return null;

    return (
        <div className="fixed inset-0 z-50">
            <div
                data-slot="sheet-overlay"
                onClick={() => ctx.onOpenChange?.(false)}
                className="fixed inset-0 z-50 bg-black/20 backdrop-blur-xs transition-opacity"
            />
            <div
                role="dialog"
                aria-modal="true"
                data-slot="sheet-content"
                data-side={side}
                className={cn(
                    'fixed z-50 flex flex-col gap-4 bg-popover bg-clip-padding text-sm text-popover-foreground shadow-lg transition duration-200 ease-in-out',
                    side === 'left' && 'inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm',
                    side === 'right' && 'inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm',
                    side === 'top' && 'inset-x-0 top-0 h-auto border-b',
                    side === 'bottom' && 'inset-x-0 bottom-0 h-auto border-t',
                    className,
                )}
                {...props}
            >
                {children}
                {showCloseButton && (
                    <button
                        type="button"
                        onClick={() => ctx.onOpenChange?.(false)}
                        className="absolute top-3 right-3 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                        <XIcon className="size-4" />
                        <span className="sr-only">Close</span>
                    </button>
                )}
            </div>
        </div>
    );
}

function SheetTitle({ className, ...props }: React.ComponentProps<'h2'>) {
    return (
        <h2
            data-slot="sheet-title"
            className={cn('text-base font-medium text-foreground', className)}
            {...props}
        />
    );
}

export { Sheet, SheetContent, SheetTitle };
