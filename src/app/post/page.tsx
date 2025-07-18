
'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Upload, Copy, Check } from 'lucide-react';

const neumorphicCardStyle = "bg-background rounded-2xl shadow-neumorphic-outset transition-all duration-300 border-none";
const neumorphicButtonStyle = "shadow-neumorphic-outset active:shadow-neumorphic-inset transition-all";

export default function PostPage() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Create a preview URL
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);

      // Convert to Base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = () => {
        setBase64Image(reader.result as string);
      };
      reader.onerror = (error) => {
        console.error("Error converting file to Base64:", error);
        toast({
          variant: "destructive",
          title: "Gagal Mengubah Gambar",
          description: "Terjadi kesalahan saat mengubah gambar menjadi Base64.",
        });
      };
    }
  };

  const triggerFileSelect = () => fileInputRef.current?.click();

  const copyToClipboard = () => {
    if (!base64Image) return;
    navigator.clipboard.writeText(base64Image).then(() => {
      setIsCopied(true);
      toast({
        title: 'Berhasil Disalin!',
        description: 'String Base64 telah disalin ke clipboard.',
      });
      setTimeout(() => setIsCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
       toast({
          variant: "destructive",
          title: "Gagal Menyalin",
          description: "Tidak dapat menyalin teks ke clipboard.",
        });
    });
  };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in-50">
      <header>
        <h1 className="text-4xl font-headline font-bold text-foreground" style={{ textShadow: '1px 1px 2px #0d0d0d' }}>
          Buat Postingan
        </h1>
        <p className="text-muted-foreground mt-1">Unggah gambar dan konversi ke Base64.</p>
      </header>

      <main className="space-y-6">
        <Card className={neumorphicCardStyle}>
          <CardHeader>
            <CardTitle>Unggah Gambar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              className="hidden"
              accept="image/*"
            />
            <Button onClick={triggerFileSelect} className={`${neumorphicButtonStyle} w-full h-12`}>
              <Upload className="mr-2 h-5 w-5" />
              Pilih Gambar
            </Button>

            {imagePreview && (
              <div className="space-y-4">
                <CardTitle className="text-lg">Pratinjau</CardTitle>
                <div className="relative aspect-square w-full max-w-md mx-auto rounded-lg overflow-hidden shadow-neumorphic-inset p-2">
                    <Image
                      src={imagePreview}
                      alt="Pratinjau gambar yang diunggah"
                      layout="fill"
                      objectFit="contain"
                    />
                </div>
              </div>
            )}

            {base64Image && (
              <div className="space-y-4">
                <CardTitle className="text-lg">String Base64</CardTitle>
                <div className="relative">
                    <Textarea
                        readOnly
                        value={base64Image}
                        className="h-48 resize-none bg-background rounded-lg shadow-neumorphic-inset focus-visible:ring-2 focus-visible:ring-primary pr-12"
                        rows={6}
                    />
                    <Button 
                        size="icon" 
                        variant="ghost" 
                        className="absolute top-2 right-2 h-8 w-8"
                        onClick={copyToClipboard}
                    >
                        {isCopied ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5 text-muted-foreground" />}
                    </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
