
'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Link from 'next/link';
import { useRouter } from "next/navigation";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { app } from "@/lib/firebase";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { VoiceLinkLogo } from "@/components/icons/voicelink-logo";

const loginFormSchema = z.object({
  email: z.string().email("Format email tidak valid."),
  password: z.string().min(8, "Kata sandi minimal 8 karakter."),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

const neumorphicCardStyle = "bg-background rounded-2xl shadow-[6px_6px_12px_#0d0d0d,-6px_-6px_12px_#262626] transition-all duration-300 p-8";
const neumorphicInputStyle = "bg-background border-none h-12 text-base rounded-lg shadow-[inset_4px_4px_8px_#0d0d0d,inset_-4px_-4px_8px_#262626] focus-visible:ring-2 focus-visible:ring-primary";
const neumorphicButtonStyle = "h-12 text-base font-bold shadow-[4px_4px_8px_#0d0d0d,-4px_-4px_8px_#262626] active:shadow-[inset_4px_4px_8px_#0d0d0d,inset_-4px_-4px_8px_#262626] transition-all";


export default function LoginPage() {
  const { toast } = useToast();
  const router = useRouter();
  const auth = getAuth(app);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onChange",
  });

  async function onSubmit(data: LoginFormValues) {
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      toast({
        title: "Berhasil Masuk",
        description: "Selamat datang kembali!",
      });
      router.push('/');
    } catch (error) {
      toast({
        title: "Gagal Masuk",
        description: "Email atau kata sandi salah. Silakan coba lagi.",
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
                    Masuk ke VoiceLink
                </h1>
                <p className="text-muted-foreground text-center">Masukkan detail Anda untuk melanjutkan.</p>
            </div>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
                <Button type="submit" variant="default" className={`${neumorphicButtonStyle} w-full bg-primary text-primary-foreground`}>
                    Masuk
                </Button>
            </form>
            </Form>
            <div className="text-center mt-6">
                <p className="text-sm text-muted-foreground">
                    Belum punya akun?{' '}
                    <Link href="/signup" className="font-semibold text-primary hover:underline">
                    Daftar
                    </Link>
                </p>
            </div>
        </Card>
    </div>
  );
}
