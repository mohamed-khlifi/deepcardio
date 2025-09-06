'use client';

import React, { useEffect, useState, memo, useMemo, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useSymptomDict, usePatientSymptoms, useApiRequest, invalidatePatientCache } from '@/lib/api-cache';
import {
    Loader2,
    Heart,
    Stethoscope,
    Activity,
    Brain,
    Wind,
    Eye,
    Thermometer,
    AlertTriangle,
    CheckCircle,
    Plus,
    Minus,
    Shield
} from 'lucide-react';
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
    id: number;
    patient_id: number;
    symptom_id: number;
    onset_date: string;
    resolved_at: string | null;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001/api/v1';

const getCategoryIcon = (category: string) => {
    const categoryLower = category.toLowerCase();
    if (categoryLower.includes('cardiovascular') || categoryLower.includes('cardiac') || categoryLower.includes('heart')) {
        return <Heart className="w-5 h-5 text-blue-600" />;
    }
    if (categoryLower.includes('respiratory') || categoryLower.includes('lung') || categoryLower.includes('breath')) {
        return <Wind className="w-5 h-5 text-blue-600" />;
    }
    if (categoryLower.includes('neurological') || categoryLower.includes('brain') || categoryLower.includes('neuro')) {
        return <Brain className="w-5 h-5 text-blue-600" />;
    }
    if (categoryLower.includes('ocular') || categoryLower.includes('eye') || categoryLower.includes('vision')) {
        return <Eye className="w-5 h-5 text-blue-600" />;
    }
    if (categoryLower.includes('fever') || categoryLower.includes('temperature')) {
        return <Thermometer className="w-5 h-5 text-blue-600" />;
    }
    return <Activity className="w-5 h-5 text-blue-600" />;
};

