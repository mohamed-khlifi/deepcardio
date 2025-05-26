'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth0 } from '@auth0/auth0-react';
import { format, parseISO, isToday, isFuture } from 'date-fns';

import { TopBar } from '@/app/components/TopBar';
import { Sidebar, Section } from '@/app/components/Sidebar';
import { ExportPdfButton } from '@/app/components/ExportPdfButton';
import { SummaryPanel, SummaryBuckets } from '@/app/components/SummaryPanel';
import { SymptomsSection } from '@/app/components/SymptomsSection';
import { PersonalHistorySection } from '@/app/components/PersonalHistorySection';
import { VitalSignsSection } from '@/app/components/VitalSignsSection';
import { TestsSection } from '@/app/components/TestsSection';
import { RiskSummaryComponent } from "@/app/components/RiskSummaryComponent";

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
import { cn } from '@/lib/utils';

import { summarizeRisks, type RiskSummary } from '@/lib/llm';

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
    });

    setSummary({
        follow_up_actions:
            payload.follow_up_actions?.map((x: any) => ({
                id: x.id,
                label: x.action,
                extra: x.interval,
            })) ?? [],
        recommendations:
            payload.recommendations?.map((x: any) => ({
                id: x.id,
                label: x.recommendation,
            })) ?? [],
        referrals:
            payload.referrals?.map((x: any) => ({
                id: x.id,
                label: x.specialist,
                extra: x.reason,
            })) ?? [],
        life_style_advice:
            payload.life_style_advice?.map((x: any) => ({
                id: x.id,
                label: x.advice,
            })) ?? [],
        presumptive_diagnoses:
            payload.presumptive_diagnoses?.map((x: any) => ({
                id: x.id,
                label: x.diagnosis_name,
                extra: x.confidence_level,
            })) ?? [],
        tests_to_order:
            payload.tests_to_order?.map((x: any) => ({
                id: x.id,
                label: x.test_to_order,
            })) ?? [],
        // risk_summary will be injected after LLM runs
    } as SummaryBuckets);
}

