'use client';

import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import {
    Home,
    Stethoscope,
    History,
    HeartPulse,
    FlaskConical,
    NotebookTabs,   //  ➜ summary icon
} from 'lucide-react';

export type Section =
    | 'home'
    | 'symptoms'
    | 'history'
    | 'vitals'
    | 'tests'
    | 'summary';     //  ➜ NEW

const NAV: { id: Section; label: string; icon: React.ReactNode }[] = [
    { id: 'home',     label: 'Dashboard',        icon: <Home className="size-4" /> },
    { id: 'symptoms', label: 'Symptoms',         icon: <Stethoscope className="size-4" /> },
    { id: 'history',  label: 'Personal History', icon: <History className="size-4" /> },
    { id: 'vitals',   label: 'Vital Signs',      icon: <HeartPulse className="size-4" /> },
    { id: 'tests',    label: 'Test Results',     icon: <FlaskConical className="size-4" /> },

    /* ───────── BELOW THE ORIGINAL ITEMS ───────── */
    { id: 'summary',  label: 'Summary',          icon: <NotebookTabs className="size-4" /> },
];

export function Sidebar({
                            active,
                            onChange,
                        }: {
    active: Section;
    onChange: (s: Section) => void;
}) {
    return (
        <aside className="w-64 bg-white shadow-md flex flex-col">
            <div className="h-16 flex items-center justify-center font-bold text-xl border-b">
                DeepCardio
            </div>

            <nav className="flex-1 p-4 space-y-2">
                {NAV.map(({ id, label, icon }) => (
                    <button
                        key={id}
                        onClick={() => onChange(id)}
                        className={cn(
                            buttonVariants({
                                variant: active === id ? 'default' : 'ghost',
                                size: 'sm',
                            }),
                            'w-full justify-start',
                        )}
                    >
                        {icon}
                        {label}
                    </button>
                ))}
            </nav>
        </aside>
    );
}
