
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
  const [lastSeen, setLastSeen] = useState<{ notifications: Date | null, calls: Date | null }>({ notifications: null, calls: null });
  
  const [allGeneralNotifications, setAllGeneralNotifications] = useState<NotificationDoc[]>([]);
  const [allInvitations, setAllInvitations] = useState<NotificationDoc[]>([]);
  const [newCallNotifications, setNewCallNotifications] = useState(0);
  
  const [notificationCounts, setNotificationCounts] = useState({ notifications: 0, calls: 0 });

  const db = getFirestore(app);
  const auth = getAuth(app);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setNotificationCounts({ notifications: 0, calls: 0 });
        setLastSeen({ notifications: null, calls: null });
        setAllGeneralNotifications([]);
        setAllInvitations([]);
        setNewCallNotifications(0);
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
    }, (error) => {
        console.error("Error listening to user document:", error);
    });
    
    return () => unsubscribeUser();
  }, [user, db]);

  // Effect to fetch ALL general notifications
  useEffect(() => {
    if (!user) return;
    
    const notificationsQuery = query(collection(db, "notifications"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(notificationsQuery, (querySnapshot) => {
        const notifs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NotificationDoc));
        setAllGeneralNotifications(notifs);
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
          setAllInvitations(invites);
      });

      return () => unsubscribe();
  }, [user, db]);

  // Effect to calculate new general notifications based on client-side filtering
  useEffect(() => {
    if (lastSeen.notifications === null) return;

    const newGeneralCount = allGeneralNotifications.filter(n => n.createdAt.toDate() > lastSeen.notifications!).length;
    const newInvitationCount = allInvitations.length; // Invitations are always "new" until actioned
    
    setNotificationCounts(prev => ({ ...prev, notifications: newGeneralCount + newInvitationCount }));

  }, [allGeneralNotifications, allInvitations, lastSeen.notifications]);


  // Effect for new voice notes in groups
  useEffect(() => {
    if (!user || lastSeen.calls === null) return;
    
    const groupsQuery = query(
      collection(db, 'groups'),
      where('members', 'array-contains', user.uid),
      where('lastMessageTime', '>', lastSeen.calls)
    );

    const unsubscribeGroups = onSnapshot(groupsQuery, (groupsSnapshot) => {
        if (pathname === '/calls') {
          setNewCallNotifications(0);
        } else {
          setNewCallNotifications(groupsSnapshot.size);
        }
    });

    return () => unsubscribeGroups();
  }, [user, db, lastSeen.calls, pathname]);

  // Effect to combine notification counts
  useEffect(() => {
    setNotificationCounts(prev => ({...prev, calls: newCallNotifications}));
  }, [newCallNotifications]);


  // Effect to clear call notifications when on the /calls page
  useEffect(() => {
      if (pathname === '/calls' && user) {
          const userDocRef = doc(db, 'users', user.uid);
          updateDoc(userDocRef, {
              lastSeenCalls: serverTimestamp()
          }).catch(err => console.error("Error updating last seen calls timestamp:", err));
      }
  }, [pathname, user, db]);


  const neumorphicBase = "transition-all duration-300 rounded-xl";
  const neumorphicButton = `bg-background shadow-neumorphic-outset ${neumorphicBase}`;
  const activeNeumorphicButton = `bg-background shadow-neumorphic-inset text-primary ${neumorphicBase}`;

  return (
    <TooltipProvider>
      <nav className="sticky bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-t-0 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_12px_rgba(0,0,0,0.2)]">
        <div className="flex justify-around items-center h-20 px-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const notificationKey = item.notificationKey as keyof typeof notificationCounts;
            const hasNotification = notificationKey && notificationCounts[notificationKey] > 0;

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
