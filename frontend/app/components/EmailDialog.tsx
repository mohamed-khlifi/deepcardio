'use client';

import React, { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { generatePatientPDF } from './ExportPdfButton';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8001/api/v1';

interface EmailDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    patient: any;
    doctorName: string;
}

export function EmailDialog({ open, onOpenChange, patient, doctorName }: EmailDialogProps) {
    const [toEmail, setToEmail] = useState('');
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);
    const [anonymous, setAnonymous] = useState(false);
    const [selectAll, setSelectAll] = useState(true);
    const [includeSymptoms, setIncludeSymptoms] = useState(true);
    const [includeVitalSigns, setIncludeVitalSigns] = useState(true);
    const [includePersonalHistory, setIncludePersonalHistory] = useState(true);
    const [includeTests, setIncludeTests] = useState(true);
    const { getAccessTokenSilently } = useAuth0();

    const handleSelectAll = (checked: boolean) => {
        setSelectAll(checked);
        setIncludeSymptoms(checked);
        setIncludeVitalSigns(checked);
        setIncludePersonalHistory(checked);
        setIncludeTests(checked);
    };

    const handleIndividualChange = () => {
        const allSelected = includeSymptoms && includeVitalSigns && includePersonalHistory && includeTests;
        setSelectAll(allSelected);
    };

    const handleSubmit = async () => {
        if (!toEmail || !body) {
            toast.error('Please fill in both email and message');
            return;
        }

        setSending(true);
        try {
            const token = await getAccessTokenSilently();
            const options = {
                anonymous,
                include: {
                    symptoms: includeSymptoms,
                    vitalSigns: includeVitalSigns,
                    personalHistory: includePersonalHistory,
                    tests: includeTests,
                },
            };
            const pdfBlob = await generatePatientPDF(patient, doctorName, options);
            const filename = anonymous
                ? 'anonymous_patient_report.pdf'
                : `${patient.demographics.first_name}_${patient.demographics.last_name}_report.pdf`;
            const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });

            const formData = new FormData();
            formData.append('to_email', toEmail);
            formData.append('body', body);
            formData.append('patient_id', String(patient.id));
            formData.append('pdf_file', pdfFile);

            const res = await fetch(`${API}/send-email`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            });

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(errorText);
            }

            toast.success('Email sent successfully');
            onOpenChange(false);
            setToEmail('');
            setBody('');
            setAnonymous(false);
            setSelectAll(true);
            setIncludeSymptoms(true);
            setIncludeVitalSigns(true);
            setIncludePersonalHistory(true);
            setIncludeTests(true);
        } catch (err) {
            console.error('Error sending email:', err);
            toast.error('Failed to send email');
        } finally {
            setSending(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-white rounded-lg p-6 shadow-md border-0">
                <DialogHeader className="bg-blue-600 text-white rounded-t-lg -mx-6 -mt-6 p-4">
                    <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                        <Send className="w-5 h-5" />
                        Share Patient Summary
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="to-email" className="text-sm font-medium text-gray-700">
                            Recipient Email
                        </Label>
                        <Input
                            id="to-email"
                            type="email"
                            placeholder="doctor@example.com"
                            value={toEmail}
                            onChange={(e) => setToEmail(e.target.value)}
                            className="w-full rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500 text-sm"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="body" className="text-sm font-medium text-gray-700">
                            Message
                        </Label>
                        <Textarea
                            id="body"
                            placeholder="Enter your message here..."
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            className="w-full min-h-[120px] rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500 text-sm"
                        />
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="anonymous"
                            checked={anonymous}
                            onCheckedChange={(checked) => setAnonymous(!!checked)}
                        />
                        <Label htmlFor="anonymous" className="text-sm font-medium text-gray-700">
                            Send anonymously (exclude personal details)
                        </Label>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="select-all"
                                checked={selectAll}
                                onCheckedChange={handleSelectAll}
                            />
                            <Label htmlFor="select-all" className="text-sm font-medium text-gray-700">
                                Select All Sections
                            </Label>
                        </div>
                        <div className="pl-6 space-y-2">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="symptoms"
                                    checked={includeSymptoms}
                                    onCheckedChange={(checked) => {
                                        setIncludeSymptoms(!!checked);
                                        handleIndividualChange();
                                    }}
                                />
                                <Label htmlFor="symptoms" className="text-sm text-gray-700">
                                    Symptoms
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="vital-signs"
                                    checked={includeVitalSigns}
                                    onCheckedChange={(checked) => {
                                        setIncludeVitalSigns(!!checked);
                                        handleIndividualChange();
                                    }}
                                />
                                <Label htmlFor="vital-signs" className="text-sm text-gray-700">
                                    Vital Signs
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="personal-history"
                                    checked={includePersonalHistory}
                                    onCheckedChange={(checked) => {
                                        setIncludePersonalHistory(!!checked);
                                        handleIndividualChange();
                                    }}
                                />
                                <Label htmlFor="personal-history" className="text-sm text-gray-700">
                                    Personal History
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="tests"
                                    checked={includeTests}
                                    onCheckedChange={(checked) => {
                                        setIncludeTests(!!checked);
                                        handleIndividualChange();
                                    }}
                                />
                                <Label htmlFor="tests" className="text-sm text-gray-700">
                                    Tests
                                </Label>
                            </div>
                        </div>
                    </div>
                </div>
                <DialogFooter className="flex justify-end gap-2">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="rounded-lg border-gray-200 text-gray-700 hover:bg-gray-50 text-sm"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={sending}
                        className="rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2 text-sm"
                    >
                        {sending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                        Send Email
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}