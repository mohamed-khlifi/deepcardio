// File: app/components/PersonalHistorySection.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
    ScrollArea,
    ScrollAreaViewport,
    ScrollAreaScrollbar,
    ScrollAreaThumb,
} from '@/components/ui/scroll-area';

interface HistoryItem {
    id: number;
    name: string;
}

interface PatientHistory {
    patient_id: number;
    history_id: number;
    date_recorded: string;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001/api/v1';

export function PersonalHistorySection({
                                           patientId,
                                           patientName,
                                       }: {
    patientId: number;
    patientName: string;
}) {
    const { getAccessTokenSilently } = useAuth0();
    const [items, setItems] = useState<HistoryItem[]>([]);
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const token = await getAccessTokenSilently();

                // 1) Load the full list of history items
                const dictRes = await fetch(`${API}/personal-history/dict`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!dictRes.ok) throw new Error(await dictRes.text());
                const dictData: HistoryItem[] = await dictRes.json();

                // 2) Load this patient's existing history
                const patRes = await fetch(
                    `${API}/personal-history/by-patient/${patientId}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                if (!patRes.ok) throw new Error(await patRes.text());
                const patData: PatientHistory[] = await patRes.json();

                setItems(dictData);
                setSelected(new Set(patData.map((h) => h.history_id)));
            } catch (err) {
                console.error('Failed to load personal history', err);
            } finally {
                setLoading(false);
            }
        })();
    }, [patientId, getAccessTokenSilently]);

    const toggle = async (id: number, on: boolean) => {
        try {
            const token = await getAccessTokenSilently();
            const today = new Date().toISOString().split('T')[0];
            if (on) {
                const res = await fetch(`${API}/personal-history`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        patient_id: patientId,
                        history_id: id,
                        date_recorded: today,
                    }),
                });
                if (!res.ok) throw new Error(await res.text());
                setSelected((prev) => new Set(prev).add(id));
            } else {
                const res = await fetch(`${API}/personal-history`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        patient_id: patientId,
                        history_id: id,
                        date_recorded: today,
                    }),
                });
                if (!res.ok) throw new Error(await res.text());
                setSelected((prev) => {
                    const copy = new Set(prev);
                    copy.delete(id);
                    return copy;
                });
            }
        } catch (err) {
            console.error('Failed to update personal history', err);
        }
    };

    return (
        <section className="flex justify-center">
            <div className="w-full max-w-xl">
                <h2 className="text-2xl font-semibold mb-6 text-center">
                    Personal History for{' '}
                    <span className="text-primary">{patientName}</span>
                </h2>

                {loading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="animate-spin text-primary size-8" />
                    </div>
                ) : (
                    <TooltipProvider>
                        <Card className="shadow-sm">
                            {/* Fixed-height scroll area */}
                            <ScrollArea className="h-[350px]">
                                <ScrollAreaViewport>
                                    <CardContent className="p-0 divide-y divide-gray-100">
                                        {items.map((item) => (
                                            <div
                                                key={item.id}
                                                className="flex items-center justify-between py-3 px-4 hover:bg-gray-50 transition-colors"
                                            >
                                                <Label
                                                    htmlFor={`history-${item.id}`}
                                                    className="flex-1 cursor-pointer select-none text-sm"
                                                >
                                                    {item.name}
                                                </Label>
                                                <Checkbox
                                                    id={`history-${item.id}`}
                                                    checked={selected.has(item.id)}
                                                    onCheckedChange={(v) => toggle(item.id, !!v)}
                                                    className="shrink-0"
                                                />
                                            </div>
                                        ))}
                                    </CardContent>
                                </ScrollAreaViewport>
                                <ScrollAreaScrollbar orientation="vertical">
                                    <ScrollAreaThumb />
                                </ScrollAreaScrollbar>
                            </ScrollArea>
                        </Card>
                    </TooltipProvider>
                )}
            </div>
        </section>
    );
}
