'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Phone, Bell, User } from 'lucide-react';
import { VoiceLinkLogo } from '@/components/icons/voicelink-logo';
import { 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton, 
  SidebarHeader, 
  SidebarFooter, 
  SidebarSeparator, 
  SidebarGroupLabel
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const menuItems = [
  { href: '/', label: 'Beranda', icon: Home, tooltip: "Home" },
  { href: '/calls', label: 'Panggilan', icon: Phone, tooltip: "Calls" },
  { href: '/notifications', label: 'Pemberitahuan', icon: Bell, tooltip: "Notifications" },
];

export function SidebarNav() {
  const pathname = usePathname();

  const neumorphicButton = "shadow-[3px_3px_6px_#0d0d0d,-3px_-3px_6px_#262626] hover:text-primary active:shadow-[inset_3px_3px_6px_#0d0d0d,inset_-3px_-3px_6px_#262626]";
  const activeNeumorphicButton = "shadow-[inset_3px_3px_6px_#0d0d0d,inset_-3px_-3px_6px_#262626] text-primary";

  return (
    <div className="flex flex-col h-full">
      <SidebarHeader className="p-2 justify-center">
        <div className="flex items-center gap-3 p-2">
            <VoiceLinkLogo className="h-10 w-10 text-primary" />
            <SidebarGroupLabel className="font-headline text-xl font-bold text-foreground">VoiceLink</SidebarGroupLabel>
        </div>
      </SidebarHeader>
      
      <SidebarMenu className="flex-1 px-2 py-4">
        {menuItems.map((item) => (
          <SidebarMenuItem key={item.href}>
            <Link href={item.href} legacyBehavior passHref>
              <SidebarMenuButton
                className={cn(
                  'w-full justify-start transition-all duration-200 rounded-lg hover:bg-transparent',
                  pathname === item.href ? activeNeumorphicButton : neumorphicButton
                )}
                variant="ghost"
                size="lg"
                isActive={pathname === item.href}
                tooltip={item.tooltip}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
      
      <SidebarFooter className="p-2">
        <SidebarSeparator className="my-2 bg-border" />
        <Link href="/profile" legacyBehavior passHref>
          <SidebarMenuButton
            className={cn(
              'w-full justify-start transition-all duration-200 rounded-lg h-auto p-2 hover:bg-muted',
              pathname === '/profile' && 'bg-muted'
            )}
            variant="ghost"
            isActive={pathname === '/profile'}
            tooltip="Profile"
          >
            <Avatar className="h-10 w-10 shadow-[2px_2px_4px_#0d0d0d,-2px_-2px_4px_#262626]">
                <AvatarImage src="https://placehold.co/100x100.png" alt="User Avatar" data-ai-hint="user avatar" />
                <AvatarFallback>UL</AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start">
                <span className="font-headline font-semibold text-foreground">User Ling</span>
                <span className="text-sm text-muted-foreground">Lihat Profil</span>
            </div>
          </SidebarMenuButton>
        </Link>
      </SidebarFooter>
    </div>
  );
}
