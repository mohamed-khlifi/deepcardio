'use client';
import React, { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import {
    FileText,
    Loader2,
    Plus,
    Edit3,
    Trash2,
    Activity,
    Calendar,
    Filter,
    ArrowRight,
    Clock,
    Heart,
    Stethoscope,
    Shield,
    TrendingUp
} from 'lucide-react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';

interface AuditLog {
    id: number;
    patient_id: number;
    doctor_id: number;
    action_type: string;
    entity_type: string;
    action_details: Record<string, any>;
    description: string;
    created_at: string;
}

interface AuditLogSectionProps {
    patientId: string;
    patientName: string;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001/api/v1';

const getActionIcon = (actionType: string) => {
    switch (actionType) {
        case 'CREATE':
            return <Plus className="w-4 h-4" />;
        case 'UPDATE':
            return <Edit3 className="w-4 h-4" />;
        case 'DELETE':
            return <Trash2 className="w-4 h-4" />;
        default:
            return <Activity className="w-4 h-4" />;
    }
};

const getActionColor = (actionType: string) => {
    switch (actionType) {
        case 'CREATE':
            return {
                bg: 'bg-emerald-600',
                ring: 'ring-emerald-100',
                badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                border: 'border-l-emerald-500'
            };
        case 'UPDATE':
            return {
                bg: 'bg-blue-600',
                ring: 'ring-blue-100',
                badge: 'bg-blue-50 text-blue-700 border-blue-200',
                border: 'border-l-blue-500'
            };
        case 'DELETE':
            return {
                bg: 'bg-red-600',
                ring: 'ring-red-100',
                badge: 'bg-red-50 text-red-700 border-red-200',
                border: 'border-l-red-500'
            };
        default:
            return {
                bg: 'bg-gray-600',
                ring: 'ring-gray-100',
                badge: 'bg-gray-50 text-gray-700 border-gray-200',
                border: 'border-l-gray-500'
            };
    }
};

const formatFieldName = (field: string) => {
    return field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const renderAppointmentDetails = (actionDetails: any) => {
    // For CREATE and DELETE actions, show the appointment details
    if (actionDetails.datetime && actionDetails.type) {
        const appointmentDate = new Date(actionDetails.datetime);
        const formattedDate = appointmentDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const formattedTime = appointmentDate.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });

        return (
            <div className="mt-4 space-y-3">
                <h5 className="text-sm font-medium text-gray-700 border-b border-gray-100 pb-1">
                    Appointment Details:
                </h5>
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <div className="text-xs text-blue-600 mb-1 font-medium">Date:</div>
                            <div className="text-sm text-blue-800 font-medium">{formattedDate}</div>
                        </div>
                        <div>
                            <div className="text-xs text-blue-600 mb-1 font-medium">Time:</div>
                            <div className="text-sm text-blue-800 font-medium">{formattedTime}</div>
                        </div>
                        <div className="sm:col-span-2">
                            <div className="text-xs text-blue-600 mb-1 font-medium">Type:</div>
                            <div className="text-sm text-blue-800 font-medium">{actionDetails.type}</div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

const renderUpdateDifferences = (actionDetails: any) => {
    const differences: { field: string; oldValue: any; newValue: any; }[] = [];
    if (actionDetails.new_values && actionDetails.old_values) {
        const newValues = actionDetails.new_values;
        const oldValues = actionDetails.old_values;
        Object.keys(newValues).forEach(key => {
            if (newValues[key] !== oldValues[key]) {
                differences.push({
                    field: key,
                    oldValue: oldValues[key],
                    newValue: newValues[key]
                });
            }
        });
    } else {
        const newFields = Object.keys(actionDetails).filter(key => key.startsWith('new_'));
        newFields.forEach(newField => {
            const oldField = newField.replace('new_', 'old_');
            if (actionDetails[oldField] !== undefined) {
                const fieldName = newField.replace('new_', '');
                if (actionDetails[newField] !== actionDetails[oldField]) {
                    differences.push({
                        field: fieldName,
                        oldValue: actionDetails[oldField],
                        newValue: actionDetails[newField]
                    });
                }
            }
        });
    }
    if (differences.length === 0) return null;
    return (
        <div className="mt-4 space-y-3">
            <h5 className="text-sm font-medium text-gray-700 border-b border-gray-100 pb-1">
                Changes Made:
            </h5>
            {differences.map((diff, index) => {
                // Special formatting for appointment fields
                let formattedOldValue = diff.oldValue;
                let formattedNewValue = diff.newValue;
                
                if (diff.field === 'datetime') {
                    try {
                        const oldDate = new Date(diff.oldValue);
                        const newDate = new Date(diff.newValue);
                        formattedOldValue = oldDate.toLocaleString('en-US', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                        formattedNewValue = newDate.toLocaleString('en-US', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                    } catch (e) {
                        // Keep original value if date parsing fails
                    }
                }

                return (
                    <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                        <div className="text-xs font-medium text-gray-600 mb-2">
                            {formatFieldName(diff.field)}
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <div className="flex-1">
                                <div className="text-xs text-gray-500 mb-1">From:</div>
                                <div className="bg-red-50 text-red-800 px-2 py-1 rounded border border-red-200 font-mono text-xs">
                                    {formattedOldValue || '(empty)'}
                                </div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <div className="flex-1">
                                <div className="text-xs text-gray-500 mb-1">To:</div>
                                <div className="bg-green-50 text-green-800 px-2 py-1 rounded border border-green-200 font-mono text-xs">
                                    {formattedNewValue || '(empty)'}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const renderActionDetails = (log: AuditLog) => {
    const colors = getActionColor(log.action_type);
    return (
        <Card className={`border-l-4 ${colors.border} hover:shadow-lg transition-all duration-300 bg-white hover:bg-gray-50/30`}>
            <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${colors.bg} text-white shadow-sm`}>
                            {getActionIcon(log.action_type)}
                        </div>
                        <div>
                            <h4 className="font-semibold text-gray-900">
                                {log.entity_type.replace('_', ' ')}
                            </h4>
                            <p className="text-gray-600 text-sm">
                                {log.description}
                            </p>
                        </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                        <Badge variant="secondary" className={`${colors.badge} font-medium border text-xs`}>
                            {log.action_type}
                        </Badge>
                        <div className="flex flex-col items-end text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(parseISO(log.created_at), 'MMM d, yyyy')}
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                                <Clock className="w-3 h-3" />
                                {format(parseISO(log.created_at), 'h:mm a')}
                            </div>
                        </div>
                    </div>
                </div>
                {log.action_type === 'UPDATE' && renderUpdateDifferences(log.action_details)}
                {log.entity_type === 'APPOINTMENT' && log.action_type === 'CREATE' && renderAppointmentDetails(log.action_details)}
                {log.entity_type === 'APPOINTMENT' && log.action_type === 'DELETE' && renderAppointmentDetails(log.action_details)}
                {log.entity_type === 'APPOINTMENT' && log.action_type === 'UPDATE' && !log.action_details.new_values && renderAppointmentDetails(log.action_details.new_values || log.action_details)}
            </CardContent>
        </Card>
    );
};

export function AuditLogSection({ patientId, patientName }: AuditLogSectionProps) {
    const { getAccessTokenSilently } = useAuth0();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionTypeFilter, setActionTypeFilter] = useState<string | null>(null);
    const [entityTypeFilter, setEntityTypeFilter] = useState<string | null>(null);

    useEffect(() => {
        const fetchLogs = async () => {
            setLoading(true);
            try {
                const token = await getAccessTokenSilently();
                const queryParams = new URLSearchParams();
                queryParams.append('patient_id', patientId);
                if (actionTypeFilter) queryParams.append('action_type', actionTypeFilter);
                if (entityTypeFilter) queryParams.append('entity_type', entityTypeFilter);

                const response = await fetch(`${API}/audit-logs?${queryParams.toString()}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (!response.ok) throw new Error(await response.text());

                const data: AuditLog[] = await response.json();
                const filteredData = data.filter(log => log.action_type !== 'READ');
                setLogs(filteredData);
            } catch (err) {
                console.error('Failed to load audit logs', err);
                setLogs([]);
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
    }, [patientId, actionTypeFilter, entityTypeFilter, getAccessTokenSilently]);

    const actionTypes = ['CREATE', 'UPDATE', 'DELETE'];
    const entityTypes = ['PATIENT', 'SYMPTOM', 'VITAL_SIGN', 'TEST', 'PERSONAL_HISTORY', 'APPOINTMENT'];

    const clearFilters = () => {
        setActionTypeFilter(null);
        setEntityTypeFilter(null);
    };

    const logCount = logs.length;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
            <div className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-20 left-20 w-32 h-32 border-2 border-white rounded-full"></div>
                    <div className="absolute top-40 right-32 w-24 h-24 border-2 border-white rounded-full"></div>
                    <div className="absolute bottom-20 left-1/3 w-28 h-28 border-2 border-white rounded-full"></div>
                    <div className="absolute top-32 left-1/2 w-20 h-20 border border-white rounded-full"></div>
                </div>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-400 to-transparent opacity-60 animate-pulse"></div>
                <div className="relative max-w-6xl mx-auto px-6 py-16">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className="relative">
                                <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl border border-white/30">
                                    <FileText className="w-12 h-12 text-white" />
                                </div>
                                <div className="absolute -top-2 -right-2 p-2 bg-red-500 rounded-full">
                                    <Heart className="w-4 h-4 text-white animate-pulse" />
                                </div>
                            </div>
                            <div className="text-white">
                                <div className="flex items-center gap-3 mb-2">
                                    <h1 className="text-4xl font-bold tracking-tight">
                                        Patient Activity Audit
                                    </h1>
                                    <Shield className="w-8 h-8 text-blue-200" />
                                </div>
                                <p className="text-blue-100 text-lg mb-1">
                                    Comprehensive medical record tracking system
                                </p>
                                <div className="flex items-center gap-2 text-white">
                                    <span className="text-xl font-semibold">{patientName}</span>
                                </div>
                            </div>
                        </div>
                        <div className="hidden lg:flex gap-4">
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                                <div className="flex items-center gap-3">
                                    <TrendingUp className="w-6 h-6 text-green-300" />
                                    <div className="text-white">
                                        <div className="text-sm text-blue-100">Total Events</div>
                                        <div className="text-xl font-bold">{logCount}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                                <div className="flex items-center gap-3">
                                    <Activity className="w-6 h-6 text-blue-300" />
                                    <div className="text-white">
                                        <div className="text-sm text-blue-100">Last Activity</div>
                                        <div className="text-sm font-semibold">
                                            {logs.length > 0 ? format(parseISO(logs[0]?.created_at), 'MMM d') : 'N/A'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="absolute bottom-0 left-0 w-full">
                    <svg viewBox="0 0 1200 120" fill="none" className="w-full h-12">
                        <path d="M0,60 C300,100 600,20 1200,60 L1200,120 L0,120 Z" fill="rgb(248 250 252)" />
                    </svg>
                </div>
            </div>
            <div className="max-w-6xl mx-auto px-6 -mt-8 relative z-10">
                <Card className="mb-8 shadow-lg border border-gray-100 bg-white rounded-xl overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50/50 border-b border-gray-100 px-6 py-4">
                        <CardTitle className="flex items-center gap-3 text-lg font-semibold text-gray-800">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Filter className="w-5 h-5 text-blue-600" />
                            </div>
                            Filter Medical Events
                        </CardTitle>
                    </CardHeader>

                    <CardContent className="p-6">
                        <div className="flex flex-wrap md:flex-nowrap items-end gap-4">
                            {/* Action Type */}
                            <div className="flex-1 min-w-[220px]">
                                <Select
                                    value={actionTypeFilter ?? 'all'}
                                    onValueChange={(value) =>
                                        setActionTypeFilter(value === 'all' ? null : value)
                                    }
                                >
                                    <SelectTrigger className="h-12 border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 bg-white hover:border-gray-300 transition-all rounded-lg">
                                        <SelectValue placeholder="Action Type" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white border border-gray-200 shadow-lg rounded-lg">
                                        <SelectItem value="all" className="hover:bg-gray-50 focus:bg-gray-50">
                                            All Actions
                                        </SelectItem>
                                        {actionTypes.map((type) => (
                                            <SelectItem key={type} value={type} className="hover:bg-gray-50 focus:bg-gray-50">
                                                <div className="flex items-center gap-2">
                                                    {getActionIcon(type)}
                                                    {type}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Entity Type */}
                            <div className="flex-1 min-w-[220px]">
                                <Select
                                    value={entityTypeFilter ?? 'all'}
                                    onValueChange={(value) =>
                                        setEntityTypeFilter(value === 'all' ? null : value)
                                    }
                                >
                                    <SelectTrigger className="h-12 border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 bg-white hover:border-gray-300 transition-all rounded-lg">
                                        <SelectValue placeholder="Entity Type" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white border border-gray-200 shadow-lg rounded-lg">
                                        <SelectItem value="all" className="hover:bg-gray-50 focus:bg-gray-50">
                                            All Entities
                                        </SelectItem>
                                        {entityTypes.map((type) => (
                                            <SelectItem key={type} value={type} className="hover:bg-gray-50 focus:bg-gray-50">
                                                {type.replace('_', ' ')}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Clear Filters */}
                            <div>
                                <Button
                                    variant="outline"
                                    onClick={clearFilters}
                                    className="h-12 px-6 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all font-medium rounded-lg"
                                >
                                    Clear Filters
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-xl border-0 bg-white">
                    <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50/50 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-3 text-xl font-semibold text-gray-800">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <Calendar className="w-5 h-5 text-blue-600" />
                                </div>
                                Medical Activity Timeline
                            </CardTitle>
                            <div className="flex items-center gap-3">
                                <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1">
                                    {logCount} events tracked
                                </Badge>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Heart className="w-4 h-4 text-red-500" />
                                    <span>HIPAA Compliant</span>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <div className="relative mb-6">
                                    <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                                    <FileText className="absolute inset-0 m-auto w-6 h-6 text-blue-600" />
                                </div>
                                <p className="text-gray-600 text-lg">Loading medical timeline...</p>
                                <p className="text-gray-500 text-sm mt-2">Securing patient data</p>
                            </div>
                        ) : logs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl mb-6 border border-blue-100">
                                    <FileText className="w-16 h-16 text-blue-500 mx-auto" />
                                </div>
                                <h3 className="text-2xl font-semibold text-gray-800 mb-2">
                                    No Medical Events Found
                                </h3>
                                <p className="text-gray-600 max-w-md">
                                    No audit events are available for patient {patientName} with the selected filters.
                                </p>
                                <Button
                                    onClick={clearFilters}
                                    variant="outline"
                                    className="mt-4 border-blue-200 text-blue-600 hover:bg-blue-50"
                                >
                                    Clear All Filters
                                </Button>
                            </div>
                        ) : (
                            <div className="relative">
                                <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-blue-400 via-blue-300 to-gray-300"></div>
                                <div className="space-y-6">
                                    {logs.map((log, index) => {
                                        const colors = getActionColor(log.action_type);
                                        const isFirst = index === 0;
                                        return (
                                            <div key={log.id} className="relative flex items-start">
                                                <div className={`
                                                    absolute left-5 w-3 h-3 rounded-full ${colors.bg}
                                                    ring-4 ${colors.ring} ring-offset-2 ring-offset-white
                                                    z-10 shadow-sm
                                                    ${isFirst ? 'animate-pulse' : ''}
                                                `}></div>
                                                <div className="ml-12 flex-1">
                                                    {renderActionDetails(log)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="relative flex items-center mt-8">
                                    <div className="absolute left-5 w-3 h-3 rounded-full bg-gray-400 ring-4 ring-gray-100 ring-offset-2 ring-offset-white"></div>
                                    <div className="ml-12">
                                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                            <p className="text-gray-600 text-sm flex items-center gap-2">
                                                <Shield className="w-4 h-4" />
                                                Medical audit trail complete - All events logged securely
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
                <div className="mt-8 text-center py-6">
                    <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
                        <Heart className="w-4 h-4 text-red-400" />
                        <span>Secure Healthcare Data Management</span>
                        <span>•</span>
                        <span>HIPAA Compliant Audit System</span>
                        <Heart className="w-4 h-4 text-red-400" />
                    </div>
                </div>
            </div>
        </div>
    );
}
