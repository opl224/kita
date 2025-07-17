
'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, getDoc, collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, updateDoc, arrayUnion } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Mic, UserPlus, Square, Play, Pause } from 'lucide-react';
import OpusMediaRecorder from 'opus-media-recorder';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';

type Message = {
    id: string;
    senderId: string;
    senderName: string;
    senderAvatar: string;
    audioUrl: string; 
    createdAt: any;
    duration: number;
};

type GroupInfo = {
    name: string;
    members: string[];
    createdBy: string;
}

const neumorphicInsetStyle = "bg-background rounded-2xl shadow-[inset_4px_4px_8px_#0d0d0d,inset_-4px_-4px_8px_#262626]";

// Helper function to create a WAV file from raw PCM data.
const createWavFile = (pcmData: Float32Array, sampleRate: number): Blob => {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = pcmData.length * numChannels * (bitsPerSample / 8);
    const fileSize = 36 + dataSize;

    const buffer = new ArrayBuffer(fileSize + 8);
    const view = new DataView(buffer);

    let offset = 0;

    const writeString = (str: string) => {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(offset++, str.charCodeAt(i));
        }
    };

    writeString('RIFF');
    view.setUint32(offset, fileSize, true);
    offset += 4;
    writeString('WAVE');
    writeString('fmt ');
    view.setUint32(offset, 16, true);
    offset += 4;
    view.setUint16(offset, 1, true);
    offset += 2;
    view.setUint16(offset, numChannels, true);
    offset += 2;
    view.setUint32(offset, sampleRate, true);
    offset += 4;
    view.setUint32(offset, byteRate, true);
    offset += 4;
    view.setUint16(offset, blockAlign, true);
    offset += 2;
    view.setUint16(offset, bitsPerSample, true);
    offset += 2;
    writeString('data');
    view.setUint32(offset, dataSize, true);
    offset += 4;

    for (let i = 0; i < pcmData.length; i++) {
        const s = Math.max(-1, Math.min(1, pcmData[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        offset += 2;
    }

    return new Blob([buffer], { type: 'audio/wav' });
};

const AudioPlayer = ({ src }: { src: string }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        if (!audioRef.current) return;
        
        const audio = audioRef.current;
        const handleEnded = () => setIsPlaying(false);
        
        audio.addEventListener('ended', handleEnded);

        // Preload the audio
        if (src) {
            audio.src = src;
            audio.load();
        }

        return () => {
            audio.removeEventListener('ended', handleEnded);
        };
    }, [src]);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play().catch(e => console.error("Error playing audio:", e));
        }
        setIsPlaying(!isPlaying);
    };

    const waveformBars = [4, 8, 12, 16, 20, 24, 20, 16, 12, 8, 12, 16, 20, 24, 20, 16, 12, 16, 20, 24, 20, 16, 12, 8, 4];

    return (
        <div className="flex items-center gap-3">
            <audio ref={audioRef} preload="metadata" />
            <Button
                variant="ghost"
                size="icon"
                onClick={togglePlay}
                className="w-10 h-10 rounded-full bg-primary/20 text-primary-foreground flex-shrink-0"
            >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            <div className="flex items-center gap-1 h-8 w-[150px]">
                 {waveformBars.map((height, i) => (
                    <div
                        key={i}
                        className="w-1 bg-primary/50 rounded-full"
                        style={{ height: `${height}px` }}
                    />
                ))}
            </div>
        </div>
    );
};


