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
import { Badge } from '@/components/ui/badge';
import {
    Loader2,
    Calendar as CalendarIcon,
    Clock,
    User,
    AlertTriangle,
    CheckCircle,
    Activity
} from 'lucide-react';
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

const getAppointmentTypeColor = (type: string) => {
    const typeLower = type.toLowerCase();
    if (typeLower.includes('emergency') || typeLower.includes('urgent')) {
        return 'bg-red-100 text-red-700 border-red-200';
    }
    if (typeLower.includes('follow') || typeLower.includes('check')) {
        return 'bg-blue-100 text-blue-700 border-blue-200';
    }
    if (typeLower.includes('consultation') || typeLower.includes('consult')) {
        return 'bg-purple-100 text-purple-700 border-purple-200';
    }
    if (typeLower.includes('routine') || typeLower.includes('regular')) {
        return 'bg-green-100 text-green-700 border-green-200';
    }
    return 'bg-gray-100 text-gray-700 border-gray-200';
};

const getTimeStatus = (datetime: string) => {
    const appointmentTime = new Date(datetime);
    const now = new Date();
    const diffMinutes = Math.floor((appointmentTime.getTime() - now.getTime()) / (1000 * 60));

    if (diffMinutes < -30) {
        return { status: 'completed', color: 'text-green-600', icon: CheckCircle };
    } else if (diffMinutes < 0) {
        return { status: 'in-progress', color: 'text-blue-600', icon: Activity };
    } else if (diffMinutes <= 15) {
        return { status: 'upcoming', color: 'text-orange-600', icon: AlertTriangle };
    } else {
        return { status: 'scheduled', color: 'text-gray-600', icon: Clock };
    }
};

export function AppointmentsList() {
    const { getAccessTokenSilently } = useAuth0();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const didFetchRef = useRef(false);

    useEffect(() => {
        if (didFetchRef.current) return;
        didFetchRef.current = true;

        (async () => {
            try {
                setLoading(true);
                setError(null);
                const token = await getAccessTokenSilently();
                const res = await fetch(`${API}/appointments/today`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) throw new Error(await res.text());
                const data: Appointment[] = await res.json();
                setAppointments(data);
            } catch (err: any) {
                console.error("Failed to load today's appointments", err);
                setError(err.message || 'Failed to load appointments');
            } finally {
                setLoading(false);
            }
        })();
    }, [getAccessTokenSilently]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="relative">
                    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    <CalendarIcon className="absolute inset-0 m-auto w-5 h-5 text-indigo-600" />
                </div>
                <p className="text-gray-600 text-sm">Loading today's appointments...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <AlertTriangle className="w-12 h-12 text-red-500" />
                <p className="text-red-600 text-sm text-center">Failed to load appointments</p>
                <p className="text-gray-500 text-xs text-center">{error}</p>
            </div>
        );
    }

    if (appointments.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="p-3 bg-gray-100 rounded-lg">
                    <CalendarIcon className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 text-sm text-center">No appointments scheduled for today</p>
                <p className="text-gray-400 text-xs text-center">Enjoy your free day!</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header with stats */}
            <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                    {appointments.length} appointment{appointments.length !== 1 ? 's' : ''} today
                </div>
                <div className="text-xs text-gray-500">
                    {new Date().toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric'
                    })}
                </div>
            </div>

            {/* Appointments List */}
            <ScrollArea className="h-[400px]">
                <ScrollAreaViewport>
                    <div className="space-y-3">
                        {appointments.map((appointment) => {
                            const dt = new Date(appointment.datetime);
                            const time = dt.toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                            });
                            const timeStatus = getTimeStatus(appointment.datetime);
                            const StatusIcon = timeStatus.icon;

                            return (
                                <Link
                                    key={appointment.id}
                                    href={`/patient/${appointment.patient_id}`}
                                    className="block"
                                >
                                    <div className="bg-white rounded-lg shadow-sm hover:shadow-md border-2 border-gray-200 hover:border-indigo-300 transition-all p-4 group">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3 flex-1">
                                                <div className="p-2 bg-indigo-100 rounded-lg group-hover:bg-indigo-200 transition-colors">
                                                    <User className="w-5 h-5 text-indigo-600" />
                                                </div>

                                                <div className="flex-1">
                                                    <div className="font-semibold text-gray-900 group-hover:text-indigo-900 transition-colors">
                                                        {appointment.patient_first_name} {appointment.patient_last_name}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <div className={`flex items-center text-sm ${timeStatus.color}`}>
                                                            <StatusIcon className="w-3 h-3 mr-1" />
                                                            {time}
                                                        </div>
                                                        {timeStatus.status === 'upcoming' && (
                                                            <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200 text-xs px-2 py-0.5">
                                                                Soon
                                                            </Badge>
                                                        )}
                                                        {timeStatus.status === 'in-progress' && (
                                                            <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200 text-xs px-2 py-0.5">
                                                                Now
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <Badge
                                                    variant="secondary"
                                                    className={`${getAppointmentTypeColor(appointment.type)} text-xs px-3 py-1 font-medium`}
                                                >
                                                    {appointment.type}
                                                </Badge>

                                                <div className="w-2 h-2 rounded-full bg-indigo-300 group-hover:bg-indigo-500 transition-colors"></div>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </ScrollAreaViewport>
                <ScrollAreaScrollbar orientation="vertical" className="bg-gray-100">
                    <ScrollAreaThumb className="bg-gray-400 hover:bg-gray-500" />
                </ScrollAreaScrollbar>
            </ScrollArea>
        </div>
    );
}

export default AppointmentsList;