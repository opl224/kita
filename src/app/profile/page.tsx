
'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { getAuth, signOut, onAuthStateChanged, User, updatePassword } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { getStorage, ref as storageRef, uploadString, getDownloadURL } from "firebase/storage";
import { app } from "@/lib/firebase";
import { useEffect, useState, useRef } from "react";
import { useTheme } from "next-themes";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Camera, LogOut, Loader, Moon, Sun, ThumbsUp, ThumbsDown } from "lucide-react";
import { CustomLoader } from "@/components/layout/loader";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const profileFormSchema = z.object({
  displayName: z.string().min(4, "Nama pengguna minimal 4 karakter."),
  email: z.string().email("Format email tidak valid."),
  password: z.string().min(8, "Kata sandi minimal 8 karakter.").optional().or(z.literal('')),
  confirmPassword: z.string().min(8, "Kata sandi minimal 8 karakter.").optional().or(z.literal('')),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Kata sandi tidak cocok.",
  path: ["confirmPassword"],
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const neumorphicCardStyle = "bg-background rounded-2xl shadow-neumorphic-outset transition-all duration-300 p-8 border-none";
const neumorphicInputStyle = "bg-background border-none h-12 text-base rounded-lg shadow-neumorphic-inset focus-visible:ring-2 focus-visible:ring-primary";
const neumorphicButtonStyle = "h-12 text-base font-bold shadow-neumorphic-outset active:shadow-neumorphic-inset transition-all";

export default function ProfilePage() {
  const router = useRouter();
  const auth = getAuth(app);
  const db = getFirestore(app);
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onChange",
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const docRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const userData = docSnap.data();
          form.reset({
            displayName: userData.displayName,
            email: userData.email,
          });
          setAvatarUrl(userData.avatarUrl);
          
          if (userData.hasGivenFeedback === false) {
             setShowFeedbackDialog(true);
          }

        }
      } else {
        router.push('/login');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [auth, db, router, form]);

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !user) return;
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
        const base64data = reader.result as string;
        try {
            const userDocRef = doc(db, "users", user.uid);
            await updateDoc(userDocRef, {
                avatarUrl: base64data
            });
            setAvatarUrl(base64data);
        } catch (error) {
            console.error("Error uploading avatar: ", error);
        } finally {
            setIsUploading(false);
        }
    };
    reader.onerror = (error) => {
        console.error("Error reading file:", error);
        setIsUploading(false);
    };
  };

  async function handleFeedback(feedback: 'like' | 'dislike') {
    if (!user) return;
    try {
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, {
            feedback: feedback,
            hasGivenFeedback: true
        });
        setShowFeedbackDialog(false);
    } catch (error) {
        console.error("Error submitting feedback:", error);
    }
  }

  async function onSubmit(data: ProfileFormValues) {
    if (!user) return;
    
    try {
        if(data.displayName !== form.getValues('displayName')) {
            await updateDoc(doc(db, "users", user.uid), { displayName: data.displayName });
        }
        
        if (data.password) {
            await updatePassword(user, data.password);
        }

    } catch(error) {
        console.error("Error updating profile:", error);
    }
  }

  async function handleLogout() {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  }

  if (loading) {
    return <CustomLoader />;
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in-50 max-w-4xl mx-auto">
      <header className="pt-4">
        <h1 className="text-4xl font-headline font-bold text-foreground" style={{ textShadow: '1px 1px 2px #0d0d0d' }}>
          Profil Saya
        </h1>
      </header>

      <div className="flex flex-col gap-6">
        <Card className={`${neumorphicCardStyle} relative`}>
            <div className="absolute top-4 right-4 z-10">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="rounded-full shadow-neumorphic-outset active:shadow-neumorphic-inset border-none"
                    >
                    <Sun className="h-6 w-6 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-6 w-6 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Toggle theme</span>
                </Button>
            </div>
          <div className="flex flex-col items-center gap-4 mb-8 pt-8">
            <div className="relative">
              <Avatar className="h-32 w-32 shadow-neumorphic-outset border-none rounded-full">
                <AvatarImage src={avatarUrl} alt="User Avatar" data-ai-hint="user avatar" className="object-cover rounded-full" />
                <AvatarFallback className="rounded-full">{form.getValues('displayName')?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
              <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleAvatarChange} 
                  className="hidden" 
                  accept="image/*"
              />
              <Button 
                  size="icon" 
                  className={`${neumorphicButtonStyle} absolute bottom-0 right-0 w-10 h-10 rounded-full`}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
              >
                  {isUploading ? <CustomLoader /> : <Camera className="h-5 w-5"/>}
                  <span className="sr-only">Ubah Avatar</span>
              </Button>
            </div>
            <h2 className="text-2xl font-headline font-semibold text-foreground">{form.getValues('displayName')}</h2>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground">Nama Pengguna</FormLabel>
                    <FormControl>
                      <Input placeholder="Nama pengguna" {...field} className={neumorphicInputStyle} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground">Email</FormLabel>
                    <FormControl>
                      <Input placeholder="Email Anda" {...field} className={neumorphicInputStyle} readOnly />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground">Kata Sandi Baru</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="•••••••• " {...field} className={neumorphicInputStyle} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground">Konfirmasi Kata Sandi</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} className={neumorphicInputStyle} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="pt-4">
                <Button type="submit" variant="default" className={`${neumorphicButtonStyle} w-full`}>
                  Simpan Perubahan
                </Button>
              </div>
            </form>
          </Form>
        </Card>

        <Button type="button" variant="destructive" onClick={handleLogout} className={`${neumorphicButtonStyle} w-full`}>
          Keluar
        </Button>
      </div>

       <AlertDialog open={showFeedbackDialog}>
            <AlertDialogContent className={cn("bg-background rounded-2xl shadow-neumorphic-outset border-none")}>
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-center text-xl font-headline">Bagaimana Pengalaman Anda?</AlertDialogTitle>
                    <AlertDialogDescription className="text-center text-muted-foreground">
                        Penilaian Anda membantu kami meningkatkan aplikasi ini.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-row items-center justify-center gap-8 pt-4">
                    <Button 
                        size="icon" 
                        variant="ghost"
                        className="h-20 w-20 rounded-full shadow-neumorphic-outset active:shadow-neumorphic-inset"
                        onClick={() => handleFeedback('like')}
                    >
                        <ThumbsUp className="h-10 w-10 text-green-500" />
                    </Button>
                    <Button 
                        size="icon" 
                        variant="ghost"
                        className="h-20 w-20 rounded-full shadow-neumorphic-outset active:shadow-neumorphic-inset"
                        onClick={() => handleFeedback('dislike')}
                    >
                        <ThumbsDown className="h-10 w-10 text-red-500" />
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
