import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'MouseAI',
  description: 'Yapay zekâ operasyon ve görev yönetim platformu',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