export default function GroupChatPage() {
    const [user, setUser] = useState<User | null>(null);
    const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Recording states
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);

    const mediaRecorderRef = useRef<OpusMediaRecorder | null>(null);
    const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const audioChunksRef = useRef<any[]>([]);
    const startTimeRef = useRef<number>(0);
    
    const params = useParams();
    const groupId = params.groupId as string;
    const router = useRouter();
    const auth = getAuth(app);
    const db = getFirestore(app);
    const { toast } = useToast();

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            if (!currentUser) {
                router.push('/login');
                return;
            }
            setUser(currentUser);
        });

        return () => unsubscribeAuth();
    }, [auth, router]);

    useEffect(() => {
        if (!user || !groupId) return;

        const groupDocRef = doc(db, 'groups', groupId);
        const getGroupInfo = async () => {
            const docSnap = await getDoc(groupDocRef);
            if (docSnap.exists()) {
                const groupData = docSnap.data() as GroupInfo;
                setGroupInfo(groupData);

                if (!groupData.members.includes(user.uid)) {
                    await updateDoc(groupDocRef, {
                        members: arrayUnion(user.uid)
                    });
                }
            } else {
                toast({ title: "Grup tidak ditemukan", variant: "destructive" });
                router.push('/calls');
            }
            setLoading(false);
        };
        getGroupInfo();

        const messagesColRef = collection(db, 'groups', groupId, 'messages');
        const q = query(messagesColRef, orderBy('createdAt', 'asc'));
        const unsubscribeMessages = onSnapshot(q, (querySnapshot) => {
            const fetchedMessages: Message[] = [];
            querySnapshot.forEach(doc => {
                fetchedMessages.push({ id: doc.id, ...doc.data() } as Message);
            });
            setMessages(fetchedMessages);
        });

        return () => unsubscribeMessages();

    }, [user, groupId, db, router, toast]);
    
    const blobToBase64 = (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result === 'string') {
                    resolve(reader.result);
                } else {
                    reject(new Error('Failed to convert blob to Base64'));
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const sendVoiceNote = async (pcmData: Float32Array, sampleRate: number, duration: number) => {
        if (!user || !groupId || duration < 0.5) return;
    
        try {
            const audioBlob = createWavFile(pcmData, sampleRate);
            const base64data = await blobToBase64(audioBlob);

            if (!base64data || !base64data.startsWith('data:audio/wav')) {
                toast({ title: "Error Audio", description: "Data audio tidak valid.", variant: "destructive"});
                return;
            }
            
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            const userData = userDoc.data();

            if (!userData) {
                toast({ title: "Error Pengguna", description: "Data pengguna tidak ditemukan.", variant: "destructive"});
                return;
            }

            await addDoc(collection(db, 'groups', groupId, 'messages'), {
                senderId: user.uid,
                senderName: userData?.displayName || 'Pengguna Anonim',
                senderAvatar: userData?.avatarUrl || '',
                audioUrl: base64data,
                createdAt: serverTimestamp(),
                duration: Math.round(duration)
            });

            await updateDoc(doc(db, 'groups', groupId), {
                lastMessage: `Pesan suara (${formatTime(duration)})`,
                lastMessageTime: formatDistanceToNow(new Date(), { addSuffix: true, locale: id })
            });
            
        } catch (error) {
            console.error("Error sending voice note:", error);
            toast({ title: "Gagal Mengirim Pesan", description: "Terjadi kesalahan saat mengonversi atau mengirim audio.", variant: "destructive" });
        }
    };
    
const startRecording = async () => {
    if (isRecording) return;
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Use a standard MIME type that gives raw audio data
        const options = { mimeType: 'audio/webm' }; 
        
        const workerUrl = 'https://cdn.jsdelivr.net/npm/opus-media-recorder@latest/encoderWorker.umd.js';
        const response = await fetch(workerUrl);
        const workerCode = await response.text();
        const workerBlob = new Blob([workerCode], { type: 'application/javascript' });
        const workerObjectUrl = URL.createObjectURL(workerBlob);

        const workerOptions = {
            encoderWorkerFactory: () => new Worker(workerObjectUrl),
            OggOpusEncoderWasmPath: 'https://cdn.jsdelivr.net/npm/opus-media-recorder@latest/OggOpusEncoder.wasm',
            WebMOpusEncoderWasmPath: 'https://cdn.jsdelivr.net/npm/opus-media-recorder@latest/WebMOpusEncoder.wasm'
        };

        const recorder = new OpusMediaRecorder(stream, options, workerOptions);
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];
        
        recorder.onstart = () => {
            setIsRecording(true);
            startTimeRef.current = Date.now();
            if(recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
            recordingIntervalRef.current = setInterval(() => {
                const elapsed = (Date.now() - startTimeRef.current) / 1000;
                setRecordingDuration(elapsed);
            }, 100);
        };

        recorder.ondataavailable = (event) => {
            if(event.data.size > 0) {
                 audioChunksRef.current.push(event.data);
            }
        };

        recorder.onstop = () => {
            stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
            if(recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
            URL.revokeObjectURL(workerObjectUrl);
            
            const finalDuration = (Date.now() - startTimeRef.current) / 1000;
            setRecordingDuration(0);

            if (audioChunksRef.current.length > 0 && finalDuration > 0.5) {
                // @ts-ignore
                const sampleRate = mediaRecorderRef.current?.sampleRate || 48000;
                const concatenated = new Float32Array(audioChunksRef.current.reduce((acc, val) => acc + val.length, 0));
                let offset = 0;
                for (const chunk of audioChunksRef.current) {
                    concatenated.set(chunk, offset);
                    offset += chunk.length;
                }
                sendVoiceNote(concatenated, sampleRate, finalDuration);
            }
            audioChunksRef.current = [];
        };

        // This custom event gives us the raw PCM data we need for WAV conversion
        recorder.addEventListener('audioprocess', (e: any) => {
             if (e.detail) {
                audioChunksRef.current.push(e.detail);
             }
        });

        recorder.start();

    } catch (err) {
        console.error("Error starting recording:", err);
        toast({ 
            title: 'Gagal Memulai Rekaman', 
            description: err instanceof Error ? err.message : 'Pastikan Anda telah memberikan izin mikrofon.', 
            variant: 'destructive' 
        });
    }
};

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
    };
    
    const toggleRecording = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-screen">Memuat obrolan...</div>;
    }

    return (
        <div className="flex flex-col h-screen bg-background">
            <header className="flex items-center p-4 border-b border-border shadow-sm sticky top-0 bg-background z-10">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft />
                </Button>
                <div className="ml-4">
                    <h1 className="text-xl font-bold font-headline">{groupInfo?.name || 'Grup'}</h1>
                    <p className="text-xs text-muted-foreground">{groupInfo?.members.length} anggota</p>
                </div>
                 <Button variant="ghost" size="icon" className="ml-auto">
                    <UserPlus />
                 </Button>
            </header>

            <main className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex items-end gap-2 ${msg.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}>
                       {msg.senderId !== user?.uid && (
                           <Avatar className="h-8 w-8">
                               <AvatarImage src={msg.senderAvatar} />
                               <AvatarFallback>{msg.senderName?.charAt(0) || 'P'}</AvatarFallback>
                           </Avatar>
                       )}
                       <div className={`flex flex-col max-w-[75%] ${msg.senderId === user?.uid ? 'items-end' : 'items-start'}`}>
                            {msg.senderId !== user?.uid && <p className="text-xs text-muted-foreground ml-3 mb-1">{msg.senderName}</p>}
                            <Card className={`p-2 rounded-xl ${msg.senderId === user?.uid ? 'bg-primary/20' : 'bg-muted'}`}>
                                <AudioPlayer src={msg.audioUrl} />
                            </Card>
                            <div className="flex items-center gap-2 mt-1 px-2">
                                <p className="text-xs text-muted-foreground">
                                    {msg.createdAt ? formatDistanceToNow(msg.createdAt.toDate(), { addSuffix: true, locale: id }) : ''}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {formatTime(msg.duration || 0)}
                                </p>
                            </div>
                       </div>
                    </div>
                ))}
            </main>

            <footer className="p-4 border-t border-border bg-background sticky bottom-0">
                 <div className={`${neumorphicInsetStyle} flex items-center justify-between p-2 rounded-full h-20 gap-4`}>
                    
                    {isRecording && (
                        <div className="flex items-center gap-2 flex-1 justify-center">
                            <div className="h-2 w-2 rounded-full bg-destructive animate-pulse"></div>
                            <span className="font-mono text-lg text-foreground">{formatTime(recordingDuration)}</span>
                        </div>
                    )}
                    
                    <div className="flex-1"></div>

                    <Button 
                        size="icon" 
                        variant={isRecording ? "destructive" : "default"}
                        className="w-16 h-16 rounded-full bg-primary text-primary-foreground shadow-[4px_4px_8px_#0d0d0d,-4px_-4px_8px_#262626] active:shadow-[inset_4px_4px_8px_#0d0d0d,inset_-4px_-4px_8px_#262626] flex-shrink-0"
                        onClick={toggleRecording}
                    >
                        {isRecording ? <Square className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
                    </Button>
                 </div>
            </footer>
        </div>
    );
}
