import { AuthProvider } from '../context/AuthContext';
import ThemeProvider from '../components/providers/ThemeProvider';
import ErrorBoundary from '../components/ErrorBoundary';
import Navbar from '../components/Navbar';
import MobileBottomNav from '../components/MobileBottomNav';
import { Toaster } from 'sonner';
import './globals.css';
import ServiceWorkerRegister from '../components/ServiceWorkerRegister';

export const metadata = {
  title: 'CampusHub - Campus Management System',
  description: 'Modern campus management system with comprehensive features for students, faculty, and administrators',
  keywords: 'campus, management, education, students, faculty, attendance, marks',
  authors: [{ name: 'CampusHub Team' }],
  manifest: '/manifest.json',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    title: 'CampusHub - Central Campus Management System',
    description: 'Modern campus management system for students, faculty, and administrators',
    images: [{ url: '/logo.png', width: 1400, height: 400, alt: 'CampusHub Logo' }],
  },
  metadataBase: process.env.NEXT_PUBLIC_METADATA_BASE ? new URL(process.env.NEXT_PUBLIC_METADATA_BASE) : new URL('http://localhost:3000'),
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="antialiased">
        <ErrorBoundary fallbackMessage="Something went wrong with the application">
          <ThemeProvider>
            <AuthProvider>
              <div className="min-h-screen bg-white dark:bg-gray-900">
                <Navbar />
                <main className="pb-24 lg:pb-8">
                  <ErrorBoundary fallbackMessage="This page encountered an error">
                    {children}
                  </ErrorBoundary>
                </main>
                <MobileBottomNav />
              </div>
              <Toaster 
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  className: 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100',
                }}
              />
            </AuthProvider>
          </ThemeProvider>
        </ErrorBoundary>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}