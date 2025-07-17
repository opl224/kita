'use client';

import React from 'react';
import { SidebarProvider, Sidebar, SidebarInset, SidebarRail } from '@/components/ui/sidebar';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { useIsMobile } from '@/hooks/use-mobile';
import { Smartphone } from 'lucide-react';

export function AppShell({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();

  // On initial render, isMobile can be undefined. We can show a blank screen or a loader.
  if (isMobile === undefined) {
    return null;
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
    <SidebarProvider>
      <Sidebar variant="inset" collapsible="icon" className="border-r-0 shadow-[8px_0px_16px_#0a0a0a] z-20">
        <SidebarNav />
      </Sidebar>
      <SidebarRail />
      <SidebarInset>
        <div className="min-h-screen w-full p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
