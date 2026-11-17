import * as React from 'react';

type CollapsibleContextValue = {
    open: boolean;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

const CollapsibleContext = React.createContext<CollapsibleContextValue | null>(null);

function Collapsible({
    defaultOpen = false,
    open: controlledOpen,
    onOpenChange,
    children,
    ...props
}: React.ComponentProps<'div'> & {
    defaultOpen?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}) {
    const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
    const open = controlledOpen ?? uncontrolledOpen;

    const setOpen = React.useCallback(
        (value: React.SetStateAction<boolean>) => {
            const next = typeof value === 'function' ? value(open) : value;
            if (controlledOpen === undefined) {
                setUncontrolledOpen(next);
            }
            onOpenChange?.(next);
        },
        [controlledOpen, onOpenChange, open],
    );

    return (
        <CollapsibleContext.Provider value={{ open, setOpen }}>
            <div data-slot="collapsible" data-open={open ? '' : undefined} {...props}>
                {children}
            </div>
        </CollapsibleContext.Provider>
    );
}

function CollapsibleTrigger({
    onClick,
    ...props
}: React.ComponentProps<'button'>) {
    const ctx = React.useContext(CollapsibleContext);
    return (
        <button
            type="button"
            data-slot="collapsible-trigger"
            data-panel-open={ctx?.open ? '' : undefined}
            aria-expanded={ctx?.open}
            onClick={(e) => {
                ctx?.setOpen((prev) => !prev);
                onClick?.(e);
            }}
            {...props}
        />
    );
}

function CollapsibleContent({
    children,
    ...props
}: React.ComponentProps<'div'>) {
    const ctx = React.useContext(CollapsibleContext);
    if (!ctx?.open) return null;
    return (
        <div data-slot="collapsible-content" {...props}>
            {children}
        </div>
    );
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
