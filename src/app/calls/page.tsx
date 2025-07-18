
'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageCircle, ArrowRight, UserPlus, Trash2, Pencil, Loader2, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { getFirestore, collection, getDocs, addDoc, serverTimestamp, query, where, documentId, onSnapshot, orderBy, doc, deleteDoc, writeBatch, updateDoc } from "firebase/firestore";
import { app } from "@/lib/firebase";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useRouter } from "next/navigation";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
import { CustomLoader } from "@/components/layout/loader";
import { useDialogBackButton } from "@/components/layout/app-shell";

const groupFormSchema = z.object({
  name: z.string().min(3, "Nama grup minimal 3 karakter."),
});

type GroupFormValues = z.infer<typeof groupFormSchema>;

type Group = {
  id: string;
  name: string;
  members: any[];
  lastMessage?: string;
  lastMessageTime?: any;
  createdBy: string;
};


const neumorphicCardStyle = "bg-background relative rounded-2xl shadow-neumorphic-outset transition-all duration-300 p-6 border-none";

function CreateEditGroupDialog({ open, onOpenChange, editingGroup, onSubmit }: { open: boolean, onOpenChange: (open: boolean) => void, editingGroup: Group | null, onSubmit: (data: GroupFormValues) => void }) {
  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: { name: "" },
  });

  useDialogBackButton(open, onOpenChange);

  useEffect(() => {
    if (editingGroup) {
      form.setValue("name", editingGroup.name);
    } else {
      form.reset({ name: "" });
    }
  }, [editingGroup, form, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{editingGroup ? 'Ubah Nama Grup' : 'Buat Grup Baru'}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>{editingGroup ? 'Nama Grup Baru' : 'Nama Grup'}</FormLabel>
                            <FormControl>
                            <Input placeholder="Contoh: Tim Proyek Hebat" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <Button type="submit" className="w-full">{editingGroup ? 'Simpan Perubahan' : 'Buat Grup'}</Button>
                </form>
            </Form>
        </DialogContent>
    </Dialog>
  );
}


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
  const router = useRouter();
  const superUserUid = "c3iJXsgRfdgvmzVtsSwefsmJ3pI2";

   useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
        if (currentUser) {
            setUser(currentUser);
            setIsSuperUser(currentUser.uid === superUserUid);
        } else {
            setUser(null);
            setIsSuperUser(false);
            setLoading(false); // If no user, stop loading
        }
    });

    return () => unsubscribeAuth();
  }, [auth]);

  useEffect(() => {
    if (!user) {
        setGroups([]);
        if (auth.currentUser === null) { // Only set loading false if auth state is determined
          setLoading(false);
        }
        return;
    }

    setLoading(true);

    // Mark all group messages as "seen" by updating the timestamp
    const userDocRef = doc(db, "users", user.uid);
    updateDoc(userDocRef, {
      lastSeenCalls: serverTimestamp()
    }).catch(err => console.error("Error updating last seen calls timestamp:", err));


    const groupsCollection = collection(db, 'groups');
    const q = query(
      groupsCollection, 
      where('members', 'array-contains', user.uid), 
      orderBy('lastMessageTime', 'desc')
    );

    const unsubscribeGroups = onSnapshot(q, async (querySnapshot) => {
        const groupList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group));
        
        const allMemberIds = [...new Set(groupList.flatMap(g => g.members || []))];
        
        if (allMemberIds.length > 0) {
            const usersCollection = collection(db, 'users');
            const userChunks: string[][] = [];
            for (let i = 0; i < allMemberIds.length; i += 30) {
              userChunks.push(allMemberIds.slice(i, i + 30));
            }

            const usersData: any = {};
            for (const chunk of userChunks) {
              if (chunk.length > 0) {
                const usersQuery = query(usersCollection, where(documentId(), 'in', chunk));
                const usersSnapshot = await getDocs(usersQuery);
                usersSnapshot.docs.forEach(doc => {
                    usersData[doc.id] = doc.data();
                });
              }
            }

            const populatedGroups = groupList.map(group => ({
                ...group,
                members: (group.members || []).map((memberId: string) => usersData[memberId]).filter(Boolean),
            }));
            setGroups(populatedGroups);
        } else {
            setGroups(groupList);
        }
        setLoading(false);
    }, (error) => {
      console.error("Error fetching groups:", error);
      setLoading(false);
    });

    return () => unsubscribeGroups();

  }, [db, user]);

  const onGroupSubmit = async (data: GroupFormValues) => {
    if (!user) return;
    try {
        if (editingGroup) {
            const groupRef = doc(db, 'groups', editingGroup.id);
            await updateDoc(groupRef, { name: data.name });
            setEditingGroup(null);
        } else {
            const groupsCollection = collection(db, 'groups');
            await addDoc(groupsCollection, {
                name: data.name,
                members: [user.uid],
                createdAt: serverTimestamp(),
                createdBy: user.uid,
                lastMessage: "Grup baru saja dibuat.",
                lastMessageTime: serverTimestamp()
            });
            setIsCreatingGroup(false);
        }
    } catch (error) {
       console.error("Error saving group:", error);
    }
  };

  const handleDeleteGroup = async () => {
    if (!deletingGroup) return;

    try {
      await deleteDoc(doc(db, 'groups', deletingGroup.id));
    } catch (error) {
      console.error("Error deleting group:", error);
    } finally {
        setDeletingGroup(null);
    }
  };


  const handleGroupClick = (groupId: string) => {
    router.push(`/calls/${groupId}`);
  };


  if (loading) {
    return <CustomLoader />;
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in-50">
      <header>
        <h1 className="text-4xl font-headline font-bold text-foreground" style={{ textShadow: '1px 1px 2px #0d0d0d' }}>
          Pesan Suara Grup
        </h1>
      </header>

      <main className="space-y-6 pb-24">
        {groups.map(group => (
          <Card key={group.id} className={neumorphicCardStyle} onClick={() => handleGroupClick(group.id)}>
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-xl font-headline font-semibold text-foreground truncate">{group.name}</h2>
                 {(isSuperUser || user?.uid === group.createdBy) && (
                  <div className="flex items-center gap-1 flex-shrink-0 z-10" onClick={(e) => e.stopPropagation()}>
                    <Dialog open={editingGroup?.id === group.id} onOpenChange={(isOpen) => isOpen ? setEditingGroup(group) : setEditingGroup(null)}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary h-8 w-8" onClick={() => setEditingGroup(group)}>
                                <Pencil className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                    </Dialog>
                    <AlertDialog open={deletingGroup?.id === group.id} onOpenChange={(isOpen) => !isOpen && setDeletingGroup(null)}>
                      <AlertDialogTrigger asChild>
                          <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-muted-foreground hover:text-destructive h-8 w-8"
                              onClick={(e) => { e.stopPropagation(); setDeletingGroup(group); }}
                          >
                              <Trash2 className="h-4 w-4" />
                          </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                          <AlertDialogHeader>
                              <AlertDialogTitle>Hapus Grup "{deletingGroup?.name}"?</AlertDialogTitle>
                              <AlertDialogDescription>
                                  Tindakan ini tidak dapat diurungkan. Ini akan menghapus grup secara permanen. Pesan di dalamnya tidak akan terhapus dari sisi aplikasi ini.
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

              <div className="flex items-center justify-between">
                <div className="flex items-center -space-x-2">
                    {group.members && group.members.slice(0, 5).map((member: any, index: number) => (
                      <Avatar key={member?.uid || index} className="h-10 w-10 border-2 border-background">
                        <AvatarImage src={member?.avatarUrl} alt={member?.displayName} className="object-cover"/>
                        <AvatarFallback>{member?.displayName?.charAt(0) || '?'}</AvatarFallback>
                      </Avatar>
                    ))}
                     {group.members && group.members.length > 5 && (
                        <Avatar className="h-10 w-10 border-2 border-background bg-muted">
                            <AvatarFallback>+{group.members.length - 5}</AvatarFallback>
                        </Avatar>
                    )}
                </div>
                <Button variant="ghost" size="icon" className="text-primary opacity-50" onClick={() => handleGroupClick(group.id)}>
                    <ArrowRight className="h-6 w-6" />
                    <span className="sr-only">Masuk Grup</span>
                </Button>
              </div>

              <div className="flex items-center gap-3 text-sm text-muted-foreground pt-4 border-t border-border/20">
                  <MessageCircle className="h-4 w-4 flex-shrink-0"/>
                  <p className="flex-grow truncate">{group.lastMessage || "Belum ada pesan."}</p>
                  <span className="text-xs shrink-0">
                    {group.lastMessageTime && typeof group.lastMessageTime.toDate === 'function'
                        ? formatDistanceToNow(group.lastMessageTime.toDate(), { addSuffix: true, locale: id })
                        : group.lastMessageTime || ""}
                  </span>
              </div>
            </div>
          </Card>
        ))}
         {isSuperUser && (
            <Dialog open={isCreatingGroup} onOpenChange={setIsCreatingGroup}>
              <DialogTrigger asChild>
                <Button
                  size="icon"
                  className="fixed bottom-24 right-4 h-16 w-16 rounded-full bg-primary text-primary-foreground shadow-neumorphic-outset active:shadow-neumorphic-inset transition-all z-20"
                >
                  <Plus className="h-8 w-8" />
                  <span className="sr-only">Buat Grup Baru</span>
                </Button>
              </DialogTrigger>
            </Dialog>
         )}
      </main>

      <CreateEditGroupDialog 
        open={isCreatingGroup || !!editingGroup}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setIsCreatingGroup(false);
            setEditingGroup(null);
          }
        }}
        editingGroup={editingGroup}
        onSubmit={onGroupSubmit}
      />
    </div>
  );
}
