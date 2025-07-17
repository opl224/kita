
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc, collection, getDocs } from "firebase/firestore";
import { app } from "@/lib/firebase";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Edit } from "lucide-react";
import { useRouter } from "next/navigation";


const moneyFormSchema = z.object({
  amount: z.coerce.number().min(0, "Jumlah tidak boleh negatif."),
});

type MoneyFormValues = z.infer<typeof moneyFormSchema>;


export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSuperUser, setIsSuperUser] = useState(false);
  const [isEditingMoney, setIsEditingMoney] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);


  const auth = getAuth(app);
  const db = getFirestore(app);
  const { toast } = useToast();
  const router = useRouter();
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
          form.reset({ amount: data.moneyCollected || 0 });
        }

        if (isOpank) {
          const usersCollection = collection(db, "users");
          const usersSnapshot = await getDocs(usersCollection);
          const usersList = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setAllUsers(usersList);
        }

      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [auth, db, form]);

  const onMoneySubmit = async (data: MoneyFormValues) => {
    if (!user) return;
    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        moneyCollected: data.amount
      });
      setUserData((prev: any) => ({ ...prev, moneyCollected: data.amount }));
      toast({
        title: "Berhasil",
        description: "Jumlah uang terkumpul telah diperbarui.",
      });
      setIsEditingMoney(false);
    } catch (error) {
       toast({
        title: "Gagal",
        description: "Gagal memperbarui jumlah uang.",
        variant: "destructive",
      });
    }
  };

  const neumorphicCardStyle = "bg-background rounded-2xl shadow-[6px_6px_12px_#0d0d0d,-6px_-6px_12px_#262626] transition-all duration-300";
  const neumorphicInsetStyle = "bg-background rounded-2xl shadow-[inset_4px_4px_8px_#0d0d0d,inset_-4px_-4px_8px_#262626]";
  
  if (loading) {
    return <div>Memuat...</div>;
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in-50">
      <header className="flex justify-between items-center">
        <div>
          <p className="text-muted-foreground">Selamat Datang,</p>
          <h1 className="text-3xl font-headline font-bold text-foreground" style={{ textShadow: '1px 1px 2px #0d0d0d' }}>
            {userData?.displayName || 'Pengguna'} {isSuperUser && "👑"}
          </h1>
        </div>
        <Dialog>
          <DialogTrigger asChild>
             <Avatar className="h-16 w-16 border-2 border-background shadow-[4px_4px_8px_#0d0d0d,-4px_-4px_8px_#262626] cursor-pointer">
              <AvatarImage src={userData?.avatarUrl} alt="Avatar Pengguna" data-ai-hint="user avatar" className="object-cover" />
              <AvatarFallback>{userData?.displayName?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
          </DialogTrigger>
          <DialogContent className="p-0 border-none bg-transparent shadow-none max-w-[90vw] w-auto">
             <DialogTitle className="sr-only">Avatar Pengguna diperbesar</DialogTitle>
             <img src={userData?.avatarUrl} alt="Avatar Pengguna diperbesar" className="max-h-[80vh] w-auto rounded-lg" />
          </DialogContent>
        </Dialog>
      </header>
      
      <main className="flex flex-col gap-8">
        <Card className={`${neumorphicInsetStyle} p-6`}>
            <div className="flex items-center justify-between gap-4 text-primary">
              <div className="flex items-center gap-4">
                <DollarSign className="h-8 w-8" />
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">Uang Terkumpul</span>
                  <span className="text-3xl font-bold text-foreground">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(userData?.moneyCollected || 0)}
                  </span>
                </div>
              </div>
              {isSuperUser && (
                <Dialog open={isEditingMoney} onOpenChange={setIsEditingMoney}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Edit className="h-6 w-6" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Ubah Uang Terkumpul</DialogTitle>
                      <DialogDescription>
                        Masukkan jumlah baru untuk uang terkumpul.
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onMoneySubmit)} className="space-y-4">
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
                        <Button type="submit" className="w-full">Simpan</Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              )}
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
                          <div key={u.id} className="flex items-center gap-4 p-3 rounded-lg bg-background shadow-[inset_3px_3px_6px_#0d0d0d,inset_-3px_-3px_6px_#262626]">
                              <Avatar className="h-10 w-10">
                                  <AvatarImage src={u.avatarUrl} alt={u.displayName} />
                                  <AvatarFallback>{u.displayName?.charAt(0) || '?'}</AvatarFallback>
                              </Avatar>
                              <div>
                                  <p className="font-semibold text-foreground">{u.displayName}</p>
                                  <p className="text-sm text-muted-foreground">{u.email}</p>
                              </div>
                          </div>
                      ))}
                  </div>
              </CardContent>
            </Card>
          )}

        </aside>
      </main>
    </div>
  );
}
