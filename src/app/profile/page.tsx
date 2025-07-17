'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { getAuth, signOut } from "firebase/auth";
import { app } from "@/lib/firebase";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Camera, LogOut } from "lucide-react";

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

const neumorphicCardStyle = "bg-background rounded-2xl shadow-[6px_6px_12px_#0d0d0d,-6px_-6px_12px_#262626] transition-all duration-300 p-8";
const neumorphicInputStyle = "bg-background border-none h-12 text-base rounded-lg shadow-[inset_4px_4px_8px_#0d0d0d,inset_-4px_-4px_8px_#262626] focus-visible:ring-2 focus-visible:ring-primary";
const neumorphicButtonStyle = "h-12 text-base font-bold shadow-[4px_4px_8px_#0d0d0d,-4px_-4px_8px_#262626] active:shadow-[inset_4px_4px_8px_#0d0d0d,inset_-4px_-4px_8px_#262626] transition-all";

export default function ProfilePage() {
  const { toast } = useToast();
  const router = useRouter();
  const auth = getAuth(app);
  
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: "User Ling",
      email: "user.ling@example.com",
      password: "",
      confirmPassword: "",
    },
    mode: "onChange",
  });

  function onSubmit(data: ProfileFormValues) {
    toast({
      title: "Profil Diperbarui",
      description: "Informasi profil Anda telah berhasil disimpan.",
    });
  }

  async function handleLogout() {
    try {
      await signOut(auth);
      toast({
        title: "Berhasil Keluar",
        description: "Anda telah berhasil keluar dari akun Anda.",
      });
      router.push('/');
    } catch (error) {
      toast({
        title: "Gagal Keluar",
        description: "Terjadi kesalahan saat mencoba keluar.",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in-50 max-w-4xl mx-auto">
      <header>
        <h1 className="text-4xl font-headline font-bold text-foreground" style={{ textShadow: '1px 1px 2px #0d0d0d' }}>
          Profil Saya
        </h1>
        <p className="text-muted-foreground mt-1">Kelola informasi akun Anda.</p>
      </header>

      <Card className={neumorphicCardStyle}>
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="relative">
            <Avatar className="h-32 w-32 border-4 border-background shadow-[6px_6px_12px_#0d0d0d,-6px_-6px_12px_#262626]">
              <AvatarImage src="https://placehold.co/128x128.png" alt="User Avatar" data-ai-hint="user avatar" />
              <AvatarFallback>UL</AvatarFallback>
            </Avatar>
            <Button size="icon" className={`${neumorphicButtonStyle} absolute bottom-0 right-0 w-10 h-10 rounded-full bg-primary text-primary-foreground`}>
                <Camera className="h-5 w-5"/>
                <span className="sr-only">Ubah Avatar</span>
            </Button>
          </div>
          <h2 className="text-2xl font-headline font-semibold text-foreground">User Ling</h2>
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
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button type="submit" variant="default" className={`${neumorphicButtonStyle} flex-1 bg-primary text-primary-foreground`}>
                Simpan Perubahan
              </Button>
              <Button type="button" variant="secondary" onClick={handleLogout} className={`${neumorphicButtonStyle} flex-1`}>
                <LogOut className="mr-2 h-5 w-5" />
                Keluar
              </Button>
            </div>
          </form>
        </Form>
      </Card>
    </div>
  );
}
