// app/components/RiskSummaryComponent.tsx
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
            {/* ── Header: icon + title (left) and numeric badge (right) ── */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold text-primary">Overall Risk</h2>
                </div>
                <span className="bg-primary/10 text-primary font-semibold px-2 py-1 rounded-lg text-sm">
          {summary.score}
        </span>
            </div>

            {/* ── Progress bar ── */}
            <Progress value={summary.score} className="mb-4" />

            {/* ── Risk label ── */}
            <p className="text-center font-medium text-lg mb-2">{summary.value}</p>

            {/* ── Typewriter reason ── */}
            <p className="text-sm text-gray-600">
                <Typewriter text={summary.reason} speed={50} />
            </p>
        </div>
    );
}
