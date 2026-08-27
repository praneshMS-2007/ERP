import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import ClientLayout from '@/components/layout/ClientLayout';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Shuroq ERP Platform',
  description: 'Shuroq Enterprise Resource Planning Platform — Tech Redefined',
  icons: {
    icon: '/shuroq-icon.png',
    apple: '/shuroq-icon.png',
  },
};

// Settings > Preferences saves the chosen theme to localStorage and applies
// it live (document.documentElement.setAttribute('data-theme', ...)) — but
// that DOM attribute isn't part of anything Next.js persists across a real
// page load. Without this, a saved "Dark" preference silently reverted to
// light on every refresh or new tab, even though localStorage still said
// dark the whole time (confirmed live: SPA navigation kept dark mode, a
// hard reload didn't). This runs synchronously before paint — inside a
// <head> script, not a React effect — specifically to avoid a flash of the
// wrong theme while React itself is still hydrating.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var theme = localStorage.getItem('theme') || 'light';
    var isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', isDark);
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // suppressHydrationWarning below is scoped to just the <html> element
  // (React doesn't propagate it to children) — it exists specifically
  // because THEME_INIT_SCRIPT intentionally sets data-theme/class on
  // <html> before React hydrates, which the server-rendered markup never
  // had. Confirmed via cross-browser testing (Chromium/Firefox/WebKit)
  // this was surfacing as a console hydration-mismatch warning on every
  // page load; harmless in practice (React already leaves the client's
  // DOM alone here — "this won't be patched up" — so the theme itself was
  // never actually broken by it) but worth silencing properly rather than
  // leaving a real warning about an intentional, expected mismatch.
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className={`${inter.className} ${inter.variable}`}>
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
