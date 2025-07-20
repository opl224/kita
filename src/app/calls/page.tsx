
'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageCircle, ArrowRight, UserPlus, Trash2, Pencil, Loader2, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { getFirestore, collection, getDocs, addDoc, serverTimestamp, query, where, documentId, onSnapshot, orderBy, doc, deleteDoc, writeBatch, updateDoc, getDoc } from "firebase/firestore";
import { getFirebaseApp } from "@/lib/firebase";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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

const SUPER_USER_UID = "vopA2wSkuDOqt2AUOPIvOdCMtAg2";

const neumorphicCardStyle = "bg-background relative rounded-[30px] shadow-neumorphic-deep transition-all duration-300 border-none";
const neumorphicInputStyle = "bg-background border-none h-12 text-base rounded-lg shadow-neumorphic-inset focus-visible:ring-2 focus-visible:ring-primary";
const neumorphicButtonStyle = "h-12 text-base font-bold shadow-neumorphic-outset active:shadow-neumorphic-inset transition-all";


export function CreateEditGroupDialog({ open, onOpenChange, editingGroup, onSubmit }: { open: boolean, onOpenChange: (open: boolean) => void, editingGroup: Group | null, onSubmit: (data: GroupFormValues) => void }) {
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

  const handleSubmit = (data: GroupFormValues) => {
      onSubmit(data);
      onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-transparent border-none shadow-none sm:max-w-md">
            <div className="bg-background rounded-2xl shadow-neumorphic-outset p-6">
                <DialogHeader>
                    <DialogTitle>{editingGroup ? 'Ubah Nama Grup' : 'Buat Grup Baru'}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 mt-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>{editingGroup ? 'Nama Grup Baru' : 'Nama Grup'}</FormLabel>
                                <FormControl>
                                <Input placeholder="Contoh: Tim Proyek Hebat" {...field} className={neumorphicInputStyle} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <Button type="submit" className={`${neumorphicButtonStyle} w-full`}>{editingGroup ? 'Simpan Perubahan' : 'Buat Grup'}</Button>
                    </form>
                </Form>
            </div>
        </DialogContent>
    </Dialog>
  );
}


export default function VoiceNoteGroupsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isSuperUser, setIsSuperUser] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState<Group | null>(null);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [superAdminName, setSuperAdminName] = useState('Super Admin');


  const app = getFirebaseApp();
  const auth = getAuth(app);
  const db = getFirestore(app);
  const router = useRouter();

   useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
        if (currentUser) {
            setUser(currentUser);
            const userDocRef = doc(db, 'users', currentUser.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                setIsSuperUser(!!userDocSnap.data().isSuperUser);
            }
        } else {
            setUser(null);
            setIsSuperUser(false);
            router.push('/login');
        }
    });

    return () => unsubscribeAuth();
  }, [auth, db, router]);
  
  useEffect(() => {
    const fetchSuperAdminName = async () => {
        try {
            const superUserDocRef = doc(db, 'users', SUPER_USER_UID);
            const superUserDocSnap = await getDoc(superUserDocRef);
            if (superUserDocSnap.exists()) {
                setSuperAdminName(superUserDocSnap.data().displayName || 'Super Admin');
            }
        } catch (error) {
            console.error("Error fetching super admin name:", error);
        }
    };
    fetchSuperAdminName();
  }, [db]);

  useEffect(() => {
    if (!user) {
        setGroups([]);
        return;
    }

    const groupsCollection = collection(db, 'groups');
    const q = query(
      groupsCollection, 
      where('members', 'array-contains', user.uid)
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
             // Sort groups by lastMessageTime on the client-side
            populatedGroups.sort((a, b) => {
                const timeA = a.lastMessageTime?.toDate() || new Date(0);
                const timeB = b.lastMessageTime?.toDate() || new Date(0);
                return timeB.getTime() - timeA.getTime();
            });
            setGroups(populatedGroups);
        } else {
            setGroups(groupList);
        }
    }, (error) => {
      console.error("Error fetching groups:", error);
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


  if (!user) {
    return null;
  }

  return (
    <div className="overflow-hidden">
        <div className="flex flex-col gap-8">
            <header className="flex justify-between items-center">
                <h1 className="text-4xl font-headline font-bold text-foreground" style={{ textShadow: '1px 1px 2px #0d0d0d' }}>
                Pesan Suara Grup
                </h1>
            </header>

            <main className="space-y-6 pb-24">
                {groups.length > 0 ? (
                    groups.map(group => (
                    <Card key={group.id} className={neumorphicCardStyle} onClick={() => handleGroupClick(group.id)}>
                        <div className="flex flex-col gap-4 p-6">
                        <div className="flex items-start justify-between gap-2">
                            <h2 className="text-xl font-headline font-semibold text-foreground truncate max-w-[200px]">{group.name}</h2>
                            {(isSuperUser || user?.uid === group.createdBy) && (
                            <div className="flex items-center gap-1 flex-shrink-0 z-10" onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary h-8 w-8" onClick={(e) => { e.stopPropagation(); setEditingGroup(group); }}>
                                    <Pencil className="h-4 w-4" />
                                </Button>
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
                                <Avatar key={member?.id || index} className="h-10 w-10 border-2 border-background">
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
                                    ? formatDistanceToNow(group.lastMessageTime.toDate(), { addSuffix: false, locale: id })
                                    .replace('kurang dari ', '')
                                    .replace('sekitar ', '')
                                    .replace('pada ', '')
                                    .replace('yang lalu ', '')
                                    : group.lastMessageTime || ""}
                            </span>
                        </div>
                        </div>
                    </Card>
                    ))
                ) : (
                    <Card className="flex flex-col items-center justify-center p-12 text-center bg-background rounded-2xl shadow-neumorphic-inset">
                        <MessageCircle className="h-16 w-16 text-muted-foreground mb-4" />
                        <h3 className="text-xl font-semibold text-foreground">Belum Punya Grup</h3>
                        <p className="text-muted-foreground break-words">
                            Minta <span className="font-semibold text-foreground truncate inline-block align-middle max-w-[200px]">{superAdminName}</span> untuk mengundang ke grup yang sudah ada.
                        </p>
                    </Card>
                )}
            </main>
        </div>
        
        {isSuperUser && (
            <Button
                size="icon"
                className="fixed bottom-24 right-4 h-16 w-16 rounded-full bg-primary text-primary-foreground shadow-neumorphic-outset active:shadow-neumorphic-inset transition-all z-20"
                onClick={() => setIsCreateGroupOpen(true)}
            >
                <Plus className="h-8 w-8" />
                <span className="sr-only">Buat Grup Baru</span>
            </Button>
        )}

        <CreateEditGroupDialog 
            open={isCreateGroupOpen || !!editingGroup}
            onOpenChange={(isOpen) => {
                if (!isOpen) {
                    setIsCreateGroupOpen(false);
                    setEditingGroup(null);
                }
            }}
            editingGroup={editingGroup}
            onSubmit={onGroupSubmit}
        />
    </div>
  );
}