/** Hook to fetch a patient by ID **/
const usePatientLoader = (
    getAccessTokenSilently: () => Promise<string>,
    router: any,
    id: string
) =>
    useCallback(async () => {
        try {
            const token = await getAccessTokenSilently();
            const res = await fetch(`${API}/patients/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error(await res.text());
            return await res.json();
        } catch (err) {
            console.error(err);
            router.replace('/dashboard');
            return null;
        }
    }, [getAccessTokenSilently, router, id]);

function InfoCard({
                      title,
                      icon,
                      children,
                  }: {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-xl border shadow-sm bg-white flex flex-col">
            <header className="flex items-center gap-2 border-b bg-gray-50/70 px-5 py-3 rounded-t-xl">
                <span className="text-primary">{icon}</span>
                <h3 className="text-sm font-medium text-primary">{title}</h3>
            </header>
            <div className="px-5 py-4 space-y-3 text-sm text-gray-700 grow">
                {children}
            </div>
        </div>
    );
}

function Field({
                   label,
                   value,
                   editable = false,
                   onChange,
                   type = 'text',
                   date,
               }: {
    label?: string;
    value?: string | null;
    editable?: boolean;
    onChange?: (v: string) => void;
    type?: 'text' | 'email';
    date?: boolean;
}) {
    return (
        <div className="flex items-center gap-2">
            {label && <span className="font-medium w-[120px]">{label}:</span>}
            {editable ? (
                <Input
                    className="w-full"
                    type={date ? 'date' : type}
                    value={value || ''}
                    onChange={(e) => onChange?.(e.target.value)}
                />
            ) : (
                <span className={value ? '' : 'italic text-gray-400'}>
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

    const [patient, setPatient] = useState<any>(null);
    const [form, setForm] = useState<any>(null);
    const [summary, setSummary] = useState<SummaryBuckets | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [section, setSection] = useState<Section>('home');

    // Appointments
    const [appointments, setAppointments] = useState<any[]>([]);
    const [apptLoading, setApptLoading] = useState(true);

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [currentAppt, setCurrentAppt] = useState<any>(null);
    const [apptDate, setApptDate] = useState('');
    const [apptTime, setApptTime] = useState('');
    const [apptType, setApptType] = useState('');

    // Delete dialog
    const [toDeleteId, setToDeleteId] = useState<number | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const loader = usePatientLoader(getAccessTokenSilently, router, id);

    // ── Initial load ──
    useEffect(() => {
        if (!id) return;
        (async () => {
            setLoading(true);
            const data = await loader();
            if (data) {
                hydrateFromPayload(data, { setPatient, setForm, setSummary });

                // ⭐ NEW: summarize risks with LLM
                if (data.risks?.length) {
                    summarizeRisks(data.risks).then((rs: RiskSummary | null) => {
                        if (rs) {
                            setSummary((prev) =>
                                prev ? { ...prev, risk_summary: rs } : prev
                            );
                        }
                    });
                }
            }
            setLoading(false);
        })();
    }, [id, loader]);

    // ── Re-fetch on Summary tab ──
    useEffect(() => {
        if (section !== 'summary') return;
        (async () => {
            const fresh = await loader();
            if (fresh) {
                hydrateFromPayload(fresh, { setPatient, setForm, setSummary });
                if (fresh.risks?.length) {
                    summarizeRisks(fresh.risks).then((rs) => {
                        if (rs) setSummary((prev) => prev ? { ...prev, risk_summary: rs } : prev);
                    });
                }
            }
        })();
    }, [section, loader]);

    // ── Fetch appointments ──
    useEffect(() => {
        if (!patient) return;
        (async () => {
            setApptLoading(true);
            const token = await getAccessTokenSilently();
            const res = await fetch(
                `${API}/appointments/by-patient/${patient.id}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.ok) setAppointments(await res.json());
            setApptLoading(false);
        })();
    }, [patient, getAccessTokenSilently]);

    // ── Appointment handlers ──
    const openCreate = () => {
        setModalMode('create');
        setCurrentAppt(null);
        setApptDate('');
        setApptTime('');
        setApptType('');
        setModalOpen(true);
    };

    const openEdit = (a: any) => {
        const dt = parseISO(a.datetime);
        setModalMode('edit');
        setCurrentAppt(a);
        setApptDate(format(dt, 'yyyy-MM-dd'));
        setApptTime(format(dt, 'HH:mm'));
        setApptType(a.type);
        setModalOpen(true);
    };

    const handleSubmitAppt = async () => {
        try {
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
            // refresh list
            const token2 = await getAccessTokenSilently();
            const r2 = await fetch(
                `${API}/appointments/by-patient/${patient.id}`,
                { headers: { Authorization: `Bearer ${token2}` } }
            );
            if (r2.ok) setAppointments(await r2.json());
        } catch (e) {
            console.error('Failed to save appointment', e);
        }
    };

    const handleDeleteAppt = async () => {
        if (toDeleteId === null) return;
        try {
            const token = await getAccessTokenSilently();
            const res = await fetch(`${API}/appointments/${toDeleteId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error(await res.text());
            setDeleteDialogOpen(false);
            setToDeleteId(null);
            // refresh
            const token2 = await getAccessTokenSilently();
            const r2 = await fetch(
                `${API}/appointments/by-patient/${patient.id}`,
                { headers: { Authorization: `Bearer ${token2}` } }
            );
            if (r2.ok) setAppointments(await r2.json());
        } catch (e) {
            console.error('Failed to delete appointment', e);
        }
    };

    // ── Save patient info ──
    const handleSave = async () => {
        if (!patient) return;
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
                }),
            });
            if (!res.ok) throw new Error(await res.text());
            setEditing(false);
        } catch (err) {
            console.error('Error saving patient:', err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex h-screen overflow-hidden">
            <Sidebar active={section} onChange={setSection} />
            <div className="flex-1 flex flex-col overflow-y-auto bg-gray-50">
                <TopBar doctorName={user?.name || ''} />

                <div className="px-6 pt-6 flex justify-between items-center">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 rounded-full border bg-white px-4 py-2 text-sm shadow-sm hover:bg-gray-50"
                    >
                        <ArrowLeft className="size-4 text-primary" />
                        <span className="hidden sm:inline">Back to Dashboard</span>
                    </Link>

                    {patient && section === 'home' && (
                        editing ? (
                            <div className="flex gap-2">
                                <Button onClick={handleSave} disabled={saving}>
                                    <Save className="size-4 mr-2" />
                                    {saving ? 'Saving...' : 'Save'}
                                </Button>
                                <Button variant="outline" onClick={() => setEditing(false)}>
                                    <X className="size-4 mr-2" /> Cancel
                                </Button>
                            </div>
                        ) : (
                            <Button onClick={() => setEditing(true)}>
                                <Pencil className="size-4 mr-2" /> Edit Info
                            </Button>
                        )
                    )}
                </div>

                <main className="p-10 flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="h-full flex items-center justify-center">
                            <Loader2 className="size-6 animate-spin text-primary" />
                        </div>
                    ) : section === 'home' && form ? (
                        <>
                            <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
                                <IdCard className="size-7 text-primary" />
                                {form.first_name} {form.last_name}
                            </h1>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* LEFT: Info cards */}
                                <div className="space-y-8">
                                    <InfoCard title="Demographics" icon={<User className="size-4" />}>
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
                                        />
                                        <Field
                                            label="DOB"
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
                                    </InfoCard>

                                    <InfoCard title="Contact" icon={<Phone className="size-4" />}>
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
                                        />
                                    </InfoCard>

                                    <InfoCard title="Social & Insurance" icon={<Heart className="size-4" />}>
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
                                    </InfoCard>
                                </div>

                                {/* RIGHT: Appointments */}
                                <div>
                                    <div className="rounded-xl border shadow-sm bg-white flex flex-col">
                                        <header className="flex items-center justify-between px-5 py-3 border-b bg-gray-50">
                                            <h3 className="text-sm font-medium text-primary">
                                                Appointments
                                            </h3>
                                            <Button variant="outline" size="sm" onClick={openCreate}>
                                                + Add
                                            </Button>
                                        </header>
                                        <div className="px-5 py-4 space-y-4 max-h-[500px] overflow-y-auto">
                                            {apptLoading ? (
                                                <div className="flex justify-center py-10">
                                                    <Loader2 className="animate-spin text-primary size-8" />
                                                </div>
                                            ) : appointments.length > 0 ? (
                                                appointments.map((a) => {
                                                    const dt = parseISO(a.datetime);
                                                    const status = isToday(dt)
                                                        ? 'today'
                                                        : isFuture(dt)
                                                            ? 'upcoming'
                                                            : 'overdue';
                                                    const dateStr = format(dt, 'PPP p');
                                                    const badgeClasses = cn(
                                                        'px-2 py-1 rounded-full text-xs',
                                                        status === 'today'
                                                            ? 'bg-yellow-100 text-yellow-800'
                                                            : status === 'upcoming'
                                                                ? 'bg-green-100 text-green-800'
                                                                : 'bg-red-100 text-red-800'
                                                    );

                                                    return (
                                                        <div
                                                            key={a.id}
                                                            className="group flex justify-between items-center p-4 hover:bg-gray-50 rounded-lg transition-colors"
                                                        >
                                                            <div>
                                                                <p className="font-medium">{dateStr}</p>
                                                                <p className="text-sm text-gray-500 capitalize">
                                                                    {a.type}
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className={badgeClasses}>{status}</span>
                                                                {status !== 'overdue' && (
                                                                    <>
                                                                        <Pencil
                                                                            className="size-4 text-gray-400 hover:text-primary cursor-pointer"
                                                                            onClick={() => openEdit(a)}
                                                                        />
                                                                        <AlertDialog
                                                                            open={deleteDialogOpen && toDeleteId === a.id}
                                                                            onOpenChange={setDeleteDialogOpen}
                                                                        >
                                                                            <AlertDialogTrigger asChild>
                                                                                <Trash2
                                                                                    className="size-4 text-gray-400 hover:text-red-600 cursor-pointer"
                                                                                    onClick={() => {
                                                                                        setToDeleteId(a.id);
                                                                                        setDeleteDialogOpen(true);
                                                                                    }}
                                                                                />
                                                                            </AlertDialogTrigger>

                                                                            <AlertDialogPortal>
                                                                                <AlertDialogOverlay className="bg-white/50 backdrop-blur-sm fixed inset-0 z-50" />
                                                                                <AlertDialogContent className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-sm bg-white rounded-2xl p-8 shadow-xl">
                                                                                    <AlertDialogHeader>
                                                                                        <AlertDialogTitle>
                                                                                            Delete Appointment
                                                                                        </AlertDialogTitle>
                                                                                        <AlertDialogDescription>
                                                                                            Are you sure you want to delete the
                                                                                            appointment scheduled on <strong>{dateStr}</strong>?
                                                                                        </AlertDialogDescription>
                                                                                    </AlertDialogHeader>
                                                                                    <AlertDialogFooter className="mt-4 flex justify-end gap-2">
                                                                                        <AlertDialogCancel>
                                                                                            Cancel
                                                                                        </AlertDialogCancel>
                                                                                        <AlertDialogAction onClick={handleDeleteAppt}>
                                                                                            Delete
                                                                                        </AlertDialogAction>
                                                                                    </AlertDialogFooter>
                                                                                </AlertDialogContent>
                                                                            </AlertDialogPortal>
                                                                        </AlertDialog>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <p className="italic text-gray-500">No appointments</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
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
                    ) : section === 'summary' && summary ? (
                        <>
                            <div className="flex justify-end mb-4">
                                <ExportPdfButton
                                    patient={patient}
                                    doctorName={user?.name || ''}
                                />
                            </div>
                            <h1 className="text-3xl font-bold mb-8">
                                Summary for <span className="text-primary">{form.first_name} {form.last_name}</span>
                            </h1>
                            <SummaryPanel {...summary} />
                        </>
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-400 italic">
                            This section is coming soon…
                        </div>
                    )}

                    {/* ── Add/Edit Appointment Dialog ── */}
                    <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                        <DialogContent className="max-h-[92vh] sm:max-w-md overflow-y-auto rounded-2xl bg-white p-8 shadow-xl">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-bold">
                                    {modalMode === 'create' ? 'Add Appointment' : 'Edit Appointment'}
                                </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-2">
                                <div className="space-y-1">
                                    <Label htmlFor="appt-date">Date</Label>
                                    <Input
                                        id="appt-date"
                                        type="date"
                                        value={apptDate}
                                        onChange={(e) => setApptDate(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="appt-time">Time</Label>
                                    <Input
                                        id="appt-time"
                                        type="time"
                                        value={apptTime}
                                        onChange={(e) => setApptTime(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="appt-type">Type</Label>
                                    <Input
                                        id="appt-type"
                                        placeholder="e.g. visit, phone, echo…"
                                        value={apptType}
                                        onChange={(e) => setApptType(e.target.value)}
                                    />
                                </div>
                            </div>
                            <DialogFooter className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setModalOpen(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={handleSubmitAppt}>
                                    {modalMode === 'create' ? 'Create' : 'Save'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </main>
            </div>
        </div>
    );
}
