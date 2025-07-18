
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { DollarSign, Users, Plus, Heart, ChevronLeft, ChevronRight, ThumbsUp, ThumbsDown, MessageSquareQuote, History } from "lucide-react";
import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, User, signOut, updateProfile } from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc, collection, addDoc, serverTimestamp, runTransaction, query, where, onSnapshot, setDoc, orderBy, getDocs } from "firebase/firestore";
import { app } from "@/lib/firebase";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CustomLoader } from "@/components/layout/loader";
import { cn } from "@/lib/utils";
import { useDialogBackButton } from "@/components/layout/app-shell";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';

const moneyFormSchema = z.object({
  amount: z.coerce.number().positive("Jumlah harus lebih dari 0."),
});

type MoneyFormValues = z.infer<typeof moneyFormSchema>;

type UserFeedback = {
  id: string;
  userName: string;
  feedback: 'like' | 'dislike';
  createdAt: any;
};

type Contribution = {
    id: string;
    amount: number;
    createdAt: any;
}


const ITEMS_PER_PAGE = 5;

const PaginationControls = ({ currentPage, totalPages, onPageChange, className }: { currentPage: number, totalPages: number, onPageChange: (page: number) => void, className?: string }) => {
  if (totalPages <= 1) return null;

  const neumorphicPaginationStyle = "h-10 w-10 bg-background rounded-full shadow-neumorphic-outset active:shadow-neumorphic-inset transition-all disabled:opacity-50 disabled:shadow-none";

  return (
    <div className={cn("flex items-center justify-center gap-4 mt-4", className)}>
      <Button
        size="icon"
        className={neumorphicPaginationStyle}
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        <ChevronLeft className="h-5 w-5 text-foreground" />
        <span className="sr-only">Halaman Sebelumnya</span>
      </Button>
      <span className="text-sm font-medium text-muted-foreground tabular-nums">
        Hal {currentPage} / {totalPages}
      </span>
      <Button
        size="icon"
        className={neumorphicPaginationStyle}
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        <ChevronRight className="h-5 w-5 text-foreground" />
        <span className="sr-only">Halaman Berikutnya</span>
      </Button>
    </div>
  );
};


