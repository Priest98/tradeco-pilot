
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ThemeToggle } from './ThemeToggle';

export default function Navigation() {
    const pathname = usePathname();
    const { user, logout } = useAuth();

    const isActive = (path: string) => pathname === path;
    const linkBaseClass = "px-4 py-2 rounded-lg text-sm font-medium transition-colors";
    const activeClass = "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400";
    const inactiveClass = "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800";

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                <div className="flex items-center gap-8">
                    <Link href="/" className="font-bold text-xl bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-emerald-500 dark:from-indigo-400 dark:to-emerald-400">
                        TraderCopilot
                    </Link>

                    {user && (
                        <div className="flex items-center gap-1 hidden md:flex">
                            <Link href="/dashboard" className={`${linkBaseClass} ${isActive('/dashboard') ? activeClass : inactiveClass}`}>
                                Signals
                            </Link>
                            <Link href="/strategies" className={`${linkBaseClass} ${isActive('/strategies') ? activeClass : inactiveClass}`}>
                                Strategies
                            </Link>
                            <Link href="/backtesting" className={`${linkBaseClass} ${isActive('/backtesting') ? activeClass : inactiveClass}`}>
                                Backtesting
                            </Link>
                            <Link href="/knowledge" className={`${linkBaseClass} ${isActive('/knowledge') ? activeClass : inactiveClass}`}>
                                Knowledge
                            </Link>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    <ThemeToggle />

                    {user ? (
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">{user.email}</span>
                            <button
                                onClick={logout}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-800"
                            >
                                Logout
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-6">
                            <div className="hidden lg:flex items-center gap-6 mr-4">
                                <Link href="/testimonials" className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Testimonials</Link>
                                <Link href="/contact" className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Contact</Link>
                            </div>
                            <Link
                                href="/login"
                                className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                            >
                                Login
                            </Link>
                            <Link
                                href="/signup"
                                className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-lg shadow-indigo-600/20"
                            >
                                Get Started
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}
