
'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Link from 'next/link';
import { useRouter } from "next/navigation";
import { getAuth, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { app } from "@/lib/firebase";


import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { VoiceLinkLogo } from "@/components/icons/voicelink-logo";

const signupFormSchema = z.object({
  displayName: z.string().min(2, "Nama tampilan minimal 2 karakter."),
  email: z.string().email("Format email tidak valid."),
  password: z.string().min(8, "Kata sandi minimal 8 karakter."),
  confirmPassword: z.string().min(8, "Kata sandi minimal 8 karakter."),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Kata sandi tidak cocok.",
  path: ["confirmPassword"],
});

type SignupFormValues = z.infer<typeof signupFormSchema>;

const neumorphicCardStyle = "bg-background rounded-2xl shadow-[6px_6px_12px_#0d0d0d,-6px_-6px_12px_#262626] transition-all duration-300 p-8";
const neumorphicInputStyle = "bg-background border-none h-12 text-base rounded-lg shadow-[inset_4px_4px_8px_#0d0d0d,inset_-4px_-4px_8px_#262626] focus-visible:ring-2 focus-visible:ring-primary";
const neumorphicButtonStyle = "h-12 text-base font-bold shadow-[4px_4px_8px_#0d0d0d,-4px_-4px_8px_#262626] active:shadow-[inset_4px_4px_8px_#0d0d0d,inset_-4px_-4px_8px_#262626] transition-all";


export default function SignupPage() {
  const { toast } = useToast();
  const router = useRouter();
  const auth = getAuth(app);
  const db = getFirestore(app);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      displayName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onChange",
  });

  async function onSubmit(data: SignupFormValues) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;
      
      await updateProfile(user, {
        displayName: data.displayName,
      });

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        displayName: data.displayName,
        email: user.email,
        createdAt: new Date(),
        moneyCollected: 0,
        avatarUrl: `https://placehold.co/100x100.png?text=${data.displayName.charAt(0)}`
      });

      toast({
        title: "Pendaftaran Berhasil",
        description: "Akun Anda telah dibuat. Anda akan diarahkan.",
      });
      router.push('/');
    } catch (error: any) {
        let errorMessage = "Terjadi kesalahan saat membuat akun.";
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = "Email ini sudah terdaftar.";
        }
      toast({
        title: "Gagal Mendaftar",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Card className={neumorphicCardStyle}>
            <div className="flex flex-col items-center gap-4 mb-8">
                <VoiceLinkLogo className="h-16 w-16 text-primary"/>
                <h1 className="text-3xl font-headline font-bold text-foreground" style={{ textShadow: '1px 1px 2px #0d0d0d' }}>
                    Buat Akun VoiceLink
                </h1>
                <p className="text-muted-foreground text-center">Isi detail di bawah untuk memulai.</p>
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
                        <Input placeholder="Email Anda" {...field} className={neumorphicInputStyle} />
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
                    <FormLabel className="text-muted-foreground">Kata Sandi</FormLabel>
                    <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} className={neumorphicInputStyle} />
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
                <Button type="submit" variant="default" className={`${neumorphicButtonStyle} w-full bg-primary text-primary-foreground`}>
                    Daftar
                </Button>
            </form>
            </Form>
            <div className="text-center mt-6">
                <p className="text-sm text-muted-foreground">
                    Sudah punya akun?{' '}
                    <Link href="/login" className="font-semibold text-primary hover:underline">
                    Masuk
                    </Link>
                </p>
            </div>
        </Card>
    </div>
  );
}
