// File: app/components/TestsSection.tsx
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
import {
    ScrollArea,
    ScrollAreaViewport,
    ScrollAreaScrollbar,
    ScrollAreaThumb,
} from '@/components/ui/scroll-area';

interface TestDict {
    id: string;
    name: string;
    category?: string | null;
    units?: string | null;
}

interface PatientTest {
    patient_id: number;
    test_id: string;
    test_date: string;
    result_value: string;
    notes: string;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001/api/v1';

export function TestsSection({
                                 patientId,
                                 patientName,
                             }: {
    patientId: number;
    patientName: string;
}) {
    const { getAccessTokenSilently } = useAuth0();
    const [allTests, setAllTests] = useState<TestDict[]>([]);
    const [patientTests, setPatientTests] = useState<Record<string, PatientTest>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const token = await getAccessTokenSilently();

                // 1) Fetch test dictionary
                const dictRes = await fetch(`${API}/tests/dict`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!dictRes.ok) throw new Error(await dictRes.text());
                const dictData: TestDict[] = await dictRes.json();

                // 2) Fetch this patient's recorded tests
                const patRes = await fetch(`${API}/tests/by-patient/${patientId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const patData: PatientTest[] = patRes.ok ? await patRes.json() : [];

                // Reduce to latest per test_id
                const latestMap: Record<string, PatientTest> = {};
                patData.forEach((rec) => {
                    const prev = latestMap[rec.test_id];
                    if (!prev || new Date(rec.test_date) > new Date(prev.test_date)) {
                        latestMap[rec.test_id] = rec;
                    }
                });

                setAllTests(dictData);
                setPatientTests(latestMap);
            } catch (err) {
                console.error('Failed to load tests', err);
            } finally {
                setLoading(false);
            }
        })();
    }, [patientId, getAccessTokenSilently]);

    const handleBlur = async (testId: string, newValue: string) => {
        try {
            const token = await getAccessTokenSilently();
            const existing = patientTests[testId];

            if (existing) {
                if (newValue === '') {
                    // If cleared, delete the record entirely
                    const res = await fetch(`${API}/tests`, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                            patient_id: patientId,
                            test_id: testId,
                        }),
                    });
                    if (!res.ok) throw new Error(await res.text());
                    // Remove from local state
                    setPatientTests((prev) => {
                        const copy = { ...prev };
                        delete copy[testId];
                        return copy;
                    });
                } else {
                    // Update existing test result
                    const res = await fetch(`${API}/tests`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                            patient_id: patientId,
                            test_id: testId,
                            new_result_value: newValue,
                        }),
                    });
                    if (!res.ok) throw new Error(await res.text());
                    setPatientTests((prev) => ({
                        ...prev,
                        [testId]: { ...prev[testId], result_value: newValue },
                    }));
                }
            } else if (newValue !== '') {
                // Create a new test record for today
                const today = new Date().toISOString().split('T')[0];
                const res = await fetch(`${API}/tests`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        patient_id: patientId,
                        test_id: testId,
                        test_date: today,
                        result_value: newValue,
                        notes: '',
                    }),
                });
                if (!res.ok) throw new Error(await res.text());
                const data = await res.json();
                setPatientTests((prev) => ({
                    ...prev,
                    [testId]: data.record,
                }));
            }
        } catch (err) {
            console.error('Failed to save or delete test result', err);
        }
    };

    // Group by category
    const byCategory = Array.from(
        allTests.reduce<Map<string, TestDict[]>>((map, t) => {
            const cat = t.category || 'Other';
            if (!map.has(cat)) map.set(cat, []);
            map.get(cat)!.push(t);
            return map;
        }, new Map())
    );

    return (
        <section className="flex justify-center">
            <div className="w-full max-w-4xl space-y-6">
                <h2 className="text-2xl font-semibold mb-2 text-center">
                    Test Results for <span className="text-primary">{patientName}</span>
                </h2>

                {loading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="animate-spin text-primary size-8" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {byCategory.map(([category, tests]) => (
                            <Card key={category} className="shadow-sm">
                                <CardHeader className="py-2 px-4">
                                    <CardTitle className="text-lg">{category}</CardTitle>
                                </CardHeader>

                                <ScrollArea className="h-[350px]">
                                    <ScrollAreaViewport>
                                        <CardContent className="p-0 divide-y divide-gray-100">
                                            {tests.map((test) => {
                                                const entry = patientTests[test.id];
                                                return (
                                                    <div
                                                        key={test.id}
                                                        className="flex flex-col space-y-1 py-3 px-4"
                                                    >
                                                        <Label
                                                            htmlFor={`test-${test.id}`}
                                                            className="text-sm font-medium"
                                                        >
                                                            {test.name}
                                                        </Label>
                                                        <span className="text-xs text-gray-500">
                              {test.units || ''}
                            </span>
                                                        <Input
                                                            id={`test-${test.id}`}
                                                            defaultValue={entry?.result_value || ''}
                                                            onBlur={(e) =>
                                                                handleBlur(test.id, e.currentTarget.value)
                                                            }
                                                            className="max-w-xs"
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </CardContent>
                                    </ScrollAreaViewport>
                                    <ScrollAreaScrollbar orientation="vertical">
                                        <ScrollAreaThumb />
                                    </ScrollAreaScrollbar>
                                </ScrollArea>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
