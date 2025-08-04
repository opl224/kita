
'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Upload, X, Loader2, Type } from 'lucide-react';
import { getFirestore, collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { getFirebaseApp } from '@/lib/firebase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useDialogBackButton } from '@/components/layout/app-shell';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const neumorphicButtonStyle = "shadow-neumorphic-outset active:shadow-neumorphic-inset transition-all";

export function CreatePostDialog({ open, onOpenChange, user }: { open: boolean, onOpenChange: (open: boolean) => void, user: User | null }) {
  const [caption, setCaption] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTextOnly, setIsTextOnly] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const app = getFirebaseApp();
  const db = getFirestore(app);
  const { toast } = useToast();
  
  useDialogBackButton(open, onOpenChange);

  const resetForm = () => {
      setCaption('');
      setImagePreview(null);
      setBase64Image('');
      setIsTextOnly(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const MAX_SIZE = 700 * 1024; // 700KB
      if (file.size > MAX_SIZE) {
        toast({
          variant: 'destructive',
          title: 'Ukuran Gambar Terlalu Besar',
          description: 'Maksimal upload gambar 700KB.',
        });
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

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
    if (!user || isSubmitting) return;

    // Validation
    if (isTextOnly && !caption.trim()) {
        toast({ variant: 'destructive', title: 'Keterangan tidak boleh kosong.' });
        return;
    }
    if (!isTextOnly && !base64Image) {
        toast({ variant: 'destructive', title: 'Gambar tidak boleh kosong.' });
        return;
    }

    setIsSubmitting(true);

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();

      if (!userData) {
          throw new Error("User data not found");
      }

      const postData: any = {
        userId: user.uid,
        userName: userData.displayName,
        userAvatar: userData.avatarUrl,
        caption: caption,
        createdAt: serverTimestamp(),
        likes: [],
      };

      if (!isTextOnly) {
        postData.imageUrl = base64Image;
      }

      await addDoc(collection(db, 'posts'), postData);
      
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
       <DialogContent className="max-w-[90vw] sm:max-w-md bg-transparent border-none shadow-none">
         <div className="bg-background rounded-2xl shadow-neumorphic-outset p-6">
            <DialogHeader>
              <DialogTitle>Buat Postingan Baru</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="text-only-switch" className="flex items-center gap-2 text-foreground">
                    <Type className="h-4 w-4" />
                    <span>Hanya Teks</span>
                </Label>
                <Switch
                    id="text-only-switch"
                    checked={isTextOnly}
                    onCheckedChange={setIsTextOnly}
                    disabled={isSubmitting}
                />
              </div>

              <div>
                <Textarea
                  placeholder={isTextOnly ? "Apa yang Anda pikirkan?" : "Tulis keterangan..."}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="h-24 resize-none bg-background rounded-lg shadow-neumorphic-inset focus-visible:ring-2 focus-visible:ring-primary border-none"
                  disabled={isSubmitting}
                />
                 {!isTextOnly && <p className="text-xs text-muted-foreground mt-2 text-right">Maksimal 700KB.</p>}
              </div>

              {!isTextOnly && (
                <>
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
                            fill
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
                </>
              )}

              <Button 
                type="submit" 
                className={`${neumorphicButtonStyle} w-full h-12`}
                disabled={isSubmitting || (isTextOnly && !caption.trim()) || (!isTextOnly && !base64Image)}
              >
                {isSubmitting ? <Loader2 className="animate-spin" /> : 'Posting'}
              </Button>
            </form>
         </div>
         <DialogTrigger asChild>
            <button className="sr-only">Close</button>
         </DialogTrigger>
         <button 
            onClick={() => onOpenChange(false)} 
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
      </DialogContent>
    </Dialog>
  );
}
