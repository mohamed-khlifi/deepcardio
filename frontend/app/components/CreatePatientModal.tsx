'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth0 } from '@auth0/auth0-react';
import { Loader2, UserPlus, AlertCircle, CheckCircle } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001/api/v1';

interface Props {
    open: boolean;
    onClose: () => void;
}

/* ------------ form model ------------ */
type PatientForm = {
    first_name: string;
    last_name: string;
    gender: 'Male' | 'Female' | '';
    dob: string;
    ethnicity: string;
    phone: string;
    email: string;
    marital_status: string;
    occupation: string;
    insurance_provider: string;
    address: string;
};

/* ------------ component ------------ */
export function CreatePatientModal({ open, onClose }: Props) {
    const { getAccessTokenSilently } = useAuth0();

    const [form, setForm] = useState<PatientForm>({
        first_name: '',
        last_name: '',
        gender: '',
        dob: '',
        ethnicity: '',
        phone: '',
        email: '',
        marital_status: '',
        occupation: '',
        insurance_provider: '',
        address: '',
    });

    const [loading, setLoading] = useState(false);
    const [error, setError]   = useState('');
    const [done,  setDone]    = useState(false);

    /* ------ helpers ------ */
    const handleChange = (name: keyof PatientForm, value: string) => {
        setForm({ ...form, [name]: value });
        if (error) setError('');
        if (done) setDone(false);
    };

    const handleSubmit = async () => {
        /* minimal validation */
        if (!form.first_name || !form.last_name || !form.gender || !form.dob) {
            setError('First name, last name, gender, and date-of-birth are required.');
            return;
        }

        try {
            setLoading(true);
            const token = await getAccessTokenSilently();
            const res = await fetch(`${API}/patients`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(form),
            });

            if (!res.ok) throw new Error(await res.text());

            /* success */
            setDone(true);
            setForm({
                first_name: '',
                last_name: '',
                gender: '',
                dob: '',
                ethnicity: '',
                phone: '',
                email: '',
                marital_status: '',
                occupation: '',
                insurance_provider: '',
                address: '',
            });
        } catch (err) {
            console.error(err);
            setError('Unable to create patient. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    /* ------ UI ------ */
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto rounded-2xl bg-white p-8 shadow-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
                        <UserPlus className="size-6 text-primary" />
                        New Patient
                    </DialogTitle>
                </DialogHeader>

                <div className="grid gap-5 mt-6">
                    {/* names */}
                    <div className="grid sm:grid-cols-2 gap-4">
                        <input
                            className="input-style"
                            placeholder="First name *"
                            value={form.first_name}
                            onChange={(e) => handleChange('first_name', e.target.value)}
                        />
                        <input
                            className="input-style"
                            placeholder="Last name *"
                            value={form.last_name}
                            onChange={(e) => handleChange('last_name', e.target.value)}
                        />
                    </div>

                    {/* gender + dob */}
                    <div className="grid sm:grid-cols-2 gap-4">
                        <select
                            className="input-style"
                            value={form.gender}
                            onChange={(e) =>
                                handleChange('gender', e.target.value as PatientForm['gender'])
                            }
                        >
                            <option value="">Gender *</option>
                            <option>Male</option>
                            <option>Female</option>
                        </select>

                        <input
                            type="date"
                            className="input-style"
                            value={form.dob}
                            onChange={(e) => handleChange('dob', e.target.value)}
                        />
                    </div>

                    {/* contact */}
                    <div className="grid sm:grid-cols-2 gap-4">
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

                    {/* other fields */}
                    <input
                        className="input-style"
                        placeholder="Ethnicity"
                        value={form.ethnicity}
                        onChange={(e) => handleChange('ethnicity', e.target.value)}
                    />
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
                        onChange={(e) => handleChange('insurance_provider', e.target.value)}
                    />
                    <textarea
                        className="input-style h-20"
                        placeholder="Address"
                        value={form.address}
                        onChange={(e) => handleChange('address', e.target.value)}
                    />

                    {/* messages */}
                    {error && (
                        <p className="text-red-600 text-sm flex items-center gap-2">
                            <AlertCircle className="size-4" />
                            {error}
                        </p>
                    )}
                    {done && (
                        <p className="text-green-600 text-sm flex items-center gap-2">
                            <CheckCircle className="size-4" />
                            Patient created successfully.
                        </p>
                    )}
                </div>

                {/* footer */}
                <div className="mt-8 flex gap-4">
                    <Button
                        className="w-full gap-2"
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading && <Loader2 className="size-4 animate-spin" />}
                        Save Patient
                    </Button>

                    <Button
                        variant="outline"
                        className="w-full"
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

/* ----------------------------------------------------------------------------
   default export (so you can `import CreatePatientModal from '…'`)
---------------------------------------------------------------------------- */
export default CreatePatientModal;
