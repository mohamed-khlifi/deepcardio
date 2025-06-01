// File: app/components/SummaryPanel.tsx
'use client';

import React from 'react';
import {ClipboardList, FileHeart, FlaskConical, Repeat, Send, ShieldCheck, Sparkles} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import Typewriter from './Typewriter';
import type { RiskSummary } from '@/lib/llm';

type Item = { id: number; label: string; extra?: string };

// now has optional risk_summary in place of a raw `risks` array
export interface SummaryBuckets {
    risk_summary?: RiskSummary;
    follow_up_actions: Item[];
    recommendations: Item[];
    referrals: Item[];
    life_style_advice: Item[];
    presumptive_diagnoses: Item[];
    tests_to_order: Item[];
}

export function SummaryPanel(data: SummaryBuckets) {
    // ❶ If absolutely nothing at all (no buckets AND no risk), show a centered “no summary” message
    const allBucketsEmpty =
        !data.risk_summary &&
        data.follow_up_actions.length === 0 &&
        data.recommendations.length === 0 &&
        data.referrals.length === 0 &&
        data.life_style_advice.length === 0 &&
        data.presumptive_diagnoses.length === 0 &&
        data.tests_to_order.length === 0;

    if (allBucketsEmpty) {
        return (
            <div className="w-full flex items-center justify-center p-10">
                <p className="text-gray-500 italic">No summary data available yet.</p>
            </div>
        );
    }

    // ❷ Otherwise, render the risk card first (either with actual data or a “no risk data” message),
    //     then render each bucket card below (empty buckets will show “No data yet.”).
    const Card = ({
                      title,
                      icon,
                      children,
                  }: {
        title: string;
        icon: React.ReactNode;
        children: React.ReactNode;
    }) => (
        <div className="rounded-2xl border bg-white shadow-sm flex flex-col">
            <header className="flex items-center gap-2 border-b bg-gray-50/70 px-5 py-3 rounded-t-2xl">
                <span className="text-primary">{icon}</span>
                <h3 className="text-sm font-semibold text-primary">{title}</h3>
            </header>
            <div className="px-5 py-4 space-y-3 text-sm text-gray-700 grow max-h-[250px] overflow-y-auto">
                {children}
            </div>
        </div>
    );

    const Empty = () => <p className="italic text-gray-400">No data yet.</p>;

    const Entry = ({ main, sub }: { main: string; sub?: string }) => (
        <div className="border border-gray-100 rounded-lg px-3 py-2 bg-gray-50 shadow-sm">
            <p className="font-medium">{main}</p>
            {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
        </div>
    );

    return (
        <>
            {/* ── Risk Card ── */}
            <div className="lg:w-1/2 w-full bg-white rounded-2xl shadow-sm border p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                        <h2 className="text-lg font-semibold text-primary">Overall Risk</h2>
                    </div>
                    {data.risk_summary ? (
                        <span className="bg-primary/10 text-primary font-semibold px-2 py-1 rounded-lg text-sm">
              {data.risk_summary.score}
            </span>
                    ) : (
                        <span className="text-gray-500 italic">No risk data</span>
                    )}
                </div>

                {data.risk_summary ? (
                    <>
                        <Progress value={data.risk_summary.score} className="mb-4" />
                        <p className="text-center font-medium text-lg mb-2">
                            {data.risk_summary.value}
                        </p>
                        <p className="text-sm text-gray-600">
                            <Typewriter text={data.risk_summary.reason} speed={50} />
                        </p>
                    </>
                ) : (
                    <p className="text-center text-gray-500 italic">
                        No risk data available.
                    </p>
                )}
            </div>

            {/* ── Other Buckets ── */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <Card title="Follow-up Actions" icon={<Repeat className="size-4" />}>
                    {data.follow_up_actions.length ? (
                        data.follow_up_actions.map((f) => (
                            <Entry key={f.id} main={f.label} sub={`Interval: ${f.extra ?? '—'}`} />
                        ))
                    ) : (
                        <Empty />
                    )}
                </Card>

                <Card title="Recommendations" icon={<ClipboardList className="size-4" />}>
                    {data.recommendations.length ? (
                        data.recommendations.map((r) => <Entry key={r.id} main={r.label} />)
                    ) : (
                        <Empty />
                    )}
                </Card>

                <Card title="Referrals" icon={<Send className="size-4" />}>
                    {data.referrals.length ? (
                        data.referrals.map((r) => (
                            <Entry
                                key={r.id}
                                main={r.label}
                                sub={`Reason: ${r.extra ?? '—'}`}
                            />
                        ))
                    ) : (
                        <Empty />
                    )}
                </Card>

                <Card title="Lifestyle Advice" icon={<Sparkles className="size-4" />}>
                    {data.life_style_advice.length ? (
                        data.life_style_advice.map((l) => <Entry key={l.id} main={l.label} />)
                    ) : (
                        <Empty />
                    )}
                </Card>

                <Card title="Presumptive Diagnoses" icon={<FileHeart className="size-4" />}>
                    {data.presumptive_diagnoses.length ? (
                        data.presumptive_diagnoses.map((d) => (
                            <Entry
                                key={d.id}
                                main={d.label}
                                sub={`Confidence: ${d.extra ?? '—'}`}
                            />
                        ))
                    ) : (
                        <Empty />
                    )}
                </Card>

                <Card title="Tests to Order" icon={<FlaskConical className="size-4" />}>
                    {data.tests_to_order.length ? (
                        data.tests_to_order.map((t) => <Entry key={t.id} main={t.label} />)
                    ) : (
                        <Empty />
                    )}
                </Card>
            </div>
        </>
    );
}