export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSuperUser, setIsSuperUser] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [userFeedback, setUserFeedback] = useState<UserFeedback[]>([]);
  const [totalCollected, setTotalCollected] = useState(0);
  const [myTotalLikes, setMyTotalLikes] = useState(0);
  const [editingUser, setEditingUser] = useState<any>(null);
  const router = useRouter();

  const [allUsersPage, setAllUsersPage] = useState(1);
  
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
  useDialogBackButton(isAvatarDialogOpen, setIsAvatarDialogOpen);

  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

  // New state for viewing user contribution history
  const [viewingUser, setViewingUser] = useState<any>(null);
  const [userContributions, setUserContributions] = useState<Contribution[]>([]);
  const [loadingContributions, setLoadingContributions] = useState(false);


  const auth = getAuth(app);
  const db = getFirestore(app);

  const form = useForm<MoneyFormValues>({
    resolver: zodResolver(moneyFormSchema),
    defaultValues: {
      amount: 0,
    },
  });

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push('/login');
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [auth, router]);
  
    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        setLoading(true);
        const userDocRef = doc(db, "users", user.uid);

        const unsubscribeUser = onSnapshot(userDocRef, async (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setUserData(data);
                const userIsAdmin = !!data.isSuperUser;
                setIsSuperUser(userIsAdmin);
            } else {
                 if (user.uid === "c3iJXsgRfdgvmzVtsSwefsmJ3pI2") {
                    await updateDoc(userDocRef, { isSuperUser: true });
                    setIsSuperUser(true);
                 }
            }
            setLoading(false);
        });

        const appStateRef = doc(db, "appState", "main");
        const unsubscribeAppState = onSnapshot(appStateRef, (docSnap) => {
            if (docSnap.exists()) {
                setTotalCollected(docSnap.data().totalMoneyCollected || 0);
            }
        });

        const userPostsQuery = query(collection(db, "posts"), where("userId", "==", user.uid));
        const unsubscribeUserPosts = onSnapshot(userPostsQuery, (postsSnapshot) => {
            let totalLikesCount = 0;
            postsSnapshot.forEach(postDoc => {
                totalLikesCount += (postDoc.data().likes || []).length;
            });
            setMyTotalLikes(totalLikesCount);
        });

        return () => {
            unsubscribeUser();
            unsubscribeAppState();
            unsubscribeUserPosts();
        };
    }, [user, db]);

    useEffect(() => {
        if (!isSuperUser) {
            setAllUsers([]);
            setUserFeedback([]);
            return;
        }
        
        const usersQuery = query(collection(db, "users"));
        const unsubscribeAllUsers = onSnapshot(usersQuery, (usersSnapshot) => {
            const usersList = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAllUsers(usersList);
        });

        const feedbackQuery = query(collection(db, "userFeedback"), orderBy("createdAt", "desc"));
        const unsubscribeFeedback = onSnapshot(feedbackQuery, (feedbackSnapshot) => {
            const feedbackList = feedbackSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserFeedback));
            setUserFeedback(feedbackList);
        });

        return () => {
            unsubscribeAllUsers();
            unsubscribeFeedback();
        };

    }, [isSuperUser, db]);
    
    useEffect(() => {
        if (viewingUser) {
            setLoadingContributions(true);
            const contributionsQuery = query(
                collection(db, "notifications"),
                where("userName", "==", viewingUser.displayName),
                orderBy("createdAt", "desc")
            );

            const unsubscribe = onSnapshot(contributionsQuery, (querySnapshot) => {
                const contributionsData = querySnapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() } as Contribution))
                    .filter(doc => doc.amount > 0);
                setUserContributions(contributionsData);
                setLoadingContributions(false);
            }, (error) => {
                console.error("Error fetching contributions:", error);
                setLoadingContributions(false);
            });

            return () => unsubscribe();
        }
    }, [viewingUser, db]);


  const handleAddMoney = async (data: MoneyFormValues) => {
    if (!user || !editingUser || !isSuperUser) return;
    
    const appStateRef = doc(db, "appState", "main");
    const amountToAdd = data.amount;

    try {
      await runTransaction(db, async (transaction) => {
        const appStateDoc = await transaction.get(appStateRef);
        
        let newTotal = amountToAdd;
        if (appStateDoc.exists()) {
          newTotal = (appStateDoc.data().totalMoneyCollected || 0) + amountToAdd;
        }
        
        transaction.set(appStateRef, { totalMoneyCollected: newTotal }, { merge: true });

        const notificationMessage = `${editingUser.displayName} menambahkan ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amountToAdd)}.`;
        const notificationsCollection = collection(db, "notifications");
        transaction.set(doc(notificationsCollection), {
          message: notificationMessage,
          userName: editingUser.displayName,
          createdAt: serverTimestamp(),
          amount: amountToAdd,
        });
      });

      setEditingUser(null);
      form.reset({ amount: 0 });

    } catch (error) {
       console.error("Error adding money:", error);
    }
  };

  const handleFeedback = async (feedback: 'like' | 'dislike') => {
    if (!user || !userData) return;

    try {
        const userDocRef = doc(db, 'users', user.uid);
        const feedbackDocRef = doc(collection(db, 'userFeedback'));
        
        await setDoc(feedbackDocRef, {
            userId: user.uid,
            userName: userData.displayName,
            feedback: feedback,
            createdAt: serverTimestamp()
        });
        
        await updateDoc(userDocRef, {
            hasGivenFeedback: true
        });

    } catch (error) {
        console.error("Error submitting feedback:", error);
    }
  };

  async function handleLogout() {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  }

  const neumorphicCardStyle = "bg-background rounded-2xl shadow-neumorphic-outset transition-all duration-300 border-none";
  const neumorphicInsetStyle = "bg-background rounded-2xl shadow-neumorphic-inset";

  const totalUserPages = Math.ceil(allUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = allUsers.slice((allUsersPage - 1) * ITEMS_PER_PAGE, allUsersPage * ITEMS_PER_PAGE);
  
  const showFeedbackCard = !loading && userData && !isSuperUser && userData.hasGivenFeedback === false;

  const totalUserContribution = userContributions.reduce((sum, item) => sum + item.amount, 0);

  if (loading) {
    return <CustomLoader />;
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in-50">
      <header className="flex justify-between items-center relative">
        <div>
          <p className="text-muted-foreground">Selamat Datang,</p>
          <h1 className="text-3xl font-headline font-bold text-foreground">
            {userData?.displayName || 'Pengguna'} {isSuperUser && "👑"}
          </h1>
        </div>
        <div className="flex items-center gap-4">
            <Dialog open={isAvatarDialogOpen} onOpenChange={setIsAvatarDialogOpen}>
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
        </div>
      </header>
      
      <main className="flex flex-col gap-8">
        
        {showFeedbackCard && (
            <Card className={`${neumorphicCardStyle} p-6`}>
                <CardHeader className="p-0 mb-4">
                  <CardTitle className="text-xl font-headline font-semibold flex items-center gap-2 text-foreground">
                    Suka dengan aplikasi ini?
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex items-center justify-center text-center gap-4">
                    <div className="flex gap-4 mt-2">
                        <Button size="icon" className="h-16 w-16 rounded-full shadow-neumorphic-outset active:shadow-neumorphic-inset" onClick={() => handleFeedback('like')}>
                            <ThumbsUp className="h-8 w-8" />
                        </Button>
                        <Button size="icon" variant="secondary" className="h-16 w-16 rounded-full shadow-neumorphic-outset active:shadow-neumorphic-inset" onClick={() => handleFeedback('dislike')}>
                             <ThumbsDown className="h-8 w-8" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Card className={`${neumorphicInsetStyle} p-6 border-none`}>
                <div className="flex items-center justify-between gap-4 text-primary">
                  <div className="flex items-center gap-4">
                    <DollarSign className="h-8 w-8" />
                    <div className="flex flex-col">
                      <span className="text-sm text-muted-foreground">Uang Terkumpul</span>
                      <span className="text-3xl font-bold text-foreground">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(totalCollected)}
                      </span>
                    </div>
                  </div>
                </div>
            </Card>
            <Card className={`${neumorphicInsetStyle} p-6 border-none`}>
                <div className="flex items-center justify-between gap-4 text-red-500">
                  <div className="flex items-center gap-4">
                    <Heart className="h-8 w-8" />
                    <div className="flex flex-col">
                      <span className="text-sm text-muted-foreground">Total Suka Saya</span>
                      <span className="text-3xl font-bold text-foreground">
                        {myTotalLikes}
                      </span>
                    </div>
                  </div>
                </div>
            </Card>
        </div>


        <aside className="flex flex-col gap-8">
           {isSuperUser && (
            <>
              <Card className={`${neumorphicCardStyle} p-6`}>
                <CardHeader className="p-0 mb-4">
                    <CardTitle className="text-xl font-headline font-semibold flex items-center gap-2 text-foreground">
                      <Users className="h-6 w-6"/>
                      Semua Pengguna
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="space-y-4">
                        {paginatedUsers.map((u) => (
                            <div key={u.id} className="flex items-center gap-4 p-3 rounded-lg bg-background shadow-neumorphic-inset cursor-pointer" onClick={() => setViewingUser(u)}>
                                <Avatar className="h-10 w-10 border-none rounded-full pointer-events-none">
                                    <AvatarImage src={u.avatarUrl} alt={u.displayName} className="rounded-full" />
                                    <AvatarFallback className="rounded-full">{u.displayName?.charAt(0) || '?'}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 pointer-events-none">
                                    <p className="font-semibold text-foreground">{u.displayName}</p>
                                    <p className="text-sm text-muted-foreground">{u.email}</p>
                                </div>
                                <div className="flex items-center gap-2 text-red-500 mr-2 pointer-events-none">
                                  <Heart className="h-4 w-4" />
                                  <span className="text-sm font-medium text-muted-foreground">{u.totalLikes || 0}</span>
                                </div>
                                <Dialog open={editingUser?.id === u.id} onOpenChange={(isOpen) => !isOpen && setEditingUser(null)}>
                                  <DialogTrigger asChild>
                                      <Button 
                                        size="icon" 
                                        className="rounded-full w-10 h-10 bg-primary hover:bg-primary/90 shadow-neumorphic-outset active:shadow-neumorphic-inset transition-all z-10"
                                        onClick={(e) => { e.stopPropagation(); setEditingUser(u); }}
                                      >
                                          <Plus className="h-5 w-5 text-primary-foreground" />
                                      </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                      <DialogHeader>
                                      <DialogTitle>Tambah Uang untuk {editingUser?.displayName}</DialogTitle>
                                      <DialogDescription>
                                          Tindakan ini akan menambah saldo 'Uang Terkumpul' secara global. Notifikasi akan dikirim atas nama {editingUser?.displayName}.
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
                        ))}
                    </div>
                    <PaginationControls 
                      currentPage={allUsersPage}
                      totalPages={totalUserPages}
                      onPageChange={setAllUsersPage}
                    />
                </CardContent>
              </Card>

              {userFeedback.length > 0 && (
                <Card className={`${neumorphicCardStyle} p-6`}>
                    <CardHeader className="p-0 mb-4">
                        <CardTitle className="text-xl font-headline font-semibold flex items-center gap-2 text-foreground">
                            <MessageSquareQuote className="h-6 w-6"/>
                            Penilaian Pengguna
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="space-y-4">
                            {userFeedback.map((feedback) => (
                                <div key={feedback.id} className="flex items-center gap-4 p-3 rounded-lg bg-background shadow-neumorphic-inset">
                                    <div className="text-2xl">
                                        {feedback.feedback === 'like' ? '👍' : '👎'}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold text-foreground">{feedback.userName}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {feedback.createdAt ? formatDistanceToNow(feedback.createdAt.toDate(), { addSuffix: false, locale: id })
                                          .replace('kurang dari ', '')
                                          .replace('sekitar ', '')
                                          .replace('pada ', '')
                                          .replace('yang lalu ', '')
                                          : 'baru saja'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
              )}
            </>
          )}
        </aside>
      </main>

        <AlertDialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Konfirmasi Keluar</AlertDialogTitle>
                    <AlertDialogDescription>
                        Apakah Anda yakin ingin keluar dari aplikasi? Anda akan dikembalikan ke halaman login.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={handleLogout}>Keluar</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        {/* Dialog for viewing user contribution history */}
        <Dialog open={!!viewingUser} onOpenChange={(isOpen) => !isOpen && setViewingUser(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <History className="h-5 w-5" />
                        Riwayat Tambahan Uang: {viewingUser?.displayName}
                    </DialogTitle>
                </DialogHeader>
                <div className="max-h-80 overflow-y-auto space-y-3 pr-2">
                    {loadingContributions ? (
                        <CustomLoader />
                    ) : userContributions.length > 0 ? (
                        userContributions.map(contrib => (
                            <div key={contrib.id} className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                                <span className="font-medium text-foreground">
                                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(contrib.amount)}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {contrib.createdAt ? format(contrib.createdAt.toDate(), 'd MMM yyyy, HH:mm', { locale: id }) : ''}
                                </span>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-muted-foreground py-8">Belum ada riwayat tambahan uang untuk pengguna ini.</p>
                    )}
                </div>
                 <DialogFooter className="pt-4 border-t">
                    <div className="w-full flex justify-between items-center">
                        <span className="font-semibold text-lg">Total</span>
                        <span className="font-bold text-lg text-primary">
                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(totalUserContribution)}
                        </span>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}
