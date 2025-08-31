'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import {
    Pill,
    Plus,
    Edit3,
    Trash2,
    Clock,
    Calendar,
    TrendingUp,
    PieChart,
    Shield,
    Save,
    X,
    History,
    AlertTriangle,
    CheckCircle,
    Activity,
    Timer,
    Target,
    Sparkles,
    BarChart3,
    Archive,
    FileText,
    Zap
} from 'lucide-react';
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
    ScrollArea,
    ScrollAreaViewport,
    ScrollAreaScrollbar,
    ScrollAreaThumb,
} from '@/components/ui/scroll-area';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { PrescriptionPdfExport } from '@/app/components/PrescriptionPdfExport';
import { toast } from 'sonner';

interface Prescription {
    id: number;
    medicine_name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
    created_at: string;
    updated_at: string;
}

interface PrescriptionHistory {
    total_prescriptions: number;
    most_prescribed_medicines: { medicine: string; count: number }[];
    recent_prescriptions: Prescription[];
    unique_medicines: number;
    prescription_timeline: Prescription[];
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001/api/v1';

const frequencyOptions = [
    'Once daily', 'Twice daily', 'Three times daily', 'Four times daily',
    'Every 4 hours', 'Every 6 hours', 'Every 8 hours', 'Every 12 hours',
    'As needed', 'Before meals', 'After meals', 'At bedtime'
];

const durationOptions = [
    '3 days', '5 days', '7 days', '10 days', '14 days', '21 days', '1 month',
    '2 months', '3 months', '6 months', 'Until further notice', 'As needed'
];

export function PrescriptionsSection({
    patientId,
    patientName,
    doctorName,
}: {
    patientId: number;
    patientName: string;
    doctorName?: string;
}) {
    const { getAccessTokenSilently } = useAuth0();
    const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
    const [history, setHistory] = useState<PrescriptionHistory | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [showHistory, setShowHistory] = useState(false);
    const [activeTab, setActiveTab] = useState<'current' | 'history' | 'analytics'>('current');

    // Form state
    const [formData, setFormData] = useState({
        medicine_name: '',
        dosage: '',
        frequency: '',
        duration: '',
        instructions: ''
    });

    const resetForm = () => {
        setFormData({
            medicine_name: '',
            dosage: '',
            frequency: '',
            duration: '',
            instructions: ''
        });
    };

    const fetchPrescriptions = useCallback(async () => {
        try {
            const token = await getAccessTokenSilently();
            const res = await fetch(`${API}/patient-prescriptions/by-patient/${patientId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            setPrescriptions(data);
        } catch (err: any) {
            console.error('Failed to load prescriptions:', err);
            toast.error('Failed to load prescriptions');
        }
    }, [patientId, getAccessTokenSilently]);

    const fetchHistory = useCallback(async () => {
        try {
            const token = await getAccessTokenSilently();
            const res = await fetch(`${API}/patient-prescriptions/history/${patientId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            setHistory(data);
        } catch (err: any) {
            console.error('Failed to load prescription history:', err);
            toast.error('Failed to load prescription history');
        }
    }, [patientId, getAccessTokenSilently]);

    useEffect(() => {
        (async () => {
            setLoading(true);
            await Promise.all([fetchPrescriptions(), fetchHistory()]);
            setLoading(false);
        })();
    }, [fetchPrescriptions, fetchHistory]);

    const handleSubmit = async () => {
        if (!formData.medicine_name || !formData.dosage || !formData.frequency || !formData.duration) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            const token = await getAccessTokenSilently();
            const url = editingId 
                ? `${API}/patient-prescriptions/${editingId}`
                : `${API}/patient-prescriptions`;
            const method = editingId ? 'PUT' : 'POST';
            
            const body = editingId 
                ? formData 
                : { ...formData, patient_id: patientId };

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            });

            if (!res.ok) throw new Error(await res.text());
            
            toast.success(editingId ? 'Prescription updated successfully' : 'Prescription added successfully');
            resetForm();
            setIsAddingNew(false);
            setEditingId(null);
            await Promise.all([fetchPrescriptions(), fetchHistory()]);
        } catch (err: any) {
            console.error('Failed to save prescription:', err);
            toast.error('Failed to save prescription');
        }
    };

