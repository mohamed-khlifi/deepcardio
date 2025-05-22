// File: app/components/AppointmentsList.tsx
'use client';

import React, { useEffect, useState } from 'react';
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
    datetime: string;      // ISO timestamp
    type: string;
    // we’ll add these at runtime:
    patient_first_name?: string;
    patient_last_name?: string;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001/api/v1';

export function AppointmentsList() {
    const { getAccessTokenSilently } = useAuth0();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const token = await getAccessTokenSilently();

                // 1) fetch raw appointment list
                const apptRes = await fetch(`${API}/appointments`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!apptRes.ok) throw new Error(await apptRes.text());
                const raw: Appointment[] = await apptRes.json();

                // 2) enrich each with first/last name
                const enriched = await Promise.all(
                    raw.map(async (appt) => {
                        const pRes = await fetch(`${API}/patients/${appt.patient_id}`, {
                            headers: { Authorization: `Bearer ${token}` },
                        });
                        if (!pRes.ok) throw new Error(`Failed to load patient ${appt.patient_id}`);
                        const patient = await pRes.json();
                        return {
                            ...appt,
                            patient_first_name: patient.demographics.first_name,
                            patient_last_name: patient.demographics.last_name,
                        };
                    })
                );

                // 3) filter to today
                const today = new Date().toISOString().split('T')[0];
                setAppointments(
                    enriched.filter((a) => a.datetime.split('T')[0] === today)
                );
            } catch (err) {
                console.error('Failed to load appointments', err);
            } finally {
                setLoading(false);
            }
        })();
    }, [getAccessTokenSilently]);

    return (
        <Card className="shadow-sm">
            <CardHeader className="flex items-center gap-2 py-2 px-4">
                <CalendarIcon className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Today’s Appointments</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                {loading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="animate-spin text-primary size-8" />
                    </div>
                ) : (
                    <ScrollArea className="h-[400px]">
                        <ScrollAreaViewport>
                            {appointments.length === 0 ? (
                                <p className="p-4 text-gray-500 italic">No appointments today.</p>
                            ) : (
                                <div className="space-y-2 p-4">
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
                                                className="block bg-white rounded-lg shadow-sm hover:shadow-md transition p-4"
                                            >
                                                <div className="flex justify-between items-center">
                                                    <div className="flex flex-col">
                                                        {/* Patient Name */}
                                                        <span className="font-semibold text-gray-900">
                              {a.patient_first_name} {a.patient_last_name}
                            </span>
                                                        {/* Appointment Time */}
                                                        <span className="flex items-center text-sm text-gray-500 mt-1">
                              <Clock className="h-4 w-4 mr-1" />
                                                            {time}
                            </span>
                                                    </div>
                                                    {/* Type Pill */}
                                                    <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium uppercase">
                            {a.type}
                          </span>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </ScrollAreaViewport>
                        <ScrollAreaScrollbar orientation="vertical">
                            <ScrollAreaThumb />
                        </ScrollAreaScrollbar>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    );
}