export const SymptomsSection = memo(function SymptomsSection({
                                    patientId,
                                    patientName,
                                }: {
    patientId: number;
    patientName: string;
}) {
    const { getAccessTokenSilently } = useAuth0();
    const { putData } = useApiRequest();
    
    // Use SWR for caching
    const { data: allSymptoms, error: symptomsError, isLoading: symptomsLoading } = useSymptomDict();
    const { data: patientSymptomsData, error: patientSymptomsError, isLoading: patientSymptomsLoading, mutate: mutatePatientSymptoms } = usePatientSymptoms(patientId);

    const loading = symptomsLoading || patientSymptomsLoading;
    const error = symptomsError || patientSymptomsError;

    // Memoized patient symptoms list
    const patientSymptoms = useMemo(() => patientSymptomsData || [], [patientSymptomsData]);

    // Handle symptoms toggle with optimistic updates for instant feedback
    const handleSymptomToggle = useCallback(async (symId: number, isActive: boolean) => {
        try {
            // Optimistic update - immediately update the UI
            const optimisticSymptoms = isActive 
                ? patientSymptoms.filter((s: any) => s.symptom_id !== symId)
                : [...patientSymptoms, {
                    id: Date.now(), // Temporary ID
                    patient_id: parseInt(patientId.toString()),
                    symptom_id: symId,
                    onset_date: new Date().toISOString().split('T')[0],
                    recorded_at: new Date().toISOString(),
                    resolved_at: null
                }];
            
            // Update the UI immediately
            mutatePatientSymptoms(optimisticSymptoms, false);

            if (isActive) {
                // Remove symptom
                const symptomToRemove = patientSymptoms.find((s: any) => s.symptom_id === symId);
                if (symptomToRemove) {
                    const token = await getAccessTokenSilently();
                    const res = await fetch(`${API}/symptoms/delete/${symptomToRemove.id}`, {
                        method: 'DELETE',
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    if (!res.ok) {
                        if (res.status === 404) {
                            throw new Error('Symptom record not found');
                        }
                        throw new Error('Failed to remove symptom');
                    }
                    // Refresh data to get the real state
                    mutatePatientSymptoms();
                    invalidatePatientCache(patientId);
                }
            } else {
                // Add symptom
                const token = await getAccessTokenSilently();
                const res = await fetch(`${API}/symptoms`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ 
                        patient_id: parseInt(patientId.toString()),
                        symptom_id: symId
                    }),
                });
                if (!res.ok) {
                    if (res.status === 409) {
                        throw new Error('Symptom already active for this patient');
                    } else if (res.status === 404) {
                        throw new Error('Patient or symptom not found');
                    } else if (res.status === 403) {
                        throw new Error('Access denied');
                    } else {
                        throw new Error(`Failed to add symptom (${res.status})`);
                    }
                }
                // Refresh data to get the real state
                mutatePatientSymptoms();
                invalidatePatientCache(patientId);
            }
        } catch (err) {
            console.error('Failed to toggle symptom:', err);
            // Revert optimistic update on error
            mutatePatientSymptoms();
            
            // Show user-friendly error message
            const errorMessage = err instanceof Error ? err.message : 'Failed to toggle symptom';
            // You could add a toast notification here if you have a notification system
            console.error('Error details:', errorMessage);
        }
    }, [patientSymptoms, getAccessTokenSilently, patientId, mutatePatientSymptoms, invalidatePatientCache]);

    // Alias for the new optimized function
    const handleToggle = useCallback((symId: number, on: boolean) => {
        const isCurrentlyActive = patientSymptoms.some((s: any) => s.symptom_id === symId);
        return handleSymptomToggle(symId, isCurrentlyActive);
    }, [handleSymptomToggle, patientSymptoms]);

    // Group by category with proper fallback
    const byCategory = useMemo(() => {
        if (!allSymptoms || !Array.isArray(allSymptoms)) {
            return [];
        }
        return Array.from(
            allSymptoms.reduce<Map<string, SymptomDict[]>>((map, sym: any) => {
                const cat = sym.category || 'Other';
                if (!map.has(cat)) map.set(cat, []);
                map.get(cat)!.push(sym);
                return map;
            }, new Map())
        );
    }, [allSymptoms]);

    const activeCount = useMemo(() => patientSymptoms.length, [patientSymptoms]);

    // Show loading state while data is being fetched
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                        <Stethoscope className="absolute inset-0 m-auto w-6 h-6 text-blue-600" />
                    </div>
                    <p className="text-gray-600 text-lg">Loading symptoms...</p>
                    <p className="text-gray-500 text-sm">Accessing clinical records</p>
                </div>
            </div>
        );
    }

    // Show error state if there's an error
    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                    <p className="text-red-600">Failed to load symptoms data</p>
                </div>
            </div>
        );
    }

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
                                <Stethoscope className="w-12 h-12 text-white" />
                            </div>

                            <div className="text-white">
                                <h1 className="text-4xl font-bold tracking-tight mb-2">
                                    Symptom Assessment
                                </h1>
                                <p className="text-blue-100 text-lg mb-1">
                                    Clinical symptom tracking and management
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
                                    <AlertTriangle className="w-6 h-6 text-yellow-300" />
                                    <div className="text-white">
                                        <div className="text-sm text-blue-100">Active Symptoms</div>
                                        <div className="text-2xl font-bold">{activeCount}</div>
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

            {/* Error Display */}
            {error && (
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <Card className="bg-red-50 border-red-200">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3 text-red-700">
                                <AlertTriangle className="w-5 h-5" />
                                <p>{error}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-6 -mt-8 relative z-10">
                {/* Active Symptoms Summary */}
                {activeCount > 0 && (
                    <Card className="mb-8 shadow-lg border-0 bg-white">
                        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 rounded-t-lg">
                            <CardTitle className="flex items-center gap-3 text-xl font-semibold text-gray-800">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <AlertTriangle className="w-5 h-5 text-blue-600" />
                                </div>
                                Current Active Symptoms
                                <Badge className="bg-blue-100 text-blue-700 border-blue-200 ml-auto">
                                    {activeCount} active
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="flex flex-wrap gap-2">
                                {patientSymptoms.map((patSym: any) => {
                                    const symptom = allSymptoms?.find((s: any) => s.symptom_id === patSym.symptom_id);
                                    if (!symptom) return null;
                                    return (
                                        <Badge
                                            key={patSym.id}
                                            variant="secondary"
                                            className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1 text-sm"
                                        >
                                            {symptom.name}
                                        </Badge>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Professional Symptoms Selection */}
                <Card className="shadow-lg border-0 bg-white">
                    <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-3 text-xl font-semibold text-gray-800">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <Stethoscope className="w-5 h-5 text-blue-600" />
                                </div>
                                Symptom Categories
                            </CardTitle>
                            <div className="flex items-center gap-3">
                                <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1">
                                    {allSymptoms?.length || 0} symptoms available
                                </Badge>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Shield className="w-4 h-4 text-green-500" />
                                    <span>Clinical Database</span>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <div className="relative mb-6">
                                    <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                                    <Stethoscope className="absolute inset-0 m-auto w-6 h-6 text-blue-600" />
                                </div>
                                <p className="text-gray-600 text-lg">Loading symptom database...</p>
                                <p className="text-gray-500 text-sm mt-2">Accessing clinical records</p>
                            </div>
                        ) : (
                            <TooltipProvider>
                                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {byCategory.map(([category, syms]) => {
                                        const categoryActiveCount = syms.filter(sym =>
                                            patientSymptoms.some((ps: any) => ps.symptom_id === sym.symptom_id)
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
                                                        {categoryActiveCount > 0 && (
                                                            <Badge className="bg-white/20 text-white border-white/30 text-xs">
                                                                {categoryActiveCount}
                                                            </Badge>
                                                        )}
                                                    </CardTitle>
                                                </CardHeader>

                                                <ScrollArea className="h-[320px]">
                                                    <ScrollAreaViewport>
                                                        <CardContent className="p-0">
                                                            {syms.map((sym) => {
                                                                const isActive = patientSymptoms.some((s: any) => s.symptom_id === sym.symptom_id);
                                                                return (
                                                                    <div
                                                                        key={sym.symptom_id}
                                                                        className={`
                                                                            flex items-center justify-between py-4 px-5 
                                                                            transition-colors duration-200
                                                                            border-b border-gray-100 last:border-b-0
                                                                            ${isActive ? 'bg-blue-50' : 'hover:bg-gray-50'}
                                                                        `}
                                                                    >
                                                                        <div className="flex items-center gap-3 flex-1">
                                                                            <div className={`
                                                                                w-2 h-2 rounded-full 
                                                                                ${isActive ? 'bg-blue-500' : 'bg-gray-300'}
                                                                            `}></div>

                                                                            <Label
                                                                                htmlFor={`symptom-${sym.symptom_id}`}
                                                                                className="flex-1 cursor-pointer select-none"
                                                                            >
                                                                                <div className="font-medium text-gray-900 text-sm">
                                                                                    {sym.name}
                                                                                </div>
                                                                                {sym.description && (
                                                                                    <div className="text-xs text-gray-600 mt-1">
                                                                                        {sym.description}
                                                                                    </div>
                                                                                )}
                                                                            </Label>
                                                                        </div>

                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <div className="flex items-center gap-2">
                                                                                    {isActive && (
                                                                                        <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200 text-xs px-2 py-0.5">
                                                                                            Active
                                                                                        </Badge>
                                                                                    )}
                                                                                    <Checkbox
                                                                                        id={`symptom-${sym.symptom_id}`}
                                                                                        checked={isActive}
                                                                                        onCheckedChange={(val) =>
                                                                                            handleToggle(sym.symptom_id, !!val)
                                                                                        }
                                                                                        className="w-5 h-5 border-2 border-gray-400 data-[state=checked]:border-blue-500 data-[state=checked]:bg-blue-500"
                                                                                    />
                                                                                </div>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent side="left" className="bg-gray-900 text-white border-gray-700">
                                                                                <p className="text-xs">
                                                                                    {isActive ? 'Remove symptom' : 'Add symptom'}
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
                        <span>Comprehensive Clinical Assessment</span>
                        <span>•</span>
                        <span>Evidence-Based Symptom Tracking</span>
                        <Shield className="w-4 h-4 text-green-500" />
                    </div>
                </div>
            </div>
        </div>
    );
});