    const handleEdit = (prescription: Prescription) => {
        setFormData({
            medicine_name: prescription.medicine_name,
            dosage: prescription.dosage,
            frequency: prescription.frequency,
            duration: prescription.duration,
            instructions: prescription.instructions || ''
        });
        setEditingId(prescription.id);
        setIsAddingNew(true);
    };

    const handleDelete = async (id: number) => {
        try {
            const token = await getAccessTokenSilently();
            const res = await fetch(`${API}/patient-prescriptions/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error(await res.text());
            toast.success('Prescription deleted successfully');
            await Promise.all([fetchPrescriptions(), fetchHistory()]);
        } catch (err: any) {
            console.error('Failed to delete prescription:', err);
            toast.error('Failed to delete prescription');
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getFrequencyColor = (frequency: string) => {
        if (frequency.includes('daily')) return 'bg-blue-100 text-blue-700 border-blue-200';
        if (frequency.includes('hours')) return 'bg-purple-100 text-purple-700 border-purple-200';
        if (frequency.includes('needed')) return 'bg-orange-100 text-orange-700 border-orange-200';
        return 'bg-gray-100 text-gray-700 border-gray-200';
    };

    const getDurationUrgency = (duration: string) => {
        if (duration.includes('days') && parseInt(duration) <= 7) return 'urgent';
        if (duration.includes('month') || duration.includes('notice')) return 'long-term';
        return 'medium';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/40">
            {/* Professional Medical Header */}
            <div className="relative bg-gradient-to-r from-emerald-600 via-teal-700 to-green-800 overflow-hidden">
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
                                <Pill className="w-12 h-12 text-white" />
                            </div>

                            <div className="text-white">
                                <h1 className="text-4xl font-bold tracking-tight mb-2">
                                    Prescription Management
                                </h1>
                                <p className="text-emerald-100 text-lg mb-1">
                                    Comprehensive medication tracking and analytics
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
                                    <Pill className="w-6 h-6 text-yellow-300" />
                                    <div className="text-white">
                                        <div className="text-sm text-emerald-100">Active Prescriptions</div>
                                        <div className="text-2xl font-bold">{prescriptions.length}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                                <div className="flex items-center gap-3">
                                    <TrendingUp className="w-6 h-6 text-green-300" />
                                    <div className="text-white">
                                        <div className="text-sm text-emerald-100">Total Prescribed</div>
                                        <div className="text-xl font-bold">{history?.total_prescriptions || 0}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                                <div className="flex items-center gap-3">
                                    <Target className="w-6 h-6 text-blue-300" />
                                    <div className="text-white">
                                        <div className="text-sm text-emerald-100">Unique Medicines</div>
                                        <div className="text-xl font-bold">{history?.unique_medicines || 0}</div>
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
                {/* Tab Navigation */}
                <Card className="mb-8 shadow-lg border-0 bg-white">
                    <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100 rounded-t-lg py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex gap-2">
                                <Button
                                    variant={activeTab === 'current' ? 'default' : 'outline'}
                                    onClick={() => setActiveTab('current')}
                                    className={activeTab === 'current' 
                                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                                        : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                                    }
                                >
                                    <Pill className="w-4 h-4 mr-2" />
                                    Current Prescriptions
                                </Button>
                                <Button
                                    variant={activeTab === 'history' ? 'default' : 'outline'}
                                    onClick={() => setActiveTab('history')}
                                    className={activeTab === 'history' 
                                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                                        : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                                    }
                                >
                                    <History className="w-4 h-4 mr-2" />
                                    Timeline
                                </Button>
                                <Button
                                    variant={activeTab === 'analytics' ? 'default' : 'outline'}
                                    onClick={() => setActiveTab('analytics')}
                                    className={activeTab === 'analytics' 
                                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                                        : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                                    }
                                >
                                    <BarChart3 className="w-4 h-4 mr-2" />
                                    Analytics
                                </Button>
                            </div>
                            <div className="flex gap-3">
                                <PrescriptionPdfExport
                                    prescriptions={prescriptions}
                                    patientName={patientName}
                                    doctorName={doctorName || "Dr. Physician"}
                                    patientId={patientId}
                                />
                                <Button
                                    onClick={() => {
                                        resetForm();
                                        setEditingId(null);
                                        setIsAddingNew(true);
                                    }}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    New Prescription
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                {/* Current Prescriptions Tab */}
                {activeTab === 'current' && (
                    <Card className="shadow-lg border-0 bg-white">
                        <CardHeader className="bg-gradient-to-r from-gray-50 to-emerald-50 border-b border-gray-100">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-3 text-xl font-semibold text-gray-800">
                                    <div className="p-2 bg-emerald-100 rounded-lg">
                                        <Pill className="w-5 h-5 text-emerald-600" />
                                    </div>
                                    Active Medications
                                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-emerald-200 px-3 py-1">
                                        {prescriptions.length} active
                                    </Badge>
                                </CardTitle>
                                {prescriptions.length > 0 && (
                                    <PrescriptionPdfExport
                                        prescriptions={prescriptions}
                                        patientName={patientName}
                                        doctorName={doctorName || "Dr. Physician"}
                                        patientId={patientId}
                                    />
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="p-8">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <div className="relative mb-6">
                                        <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
                                        <Pill className="absolute inset-0 m-auto w-6 h-6 text-emerald-600" />
                                    </div>
                                    <p className="text-gray-600 text-lg">Loading prescriptions...</p>
                                    <p className="text-gray-500 text-sm mt-2">Accessing medication records</p>
                                </div>
                            ) : prescriptions.length > 0 ? (
                                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {prescriptions.map((prescription) => (
                                        <Card key={prescription.id} className="border border-emerald-200/60 bg-gradient-to-br from-white to-emerald-50/30 shadow-sm hover:shadow-md transition-all duration-200">
                                            <CardHeader className="pb-3">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <h3 className="font-semibold text-lg text-gray-900 mb-1">
                                                            {prescription.medicine_name}
                                                        </h3>
                                                        <div className="flex flex-wrap gap-2 mb-3">
                                                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                                                                {prescription.dosage}
                                                            </Badge>
                                                            <Badge variant="secondary" className={`text-xs ${getFrequencyColor(prescription.frequency)}`}>
                                                                {prescription.frequency}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        onClick={() => handleEdit(prescription)}
                                                                        className="h-8 w-8 p-0 hover:bg-emerald-100"
                                                                    >
                                                                        <Edit3 className="w-4 h-4 text-emerald-600" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Edit prescription</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        onClick={() => handleDelete(prescription.id)}
                                                                        className="h-8 w-8 p-0 hover:bg-red-100"
                                                                    >
                                                                        <Trash2 className="w-4 h-4 text-red-600" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Delete prescription</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="pt-0">
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2">
                                                        <Timer className="w-4 h-4 text-gray-500" />
                                                        <span className="text-sm text-gray-600">Duration: </span>
                                                        <Badge 
                                                            variant="outline" 
                                                            className={`text-xs ${
                                                                getDurationUrgency(prescription.duration) === 'urgent' ? 'border-red-300 text-red-700' :
                                                                getDurationUrgency(prescription.duration) === 'long-term' ? 'border-blue-300 text-blue-700' :
                                                                'border-gray-300 text-gray-700'
                                                            }`}
                                                        >
                                                            {prescription.duration}
                                                        </Badge>
                                                    </div>
                                                    {prescription.instructions && (
                                                        <div className="bg-gray-50 rounded-lg p-3">
                                                            <div className="flex items-start gap-2">
                                                                <FileText className="w-4 h-4 text-gray-500 mt-0.5" />
                                                                <div>
                                                                    <p className="text-xs font-medium text-gray-700 mb-1">Instructions:</p>
                                                                    <p className="text-xs text-gray-600">{prescription.instructions}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-2 text-xs text-gray-500 pt-2 border-t border-gray-100">
                                                        <Calendar className="w-3 h-3" />
                                                        <span>Prescribed: {formatDate(prescription.created_at)}</span>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-teal-200 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                                        <Pill className="w-10 h-10 text-emerald-600" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-800 mb-2">No Active Prescriptions</h3>
                                    <p className="text-gray-500 text-sm mb-4">Start by adding a new prescription for this patient</p>
                                    <Button
                                        onClick={() => {
                                            resetForm();
                                            setEditingId(null);
                                            setIsAddingNew(true);
                                        }}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add First Prescription
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* History Timeline Tab */}
                {activeTab === 'history' && history && (
                    <Card className="shadow-lg border-0 bg-white">
                        <CardHeader className="bg-gradient-to-r from-gray-50 to-emerald-50 border-b border-gray-100">
                            <CardTitle className="flex items-center gap-3 text-xl font-semibold text-gray-800">
                                <div className="p-2 bg-emerald-100 rounded-lg">
                                    <History className="w-5 h-5 text-emerald-600" />
                                </div>
                                Prescription Timeline
                                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-emerald-200 px-3 py-1">
                                    {history.prescription_timeline.length} total
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8">
                            <div className="space-y-6">
                                {history.prescription_timeline.map((prescription, index) => (
                                    <div key={prescription.id} className="flex items-start gap-4">
                                        <div className="flex flex-col items-center">
                                            <div className="w-3 h-3 bg-emerald-600 rounded-full"></div>
                                            {index < history.prescription_timeline.length - 1 && (
                                                <div className="w-0.5 h-16 bg-emerald-200 mt-2"></div>
                                            )}
                                        </div>
                                        <div className="flex-1 bg-gradient-to-r from-white to-emerald-50/30 border border-emerald-200/60 rounded-xl p-4">
                                            <div className="flex items-start justify-between mb-2">
                                                <h4 className="font-medium text-gray-900">{prescription.medicine_name}</h4>
                                                <span className="text-xs text-gray-500">{formatDate(prescription.created_at)}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                                                    {prescription.dosage}
                                                </Badge>
                                                <Badge variant="secondary" className={`text-xs ${getFrequencyColor(prescription.frequency)}`}>
                                                    {prescription.frequency}
                                                </Badge>
                                                <Badge variant="outline" className="text-xs border-gray-300 text-gray-700">
                                                    {prescription.duration}
                                                </Badge>
                                            </div>
                                            {prescription.instructions && (
                                                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                                                    {prescription.instructions}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Analytics Tab */}
                {activeTab === 'analytics' && history && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Most Prescribed Medicines */}
                        <Card className="shadow-lg border-0 bg-white">
                            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                                <CardTitle className="flex items-center gap-3 text-lg font-semibold text-gray-800">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <TrendingUp className="w-5 h-5 text-blue-600" />
                                    </div>
                                    Most Prescribed Medicines
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="space-y-4">
                                    {history.most_prescribed_medicines.map((item, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50/50 to-indigo-50/30 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                                                    index === 0 ? 'bg-yellow-500' : 
                                                    index === 1 ? 'bg-gray-400' :
                                                    index === 2 ? 'bg-orange-600' : 'bg-blue-500'
                                                }`}>
                                                    {index + 1}
                                                </div>
                                                <span className="font-medium text-gray-900 capitalize">{item.medicine}</span>
                                            </div>
                                            <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                                                {item.count} times
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Statistics Overview */}
                        <Card className="shadow-lg border-0 bg-white">
                            <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
                                <CardTitle className="flex items-center gap-3 text-lg font-semibold text-gray-800">
                                    <div className="p-2 bg-emerald-100 rounded-lg">
                                        <BarChart3 className="w-5 h-5 text-emerald-600" />
                                    </div>
                                    Prescription Statistics
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-200">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Archive className="w-5 h-5 text-emerald-600" />
                                            <span className="text-sm font-medium text-emerald-700">Total Prescribed</span>
                                        </div>
                                        <p className="text-2xl font-bold text-emerald-800">{history.total_prescriptions}</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Target className="w-5 h-5 text-blue-600" />
                                            <span className="text-sm font-medium text-blue-700">Unique Medicines</span>
                                        </div>
                                        <p className="text-2xl font-bold text-blue-800">{history.unique_medicines}</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-4 border border-purple-200">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Activity className="w-5 h-5 text-purple-600" />
                                            <span className="text-sm font-medium text-purple-700">Currently Active</span>
                                        </div>
                                        <p className="text-2xl font-bold text-purple-800">{prescriptions.length}</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-4 border border-orange-200">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Zap className="w-5 h-5 text-orange-600" />
                                            <span className="text-sm font-medium text-orange-700">Recent (6mo)</span>
                                        </div>
                                        <p className="text-2xl font-bold text-orange-800">{history.recent_prescriptions.length}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Professional Medical Footer */}
                <div className="mt-8 text-center py-6">
                    <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
                        <Pill className="w-4 h-4 text-emerald-500" />
                        <span>Evidence-Based Prescription Management</span>
                        <span>•</span>
                        <span>Comprehensive Medication Tracking</span>
                        <Shield className="w-4 h-4 text-emerald-500" />
                    </div>
                </div>
            </div>

