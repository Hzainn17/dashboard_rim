import * as React from 'react';
import { CheckIcon, ChevronDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type SelectItemOption = { value: string; label: string };

type SelectContextValue = {
    open: boolean;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
    value: string | null | undefined;
    onValueChange?: (value: string | null) => void;
    disabled?: boolean;
    items?: SelectItemOption[];
};

const SelectContext = React.createContext<SelectContextValue | null>(null);

function Select({
    items,
    value,
    onValueChange,
    disabled,
    children,
}: {
    items?: SelectItemOption[];
    value?: string | null;
    onValueChange?: (value: string | null) => void;
    disabled?: boolean;
    children: React.ReactNode;
}) {
    const [open, setOpen] = React.useState(false);
    const ref = React.useRef<HTMLDivElement | null>(null);

    React.useEffect(() => {
        if (!open) return;
        const onMouseDown = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
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
        <SelectContext.Provider value={{ open, setOpen, value, onValueChange, disabled, items }}>
            <div ref={ref} className="relative w-full">
                {children}
            </div>
        </SelectContext.Provider>
    );
}

function SelectTrigger({
    className,
    children,
    ...props
}: React.ComponentProps<'button'>) {
    const ctx = React.useContext(SelectContext);
    return (
        <button
            type="button"
            role="combobox"
            aria-expanded={ctx?.open}
            disabled={ctx?.disabled}
            onClick={() => !ctx?.disabled && ctx?.setOpen((prev) => !prev)}
            data-slot="select-trigger"
            className={cn(
                'flex h-8 w-fit items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
                className,
            )}
            {...props}
        >
            {children}
            <ChevronDownIcon className="pointer-events-none size-4 text-muted-foreground" />
        </button>
    );
}

function SelectValue({
    placeholder,
    className,
}: {
    placeholder?: string;
    className?: string;
}) {
    const ctx = React.useContext(SelectContext);
    const found = ctx?.items?.find((i) => i.value === ctx?.value);
    const label = found?.label ?? ctx?.value;
    return (
        <span
            data-slot="select-value"
            className={cn('flex flex-1 truncate text-left', !label && 'text-muted-foreground', className)}
        >
            {label || placeholder}
        </span>
    );
}

function SelectContent({
    className,
    children,
    ...props
}: React.ComponentProps<'div'>) {
    const ctx = React.useContext(SelectContext);
    if (!ctx?.open) return null;
    return (
        <div
            role="listbox"
            data-slot="select-content"
            className={cn(
                'absolute top-full left-0 z-50 mt-1 w-full min-w-36 overflow-x-hidden overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10',
                className,
            )}
            {...props}
        >
            {children}
        </div>
    );
}

function SelectItem({
    value,
    className,
    children,
    ...props
}: React.ComponentProps<'div'> & { value: string }) {
    const ctx = React.useContext(SelectContext);
    const selected = ctx?.value === value;
    return (
        <div
            role="option"
            aria-selected={selected}
            data-slot="select-item"
            onClick={() => {
                ctx?.onValueChange?.(value);
                ctx?.setOpen(false);
            }}
            className={cn(
                'relative flex w-full cursor-pointer items-center gap-1.5 rounded-md py-1.5 pr-8 pl-2 text-sm outline-none select-none hover:bg-accent hover:text-accent-foreground',
                selected && 'bg-accent/60 font-medium',
                className,
            )}
            {...props}
        >
            <span className="flex flex-1 shrink-0 gap-2 whitespace-nowrap">{children}</span>
            {selected && (
                <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
                    <CheckIcon className="size-4" />
                </span>
            )}
        </div>
    );
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue };
