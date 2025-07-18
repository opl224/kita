
'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, Plus } from 'lucide-react';
import { getFirestore, collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { app } from '@/lib/firebase';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
import { CustomLoader } from '@/components/layout/loader';
import { useDialogBackButton } from '@/components/layout/app-shell';

type Post = {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  imageUrl: string;
  caption: string;
  createdAt: any;
};

const neumorphicCardStyle = "bg-background rounded-2xl shadow-neumorphic-outset transition-all duration-300 border-none";
const neumorphicButtonStyle = "shadow-neumorphic-outset active:shadow-neumorphic-inset transition-all";

function CreatePostDialog({ open, onOpenChange, user }: { open: boolean, onOpenChange: (open: boolean) => void, user: User | null }) {
  const [caption, setCaption] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
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
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = () => setBase64Image(reader.result as string);
      reader.onerror = (error) => {
        toast({ variant: "destructive", title: "Gagal memproses gambar." });
      };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !base64Image || isSubmitting) return;

    setIsSubmitting(true);

    try {
      // 1. Get user data for post
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();

      if (!userData) {
          throw new Error("User data not found");
      }

      // 2. Create post document in Firestore with Base64 image
      await addDoc(collection(db, 'posts'), {
        userId: user.uid,
        userName: userData.displayName,
        userAvatar: userData.avatarUrl,
        imageUrl: base64Image, // Store the Base64 string directly
        caption: caption,
        createdAt: serverTimestamp(),
      });
      
      toast({ title: 'Postingan berhasil dibuat!' });
      onOpenChange(false);
      resetForm();

    } catch (error) {
      console.error("Error creating post:", error);
      toast({ variant: "destructive", title: 'Gagal membuat postingan.' });
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
  const db = getFirestore(app);
  const auth = getAuth(app);

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
          posts.map(post => (
            <Card key={post.id} className={neumorphicCardStyle}>
              <CardHeader className="flex flex-row items-center gap-3 p-4">
                <Avatar className="h-10 w-10 border-2 border-background">
                  <AvatarImage src={post.userAvatar} />
                  <AvatarFallback>{post.userName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                    <p className="font-semibold">{post.userName}</p>
                    <p className="text-xs text-muted-foreground">
                         {post.createdAt ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true, locale: id }) : 'baru saja'}
                    </p>
                </div>
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
            </Card>
          ))
        )}
      </main>
      
      <CreatePostDialog open={isCreatePostOpen} onOpenChange={setIsCreatePostOpen} user={user} />
    </div>
  );
}
