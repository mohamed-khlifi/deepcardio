'use client';

import { TopBar } from '@/app/components/TopBar';
import { PatientSearch } from '@/app/components/PatientSearch';
import { AppointmentsList } from '@/app/components/AppointmentsList';
import { useAuth0 } from '@auth0/auth0-react';

export default function Dashboard() {
    const { isAuthenticated, isLoading, user } = useAuth0();
    if (isLoading || !isAuthenticated) return null;

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <TopBar doctorName={user?.name ?? ''} />

            <main className="flex-1 p-6 overflow-y-auto">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left: patient search */}
                    <PatientSearch />

                    {/* Right: today’s appointments */}
                    <AppointmentsList />
                </div>
            </main>
        </div>
    );
}
