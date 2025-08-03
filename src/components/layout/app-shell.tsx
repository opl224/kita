
'use client';

import React, { useState, TouchEvent, useEffect, useCallback, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useIsMobile } from '@/hooks/use-mobile';
import { Smartphone, Plus } from 'lucide-react';
import { SidebarNav, menuItems } from './sidebar-nav';
import { cn } from '@/lib/utils';
import { getAuth, onAuthStateChanged, User, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getFirebaseApp } from '@/lib/firebase';
import { CustomLoader } from './loader';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from '../ui/button';
import { CreatePostDialog } from '@/app/post/page';
import Lottie from "lottie-react";
import kittyAnimation from '../../../public/lottie-animations/404-kitty.json';


const SWIPE_THRESHOLD = 50;

const dialogState = {
  isOpen: false,
  close: () => {},
};

export function useDialogBackButton(isOpen: boolean, onOpenChange: (open: boolean) => void) {
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (dialogState.isOpen) {
        event.preventDefault();
        dialogState.close();
      }
    };

    if (isOpen) {
      if (!dialogState.isOpen) {
        window.history.pushState({ dialogOpen: true }, '');
      }
      dialogState.isOpen = true;
      dialogState.close = () => onOpenChange(false);
      window.addEventListener('popstate', handlePopState);
    } else {
       if (dialogState.isOpen) {
         window.history.back();
       }
       dialogState.isOpen = false;
    }
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
      dialogState.isOpen = false;
    };
  }, [isOpen, onOpenChange]);
}


export function AppShell({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const router = useRouter();
  const pathname = usePathname();
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const app = getFirebaseApp();
  const auth = getAuth(app);
  const backPressCountRef = useRef(0);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

  // FAB Dialog States
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  
  const isAuthPage = pathname === '/login' || pathname === '/signup';
  const isAuthRequired = !isAuthPage;
  const isGroupChatPage = pathname.startsWith('/calls/') && pathname.split('/').length > 2;
  const isCallsPage = pathname === '/calls';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        if (isAuthRequired) {
          router.push('/login');
        }
      }
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [auth, isAuthRequired, router]);

  useEffect(() => {
    if (loading) return;

    if (!user && isAuthRequired) {
      router.push('/login');
    }
    if (user && isAuthPage) {
      router.push('/');
    }
  }, [user, loading, isAuthRequired, isAuthPage, pathname, router]);

  // Anti-inspect logic
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      const handleContextMenu = (e: MouseEvent) => {
        e.preventDefault();
        alert('Fitur ini dinonaktifkan.');
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        // Blokir F12, Ctrl+Shift+I, Ctrl+Shift+C, Ctrl+Shift+J, Ctrl+U, Ctrl+S
        if (e.key === 'F12' || e.code === 'F12' || e.keyCode === 123 ||
           (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.keyCode === 73)) ||
           (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c' || e.keyCode === 67)) ||
           (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j' || e.keyCode === 74)) ||
           (e.ctrlKey && (e.key === 'U' || e.key === 'u' || e.keyCode === 85)) ||
           (e.ctrlKey && (e.key === 'S' || e.key === 's' || e.keyCode === 83))) {
          e.preventDefault();
          return false;
        }
      };
      
      const antiDebug = () => {
        const check = () => {
          if ((window.outerWidth - window.innerWidth) > 100 || (window.outerHeight - window.innerHeight) > 100) {
            debugger;
          }
          function checkDebugger() {
            const start = new Date().getTime();
            debugger;
            const end = new Date().getTime();
            if (end - start > 100) {
              // DevTools are open
            }
          }
          checkDebugger();
        };
        const intervalId = setInterval(check, 1000);
        return () => clearInterval(intervalId);
      };

      document.addEventListener('contextmenu', handleContextMenu);
      document.addEventListener('keydown', handleKeyDown);
      const cleanupAntiDebug = antiDebug();

      return () => {
        document.removeEventListener('contextmenu', handleContextMenu);
        document.removeEventListener('keydown', handleKeyDown);
        cleanupAntiDebug();
      };
    }
  }, []);

  // Reset back press count whenever the page changes
  useEffect(() => {
    backPressCountRef.current = 0;
  }, [pathname]);

  const handlePopState = useCallback((event: PopStateEvent) => {
    event.preventDefault();
    
    if (dialogState.isOpen) {
        dialogState.close();
        return;
    }

    backPressCountRef.current += 1;
    
    if (backPressCountRef.current === 1) {
        setTimeout(() => {
            backPressCountRef.current = 0;
        }, 2000); 
    } else if (backPressCountRef.current === 2) {
        setIsLogoutDialogOpen(true);
        backPressCountRef.current = 0;
    }
    
    window.history.pushState(null, '');
  }, []); 

  useEffect(() => {
    window.history.pushState(null, '');
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [handlePopState]); 

  async function handleLogout() {
    try {
      await signOut(auth);
      setIsLogoutDialogOpen(false);
      router.push('/login');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  }

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

  const showPostFab = user && pathname === '/post';

  if (loading || isMobile === undefined) {
    return <CustomLoader />;
  }

  if (!isMobile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
        <div className="relative">
          <Lottie 
            animationData={kittyAnimation} 
            loop={true} 
            className="absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-48 z-10" 
          />
          <div className="text-center p-8 pt-20 max-w-md bg-card rounded-2xl shadow-neumorphic-outset">
            <h1 className="text-3xl font-bold font-headline mb-2 text-foreground" style={{ textShadow: '1px 1px 2px #0d0d0d' }}>
              Hanya untuk Seluler
            </h1>
            <p className="text-muted-foreground text-lg">
              Aplikasi ini dirancang untuk pengalaman seluler. Silakan buka di ponsel untuk menggunakan aplikasi ini.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if ((!user && isAuthRequired)) {
    return <CustomLoader />;
  }
  
  if (user && isAuthPage) {
     return <CustomLoader />;
  }


  return (
    <div 
      className="flex flex-col h-screen"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <main className={cn("flex-1 overflow-y-auto", { "p-4 sm:p-6 lg:p-8": !isGroupChatPage && !isCallsPage })}>
        {children}
      </main>
      {user && !isGroupChatPage && <SidebarNav />}

      {showPostFab && (
          <Button
            size="icon"
            className="fixed bottom-24 right-4 h-16 w-16 rounded-full bg-primary text-primary-foreground shadow-neumorphic-outset active:shadow-neumorphic-inset transition-all z-20"
            onClick={() => setIsCreatePostOpen(true)}
          >
            <Plus className="h-8 w-8" />
            <span className="sr-only">Buat Postingan Baru</span>
          </Button>
      )}

      {/* Dialogs controlled by AppShell */}
      <CreatePostDialog open={isCreatePostOpen} onOpenChange={setIsCreatePostOpen} user={user} />


      <AlertDialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Konfirmasi Keluar</AlertDialogTitle>
                    <AlertDialogDescription>
                        Apakah Anda yakin ingin keluar dari aplikasi? Anda akan dikembalikan ke halaman login.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setIsLogoutDialogOpen(false)}>Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={handleLogout}>Keluar</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
