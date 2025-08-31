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
    FileText,
    Languages,
    ChevronDown,
    MessageSquare,
    Pill,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState } from 'react';

export type Section =
    | 'home'
    | 'symptoms'
    | 'history'
    | 'vitals'
    | 'tests'
    | 'prescriptions'
    | 'summary'
    | 'audit-log'
    | 'chat';

const NAV: { id: Section; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: 'Dashboard', icon: <Home className="size-4" /> },
    { id: 'symptoms', label: 'Symptoms', icon: <Stethoscope className="size-4" /> },
    { id: 'history', label: 'Personal History', icon: <History className="size-4" /> },
    { id: 'vitals', label: 'Vital Signs', icon: <HeartPulse className="size-4" /> },
    { id: 'tests', label: 'Test Results', icon: <FlaskConical className="size-4" /> },
    { id: 'prescriptions', label: 'Prescriptions', icon: <Pill className="size-4" /> },
    { id: 'summary', label: 'Summary', icon: <NotebookTabs className="size-4" /> },
    { id: 'audit-log', label: 'Audit Log', icon: <FileText className="size-4" /> },
    { id: 'chat', label: 'Chat', icon: <MessageSquare className="size-4" /> },
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
        <aside className="fixed top-0 left-0 w-64 h-screen bg-white shadow-md flex flex-col border-r border-gray-100 z-10">
            <div className="h-14 flex items-center justify-center bg-blue-600 text-white text-lg font-semibold tracking-tight">
                DeepCardio
            </div>
            <nav className="flex-1 p-3 space-y-1">
                {NAV.map(({ id, label, icon }) => (
                    <button
                        key={id}
                        onClick={() => onChange(id)}
                        className={cn(
                            buttonVariants({
                                variant: active === id ? 'default' : 'ghost',
                                size: 'sm',
                            }),
                            'w-full justify-start gap-2 text-sm font-medium',
                            active === id ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'text-gray-700 hover:bg-blue-50'
                        )}
                    >
                        {icon}
                        {label}
                    </button>
                ))}
            </nav>
            <div className="p-3 border-t border-gray-100">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <div
                            className={cn(
                                buttonVariants({ variant: 'ghost', size: 'sm' }),
                                'w-full justify-between cursor-pointer hover:bg-blue-50 text-gray-700'
                            )}
                        >
                            <div className="flex items-center gap-2">
                                <Languages className="size-4 text-gray-600" />
                                <span className="text-sm">{language}</span>
                            </div>
                            <ChevronDown className="size-4 text-gray-600" />
                        </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 ml-3 rounded-lg shadow-md border border-gray-100 bg-white">
                        <DropdownMenuItem
                            className="cursor-pointer px-3 py-2 hover:bg-blue-50 text-sm"
                            onClick={() => setLanguage('English')}
                        >
                            <span className={cn(language === 'English' ? 'text-blue-600 font-medium' : 'text-gray-700')}>
                                English
                            </span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="cursor-pointer px-3 py-2 hover:bg-blue-50 text-sm"
                            onClick={() => setLanguage('Français')}
                        >
                            <span className={cn(language === 'Français' ? 'text-blue-600 font-medium' : 'text-gray-700')}>
                                Français
                            </span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </aside>
    );
}