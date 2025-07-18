
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Voicemail, Bell, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useEffect, useState }from 'react';
import { getFirestore, collection, onSnapshot, query, where, doc, updateDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { app } from '@/lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';

export const menuItems = [
  { href: '/', label: 'Beranda', icon: Home, notificationKey: '' },
  { href: '/calls', label: 'Panggilan', icon: Voicemail, notificationKey: 'calls' },
  { href: '/notifications', label: 'Notifikasi', icon: Bell, notificationKey: 'notifications' },
  { href: '/profile', label: 'Profil', icon: User, notificationKey: '' },
];

export function SidebarNav() {
  const pathname = usePathname();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [notificationCounts, setNotificationCounts] = useState({ notifications: 0, calls: 0 });
  const db = getFirestore(app);
  const auth = getAuth(app);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setNotificationCounts({ notifications: 0, calls: 0 });
      }
    });
    return () => unsubscribeAuth();
  }, [auth]);

  useEffect(() => {
    if (!user) {
      return;
    }

    // Listener for new group invitations (notifications)
    const invitationsQuery = query(
      collection(db, 'invitations'),
      where('userId', '==', user.uid),
      where('status', '==', 'pending')
    );
    const unsubscribeInvites = onSnapshot(invitationsQuery, (snapshot) => {
        setNotificationCounts(prev => ({ ...prev, notifications: snapshot.size }));
    });
    
    // Listener for new voice notes in groups (calls)
    let unsubscribeGroups: () => void = () => {};
    
    const groupsQuery = query(
      collection(db, 'groups'),
      where('members', 'array-contains', user.uid)
    );
    
    unsubscribeGroups = onSnapshot(groupsQuery, async (groupsSnapshot) => {
      try {
          const userDocSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', user.uid)));
          if (userDocSnap.empty) return;
          
          const userData = userDocSnap.docs[0].data();
          const lastSeenCalls = userData.lastSeenCalls?.toDate() || new Date(0);

          let newMessagesCount = 0;
          groupsSnapshot.forEach(groupDoc => {
              const groupData = groupDoc.data();
              const lastMessageTime = groupData.lastMessageTime?.toDate();
              if (lastMessageTime && lastMessageTime > lastSeenCalls && groupData.lastMessage) {
                  if (pathname !== '/calls') {
                    newMessagesCount++;
                  }
              }
          });
          setNotificationCounts(prev => ({ ...prev, calls: newMessagesCount }));
      } catch (error) {
          console.error("Error fetching user data for notification count:", error);
      }
    });

    return () => {
      unsubscribeInvites();
      unsubscribeGroups();
    };
  }, [db, user, pathname]);

  // Effect to clear call notifications when on the /calls page
  useEffect(() => {
      if (pathname === '/calls' && user) {
          const userDocRef = doc(db, 'users', user.uid);
          updateDoc(userDocRef, {
              lastSeenCalls: serverTimestamp()
          }).catch(err => console.error("Error updating last seen calls timestamp:", err));
          
          // Instantly clear the notification dot in the UI
          setNotificationCounts(prev => ({ ...prev, calls: 0 }));
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
