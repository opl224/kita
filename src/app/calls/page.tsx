
'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageCircle, ArrowRight, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { getFirestore, collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { app } from "@/lib/firebase";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useRouter } from "next/navigation";

const groupFormSchema = z.object({
  name: z.string().min(3, "Nama grup minimal 3 karakter."),
});

type GroupFormValues = z.infer<typeof groupFormSchema>;

const neumorphicCardStyle = "bg-background rounded-2xl shadow-[6px_6px_12px_#0d0d0d,-6px_-6px_12px_#262626] transition-all duration-300 p-6";

export default function VoiceNoteGroupsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isSuperUser, setIsSuperUser] = useState(false);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  const auth = getAuth(app);
  const db = getFirestore(app);
  const { toast } = useToast();
  const router = useRouter();
  const superUserUid = "c3iJXsgRfdgvmzVtsSwefsmJ3pI2";

  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: {
      name: "",
    },
  });

   useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setIsSuperUser(currentUser.uid === superUserUid);
        
        const groupsCollection = collection(db, 'groups');
        const groupSnapshot = await getDocs(groupsCollection);
        const groupList = groupSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setGroups(groupList);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth, db]);

  const onGroupSubmit = async (data: GroupFormValues) => {
    if (!user) return;
    try {
      const groupsCollection = collection(db, 'groups');
      const newGroupDoc = await addDoc(groupsCollection, {
        name: data.name,
        members: [], // Start with an empty member list
        createdAt: serverTimestamp(),
        createdBy: user.uid,
      });

      // Refresh groups list
      const groupSnapshot = await getDocs(groupsCollection);
      const groupList = groupSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGroups(groupList);
      
      toast({
        title: "Grup Dibuat",
        description: `Grup "${data.name}" berhasil dibuat.`,
      });
      setIsCreatingGroup(false);
      form.reset();

    } catch (error) {
       toast({
        title: "Gagal Membuat Grup",
        description: "Terjadi kesalahan saat membuat grup baru.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div>Memuat grup...</div>
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in-50">
      <header>
        <h1 className="text-4xl font-headline font-bold text-foreground" style={{ textShadow: '1px 1px 2px #0d0d0d' }}>
          Pesan Suara Grup
        </h1>
        <p className="text-muted-foreground mt-1">Dengarkan dan kirim pesan suara ke grup Anda.</p>
      </header>

      <main className="space-y-6">
        {groups.map(group => (
          <Card key={group.id} className={neumorphicCardStyle}>
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-start">
                  <div>
                      <h2 className="text-xl font-headline font-semibold text-foreground">{group.name}</h2>
                      <div className="flex items-center -space-x-2 mt-2">
                        {group.members && group.members.length > 0 ? group.members.map((member: any) => (
                          <Avatar key={member.uid} className="h-8 w-8 border-2 border-background">
                            <AvatarImage src={member.avatarUrl} alt={member.displayName} />
                            <AvatarFallback>{member.displayName.charAt(0)}</AvatarFallback>
                          </Avatar>
                        )) : <p className="text-xs text-muted-foreground">Belum ada anggota</p>}
                      </div>
                  </div>
                   <Button variant="ghost" size="icon" className="text-primary hover:text-primary/80">
                      <ArrowRight className="h-6 w-6" />
                      <span className="sr-only">Masuk Grup</span>
                   </Button>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground pt-4 border-t border-border/20">
                    <MessageCircle className="h-4 w-4"/>
                    <p className="flex-grow truncate">{group.lastMessage || "Belum ada pesan."}</p>
                    <span className="text-xs shrink-0">{group.lastMessageTime || ""}</span>
              </div>
            </div>
          </Card>
        ))}
         {isSuperUser && (
           <div className="text-center pt-4">
              <Dialog open={isCreatingGroup} onOpenChange={setIsCreatingGroup}>
                <DialogTrigger asChild>
                  <Button variant="default" className="h-14 rounded-xl shadow-[4px_4px_8px_#0d0d0d,-4px_-4px_8px_#262626] active:shadow-[inset_4px_4px_8px_#0d0d0d,inset_-4px_-4px_8px_#262626] transition-all text-base font-bold bg-primary text-primary-foreground">
                      <UserPlus className="mr-2"/>
                      Buat Grup Baru
                  </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Buat Grup Baru</DialogTitle>
                      <DialogDescription>
                        Masukkan nama untuk grup baru Anda.
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onGroupSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nama Grup</FormLabel>
                              <FormControl>
                                <Input placeholder="Contoh: Tim Proyek Hebat" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button type="submit" className="w-full">Buat Grup</Button>
                      </form>
                    </Form>
                  </DialogContent>
              </Dialog>
           </div>
         )}
      </main>
    </div>
  );
}
