
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
import { useToast } from "@/hooks/use-toast";
import { Camera, LogOut, Loader, Moon, Sun } from "lucide-react";

const profileFormSchema = z.object({
  displayName: z.string().min(2, "Nama tampilan minimal 2 karakter."),
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
  const { toast } = useToast();
  const router = useRouter();
  const auth = getAuth(app);
  const db = getFirestore(app);
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
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
            toast({
                title: "Avatar Diperbarui",
                description: "Avatar Anda telah berhasil diubah.",
            });
        } catch (error) {
            console.error("Error uploading avatar: ", error);
            toast({
                title: "Gagal Mengunggah",
                description: "Terjadi kesalahan saat mengubah avatar Anda.",
                variant: "destructive",
            });
        } finally {
            setIsUploading(false);
        }
    };
    reader.onerror = (error) => {
        console.error("Error reading file:", error);
        toast({
            title: "Gagal Membaca File",
            description: "Tidak dapat memproses file yang Anda pilih.",
            variant: "destructive",
        });
        setIsUploading(false);
    };
  };

  async function onSubmit(data: ProfileFormValues) {
    if (!user) return;
    
    try {
        if(data.displayName !== form.getValues('displayName')) {
            await updateDoc(doc(db, "users", user.uid), { displayName: data.displayName });
        }
        
        if (data.password) {
            await updatePassword(user, data.password);
        }

        toast({
            title: "Profil Diperbarui",
            description: "Informasi profil Anda telah berhasil disimpan.",
        });
    } catch(error) {
        console.error("Error updating profile:", error);
        toast({
            title: "Gagal Memperbarui Profil",
            description: "Terjadi kesalahan saat menyimpan perubahan.",
            variant: "destructive",
        });
    }
  }

  async function handleLogout() {
    try {
      await signOut(auth);
      toast({
        title: "Berhasil Keluar",
        description: "Anda telah berhasil keluar dari akun Anda.",
      });
      router.push('/login');
    } catch (error) {
      toast({
        title: "Gagal Keluar",
        description: "Terjadi kesalahan saat mencoba keluar.",
        variant: "destructive",
      });
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><Loader className="h-12 w-12 animate-spin"/></div>
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in-50 max-w-4xl mx-auto">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-headline font-bold text-foreground" style={{ textShadow: '1px 1px 2px #0d0d0d' }}>
            Profil Saya
          </h1>
        </div>
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
      </header>

      <div className="flex flex-col gap-6">
        <Card className={neumorphicCardStyle}>
          <div className="flex flex-col items-center gap-4 mb-8">
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
                  {isUploading ? <Loader className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5"/>}
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
                    <FormLabel className="text-muted-foreground">Nama Tampilan</FormLabel>
                    <FormControl>
                      <Input placeholder="Nama tampilan Anda" {...field} className={neumorphicInputStyle} />
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
            <LogOut className="mr-2 h-5 w-5" />
            Keluar
        </Button>
      </div>
    </div>
  );
}

    