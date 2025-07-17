'use client';

import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Smartphone } from 'lucide-react';
import { SidebarNav } from './sidebar-nav';

export function AppShell({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();

  if (isMobile === undefined) {
    return null; // Atau tampilkan pemuat
  }

  if (!isMobile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
        <div className="text-center p-8 max-w-md bg-card rounded-2xl shadow-[6px_6px_12px_#0d0d0d,-6px_-6px_12px_#262626]">
          <Smartphone className="mx-auto h-24 w-24 text-primary mb-6" />
          <h1 className="text-3xl font-bold font-headline mb-2 text-foreground" style={{ textShadow: '1px 1px 2px #0d0d0d' }}>
            Hanya untuk Seluler
          </h1>
          <p className="text-muted-foreground text-lg">
            Aplikasi ini dirancang untuk pengalaman seluler. Silakan buka di ponsel Anda.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
      <SidebarNav />
    </div>
  );
}
