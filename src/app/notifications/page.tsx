
'use client';

import { Card } from "@/components/ui/card";
import { Bell, Coins } from "lucide-react";
import { useEffect, useState } from "react";
import { getFirestore, collection, onSnapshot, query, orderBy, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { app } from "@/lib/firebase";
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';

type Notification = {
  id: string;
  message: string;
  createdAt: any;
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const db = getFirestore(app);
  const auth = getAuth(app);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribeAuth();
  }, [auth]);

  useEffect(() => {
    if (user) {
      const userDocRef = doc(db, "users", user.uid);
      updateDoc(userDocRef, {
        lastSeenNotifications: serverTimestamp()
      }).catch(err => console.error("Error updating last seen notifications:", err));
    }
  }, [user, db]);

  useEffect(() => {
    const q = query(collection(db, "notifications"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedNotifications: Notification[] = [];
      querySnapshot.forEach((doc) => {
        fetchedNotifications.push({ id: doc.id, ...doc.data() } as Notification);
      });
      setNotifications(fetchedNotifications);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [db]);


  return (
    <div className="flex flex-col gap-8 animate-in fade-in-50">
      <header className="flex justify-between items-center">
        <div>
            <h1 className="text-4xl font-headline font-bold text-foreground" style={{ textShadow: '1px 1px 2px #0d0d0d' }}>
              Pemberitahuan
            </h1>
            <p className="text-muted-foreground mt-1">Semua pembaruan Anda ada di sini.</p>
        </div>
      </header>

      <main className="space-y-4">
        {loading ? (
            <p>Memuat pemberitahuan...</p>
        ) : notifications.length === 0 ? (
            <Card className="flex flex-col items-center justify-center p-12 text-center bg-background rounded-2xl shadow-neumorphic-inset">
                <Bell className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-foreground">Tidak Ada Pemberitahuan</h3>
                <p className="text-muted-foreground">Pemberitahuan baru akan muncul di sini.</p>
            </Card>
        ) : (
            <div className="space-y-4">
                {notifications.map(notif => (
                    <Card key={notif.id} className="p-4 rounded-xl shadow-neumorphic-outset">
                        <div className="flex items-start gap-4">
                           <div className="bg-yellow-500/20 p-2 rounded-full mt-1">
                               <Coins className="h-5 w-5 text-yellow-500" />
                           </div>
                           <div className="flex-1">
                               <p className="text-foreground">{notif.message}</p>
                               <p className="text-xs text-muted-foreground mt-1">
                                   {notif.createdAt ? formatDistanceToNow(notif.createdAt.toDate(), { addSuffix: true, locale: id }) : 'baru saja'}
                               </p>
                           </div>
                        </div>
                    </Card>
                ))}
            </div>
        )}
      </main>
    </div>
  );
}
