
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Users, Plus, Heart, ChevronLeft, ChevronRight, ThumbsUp, ThumbsDown, MessageSquareQuote, History, Gift, BadgeCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc, collection, addDoc, serverTimestamp, runTransaction, query, where, onSnapshot, setDoc, orderBy, getDocs, arrayUnion, arrayRemove } from "firebase/firestore";
import { getFirebaseApp } from "@/lib/firebase";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CustomLoader } from "@/components/layout/loader";
import { cn } from "@/lib/utils";
import { useDialogBackButton } from "@/components/layout/app-shell";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
import { ScrollArea } from "@/components/ui/scroll-area";

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

type AppUser = {
    id: string;
    displayName: string;
    email: string;
    avatarUrl: string;
    totalReceived?: number;
    isSuperUser?: boolean;
    hasGivenFeedback?: boolean;
    likedBy?: string[];
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

const LikeCheckbox = ({ userId, isLiked, onLike }: { userId: string, isLiked: boolean, onLike: (liked: boolean) => void }) => {
    const uniqueId = `cbx-${userId}`;
    return (
        <div className="checkbox-wrapper-12">
            <div className="cbx">
                <input 
                    id={uniqueId} 
                    type="checkbox" 
                    checked={isLiked}
                    onChange={(e) => onLike(e.target.checked)}
                />
                <label htmlFor={uniqueId}></label>
                <svg width="15" height="14" viewBox="0 0 15 14" fill="none">
                    <path d="M2 8.36364L6.23077 12L13 2"></path>
                </svg>
            </div>

            <svg version="1.1" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <filter id="goo-12">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur"></feGaussianBlur>
                        <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -7" result="goo-12"></feColorMatrix>
                        <feBlend in="SourceGraphic" in2="goo-12"></feBlend>
                    </filter>
                </defs>
            </svg>
        </div>
    );
};


export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<AppUser | null>(null);
  const [isSuperUser, setIsSuperUser] = useState(false);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [userFeedback, setUserFeedback] = useState<UserFeedback[]>([]);
  const [totalCollected, setTotalCollected] = useState(0);
  const [myTotalLikes, setMyTotalLikes] = useState(0);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [allUsersPage, setAllUsersPage] = useState(1);
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [viewingUser, setViewingUser] = useState<any>(null);
  const [userContributions, setUserContributions] = useState<Contribution[]>([]);
  const [loadingContributions, setLoadingContributions] = useState(false);
  
  const app = getFirebaseApp();
  const auth = getAuth(app);
  const db = getFirestore(app);

  useDialogBackButton(isAvatarDialogOpen, setIsAvatarDialogOpen);

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
      }
    });

    return () => unsubscribeAuth();
  }, [auth, router]);
  
    useEffect(() => {
        if (!user) {
            setUserData(null);
            return;
        }

        const userDocRef = doc(db, "users", user.uid);

        const unsubscribeUser = onSnapshot(userDocRef, async (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as AppUser;
                setUserData(data);
                const userIsAdmin = !!data.isSuperUser;
                setIsSuperUser(userIsAdmin);
                 if (user.uid === "vopA2wSkuDOqt2AUOPIvOdCMtAg2" && !data.isSuperUser) {
                    await updateDoc(userDocRef, { isSuperUser: true });
                 }
            }
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
            const usersList = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser));
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
                collection(db, "users", viewingUser.id, "notifications"),
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
    const userToCreditRef = doc(db, "users", editingUser.id);
    const amountToAdd = data.amount;

    try {
      await runTransaction(db, async (transaction) => {
        const appStateDoc = await transaction.get(appStateRef);
        const userToCreditDoc = await transaction.get(userToCreditRef);
        
        let newTotal = amountToAdd;
        if (appStateDoc.exists()) {
          newTotal = (appStateDoc.data().totalMoneyCollected || 0) + amountToAdd;
        }
        transaction.set(appStateRef, { totalMoneyCollected: newTotal }, { merge: true });

        if (userToCreditDoc.exists()) {
            const currentReceived = userToCreditDoc.data().totalReceived || 0;
            transaction.update(userToCreditRef, { totalReceived: currentReceived + amountToAdd });
        }

        const notificationMessage = `${userData?.displayName} menambahkan ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amountToAdd)}.`;
        const notificationsCollection = collection(db, "users", editingUser.id, "notifications");
        transaction.set(doc(notificationsCollection), {
          message: notificationMessage,
          userName: userData?.displayName,
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
        
        const feedbackCollectionRef = collection(db, 'userFeedback');
        await addDoc(feedbackCollectionRef, {
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

  const handleLogout = () => {
    setIsLogoutDialogOpen(true);
  };
  
    const handleLikeUser = async (targetUserId: string, shouldLike: boolean) => {
        if (!user || !isSuperUser) return;

        const targetUserRef = doc(db, "users", targetUserId);
        try {
            if (shouldLike) {
                await updateDoc(targetUserRef, {
                    likedBy: arrayUnion(user.uid)
                });
            } else {
                await updateDoc(targetUserRef, {
                    likedBy: arrayRemove(user.uid)
                });
            }
        } catch (error) {
            console.error("Error updating user like status:", error);
        }
    };


  if (!user || !userData) {
    return <CustomLoader />;
  }
  
  const neumorphicCardStyle = "bg-background rounded-2xl shadow-neumorphic-outset transition-all duration-300 border-none";
  const neumorphicInsetStyle = "bg-background rounded-2xl shadow-neumorphic-inset";
  const neumorphicButtonStyle = "h-12 text-base font-bold shadow-neumorphic-outset active:shadow-neumorphic-inset transition-all";
  const neumorphicInputStyle = "bg-background border-none h-12 text-base rounded-lg shadow-neumorphic-inset focus-visible:ring-2 focus-visible:ring-primary";
  const totalUserPages = Math.ceil(allUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = allUsers.slice((allUsersPage - 1) * ITEMS_PER_PAGE, allUsersPage * ITEMS_PER_PAGE);
  const showFeedbackCard = userData && !isSuperUser && userData.hasGivenFeedback === false;
  const showReceivedMoneyCard = userData && !isSuperUser && (userData.totalReceived || 0) > 0;
  const totalUserContribution = userContributions.reduce((sum, item) => sum + item.amount, 0);


  return (
    <div className="flex flex-col gap-8">
      <header className="flex justify-between items-center relative">
        <div>
          <p className="text-muted-foreground">Selamat Datang,</p>
          <h1 className="text-3xl font-headline font-bold text-foreground">
            <div className="flex items-center gap-2">
                <span className="truncate max-w-[200px]">{userData?.displayName || 'Pengguna'}</span>
                {isSuperUser && "👑"}
                {!isSuperUser && (userData?.likedBy?.length ?? 0) > 0 && (
                    <BadgeCheck className="h-6 w-6 text-blue-500 flex-shrink-0" />
                )}
            </div>
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
            {showReceivedMoneyCard && (
              <Card className={`${neumorphicInsetStyle} p-6 border-none sm:col-span-2`}>
                  <div className="flex items-center justify-between gap-4 text-green-500">
                    <div className="flex items-center gap-4">
                      <Gift className="h-8 w-8" />
                      <div className="flex flex-col">
                        <span className="text-sm text-muted-foreground">Uang Setor</span>
                        <span className="text-3xl font-bold text-foreground">
                          {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(userData.totalReceived || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
              </Card>
            )}
            <Card className={`${neumorphicInsetStyle} p-6 border-none`}>
                <div className="flex items-center justify-between gap-4 text-red-500">
                  <div className="flex items-center gap-4">
                    <Heart className="h-8 w-8" />
                    <div className="flex flex-col">
                      <span className="text-sm text-muted-foreground">Total Suka</span>
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
                        {paginatedUsers.map((u) => {
                           const isLikedByCurrentUser = u.likedBy?.includes(user.uid) ?? false;
                           return (
                            <div key={u.id} className="flex items-center justify-between gap-2 p-3 rounded-lg bg-background shadow-neumorphic-inset">
                                <div className="flex items-center gap-4 min-w-0 cursor-pointer" onClick={() => setViewingUser(u)}>
                                    <Avatar className="h-10 w-10 border-none rounded-full flex-shrink-0">
                                        <AvatarImage src={u.avatarUrl} alt={u.displayName} className="rounded-full" />
                                        <AvatarFallback className="rounded-full">{u.displayName?.charAt(0) || '?'}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex items-center gap-2 min-w-0">
                                        <p className="font-semibold text-foreground truncate max-w-[120px]">{u.displayName}</p>
                                        {(u.isSuperUser) && "👑"}
                                        {(!u.isSuperUser && isLikedByCurrentUser) && <BadgeCheck className="h-5 w-5 text-blue-500 flex-shrink-0" />}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 ml-auto pl-2">
                                    {!u.isSuperUser && 
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <LikeCheckbox 
                                                userId={u.id}
                                                isLiked={isLikedByCurrentUser}
                                                onLike={(liked) => handleLikeUser(u.id, liked)}
                                            />
                                        </div>
                                    }
                                    <div onClick={(e) => e.stopPropagation()}>
                                        <Dialog open={editingUser?.id === u.id} onOpenChange={(isOpen) => !isOpen && setEditingUser(null)}>
                                            <DialogTrigger asChild>
                                                <Button 
                                                    size="icon" 
                                                    className="rounded-full w-10 h-10 bg-primary hover:bg-primary/90 shadow-neumorphic-outset active:shadow-neumorphic-inset transition-all"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingUser(u);
                                                    }}
                                                >
                                                    <Plus className="h-5 w-5 text-primary-foreground" />
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="bg-transparent border-none shadow-none max-w-[90vw] sm:max-w-md">
                                              <div className="bg-background rounded-2xl shadow-neumorphic-outset p-6">
                                                <DialogHeader>
                                                    <DialogTitle className="truncate max-w-[200px]">Tambah Uang untuk {editingUser?.displayName}</DialogTitle>
                                                </DialogHeader>
                                                <Form {...form}>
                                                    <form onSubmit={form.handleSubmit(handleAddMoney)} className="space-y-4 mt-4">
                                                        <FormField
                                                            control={form.control}
                                                            name="amount"
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel className="text-muted-foreground">Jumlah (IDR)</FormLabel>
                                                                    <FormControl>
                                                                        <Input type="number" {...field} className={neumorphicInputStyle} />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                        <Button type="submit" className={`${neumorphicButtonStyle} w-full`}>Tambah</Button>
                                                    </form>
                                                </Form>
                                              </div>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                </div>
                            </div>
                        )})}
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
                                        <p className="font-semibold text-foreground truncate max-w-[200px]">{feedback.userName}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {feedback.createdAt ? formatDistanceToNow(feedback.createdAt.toDate(), { addSuffix: false, locale: id })
                                          .replace('kurang dari ', '')
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
                    <AlertDialogCancel onClick={() => setIsLogoutDialogOpen(false)}>Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={() => {
                      setIsLogoutDialogOpen(false);
                      auth.signOut();
                    }}>Keluar</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        {/* Dialog for viewing user contribution history */}
        <Dialog open={!!viewingUser} onOpenChange={(isOpen) => !isOpen && setViewingUser(null)}>
            <DialogContent className="bg-transparent border-none shadow-none max-w-[90vw] sm:max-w-md">
                <div className="bg-background rounded-2xl shadow-neumorphic-outset p-6">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <History className="h-5 w-5" />
                            <span className="truncate max-w-[200px]">Riwayat Tambahan Uang: {viewingUser?.displayName}</span>
                        </DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="h-72 mt-4">
                        <div className="space-y-3 pr-4">
                            {loadingContributions ? (
                                <CustomLoader />
                            ) : userContributions.length > 0 ? (
                                userContributions.map(contrib => (
                                    <div key={contrib.id} className="flex justify-between items-center p-3 rounded-lg bg-background shadow-neumorphic-inset">
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
                    </ScrollArea>
                    <DialogFooter className="pt-4 border-t mt-4">
                        <div className="w-full flex justify-between items-center">
                            <span className="font-semibold text-lg">Total</span>
                            <span className="font-bold text-lg text-primary">
                                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(totalUserContribution)}
                            </span>
                        </div>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    </div>
  );
}
