import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
import { Toaster } from 'sonner';
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "DeepCardio",
    description: "Doctor login and cardiovascular dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
        <body className={`${inter.className} bg-white`}>
        <AuthProvider>
            <Toaster richColors position="top-right" />
            {children}
        </AuthProvider>
        </body>
        </html>
    );
}
