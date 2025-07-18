
'use client';

import { Card } from "@/components/ui/card";
import { Bell, Coins, UserCheck, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { getFirestore, collection, onSnapshot, query, orderBy, doc, updateDoc, serverTimestamp, where, arrayUnion } from "firebase/firestore";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { app } from "@/lib/firebase";
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CustomLoader } from "@/components/layout/loader";

type Notification = {
  id: string;
  message: string;
  createdAt: any;
};

type Invitation = {
  id: string;
  groupId: string;
  groupName: string;
  invitedBy: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: any;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [processingInvite, setProcessingInvite] = useState<string | null>(null);
  const db = getFirestore(app);
  const auth = getAuth(app);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, [auth]);

  // Effect to fetch notifications, invitations and update last seen timestamp
  useEffect(() => {
    if (!user) {
        setNotifications([]);
        setInvitations([]);
        if (auth.currentUser === null) { // Only set loading false if auth state is determined
          setLoading(false);
        }
        return;
    }

    setLoading(true);
    // Mark all notifications as seen when the user visits this page
    const userDocRef = doc(db, "users", user.uid);
    updateDoc(userDocRef, {
      lastSeenNotifications: serverTimestamp()
    }).catch(err => console.error("Error updating last seen timestamp:", err));
    
    // Fetch general notifications
    const notifQuery = query(collection(db, "notifications"), orderBy("createdAt", "desc"));
    const unsubscribeNotifs = onSnapshot(notifQuery, (querySnapshot) => {
      const fetchedNotifications: Notification[] = [];
      querySnapshot.forEach((doc) => {
        fetchedNotifications.push({ id: doc.id, ...doc.data() } as Notification);
      });
      setNotifications(fetchedNotifications);
      setLoading(false);
    }, (error) => {
        console.error("Error fetching notifications:", error);
        setLoading(false);
    });

    // Fetch pending invitations
    const inviteQuery = query(
        collection(db, "invitations"),
        where("userId", "==", user.uid),
        where("status", "==", "pending"),
        orderBy("createdAt", "desc")
    );
    const unsubscribeInvites = onSnapshot(inviteQuery, (querySnapshot) => {
        const fetchedInvitations: Invitation[] = [];
        querySnapshot.forEach((doc) => {
            fetchedInvitations.push({ id: doc.id, ...doc.data() } as Invitation);
        });
        setInvitations(fetchedInvitations);
    }, (error) => {
        console.error("Error fetching invitations:", error);
    });

    return () => {
        unsubscribeNotifs();
        unsubscribeInvites();
    };
  }, [db, user]);

  const handleInvitation = async (invitation: Invitation, accept: boolean) => {
    if (!user) return;
    setProcessingInvite(invitation.id);

    const invitationRef = doc(db, "invitations", invitation.id);
    const groupRef = doc(db, "groups", invitation.groupId);

    try {
        if (accept) {
            // Update the group document to add the new member
            await updateDoc(groupRef, {
                members: arrayUnion(user.uid)
            });

            // After successfully adding to group, update the invitation status
            await updateDoc(invitationRef, {
                status: 'accepted'
            });

            toast({ title: "Berhasil!", description: `Anda telah bergabung dengan grup ${invitation.groupName}.` });
        } else {
            // Just update the invitation status to rejected
            await updateDoc(invitationRef, {
                status: 'rejected'
            });
            toast({ title: "Undangan Ditolak", description: `Anda menolak undangan ke grup ${invitation.groupName}.` });
        }
    } catch (error) {
        console.error("Error handling invitation:", error);
        toast({ title: "Gagal", description: "Terjadi kesalahan saat memproses undangan. Pastikan aturan keamanan Anda benar.", variant: "destructive" });
    } finally {
        setProcessingInvite(null);
    }
  };


  return (
    <div className="flex flex-col gap-8 animate-in fade-in-50">
      <header className="flex justify-between items-center">
        <div>
            <h1 className="text-4xl font-headline font-bold text-foreground" style={{ textShadow: '1px 1px 2px #0d0d0d' }}>
              Pemberitahuan
            </h1>
        </div>
      </header>

      <main className="space-y-6">
        {loading ? (
            <CustomLoader />
        ) : notifications.length === 0 && invitations.length === 0 ? (
            <Card className="flex flex-col items-center justify-center p-12 text-center bg-background rounded-2xl shadow-neumorphic-inset">
                <Bell className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-foreground">Tidak Ada Pemberitahuan</h3>
                <p className="text-muted-foreground">Pemberitahuan & undangan baru akan muncul di sini.</p>
            </Card>
        ) : (
            <>
                {invitations.length > 0 && (
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold font-headline">Undangan Grup</h2>
                        {invitations.map(invite => (
                            <Card key={invite.id} className="p-4 rounded-xl shadow-neumorphic-outset border-none">
                                <div className="flex items-start gap-4">
                                   <div className="bg-primary/20 p-2 rounded-full mt-1">
                                       <UserCheck className="h-5 w-5 text-primary" />
                                   </div>
                                   <div className="flex-1">
                                       <p className="text-foreground">
                                           <span className="font-semibold">{invite.invitedBy}</span> mengundang Anda untuk bergabung dengan grup <span className="font-semibold">{invite.groupName}</span>.
                                       </p>
                                       <p className="text-xs text-muted-foreground mt-1">
                                           {invite.createdAt ? formatDistanceToNow(invite.createdAt.toDate(), { addSuffix: true, locale: id }) : 'baru saja'}
                                       </p>
                                       <div className="flex gap-2 mt-3">
                                            <Button size="sm" onClick={() => handleInvitation(invite, true)} disabled={!!processingInvite}>
                                                {processingInvite === invite.id ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Terima'}
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => handleInvitation(invite, false)} disabled={!!processingInvite}>
                                                Tolak
                                            </Button>
                                       </div>
                                   </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
                
                {notifications.length > 0 && (
                     <div className="space-y-4">
                        <h2 className="text-lg font-semibold font-headline">Aktivitas Lainnya</h2>
                        {notifications.map(notif => (
                            <Card key={notif.id} className="p-4 rounded-xl shadow-neumorphic-outset border-none">
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
            </>
        )}
      </main>
    </div>
  );
}
