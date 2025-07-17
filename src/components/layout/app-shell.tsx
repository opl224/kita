
'use client';

import React, { useState, TouchEvent, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useIsMobile } from '@/hooks/use-mobile';
import { Smartphone } from 'lucide-react';
import { SidebarNav, menuItems } from './sidebar-nav';
import { cn } from '@/lib/utils';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { app } from '@/lib/firebase';
import LoginPage from '@/app/login/page';
import { CustomLoader } from './loader';

const SWIPE_THRESHOLD = 50; // Jarak minimum dalam piksel untuk dianggap sebagai swipe

export function AppShell({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const router = useRouter();
  const pathname = usePathname();
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const auth = getAuth(app);
  
  const authRequiredRoutes = ['/', '/calls', '/notifications', '/profile'];
  const isAuthRequired = authRequiredRoutes.some(route => pathname.startsWith(route)) && pathname !== '/calls' ? pathname === '/' || pathname === '/notifications' || pathname === '/profile' : authRequiredRoutes.includes(pathname);
  const isAuthPage = pathname === '/login' || pathname === '/signup';
  const isGroupChatPage = pathname.startsWith('/calls/') && pathname.split('/').length > 2;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (!currentUser && isAuthRequired) {
        router.push('/login');
      }
      if(currentUser && isAuthPage){
        router.push('/');
      }
    });

    return () => unsubscribe();
  }, [auth, router, isAuthRequired, isAuthPage]);

  const handleTouchStart = (e: TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd || !isAuthRequired || isGroupChatPage) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > SWIPE_THRESHOLD;
    const isRightSwipe = distance < -SWIPE_THRESHOLD;

    const currentIndex = menuItems.findIndex((item) => item.href === pathname);
    
    if (isLeftSwipe) {
      if (currentIndex < menuItems.length - 1) {
        router.push(menuItems[currentIndex + 1].href);
      }
    } else if (isRightSwipe) {
      if (currentIndex > 0) {
        router.push(menuItems[currentIndex - 1].href);
      }
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  if (loading || isMobile === undefined) {
    return <CustomLoader />;
  }

  if (!isMobile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
        <div className="text-center p-8 max-w-md bg-card rounded-2xl shadow-neumorphic-outset">
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

  if (!user && isAuthRequired) {
    return <LoginPage />;
  }

  if (isAuthPage) {
    return <>{children}</>;
  }


  return (
    <div 
      className="flex flex-col h-screen"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <main className={cn("flex-1 overflow-y-auto", { "p-4 sm:p-6 lg:p-8": !isGroupChatPage }, "animate-in fade-in-50")}>
        {children}
      </main>
      {!isGroupChatPage && <SidebarNav />}
    </div>
  );
}
