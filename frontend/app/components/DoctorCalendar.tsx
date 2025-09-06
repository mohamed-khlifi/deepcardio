'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    Clock,
    User,
    AlertTriangle,
    CheckCircle,
    Activity,
    Loader2,
    Heart,
    Stethoscope,
    Shield
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

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
        return {
            bg: 'bg-red-500',
            bgLight: 'bg-red-50',
            text: 'text-red-700',
            border: 'border-red-200',
            ring: 'ring-red-100'
        };
    }
    if (typeLower.includes('follow') || typeLower.includes('check')) {
        return {
            bg: 'bg-blue-500',
            bgLight: 'bg-blue-50',
            text: 'text-blue-700',
            border: 'border-blue-200',
            ring: 'ring-blue-100'
        };
    }
    if (typeLower.includes('consultation') || typeLower.includes('consult')) {
        return {
            bg: 'bg-purple-500',
            bgLight: 'bg-purple-50',
            text: 'text-purple-700',
            border: 'border-purple-200',
            ring: 'ring-purple-100'
        };
    }
    if (typeLower.includes('routine') || typeLower.includes('regular')) {
        return {
            bg: 'bg-green-500',
            bgLight: 'bg-green-50',
            text: 'text-green-700',
            border: 'border-green-200',
            ring: 'ring-green-100'
        };
    }
    return {
        bg: 'bg-gray-500',
        bgLight: 'bg-gray-50',
        text: 'text-gray-700',
        border: 'border-gray-200',
        ring: 'ring-gray-100'
    };
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

const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 7; hour < 20; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
            const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            slots.push(time);
        }
    }
    return slots;
};

const getWeekDates = (startDate: Date) => {
    const dates = [];
    const start = new Date(startDate);
    start.setDate(start.getDate() - start.getDay()); // Start from Sunday
    
    for (let i = 0; i < 7; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        dates.push(date);
    }
    return dates;
};

const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
    });
};

const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
};

const getAppointmentsForTimeSlot = (appointments: Appointment[], date: Date, timeSlot: string) => {
    const [hour, minute] = timeSlot.split(':').map(Number);
    const slotStart = new Date(date);
    slotStart.setHours(hour, minute, 0, 0);
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotEnd.getMinutes() + 30);

    return appointments.filter(appointment => {
        const appointmentTime = new Date(appointment.datetime);
        return appointmentTime >= slotStart && appointmentTime < slotEnd;
    });
};

