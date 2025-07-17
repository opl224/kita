
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Phone, Bell, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useEffect, useState } from 'react';
import { getFirestore, collection, onSnapshot, query, where, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { app } from '@/lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';

export const menuItems = [
  { href: '/', label: 'Beranda', icon: Home, notificationKey: '' },
  { href: '/calls', label: 'Panggilan', icon: Phone, notificationKey: '' },
  { href: '/notifications', label: 'Notifikasi', icon: Bell, notificationKey: 'notifications' },
  { href: '/profile', label: 'Profil', icon: User, notificationKey: '' },
];

export function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [notificationCount, setNotificationCount] = useState(0);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const db = getFirestore(app);
  const auth = getAuth(app);


  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
    });
    return () => unsubscribeAuth();
  }, [auth]);
  
  const updateLastSeen = () => {
    if (user) {
        const userDocRef = doc(db, "users", user.uid);
        updateDoc(userDocRef, {
            lastSeenNotifications: serverTimestamp()
        }).catch(err => {
            console.error("Failed to update lastSeenNotifications:", err);
        });
    }
  };

  useEffect(() => {
    if (!user) {
        setNotificationCount(0);
        return;
    }

    const userDocRef = doc(db, "users", user.uid);

    const unsubscribeUser = onSnapshot(userDocRef, (userSnap) => {
        if (!userSnap.exists()) return;
        
        const userData = userSnap.data();
        const lastSeen = userData.lastSeenNotifications?.toDate() || new Date(0);
        
        const q = query(
            collection(db, "notifications"),
            where("createdAt", ">", lastSeen)
        );

        const unsubscribeNotifications = onSnapshot(q, (querySnapshot) => {
            // Hanya update count jika tidak di halaman notifikasi
            if (pathname !== '/notifications') {
                setNotificationCount(querySnapshot.size);
            } else {
                setNotificationCount(0); // Pastikan count 0 jika sudah di halaman notifikasi
            }
        }, (error) => {
            console.error("Error fetching notification count:", error);
        });

        return () => unsubscribeNotifications();
    }, (error) => {
        console.error("Error fetching user data for notifications:", error);
    });

    // Jika pengguna sudah berada di halaman notifikasi, update last seen
    if (pathname === '/notifications') {
        updateLastSeen();
        setNotificationCount(0);
    }

    return () => unsubscribeUser();
  }, [db, user, pathname]);

  const handleNotificationClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault(); 
    
    setNotificationCount(0);
    updateLastSeen();
    
    router.push('/notifications');
  };


  const neumorphicBase = "transition-all duration-300 rounded-xl";
  const neumorphicButton = `bg-background shadow-neumorphic-outset ${neumorphicBase}`;
  const activeNeumorphicButton = `bg-background shadow-neumorphic-inset text-primary ${neumorphicBase}`;

  return (
    <TooltipProvider>
      <nav className="sticky bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-t-0 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_12px_rgba(0,0,0,0.2)]">
        <div className="flex justify-around items-center h-20 px-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const isNotificationItem = item.notificationKey === 'notifications';
            const hasNotification = isNotificationItem && notificationCount > 0;
            
            const linkProps = isNotificationItem 
                ? { onClick: handleNotificationClick } 
                : {};

            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link href={item.href} {...linkProps} className={cn(
                        "relative flex flex-col items-center justify-center w-16 h-16 gap-1 text-muted-foreground border-none",
                        isActive ? activeNeumorphicButton : neumorphicButton,
                        isActive && 'text-primary'
                      )}>
                      <item.icon className={cn("h-6 w-6 transition-transform", isActive ? 'scale-110' : '')} />
                       {hasNotification && (
                          <span className="absolute top-3 right-3 block h-3 w-3 rounded-full bg-destructive border-2 border-background" />
                       )}
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
