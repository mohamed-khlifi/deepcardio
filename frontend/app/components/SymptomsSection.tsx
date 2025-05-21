// File: app/components/SymptomsSection.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Loader2 } from 'lucide-react';
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
    ScrollArea,
    ScrollAreaViewport,
    ScrollAreaScrollbar,
    ScrollAreaThumb,
} from '@/components/ui/scroll-area';

interface SymptomDict {
    symptom_id: number;
    name: string;
    category?: string | null;
    description?: string | null;
}

interface PatientSymptom {
    patient_id: number;
    symptom_id: number;
    onset_date: string;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001/api/v1';

export function SymptomsSection({
                                    patientId,
                                    patientName,
                                }: {
    patientId: number;
    patientName: string;
}) {
    const { getAccessTokenSilently } = useAuth0();
    const [allSymptoms, setAllSymptoms] = useState<SymptomDict[]>([]);
    const [patientSymptoms, setPatientSymptoms] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const token = await getAccessTokenSilently();

                // Load dictionary
                const dictRes = await fetch(`${API}/symptoms/dict`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!dictRes.ok) throw new Error(await dictRes.text());
                const dictData: SymptomDict[] = await dictRes.json();

                // Load this patient’s recorded symptoms
                const patRes = await fetch(
                    `${API}/symptoms/by-patient/${patientId}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                if (!patRes.ok) throw new Error(await patRes.text());
                const patData: PatientSymptom[] = await patRes.json();

                setAllSymptoms(dictData);
                setPatientSymptoms(new Set(patData.map((e) => e.symptom_id)));
            } catch (err) {
                console.error('Failed to load symptoms', err);
            } finally {
                setLoading(false);
            }
        })();
    }, [patientId, getAccessTokenSilently]);

    const handleToggle = async (symId: number, on: boolean) => {
        try {
            const token = await getAccessTokenSilently();
            if (on) {
                const today = new Date().toISOString().split('T')[0];
                const res = await fetch(`${API}/symptoms`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        patient_id: patientId,
                        symptom_id: symId,
                        onset_date: today,
                    }),
                });
                if (!res.ok) throw new Error(await res.text());
                setPatientSymptoms((prev) => new Set(prev).add(symId));
            } else {
                const res = await fetch(
                    `${API}/symptoms?patient_id=${patientId}&symptom_id=${symId}`,
                    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
                );
                if (!res.ok) throw new Error(await res.text());
                setPatientSymptoms((prev) => {
                    const copy = new Set(prev);
                    copy.delete(symId);
                    return copy;
                });
            }
        } catch (err) {
            console.error('Failed to update symptom', err);
        }
    };

    // Group by category
    const byCategory = Array.from(
        allSymptoms.reduce<Map<string, SymptomDict[]>>((map, sym) => {
            const cat = sym.category || 'Other';
            if (!map.has(cat)) map.set(cat, []);
            map.get(cat)!.push(sym);
            return map;
        }, new Map())
    );

    return (
        <section className="flex justify-center">
            <div className="w-full max-w-4xl space-y-6">
                <h2 className="text-2xl font-semibold mb-2 text-center">
                    Symptoms for <span className="text-primary">{patientName}</span>
                </h2>

                {loading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="animate-spin text-primary size-8" />
                    </div>
                ) : (
                    <TooltipProvider>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {byCategory.map(([category, syms]) => (
                                <Card key={category} className="shadow-sm">
                                    <CardHeader className="py-2 px-4">
                                        <CardTitle className="text-lg">{category}</CardTitle>
                                    </CardHeader>

                                    {/* Fixed-height scroll area with visible scrollbar */}
                                    <ScrollArea className="h-[250px]">
                                        <ScrollAreaViewport>
                                            <CardContent className="p-0 divide-y divide-gray-100">
                                                {syms.map((sym) => (
                                                    <div
                                                        key={sym.symptom_id}
                                                        className="flex items-center justify-between py-3 px-4 hover:bg-gray-50 transition-colors"
                                                    >
                                                        <Label
                                                            htmlFor={`symptom-${sym.symptom_id}`}
                                                            className="flex-1 cursor-pointer select-none text-sm"
                                                        >
                                                            {sym.name}
                                                            {sym.description && (
                                                                <span className="block text-xs text-gray-500">
                                  {sym.description}
                                </span>
                                                            )}
                                                        </Label>

                                                        <Checkbox
                                                            id={`symptom-${sym.symptom_id}`}
                                                            checked={patientSymptoms.has(sym.symptom_id)}
                                                            onCheckedChange={(val) =>
                                                                handleToggle(sym.symptom_id, !!val)
                                                            }
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
                            ))}
                        </div>
                    </TooltipProvider>
                )}
            </div>
        </section>
    );
}
