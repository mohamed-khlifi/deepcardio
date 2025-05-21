'use client';

import { TopBar } from '@/app/components/TopBar';
import { PatientSearch } from '@/app/components/PatientSearch';
import { useAuth0 } from '@auth0/auth0-react';

/** FastAPI base */
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001/api/v1';

export default function Dashboard() {
    const { isAuthenticated, isLoading, user } = useAuth0();

    /* 1 – un-authed users are redirected by AuthProvider, so nothing here */
    if (isLoading || !isAuthenticated) return null;

    /* 2 – render search page full-width */
    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <TopBar doctorName={user?.name ?? ''} />

            {/* main content */}
            <main className="flex-1 flex items-center justify-center p-6">
                <PatientSearch />
            </main>
        </div>
    );
}
