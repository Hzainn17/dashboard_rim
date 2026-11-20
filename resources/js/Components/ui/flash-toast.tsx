import { useEffect, useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageProps } from '@/types';

type ToastVariant = 'success' | 'error';

type ToastItem = {
    id: number;
    variant: ToastVariant;
    message: string;
};

const AUTO_DISMISS_MS = 4500;

export function FlashToast() {
    const { flash } = usePage<PageProps>().props;
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const nextIdRef = useRef(1);
    const initialHandledRef = useRef(false);

    const pushToast = (variant: ToastVariant, message: string) => {
        const id = nextIdRef.current++;
        setToasts((prev) => [...prev.slice(-2), { id, variant, message }]);
        window.setTimeout(() => {
            setToasts((prev) => prev.filter((item) => item.id !== id));
        }, AUTO_DISMISS_MS);
    };

    const dismissToast = (id: number) => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
    };

    // Handle initial page load flash (e.g. after full redirect)
    useEffect(() => {
        if (initialHandledRef.current) {
            return;
        }
        initialHandledRef.current = true;
        if (flash?.success) {
            pushToast('success', flash.success);
        }
        if (flash?.error) {
            pushToast('error', flash.error);
        }
    }, [flash?.success, flash?.error]);

    // Trigger on every Inertia visit completion — even when the same message repeats
    useEffect(() => {
        const removeListener = router.on('success', (event) => {
            const nextFlash = (event.detail.page.props as Partial<PageProps>)?.flash;
            if (nextFlash?.success) {
                pushToast('success', nextFlash.success);
            }
            if (nextFlash?.error) {
                pushToast('error', nextFlash.error);
            }
        });

        return () => {
            removeListener();
        };
    }, []);

    if (toasts.length === 0) {
        return null;
    }

    return (
        <div
            aria-live="polite"
            className="pointer-events-none fixed right-4 bottom-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2.5 sm:right-6 sm:bottom-6"
        >
            {toasts.map((toast) => {
                const isSuccess = toast.variant === 'success';
                return (
                    <div
                        key={toast.id}
                        role={isSuccess ? 'status' : 'alert'}
                        className={cn(
                            'pointer-events-auto flex items-start gap-3 rounded-xl border bg-card/95 p-3.5 shadow-[0_12px_36px_-8px_rgb(0_0_0/0.22)] backdrop-blur-md transition-all',
                            isSuccess ? 'border-emerald-300/80' : 'border-rose-300/80',
                        )}
                    >
                        <span
                            className={cn(
                                'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg',
                                isSuccess
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-rose-100 text-rose-700',
                            )}
                        >
                            {isSuccess ? (
                                <CheckCircle2 className="size-4" aria-hidden="true" />
                            ) : (
                                <AlertCircle className="size-4" aria-hidden="true" />
                            )}
                        </span>
                        <div className="min-w-0 flex-1">
                            <p
                                className={cn(
                                    'text-xs font-semibold',
                                    isSuccess ? 'text-emerald-900' : 'text-rose-900',
                                )}
                            >
                                {isSuccess ? 'Perubahan Tersimpan' : 'Perhatian'}
                            </p>
                            <p className="mt-0.5 text-xs leading-relaxed text-foreground/85">
                                {toast.message}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => dismissToast(toast.id)}
                            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            aria-label="Tutup notifikasi"
                        >
                            <X className="size-3.5" aria-hidden="true" />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
