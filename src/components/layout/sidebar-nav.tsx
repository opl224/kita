'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Phone, Bell, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export const menuItems = [
  { href: '/', label: 'Beranda', icon: Home },
  { href: '/calls', label: 'Panggilan', icon: Phone },
  { href: '/notifications', label: 'Notifikasi', icon: Bell },
  { href: '/profile', label: 'Profil', icon: User },
];

export function SidebarNav() {
  const pathname = usePathname();

  const neumorphicBase = "transition-all duration-300 rounded-xl";
  const neumorphicButton = `bg-background shadow-[4px_4px_8px_#0d0d0d,-4px_-4px_8px_#262626] ${neumorphicBase}`;
  const activeNeumorphicButton = `bg-background shadow-[inset_4px_4px_8px_#0d0d0d,inset_-4px_-4px_8px_#262626] text-primary ${neumorphicBase}`;

  return (
    <TooltipProvider>
      <nav className="sticky bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-t border-border shadow-[0_-4px_12px_rgba(0,0,0,0.2)]">
        <div className="flex justify-around items-center h-20 px-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link href={item.href} className={cn(
                        "flex flex-col items-center justify-center w-16 h-16 gap-1 text-muted-foreground",
                        isActive ? activeNeumorphicButton : neumorphicButton,
                        isActive && 'text-primary'
                      )}>
                      <item.icon className={cn("h-6 w-6 transition-transform", isActive ? 'scale-110' : '')} />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="top" className={cn(isActive && 'hidden')}>
                  <p>{item.label}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </nav>
    </TooltipProvider>
  );
}
