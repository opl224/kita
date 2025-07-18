
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, AudioWaveform, Bell, User, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useEffect, useState }from 'react';
import { getFirestore, collection, onSnapshot, query, where, doc, updateDoc, serverTimestamp, orderBy, Timestamp } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { app } from '@/lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';

export const menuItems = [
  { href: '/', label: 'Beranda', icon: Home, notificationKey: '' },
  { href: '/calls', label: 'VN', icon: AudioWaveform, notificationKey: 'calls' },
  { href: '/post', label: 'Postingan', icon: Plus, notificationKey: '' },
  { href: '/notifications', label: 'Notifikasi', icon: Bell, notificationKey: 'notifications' },
  { href: '/profile', label: 'Profil', icon: User, notificationKey: '' },
];

type NotificationDoc = {
    id: string;
    createdAt: Timestamp;
    [key: string]: any;
};

export function SidebarNav() {
  const pathname = usePathname();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  
  // State for last seen timestamps
  const [lastSeen, setLastSeen] = useState<{ notifications: Date | null, calls: Date | null }>({ notifications: null, calls: null });
  
  // State for raw data from Firestore
  const [generalNotifications, setGeneralNotifications] = useState<NotificationDoc[]>([]);
  const [invitations, setInvitations] = useState<NotificationDoc[]>([]);
  
  // State for calculated counts
  const [newGeneralNotificationsCount, setNewGeneralNotificationsCount] = useState(0);
  const [newCallNotificationsCount, setNewCallNotificationsCount] = useState(0);
  
  const [combinedNotificationCount, setCombinedNotificationCount] = useState(0);

  const db = getFirestore(app);
  const auth = getAuth(app);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        // Reset all states on logout
        setLastSeen({ notifications: null, calls: null });
        setGeneralNotifications([]);
        setInvitations([]);
        setNewGeneralNotificationsCount(0);
        setNewCallNotificationsCount(0);
      }
    });
    return () => unsubscribeAuth();
  }, [auth]);

  // Effect to listen for user document changes (lastSeen timestamps)
  useEffect(() => {
    if (!user) return;
    
    const userDocRef = doc(db, "users", user.uid);
    const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        setLastSeen({
          notifications: userData.lastSeenNotifications?.toDate() || new Date(0),
          calls: userData.lastSeenCalls?.toDate() || new Date(0)
        });
      }
    });
    
    return () => unsubscribeUser();
  }, [user, db]);

  // Effect to fetch ALL general notifications for the user
  useEffect(() => {
    if (!user) return;
    
    const notificationsQuery = query(collection(db, "users", user.uid, "notifications"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(notificationsQuery, (querySnapshot) => {
        const notifs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NotificationDoc));
        setGeneralNotifications(notifs);
    });

    return () => unsubscribe();
  }, [user, db]);

  // Effect to fetch ALL pending invitations
  useEffect(() => {
      if (!user) return;

      const invitationsQuery = query(
          collection(db, 'invitations'),
          where('userId', '==', user.uid),
          where('status', '==', 'pending')
      );
      const unsubscribe = onSnapshot(invitationsQuery, (invitesSnapshot) => {
          const invites = invitesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NotificationDoc));
          setInvitations(invites);
      });

      return () => unsubscribe();
  }, [user, db]);

  // Effect to calculate new general notifications based on client-side filtering
  useEffect(() => {
    // If on the notifications page, force count to 0 immediately
    if (pathname === '/notifications') {
        setNewGeneralNotificationsCount(0);
        return;
    }

    if (lastSeen.notifications === null) return;
    
    const newGeneralCount = generalNotifications.filter(n => n.createdAt.toDate() > lastSeen.notifications!).length;
    const newInvitationCount = invitations.length; // Invitations are always "new" until actioned
    
    setNewGeneralNotificationsCount(newGeneralCount + newInvitationCount);

  }, [generalNotifications, invitations, lastSeen.notifications, pathname]);

  // Effect for new voice notes in groups
  useEffect(() => {
    if (!user || lastSeen.calls === null) return;
    
    // If on the calls page, force count to 0 immediately
    if (pathname.startsWith('/calls')) {
        setNewCallNotificationsCount(0);
        return;
    }

    const groupsQuery = query(
      collection(db, 'groups'),
      where('members', 'array-contains', user.uid),
      where('lastMessageTime', '>', lastSeen.calls)
    );

    const unsubscribeGroups = onSnapshot(groupsQuery, (groupsSnapshot) => {
        setNewCallNotificationsCount(groupsSnapshot.size);
    }, (error) => {
        // This can happen if the index isn't ready, we can ignore it for now
        // as it will retry.
    });

    return () => unsubscribeGroups();
  }, [user, db, lastSeen.calls, pathname]);

  // Effect to combine notification counts for display
  useEffect(() => {
    setCombinedNotificationCount(newGeneralNotificationsCount + newCallNotificationsCount);
  }, [newGeneralNotificationsCount, newCallNotificationsCount]);


  const neumorphicBase = "transition-all duration-300 rounded-xl";
  const neumorphicButton = `bg-background shadow-neumorphic-outset ${neumorphicBase}`;
  const activeNeumorphicButton = `bg-background shadow-neumorphic-inset text-primary ${neumorphicBase}`;

  return (
    <TooltipProvider>
      <nav className="sticky bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-t-0 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_12px_rgba(0,0,0,0.2)]">
        <div className="flex justify-around items-center h-20 px-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            let hasNotification = false;
            
            // The notification count logic is now more robust
            if (item.notificationKey === 'notifications') {
                hasNotification = newGeneralNotificationsCount > 0;
            } else if (item.notificationKey === 'calls') {
                hasNotification = newCallNotificationsCount > 0;
            }

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
