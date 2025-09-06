'use client';

import React, { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import {
    Loader2,
    Activity,
    Heart,
    Thermometer,
    Wind,
    Droplets,
    Gauge,
    TrendingUp,
    AlertTriangle,
    CheckCircle,
    Shield,
    Monitor,
    BarChart3,
    Stethoscope,
    HeartPulse
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

interface VitalSignDict {
    vital_sign_id: number;
    name: string;
    category?: string | null;
    unit?: string | null;
}

interface PatientVitalSign {
    id: number;
    patient_id: number;
    vital_sign_id: number;
    measurement_date: string | null;
    value: string | null;
    recorded_at: string;
    resolved_at: string | null;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001/api/v1';

const getCategoryIcon = (category: string) => {
    const categoryLower = category.toLowerCase();
    if (categoryLower.includes('cardiovascular') || categoryLower.includes('cardiac') || categoryLower.includes('heart') || categoryLower.includes('blood pressure')) {
        return <Heart className="w-5 h-5 text-white" />;
    }
    if (categoryLower.includes('respiratory') || categoryLower.includes('lung') || categoryLower.includes('breath') || categoryLower.includes('oxygen')) {
        return <Wind className="w-5 h-5 text-white" />;
    }
    if (categoryLower.includes('temperature') || categoryLower.includes('fever') || categoryLower.includes('thermal')) {
        return <Thermometer className="w-5 h-5 text-white" />;
    }
    if (categoryLower.includes('fluid') || categoryLower.includes('hydration') || categoryLower.includes('blood')) {
        return <Droplets className="w-5 h-5 text-white" />;
    }
    if (categoryLower.includes('metabolic') || categoryLower.includes('glucose') || categoryLower.includes('sugar')) {
        return <BarChart3 className="w-5 h-5 text-white" />;
    }
    return <Activity className="w-5 h-5 text-white" />;
};

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
        Map<number, { id: number; measurement_date: string | null; value: string | null }>
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

                // 2) This patient's records
                const patRes = await fetch(
                    `${API}/vital-signs/by-patient/${patientId}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                if (!dictRes.ok) throw new Error(await dictRes.text());
                const patData: PatientVitalSign[] = await patRes.json();

                // Build a map of the latest unresolved entry per vital_sign_id
                const recMap = new Map<
                    number,
                    { id: number; measurement_date: string | null; value: string | null }
                >();
                patData.forEach((r) => {
                    if (r.resolved_at) return; // Skip resolved records
                    const prev = recMap.get(r.vital_sign_id);
                    if (
                        !prev ||
                        new Date(r.recorded_at) > new Date(prev.measurement_date || r.recorded_at)
                    ) {
                        recMap.set(r.vital_sign_id, {
                            id: r.id,
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
    const handleBlur = async (vital_sign_id: number) => {
        try {
            const token = await getAccessTokenSilently();
            const val = values.get(vital_sign_id) ?? '';
            const rec = records.get(vital_sign_id);

            if (rec) {
                if (val === '') {
                    // DELETE if cleared
                    const res = await fetch(`${API}/vital-signs/delete/${rec.id}`, {
                        method: 'DELETE',
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    });
                    if (!res.ok) {
                        if (res.status === 404) {
                            console.warn('Vital sign record not found during delete - may have been removed already');
                            // Continue with local state update since the record is gone
                        } else {
                            throw new Error(`Failed to delete vital sign: ${res.status}`);
                        }
                    }
                    // Remove record and clear value
                    records.delete(vital_sign_id);
                    setRecords(new Map(records));
                    values.set(vital_sign_id, '');
                    setValues(new Map(values));
                } else {
                    // UPDATE existing
                    const res = await fetch(`${API}/vital-signs/${rec.id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                            vital_sign_record_id: rec.id,
                            new_value: val,
                            new_measurement_date: rec.measurement_date,
                        }),
                    });
                    if (!res.ok) {
                        if (res.status === 404) {
                            throw new Error('Vital sign record not found');
                        } else if (res.status === 403) {
                            throw new Error('Access denied');
                        } else {
                            throw new Error(`Failed to update vital sign: ${res.status}`);
                        }
                    }
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
                        vital_sign_id: vital_sign_id,
                        measurement_date: today,
                        value: val,
                    }),
                });
                if (!res.ok) {
                    if (res.status === 404) {
                        throw new Error('Patient or vital sign not found');
                    } else if (res.status === 403) {
                        throw new Error('Access denied');
                    } else if (res.status === 409) {
                        throw new Error('Vital sign already exists for this patient');
                    } else {
                        throw new Error(`Failed to create vital sign: ${res.status}`);
                    }
                }
                const newRecord: PatientVitalSign = await res.json();
                records.set(vital_sign_id, {
                    id: newRecord.id,
                    measurement_date: newRecord.measurement_date,
                    value: newRecord.value,
                });
                setRecords(new Map(records));
            }
        } catch (err) {
            console.error('Failed to save or delete vital sign', err);
            // You could add a toast notification here if you have a notification system
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

    const recordedCount = Array.from(records.values()).filter(r => r.value && r.value.trim() !== '').length;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
            {/* Professional Medical Header */}
            <div className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 overflow-hidden">
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
                                    <HeartPulse className="w-12 h-12 text-white" />
                                </div>

                            <div className="text-white">
                                <h1 className="text-4xl font-bold tracking-tight mb-2">
                                    Vital Signs Monitoring
                                </h1>
                                <p className="text-blue-100 text-lg mb-1">
                                    Real-time patient vitals tracking and analysis
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
                                    <TrendingUp className="w-6 h-6 text-yellow-300" />
                                    <div className="text-white">
                                        <div className="text-sm text-blue-100">Recorded</div>
                                        <div className="text-2xl font-bold">{recordedCount}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                                <div className="flex items-center gap-3">
                                    <CheckCircle className="w-6 h-6 text-green-300" />
                                    <div className="text-white">
                                        <div className="text-sm text-blue-100">Categories</div>
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
                {/* Recorded Vitals Summary */}
                {recordedCount > 0 && (
                    <Card className="mb-8 shadow-lg border-0 bg-white">
                        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 rounded-t-lg">
                            <CardTitle className="flex items-center gap-3 text-xl font-semibold text-gray-800">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <TrendingUp className="w-5 h-5 text-blue-600" />
                                </div>
                                Current Vital Signs
                                <Badge className="bg-blue-100 text-blue-700 border-blue-200 ml-auto">
                                    {recordedCount} recorded
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {Array.from(records.entries()).map(([vitalSignId, record]) => {
                                    if (!record.value || record.value.trim() === '') return null;
                                    const vital = dict.find(v => v.vital_sign_id === vitalSignId);
                                    if (!vital) return null;
                                    return (
                                        <div key={vitalSignId} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                            <div className="text-sm font-medium text-blue-900">{vital.name}</div>
                                            <div className="text-lg font-bold text-blue-700 mt-1">
                                                {record.value} {vital.unit && <span className="text-sm text-blue-600">{vital.unit}</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Professional Vital Signs Input */}
                <Card className="shadow-lg border-0 bg-white">
                    <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-3 text-xl font-semibold text-gray-800">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <Monitor className="w-5 h-5 text-blue-600" />
                                </div>
                                Vital Signs Categories
                            </CardTitle>
                            <div className="flex items-center gap-3">
                                <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1">
                                    {dict.length} parameters available
                                </Badge>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Shield className="w-4 h-4 text-blue-500" />
                                    <span>Clinical Monitoring</span>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <div className="relative mb-6">
                                    <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                                    <HeartPulse className="absolute inset-0 m-auto w-6 h-6 text-blue-600" />
                                </div>
                                <p className="text-gray-600 text-lg">Loading vital signs...</p>
                                <p className="text-gray-500 text-sm mt-2">Accessing monitoring parameters</p>
                            </div>
                        ) : (
                            <TooltipProvider>
                                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {byCategory.map(([category, vitals]) => {
                                        const categoryRecordedCount = vitals.filter(vital =>
                                            records.get(vital.vital_sign_id)?.value &&
                                            records.get(vital.vital_sign_id)?.value?.trim() !== ''
                                        ).length;

                                        return (
                                            <Card
                                                key={category}
                                                className="shadow-md border border-gray-200 bg-white"
                                            >
                                                <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-t-lg py-4">
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

                                                <ScrollArea className="h-[320px]">
                                                    <ScrollAreaViewport>
                                                        <CardContent className="p-0">
                                                            {vitals.map((vital) => {
                                                                const currentValue = values.get(vital.vital_sign_id) ?? '';
                                                                const hasValue = currentValue.trim() !== '';

                                                                return (
                                                                    <div
                                                                        key={vital.vital_sign_id}
                                                                        className={`
                                                                            flex items-center justify-between py-4 px-5 
                                                                            transition-colors duration-200
                                                                            border-b border-gray-100 last:border-b-0
                                                                            ${hasValue ? 'bg-blue-50' : 'hover:bg-gray-50'}
                                                                        `}
                                                                    >
                                                                        <div className="flex items-center gap-3 flex-1">
                                                                            <div className={`
                                                                                w-2 h-2 rounded-full 
                                                                                ${hasValue ? 'bg-blue-500' : 'bg-gray-300'}
                                                                            `}></div>

                                                                            <div className="flex-1">
                                                                                <Label
                                                                                    htmlFor={`vital-${vital.vital_sign_id}`}
                                                                                    className="cursor-pointer select-none"
                                                                                >
                                                                                    <div className="font-medium text-gray-900 text-sm">
                                                                                        {vital.name}
                                                                                    </div>
                                                                                    {vital.unit && (
                                                                                        <div className="text-xs text-gray-600 mt-1">
                                                                                            Unit: {vital.unit}
                                                                                        </div>
                                                                                    )}
                                                                                </Label>
                                                                            </div>
                                                                        </div>

                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <div className="flex items-center gap-2">
                                                                                    {hasValue && (
                                                                                        <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200 text-xs px-2 py-0.5">
                                                                                            Recorded
                                                                                        </Badge>
                                                                                    )}
                                                                                    <Input
                                                                                        id={`vital-${vital.vital_sign_id}`}
                                                                                        value={currentValue}
                                                                                        onChange={(e) => {
                                                                                            values.set(vital.vital_sign_id, e.target.value);
                                                                                            setValues(new Map(values));
                                                                                        }}
                                                                                        onBlur={() => handleBlur(vital.vital_sign_id)}
                                                                                        className="w-[90px] shrink-0 text-center border-2 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                                                                        placeholder="Value"
                                                                                    />
                                                                                </div>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent side="left" className="bg-gray-900 text-white border-gray-700">
                                                                                <p className="text-xs">
                                                                                    Enter measurement value{vital.unit ? ` (${vital.unit})` : ''}
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
                        <Heart className="w-4 h-4 text-blue-500" />
                        <span>Comprehensive Vital Signs Monitoring</span>
                        <span>•</span>
                        <span>Real-Time Clinical Data</span>
                        <Shield className="w-4 h-4 text-blue-500" />
                    </div>
                </div>
            </div>
        </div>
    );
}