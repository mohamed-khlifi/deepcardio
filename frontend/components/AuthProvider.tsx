"use client";

import { Auth0Provider } from "@auth0/auth0-react";

export function AuthProvider({ children }: { children: React.ReactNode }) {
    return (
        <Auth0Provider
            domain="dev-i263g127pvf7d11w.us.auth0.com"
            clientId="wZG2f9HFDYYJQwRCqUCYEfqz7YAcfpKb"
            authorizationParams={{
                redirect_uri: "http://localhost:3000/callback",
                audience: "https://deepcardio-api",
                scope: "openid profile email"
            }}
        >
            {children}
        </Auth0Provider>
    );
}
