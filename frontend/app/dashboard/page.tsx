'use client';

import React from 'react';
import { TopBar } from '@/app/components/TopBar';
import { PatientSearch } from '@/app/components/PatientSearch';
import { AppointmentsList } from '@/app/components/AppointmentsList';
import { useAuth0 } from '@auth0/auth0-react';
import {
    Stethoscope,
    Calendar,
    Users,
    Activity,
    Heart,
    Shield,
    TrendingUp,
    Clock,
    BarChart3
} from 'lucide-react';

export default function Dashboard() {
    const { isAuthenticated, isLoading, user } = useAuth0();

    if (isLoading || !isAuthenticated) return null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-blue-50/40">
            {/* Professional Medical Header */}
            <div className="relative bg-gradient-to-r from-indigo-600 via-blue-700 to-cyan-800 overflow-hidden">
                {/* Subtle medical pattern background */}
                <div className="absolute inset-0 opacity-5">
                    <div className="absolute top-20 left-20 w-32 h-32 border border-white rounded-full"></div>
                    <div className="absolute top-40 right-32 w-24 h-24 border border-white rounded-full"></div>
                    <div className="absolute bottom-20 left-1/3 w-28 h-28 border border-white rounded-full"></div>
                    <div className="absolute top-60 right-1/4 w-20 h-20 border border-white rounded-full"></div>
                </div>

                <div className="relative max-w-7xl mx-auto px-6 py-16">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            {/* Professional medical icon */}
                            <div className="p-4 bg-white/15 backdrop-blur-sm rounded-xl border border-white/20">
                                <Stethoscope className="w-12 h-12 text-white" />
                            </div>

                            <div className="text-white">
                                <h1 className="text-4xl font-bold tracking-tight mb-2">
                                    Medical Dashboard
                                </h1>
                                <p className="text-indigo-100 text-lg mb-1">
                                    Comprehensive patient care and management system
                                </p>
                                <div className="text-white">
                                    <span className="text-xl font-semibold">Dr. {user?.name || 'Doctor'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Professional stats cards */}
                        <div className="hidden lg:flex gap-4">
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                                <div className="flex items-center gap-3">
                                    <Calendar className="w-6 h-6 text-yellow-300" />
                                    <div className="text-white">
                                        <div className="text-sm text-indigo-100">Today's Schedule</div>
                                        <div className="text-2xl font-bold">Active</div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                                <div className="flex items-center gap-3">
                                    <Users className="w-6 h-6 text-green-300" />
                                    <div className="text-white">
                                        <div className="text-sm text-indigo-100">Patient Care</div>
                                        <div className="text-xl font-bold">System</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Clean wave transition */}
                <div className="absolute bottom-0 left-0 w-full">
                    <svg viewBox="0 0 1200 120" fill="none" className="w-full h-12">
                        <path d="M0,60 C300,100 600,20 1200,60 L1200,120 L0,120 Z" fill="rgb(248 250 252)" />
                    </svg>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-6 -mt-8 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left: Patient Search */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl shadow-lg border-0 overflow-hidden">
                            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-100 p-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-100 rounded-lg">
                                        <Users className="w-5 h-5 text-indigo-600" />
                                    </div>
                                    <h2 className="text-xl font-semibold text-gray-800">Patient Management</h2>
                                </div>
                            </div>
                            <div className="p-6">
                                <PatientSearch />
                            </div>
                        </div>
                    </div>

                    {/* Right: Appointments */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl shadow-lg border-0 overflow-hidden">
                            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-100 p-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-100 rounded-lg">
                                        <Calendar className="w-5 h-5 text-indigo-600" />
                                    </div>
                                    <h2 className="text-xl font-semibold text-gray-800">Today's Schedule</h2>
                                </div>
                            </div>
                            <div className="p-6">
                                <AppointmentsList />
                            </div>
                        </div>
                    </div>
                </div>

                {/*/!* Quick Actions Section *!/*/}
                {/*<div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">*/}
                {/*    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">*/}
                {/*        <div className="flex items-center gap-3 mb-4">*/}
                {/*            <div className="p-2 bg-blue-100 rounded-lg">*/}
                {/*                <Heart className="w-5 h-5 text-blue-600" />*/}
                {/*            </div>*/}
                {/*            <h3 className="text-lg font-semibold text-gray-800">Patient Records</h3>*/}
                {/*        </div>*/}
                {/*        <p className="text-gray-600 text-sm">Access and manage comprehensive patient medical records</p>*/}
                {/*    </div>*/}

                {/*    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">*/}
                {/*        <div className="flex items-center gap-3 mb-4">*/}
                {/*            <div className="p-2 bg-green-100 rounded-lg">*/}
                {/*                <BarChart3 className="w-5 h-5 text-green-600" />*/}
                {/*            </div>*/}
                {/*            <h3 className="text-lg font-semibold text-gray-800">Analytics</h3>*/}
                {/*        </div>*/}
                {/*        <p className="text-gray-600 text-sm">View practice analytics and patient care metrics</p>*/}
                {/*    </div>*/}

                {/*    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">*/}
                {/*        <div className="flex items-center gap-3 mb-4">*/}
                {/*            <div className="p-2 bg-purple-100 rounded-lg">*/}
                {/*                <Shield className="w-5 h-5 text-purple-600" />*/}
                {/*            </div>*/}
                {/*            <h3 className="text-lg font-semibold text-gray-800">Security</h3>*/}
                {/*        </div>*/}
                {/*        <p className="text-gray-600 text-sm">HIPAA compliant secure medical data management</p>*/}
                {/*    </div>*/}
                {/*</div>*/}

                {/* Professional Medical Footer */}
                <div className="mt-12 text-center py-8">
                    <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
                        <Heart className="w-4 h-4 text-indigo-500" />
                        <span>Professional Medical Practice Management</span>
                        <span>•</span>
                        <span>Secure & HIPAA Compliant</span>
                        <Shield className="w-4 h-4 text-indigo-500" />
                    </div>
                </div>
            </div>
        </div>
    );
}