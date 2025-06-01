'use client';

import { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth0 } from '@auth0/auth0-react';
import {
    Loader2,
    IdCard,
    User,
    Briefcase,
    Heart,
    Phone,
    Mail,
    MapPin,
    Calendar,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001/api/v1';

/* ───────── types ───────── */
interface Props {
    patientId: number | null;
    open: boolean;
    onClose: () => void;
}

// Match exactly the “basic” PatientResponse fields:
interface Demographics {
    first_name: string;
    last_name: string;
    gender: string;
    date_of_birth: string; // ISO date string
    age: number;
    ethnicity?: string | null;
}

interface ContactInfo {
    phone?: string | null;
    email?: string | null;
}

interface SocialInfo {
    marital_status?: string | null;
    occupation?: string | null;
    insurance_provider?: string | null;
    address?: string | null;
}

interface PatientBasicDetail {
    id: number;
    demographics: Demographics;
    contact_info: ContactInfo;
    social_info: SocialInfo;
}

/* ───────── modal ───────── */
export function PatientDetailsModal({ patientId, open, onClose }: Props) {
    const router = useRouter();
    const { getAccessTokenSilently } = useAuth0();
    const [patient, setPatient] = useState<PatientBasicDetail | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open || patientId == null) return;

        (async () => {
            try {
                setLoading(true);
                setPatient(null);

                const token = await getAccessTokenSilently();
                // ▶ Fetch using the “+?basic=true” flag:
                const res = await fetch(
                    `${API}/patients/${patientId}?basic=true`,
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    }
                );
                if (!res.ok) throw new Error(await res.text());
                const data: PatientBasicDetail = await res.json();
                setPatient(data);
            } catch (err) {
                console.error('Failed to load basic patient data:', err);
            } finally {
                setLoading(false);
            }
        })();
    }, [open, patientId, getAccessTokenSilently]);

    const D = patient?.demographics;
    const C = patient?.contact_info;
    const S = patient?.social_info;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto rounded-2xl bg-white/95 backdrop-blur-md p-0 shadow-2xl">
                <DialogHeader className="sr-only">
                    <DialogTitle>Patient Details</DialogTitle>
                </DialogHeader>

                {loading && (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <Loader2 className="size-7 animate-spin text-primary" />
                        <p className="text-gray-600 text-sm">Loading patient…</p>
                    </div>
                )}

                {patient && (
                    <>
                        {/* header */}
                        <div className="flex items-center gap-3 border-b px-10 py-6">
                            <IdCard className="size-6 text-primary" />
                            <h2 className="text-2xl font-semibold text-gray-800">
                                {D!.first_name} {D!.last_name}
                            </h2>
                        </div>

                        {/* info */}
                        <div className="px-10 py-10 space-y-10">
                            <section className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                                <InfoCard title="Demographics" icon={<User className="size-4" />}>
                                    <Field label="Gender" value={D!.gender} />
                                    <Field
                                        label="DOB"
                                        value={`${new Date(D!.date_of_birth).toLocaleDateString()} (${D!.age} yrs)`}
                                    />
                                    <Field label="Ethnicity" value={D!.ethnicity} placeholder="—" />
                                </InfoCard>

                                <InfoCard title="Contact" icon={<Phone className="size-4" />}>
                                    <Field label="Phone" value={C!.phone} placeholder="—" />
                                    <Field label="Email" value={C!.email} placeholder="—" />
                                </InfoCard>

                                <InfoCard title="Social & Insurance" icon={<Heart className="size-4" />}>
                                    <Field label="Marital status" value={S!.marital_status} placeholder="—" />
                                    <Field label="Occupation" value={S!.occupation} placeholder="—" />
                                    <Field label="Insurance" value={S!.insurance_provider} placeholder="—" />
                                    <Field label="Address" value={S!.address} placeholder="—" />
                                </InfoCard>
                            </section>

                            {/* actions */}
                            <div className="flex justify-center gap-4 mt-10">
                                <Button
                                    className="w-48"
                                    onClick={() => {
                                        onClose();
                                        router.push(`/patient/${patient!.id}`);
                                    }}
                                >
                                    Open Patient Record
                                </Button>
                                <Button variant="outline" className="w-48" onClick={onClose}>
                                    Close
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}

/* helper comps */
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
        <div className="rounded-xl border shadow-sm bg-white">
            <header className="flex items-center gap-2 border-b bg-gray-50/70 px-5 py-3 rounded-t-xl">
                <span className="text-primary">{icon}</span>
                <h3 className="text-sm font-medium text-primary">{title}</h3>
            </header>
            <div className="px-5 py-4 text-sm text-gray-700 space-y-1.5">{children}</div>
        </div>
    );
}

function Field({
                   label,
                   value,
                   placeholder = '—',
               }: {
    label?: string;
    value?: string | null;
    placeholder?: string;
}) {
    return (
        <p className="flex gap-1.5">
            {label && <span className="font-medium">{label}:</span>}
            <span className={value ? '' : 'italic text-gray-400'}>{value || placeholder}</span>
        </p>
    );
}
