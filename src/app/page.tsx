
'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bell, DollarSign, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { app } from "@/lib/firebase";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const auth = getAuth(app);
  const db = getFirestore(app);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const docRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserData(docSnap.data());
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [auth, db]);

  const neumorphicCardStyle = "bg-background rounded-2xl shadow-[6px_6px_12px_#0d0d0d,-6px_-6px_12px_#262626] transition-all duration-300";
  const neumorphicInsetStyle = "bg-background rounded-2xl shadow-[inset_4px_4px_8px_#0d0d0d,inset_-4px_-4px_8px_#262626]";
  
  const notifications = [
    {
      id: 1,
      user: "Alex Doe",
      action: "memulai panggilan baru.",
      time: "5 menit yang lalu",
      avatar: "https://placehold.co/40x40.png?text=AD",
    },
    {
      id: 2,
      user: "Jane Smith",
      action: "mengirimi Anda pesan.",
      time: "1 jam yang lalu",
      avatar: "https://placehold.co/40x40.png?text=JS",
    },
    {
      id: 3,
      user: "Sistem",
      action: "Anda memiliki pengikut baru!",
      time: "3 jam yang lalu",
      avatar: "https://placehold.co/40x40.png?text=S",
    },
  ];

  if (loading) {
    return <div>Memuat...</div>;
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in-50">
      <header className="flex justify-between items-center">
        <div>
          <p className="text-muted-foreground">Selamat Datang,</p>
          <h1 className="text-3xl font-headline font-bold text-foreground" style={{ textShadow: '1px 1px 2px #0d0d0d' }}>
            {userData?.displayName || 'Pengguna'}
          </h1>
        </div>
        <Avatar className="h-16 w-16 border-2 border-background shadow-[4px_4px_8px_#0d0d0d,-4px_-4px_8px_#262626]">
          <AvatarImage src={userData?.avatarUrl} alt="Avatar Pengguna" data-ai-hint="user avatar" />
          <AvatarFallback>{userData?.displayName?.charAt(0) || 'U'}</AvatarFallback>
        </Avatar>
      </header>
      
      <main className="flex flex-col gap-8">
        <Card className={`${neumorphicInsetStyle} p-6`}>
            <div className="flex items-center gap-4 text-primary">
              <DollarSign className="h-8 w-8" />
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Uang Terkumpul</span>
                <span className="text-3xl font-bold text-foreground">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(userData?.moneyCollected || 0)}
                </span>
              </div>
            </div>
        </Card>

        <section className="flex flex-col gap-8">
          <Card className={`${neumorphicCardStyle} p-6`}>
            <h3 className="text-xl font-headline font-semibold mb-4 text-foreground">Pemberitahuan Terbaru</h3>
            <div className="space-y-4">
              {notifications.map((n) => (
                <div key={n.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={n.avatar} />
                    <AvatarFallback>{n.user.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-grow">
                    <p className="text-sm text-foreground"><span className="font-semibold">{n.user}</span> {n.action}</p>
                    <p className="text-xs text-muted-foreground">{n.time}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="text-center mt-4">
                <Link href="/notifications" className="text-sm font-semibold text-primary hover:underline">
                  Lihat semua pemberitahuan
                </Link>
              </div>
            </div>
          </Card>
        </section>

        <aside className="flex flex-col gap-8">
          <Card className={`${neumorphicCardStyle} p-6`}>
            <h3 className="text-xl font-headline font-semibold mb-4 text-foreground">Tindakan Cepat</h3>
            <div className="flex flex-col gap-4">
                <Button variant="default" size="lg" className="w-full justify-start text-left h-14 bg-primary text-primary-foreground shadow-[3px_3px_6px_#0d0d0d,-3px_-3px_6px_#262626] active:shadow-[inset_3px_3px_6px_#0d0d0d,inset_-3px_-3px_6px_#262626]">
                    <Bell className="mr-3" />
                    Mulai Panggilan Baru
                </Button>
                <Button variant="secondary" size="lg" className="w-full justify-start text-left h-14 shadow-[3px_3px_6px_#0d0d0d,-3px_-3px_6px_#262626] active:shadow-[inset_3px_3px_6px_#0d0d0d,inset_-3px_-3px_6px_#262626]">
                    Lihat Kontak Online
                </Button>
            </div>
          </Card>
        </aside>
      </main>
    </div>
  );
}

