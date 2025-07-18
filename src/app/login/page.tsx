
'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Link from 'next/link';
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { app } from "@/lib/firebase";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const loginFormSchema = z.object({
  email: z.string().email("Format email tidak valid."),
  password: z.string().min(8, "Kata sandi minimal 8 karakter."),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

const neumorphicCardStyle = "bg-background rounded-2xl shadow-neumorphic-outset transition-all duration-300 p-8 border-none";
const neumorphicInputStyle = "bg-background border-none h-12 text-base rounded-lg shadow-neumorphic-inset focus-visible:ring-2 focus-visible:ring-primary";
const neumorphicButtonStyle = "h-12 text-base font-bold shadow-neumorphic-outset active:shadow-neumorphic-inset transition-all";


export default function LoginPage() {
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
      router.push('/');
    } catch (error) {
      console.error("Login failed:", error);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Card className={neumorphicCardStyle}>
            <div className="flex flex-col items-center gap-4 mb-8">
                <Image src="/logo.png" alt="Kita's Logo" width={64} height={64} />
                <h1 className="text-3xl font-headline font-bold text-foreground">
                    Masuk ke Kita's
                </h1>
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
                <Button type="submit" variant="default" className={`${neumorphicButtonStyle} w-full`}>
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
