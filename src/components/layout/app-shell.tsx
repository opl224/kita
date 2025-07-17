'use client';

import React from 'react';
import { SidebarProvider, Sidebar, SidebarInset, SidebarRail } from '@/components/ui/sidebar';
import { SidebarNav } from '@/components/layout/sidebar-nav';

export function AppShell({ children }: { children: React.ReactNode }) {
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
