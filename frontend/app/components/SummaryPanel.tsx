// frontend/app/components/SummaryPanel.tsx

'use client';

import React, { useState } from 'react';
import {
    ClipboardList,
    FileHeart,
    FlaskConical,
    Repeat,
    Send,
    ShieldCheck,
    Sparkles,
    Pencil,
    Trash2,
    Save,
    X,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import Typewriter from './Typewriter';
import { RiskSummary } from '@/lib/llm';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001/api/v1';

type Item = { id: number; label: string; extra?: string };

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
    // ──────────────── Local state for editing ────────────────
    const [editId, setEditId] = useState<number | null>(null);
    const [editLabel, setEditLabel] = useState('');
    const [editExtra, setEditExtra] = useState('');

    /** Begin editing that one item **/
    const startEdit = (it: Item) => {
        setEditId(it.id);
        setEditLabel(it.label);
        setEditExtra(it.extra ?? '');
    };

    /** Cancel editing **/
    const cancelEdit = () => {
        setEditId(null);
        setEditLabel('');
        setEditExtra('');
    };

    /** Update one follow-up action via PUT **/
    const updateAction = async () => {
        if (editId == null) return;
        try {
            const body = {
                action: editLabel,
                follow_up_interval: editExtra,
            };
            const res = await fetch(`${API}/follow-up-actions/${editId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!res.ok) throw new Error(await res.text());
            toast.success('Updated successfully');
            // Mutate local array in place:
            const idx = data.follow_up_actions.findIndex((f) => f.id === editId);
            if (idx >= 0) {
                data.follow_up_actions[idx] = {
                    id: editId,
                    label: editLabel,
                    extra: editExtra,
                };
            }
            cancelEdit();
        } catch (err) {
            console.error(err);
            toast.error('Failed to update');
        }
    };

    /** Delete one follow-up action via DELETE **/
    const deleteAction = async (id: number) => {
        try {
            const res = await fetch(`${API}/follow-up-actions/${id}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error(await res.text());
            toast.success('Deleted successfully');
            // Remove from local array:
            const idx = data.follow_up_actions.findIndex((f) => f.id === id);
            if (idx >= 0) {
                data.follow_up_actions.splice(idx, 1);
            }
            // If that row was in edit mode, clear edit
            if (editId === id) cancelEdit();
        } catch (err) {
            console.error(err);
            toast.error('Failed to delete');
        }
    };

    // ──────────────── Tiny helper sub-components ────────────────

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

    /**
     * Renders either the read-only view or the inline-edit view if item is in edit mode.
     * If `editable` is true, shows icons to edit/delete.
     */
    const Entry = ({
                       it,
                       editable,
                   }: {
        it: Item;
        editable?: boolean;
    }) => (
        <div className="border border-gray-100 rounded-lg px-3 py-2 bg-gray-50 shadow-sm flex items-start gap-2">
            {editId === it.id ? (
                <div className="w-full space-y-1">
                    <input
                        className="input-style"
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                    />
                    <input
                        className="input-style"
                        placeholder="Interval"
                        value={editExtra}
                        onChange={(e) => setEditExtra(e.target.value)}
                    />
                </div>
            ) : (
                <div className="flex-1">
                    <p className="font-medium">{it.label}</p>
                    {it.extra && <p className="text-xs text-gray-500">{it.extra}</p>}
                </div>
            )}

            {editable && (
                <div className="flex flex-col gap-1">
                    {editId === it.id ? (
                        <>
                            <Save
                                className="size-4 text-primary cursor-pointer"
                                onClick={updateAction}
                            />
                            <X
                                className="size-4 text-gray-400 cursor-pointer"
                                onClick={cancelEdit}
                            />
                        </>
                    ) : (
                        <>
                            <Pencil
                                className="size-4 text-gray-400 hover:text-primary cursor-pointer"
                                onClick={() => startEdit(it)}
                            />
                            <Trash2
                                className="size-4 text-gray-400 hover:text-red-600 cursor-pointer"
                                onClick={() => deleteAction(it.id)}
                            />
                        </>
                    )}
                </div>
            )}
        </div>
    );

    // If literally everything is empty, show “no data”:
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

    // ──────────────── Render all cards ────────────────
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
                            <Entry key={f.id} it={f} editable />
                        ))
                    ) : (
                        <Empty />
                    )}
                </Card>

                <Card title="Recommendations" icon={<ClipboardList className="size-4" />}>
                    {data.recommendations.length ? (
                        data.recommendations.map((r) => <Entry key={r.id} it={r} />)
                    ) : (
                        <Empty />
                    )}
                </Card>

                <Card title="Referrals" icon={<Send className="size-4" />}>
                    {data.referrals.length ? (
                        data.referrals.map((r) => <Entry key={r.id} it={r} />)
                    ) : (
                        <Empty />
                    )}
                </Card>

                <Card title="Lifestyle Advice" icon={<Sparkles className="size-4" />}>
                    {data.life_style_advice.length ? (
                        data.life_style_advice.map((l) => <Entry key={l.id} it={l} />)
                    ) : (
                        <Empty />
                    )}
                </Card>

                <Card
                    title="Presumptive Diagnoses"
                    icon={<FileHeart className="size-4" />}
                >
                    {data.presumptive_diagnoses.length ? (
                        data.presumptive_diagnoses.map((d) => <Entry key={d.id} it={d} />)
                    ) : (
                        <Empty />
                    )}
                </Card>

                <Card title="Tests to Order" icon={<FlaskConical className="size-4" />}>
                    {data.tests_to_order.length ? (
                        data.tests_to_order.map((t) => <Entry key={t.id} it={t} />)
                    ) : (
                        <Empty />
                    )}
                </Card>
            </div>
        </>
    );
}
