import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/layout/sidebar';

export const metadata: Metadata = {
  title: 'Voima - Plataforma de Gestão de Compras para Obras',
  description: 'Gestão inteligente de compras, cotações e controle financeiro para construtoras',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-7">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
