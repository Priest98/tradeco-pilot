import type { Metadata } from 'next'
import { Inter, Roboto, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
    display: 'swap',
})

const roboto = Roboto({
    weight: ['400', '500', '700'],
    subsets: ['latin'],
    variable: '--font-roboto',
    display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
    subsets: ['latin'],
    variable: '--font-jetbrains',
    display: 'swap',
})

export const metadata: Metadata = {
    title: 'TraderCopilot | Quant Signal Intelligence',
    description: 'Institutional-grade quantitative trading signal platform',
}

import Navigation from '@/components/Navigation';
import { ClientProviders } from '@/context/ClientProviders';
import { ThemeProvider } from '@/components/ThemeProvider';

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={`${inter.variable} ${roboto.variable} ${jetbrainsMono.variable} font-body bg-white dark:bg-slate-950 text-slate-800 dark:text-gray-100 min-h-screen pt-16 transition-colors duration-300`}>
                <ClientProviders>
                    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                        <Navigation />
                        {children}
                    </ThemeProvider>
                </ClientProviders>
            </body>
        </html>
    )
}
