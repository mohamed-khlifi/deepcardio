'use client';

import React, { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import {
    Loader2,
    FlaskConical,
    Microscope,
    TestTube,
    BarChart3,
    TrendingUp,
    AlertTriangle,
    CheckCircle,
    Shield,
    Beaker,
    Activity,
    Heart,
    Brain,
    Search
} from 'lucide-react';
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
    id: number;
    patient_id: number;
    test_id: string;
    test_date: string | null;
    result_value: string | null;
    notes: string | null;
    recorded_at: string;
    resolved_at: string | null;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001/api/v1';

const getCategoryIcon = (category: string) => {
    const categoryLower = category.toLowerCase();
    if (categoryLower.includes('blood') || categoryLower.includes('hematology') || categoryLower.includes('cbc')) {
        return <TestTube className="w-5 h-5 text-purple-600" />;
    }
    if (categoryLower.includes('chemistry') || categoryLower.includes('metabolic') || categoryLower.includes('glucose')) {
        return <FlaskConical className="w-5 h-5 text-purple-600" />;
    }
    if (categoryLower.includes('microbiology') || categoryLower.includes('culture') || categoryLower.includes('infection')) {
        return <Microscope className="w-5 h-5 text-purple-600" />;
    }
    if (categoryLower.includes('cardiac') || categoryLower.includes('heart') || categoryLower.includes('troponin')) {
        return <Heart className="w-5 h-5 text-purple-600" />;
    }
    if (categoryLower.includes('imaging') || categoryLower.includes('radiology') || categoryLower.includes('scan')) {
        return <Search className="w-5 h-5 text-purple-600" />;
    }
    if (categoryLower.includes('pathology') || categoryLower.includes('biopsy') || categoryLower.includes('histology')) {
        return <Brain className="w-5 h-5 text-purple-600" />;
    }
    return <Beaker className="w-5 h-5 text-purple-600" />;
};

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

                // Reduce to latest unresolved per test_id
                const latestMap: Record<string, PatientTest> = {};
                patData.forEach((rec) => {
                    if (rec.resolved_at) return; // Skip resolved records
                    const prev = latestMap[rec.test_id];
                    if (!prev || new Date(rec.recorded_at) > new Date(prev.test_date || rec.recorded_at)) {
                        latestMap[rec.test_id] = rec;
                    }
                });

                setAllTests(dictData);
                setPatientTests(latestMap);
            } catch (err) {
                console.error('Failed to load tests', err);
                // Ensure component renders with empty data
                setAllTests([]);
                setPatientTests({});
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
                    // Delete the record
                    const res = await fetch(`${API}/tests/delete/${existing.id}`, {
                        method: 'DELETE',
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    });
                    if (!res.ok) {
                        if (res.status === 404) {
                            console.warn('Test record not found during delete - may have been removed already');
                            // Continue with local state update since the record is gone
                        } else {
                            throw new Error(`Failed to delete test result: ${res.status}`);
                        }
                    }
                    // Remove from local state
                    setPatientTests((prev) => {
                        const copy = { ...prev };
                        delete copy[testId];
                        return copy;
                    });
                } else {
                    // Update existing test result
                    const res = await fetch(`${API}/tests/${existing.id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                            test_record_id: existing.id,
                            new_result_value: newValue,
                            new_notes: existing.notes,
                            new_test_date: existing.test_date,
                        }),
                    });
                    if (!res.ok) {
                        if (res.status === 404) {
                            throw new Error('Test record not found');
                        } else if (res.status === 403) {
                            throw new Error('Access denied');
                        } else {
                            throw new Error(`Failed to update test result: ${res.status}`);
                        }
                    }
                    const updatedRecord: PatientTest = await res.json();
                    setPatientTests((prev) => ({
                        ...prev,
                        [testId]: updatedRecord,
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
                if (!res.ok) {
                    if (res.status === 404) {
                        throw new Error('Patient or test not found');
                    } else if (res.status === 403) {
                        throw new Error('Access denied');
                    } else if (res.status === 409) {
                        throw new Error('Test already exists for this patient');
                    } else {
                        throw new Error(`Failed to create test result: ${res.status}`);
                    }
                }
                const newRecord: PatientTest = await res.json();
                setPatientTests((prev) => ({
                    ...prev,
                    [testId]: newRecord,
                }));
            }
        } catch (err) {
            console.error('Failed to save or delete test result', err);
            // You could add a toast notification here if you have a notification system
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

    const recordedCount = Object.keys(patientTests).filter(testId =>
        patientTests[testId]?.result_value && patientTests[testId]?.result_value?.trim() !== ''
    ).length;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-indigo-50/40">
            {/* Professional Medical Header */}
            <div className="relative bg-gradient-to-r from-purple-600 via-violet-700 to-indigo-800 overflow-hidden">
                {/* Subtle medical pattern background */}
                <div className="absolute inset-0 opacity-5">
                    <div className="absolute top-20 left-20 w-32 h-32 border border-white rounded-full"></div>
                    <div className="absolute top-40 right-32 w-24 h-24 border border-white rounded-full"></div>
                    <div className="absolute bottom-20 left-1/3 w-28 h-28 border border-white rounded-full"></div>
                </div>

                <div className="relative max-w-6xl mx-auto px-6 py-16">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            {/* Professional medical icon */}
                            <div className="p-4 bg-white/15 backdrop-blur-sm rounded-xl border border-white/20">
                                <FlaskConical className="w-12 h-12 text-white" />
                            </div>

                            <div className="text-white">
                                <h1 className="text-4xl font-bold tracking-tight mb-2">
                                    Laboratory Tests
                                </h1>
                                <p className="text-purple-100 text-lg mb-1">
                                    Comprehensive diagnostic testing and results
                                </p>
                                <div className="text-white">
                                    <span className="text-xl font-semibold">{patientName}</span>
                                </div>
                            </div>
                        </div>

                        {/* Professional stats cards */}
                        <div className="hidden lg:flex gap-4">
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                                <div className="flex items-center gap-3">
                                    <TestTube className="w-6 h-6 text-yellow-300" />
                                    <div className="text-white">
                                        <div className="text-sm text-purple-100">Results Recorded</div>
                                        <div className="text-2xl font-bold">{recordedCount}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                                <div className="flex items-center gap-3">
                                    <CheckCircle className="w-6 h-6 text-green-300" />
                                    <div className="text-white">
                                        <div className="text-sm text-purple-100">Test Categories</div>
                                        <div className="text-xl font-bold">{byCategory.length}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Clean wave transition */}
                <div className="absolute bottom-0 left-0 w-full">
                    <svg viewBox="0 0 1200 120" fill="none" className="w-full h-12">
                        <path d="M0,60 C300,100 600,20 1200,60 L1200,120 L0,120 Z" fill="rgb(248 250 252)" />
                    </svg>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-6 -mt-8 relative z-10">
                {/* Recorded Tests Summary */}
                {recordedCount > 0 && (
                    <Card className="mb-8 shadow-lg border-0 bg-white">
                        <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50 border-b border-purple-100 rounded-t-lg">
                            <CardTitle className="flex items-center gap-3 text-xl font-semibold text-gray-800">
                                <div className="p-2 bg-purple-100 rounded-lg">
                                    <BarChart3 className="w-5 h-5 text-purple-600" />
                                </div>
                                Current Test Results
                                <Badge className="bg-purple-100 text-purple-700 border-purple-200 ml-auto">
                                    {recordedCount} recorded
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {Object.entries(patientTests).map(([testId, test]) => {
                                    if (!test.result_value || test.result_value.trim() === '') return null;
                                    const testInfo = allTests.find(t => t.id === testId);
                                    if (!testInfo) return null;
                                    return (
                                        <div key={testId} className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                            <div className="text-sm font-medium text-purple-900">{testInfo.name}</div>
                                            <div className="text-lg font-bold text-purple-700 mt-1">
                                                {test.result_value} {testInfo.units && <span className="text-sm text-purple-600">{testInfo.units}</span>}
                                            </div>
                                            {test.test_date && (
                                                <div className="text-xs text-purple-600 mt-1">
                                                    Date: {new Date(test.test_date).toLocaleDateString()}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Professional Test Results Input */}
                <Card className="shadow-lg border-0 bg-white">
                    <CardHeader className="bg-gradient-to-r from-gray-50 to-purple-50 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-3 text-xl font-semibold text-gray-800">
                                <div className="p-2 bg-purple-100 rounded-lg">
                                    <FlaskConical className="w-5 h-5 text-purple-600" />
                                </div>
                                Laboratory Test Categories
                            </CardTitle>
                            <div className="flex items-center gap-3">
                                <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-200 px-3 py-1">
                                    {allTests.length} tests available
                                </Badge>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Shield className="w-4 h-4 text-purple-500" />
                                    <span>Lab Database</span>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <div className="relative mb-6">
                                    <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                                    <FlaskConical className="absolute inset-0 m-auto w-6 h-6 text-purple-600" />
                                </div>
                                <p className="text-gray-600 text-lg">Loading laboratory tests...</p>
                                <p className="text-gray-500 text-sm mt-2">Accessing diagnostic database</p>
                            </div>
                        ) : (
                            <TooltipProvider>
                                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {byCategory.map(([category, tests]) => {
                                        const categoryRecordedCount = tests.filter(test =>
                                            patientTests[test.id]?.result_value &&
                                            patientTests[test.id]?.result_value?.trim() !== ''
                                        ).length;

                                        return (
                                            <Card
                                                key={category}
                                                className="shadow-md border border-gray-200 bg-white"
                                            >
                                                <CardHeader className="bg-gradient-to-r from-purple-600 to-violet-700 text-white rounded-t-lg py-4">
                                                    <CardTitle className="flex items-center gap-3 text-lg font-semibold">
                                                        {getCategoryIcon(category)}
                                                        <span className="flex-1">{category}</span>
                                                        {categoryRecordedCount > 0 && (
                                                            <Badge className="bg-white/20 text-white border-white/30 text-xs">
                                                                {categoryRecordedCount}
                                                            </Badge>
                                                        )}
                                                    </CardTitle>
                                                </CardHeader>

                                                <ScrollArea className="h-[380px]">
                                                    <ScrollAreaViewport>
                                                        <CardContent className="p-0">
                                                            {tests.map((test) => {
                                                                const currentTest = patientTests[test.id];
                                                                const hasValue = currentTest?.result_value && currentTest.result_value.trim() !== '';

                                                                return (
                                                                    <div
                                                                        key={test.id}
                                                                        className={`
                                                                            flex flex-col space-y-3 py-4 px-5 
                                                                            transition-colors duration-200
                                                                            border-b border-gray-100 last:border-b-0
                                                                            ${hasValue ? 'bg-purple-50' : 'hover:bg-gray-50'}
                                                                        `}
                                                                    >
                                                                        <div className="flex items-center gap-3">
                                                                            <div className={`
                                                                                w-2 h-2 rounded-full 
                                                                                ${hasValue ? 'bg-purple-500' : 'bg-gray-300'}
                                                                            `}></div>

                                                                            <div className="flex-1">
                                                                                <Label
                                                                                    htmlFor={`test-${test.id}`}
                                                                                    className="cursor-pointer select-none"
                                                                                >
                                                                                    <div className="font-medium text-gray-900 text-sm">
                                                                                        {test.name}
                                                                                    </div>
                                                                                    {test.units && (
                                                                                        <div className="text-xs text-gray-600 mt-1">
                                                                                            Units: {test.units}
                                                                                        </div>
                                                                                    )}
                                                                                </Label>
                                                                            </div>

                                                                            {hasValue && (
                                                                                <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200 text-xs px-2 py-0.5">
                                                                                    Recorded
                                                                                </Badge>
                                                                            )}
                                                                        </div>

                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <Input
                                                                                    id={`test-${test.id}`}
                                                                                    defaultValue={currentTest?.result_value || ''}
                                                                                    onBlur={(e) =>
                                                                                        handleBlur(test.id, e.currentTarget.value)
                                                                                    }
                                                                                    className="w-full border-2 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                                                                                    placeholder="Enter result value"
                                                                                />
                                                                            </TooltipTrigger>
                                                                            <TooltipContent side="top" className="bg-gray-900 text-white border-gray-700">
                                                                                <p className="text-xs">
                                                                                    Enter test result{test.units ? ` (${test.units})` : ''}
                                                                                </p>
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    </div>
                                                                );
                                                            })}
                                                        </CardContent>
                                                    </ScrollAreaViewport>
                                                    <ScrollAreaScrollbar orientation="vertical" className="bg-gray-100">
                                                        <ScrollAreaThumb className="bg-gray-400 hover:bg-gray-500" />
                                                    </ScrollAreaScrollbar>
                                                </ScrollArea>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </TooltipProvider>
                        )}
                    </CardContent>
                </Card>

                {/* Professional Medical Footer */}
                <div className="mt-8 text-center py-6">
                    <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
                        <Heart className="w-4 h-4 text-purple-500" />
                        <span>Comprehensive Laboratory Analysis</span>
                        <span>•</span>
                        <span>Evidence-Based Diagnostic Testing</span>
                        <Shield className="w-4 h-4 text-purple-500" />
                    </div>
                </div>
            </div>
        </div>
    );
}