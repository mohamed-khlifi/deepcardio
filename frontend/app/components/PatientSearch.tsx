'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import  CreatePatientModal  from '@/app/components/CreatePatientModal';
import { PatientDetailsModal } from '@/app/components/PatientDetailsModal';
import { useAuth0 } from '@auth0/auth0-react';
import {
    Search,
    Calendar,
    User,
    AlertCircle,
    Info,
    ChevronRight,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001/api/v1';

interface PatientBasic {
    id: number;
    first_name: string;
    last_name: string;
    gender: string;
    dob: string;
}

export function PatientSearch() {
    const { getAccessTokenSilently } = useAuth0();

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [dob, setDob] = useState('');

    const [results, setResults] = useState<PatientBasic[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [noResult, setNoResult] = useState(false);

    const [openModal, setOpenModal] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null); // ← NEW

    /* ------------------------------------------------------------------ */
    const handleSearch = async () => {
        if (!firstName && !lastName && !dob) {
            setError('Please enter at least one filter to search.');
            setResults([]);
            setNoResult(false);
            return;
        }

        try {
            setLoading(true);
            setError('');
            setNoResult(false);
            setResults([]);

            const token = await getAccessTokenSilently();
            const params = new URLSearchParams();
            if (firstName) params.append('first_name', firstName);
            if (lastName) params.append('last_name', lastName);
            if (dob) params.append('dob', dob);

            const res = await fetch(`${API}/patients/search?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) throw new Error(await res.text());
            const data: PatientBasic[] = await res.json();

            if (data.length === 0) setNoResult(true);
            else setResults(data);
        } catch (err) {
            console.error(err);
            setError('Unable to fetch patients. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const clearMessages = () => {
        if (error) setError('');
        if (noResult) setNoResult(false);
    };

    /* ------------------------------------------------------------------ */
    return (
        <>
            <div className="max-w-xl mx-auto animate-fade-in space-y-8">
                <h1 className="text-3xl font-bold text-center">Find or Add a Patient</h1>

                {/* -------- search form -------- */}
                <div className="space-y-4">
                    <div className="flex gap-4">
                        <input
                            type="text"
                            placeholder="First name"
                            className="input-style flex-1"
                            value={firstName}
                            onChange={(e) => {
                                setFirstName(e.target.value);
                                clearMessages();
                            }}
                        />
                        <input
                            type="text"
                            placeholder="Last name"
                            className="input-style flex-1"
                            value={lastName}
                            onChange={(e) => {
                                setLastName(e.target.value);
                                clearMessages();
                            }}
                        />
                    </div>

                    <input
                        type="date"
                        placeholder="Date of birth"
                        className="input-style w-full"
                        value={dob}
                        onChange={(e) => {
                            setDob(e.target.value);
                            clearMessages();
                        }}
                    />

                    <div className="space-y-2">
                        <Button
                            className="w-full gap-2"
                            onClick={handleSearch}
                            disabled={loading}
                        >
                            <Search className="size-4" />
                            {loading ? 'Searching…' : 'Search Patient'}
                        </Button>

                        {error && (
                            <p className="text-red-600 text-sm flex items-center gap-2 animate-fade-in">
                                <AlertCircle className="size-4" /> {error}
                            </p>
                        )}
                    </div>
                </div>

                <hr className="border-gray-200" />

                {/* -------- create button -------- */}
                <div className="text-center">
                    <p className="mb-4 text-gray-600">Can’t find the patient?</p>
                    <Button variant="outline" onClick={() => setOpenModal(true)}>
                        ➕ Create New Patient
                    </Button>
                </div>

                {/* -------- no-result info -------- */}
                {noResult && !loading && (
                    <div className="flex items-center gap-2 text-gray-600 text-sm mt-6 animate-fade-in">
                        <Info className="size-4" />
                        No patients found for those filters.
                    </div>
                )}

                {/* -------- search results -------- */}
                {results.length > 0 && (
                    <div className="mt-10 space-y-4">
                        <h2 className="text-xl font-semibold">Results</h2>

                        <ul className="space-y-3">
                            {results.map((p) => (
                                <li
                                    key={p.id}
                                    onClick={() => {
                                        setSelectedId(p.id);
                                    }}
                                    className="cursor-pointer rounded-lg border bg-white shadow-sm hover:shadow-md transition-all p-4 flex items-center gap-4 group"
                                >
                                    <User className="size-8 text-primary shrink-0" />
                                    <div className="flex-1">
                                        <div className="font-medium">
                                            {p.first_name} {p.last_name}
                                        </div>
                                        <div className="text-sm text-gray-500 flex items-center gap-2">
                                            <Calendar className="size-3" />
                                            {new Date(p.dob).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <span className="rounded-full bg-primary/10 text-primary px-3 py-1 text-xs">
                    {p.gender}
                  </span>
                                    <ChevronRight className="size-4 text-gray-400 group-hover:text-primary transition-colors" />
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* modal components */}
            <CreatePatientModal
                open={openModal}
                onClose={() => setOpenModal(false)}
            />

            <PatientDetailsModal
                open={selectedId !== null}
                patientId={selectedId}
                onClose={() => setSelectedId(null)}
            />
        </>
    );
}
