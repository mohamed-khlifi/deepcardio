'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface ExportPdfButtonProps {
    patient: any;
    doctorName: string;
}

interface PDFOptions {
    anonymous?: boolean;
    include?: {
        symptoms?: boolean;
        vitalSigns?: boolean;
        personalHistory?: boolean;
        tests?: boolean;
    };
}

export async function generatePatientPDF(patient: any, doctorName: string, options: PDFOptions = {}): Promise<Blob> {
    const { anonymous = false, include = { symptoms: true, vitalSigns: true, personalHistory: true, tests: true } } = options;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;

    // Set font to a professional, clean typeface
    doc.setFont('helvetica', 'normal');

    // ── Header with Logo ──
    const logoUrl = '/images/deepcardio_logo.png';
    let imgData = '';
    try {
        const resp = await fetch(logoUrl);
        const blob = await resp.blob();
        imgData = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
        });
    } catch (err) {
        console.warn('Failed to load logo, skipping image:', err);
    }

    if (imgData) {
        const logoWidth = 40;
        const logoHeight = 40;
        const logoX = (pageWidth - logoWidth) / 2;
        doc.addImage(imgData, 'PNG', logoX, 10, logoWidth, logoHeight);
    }

    // ── Header Title and Metadata ──
    const headerY = imgData ? 55 : 25;
    doc.setFontSize(16);
    doc.setTextColor(31, 41, 55); // Gray-800
    doc.text(anonymous ? 'Anonymous Patient Summary Report' : 'Patient Summary Report', margin, headerY);

    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128); // Gray-500
    doc.text(`Prepared by: Dr. ${doctorName || 'Unknown'}`, margin, headerY + 8);
    doc.text(`Date: ${format(new Date(), 'PPP')}`, pageWidth - margin, headerY + 8, { align: 'right' });

    // ── Divider Line ──
    doc.setDrawColor(147, 197, 253); // Blue-300
    doc.setLineWidth(0.5);
    doc.line(margin, headerY + 12, pageWidth - margin, headerY + 12);

    let cursorY = headerY + 18;

    // Helper to move cursorY after each table
    const advance = () => {
        cursorY = (doc as any).lastAutoTable.finalY + 8;
    };

    // ── Patient Data ──
    const {
        demographics,
        contact_info,
        social_info,
        symptoms,
        personal_history,
        vital_signs,
        tests,
        follow_up_actions,
        recommendations,
        referrals,
        risks,
        life_style_advice,
        presumptive_diagnoses,
        tests_to_order,
    } = patient;

    if (!anonymous) {
        // ── Demographics ──
        doc.setFontSize(12);
        doc.setTextColor(31, 41, 55); // Gray-800
        doc.text('Demographics', margin, cursorY);
        autoTable(doc, {
            startY: cursorY + 4,
            head: [['Field', 'Value']],
            body: [
                ['First Name', demographics.first_name || '—'],
                ['Last Name', demographics.last_name || '—'],
                ['Gender', demographics.gender || '—'],
                ['Date of Birth', demographics.date_of_birth || '—'],
                ['Age', String(demographics.age) || '—'],
                ['Ethnicity', demographics.ethnicity || '—'],
            ],
            theme: 'grid',
            headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontSize: 10 }, // Blue-600
            bodyStyles: { fontSize: 9, textColor: [55, 65, 81] }, // Gray-700
            margin: { left: margin, right: margin },
        });
        advance();

        // ── Contact Information ──
        doc.setFontSize(12);
        doc.text('Contact Information', margin, cursorY);
        autoTable(doc, {
            startY: cursorY + 4,
            head: [['Phone', 'Email']],
            body: [[contact_info.phone || '—', contact_info.email || '—']],
            theme: 'grid',
            headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontSize: 10 },
            bodyStyles: { fontSize: 9, textColor: [55, 65, 81] },
            margin: { left: margin, right: margin },
        });
        advance();

        // ── Social & Insurance ──
        doc.setFontSize(12);
        doc.text('Social & Insurance', margin, cursorY);
        autoTable(doc, {
            startY: cursorY + 4,
            head: [['Occupation', 'Address', 'Marital Status', 'Insurance']],
            body: [[
                social_info.occupation || '—',
                social_info.address || '—',
                social_info.marital_status || '—',
                social_info.insurance_provider || '—',
            ]],
            theme: 'grid',
            headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontSize: 10 },
            bodyStyles: { fontSize: 9, textColor: [55, 65, 81] },
            margin: { left: margin, right: margin },
        });
        advance();
    } else {
        // For anonymous, include non-personal demographics like age, gender, ethnicity
        doc.setFontSize(12);
        doc.setTextColor(31, 41, 55);
        doc.text('Demographics (Anonymous)', margin, cursorY);
        autoTable(doc, {
            startY: cursorY + 4,
            head: [['Field', 'Value']],
            body: [
                ['Gender', demographics.gender || '—'],
                ['Age', String(demographics.age) || '—'],
                ['Ethnicity', demographics.ethnicity || '—'],
            ],
            theme: 'grid',
            headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontSize: 10 },
            bodyStyles: { fontSize: 9, textColor: [55, 65, 81] },
            margin: { left: margin, right: margin },
        });
        advance();
    }

    if (include.symptoms) {
        // ── Symptoms ──
        doc.setFontSize(12);
        doc.text('Symptoms', margin, cursorY);
        autoTable(doc, {
            startY: cursorY + 4,
            head: [['Category', 'Symptom']],
            body: symptoms.map((s: any) => [s.category || 'Other', s.name || '—']),
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontSize: 10 },
            bodyStyles: { fontSize: 9, textColor: [55, 65, 81] },
            margin: { left: margin, right: margin },
        });
        advance();
    }

    if (include.personalHistory) {
        // ── Personal History ──
        doc.setFontSize(12);
        doc.text('Personal History', margin, cursorY);
        autoTable(doc, {
            startY: cursorY + 4,
            head: [['History Item']],
            body: personal_history.map((h: any) => [h.name || '—']),
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontSize: 10 },
            bodyStyles: { fontSize: 9, textColor: [55, 65, 81] },
            margin: { left: margin, right: margin },
        });
        advance();
    }

    if (include.vitalSigns) {
        // ── Vital Signs ──
        doc.setFontSize(12);
        doc.text('Vital Signs', margin, cursorY);
        autoTable(doc, {
            startY: cursorY + 4,
            head: [['Category', 'Name', 'Value', 'Unit']],
            body: vital_signs.map((v: any) => [
                v.category || 'Other',
                v.name || '—',
                v.value || '—',
                v.unit || '—',
            ]),
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontSize: 10 },
            bodyStyles: { fontSize: 9, textColor: [55, 65, 81] },
            margin: { left: margin, right: margin },
        });
        advance();
    }

    if (include.tests) {
        // ── Test Results ──
        doc.setFontSize(12);
        doc.text('Test Results', margin, cursorY);
        autoTable(doc, {
            startY: cursorY + 4,
            head: [['Date', 'Test', 'Value', 'Unit', 'Notes']],
            body: tests.map((t: any) => [
                t.date || '—',
                t.name || '—',
                t.value || '—',
                t.unit || '—',
                t.notes || '—',
            ]),
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontSize: 10 },
            bodyStyles: { fontSize: 9, textColor: [55, 65, 81] },
            margin: { left: margin, right: margin },
        });
        advance();
    }

    // ── Follow-up Actions ──
    doc.setFontSize(12);
    doc.text('Follow-up Actions', margin, cursorY);
    autoTable(doc, {
        startY: cursorY + 4,
        head: [['Action', 'Interval']],
        body: follow_up_actions.map((f: any) => [f.action || '—', f.interval || '—']),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontSize: 10 },
        bodyStyles: { fontSize: 9, textColor: [55, 65, 81] },
        margin: { left: margin, right: margin },
    });
    advance();

    // ── Recommendations ──
    doc.setFontSize(12);
    doc.text('Recommendations', margin, cursorY);
    autoTable(doc, {
        startY: cursorY + 4,
        head: [['Recommendation']],
        body: recommendations.map((r: any) => [r.recommendation || '—']),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontSize: 10 },
        bodyStyles: { fontSize: 9, textColor: [55, 65, 81] },
        margin: { left: margin, right: margin },
    });
    advance();

    // ── Referrals ──
    doc.setFontSize(12);
    doc.text('Referrals', margin, cursorY);
    autoTable(doc, {
        startY: cursorY + 4,
        head: [['Specialist', 'Reason']],
        body: referrals.map((r: any) => [r.specialist || '—', r.reason || '—']),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontSize: 10 },
        bodyStyles: { fontSize: 9, textColor: [55, 65, 81] },
        margin: { left: margin, right: margin },
    });
    advance();

    // ── Risks ──
    doc.setFontSize(12);
    doc.text('Risks', margin, cursorY);
    autoTable(doc, {
        startY: cursorY + 4,
        head: [['Risk', 'Reason']],
        body: risks.map((r: any) => [r.value || '—', r.reason || '—']),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontSize: 10 },
        bodyStyles: { fontSize: 9, textColor: [55, 65, 81] },
        margin: { left: margin, right: margin },
    });
    advance();

    // ── Lifestyle Advice ──
    doc.setFontSize(12);
    doc.text('Lifestyle Advice', margin, cursorY);
    autoTable(doc, {
        startY: cursorY + 4,
        head: [['Advice']],
        body: life_style_advice.map((a: any) => [a.advice || '—']),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontSize: 10 },
        bodyStyles: { fontSize: 9, textColor: [55, 65, 81] },
        margin: { left: margin, right: margin },
    });
    advance();

    // ── Presumptive Diagnoses ──
    doc.setFontSize(12);
    doc.text('Presumptive Diagnoses', margin, cursorY);
    autoTable(doc, {
        startY: cursorY + 4,
        head: [['Diagnosis', 'Confidence']],
        body: presumptive_diagnoses.map((d: any) => [d.diagnosis_name || '—', d.confidence_level || '—']),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontSize: 10 },
        bodyStyles: { fontSize: 9, textColor: [55, 65, 81] },
        margin: { left: margin, right: margin },
    });
    advance();

    // ── Tests to Order ──
    doc.setFontSize(12);
    doc.text('Tests to Order', margin, cursorY);
    autoTable(doc, {
        startY: cursorY + 4,
        head: [['Test to Order']],
        body: tests_to_order.map((t: any) => [t.test_to_order || '—']),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontSize: 10 },
        bodyStyles: { fontSize: 9, textColor: [55, 65, 81] },
        margin: { left: margin, right: margin },
    });

    // ── Footer ──
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128); // Gray-500
    doc.text('Generated by DeepCardio', margin, pageHeight - 10);
    doc.text('Confidential - For Authorized Use Only', pageWidth - margin, pageHeight - 10, { align: 'right' });

    return doc.output('blob');
}

export function ExportPdfButton({ patient, doctorName }: ExportPdfButtonProps) {
    const handleExport = async () => {
        try {
            const pdfBlob = await generatePatientPDF(patient, doctorName);
            const filename = `${patient.demographics.first_name}_${patient.demographics.last_name}_report.pdf`;
            const url = URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Error generating PDF:', err);
        }
    };

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        onClick={handleExport}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm flex items-center gap-2"
                    >
                        <FileText className="w-4 h-4" />
                        Export PDF
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-gray-800 text-white border-gray-700 text-xs">
                    Download patient summary as PDF
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}