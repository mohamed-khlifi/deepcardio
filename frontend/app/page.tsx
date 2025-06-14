'use client';

import { useAuth0 } from '@auth0/auth0-react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

const logoSrc  = '/images/deepcardio_logo.png';
const videoSrc = '/videos/deepcardio_login_video.mp4';

export default function LoginPage() {
    const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
    const router = useRouter();

    // ✅ once the user *is* authenticated, jump to /dashboard
    useEffect(() => {
        if (!isLoading && isAuthenticated) router.replace('/dashboard');
    }, [isAuthenticated, isLoading, router]);

    /* A tiny loader while Auth0 finishes the handshake */
    if (isLoading) {
        return (
            <main className="flex items-center justify-center min-h-screen">
                <p className="animate-pulse text-gray-500">Loading…</p>
            </main>
        );
    }

    /* ------ NOT authenticated ➜ show the 70 / 30 split login screen ------ */
    return (
        <main className="flex w-full min-h-screen">
            {/* Left 70 % — looping video */}
            <section className="w-7/12 h-screen overflow-hidden">
                <video
                    src={videoSrc}
                    className="w-full h-full object-cover"
                    autoPlay
                    loop
                    muted
                    playsInline
                />
            </section>

            {/* Right 30 % — sign-in panel */}
            <section className="w-5/12 bg-white flex flex-col items-center justify-center px-12 py-20 shadow-xl">
                <div className="animate-fade-in flex flex-col items-center text-center space-y-10 max-w-sm w-full">
                    <Image src={logoSrc} alt="DeepCardio logo" width={240} height={240} priority />

                    <div>
                        <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
                            Welcome to <span className="text-red-600">DeepCardio</span>
                        </h1>
                        <p className="text-gray-600">
                            A smart dashboard to monitor vitals, assess&nbsp;cardiovascular&nbsp;risk&nbsp;and&nbsp;guide proactive&nbsp;care.
                        </p>
                    </div>

                    <Button size="lg" className="w-full" onClick={() => loginWithRedirect()}>
                        Sign&nbsp;in&nbsp;with&nbsp;Google
                    </Button>
                </div>
            </section>
        </main>
    );
}
