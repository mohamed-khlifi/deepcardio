'use client';

import { Button } from '@/components/ui/button';
import { useAuth0 } from '@auth0/auth0-react';

export function TopBar({ doctorName }: { doctorName: string }) {
    const { logout } = useAuth0();

    return (
        <header className="h-16 flex items-center justify-between px-6 bg-white shadow-sm">
      <span className="font-semibold text-lg">
        Welcome&nbsp;<span className="text-primary">Dr.&nbsp;{doctorName}</span>
      </span>

            <Button
                variant="destructive"
                size="sm"
                onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
            >
                Logout
            </Button>
        </header>
    );
}
