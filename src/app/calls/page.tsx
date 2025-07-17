
'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageCircle, ArrowRight, UserPlus, Trash2, Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { getFirestore, collection, getDocs, addDoc, serverTimestamp, query, where, documentId, onSnapshot, orderBy, doc, deleteDoc, writeBatch, updateDoc } from "firebase/firestore";
import { app } from "@/lib/firebase";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useRouter } from "next/navigation";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

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


const neumorphicCardStyle = "bg-background relative rounded-2xl shadow-neumorphic-outset transition-all duration-300 p-6 border-none";

export default function VoiceNoteGroupsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isSuperUser, setIsSuperUser] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState<Group | null>(null);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);


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
    if (editingGroup) {
      form.setValue("name", editingGroup.name);
    } else {
      form.reset({ name: "" });
    }
  }, [editingGroup, form]);

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
        if (editingGroup) {
            // Edit existing group
            const groupRef = doc(db, 'groups', editingGroup.id);
            await updateDoc(groupRef, { name: data.name });
            toast({
                title: "Grup Diperbarui",
                description: `Nama grup telah diubah menjadi "${data.name}".`,
            });
            setEditingGroup(null);
        } else {
            // Create new group
            const groupsCollection = collection(db, 'groups');
            await addDoc(groupsCollection, {
                name: data.name,
                members: [user.uid],
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
        }
        form.reset();
    } catch (error) {
       toast({
        title: editingGroup ? "Gagal Memperbarui Grup" : "Gagal Membuat Grup",
        description: "Terjadi kesalahan saat menyimpan perubahan.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteGroup = async () => {
    if (!deletingGroup) return;

    try {
      const groupRef = doc(db, 'groups', deletingGroup.id);
      const messagesRef = collection(db, 'groups', deletingGroup.id, 'messages');
      const messagesSnapshot = await getDocs(messagesRef);
      
      const batch = writeBatch(db);
      
      messagesSnapshot.forEach(doc => {
          batch.delete(doc.ref);
      });
      batch.delete(groupRef);
      
      await batch.commit();

      toast({
        title: "Grup Dihapus",
        description: `Grup "${deletingGroup.name}" dan semua pesannya telah dihapus.`,
      });
    } catch (error) {
      console.error("Error deleting group:", error);
      toast({
        title: "Gagal Menghapus Grup",
        description: "Terjadi kesalahan saat menghapus grup.",
        variant: "destructive",
      });
    } finally {
        setDeletingGroup(null);
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
      </header>

      <main className="space-y-6">
        {groups.map(group => (
          <Card key={group.id} className={neumorphicCardStyle}>
            <div className="flex flex-col gap-4">
               {/* Baris Judul dan Aksi Admin */}
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xl font-headline font-semibold text-foreground truncate">{group.name}</h2>
                {isSuperUser && (
                  <div className="flex items-center gap-1">
                     <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary h-6 w-6" onClick={() => setEditingGroup(group)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog open={deletingGroup?.id === group.id} onOpenChange={(isOpen) => !isOpen && setDeletingGroup(null)}>
                      <AlertDialogTrigger asChild>
                          <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-muted-foreground hover:text-destructive h-6 w-6"
                              onClick={(e) => { e.stopPropagation(); setDeletingGroup(group); }}
                          >
                              <Trash2 className="h-4 w-4" />
                          </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                          <AlertDialogHeader>
                              <AlertDialogTitle>Hapus Grup "{deletingGroup?.name}"?</AlertDialogTitle>
                              <AlertDialogDescription>
                                  Tindakan ini tidak dapat diurungkan. Ini akan menghapus grup dan semua pesan di dalamnya secara permanen.
                              </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction onClick={handleDeleteGroup}>Hapus</AlertDialogAction>
                          </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>

               {/* Baris Avatar dan Navigasi */}
              <div className="flex items-center justify-between">
                <div className="flex items-center -space-x-2">
                    {group.members && group.members.length > 0 ? group.members.slice(0, 5).map((member: any) => (
                      <Avatar key={member.uid} className="h-10 w-10 border-2 border-background">
                        <AvatarImage src={member.avatarUrl} alt={member.displayName} className="object-cover"/>
                        <AvatarFallback>{member.displayName?.charAt(0) || '?'}</AvatarFallback>
                      </Avatar>
                    )) : <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">?</div>}
                     {group.members && group.members.length > 5 && (
                        <Avatar className="h-10 w-10 border-2 border-background">
                            <AvatarFallback>+{group.members.length - 5}</AvatarFallback>
                        </Avatar>
                    )}
                </div>
                <Button variant="ghost" size="icon" className="text-primary opacity-50" onClick={() => handleGroupClick(group.id)}>
                    <ArrowRight className="h-6 w-6" />
                    <span className="sr-only">Masuk Grup</span>
                </Button>
              </div>

              {/* Baris Info Pesan Terakhir */}
              <div className="flex items-center gap-3 text-sm text-muted-foreground pt-4 border-t border-border/20">
                  <MessageCircle className="h-4 w-4 flex-shrink-0"/>
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
                  <Button variant="default" className="h-14 rounded-xl shadow-neumorphic-outset active:shadow-neumorphic-inset transition-all text-base font-bold bg-primary text-primary-foreground">
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

      {/* Edit Group Dialog */}
      <Dialog open={!!editingGroup} onOpenChange={(isOpen) => !isOpen && setEditingGroup(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Ubah Nama Grup</DialogTitle>
                <DialogDescription>
                    Masukkan nama baru untuk grup "{editingGroup?.name}".
                </DialogDescription>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onGroupSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nama Grup Baru</FormLabel>
                            <FormControl>
                            <Input {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <Button type="submit" className="w-full">Simpan Perubahan</Button>
                </form>
            </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
