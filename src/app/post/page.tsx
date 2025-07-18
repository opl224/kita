
'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Upload, X, Plus, Heart, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { getFirestore, collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, getDoc, updateDoc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { app } from '@/lib/firebase';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
import { CustomLoader } from '@/components/layout/loader';
import { useDialogBackButton } from '@/components/layout/app-shell';
import { cn } from '@/lib/utils';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

type Post = {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  imageUrl: string;
  caption: string;
  createdAt: any;
  likes: string[];
};

const editCaptionSchema = z.object({
  caption: z.string().max(500, "Keterangan tidak boleh lebih dari 500 karakter."),
});

type EditCaptionFormValues = z.infer<typeof editCaptionSchema>;


const neumorphicCardStyle = "bg-background rounded-2xl shadow-neumorphic-outset transition-all duration-300 border-none";
const neumorphicButtonStyle = "shadow-neumorphic-outset active:shadow-neumorphic-inset transition-all";

function CreatePostDialog({ open, onOpenChange, user }: { open: boolean, onOpenChange: (open: boolean) => void, user: User | null }) {
  const [caption, setCaption] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const db = getFirestore(app);
  
  useDialogBackButton(open, onOpenChange);

  const resetForm = () => {
      setCaption('');
      setImagePreview(null);
      setBase64Image('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const previewUrl = e.target?.result as string;
        setImagePreview(previewUrl);
        setBase64Image(previewUrl);
      };
      reader.readAsDataURL(file);
      reader.onerror = (error) => {
        console.error("Error processing image:", error);
      };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !base64Image || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();

      if (!userData) {
          throw new Error("User data not found");
      }

      await addDoc(collection(db, 'posts'), {
        userId: user.uid,
        userName: userData.displayName,
        userAvatar: userData.avatarUrl,
        imageUrl: base64Image,
        caption: caption,
        createdAt: serverTimestamp(),
        likes: [],
      });
      
      onOpenChange(false);
      resetForm();

    } catch (error) {
      console.error("Error creating post:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
          <Button
            size="icon"
            className="fixed bottom-24 right-4 h-16 w-16 rounded-full bg-primary text-primary-foreground shadow-neumorphic-outset active:shadow-neumorphic-inset transition-all z-20"
          >
            <Plus className="h-8 w-8" />
            <span className="sr-only">Buat Postingan Baru</span>
          </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[90vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Buat Postingan Baru</DialogTitle>
          <DialogDescription>Bagikan momen Anda dengan pengguna lain.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            placeholder="Tulis keterangan..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="h-24 resize-none bg-background rounded-lg shadow-neumorphic-inset focus-visible:ring-2 focus-visible:ring-primary"
            disabled={isSubmitting}
          />

          <Input
            type="file"
            ref={fileInputRef}
            onChange={handleImageChange}
            className="hidden"
            accept="image/*"
            disabled={isSubmitting}
          />
          
          {imagePreview ? (
              <div className="relative aspect-square w-full rounded-lg overflow-hidden shadow-neumorphic-inset p-2">
                  <Image
                    src={imagePreview}
                    alt="Pratinjau gambar"
                    layout="fill"
                    objectFit="contain"
                    unoptimized
                  />
                  <Button 
                    size="icon" 
                    variant="destructive"
                    type="button"
                    className="absolute top-2 right-2 h-8 w-8 rounded-full z-10"
                    onClick={() => {
                      setImagePreview(null);
                      setBase64Image('');
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    disabled={isSubmitting}
                  >
                    <X className="h-4 w-4" />
                  </Button>
              </div>
          ) : (
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`${neumorphicButtonStyle} w-full h-24 flex-col gap-2`}
              disabled={isSubmitting}
            >
              <Upload className="h-6 w-6" />
              <span>Pilih Gambar</span>
            </Button>
          )}

          <Button 
            type="submit" 
            className="w-full h-12"
            disabled={!base64Image || isSubmitting}
          >
            {isSubmitting ? <CustomLoader /> : 'Posting'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}


export default function PostPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [deletingPost, setDeletingPost] = useState<Post | null>(null);

  const db = getFirestore(app);
  const auth = getAuth(app);
  
  const form = useForm<EditCaptionFormValues>({
    resolver: zodResolver(editCaptionSchema),
    defaultValues: { caption: "" },
  });

  useEffect(() => {
    if (editingPost) {
      form.setValue("caption", editingPost.caption);
    } else {
      form.reset({ caption: "" });
    }
  }, [editingPost, form]);


  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser);
    });
    return () => unsubscribeAuth();
  }, [auth]);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const postsData: Post[] = [];
      querySnapshot.forEach((doc) => {
        postsData.push({ id: doc.id, ...doc.data() } as Post);
      });
      setPosts(postsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching posts:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [db]);
  
  const handleLike = async (postId: string) => {
      if (!user) return;
      const postRef = doc(db, 'posts', postId);
      const postDoc = await getDoc(postRef);

      if (postDoc.exists()) {
          const postData = postDoc.data() as Post;
          if (postData.likes && postData.likes.includes(user.uid)) {
              await updateDoc(postRef, {
                  likes: arrayRemove(user.uid)
              });
          } else {
              await updateDoc(postRef, {
                  likes: arrayUnion(user.uid)
              });
          }
      }
  };
  
  const handleUpdateCaption = async (data: EditCaptionFormValues) => {
      if (!editingPost) return;
      const postRef = doc(db, 'posts', editingPost.id);
      try {
          await updateDoc(postRef, { caption: data.caption });
          setEditingPost(null);
      } catch (error) {
          console.error("Error updating caption:", error);
      }
  };

  const handleDeletePost = async () => {
      if (!deletingPost) return;
      try {
          await deleteDoc(doc(db, 'posts', deletingPost.id));
          setDeletingPost(null);
      } catch (error) {
          console.error("Error deleting post:", error);
      }
  };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in-50">
      <header>
        <h1 className="text-4xl font-headline font-bold text-foreground" style={{ textShadow: '1px 1px 2px #0d0d0d' }}>
          Feed Kita's
        </h1>
      </header>

      <main className="space-y-6 pb-24">
        {loading ? (
          <CustomLoader />
        ) : posts.length === 0 ? (
           <Card className="flex flex-col items-center justify-center p-12 text-center bg-background rounded-2xl shadow-neumorphic-inset">
                <Upload className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-foreground">Belum Ada Postingan</h3>
                <p className="text-muted-foreground">Jadilah yang pertama membagikan momen!</p>
            </Card>
        ) : (
          posts.map(post => {
            const isLiked = user && post.likes ? post.likes.includes(user.uid) : false;
            const isOwner = user && user.uid === post.userId;
            return (
                <Card key={post.id} className={neumorphicCardStyle}>
                  <CardHeader className="flex flex-row items-center gap-3 p-4">
                    <Avatar className="h-10 w-10 border-2 border-background">
                      <AvatarImage src={post.userAvatar} />
                      <AvatarFallback>{post.userName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                        <p className="font-semibold">{post.userName}</p>
                        <p className="text-xs text-muted-foreground">
                             {post.createdAt ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: false, locale: id })
                             .replace('kurang dari ', '')
                             .replace('sekitar ', '')
                             .replace('pada ', '')
                             .replace('yang lalu ', '')
                             : 'baru saja'}
                        </p>
                    </div>
                     {isOwner && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                    <MoreVertical className="h-5 w-5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setEditingPost(post)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    <span>Ubah Keterangan</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setDeletingPost(post)} className="text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    <span>Hapus</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                     )}
                  </CardHeader>
                  <CardContent className="p-0">
                    {post.caption && <p className="px-4 pb-3 text-sm">{post.caption}</p>}
                     <div className="relative aspect-square w-full bg-muted">
                        <Image
                          src={post.imageUrl}
                          alt={`Postingan oleh ${post.userName}`}
                          layout="fill"
                          objectFit="cover"
                          unoptimized
                        />
                    </div>
                  </CardContent>
                  <CardFooter className="p-4">
                      <div className="flex items-center gap-2">
                          <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleLike(post.id)}
                              className={cn(
                                  "rounded-full h-10 w-10 transition-all",
                                  isLiked && "text-red-500 hover:text-red-600 active:scale-90"
                              )}
                          >
                              <Heart className={cn("h-6 w-6", isLiked && "fill-current")} />
                          </Button>
                          <span className="text-sm font-medium text-muted-foreground">
                              {(post.likes || []).length} suka
                          </span>
                      </div>
                  </CardFooter>
                </Card>
            )
          })
        )}
      </main>
      
      {user && <CreatePostDialog open={isCreatePostOpen} onOpenChange={setIsCreatePostOpen} user={user} />}

      {/* Edit Caption Dialog */}
       <Dialog open={!!editingPost} onOpenChange={(open) => !open && setEditingPost(null)}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Ubah Keterangan</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleUpdateCaption)} className="space-y-4">
                      <FormField
                          control={form.control}
                          name="caption"
                          render={({ field }) => (
                              <FormItem>
                                  <FormLabel>Keterangan</FormLabel>
                                  <FormControl>
                                      <Textarea {...field} className="h-24 resize-none bg-background rounded-lg shadow-neumorphic-inset" />
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
      
      {/* Delete Post Alert */}
       <AlertDialog open={!!deletingPost} onOpenChange={(open) => !open && setDeletingPost(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Hapus Postingan?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Tindakan ini tidak dapat diurungkan. Postingan Anda akan dihapus secara permanen.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeletePost}>Hapus</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
       </AlertDialog>
    </div>
  );
}
