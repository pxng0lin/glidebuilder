import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Providers } from './providers';
import { Header } from '@/components/header';

export const metadata: Metadata = {
  title: 'GlideBuilder - AI-Powered Vulnerability Detection',
  description:
    'Transform vulnerability reports into production-ready Glider detection scripts using AI.',
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className="app-body">
        <Providers>
          <main className="main-container">
            <Header />
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
