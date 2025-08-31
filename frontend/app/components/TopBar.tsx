'use client';
import { Button } from '@/components/ui/button';
import { useAuth0 } from '@auth0/auth0-react';
import { Stethoscope } from 'lucide-react';

export function TopBar({ doctorName }: { doctorName: string }) {
    const { logout } = useAuth0();
    return (
        <header
            dc-test-id="topbar-header"
            className="h-14 flex items-center justify-between px-4 bg-blue-600 text-white shadow-sm"
        >
            <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5" />
                <span dc-test-id="welcome-text" className="text-sm font-medium">
                    Welcome, <span dc-test-id="doctor-name" className="font-semibold">{doctorName}</span>
                </span>
            </div>
            <Button
                dc-test-id="logout-button"
                variant="outline"
                size="sm"
                onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
                className="border-white text-white hover:bg-blue-700 hover:text-white"
            >
                Logout
            </Button>
        </header>
    );
}