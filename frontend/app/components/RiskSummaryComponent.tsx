// app/components/RiskSummary.tsx
'use client';

import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import Typewriter from './Typewriter';
import { RiskSummary } from '@/lib/llm';

interface Props {
    summary: RiskSummary;
}

export function RiskSummaryComponent({ summary }: Props) {
    return (
        <div className="lg:w-1/2 w-full bg-white rounded-2xl shadow-sm border p-6 mb-6">
            {/* header */}
            <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-primary">Overall Risk</h2>
            </div>

            {/* colored progress bar */}
            <Progress value={summary.score} className="mb-4" />

            {/* risk label */}
            <p className="text-center font-medium text-lg mb-2">{summary.value}</p>

            {/* typewriter reason */}
            <p className="text-sm text-gray-600">
                <Typewriter text={summary.reason} speed={50} />
            </p>
        </div>
    );
}
