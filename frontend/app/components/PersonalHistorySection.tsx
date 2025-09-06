'use client';

import React, { useCallback, useMemo, memo } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { 
  usePatient, 
  usePersonalHistoryDict, 
  usePatientPersonalHistory, 
  useApiRequest,
  invalidatePatientCache 
} from '@/lib/api-cache';
import {
    Loader2,
    FileText,
    Activity,
    AlertTriangle,
    CheckCircle,
    Shield,
    History,
    User,
    Calendar,
    Heart
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
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
    id: number;
    patient_id: number;
    history_id: number;
    date_recorded: string;
    resolved_at: string | null;
}

interface LifestyleFactor {
    key: 'smoke' | 'alco' | 'active';
    label: string;
    description: string;
    value: number;
}

interface PatientData {
    demographics: {
        first_name: string;
        last_name: string;
        gender: string;
        date_of_birth: string;
        ethnicity: string;
        weight: number;
        height: number;
        smoke: number;
        alco: number;
        active: number;
    };
    contact_info: {
        phone: string;
        email: string;
    };
    social_info: {
        marital_status: string;
        occupation: string;
        insurance_provider: string;
        address: string;
    };
}

const PersonalHistorySection = memo(({
    patientId,
    patientName,
}: {
    patientId: number;
    patientName: string;
}) => {
    const { getAccessTokenSilently } = useAuth0();
    const { postData, putData, deleteData } = useApiRequest();
    
    // Use SWR for caching - parallel data fetching
    const { data: historyDict, error: dictError, isLoading: dictLoading } = usePersonalHistoryDict();
    const { data: patientHistoryData, error: historyError, isLoading: historyLoading, mutate: mutateHistory } = usePatientPersonalHistory(patientId);
    const { data: patientData, error: patientError, isLoading: patientLoading, mutate: mutatePatient } = usePatient(patientId);
    
    const loading = dictLoading || historyLoading || patientLoading;
    const error = dictError || historyError || patientError;

    // Memoized computations
    const patientHistory = useMemo(() => 
        patientHistoryData?.filter((h: PatientHistory) => !h.resolved_at) || [], 
        [patientHistoryData]
    );

    const activeCount = useMemo(() => patientHistory.length, [patientHistory]);

    const lifestyleFactors: LifestyleFactor[] = useMemo(() => 
        patientData ? [
            {
                key: 'smoke',
                label: 'Smoking',
                description: 'Current smoking status',
                value: patientData.demographics.smoke
            },
            {
                key: 'alco',
                label: 'Alcohol',
                description: 'Current alcohol consumption',
                value: patientData.demographics.alco
            },
            {
                key: 'active',
                label: 'Physical Activity',
                description: 'Regular physical activity status',
                value: patientData.demographics.active
            }
        ] : [], 
        [patientData]
    );

    // Optimized toggle function
    const toggle = useCallback(async (historyId: number, on: boolean) => {
        try {
            if (on) {
                const date_recorded = new Date().toISOString().split('T')[0];
                await postData('/personal-history', {
                    patient_id: patientId,
                    history_id: historyId,
                    date_recorded,
                });
            } else {
                const historyRecord = patientHistory.find((h: any) => h.history_id === historyId);
                if (!historyRecord) {
                    console.error(`No active history record found for history_id ${historyId}`);
                    return;
                }
                
                try {
                    await deleteData(`/personal-history/delete/${historyRecord.id}`);
                } catch (deleteErr) {
                    console.error('Delete operation failed:', deleteErr);
                    // If it's a 404, the record might have been deleted already
                    if (deleteErr instanceof Error && deleteErr.message.includes('404')) {
                        console.warn('Record not found during delete - may have been removed already');
                        // Continue with the optimistic update since the record is gone
                    } else {
                        throw deleteErr; // Re-throw other errors
                    }
                }
            }
            
            // Optimistic update
            await mutateHistory();
        } catch (err) {
            console.error('Failed to update personal history', err);
            // You could add a toast notification here if you have a notification system
        }
    }, [patientHistory, patientId, postData, deleteData, mutateHistory]);

    // Optimized lifestyle factor update
    const updateLifestyleFactor = useCallback(async (key: 'smoke' | 'alco' | 'active', value: number) => {
        if (!patientData) return;
        
        try {
            const updateData = {
                first_name: patientData.demographics.first_name,
                last_name: patientData.demographics.last_name,
                gender: patientData.demographics.gender,
                dob: patientData.demographics.date_of_birth,
                ethnicity: patientData.demographics.ethnicity || '',
                phone: patientData.contact_info.phone || '',
                email: patientData.contact_info.email || '',
                marital_status: patientData.social_info.marital_status || '',
                occupation: patientData.social_info.occupation || '',
                insurance_provider: patientData.social_info.insurance_provider || '',
                address: patientData.social_info.address || '',
                weight: patientData.demographics.weight,
                height: patientData.demographics.height,
                smoke: key === 'smoke' ? value : patientData.demographics.smoke,
                alco: key === 'alco' ? value : patientData.demographics.alco,
                active: key === 'active' ? value : patientData.demographics.active,
            };

            await putData(`/patients/${patientId}`, updateData);
            
            // Optimistic update
            await mutatePatient();
        } catch (err) {
            console.error('Failed to update lifestyle factor', err);
        }
    }, [patientData, patientId, putData, mutatePatient]);

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50/30 to-rose-50/40 flex items-center justify-center">
                <Card className="max-w-md mx-auto shadow-lg">
                    <CardContent className="p-6 text-center">
                        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Data</h3>
                        <p className="text-gray-600">Failed to load personal history. Please try again.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <TooltipProvider>
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
                                    <History className="w-12 h-12 text-white" />
                                </div>

                                <div className="text-white">
                                    <h1 className="text-4xl font-bold tracking-tight mb-2">
                                        Personal Medical History
                                    </h1>
                                    <p className="text-blue-100 text-lg mb-1">
                                        Comprehensive patient history documentation
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
                                        <History className="w-6 h-6 text-yellow-300" />
                                        <div className="text-white">
                                            <div className="text-sm text-blue-100">Active Records</div>
                                            <div className="text-2xl font-bold">{loading ? '...' : activeCount}</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle className="w-6 h-6 text-green-300" />
                                        <div className="text-white">
                                            <div className="text-sm text-blue-100">Total Items</div>
                                            <div className="text-xl font-bold">{loading ? '...' : historyDict?.length || 0}</div>
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
                <div className="max-w-4xl mx-auto px-6 -mt-8 relative z-10">
                    {/* Active History Summary */}
                    {!loading && activeCount > 0 && (
                        <Card className="mb-8 shadow-lg border-0 bg-white">
                            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 rounded-t-lg">
                                <CardTitle className="flex items-center gap-3 text-xl font-semibold text-gray-800">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <History className="w-5 h-5 text-blue-600" />
                                    </div>
                                    Current Medical History
                                    <Badge className="bg-blue-100 text-blue-700 border-blue-200 ml-auto">
                                        {activeCount} active
                                    </Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="flex flex-wrap gap-2">
                                    {patientHistory.map((patHistory: any) => {
                                        const historyItem = historyDict?.find((h: HistoryItem) => h.id === patHistory.history_id);
                                        if (!historyItem) return null;
                                        return (
                                            <Badge
                                                key={patHistory.id}
                                                variant="secondary"
                                                className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1 text-sm"
                                            >
                                                {historyItem.name}
                                            </Badge>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Lifestyle Factors Section */}
                    {!loading && patientData && (
                        <Card className="mb-8 shadow-lg border-0 bg-white">
                            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 rounded-t-lg">
                                <CardTitle className="flex items-center gap-3 text-xl font-semibold text-gray-800">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <Activity className="w-5 h-5 text-blue-600" />
                                    </div>
                                    Lifestyle Factors
                                    <Badge className="bg-blue-100 text-blue-700 border-blue-200 ml-auto">
                                        Health Profile
                                    </Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {lifestyleFactors.map((factor) => (
                                        <div
                                            key={factor.key}
                                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                                        >
                                            <div className="flex items-center gap-3 flex-1">
                                                <div className={`w-3 h-3 rounded-full ${
                                                    factor.value === 1 ? 'bg-green-500' : 'bg-red-500'
                                                }`}></div>
                                                <div>
                                                    <div className="font-medium text-gray-900 text-sm">
                                                        {factor.label}
                                                    </div>
                                                    <div className="text-xs text-gray-600">
                                                        {factor.description}
                                                    </div>
                                                </div>
                                            </div>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div className="flex items-center gap-2">
                                                        <Badge 
                                                            variant="secondary" 
                                                            className={`text-xs px-2 py-0.5 ${
                                                                factor.value === 1 
                                                                    ? 'bg-green-100 text-green-700 border-green-200' 
                                                                    : 'bg-red-100 text-red-700 border-red-200'
                                                            }`}
                                                        >
                                                            {factor.key === 'active' 
                                                                ? (factor.value === 1 ? 'Active' : 'Inactive')
                                                                : (factor.value === 1 ? 'Yes' : 'No')
                                                            }
                                                        </Badge>
                                                        <Checkbox
                                                            checked={factor.value === 1}
                                                            onCheckedChange={(checked) => 
                                                                updateLifestyleFactor(factor.key, checked ? 1 : 0)
                                                            }
                                                            className="w-5 h-5 border-2 border-gray-400 data-[state=checked]:border-blue-500 data-[state=checked]:bg-blue-500"
                                                        />
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent side="left" className="bg-gray-900 text-white border-gray-700">
                                                    <p className="text-xs">
                                                        {factor.value === 1 ? `Disable ${factor.label.toLowerCase()}` : `Enable ${factor.label.toLowerCase()}`}
                                                    </p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Professional History Selection */}
                    <Card className="shadow-lg border-0 bg-white">
                        <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-100">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-3 text-xl font-semibold text-gray-800">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <FileText className="w-5 h-5 text-blue-600" />
                                    </div>
                                    Personal Medical History
                                </CardTitle>
                                <div className="flex items-center gap-3">
                                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1">
                                        {loading ? '...' : historyDict?.length || 0} items available
                                    </Badge>
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Shield className="w-4 h-4 text-blue-500" />
                                        <span>Medical Records</span>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <div className="relative mb-6">
                                        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                                        <History className="absolute inset-0 m-auto w-6 h-6 text-blue-600" />
                                    </div>
                                    <p className="text-gray-600 text-lg">Loading medical history...</p>
                                    <p className="text-gray-500 text-sm mt-2">Accessing patient records</p>
                                </div>
                            ) : (
                                <Card className="shadow-md border border-gray-200 bg-white">
                                    <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-t-lg py-4">
                                        <CardTitle className="flex items-center gap-3 text-lg font-semibold">
                                            <User className="w-5 h-5 text-white" />
                                            <span className="flex-1">Medical History Items</span>
                                            {activeCount > 0 && (
                                                <Badge className="bg-white/20 text-white border-white/30 text-xs">
                                                    {activeCount} selected
                                                </Badge>
                                            )}
                                        </CardTitle>
                                    </CardHeader>

                                    <ScrollArea className="h-[400px]">
                                        <ScrollAreaViewport>
                                            <CardContent className="p-0">
                                                {historyDict?.map((item: HistoryItem) => {
                                                    const isActive = patientHistory.some((h: any) => h.history_id === item.id);
                                                    return (
                                                        <div
                                                            key={item.id}
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
                                                                    htmlFor={`history-${item.id}`}
                                                                    className="flex-1 cursor-pointer select-none"
                                                                >
                                                                    <div className="font-medium text-gray-900 text-sm">
                                                                        {item.name}
                                                                    </div>
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
                                                                            id={`history-${item.id}`}
                                                                            checked={isActive}
                                                                            onCheckedChange={(v) => toggle(item.id, !!v)}
                                                                            className="w-5 h-5 border-2 border-gray-400 data-[state=checked]:border-blue-500 data-[state=checked]:bg-blue-500"
                                                                        />
                                                                    </div>
                                                                </TooltipTrigger>
                                                                <TooltipContent side="left" className="bg-gray-900 text-white border-gray-700">
                                                                    <p className="text-xs">
                                                                        {isActive ? 'Remove from history' : 'Add to history'}
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
                            )}
                        </CardContent>
                    </Card>

                    {/* Professional Medical Footer */}
                    <div className="mt-8 text-center py-6">
                        <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
                            <Heart className="w-4 h-4 text-blue-500" />
                            <span>Comprehensive Medical Documentation</span>
                            <span>•</span>
                            <span>Evidence-Based History Tracking</span>
                            <Shield className="w-4 h-4 text-blue-500" />
                        </div>
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
});

PersonalHistorySection.displayName = 'PersonalHistorySection';

export default PersonalHistorySection;