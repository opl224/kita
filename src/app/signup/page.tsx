
'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from "next/navigation";
import { getAuth, createUserWithEmailAndPassword, updateProfile, AuthErrorCodes } from "firebase/auth";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseApp } from "@/lib/firebase";
import { useState } from "react";


import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";
import { CustomLoader } from "@/components/layout/loader";

const signupFormSchema = z.object({
  displayName: z.string().min(4, "Nama pengguna minimal 4 karakter.").regex(/^[a-zA-Z0-9]+$/, "Nama pengguna hanya boleh berisi huruf dan angka."),
  email: z.string().email("Format email tidak valid."),
  password: z.string().min(8, "Kata sandi minimal 8 karakter."),
  confirmPassword: z.string().min(8, "Kata sandi minimal 8 karakter."),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Kata sandi tidak cocok.",
  path: ["confirmPassword"],
});

type SignupFormValues = z.infer<typeof signupFormSchema>;

const neumorphicCardStyle = "bg-background rounded-2xl shadow-neumorphic-outset transition-all duration-300 p-8 border-none";
const neumorphicInputStyle = "bg-background border-none h-12 text-base rounded-lg shadow-neumorphic-inset focus-visible:ring-2 focus-visible:ring-primary";
const neumorphicButtonStyle = "h-12 text-base font-bold shadow-neumorphic-outset active:shadow-neumorphic-inset transition-all";

const SUPER_USER_UID = "vopA2wSkuDOqt2AUOPIvOdCMtAg2";

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const app = getFirebaseApp();
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
    setIsSubmitting(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;
      
      await updateProfile(user, {
        displayName: data.displayName,
      });

      const userDocData: any = {
        uid: user.uid,
        displayName: data.displayName,
        email: user.email,
        createdAt: serverTimestamp(),
        avatarUrl: `https://placehold.co/100x100.png?text=${data.displayName.charAt(0)}`,
        lastSeenNotifications: new Date(0),
        lastSeenCalls: new Date(0),
        hasGivenFeedback: false,
        totalReceived: 0,
      };

      if (user.uid === SUPER_USER_UID) {
        userDocData.isSuperUser = true;
      }
      
      await setDoc(doc(db, "users", user.uid), userDocData);
      
      toast({
        title: "Pendaftaran Berhasil!",
        description: "Akun Anda telah berhasil dibuat.",
      });
      router.push('/');

    } catch (error: any) {
        console.error("Signup failed:", error);
        let title = "Pendaftaran Gagal";
        let description = "Terjadi kesalahan. Silakan coba lagi.";

        if (error.code === AuthErrorCodes.EMAIL_EXISTS) {
            description = "Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.";
        } else if (error.code === AuthErrorCodes.WEAK_PASSWORD) {
            description = "Kata sandi terlalu lemah. Gunakan minimal 8 karakter.";
        }

        toast({
            variant: "destructive",
            title: title,
            description: description,
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Card className={neumorphicCardStyle}>
            <div className="flex flex-col items-center gap-4 mb-8">
                <Image src="/logo.png" alt="Kita's Logo" width={64} height={64} />
                <h1 className="text-3xl font-headline font-bold text-foreground">
                    Buat Akun Kita's
                </h1>
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
                            <Input placeholder="Nama pengguna" {...field} className={neumorphicInputStyle} disabled={isSubmitting}/>
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
                        <Input type="email" placeholder="Email Anda" {...field} className={neumorphicInputStyle} disabled={isSubmitting}/>
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
                    <div className="relative">
                        <FormControl>
                            <Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} className={`${neumorphicInputStyle} pr-10`} disabled={isSubmitting}/>
                        </FormControl>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute inset-y-0 right-0 flex items-center justify-center h-full w-12 text-muted-foreground hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                            disabled={isSubmitting}
                        >
                            {showPassword ? <EyeOff /> : <Eye />}
                        </Button>
                    </div>
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
                     <div className="relative">
                        <FormControl>
                            <Input type={showConfirmPassword ? "text" : "password"} placeholder="••••••••" {...field} className={`${neumorphicInputStyle} pr-10`} disabled={isSubmitting}/>
                        </FormControl>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute inset-y-0 right-0 flex items-center justify-center h-full w-12 text-muted-foreground hover:bg-transparent"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            disabled={isSubmitting}
                        >
                            {showConfirmPassword ? <EyeOff /> : <Eye />}
                        </Button>
                    </div>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <Button type="submit" variant="default" className={`${neumorphicButtonStyle} w-full`} disabled={isSubmitting}>
                    {isSubmitting ? <CustomLoader /> : 'Daftar'}
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
