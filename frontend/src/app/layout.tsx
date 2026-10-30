import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import './globals.css';
import '@/lib/session-isolation';
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
        <script
          id="session-isolation-boot"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window === 'undefined' || !window.localStorage || !window.sessionStorage) return;
                try {
                  var ISOLATED_KEYS = { 'accessToken': true, 'activeWorkspaceId': true };
                  var originalGetItem = localStorage.getItem.bind(localStorage);
                  var originalSetItem = localStorage.setItem.bind(localStorage);
                  var originalRemoveItem = localStorage.removeItem.bind(localStorage);

                  if (!window.__sessionIsolated) {
                    window.__sessionIsolated = true;

                    localStorage.getItem = function(key) {
                      if (ISOLATED_KEYS[key]) {
                        try {
                          var sessionVal = sessionStorage.getItem(key);
                          if (sessionVal !== null && sessionVal !== '') {
                            return sessionVal;
                          }
                          var localVal = originalGetItem(key);
                          if (localVal !== null && localVal !== '') {
                            sessionStorage.setItem(key, localVal);
                            return localVal;
                          }
                          return null;
                        } catch (e) {
                          return originalGetItem(key);
                        }
                      }
                      return originalGetItem(key);
                    };

                    localStorage.setItem = function(key, value) {
                      if (ISOLATED_KEYS[key]) {
                        try {
                          sessionStorage.setItem(key, value);
                        } catch (e) {}
                        return; // Prevent writing to shared localStorage
                      }
                      originalSetItem(key, value);
                    };

                    localStorage.removeItem = function(key) {
                      if (ISOLATED_KEYS[key]) {
                        try {
                          sessionStorage.removeItem(key);
                        } catch (e) {}
                        try {
                          originalRemoveItem(key);
                        } catch (e) {}
                        return;
                      }
                      originalRemoveItem(key);
                    };
                  }
                } catch (err) {}
              })();
            `,
          }}
        />
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
