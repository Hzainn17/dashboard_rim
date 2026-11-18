import * as React from 'react';
import { cn } from '@/lib/utils';

interface CurrencyInputProps
    extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
    value: number | string;
    onChange: (value: number) => void;
    showPrefix?: boolean;
}

function formatDots(num: number): string {
    if (!num && num !== 0) return '';
    return new Intl.NumberFormat('id-ID', {
        maximumFractionDigits: 0,
    }).format(Math.max(0, Math.round(num)));
}

export function CurrencyInput({
    value,
    onChange,
    showPrefix = true,
    className,
    ...props
}: CurrencyInputProps) {
    const numericValue = typeof value === 'string' ? Number(value.replace(/\D/g, '')) || 0 : Number(value) || 0;
    const displayValue = formatDots(numericValue);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const digitsOnly = e.target.value.replace(/\D/g, '');
        const parsed = digitsOnly === '' ? 0 : parseInt(digitsOnly, 10);
        onChange(Number.isNaN(parsed) ? 0 : parsed);
    };

    return (
        <div className="relative flex items-center">
            {showPrefix && (
                <span className="pointer-events-none absolute left-3 font-mono text-xs font-medium text-muted-foreground">
                    Rp
                </span>
            )}
            <input
                {...props}
                type="text"
                inputMode="numeric"
                value={displayValue}
                onChange={handleChange}
                className={cn(
                    'h-9 w-full rounded-lg border bg-background pr-3 font-mono text-xs tabular-nums outline-none focus:border-foreground focus:ring-1 focus:ring-foreground',
                    showPrefix ? 'pl-8' : 'pl-3',
                    className,
                )}
            />
        </div>
    );
}
