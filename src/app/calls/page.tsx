
'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageCircle, ArrowRight, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { getFirestore, collection, getDocs, addDoc, serverTimestamp, query, where, documentId, onSnapshot, orderBy } from "firebase/firestore";
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

type Group = {
  id: string;
  name: string;
  members: any[];
  lastMessage?: string;
  lastMessageTime?: string;
};


const neumorphicCardStyle = "bg-background rounded-2xl shadow-[6px_6px_12px_#0d0d0d,-6px_-6px_12px_#262626] transition-all duration-300 p-6 cursor-pointer hover:shadow-[8px_8px_16px_#0d0d0d,-8px_-8px_16px_#262626]";

export default function VoiceNoteGroupsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isSuperUser, setIsSuperUser] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
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
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        if (currentUser) {
            setIsSuperUser(currentUser.uid === superUserUid);
        }
        setLoading(false);
    });

    return () => unsubscribeAuth();
  }, [auth]);

  useEffect(() => {
    if (loading) return; 

    const groupsCollection = collection(db, 'groups');
    const q = query(groupsCollection, orderBy('lastMessageTime', 'desc'));

    const unsubscribeGroups = onSnapshot(q, async (querySnapshot) => {
        const groupList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group));
        
        // Fetch user data for members
        const allMemberIds = [...new Set(groupList.flatMap(g => g.members || []))];
        
        if (allMemberIds.length > 0) {
            const usersCollection = collection(db, 'users');
            const usersQuery = query(usersCollection, where(documentId(), 'in', allMemberIds));
            const usersSnapshot = await getDocs(usersQuery);
            const usersData = usersSnapshot.docs.reduce((acc, doc) => {
                acc[doc.id] = doc.data();
                return acc;
            }, {} as any);

            const populatedGroups = groupList.map(group => ({
                ...group,
                members: group.members.map((memberId: string) => usersData[memberId]).filter(Boolean),
            }));
            setGroups(populatedGroups);
        } else {
            setGroups(groupList);
        }
    });

    return () => unsubscribeGroups();

  }, [db, loading]);

  const onGroupSubmit = async (data: GroupFormValues) => {
    if (!user) return;
    try {
      const groupsCollection = collection(db, 'groups');
      await addDoc(groupsCollection, {
        name: data.name,
        members: [user.uid], // Creator is the first member
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        lastMessage: "Grup baru saja dibuat.",
        lastMessageTime: serverTimestamp()
      });
      
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

  const handleGroupClick = (groupId: string) => {
    router.push(`/calls/${groupId}`);
  };


  if (loading) {
    return <div className="flex items-center justify-center h-screen">Memuat grup...</div>
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
          <Card key={group.id} className={neumorphicCardStyle} onClick={() => handleGroupClick(group.id)}>
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-start">
                  <div>
                      <h2 className="text-xl font-headline font-semibold text-foreground">{group.name}</h2>
                      <div className="flex items-center -space-x-2 mt-2">
                        {group.members && group.members.length > 0 ? group.members.slice(0, 5).map((member: any) => (
                          <Avatar key={member.uid} className="h-8 w-8 border-2 border-background">
                            <AvatarImage src={member.avatarUrl} alt={member.displayName} className="object-cover"/>
                            <AvatarFallback>{member.displayName?.charAt(0) || '?'}</AvatarFallback>
                          </Avatar>
                        )) : <p className="text-xs text-muted-foreground">Belum ada anggota</p>}
                         {group.members && group.members.length > 5 && (
                            <Avatar className="h-8 w-8 border-2 border-background">
                                <AvatarFallback>+{group.members.length - 5}</AvatarFallback>
                            </Avatar>
                        )}
                      </div>
                  </div>
                   <div className="text-primary opacity-50">
                      <ArrowRight className="h-6 w-6" />
                      <span className="sr-only">Masuk Grup</span>
                   </div>
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
