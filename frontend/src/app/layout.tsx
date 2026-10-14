import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/providers/theme-provider';
import { QueryProvider } from '@/providers/query-provider';
import { Toaster } from 'sonner';
import { BRANDING } from '@/config/branding';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: BRANDING.meta.title,
  description: BRANDING.meta.description,
  keywords: [
    'ORVEXA',
    'Operations Management',
    'Work Management',
    'Enterprise Operations',
    'Team Delivery',
    'Time Tracking',
    'Quality Audits',
    'SLA Management',
    'Multi-Tenant SaaS',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={manrope.variable}>
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/20 font-sans font-normal">
        <QueryProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {children}
            <Toaster position="top-right" richColors />
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