export function DoctorCalendar() {
    const { getAccessTokenSilently } = useAuth0();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentWeekStart, setCurrentWeekStart] = useState(new Date());

    const timeSlots = useMemo(() => generateTimeSlots(), []);
    const weekDates = useMemo(() => getWeekDates(currentWeekStart), [currentWeekStart]);

    useEffect(() => {
        const fetchAppointments = async () => {
            try {
                setLoading(true);
                setError(null);
                const token = await getAccessTokenSilently();
                
                const startDate = weekDates[0].toISOString().split('T')[0];
                const endDate = weekDates[6].toISOString().split('T')[0];
                
                const res = await fetch(`${API}/appointments/range?start_date=${startDate}&end_date=${endDate}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                
                if (!res.ok) throw new Error(await res.text());
                const data: Appointment[] = await res.json();
                setAppointments(data);
            } catch (err: any) {
                console.error("Failed to load appointments", err);
                setError(err.message || 'Failed to load appointments');
            } finally {
                setLoading(false);
            }
        };

        fetchAppointments();
    }, [getAccessTokenSilently, weekDates]);

    const navigateWeek = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentWeekStart);
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        setCurrentWeekStart(newDate);
    };

    const goToToday = () => {
        setCurrentWeekStart(new Date());
    };

    if (loading) {
        return (
            <Card className="shadow-lg border-0 bg-white">
                <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-100">
                    <CardTitle className="flex items-center gap-3 text-xl font-semibold text-gray-800">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                            <CalendarIcon className="w-5 h-5 text-indigo-600" />
                        </div>
                        Weekly Schedule
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="relative mb-6">
                            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                            <CalendarIcon className="absolute inset-0 m-auto w-6 h-6 text-indigo-600" />
                        </div>
                        <p className="text-gray-600 text-lg">Loading weekly schedule...</p>
                        <p className="text-gray-500 text-sm mt-2">Fetching appointments</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="shadow-lg border-0 bg-white">
                <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-100">
                    <CardTitle className="flex items-center gap-3 text-xl font-semibold text-gray-800">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                            <CalendarIcon className="w-5 h-5 text-indigo-600" />
                        </div>
                        Weekly Schedule
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                    <div className="flex flex-col items-center justify-center py-20">
                        <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
                        <p className="text-red-600 text-lg font-medium">Failed to load schedule</p>
                        <p className="text-gray-500 text-sm mt-1">{error}</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="shadow-lg border-0 bg-white">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-100">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-3 text-xl font-semibold text-gray-800">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                            <CalendarIcon className="w-5 h-5 text-indigo-600" />
                        </div>
                        Weekly Schedule
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-200 px-3 py-1">
                            {appointments.length} appointments
                        </Badge>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Shield className="w-4 h-4 text-indigo-500" />
                            <span>HIPAA Compliant</span>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {/* Calendar Navigation */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigateWeek('prev')}
                            className="border-gray-200 hover:bg-gray-50"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigateWeek('next')}
                            className="border-gray-200 hover:bg-gray-50"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={goToToday}
                            className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                        >
                            Today
                        </Button>
                    </div>
                    <div className="text-lg font-semibold text-gray-800">
                        {weekDates[0].toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </div>
                </div>

                {/* Calendar Grid */}
                <div className="overflow-x-auto">
                    <div className="min-w-[900px]">
                        {/* Header Row */}
                        <div className="grid grid-cols-8 border-b border-gray-200">
                            <div className="p-4 text-sm font-medium text-gray-500 bg-gray-50">
                                Time
                            </div>
                            {weekDates.map((date, index) => (
                                <div
                                    key={index}
                                    className={cn(
                                        "p-4 text-center border-l border-gray-200",
                                        isToday(date) ? "bg-indigo-50" : "bg-gray-50"
                                    )}
                                >
                                    <div className={cn(
                                        "text-sm font-medium",
                                        isToday(date) ? "text-indigo-700" : "text-gray-700"
                                    )}>
                                        {formatDate(date)}
                                    </div>
                                    <div className={cn(
                                        "text-xs mt-1",
                                        isToday(date) ? "text-indigo-600" : "text-gray-500"
                                    )}>
                                        {date.getDate()}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Time Slots */}
                        <div className="max-h-[700px] overflow-y-auto">
                            {timeSlots.map((timeSlot, slotIndex) => (
                                <div key={timeSlot} className="grid grid-cols-8 border-b border-gray-100">
                                    {/* Time Column */}
                                    <div className="p-3 text-sm text-gray-500 bg-gray-50 border-r border-gray-200">
                                        {timeSlot}
                                    </div>
                                    
                                    {/* Day Columns */}
                                    {weekDates.map((date, dayIndex) => {
                                        const slotAppointments = getAppointmentsForTimeSlot(appointments, date, timeSlot);
                                        const isCurrentSlot = isToday(date) && 
                                            new Date().getHours() === parseInt(timeSlot.split(':')[0]) &&
                                            Math.abs(new Date().getMinutes() - parseInt(timeSlot.split(':')[1])) <= 15;

                                        return (
                                            <div
                                                key={dayIndex}
                                                className={cn(
                                                    "min-h-[70px] p-2 border-l border-gray-200 relative",
                                                    isCurrentSlot ? "bg-indigo-50" : "hover:bg-gray-50"
                                                )}
                                            >
                                                {slotAppointments.map((appointment, apptIndex) => {
                                                    const colors = getAppointmentTypeColor(appointment.type);
                                                    const timeStatus = getTimeStatus(appointment.datetime);
                                                    const StatusIcon = timeStatus.icon;

                                                    return (
                                                        <Link
                                                            key={appointment.id}
                                                            href={`/patient/${appointment.patient_id}`}
                                                            className="block"
                                                        >
                                                            <div
                                                                className={cn(
                                                                    "rounded-lg p-2 mb-1 cursor-pointer transition-all duration-200 hover:shadow-md",
                                                                    colors.bgLight,
                                                                    colors.border,
                                                                    colors.text,
                                                                    "border hover:scale-105"
                                                                )}
                                                            >
                                                                <div className="flex items-center gap-1 mb-1">
                                                                    <StatusIcon className="w-3 h-3" />
                                                                    <span className="text-xs font-medium">
                                                                        {appointment.patient_first_name} {appointment.patient_last_name}
                                                                    </span>
                                                                </div>
                                                                <div className="text-xs opacity-75">
                                                                    {appointment.type}
                                                                </div>
                                                            </div>
                                                        </Link>
                                                    );
                                                })}
                                                
                                                {/* Empty slot indicator */}
                                                {slotAppointments.length === 0 && (
                                                    <div className="flex items-center justify-center h-full text-gray-300 text-xs opacity-50">
                                                        Available
                                                    </div>
                                                )}
                                                
                                                {/* Current time indicator */}
                                                {isCurrentSlot && (
                                                    <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-indigo-500 to-blue-500 z-10 shadow-lg"></div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Legend */}
                <div className="p-6 border-t border-gray-100 bg-gray-50">
                    <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-500 rounded"></div>
                            <span className="text-gray-600">Emergency/Urgent</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-blue-500 rounded"></div>
                            <span className="text-gray-600">Follow-up/Check</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-purple-500 rounded"></div>
                            <span className="text-gray-600">Consultation</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded"></div>
                            <span className="text-gray-600">Routine/Regular</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default DoctorCalendar;
