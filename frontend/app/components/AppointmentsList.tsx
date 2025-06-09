// File: app/components/AppointmentsList.tsx
'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
    ScrollArea,
    ScrollAreaViewport,
    ScrollAreaScrollbar,
    ScrollAreaThumb,
} from '@/components/ui/scroll-area';
import { Loader2, Calendar as CalendarIcon, Clock } from 'lucide-react';
import Link from 'next/link';

interface Appointment {
    id: number;
    patient_id: number;
    datetime: string; // ISO timestamp
    type: string;
    patient_first_name: string;
    patient_last_name: string;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001/api/v1';

export function AppointmentsList() {
    const { getAccessTokenSilently } = useAuth0();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const didFetchRef = useRef(false);

    useEffect(() => {
        if (didFetchRef.current) return;
        didFetchRef.current = true;

        (async () => {
            try {
                setLoading(true);
                const token = await getAccessTokenSilently();
                const res = await fetch(`${API}/appointments/today`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) throw new Error(await res.text());
                const data: Appointment[] = await res.json();
                setAppointments(data);
            } catch (err) {
                console.error('Failed to load today’s appointments', err);
            } finally {
                setLoading(false);
            }
        })();
    }, [getAccessTokenSilently]);

    return (
        <Card dc-test-id="appointments-card" className="shadow-sm">
            <CardHeader dc-test-id="appointments-card-header" className="flex items-center gap-2 py-2 px-4">
                <CalendarIcon dc-test-id="appointments-icon" className="h-5 w-5 text-primary" />
                <CardTitle dc-test-id="appointments-title" className="text-lg">
                    Today’s Appointments
                </CardTitle>
            </CardHeader>

            <CardContent dc-test-id="appointments-card-content" className="p-0">
                {loading ? (
                    <div dc-test-id="appointments-loading" className="flex justify-center py-10">
                        <Loader2 dc-test-id="appointments-loader" className="animate-spin text-primary size-8" />
                    </div>
                ) : (
                    <ScrollArea dc-test-id="appointments-scroll-area" className="h-[400px]">
                        <ScrollAreaViewport dc-test-id="appointments-scroll-viewport">
                            {appointments.length === 0 ? (
                                <p dc-test-id="no-appointments-message" className="p-4 text-gray-500 italic">
                                    No appointments today.
                                </p>
                            ) : (
                                <div dc-test-id="appointments-list" className="space-y-2 p-4">
                                    {appointments.map((a) => {
                                        const dt = new Date(a.datetime);
                                        const time = dt.toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        });
                                        return (
                                            <Link
                                                key={a.id}
                                                href={`/patient/${a.patient_id}`}
                                                dc-test-id="appointment-item"
                                                className="block bg-white rounded-lg shadow-sm hover:shadow-md transition p-4"
                                            >
                                                <div dc-test-id="appointment-content" className="flex justify-between items-center">
                                                    <div dc-test-id="appointment-info" className="flex flex-col">
                                                        <span dc-test-id="appointment-name" className="font-semibold text-gray-900">
                                                            {a.patient_first_name} {a.patient_last_name}
                                                        </span>
                                                        <span dc-test-id="appointment-time" className="flex items-center text-sm text-gray-500 mt-1">
                                                            <Clock dc-test-id="appointment-clock-icon" className="h-4 w-4 mr-1" />
                                                            {time}
                                                        </span>
                                                    </div>
                                                    <span dc-test-id="appointment-type" className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium uppercase">
                                                        {a.type}
                                                    </span>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </ScrollAreaViewport>
                        <ScrollAreaScrollbar dc-test-id="appointments-scrollbar" orientation="vertical">
                            <ScrollAreaThumb dc-test-id="appointments-scroll-thumb" />
                        </ScrollAreaScrollbar>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    );
}

export default AppointmentsList;
