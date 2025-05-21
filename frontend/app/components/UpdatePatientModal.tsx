'use client';

import { useState, useEffect } from 'react';
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
    AlertCircle,
    CheckCircle,
    Edit2,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001/api/v1';

interface Props {
    open: boolean;
    onClose: () => void;
    patient: any;
    onUpdate: (updated: any) => void;
}

export default function UpdatePatientModal({
                                               open,
                                               onClose,
                                               patient,
                                               onUpdate,
                                           }: Props) {
    const { getAccessTokenSilently } = useAuth0();
    const [form, setForm] = useState({
        phone: '',
        email: '',
        marital_status: '',
        occupation: '',
        insurance_provider: '',
        address: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);

    // whenever patient changes, prefill form
    useEffect(() => {
        if (!patient) return;
        setForm({
            phone: patient.contact_info.phone || '',
            email: patient.contact_info.email || '',
            marital_status: patient.social_info.marital_status || '',
            occupation: patient.social_info.occupation || '',
            insurance_provider: patient.social_info.insurance_provider || '',
            address: patient.social_info.address || '',
        });
        setError('');
        setDone(false);
    }, [patient]);

    const handleChange = (field: keyof typeof form, value: string) => {
        setForm({ ...form, [field]: value });
        setError('');
        setDone(false);
    };

    const handleSubmit = async () => {
        try {
            setLoading(true);
            const token = await getAccessTokenSilently();

            // build full body per backend contract
            const body = {
                first_name: patient.demographics.first_name,
                last_name: patient.demographics.last_name,
                gender: patient.demographics.gender,
                dob: patient.demographics.date_of_birth,
                ethnicity: patient.demographics.ethnicity || '',
                ...form,
            };

            const res = await fetch(`${API}/patients/${patient.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            });

            if (!res.ok) throw new Error(await res.text());

            // success: propagate up
            onUpdate({
                ...patient,
                contact_info: { phone: form.phone, email: form.email },
                social_info: {
                    marital_status: form.marital_status,
                    occupation: form.occupation,
                    insurance_provider: form.insurance_provider,
                    address: form.address,
                },
            });
            setDone(true);
        } catch (err) {
            console.error(err);
            setError('Could not update. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto rounded-2xl bg-white p-8 shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
                        <Edit2 className="size-6 text-primary" />
                        Edit Patient Info
                    </DialogTitle>
                </DialogHeader>

                <div className="grid gap-5 mt-6">
                    {/* phone & email */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <input
                            className="input-style"
                            placeholder="Phone"
                            value={form.phone}
                            onChange={(e) => handleChange('phone', e.target.value)}
                        />
                        <input
                            className="input-style"
                            placeholder="Email"
                            value={form.email}
                            onChange={(e) => handleChange('email', e.target.value)}
                        />
                    </div>

                    {/* social & insurance */}
                    <input
                        className="input-style"
                        placeholder="Marital status"
                        value={form.marital_status}
                        onChange={(e) => handleChange('marital_status', e.target.value)}
                    />
                    <input
                        className="input-style"
                        placeholder="Occupation"
                        value={form.occupation}
                        onChange={(e) => handleChange('occupation', e.target.value)}
                    />
                    <input
                        className="input-style"
                        placeholder="Insurance provider"
                        value={form.insurance_provider}
                        onChange={(e) =>
                            handleChange('insurance_provider', e.target.value)
                        }
                    />
                    <textarea
                        className="input-style h-20"
                        placeholder="Address"
                        value={form.address}
                        onChange={(e) => handleChange('address', e.target.value)}
                    />

                    {error && (
                        <p className="text-red-600 text-sm flex items-center gap-2">
                            <AlertCircle className="size-4" />
                            {error}
                        </p>
                    )}
                    {done && (
                        <p className="text-green-600 text-sm flex items-center gap-2">
                            <CheckCircle className="size-4" />
                            Updated successfully.
                        </p>
                    )}
                </div>

                <div className="mt-8 flex gap-4">
                    <Button
                        className="flex-1 gap-2"
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading && <Loader2 className="size-4 animate-spin" />}
                        Save Changes
                    </Button>
                    <Button
                        variant="outline"
                        className="flex-1"
                        onClick={onClose}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
