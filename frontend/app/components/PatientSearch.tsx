'use client';

import { useState, useCallback, useMemo, memo, lazy, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { PatientDetailsModal } from '@/app/components/PatientDetailsModal';
import { useAuth0 } from '@auth0/auth0-react';
import { useApiRequest } from '@/lib/api-cache';
import useSWR from 'swr';

// Lazy load the CreatePatientModal to improve initial load time
const CreatePatientModal = lazy(() => import('@/app/components/CreatePatientModal'));
import {
    Calendar,
    User,
    Info,
    ChevronRight,
    UserPlus,
    Loader2,
    Users
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001/api/v1';

interface PatientBasic {
    id: number;
    first_name: string;
    last_name: string;
    gender: string;
    dob: string;
}

export const PatientSearch = memo(() => {
    const { getAccessTokenSilently } = useAuth0();
    const { fetcher } = useApiRequest();

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [dob, setDob] = useState('');
    const [openModal, setOpenModal] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);

    // Build search key for SWR
    const searchKey = useMemo(() => {
        if (!firstName && !lastName && !dob) return null;
        
        const params = new URLSearchParams();
        if (firstName) params.append('first_name', firstName);
        if (lastName) params.append('last_name', lastName);
        if (dob) {
            // Format date as YYYY-MM-DD for backend
            const formattedDate = new Date(dob).toISOString().split('T')[0];
            params.append('dob', formattedDate);
        }
        
        return `/patients/search?${params.toString()}`;
    }, [firstName, lastName, dob]);

    // Use SWR for search with caching
    const { data: results, error, isLoading: loading } = useSWR(
        searchKey,
        fetcher,
        {
            revalidateOnFocus: false,
            dedupingInterval: 30000, // 30 seconds
        }
    );

    const noResult = useMemo(() => 
        !loading && searchKey && results && Array.isArray(results) && results.length === 0, 
        [loading, searchKey, results]
    );

    // Optimized input handlers with useCallback
    const handleFirstNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setFirstName(e.target.value);
    }, []);

    const handleLastNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setLastName(e.target.value);
    }, []);

    const handleDobChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setDob(e.target.value);
    }, []);

    return (
        <div className="space-y-6">
            {/* Search Form */}
            <div className="space-y-4">
                <div className="text-center mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Find or Add a Patient</h3>
                    <p className="text-gray-600 text-sm">Search existing patients or create new patient records</p>
                </div>

                <div className="flex gap-3">
                    <Input
                        type="text"
                        placeholder="First name"
                        className="flex-1 px-4 py-3 border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors shadow-sm"
                        value={firstName}
                        onChange={handleFirstNameChange}
                    />
                    <Input
                        type="text"
                        placeholder="Last name"
                        className="flex-1 px-4 py-3 border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors shadow-sm"
                        value={lastName}
                        onChange={handleLastNameChange}
                    />
                </div>

                <Input
                    type="date"
                    placeholder="Date of birth"
                    className="w-full px-4 py-3 border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors shadow-sm"
                    value={dob}
                    onChange={handleDobChange}
                />

                {error && (
                    <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
                        <Info className="w-4 h-4 shrink-0" />
                        <span>{error.message || 'Unable to fetch patients. Please try again.'}</span>
                    </div>
                )}
            </div>

            {/* Divider */}
            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-3 bg-white text-gray-500">or</span>
                </div>
            </div>

            {/* Create New Patient */}
            <div className="text-center space-y-3">
                <p className="text-gray-600 text-sm">Patient not found?</p>
                <Button
                    variant="outline"
                    className="w-full gap-2 border-gray-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 py-3 text-sm shadow-sm"
                    onClick={() => setOpenModal(true)}
                >
                    <UserPlus className="w-4 h-4" />
                    Create New Patient
                </Button>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="flex flex-col items-center justify-center py-6">
                    <div className="relative mb-4">
                        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                        <Loader2 className="absolute inset-0 m-auto w-4 h-4 text-blue-600" />
                    </div>
                    <p className="text-gray-600 text-sm">Searching patients...</p>
                </div>
            )}

            {/* No Results Message */}
            {noResult && !loading && (
                <div className="flex items-center gap-2 text-gray-600 text-sm bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <Info className="w-4 h-4 shrink-0" />
                    <span>No patients found matching your search criteria.</span>
                </div>
            )}

            {/* Search Results */}
            {results && Array.isArray(results) && results.length > 0 && !loading && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-blue-600">
                        <Users className="w-4 h-4" />
                        <h4 className="font-medium text-sm">Search Results ({results.length})</h4>
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {results.map((patient) => (
                            <div
                                key={patient.id}
                                onClick={() => setSelectedId(patient.id)}
                                className="cursor-pointer rounded-lg border border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-blue-300 transition-all p-4 flex items-center gap-4 group"
                            >
                                <div className="p-2 bg-blue-50 rounded-lg">
                                    <User className="w-5 h-5 text-blue-600" />
                                </div>

                                <div className="flex-1">
                                    <div className="font-semibold text-gray-900 text-sm">
                                        {patient.first_name} {patient.last_name}
                                    </div>
                                    <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(patient.dob).toLocaleDateString()}
                                    </div>
                                </div>

                                <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                    {patient.gender}
                                </Badge>

                                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Modals */}
            <Suspense fallback={<div>Loading...</div>}>
                <CreatePatientModal
                    open={openModal}
                    onClose={() => setOpenModal(false)}
                />
            </Suspense>

            <PatientDetailsModal
                open={selectedId !== null}
                patientId={selectedId}
                onClose={() => setSelectedId(null)}
            />
        </div>
    );
});

PatientSearch.displayName = 'PatientSearch';