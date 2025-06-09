'use client';

import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import {
    Home,
    Stethoscope,
    History,
    HeartPulse,
    FlaskConical,
    NotebookTabs,
    ChevronDown,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState } from 'react';
import { Languages } from 'lucide-react';

export type Section =
    | 'home'
    | 'symptoms'
    | 'history'
    | 'vitals'
    | 'tests'
    | 'summary';

const NAV: { id: Section; label: string; icon: React.ReactNode }[] = [
    { id: 'home',     label: 'Dashboard',        icon: <Home className="size-4" /> },
    { id: 'symptoms', label: 'Symptoms',         icon: <Stethoscope className="size-4" /> },
    { id: 'history',  label: 'Personal History', icon: <History className="size-4" /> },
    { id: 'vitals',   label: 'Vital Signs',      icon: <HeartPulse className="size-4" /> },
    { id: 'tests',    label: 'Test Results',     icon: <FlaskConical className="size-4" /> },
    { id: 'summary',  label: 'Summary',          icon: <NotebookTabs className="size-4" /> },
];

export function Sidebar({
                            active,
                            onChange,
                        }: {
    active: Section;
    onChange: (s: Section) => void;
}) {
    const [language, setLanguage] = useState<'English' | 'Français'>('English');

    return (
        <aside className="w-64 bg-white shadow-md flex flex-col h-full">
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

            {/* Language Switcher */}
            <div className="p-4 border-t">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <div
                            className={cn(
                                buttonVariants({ variant: 'ghost', size: 'sm' }),
                                'w-full justify-between cursor-pointer group hover:bg-muted/50 transition-colors'
                            )}
                        >
                            <div className="flex items-center gap-2">
                                <Languages className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                                <span>{language}</span>
                            </div>
                            <ChevronDown className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 ml-4 mb-2 rounded-lg shadow-lg border bg-white">
                        <DropdownMenuItem
                            className="cursor-pointer px-4 py-3 hover:bg-muted/50 focus:bg-muted/50"
                            onClick={() => setLanguage('English')}
                        >
              <span className={cn('font-medium', language === 'English' ? 'text-primary' : '')}>
                English
              </span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="cursor-pointer px-4 py-3 hover:bg-muted/50 focus:bg-muted/50"
                            onClick={() => setLanguage('Français')}
                        >
              <span className={cn('font-medium', language === 'Français' ? 'text-primary' : '')}>
                Français
              </span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </aside>
    );
}