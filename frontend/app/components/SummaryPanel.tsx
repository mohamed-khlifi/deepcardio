'use client';

import {
    ClipboardList,
    Repeat,
    Send,
    ShieldCheck,
    Sparkles,
    FileHeart,
    FlaskConical,
} from 'lucide-react';
import React from 'react';

type Item = { id: number; label: string; extra?: string };

export interface SummaryBuckets {
    follow_up_actions: Item[];         // label = action, extra = interval
    recommendations: Item[];          // label = recommendation
    referrals: Item[];                // label = specialist, extra = reason
    risks: Item[];                    // label = value, extra = reason
    life_style_advice: Item[];        // label = advice
    presumptive_diagnoses: Item[];    // label = diagnosis_name, extra = confidence_level
    tests_to_order: Item[];           // label = test_to_order
}

export function SummaryPanel(data: SummaryBuckets) {
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
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Card title="Follow-up Actions" icon={<Repeat className="size-4" />}>
                {data.follow_up_actions.length ? (
                    data.follow_up_actions.map((f) => (
                        <Entry key={f.id} main={f.label} sub={`Interval: ${f.extra || '—'}`} />
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
                        <Entry key={r.id} main={r.label} sub={`Reason: ${r.extra || '—'}`} />
                    ))
                ) : (
                    <Empty />
                )}
            </Card>

            <Card title="Risks" icon={<ShieldCheck className="size-4" />}>
                {data.risks.length ? (
                    data.risks.map((r) => (
                        <Entry key={r.id} main={r.label} sub={`Reason: ${r.extra || '—'}`} />
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
                        <Entry key={d.id} main={d.label} sub={`Confidence: ${d.extra || '—'}`} />
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
    );
}
