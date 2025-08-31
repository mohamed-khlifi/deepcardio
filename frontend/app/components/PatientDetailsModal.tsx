'use client';

import { memo, useMemo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth0 } from '@auth0/auth0-react';
import { usePatient } from '@/lib/api-cache';
import {
    Loader2,
    IdCard,
    User,
    Briefcase,
    Heart,
    Phone,
    Mail,
    MapPin,
    Calendar,
    AlertTriangle,
    Shield,
    Activity,
    FileText,
    Stethoscope,
    UserCheck,
    Building,
    Users
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001/api/v1';

interface Props {
    patientId: number | null;
    open: boolean;
    onClose: () => void;
}

interface Demographics {
    first_name: string;
    last_name: string;
    gender: string;
    date_of_birth: string;
    age: number;
    ethnicity?: string | null;
    weight: number;
    height: number;
}

interface ContactInfo {
    phone?: string | null;
    email?: string | null;
}

interface SocialInfo {
    marital_status?: string | null;
    occupation?: string | null;
    insurance_provider?: string | null;
    address?: string | null;
}

interface PatientBasicDetail {
    id: number;
    demographics: Demographics;
    contact_info: ContactInfo;
    social_info: SocialInfo;
}

export const PatientDetailsModal = memo(({ patientId, open, onClose }: Props) => {
    const router = useRouter();
    
    // Use SWR for caching - only fetch when modal is open and patientId exists
    const { data: patient, error, isLoading: loading } = usePatient(
        open && patientId ? patientId : null
    );

    const handleOpenRecord = () => {
        onClose();
        router.push(`/patient/${patient!.id}`);
    };

    // Memoized destructured patient data
    const { D, C, S } = useMemo(() => ({
        D: patient?.demographics,
        C: patient?.contact_info,
        S: patient?.social_info
    }), [patient]);

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-h-[95vh] max-w-6xl flex flex-col rounded-2xl bg-white p-0 shadow-2xl border-0">
                <DialogHeader className="sr-only">
                    <DialogTitle>Patient Details</DialogTitle>
                    <DialogDescription>
                        Complete patient information and medical history
                    </DialogDescription>
                </DialogHeader>

                {loading && (
                    <div className="flex flex-col items-center justify-center py-24 space-y-6">
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                            <User className="absolute inset-0 m-auto w-6 h-6 text-indigo-600" />
                        </div>
                        <div className="text-center">
                            <p className="text-gray-600 text-lg">Loading patient details...</p>
                            <p className="text-gray-500 text-sm mt-1">Accessing medical records</p>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="flex flex-col items-center justify-center py-24 space-y-6">
                        <AlertTriangle className="w-16 h-16 text-red-500" />
                        <div className="text-center">
                            <p className="text-red-600 text-lg font-medium">Unable to load patient details</p>
                            <p className="text-gray-500 text-sm mt-1">{error.message || 'Unknown error'}</p>
                        </div>
                        <Button variant="outline" onClick={onClose} className="mt-4">
                            Close
                        </Button>
                    </div>
                )}

                {patient && !error && (
                    <>
                        {/* Professional Header */}
                        <div className="relative bg-gradient-to-r from-indigo-600 via-blue-700 to-cyan-800 overflow-hidden flex-shrink-0">
                            {/* Subtle background pattern */}
                            <div className="absolute inset-0 opacity-10">
                                <div className="absolute top-4 left-8 w-16 h-16 border border-white rounded-full animate-pulse"></div>
                                <div className="absolute top-6 right-8 w-12 h-12 border border-white rounded-full"></div>
                                <div className="absolute bottom-4 left-1/3 w-10 h-10 bg-white rounded-full opacity-30"></div>
                            </div>
                            
                            <div className="relative px-6 py-4">
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <div className="p-3 bg-white/15 backdrop-blur-sm rounded-xl border border-white/20">
                                            <IdCard className="w-8 h-8 text-white" />
                                        </div>
                                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-ping"></div>
                                    </div>
                                    <div className="text-white">
                                        <h2 className="text-2xl font-bold tracking-tight">{D!.first_name} {D!.last_name}</h2>
                                        <p className="text-indigo-100 text-sm">Patient Medical Record</p>
                                        <div className="flex items-center gap-3 mt-2">
                                            <Badge className="bg-white/20 text-white border-white/30 text-xs">
                                                ID: {patient.id}
                                            </Badge>
                                            <Badge className="bg-white/20 text-white border-white/30 text-xs">
                                                {D!.age} years old
                                            </Badge>
                                            <Badge className="bg-white/20 text-white border-white/30 text-xs">
                                                {D!.gender}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto min-h-0">
                            <div className="px-6 py-6 space-y-6">
                                {/* Professional Multi-Column Layout */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    
                                    {/* Left Column - Demographics & Contact */}
                                    <div className="space-y-6">
                                        
                                        {/* Demographics Card */}
                                        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
                                            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-blue-100 rounded-lg">
                                                        <IdCard className="w-5 h-5 text-blue-600" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-lg font-semibold text-gray-900">Demographics</h3>
                                                        <p className="text-sm text-gray-600">Patient identification details</p>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="p-6 space-y-4">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            First Name
                                                        </label>
                                                        <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 font-medium">
                                                            {D!.first_name}
                                                        </div>
                                                    </div>
                                                    
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Last Name
                                                        </label>
                                                        <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 font-medium">
                                                            {D!.last_name}
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Gender
                                                        </label>
                                                        <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 font-medium">
                                                            {D!.gender}
                                                        </div>
                                                    </div>
                                                    
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Date of Birth
                                                        </label>
                                                        <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 font-medium">
                                                            {new Date(D!.date_of_birth).toLocaleDateString()} ({D!.age} yrs)
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Ethnicity
                                                    </label>
                                                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 font-medium">
                                                        {D!.ethnicity || 'Not specified'}
                                                    </div>
                                                </div>
                                                
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Weight
                                                        </label>
                                                        <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 font-medium">
                                                            {D!.weight} kg
                                                        </div>
                                                    </div>
                                                    
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Height
                                                        </label>
                                                        <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 font-medium">
                                                            {D!.height} cm
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Contact Information Card */}
                                        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
                                            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-green-100 rounded-lg">
                                                        <Phone className="w-5 h-5 text-green-600" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
                                                        <p className="text-sm text-gray-600">Patient contact details</p>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="p-6 space-y-4">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Phone
                                                        </label>
                                                        <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 font-medium">
                                                            {C!.phone || 'Not provided'}
                                                        </div>
                                                    </div>
                                                    
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Email
                                                        </label>
                                                        <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 font-medium">
                                                            {C!.email || 'Not provided'}
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Address
                                                    </label>
                                                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 font-medium">
                                                        {S!.address || 'Not provided'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column - Social & Insurance */}
                                    <div>
                                        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
                                            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-indigo-50">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-purple-100 rounded-lg">
                                                        <Building className="w-5 h-5 text-purple-600" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-lg font-semibold text-gray-900">Social & Insurance</h3>
                                                        <p className="text-sm text-gray-600">Additional patient information</p>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="p-6 space-y-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Marital Status
                                                    </label>
                                                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 font-medium">
                                                        {S!.marital_status || 'Not specified'}
                                                    </div>
                                                </div>
                                                
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Occupation
                                                    </label>
                                                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 font-medium">
                                                        {S!.occupation || 'Not specified'}
                                                    </div>
                                                </div>
                                                
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Insurance Provider
                                                    </label>
                                                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 font-medium">
                                                        {S!.insurance_provider || 'Not provided'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Add some bottom padding to ensure content doesn't get cut off */}
                                <div className="h-4"></div>
                            </div>
                        </div>

                        {/* Professional Action Bar - Always Visible Footer */}
                        <div className="bg-white border-t border-gray-200 px-6 py-4 flex-shrink-0 rounded-b-2xl">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                    <div className="flex items-center gap-1">
                                        <Shield className="w-3 h-3" />
                                        <span>HIPAA Compliant</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Stethoscope className="w-3 h-3" />
                                        <span>Medical Grade</span>
                                    </div>
                                </div>
                                
                                <div className="flex gap-3">
                                    <Button
                                        variant="outline"
                                        onClick={onClose}
                                        className="px-6 py-2 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg font-medium"
                                    >
                                        Close
                                    </Button>
                                    
                                    <Button
                                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-sm gap-2"
                                        onClick={handleOpenRecord}
                                    >
                                        <FileText className="w-4 h-4" />
                                        Open Complete Patient Record
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
});

PatientDetailsModal.displayName = 'PatientDetailsModal';