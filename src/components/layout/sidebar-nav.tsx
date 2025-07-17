
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Phone, Bell, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useEffect, useState }from 'react';
import { getFirestore, collection, onSnapshot, query, where, doc } from 'firebase/firestore';
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
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [totalUnseenCount, setTotalUnseenCount] = useState(0);
  const db = getFirestore(app);
  const auth = getAuth(app);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setTotalUnseenCount(0);
      }
    });
    return () => unsubscribeAuth();
  }, [auth]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);

    const unsubscribeUser = onSnapshot(userDocRef, (userSnap) => {
      if (!userSnap.exists()) return;

      const userData = userSnap.data();
      const lastSeen = userData.lastSeenNotifications?.toDate() || new Date(0);

      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('createdAt', '>', lastSeen)
      );
      
      const invitationsQuery = query(
        collection(db, 'invitations'),
        where('userId', '==', user.uid),
        where('status', '==', 'pending')
      );

      let unseenNotifications = 0;
      let unseenInvitations = 0;

      const unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
        unseenNotifications = snapshot.size;
        setTotalUnseenCount(unseenNotifications + unseenInvitations);
      });

      const unsubscribeInvitations = onSnapshot(invitationsQuery, (snapshot) => {
        unseenInvitations = snapshot.size;
        setTotalUnseenCount(unseenNotifications + unseenInvitations);
      });

      return () => {
        unsubscribeNotifications();
        unsubscribeInvitations();
      };
    }, (error) => {
      console.error("Error fetching user data for notifications:", error);
    });

    return () => {
      unsubscribeUser();
    };
  }, [db, user]);

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
            const hasNotification = isNotificationItem && totalUnseenCount > 0 && pathname !== '/notifications';

            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link href={item.href} className={cn(
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