            {/* Add/Edit Prescription Dialog */}
            <Dialog open={isAddingNew} onOpenChange={setIsAddingNew}>
                <DialogContent className="sm:max-w-md bg-white rounded-lg p-0 shadow-xl border-0">
                    <DialogHeader className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-t-lg p-6">
                        <DialogTitle className="flex items-center gap-3 text-xl font-semibold">
                            <Pill className="w-6 h-6" />
                            {editingId ? 'Edit Prescription' : 'New Prescription'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="p-6 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="medicine" className="text-sm font-medium text-gray-700">Medicine Name *</Label>
                            <Input
                                id="medicine"
                                value={formData.medicine_name}
                                onChange={(e) => setFormData({ ...formData, medicine_name: e.target.value })}
                                placeholder="e.g., Metformin"
                                className="border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="dosage" className="text-sm font-medium text-gray-700">Dosage *</Label>
                                <Input
                                    id="dosage"
                                    value={formData.dosage}
                                    onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                                    placeholder="e.g., 500mg"
                                    className="border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="frequency" className="text-sm font-medium text-gray-700">Frequency *</Label>
                                <Input
                                    id="frequency"
                                    value={formData.frequency}
                                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                                    placeholder="e.g., Twice daily"
                                    className="border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500"
                                    list="frequency-options"
                                />
                                <datalist id="frequency-options">
                                    {frequencyOptions.map(option => (
                                        <option key={option} value={option} />
                                    ))}
                                </datalist>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="duration" className="text-sm font-medium text-gray-700">Duration *</Label>
                            <Input
                                id="duration"
                                value={formData.duration}
                                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                                placeholder="e.g., 30 days"
                                className="border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500"
                                list="duration-options"
                            />
                            <datalist id="duration-options">
                                {durationOptions.map(option => (
                                    <option key={option} value={option} />
                                ))}
                            </datalist>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="instructions" className="text-sm font-medium text-gray-700">Instructions</Label>
                            <Textarea
                                id="instructions"
                                value={formData.instructions}
                                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                                placeholder="Additional instructions for the patient..."
                                className="border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500 min-h-[80px]"
                            />
                        </div>
                    </div>
                    <DialogFooter className="bg-gray-50 rounded-b-lg p-6 flex justify-end gap-3">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsAddingNew(false);
                                setEditingId(null);
                                resetForm();
                            }}
                            className="border-gray-300 text-gray-700 hover:bg-gray-100"
                        >
                            <X className="w-4 h-4 mr-2" />
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {editingId ? 'Update' : 'Add'} Prescription
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
