'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText, Pill, Calendar, User, UserCheck } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface Prescription {
    id: number;
    medicine_name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
    created_at: string;
    updated_at: string;
}

interface PrescriptionPdfExportProps {
    prescriptions: Prescription[];
    patientName: string;
    doctorName: string;
    patientId: number;
}

export async function generatePrescriptionPDF(
    prescriptions: Prescription[], 
    patientName: string, 
    doctorName: string,
    patientId: number
): Promise<Blob> {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;

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
        const logoWidth = 35;
        const logoHeight = 35;
        const logoX = (pageWidth - logoWidth) / 2;
        doc.addImage(imgData, 'PNG', logoX, 15, logoWidth, logoHeight);
    }

    // ── Header Title and Metadata ──
    const headerY = imgData ? 55 : 30;
    doc.setFontSize(20);
    doc.setTextColor(31, 41, 55); // Gray-800
    doc.text('MEDICAL PRESCRIPTION', pageWidth / 2, headerY, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(107, 114, 128); // Gray-500
    doc.text(`Prepared by: Dr. ${doctorName || 'Unknown'}`, margin, headerY + 15);
    doc.text(`Date: ${format(new Date(), 'PPP')}`, pageWidth - margin, headerY + 15, { align: 'right' });

    // ── Simplified Patient Information ──
    const patientInfoY = headerY + 30;
    doc.setFontSize(12);
    doc.setTextColor(55, 65, 81); // Gray-700
    doc.text(`Patient Name: ${patientName}`, margin, patientInfoY);

    // ── Divider Line ──
    const dividerY = patientInfoY + 15;
    doc.setDrawColor(59, 130, 246); // Blue-600
    doc.setLineWidth(1);
    doc.line(margin, dividerY, pageWidth - margin, dividerY);

    // ── Prescriptions Section ──
    const prescriptionsY = dividerY + 20;
    doc.setFontSize(16);
    doc.setTextColor(31, 41, 55); // Gray-800
    doc.text('Prescribed Medications', margin, prescriptionsY);

    doc.setFontSize(11);
    doc.setTextColor(107, 114, 128); // Gray-500
    doc.text(`${prescriptions.length} medication${prescriptions.length !== 1 ? 's' : ''}`, pageWidth - margin, prescriptionsY, { align: 'right' });

    // ── Improved Prescriptions Table ──
    const tableStartY = prescriptionsY + 15;
    
    // Calculate optimal column widths
    const totalWidth = pageWidth - 2 * margin;
    const columnWidths = {
        medicine: totalWidth * 0.35,    // 35% for medicine name
        dosage: totalWidth * 0.20,      // 20% for dosage
        frequency: totalWidth * 0.25,   // 25% for frequency
        duration: totalWidth * 0.20     // 20% for duration
    };

    // Create table data with better formatting
    const tableData = prescriptions.map((prescription, index) => [
        `${index + 1}. ${prescription.medicine_name}`,
        prescription.dosage,
        prescription.frequency,
        prescription.duration
    ]);

    // Main medications table
    autoTable(doc, {
        startY: tableStartY,
        head: [['Medicine', 'Dosage', 'Frequency', 'Duration']],
        body: tableData,
        theme: 'grid',
        headStyles: { 
            fillColor: [59, 130, 246], // Blue-600
            textColor: [255, 255, 255],
            fontSize: 11,
            fontStyle: 'bold',
            halign: 'center',
            cellPadding: 6
        },
        bodyStyles: { 
            fontSize: 10,
            textColor: [31, 41, 55],
            cellPadding: 5,
            lineColor: [59, 130, 246],
            lineWidth: 0.5,
            valign: 'middle'
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252] // Very light gray
        },
        columnStyles: {
            0: { cellWidth: columnWidths.medicine, fontStyle: 'bold' }, // Medicine
            1: { cellWidth: columnWidths.dosage, halign: 'center' },   // Dosage
            2: { cellWidth: columnWidths.frequency, halign: 'center' }, // Frequency
            3: { cellWidth: columnWidths.duration, halign: 'center' }   // Duration
        },
        margin: { left: margin, right: margin },
        tableLineColor: [59, 130, 246],
        tableLineWidth: 0.5,
        styles: {
            overflow: 'linebreak',
            cellWidth: 'wrap',
            minCellHeight: 10
        }
    });

    let currentY = (doc as any).lastAutoTable.finalY + 15;

    // Add instructions if any
    const instructionsData = prescriptions.map((prescription, index) => {
        if (prescription.instructions && prescription.instructions.trim()) {
            return [`Instructions for ${prescription.medicine_name}:`, prescription.instructions];
        }
        return null;
    }).filter(Boolean);

    if (instructionsData.length > 0) {
        doc.setFontSize(12);
        doc.setTextColor(31, 41, 55); // Gray-800
        doc.text('Special Instructions', margin, currentY);
        currentY += 8;

        instructionsData.forEach((instruction) => {
            if (instruction) {
                doc.setFontSize(10);
                doc.setTextColor(55, 65, 81); // Gray-700
                doc.text(instruction[0], margin, currentY);
                currentY += 5;
                
                doc.setFontSize(9);
                doc.setTextColor(107, 114, 128); // Gray-500
                doc.text(instruction[1], margin + 10, currentY);
                currentY += 8;
            }
        });
    }

    // ── Improved Safety Guidelines Section ──
    let guidelinesY = currentY + 15;
    
    // Check if we need a new page
    if (guidelinesY > pageHeight - 80) {
        doc.addPage();
        currentY = 20;
        guidelinesY = currentY + 15;
    }
    
    // Safety guidelines with better formatting
    doc.setFillColor(254, 242, 242); // Light red background
    doc.setDrawColor(239, 68, 68); // Red border
    doc.setLineWidth(1);
    doc.roundedRect(margin, guidelinesY, pageWidth - 2 * margin, 50, 3, 3, 'FD');

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38); // Red
    doc.text('IMPORTANT SAFETY GUIDELINES', margin + 8, guidelinesY + 8);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(75, 85, 99); // Gray-600
    
    const safetyGuidelines = [
        '• Take exactly as prescribed • Do not exceed dosages • Complete full course',
        '• Contact physician immediately for adverse reactions • Store in cool, dry place',
        '• Keep away from children • Do not share medications • Follow all instructions carefully',
        '• Report any side effects to your doctor • Do not stop without consulting physician'
    ];

    safetyGuidelines.forEach((guideline, index) => {
        doc.text(guideline, margin + 8, guidelinesY + 18 + (index * 6));
    });

    // ── Signature Section ──
    const signatureY = guidelinesY + 65;
    
    // Check if we need a new page for signatures
    if (signatureY > pageHeight - 40) {
        doc.addPage();
        currentY = 20;
        let signatureY = currentY + 15;
    }
    
    // Signature lines with better spacing
    doc.setDrawColor(59, 130, 246); // Blue
    doc.setLineWidth(1.5);
    
    // Doctor signature line
    doc.line(margin, signatureY, margin + 100, signatureY);
    doc.setFontSize(10);
    doc.setTextColor(31, 41, 55); // Dark gray
    doc.text('Physician Signature', margin, signatureY + 8);
    doc.text(doctorName, margin, signatureY + 15);
    
    // Date line
    doc.line(pageWidth - margin - 100, signatureY, pageWidth - margin, signatureY);
    doc.text('Date', pageWidth - margin - 50, signatureY + 8, { align: 'center' });
    doc.text(format(new Date(), 'dd/MM/yyyy'), pageWidth - margin - 50, signatureY + 15, { align: 'center' });

    // ── Professional Footer ──
    const footerY = pageHeight - 25;
    
    // Elegant footer with medical symbol
    doc.setDrawColor(59, 130, 246); // Blue line
    doc.setLineWidth(1);
    doc.line(margin, footerY, pageWidth - margin, footerY);

    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128); // Gray-500
    doc.text('DeepCardio Medical System', pageWidth / 2, footerY + 8, { align: 'center' });
    doc.text('Advanced Cardiovascular Care & Treatment', pageWidth / 2, footerY + 14, { align: 'center' });
    doc.text('This prescription is valid for 30 days from the date of issue', pageWidth / 2, footerY + 20, { align: 'center' });

    return doc.output('blob');
}

export function PrescriptionPdfExport({ prescriptions, patientName, doctorName, patientId }: PrescriptionPdfExportProps) {
    const handleExport = async () => {
        try {
            if (prescriptions.length === 0) {
                alert('No prescriptions to export');
                return;
            }

            const pdfBlob = await generatePrescriptionPDF(prescriptions, patientName, doctorName, patientId);
            const filename = `Prescription_${patientName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
            const url = URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Error generating prescription PDF:', err);
            alert('Failed to generate PDF. Please try again.');
        }
    };

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        onClick={handleExport}
                        disabled={prescriptions.length === 0}
                        className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg shadow-lg flex items-center gap-2 transition-all duration-200 transform hover:scale-105"
                    >
                        <div className="flex items-center gap-2">
                            <div className="p-1 bg-white/20 rounded-md">
                                <FileText className="w-4 h-4" />
                            </div>
                            <span className="font-medium">Export Prescription</span>
                            <Download className="w-4 h-4" />
                        </div>
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-gray-800 text-white border-gray-700 text-sm">
                    <div className="flex items-center gap-2">
                        <Pill className="w-4 h-4 text-emerald-400" />
                        <span>Download professional prescription PDF</span>
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
