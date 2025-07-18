
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Users, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc, collection, getDocs, addDoc, serverTimestamp, runTransaction } from "firebase/firestore";
import { app } from "@/lib/firebase";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const moneyFormSchema = z.object({
  amount: z.coerce.number().positive("Jumlah harus lebih dari 0."),
});

type MoneyFormValues = z.infer<typeof moneyFormSchema>;

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSuperUser, setIsSuperUser] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [totalCollected, setTotalCollected] = useState(0);
  const [editingUser, setEditingUser] = useState<any>(null);

  const auth = getAuth(app);
  const db = getFirestore(app);
  const { toast } = useToast();
  const superUserUid = "c3iJXsgRfdgvmzVtsSwefsmJ3pI2";

  const form = useForm<MoneyFormValues>({
    resolver: zodResolver(moneyFormSchema),
    defaultValues: {
      amount: 0,
    },
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const isOpank = currentUser.uid === superUserUid;
        setIsSuperUser(isOpank);
        
        const docRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserData(data);
        }

        const usersCollection = collection(db, "users");
        const usersSnapshot = await getDocs(usersCollection);
        const usersList = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        if (isOpank) {
          setAllUsers(usersList);
          const total = usersList.reduce((sum, u) => sum + (u.moneyCollected || 0), 0);
          setTotalCollected(total);
        }

      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [auth, db]);

  const handleAddMoney = async (data: MoneyFormValues) => {
    if (!user || !editingUser) return;
    
    const userToUpdateRef = doc(db, "users", editingUser.id);
    const amountToAdd = data.amount;

    try {
      await runTransaction(db, async (transaction) => {
        const userToUpdateDoc = await transaction.get(userToUpdateRef);
        if (!userToUpdateDoc.exists()) {
          throw "Pengguna tidak ditemukan!";
        }

        const newMoneyCollected = (userToUpdateDoc.data().moneyCollected || 0) + amountToAdd;
        transaction.update(userToUpdateRef, { moneyCollected: newMoneyCollected });

        const notificationMessage = `${userData.displayName} menambahkan ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amountToAdd)} untuk ${editingUser.displayName}`;
        const notificationsCollection = collection(db, "notifications");
        transaction.set(doc(notificationsCollection), {
          message: notificationMessage,
          createdAt: serverTimestamp(),
          userId: editingUser.id,
          userName: editingUser.displayName,
          amount: amountToAdd,
        });
      });

      toast({
        title: "Berhasil",
        description: `Uang berhasil ditambahkan untuk ${editingUser.displayName}.`,
      });

      // Refresh data
      const usersSnapshot = await getDocs(collection(db, "users"));
      const usersList = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllUsers(usersList);
      const total = usersList.reduce((sum, u) => sum + (u.moneyCollected || 0), 0);
      setTotalCollected(total);

      setEditingUser(null);
      form.reset({ amount: 0 });

    } catch (error) {
       console.error("Error adding money:", error);
       toast({
        title: "Gagal",
        description: "Gagal memperbarui jumlah uang.",
        variant: "destructive",
      });
    }
  };

  const neumorphicCardStyle = "bg-background rounded-2xl shadow-neumorphic-outset transition-all duration-300 border-none";
  const neumorphicInsetStyle = "bg-background rounded-2xl shadow-neumorphic-inset";
  
  if (loading) {
    return <div>Memuat...</div>;
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in-50">
      <header className="flex justify-between items-center">
        <div>
          <p className="text-muted-foreground">Selamat Datang,</p>
          <h1 className="text-3xl font-headline font-bold text-foreground">
            {userData?.displayName || 'Pengguna'} {isSuperUser && "👑"}
          </h1>
        </div>
        <Dialog>
          <DialogTrigger asChild>
             <Avatar className="h-16 w-16 shadow-neumorphic-outset cursor-pointer border-none rounded-full">
              <AvatarImage src={userData?.avatarUrl} alt="Avatar Pengguna" data-ai-hint="user avatar" className="object-cover rounded-full" />
              <AvatarFallback className="rounded-full">{userData?.displayName?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
          </DialogTrigger>
          <DialogContent className="p-0 border-none bg-transparent shadow-none max-w-[90vw] w-auto">
             <DialogTitle className="sr-only">Avatar Pengguna diperbesar</DialogTitle>
             <img src={userData?.avatarUrl} alt="Avatar Pengguna diperbesar" className="max-h-[80vh] w-auto rounded-lg" />
          </DialogContent>
        </Dialog>
      </header>
      
      <main className="flex flex-col gap-8">
        <Card className={`${neumorphicInsetStyle} p-6 border-none`}>
            <div className="flex items-center justify-between gap-4 text-primary">
              <div className="flex items-center gap-4">
                <DollarSign className="h-8 w-8" />
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">Uang Terkumpul</span>
                  <span className="text-3xl font-bold text-foreground">
                      {isSuperUser
                        ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(totalCollected)
                        : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(userData?.moneyCollected || 0)}
                  </span>
                </div>
              </div>
            </div>
        </Card>

        <aside className="flex flex-col gap-8">
           {isSuperUser && (
            <Card className={`${neumorphicCardStyle} p-6`}>
              <CardHeader className="p-0 mb-4">
                  <CardTitle className="text-xl font-headline font-semibold flex items-center gap-2 text-foreground">
                    <Users className="h-6 w-6"/>
                    Semua Pengguna
                  </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                  <div className="space-y-4">
                      {allUsers.map((u) => (
                          <div key={u.id} className="flex items-center gap-4 p-3 rounded-lg bg-background shadow-neumorphic-inset">
                              <Avatar className="h-10 w-10 border-none rounded-full">
                                  <AvatarImage src={u.avatarUrl} alt={u.displayName} className="rounded-full" />
                                  <AvatarFallback className="rounded-full">{u.displayName?.charAt(0) || '?'}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                  <p className="font-semibold text-foreground">{u.displayName}</p>
                                  <p className="text-sm text-muted-foreground">{u.email}</p>
                              </div>
                              <Button 
                                size="icon" 
                                className="rounded-full w-10 h-10 bg-primary hover:bg-primary/90 shadow-neumorphic-outset active:shadow-neumorphic-inset transition-all"
                                onClick={() => setEditingUser(u)}
                              >
                                  <Plus className="h-5 w-5 text-primary-foreground" />
                              </Button>
                          </div>
                      ))}
                  </div>
              </CardContent>
            </Card>
          )}
        </aside>
      </main>

      <Dialog open={!!editingUser} onOpenChange={(isOpen) => !isOpen && setEditingUser(null)}>
        <DialogContent>
            <DialogHeader>
            <DialogTitle>Tambah Uang untuk {editingUser?.displayName}</DialogTitle>
            <DialogDescription>
                Masukkan jumlah uang yang akan ditambahkan.
            </DialogDescription>
            </DialogHeader>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAddMoney)} className="space-y-4">
                <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Jumlah (IDR)</FormLabel>
                    <FormControl>
                        <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <Button type="submit" className="w-full">Tambah</Button>
            </form>
            </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
