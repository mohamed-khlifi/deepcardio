"use client";

import { useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useRouter } from "next/navigation";

export default function CallbackPage() {
    const { handleRedirectCallback, isAuthenticated } = useAuth0();
    const router = useRouter();

    useEffect(() => {
        const run = async () => {
            await handleRedirectCallback(); // finish login
            router.push("/"); // go to homepage
        };
        run();
    }, []);

    return <p className="p-4">🔄 Logging you in...</p>;
}
