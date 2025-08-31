'use client';

import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth0 } from '@auth0/auth0-react';
import { format, parseISO, isToday, isFuture } from 'date-fns';
import { TopBar } from '@/app/components/TopBar';
import { Sidebar, Section } from '@/app/components/Sidebar';
import { ExportPdfButton } from '@/app/components/ExportPdfButton';
import { SummaryPanel, SummaryBuckets } from '@/app/components/SummaryPanel';
import { SymptomsSection } from '@/app/components/SymptomsSection';
import PersonalHistorySection from '@/app/components/PersonalHistorySection';
import { VitalSignsSection } from '@/app/components/VitalSignsSection';
import { TestsSection } from '@/app/components/TestsSection';
import { PrescriptionsSection } from '@/app/components/PrescriptionsSection';
import { AuditLogSection } from '@/app/components/AuditLogSection';
import { ChatSection } from '@/app/components/ChatSection';
import {
    User,
    Phone,
    Heart,
    IdCard,
    Loader2,
    ArrowLeft,
    Pencil,
    Save,
    X,
    Trash2,
    Calendar,
    NotebookTabs,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogTrigger,
    AlertDialogPortal,
    AlertDialogOverlay,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { summarizeRisks, type RiskSummary } from '@/lib/llm';
import { ShareMenuButton } from '@/app/components/ShareMenuButton';
import { toast } from 'sonner';
import { usePatient } from '@/lib/api-cache';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001/api/v1';

/** Map API payload into React state **/
function hydrateFromPayload(
    payload: any,
    setters: {
        setPatient: (d: any) => void;
        setForm: (d: any) => void;
        setSummary: (d: any) => void;
    }
) {
    const { setPatient, setForm, setSummary } = setters;
    setPatient(payload);
    setForm({
        first_name: payload.demographics.first_name,
        last_name: payload.demographics.last_name,
        gender: payload.demographics.gender,
        dob: payload.demographics.date_of_birth,
        ethnicity: payload.demographics.ethnicity || '',
        phone: payload.contact_info.phone || '',
        email: payload.contact_info.email || '',
        occupation: payload.social_info.occupation || '',
        address: payload.social_info.address || '',
        marital_status: payload.social_info.marital_status || '',
        insurance_provider: payload.social_info.insurance_provider || '',
        weight: payload.demographics.weight.toString(),
        height: payload.demographics.height.toString(),
    });
    setSummary({
        follow_up_actions:
            payload.follow_up_actions?.map((x: any) => ({
                id: x.id,
                label: x.action,
                extra: x.interval,
                auto_generated: x.auto_generated || false,
            })) ?? [],
        recommendations:
            payload.recommendations?.map((x: any) => ({
                id: x.id,
                label: x.recommendation,
                auto_generated: x.auto_generated || false,
            })) ?? [],
        referrals:
            payload.referrals?.map((x: any) => ({
                id: x.id,
                label: x.specialist,
                extra: x.reason,
                auto_generated: x.auto_generated || false,
            })) ?? [],
        life_style_advice:
            payload.life_style_advice?.map((x: any) => ({
                id: x.id,
                label: x.advice,
                auto_generated: x.auto_generated || false,
            })) ?? [],
        presumptive_diagnoses:
            payload.presumptive_diagnoses?.map((x: any) => ({
                id: x.id,
                label: x.diagnosis_name,
                extra: x.confidence_level,
                auto_generated: x.auto_generated || false,
            })) ?? [],
        tests_to_order:
            payload.tests_to_order?.map((x: any) => ({
                id: x.id,
                label: x.test_to_order,
                auto_generated: x.auto_generated || false,
            })) ?? [],
    } as SummaryBuckets);
}



function Field({
    label,
    value,
    editable = false,
    onChange,
    type = 'text',
    date,
    select,
    options,
}: {
    label?: string;
    value?: string | null;
    editable?: boolean;
    onChange?: (v: string) => void;
    type?: 'text' | 'email' | 'number';
    date?: boolean;
    select?: boolean;
    options?: { value: string; label: string }[];
}) {
    return (
        <div className="flex items-center gap-3">
            {label && <span className="font-medium text-gray-700 w-[120px] text-sm">{label}:</span>}
            {editable ? (
                select && options ? (
                    <Select value={value || ''} onValueChange={onChange}>
                        <SelectTrigger className="w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                            <SelectValue placeholder="Select an option" />
                        </SelectTrigger>
                        <SelectContent>
                            {options.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                ) : (
                    <Input
                        className="w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        type={date ? 'date' : type}
                        value={value || ''}
                        onChange={(e) => onChange?.(e.target.value)}
                    />
                )
            ) : (
                <span className={value ? 'text-gray-900 text-sm' : 'italic text-gray-400 text-sm'}>
                    {value || '—'}
                </span>
            )}
        </div>
    );
}

export default function PatientPage() {
    const { id } = useParams() as { id: string };
    const router = useRouter();
    const { getAccessTokenSilently, user } = useAuth0();
    const doctorName = user?.name || 'Unknown Doctor';
    const [patient, setPatient] = useState<any>(null);
    const [form, setForm] = useState<any>(null);
    const [summary, setSummary] = useState<SummaryBuckets | null>(null);
    const [predictions, setPredictions] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    
    // Get today's date for appointment validation
    const today = new Date().toISOString().split('T')[0];
    
    const [section, setSection] = useState<Section>('home');
    const [appointments, setAppointments] = useState<any[]>([]);
    const [apptLoading, setApptLoading] = useState(true);
    
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [currentAppt, setCurrentAppt] = useState<any>(null);
    const [apptDate, setApptDate] = useState(today);
    const [apptTime, setApptTime] = useState('09:00');
    const [apptType, setApptType] = useState('');
    const [submittingAppt, setSubmittingAppt] = useState(false);
    const [deletingAppt, setDeletingAppt] = useState(false);
    const [toDeleteId, setToDeleteId] = useState<number | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const didFetchPatientBasic = useRef(false);
    const didFetchAppts = useRef(false);

    // Use SWR for patient data fetching
    const { data: basicData, error: basicError, isLoading: basicLoading } = usePatient(id ? `${id}?basic=true` : null);
    const { data: fullData, error: fullError, isLoading: fullLoading } = usePatient(
        (section === 'summary' || section === 'chat') ? `${id}?basic=false` : null
    );

    // Handle errors
    useEffect(() => {
        if (basicError || fullError) {
            console.error('Error fetching patient data:', basicError || fullError);
            router.replace('/dashboard');
        }
    }, [basicError, fullError, router]);

    // Handle basic data
    useEffect(() => {
        if (basicData && !basicLoading) {
            hydrateFromPayload(basicData, { setPatient, setForm, setSummary });
        }
    }, [basicData, basicLoading]);

    // Handle full data for summary/chat sections
    useEffect(() => {
        if (fullData && !fullLoading && (section === 'summary' || section === 'chat')) {
            hydrateFromPayload(fullData, { setPatient, setForm, setSummary });
            
            // Fetch predictions
            (async () => {
                try {
                    const token = await getAccessTokenSilently();
                    const vitalSigns = fullData.vital_signs.reduce((acc: any, sign: any) => ({
                        ...acc,
                        [sign.name]: parseFloat(sign.value)
                    }), {});
                    const tests = fullData.tests.reduce((acc: any, test: any) => ({
                        ...acc,
                        [test.name]: parseFloat(test.value)
                    }), {});
                    const input = {
                        age: fullData.demographics.age,
                        gender: fullData.demographics.gender === 'Male' ? 2 : 1,
                        height: fullData.demographics.height,
                        weight: fullData.demographics.weight,
                        ap_hi: vitalSigns['Systolic Blood Pressure'] || 120,
                        ap_lo: vitalSigns['Diastolic Blood Pressure'] || 80,
                        cholesterol: tests['Cholesterol (Total)'] ? Math.ceil(tests['Cholesterol (Total)'] / 100) : 1,
                        gluc: tests['Fasting Plasma Glucose'] ? Math.ceil(tests['Fasting Plasma Glucose'] / 100) : 1,
                        smoke: fullData.demographics.smoke || 0,
                        alco: fullData.demographics.alco || 0,
                        active: fullData.demographics.active || 1
                    };
                    const res = await fetch(`${API}/predict`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify(input),
                    });
                    if (!res.ok) throw new Error(await res.text());
                    const predictionData = await res.json();
                    setPredictions(predictionData.predictions);
                } catch (err) {
                    console.error('Error fetching predictions:', err);
                    toast.error('Failed to load predictions. Please try again.');
                }
            })();

            // Handle risk summary
            if (fullData.risks?.length) {
                (async () => {
                    const rs: RiskSummary | null = await summarizeRisks(fullData.risks);
                    if (rs) {
                        setSummary((prev) => {
                            const base: SummaryBuckets = prev || {
                                follow_up_actions: [],
                                recommendations: [],
                                referrals: [],
                                life_style_advice: [],
                                presumptive_diagnoses: [],
                                tests_to_order: [],
                            };
                            return { ...base, risk_summary: rs };
                        });
                    }
                })();
            }
        }
    }, [fullData, fullLoading, section, getAccessTokenSilently]);

    // Set loading state based on SWR loading states
    useEffect(() => {
        setLoading(basicLoading || (fullLoading && (section === 'summary' || section === 'chat')));
    }, [basicLoading, fullLoading, section]);



    useEffect(() => {
        if (!patient || didFetchAppts.current) return;
        didFetchAppts.current = true;
        (async () => {
            setApptLoading(true);
            const token = await getAccessTokenSilently();
            const res = await fetch(`${API}/appointments/by-patient/${patient.id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) setAppointments(await res.json());
            setApptLoading(false);
        })();
    }, [patient, getAccessTokenSilently]);

    const openCreate = () => {
        setModalMode('create');
        setCurrentAppt(null);
        setApptDate(today);
        setApptTime('09:00');
        setApptType('');
        setSubmittingAppt(false);
        setModalOpen(true);
    };

    const openEdit = (a: any) => {
        setModalMode('edit');
        setCurrentAppt(a);
        setApptDate(a.datetime.split('T')[0]);
        setApptTime(a.datetime.split('T')[1].substring(0, 5));
        setApptType(a.type);
        setSubmittingAppt(false);
        setModalOpen(true);
    };

    const resetAppointmentForm = () => {
        setApptDate(today);
        setApptTime('09:00');
        setApptType('');
        setSubmittingAppt(false);
        setDeletingAppt(false);
        setCurrentAppt(null);
    };

    const handleSubmitAppt = async () => {
        if (submittingAppt) return; // Prevent double submission
        
        try {
            setSubmittingAppt(true);
            const token = await getAccessTokenSilently();
            const iso = `${apptDate}T${apptTime}:00`;
            const url =
                modalMode === 'create'
                    ? `${API}/appointments`
                    : `${API}/appointments/${currentAppt.id}`;
            const method = modalMode === 'create' ? 'POST' : 'PUT';
            const body = { patient_id: patient.id, datetime: iso, type: apptType };
            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            });
            if (!res.ok) throw new Error(await res.text());
            setModalOpen(false);
            const token2 = await getAccessTokenSilently();
            const r2 = await fetch(`${API}/appointments/by-patient/${patient.id}`, {
                headers: { Authorization: `Bearer ${token2}` },
            });
            if (r2.ok) setAppointments(await r2.json());
            toast.success(`Appointment ${modalMode === 'create' ? 'created' : 'updated'} successfully`);
        } catch (e) {
            console.error('Failed to save appointment', e);
            toast.error('Failed to save appointment');
        } finally {
            setSubmittingAppt(false);
        }
    };

    const handleDeleteAppt = async () => {
        if (toDeleteId === null || deletingAppt) return;
        
        try {
            setDeletingAppt(true);
            const token = await getAccessTokenSilently();
            const res = await fetch(`${API}/appointments/${toDeleteId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error(await res.text());
            setDeleteDialogOpen(false);
            setToDeleteId(null);
            const token2 = await getAccessTokenSilently();
            const r2 = await fetch(`${API}/appointments/by-patient/${patient.id}`, {
                headers: { Authorization: `Bearer ${token2}` },
            });
            if (r2.ok) setAppointments(await r2.json());
            toast.success('Appointment deleted successfully');
        } catch (e) {
            console.error('Failed to delete appointment', e);
            toast.error('Failed to delete appointment');
        } finally {
            setDeletingAppt(false);
        }
    };

    const handleSave = async () => {
        if (!patient || saving) return; // Prevent double submission
        
        try {
            setSaving(true);
            const token = await getAccessTokenSilently();
            const res = await fetch(`${API}/patients/${patient.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    first_name: form.first_name,
                    last_name: form.last_name,
                    gender: form.gender,
                    dob: form.dob,
                    ethnicity: form.ethnicity,
                    phone: form.phone,
                    email: form.email,
                    occupation: form.occupation,
                    address: form.address,
                    marital_status: form.marital_status,
                    insurance_provider: form.insurance_provider,
                    weight: parseInt(form.weight),
                    height: parseInt(form.height),
                }),
            });
            if (!res.ok) throw new Error(await res.text());
            setEditing(false);
            toast.success('Patient information updated successfully');
        } catch (err) {
            console.error('Error saving patient:', err);
            toast.error('Failed to update patient information');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/20">
            <style jsx>{`
                @keyframes shimmer-text {
                    0% {
                        background-position: -200% 0;
                    }
                    100% {
                        background-position: 200% 0;
                    }
                }
                @keyframes pulse {
                    0%, 100% {
                        transform: scale(1);
                        opacity: 1;
                    }
                    50% {
                        transform: scale(1.15);
                        opacity: 0.85;
                    }
                }
                @keyframes heartbeatWave {
                    0% {
                        stroke-dashoffset: 0;
                    }
                    100% {
                        stroke-dashoffset: -1000;
                    }
                }
                .shimmer-text {
                    position: relative;
                    color: transparent;
                    background: linear-gradient(
                        90deg,
                        #c0c0c0 0%,
                        #f0f0f0 50%,
                        #c0c0c0 100%
                    );
                    background-size: 200% 100%;
                    animation: shimmer-text 2s linear infinite;
                    -webkit-background-clip: text;
                    background-clip: text;
                }
                .shimmer-text::after {
                    content: attr(data-text);
                    position: absolute;
                    top: 0;
                    left: 0;
                    color: #1f2937; /* gray-900 */
                    z-index: -1;
                }
                .shimmer-text-sub::after {
                    content: attr(data-text);
                    position: absolute;
                    top: 0;
                    left: 0;
                    color: #4b5563; /* gray-600 */
                    z-index: -1;
                }
                .heartbeat-pulse {
                    animation: pulse 1.8s ease-in-out infinite;
                }
                .heartbeat-wave {
                    stroke-dasharray: 50;
                    stroke-dashoffset: 0;
                    animation: heartbeatWave 10s linear infinite;
                }
            `}</style>
            <Sidebar active={section} onChange={setSection} />
            <div className="flex-1 flex flex-col ml-64">
                <TopBar doctorName={doctorName} />
                <main className="flex-1 overflow-y-auto">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                        {loading ? (
                            section === 'summary' || section === 'chat' ? (
                                <div className="flex flex-col items-center">
                                    <div className="relative mb-6">
                                        <Image
                                            src="/images/deepcardio_logo.png"
                                            alt="DeepCardio Logo"
                                            width={100}
                                            height={100}
                                            className="heartbeat-pulse shadow-lg rounded-full"
                                        />
                                    </div>
                                    <svg
                                        className="w-64 h-16 mb-4"
                                        viewBox="0 0 200 40"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path
                                            d="M0 20 H40 Q45 20 47 25 T50 30 Q52 35 55 30 T60 25 Q62 20 65 20 T70 20 H80 Q85 20 87 15 T90 10 Q92 5 95 10 T100 15 Q102 20 105 20 T110 20 H120 Q125 20 127 25 T130 30 Q132 35 135 30 T140 25 Q142 20 145 20 T150 20 H160 Q165 20 167 15 T170 10 Q172 5 175 10 T180 15 Q182 20 185 20 T190 20 H200"
                                            stroke="#2563eb"
                                            strokeWidth="2"
                                            className="heartbeat-wave"
                                        />
                                    </svg>
                                    <h2
                                        className="text-2xl font-bold shimmer-text text-center mb-2"
                                        data-text="DeepCardio’s AI is Analyzing..."
                                    >
                                        DeepCardio’s AI is Analyzing...
                                    </h2>
                                    <p
                                        className="text-sm shimmer-text shimmer-text-sub max-w-sm text-center"
                                        data-text="Our advanced ML model is processing vital signs and test data to predict cardiovascular risks with unparalleled precision."
                                    >
                                        Our advanced ML model is processing vital signs and test data to predict cardiovascular risks with unparalleled precision.
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <div className="relative mb-4">
                                        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                                        <Loader2 className="absolute inset-0 m-auto w-5 h-5 text-blue-600" />
                                    </div>
                                    <p className="text-gray-600 text-sm">Loading patient data...</p>
                                </div>
                            )
                        ) : section === 'home' && form ? (
                            <>
                                <div className="flex items-center justify-between mb-6">
                                    <Link
                                        href="/dashboard"
                                        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 shadow-sm"
                                    >
                                        <ArrowLeft className="size-4 text-blue-600" />
                                        Back to Dashboard
                                    </Link>
                                    {editing ? (
                                        <div className="flex gap-2">
                                            <Button
                                                onClick={handleSave}
                                                disabled={saving}
                                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                            >
                                                <Save className="size-4 mr-2" />
                                                {saving ? 'Saving...' : 'Save'}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={() => setEditing(false)}
                                                className="border-gray-200 hover:bg-gray-50 text-gray-700"
                                            >
                                                <X className="size-4 mr-2" />
                                                Cancel
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button
                                            onClick={() => setEditing(true)}
                                            className="bg-blue-600 hover:bg-blue-700 text-white"
                                        >
                                            <Pencil className="size-4 mr-2" />
                                            Edit Info
                                        </Button>
                                    )}
                                </div>
                                <Card className="shadow-md border-0 bg-white">
                                    <CardHeader className="bg-blue-600 text-white rounded-t-lg">
                                        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                                            <IdCard className="w-5 h-5" />
                                            Patient Profile: {form.first_name} {form.last_name}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            <Card className="shadow-sm border border-gray-100 bg-white">
                                                <CardHeader className="bg-blue-50 border-b border-gray-100">
                                                    <CardTitle className="flex items-center gap-2 text-base font-medium text-gray-800">
                                                        <User className="w-4 h-4 text-blue-600" />
                                                        Demographics
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="p-4 space-y-3">
                                                    <Field
                                                        label="First Name"
                                                        value={form.first_name}
                                                        editable={editing}
                                                        onChange={(v) => setForm({ ...form, first_name: v })}
                                                    />
                                                    <Field
                                                        label="Last Name"
                                                        value={form.last_name}
                                                        editable={editing}
                                                        onChange={(v) => setForm({ ...form, last_name: v })}
                                                    />
                                                    <Field
                                                        label="Gender"
                                                        value={form.gender}
                                                        editable={editing}
                                                        onChange={(v) => setForm({ ...form, gender: v })}
                                                        select
                                                        options={[
                                                            { value: 'Male', label: 'Male' },
                                                            { value: 'Female', label: 'Female' },
                                                        ]}
                                                    />
                                                    <Field
                                                        label="Date of Birth"
                                                        value={form.dob}
                                                        editable={editing}
                                                        onChange={(v) => setForm({ ...form, dob: v })}
                                                        date
                                                    />
                                                    <Field
                                                        label="Ethnicity"
                                                        value={form.ethnicity}
                                                        editable={editing}
                                                        onChange={(v) => setForm({ ...form, ethnicity: v })}
                                                    />
                                                    <Field
                                                        label="Weight (kg)"
                                                        value={form.weight}
                                                        editable={editing}
                                                        onChange={(v) => setForm({ ...form, weight: v })}
                                                        type="number"
                                                    />
                                                    <Field
                                                        label="Height (cm)"
                                                        value={form.height}
                                                        editable={editing}
                                                        onChange={(v) => setForm({ ...form, height: v })}
                                                        type="number"
                                                    />
                                                </CardContent>
                                            </Card>
                                            <div className="space-y-6">
                                                <Card className="shadow-sm border border-gray-100 bg-white">
                                                    <CardHeader className="bg-blue-50 border-b border-gray-100">
                                                        <CardTitle className="flex items-center gap-2 text-base font-medium text-gray-800">
                                                            <Phone className="w-4 h-4 text-blue-600" />
                                                            Contact Information
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="p-4 space-y-3">
                                                        <Field
                                                            label="Phone"
                                                            value={form.phone}
                                                            editable={editing}
                                                            onChange={(v) => setForm({ ...form, phone: v })}
                                                        />
                                                        <Field
                                                            label="Email"
                                                            value={form.email}
                                                            editable={editing}
                                                            onChange={(v) => setForm({ ...form, email: v })}
                                                            type="email"
                                                        />
                                                    </CardContent>
                                                </Card>
                                                <Card className="shadow-sm border border-gray-100 bg-white">
                                                    <CardHeader className="bg-blue-50 border-b border-gray-100">
                                                        <CardTitle className="flex items-center gap-2 text-base font-medium text-gray-800">
                                                            <Heart className="w-4 h-4 text-blue-600" />
                                                            Social & Insurance
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="p-4 space-y-3">
                                                        <Field
                                                            label="Occupation"
                                                            value={form.occupation}
                                                            editable={editing}
                                                            onChange={(v) => setForm({ ...form, occupation: v })}
                                                        />
                                                        <Field
                                                            label="Address"
                                                            value={form.address}
                                                            editable={editing}
                                                            onChange={(v) => setForm({ ...form, address: v })}
                                                        />
                                                        <Field
                                                            label="Marital Status"
                                                            value={form.marital_status}
                                                            editable={editing}
                                                            onChange={(v) => setForm({ ...form, marital_status: v })}
                                                        />
                                                        <Field
                                                            label="Insurance Provider"
                                                            value={form.insurance_provider}
                                                            editable={editing}
                                                            onChange={(v) => setForm({ ...form, insurance_provider: v })}
                                                        />
                                                    </CardContent>
                                                </Card>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="shadow-md border-0 bg-white mt-6">
                                    <CardHeader className="bg-blue-600 text-white rounded-t-lg">
                                        <CardTitle className="flex items-center justify-between text-lg font-semibold">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-5 h-5" />
                                                Appointments
                                            </div>
                                            <Button
                                                onClick={openCreate}
                                                className="bg-white text-blue-600 hover:bg-gray-100"
                                                size="sm"
                                            >
                                                + Add Appointment
                                            </Button>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        {apptLoading ? (
                                            <div className="flex flex-col items-center justify-center py-8">
                                                <div className="relative mb-4">
                                                    <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                                                    <Calendar className="absolute inset-0 m-auto w-4 h-4 text-blue-600" />
                                                </div>
                                                <p className="text-gray-500 text-sm">Loading appointments...</p>
                                            </div>
                                        ) : appointments.length > 0 ? (
                                            <div className="space-y-3">
                                                {appointments.map((a) => {
                                                    const dt = parseISO(a.datetime);
                                                    const status = isToday(dt)
                                                        ? 'Today'
                                                        : isFuture(dt)
                                                            ? 'Upcoming'
                                                            : 'Past';
                                                    const dateStr = format(dt, 'PPP p');
                                                    const badgeClasses = cn(
                                                        'px-2 py-1 rounded-full text-xs font-medium',
                                                        status === 'Today'
                                                            ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                                                            : status === 'Upcoming'
                                                            ? 'bg-green-100 text-green-700 border border-green-200'
                                                            : 'bg-gray-100 text-gray-700 border border-gray-200'
                                                    );
                                                    return (
                                                        <div
                                                            key={a.id}
                                                            className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                                                <div>
                                                                    <p className="font-medium text-gray-900 text-sm">{dateStr}</p>
                                                                    <p className="text-xs text-gray-600 capitalize">{a.type}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Badge className={badgeClasses}>{status}</Badge>
                                                                {status !== 'Past' && (
                                                                    <TooltipProvider>
                                                                        <div className="flex gap-1">
                                                                            <Tooltip>
                                                                                <TooltipTrigger asChild>
                                                                                    <Button
                                                                                        size="sm"
                                                                                        variant="ghost"
                                                                                        onClick={() => openEdit(a)}
                                                                                        className="h-8 w-8 p-0 hover:bg-blue-50"
                                                                                    >
                                                                                        <Pencil className="w-4 h-4 text-blue-600" />
                                                                                    </Button>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent side="left" className="bg-gray-800 text-white border-gray-700 text-xs">
                                                                                    Edit appointment
                                                                                </TooltipContent>
                                                                            </Tooltip>
                                                                            <Tooltip>
                                                                                <TooltipTrigger asChild>
                                                                                    <Button
                                                                                        size="sm"
                                                                                        variant="ghost"
                                                                                        onClick={() => {
                                                                                            setToDeleteId(a.id);
                                                                                            setDeleteDialogOpen(true);
                                                                                        }}
                                                                                        className="h-8 w-8 p-0 hover:bg-red-50"
                                                                                    >
                                                                                        <Trash2 className="w-4 h-4 text-red-600" />
                                                                                    </Button>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent side="left" className="bg-gray-800 text-white border-gray-700 text-xs">
                                                                                    Delete appointment
                                                                                </TooltipContent>
                                                                            </Tooltip>
                                                                        </div>
                                                                    </TooltipProvider>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-6 text-center">
                                                <Calendar className="w-8 h-8 text-gray-400 mb-2" />
                                                <p className="text-gray-500 text-sm">No appointments scheduled</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </>
                        ) : section === 'symptoms' ? (
                            <SymptomsSection
                                patientId={patient.id}
                                patientName={`${patient.demographics.first_name} ${patient.demographics.last_name}`}
                            />
                        ) : section === 'history' ? (
                            <PersonalHistorySection
                                patientId={patient.id}
                                patientName={`${patient.demographics.first_name} ${patient.demographics.last_name}`}
                            />
                        ) : section === 'vitals' ? (
                            <VitalSignsSection
                                patientId={patient.id}
                                patientName={`${patient.demographics.first_name} ${patient.demographics.last_name}`}
                            />
                        ) : section === 'tests' ? (
                            <TestsSection
                                patientId={patient.id}
                                patientName={`${patient.demographics.first_name} ${patient.demographics.last_name}`}
                            />
                        ) : section === 'prescriptions' ? (
                            <PrescriptionsSection
                                patientId={patient.id}
                                patientName={`${patient.demographics.first_name} ${patient.demographics.last_name}`}
                                doctorName={doctorName}
                            />
                        ) : section === 'summary' && summary ? (
                            <>
                                <div className="flex justify-end mb-4 space-x-2">
                                    <ExportPdfButton patient={patient} doctorName={doctorName} />
                                    <ShareMenuButton patient={patient} doctorName={doctorName} />
                                </div>
                                <Card className="shadow-md border-0 bg-white">
                                    <CardHeader className="bg-blue-600 text-white rounded-t-lg">
                                        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                                            <NotebookTabs className="w-5 h-5" />
                                            Summary for {form.first_name} {form.last_name}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        <SummaryPanel {...summary} predictions={predictions} vital_signs={patient.vital_signs} tests={patient.tests} />
                                    </CardContent>
                                </Card>
                            </>
                        ) : section === 'audit-log' ? (
                            <AuditLogSection
                                patientId={patient.id}
                                patientName={`${patient.demographics.first_name} ${patient.demographics.last_name}`}
                            />
                        ) : section === 'chat' ? (
                            <ChatSection
                                patientId={patient.id}
                                patientName={`${patient.demographics.first_name} ${patient.demographics.last_name}`}
                                patient={patient}
                                summary={summary}
                                vitalSigns={patient.vital_signs}
                                tests={patient.tests}
                                doctorName={doctorName}
                            />
                        ) : (
                            <Card className="shadow-md border-0 bg-white">
                                <CardContent className="p-12 text-center">
                                    <NotebookTabs className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                                    <p className="text-gray-500 text-sm">This section is coming soon...</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                    <Dialog open={modalOpen} onOpenChange={(open) => {
                        setModalOpen(open);
                        if (!open) {
                            resetAppointmentForm();
                        }
                    }}>
                        <DialogContent className="sm:max-w-md bg-white rounded-lg p-6 shadow-md">
                            <DialogHeader>
                                <DialogTitle className="text-lg font-semibold text-gray-800">
                                    {modalMode === 'create' ? 'Add Appointment' : 'Edit Appointment'}
                                </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="appt-date" className="text-sm font-medium text-gray-700">Date</Label>
                                    <Input
                                        id="appt-date"
                                        type="date"
                                        value={apptDate}
                                        onChange={(e) => setApptDate(e.target.value)}
                                        min={modalMode === 'create' ? today : undefined}
                                        className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="appt-time" className="text-sm font-medium text-gray-700">Time</Label>
                                    <Input
                                        id="appt-time"
                                        type="time"
                                        value={apptTime}
                                        onChange={(e) => setApptTime(e.target.value)}
                                        className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="appt-type" className="text-sm font-medium text-gray-700">Type</Label>
                                    <Input
                                        id="appt-type"
                                        placeholder="e.g., visit, phone, echo..."
                                        value={apptType}
                                        onChange={(e) => setApptType(e.target.value)}
                                        className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                            <DialogFooter className="flex justify-end gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setModalOpen(false)}
                                    className="border-gray-200 hover:bg-gray-50 text-gray-700"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSubmitAppt}
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                    disabled={!apptDate || !apptTime || !apptType || submittingAppt}
                                >
                                    {submittingAppt ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            {modalMode === 'create' ? 'Creating...' : 'Saving...'}
                                        </>
                                    ) : (
                                        modalMode === 'create' ? 'Create' : 'Save'
                                    )}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                        <AlertDialogPortal>
                            <AlertDialogOverlay className="bg-black/20 backdrop-blur-sm fixed inset-0 z-50" />
                            <AlertDialogContent className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-sm bg-white rounded-lg p-6 shadow-md">
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-lg font-semibold text-gray-800">
                                        Delete Appointment
                                    </AlertDialogTitle>
                                    <AlertDialogDescription className="text-gray-600 text-sm">
                                        Are you sure you want to delete this appointment?
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="mt-4 flex justify-end gap-2">
                                    <AlertDialogCancel className="border-gray-200 hover:bg-gray-50 text-gray-700">
                                        Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleDeleteAppt}
                                        className="bg-red-600 hover:bg-red-700 text-white"
                                        disabled={deletingAppt}
                                    >
                                        {deletingAppt ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Deleting...
                                            </>
                                        ) : (
                                            'Delete'
                                        )}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialogPortal>
                    </AlertDialog>
                </main>
            </div>
        </div>
    );
}