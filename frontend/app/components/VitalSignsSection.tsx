// File: app/components/VitalSignsSection.tsx
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
    ScrollArea,
    ScrollAreaViewport,
    ScrollAreaScrollbar,
    ScrollAreaThumb,
} from '@/components/ui/scroll-area';

interface VitalSignDict {
    vital_sign_id: number;
    name: string;
    category?: string | null;
    unit?: string | null;
}

interface PatientVitalSign {
    patient_id: number;
    vital_sign_id: number;
    measurement_date: string;
    value: string;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001/api/v1';

export function VitalSignsSection({
                                      patientId,
                                      patientName,
                                  }: {
    patientId: number;
    patientName: string;
}) {
    const { getAccessTokenSilently } = useAuth0();
    const [dict, setDict] = useState<VitalSignDict[]>([]);
    const [records, setRecords] = useState<
        Map<number, { measurement_date: string; value: string }>
    >(new Map());
    const [values, setValues] = useState<Map<number, string>>(new Map());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const token = await getAccessTokenSilently();

                // 1) Full dictionary
                const dictRes = await fetch(`${API}/vital-signs/dict`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!dictRes.ok) throw new Error(await dictRes.text());
                const dictData: VitalSignDict[] = await dictRes.json();

                // 2) This patient’s most recent records
                const patRes = await fetch(
                    `${API}/vital-signs/by-patient/${patientId}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                if (!patRes.ok) throw new Error(await patRes.text());
                const patData: PatientVitalSign[] = await patRes.json();

                // Build a map of the latest entry per vital_sign_id
                const recMap = new Map<
                    number,
                    { measurement_date: string; value: string }
                >();
                patData.forEach((r) => {
                    const prev = recMap.get(r.vital_sign_id);
                    if (
                        !prev ||
                        new Date(r.measurement_date) > new Date(prev.measurement_date)
                    ) {
                        recMap.set(r.vital_sign_id, {
                            measurement_date: r.measurement_date,
                            value: r.value,
                        });
                    }
                });

                // Initialize values map
                const valMap = new Map<number, string>();
                dictData.forEach((v) => {
                    valMap.set(v.vital_sign_id, recMap.get(v.vital_sign_id)?.value ?? '');
                });

                setDict(dictData);
                setRecords(recMap);
                setValues(valMap);
            } catch (err) {
                console.error('Failed to load vital signs', err);
            } finally {
                setLoading(false);
            }
        })();
    }, [patientId, getAccessTokenSilently]);

    // On blur: create, update, or delete
    const handleBlur = async (id: number) => {
        try {
            const token = await getAccessTokenSilently();
            const val = values.get(id) ?? '';
            const rec = records.get(id);

            if (rec) {
                if (val === '') {
                    // DELETE if cleared
                    const res = await fetch(`${API}/vital-signs`, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                            patient_id: patientId,
                            vital_sign_id: id,
                        }),
                    });
                    if (!res.ok) throw new Error(await res.text());
                    // Remove record and clear value
                    records.delete(id);
                    setRecords(new Map(records));
                    values.set(id, '');
                    setValues(new Map(values));
                } else {
                    // UPDATE existing
                    const res = await fetch(`${API}/vital-signs`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                            patient_id: patientId,
                            vital_sign_id: id,
                            measurement_date: rec.measurement_date,
                            new_value: val,
                        }),
                    });
                    if (!res.ok) throw new Error(await res.text());
                    rec.value = val;
                    setRecords(new Map(records));
                }
            } else if (val !== '') {
                // CREATE new for today
                const today = new Date().toISOString().split('T')[0];
                const res = await fetch(`${API}/vital-signs`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        patient_id: patientId,
                        vital_sign_id: id,
                        measurement_date: today,
                        value: val,
                    }),
                });
                if (!res.ok) throw new Error(await res.text());
                records.set(id, { measurement_date: today, value: val });
                setRecords(new Map(records));
            }
        } catch (err) {
            console.error('Failed to save or delete vital sign', err);
        }
    };

    // Group by category
    const byCategory = Array.from(
        dict.reduce<Map<string, VitalSignDict[]>>((map, v) => {
            const cat = v.category ?? 'Other';
            if (!map.has(cat)) map.set(cat, []);
            map.get(cat)!.push(v);
            return map;
        }, new Map())
    );

    return (
        <section className="flex justify-center">
            <div className="w-full max-w-4xl space-y-6">
                <h2 className="text-2xl font-semibold mb-2 text-center">
                    Vital Signs for <span className="text-primary">{patientName}</span>
                </h2>

                {loading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="animate-spin text-primary size-8" />
                    </div>
                ) : (
                    <TooltipProvider>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {byCategory.map(([category, vits]) => (
                                <Card key={category} className="shadow-sm">
                                    <CardHeader className="py-2 px-4">
                                        <CardTitle className="text-lg">{category}</CardTitle>
                                    </CardHeader>

                                    {/* fixed-height scroll area */}
                                    <ScrollArea className="h-[300px]">
                                        <ScrollAreaViewport>
                                            <CardContent className="p-0 divide-y divide-gray-100">
                                                {vits.map((v) => (
                                                    <div
                                                        key={v.vital_sign_id}
                                                        className="flex items-center justify-between py-3 px-4 hover:bg-gray-50 transition-colors"
                                                    >
                                                        <div className="flex-1">
                                                            <Label
                                                                htmlFor={`vital-${v.vital_sign_id}`}
                                                                className="cursor-pointer select-none text-sm font-medium"
                                                            >
                                                                {v.name}
                                                            </Label>
                                                            <span className="block text-xs text-gray-500">
                                {v.unit ?? ''}
                              </span>
                                                        </div>

                                                        <Input
                                                            id={`vital-${v.vital_sign_id}`}
                                                            value={values.get(v.vital_sign_id) ?? ''}
                                                            onChange={(e) => {
                                                                values.set(v.vital_sign_id, e.target.value);
                                                                setValues(new Map(values));
                                                            }}
                                                            onBlur={() => handleBlur(v.vital_sign_id)}
                                                            className="w-[80px] shrink-0"
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
