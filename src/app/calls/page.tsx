
'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, Phone, Video, Square, Play, Trash2, Send } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { getFirestore, collection, addDoc, serverTimestamp, getDocs, query, orderBy } from "firebase/firestore";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { app } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';

const onlineUsers = [
  { id: '1', name: 'Andi Sukma', avatar: 'https://placehold.co/80x80.png?text=AS', data_ai_hint: 'man portrait' },
  { id: '2', name: 'Bunga Citra', avatar: 'https://placehold.co/80x80.png?text=BC', data_ai_hint: 'woman portrait' },
  { id: '3', name: 'Cahya Purnama', avatar: 'https://placehold.co/80x80.png?text=CP', data_ai_hint: 'person smiling' },
  { id: '4', name: 'Dewi Lestari', avatar: 'https://placehold.co/80x80.png?text=DL', data_ai_hint: 'woman nature' },
];

const inCallUsers = [
  { id: '5', name: 'Eko Prasetyo', avatar: 'https://placehold.co/80x80.png?text=EP', time: '12:34', data_ai_hint: 'man thinking' },
  { id: '6', name: 'Fitriani', avatar: 'https://placehold.co/80x80.png?text=F', time: '05:12', data_ai_hint: 'woman glasses' },
];

const neumorphicCardStyle = "bg-background rounded-2xl shadow-[6px_6px_12px_#0d0d0d,-6px_-6px_12px_#262626] transition-all duration-300 p-6";
const neumorphicButtonStyle = "rounded-full aspect-square w-14 h-14 bg-background shadow-[4px_4px_8px_#0d0d0d,-4px_-4px_8px_#262626] text-muted-foreground hover:text-primary active:shadow-[inset_4px_4px_8px_#0d0d0d,inset_-4px_-4px_8px_#262626] transition-all";

interface VoiceMessage {
    id: string;
    audioUrl: string;
    senderName: string;
    senderAvatar: string;
    createdAt: any;
}

