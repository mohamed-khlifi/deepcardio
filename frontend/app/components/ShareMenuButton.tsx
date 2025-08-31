'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MoreVertical, Share2 } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmailDialog } from '@/app/components/EmailDialog';

interface ShareMenuButtonProps {
    patient: any;
    doctorName: string;
}

export function ShareMenuButton({ patient, doctorName }: ShareMenuButtonProps) {
    const [emailDialogOpen, setEmailDialogOpen] = useState(false);

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                        <MoreVertical className="size-4 mr-2" />
                        Share
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-white border-gray-200">
                    <DropdownMenuItem onClick={() => setEmailDialogOpen(true)}>
                        <Share2 className="size-4 mr-2" />
                        Share with a Doctor
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <EmailDialog
                open={emailDialogOpen}
                onOpenChange={setEmailDialogOpen}
                patient={patient}
                doctorName={doctorName}
            />
        </>
    );
}