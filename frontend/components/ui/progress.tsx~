'use client';

import * as React from 'react';
import * as RadixProgress from '@radix-ui/react-progress';
import { cn } from '@/lib/utils';

export interface ProgressProps
    extends React.ComponentPropsWithoutRef<typeof RadixProgress.Root> {
    value?: number;
    max?: number;
}

export function Progress({
                             className,
                             value = 0,
                             max = 100,
                             ...props
                         }: ProgressProps) {
    // clamp to [0–100]%
    const pct = Math.min(Math.max((value / max) * 100, 0), 100);
    // map 0→240° blue, 100→0° red
    const hue = 240 - Math.round((pct / 100) * 240);

    return (
        <RadixProgress.Root
            className={cn(
                'relative h-2 w-full overflow-hidden rounded-full bg-gray-200',
                className
            )}
            value={value}
            max={max}
            {...props}
        >
            <RadixProgress.Indicator
                style={{
                    width: `${pct}%`,
                    background: `hsl(${hue},60%,50%)`,
                    transition: 'width 0.3s ease, background 0.3s ease',
                }}
                className="h-full"
            />
        </RadixProgress.Root>
    );
}