export default function CallsPage() {
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const [voiceMessages, setVoiceMessages] = useState<VoiceMessage[]>([]);
    
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    const auth = getAuth(app);
    const db = getFirestore(app);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, currentUser => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, [auth]);

    useEffect(() => {
        const fetchMessages = async () => {
            const q = query(collection(db, "voiceMessages"), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            const messages = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VoiceMessage));
            setVoiceMessages(messages);
        };

        fetchMessages();
    }, [db]);


    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Dynamically import OpusMediaRecorder
            const OpusMediaRecorder = (await import('opus-media-recorder')).default;

            const options = { mimeType: 'audio/ogg; codecs=opus' };
            const workerUrl = new URL(
              'opus-media-recorder/dist/encoderWorker.umd.js',
              import.meta.url
            ).href;
            
            mediaRecorderRef.current = new OpusMediaRecorder(stream, options, {
              encoderWorkerFactory: () => new Worker(workerUrl)
            });
            
            const chunks: BlobPart[] = [];
            mediaRecorderRef.current.ondataavailable = (event) => {
                chunks.push(event.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/ogg; codecs=opus' });
                setAudioBlob(blob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setRecordingTime(0);

            recordingIntervalRef.current = setInterval(() => {
                setRecordingTime(prev => {
                    if (prev >= 29) {
                        stopRecording();
                        return 30;
                    }
                    return prev + 1;
                });
            }, 1000);

        } catch (error) {
            console.error("Error starting recording:", error);
            toast({
                title: "Gagal Merekam",
                description: "Tidak bisa mengakses mikrofon. Mohon izinkan akses mikrofon di browser Anda.",
                variant: "destructive"
            });
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        if (recordingIntervalRef.current) {
            clearInterval(recordingIntervalRef.current);
        }
        setIsRecording(false);
    };

    const playAudio = () => {
        if (audioBlob) {
            const url = URL.createObjectURL(audioBlob);
            if (audioRef.current) {
                audioRef.current.src = url;
                audioRef.current.play();
            }
        }
    };

    const resetRecording = () => {
        setAudioBlob(null);
        setRecordingTime(0);
    };

    const sendVoiceMessage = async () => {
        if (!audioBlob || !user) return;

        try {
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = async () => {
                const base64data = reader.result as string;
                
                await addDoc(collection(db, "voiceMessages"), {
                    audioUrl: base64data,
                    senderName: user.displayName || "Pengguna Anonim",
                    senderAvatar: user.photoURL || `https://placehold.co/40x40.png?text=${user.displayName?.charAt(0) || 'A'}`,
                    createdAt: serverTimestamp(),
                });

                toast({
                    title: "Pesan Suara Terkirim",
                    description: "Pesan suara Anda telah berhasil dikirim.",
                });
                resetRecording();
                // Refresh messages
                const q = query(collection(db, "voiceMessages"), orderBy("createdAt", "desc"));
                const querySnapshot = await getDocs(q);
                const messages = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VoiceMessage));
                setVoiceMessages(messages);
            };
        } catch (error) {
            console.error("Error sending message:", error);
            toast({
                title: "Gagal Mengirim",
                description: "Terjadi kesalahan saat mengirim pesan suara.",
                variant: "destructive",
            });
        }
    };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in-50">
      <header>
        <h1 className="text-4xl font-headline font-bold text-foreground" style={{ textShadow: '1px 1px 2px #0d0d0d' }}>
          Panggilan Audio
        </h1>
        <p className="text-muted-foreground mt-1">Terhubung dengan teman Anda atau tinggalkan pesan suara.</p>
      </header>

      <main className="space-y-12">
        <section>
          <h2 className="text-2xl font-headline font-semibold mb-6 text-foreground">Tinggalkan Pesan Suara</h2>
            <Card className={neumorphicCardStyle}>
                <div className="flex flex-col items-center gap-4">
                    {!audioBlob ? (
                        <>
                            <Button variant="ghost" className={`${neumorphicButtonStyle} w-20 h-20 ${isRecording ? 'text-red-500' : ''}`} onClick={isRecording ? stopRecording : startRecording}>
                                {isRecording ? <Square className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
                            </Button>
                            <p className="text-muted-foreground">
                                {isRecording ? `Merekam: ${recordingTime}s / 30s` : "Ketuk untuk Merekam (Max 30 detik)"}
                            </p>
                            {isRecording && <div className="w-full bg-muted rounded-full h-2.5 mt-2">
                                <div className="bg-primary h-2.5 rounded-full" style={{ width: `${(recordingTime/30)*100}%` }}></div>
                            </div>}
                        </>
                    ) : (
                        <div className="flex flex-col items-center w-full gap-4">
                             <audio ref={audioRef} className="hidden" />
                            <p className="font-semibold text-foreground">Pratinjau Pesan Suara</p>
                            <div className="flex items-center gap-4">
                                <Button variant="ghost" className={neumorphicButtonStyle} onClick={playAudio}>
                                    <Play className="h-6 w-6" />
                                </Button>
                                <Button variant="ghost" className={`${neumorphicButtonStyle} bg-primary/20 text-primary`} onClick={sendVoiceMessage}>
                                    <Send className="h-6 w-6" />
                                </Button>
                                <Button variant="ghost" className={`${neumorphicButtonStyle} bg-red-500/20 text-red-400`} onClick={resetRecording}>
                                    <Trash2 className="h-6 w-6" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </Card>
        </section>

        <section>
          <h2 className="text-2xl font-headline font-semibold mb-6 text-foreground">Pesan Suara Terbaru</h2>
            <div className="space-y-4">
                {voiceMessages.map(msg => (
                    <Card key={msg.id} className={neumorphicCardStyle}>
                        <div className="flex items-center gap-4">
                            <Avatar className="h-12 w-12">
                                <AvatarImage src={msg.senderAvatar} />
                                <AvatarFallback>{msg.senderName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-grow">
                                <p className="font-semibold text-foreground">{msg.senderName}</p>
                                <p className="text-xs text-muted-foreground">{msg.createdAt ? formatDistanceToNow(msg.createdAt.toDate(), { addSuffix: true, locale: id }) : 'Baru saja'}</p>
                            </div>
                            <audio src={msg.audioUrl} controls className="h-10"/>
                        </div>
                    </Card>
                ))}
                 {voiceMessages.length === 0 && (
                    <p className="text-muted-foreground text-center">Belum ada pesan suara.</p>
                )}
            </div>
        </section>

        <section>
          <h2 className="text-2xl font-headline font-semibold mb-6 text-foreground">Sedang Daring</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {onlineUsers.map(user => (
              <Card key={user.id} className={neumorphicCardStyle}>
                <div className="flex flex-col items-center text-center gap-4">
                  <Avatar className="h-20 w-20 border-4 border-background shadow-[4px_4px_8px_#0d0d0d,-4px_-4px_8px_#262626]">
                    <AvatarImage src={user.avatar} alt={user.name} data-ai-hint={user.data_ai_hint} />
                    <AvatarFallback>{user.name.slice(0,2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <h3 className="text-lg font-semibold font-body text-foreground">{user.name}</h3>
                  <div className="flex gap-4 mt-2">
                    <Button variant="ghost" className={neumorphicButtonStyle}>
                      <Phone className="h-6 w-6" />
                    </Button>
                    <Button variant="ghost" className={neumorphicButtonStyle}>
                      <Video className="h-6 w-6" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-headline font-semibold mb-6 text-foreground">Dalam Panggilan</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {inCallUsers.map(user => (
              <Card key={user.id} className={neumorphicCardStyle}>
                <div className="flex items-center gap-6">
                  <Avatar className="h-20 w-20 border-4 border-background shadow-[4px_4px_8px_#0d0d0d,-4px_-4px_8px_#262626]">
                    <AvatarImage src={user.avatar} alt={user.name} data-ai-hint={user.data_ai_hint} />
                    <AvatarFallback>{user.name.slice(0,2).toUpperCase()}</AvatarFallback>
                    <div className="absolute bottom-0 right-0 bg-green-500 rounded-full h-5 w-5 border-2 border-background animate-pulse" />
                  </Avatar>
                  <div className="flex-grow">
                    <h3 className="text-xl font-semibold font-body text-foreground">{user.name}</h3>
                    <p className="text-muted-foreground flex items-center gap-2">
                      <Mic className="h-4 w-4 text-primary" />
                      <span>{user.time}</span>
                    </p>
                  </div>
                  <Button variant="ghost" className={`${neumorphicButtonStyle} bg-red-500/20 text-red-400 hover:text-red-500 hover:bg-red-500/30`}>
                    <Phone className="h-6 w-6" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
