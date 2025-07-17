
'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, getDoc, collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, updateDoc, arrayUnion, deleteDoc, getDocs, where, documentId, writeBatch } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Mic, UserPlus, Square, Play, Pause, Trash2, UserCheck, Loader2 } from 'lucide-react';
import OpusMediaRecorder from 'opus-media-recorder';
import { formatDistanceToNow } from 'date-fns';
import { id, type Locale } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';

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

type AppUser = {
    id: string;
    displayName: string;
    avatarUrl: string;
    email: string;
}

const neumorphicInsetStyle = "bg-background rounded-2xl shadow-neumorphic-inset";

const AudioPlayer = ({ src }: { src: string }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        
        const handleEnded = () => setIsPlaying(false);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('ended', handleEnded);
        };
    }, []);

    const togglePlay = () => {
        const audio = audioRef.current;
        if (!audio) return;
        
        if (isPlaying) {
            audio.pause();
        } else {
            audio.play().catch(e => console.error("Error playing audio:", e));
        }
        setIsPlaying(!isPlaying);
    };

    const waveformBars = [4, 8, 12, 16, 20, 24, 20, 16, 12, 8, 12, 16, 20, 24, 20, 16, 12, 16, 20, 24, 20, 16, 12, 8, 4];

    return (
        <div className="flex items-center gap-3">
            <audio ref={audioRef} src={src} preload="metadata" />
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
    const [isSuperUser, setIsSuperUser] = useState(false);
    const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Invite users state
    const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
    const [allUsers, setAllUsers] = useState<AppUser[]>([]);
    const [nonMemberUsers, setNonMemberUsers] = useState<AppUser[]>([]);
    const [invitingUsers, setInvitingUsers] = useState<Set<string>>(new Set());

    // Recording states
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);

    const mediaRecorderRef = useRef<OpusMediaRecorder | null>(null);
    const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const startTimeRef = useRef<number>(0);
    
    const params = useParams();
    const groupId = params.groupId as string;
    const router = useRouter();
    const auth = getAuth(app);
    const db = getFirestore(app);
    const { toast } = useToast();
    const superUserUid = "c3iJXsgRfdgvmzVtsSwefsmJ3pI2";

    // Custom locale for date-fns to remove "kurang dari" and "yang lalu"
    const customLocale: Locale = {
        ...id,
        formatDistance: (token, count, options) => {
            const formatDistanceLocale = {
                lessThanXSeconds: 'baru saja',
                xSeconds: '{{count}} detik',
                halfAMinute: 'setengah menit',
                lessThanXMinutes: 'baru saja',
                xMinutes: '{{count}} menit',
                aboutXHours: '{{count}} jam',
                xHours: '{{count}} jam',
                xDays: '{{count}} hari',
                aboutXWeeks: '{{count}} minggu',
                xWeeks: '{{count}} minggu',
                aboutXMonths: '{{count}} bulan',
                xMonths: '{{count}} bulan',
                aboutXYears: '{{count}} tahun',
                xYears: '{{count}} tahun',
                overXYears: '{{count}} tahun',
                almostXYears: '{{count}} tahun',
            };
    
            const result = formatDistanceLocale[token as keyof typeof formatDistanceLocale]?.replace('{{count}}', count.toString()) ?? '';
    
            if (options?.addSuffix) {
                 return result;
            }
    
            return result;
        },
    };


    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            if (!currentUser) {
                router.push('/login');
                return;
            }
            setUser(currentUser);
            setIsSuperUser(currentUser.uid === superUserUid);
        });

        return () => unsubscribeAuth();
    }, [auth, router]);

    useEffect(() => {
        if (!user || !groupId) return;

        const groupDocRef = doc(db, 'groups', groupId);
        const getGroupInfo = async () => {
            try {
                const docSnap = await getDoc(groupDocRef);
                if (docSnap.exists()) {
                    const groupData = docSnap.data() as GroupInfo;
                    setGroupInfo(groupData);

                    if (!groupData.members.includes(user.uid)) {
                       toast({ title: "Akses Ditolak", description: "Anda bukan anggota grup ini.", variant: "destructive" });
                       router.push('/calls');
                       return;
                    }
                } else {
                    toast({ title: "Grup tidak ditemukan", variant: "destructive" });
                    router.push('/calls');
                }
            } catch (error) {
                console.error("Error getting group info:", error);
                toast({ title: "Gagal memuat grup", variant: "destructive" });
                router.push('/calls');
            } finally {
                setLoading(false);
            }
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

    // Effect to fetch users for invitation dialog
    useEffect(() => {
        if (isSuperUser && isInviteDialogOpen) {
            const fetchUsers = async () => {
                const usersCollection = collection(db, 'users');
                const usersSnapshot = await getDocs(usersCollection);
                const allUsersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser));
                setAllUsers(allUsersData);
            };
            fetchUsers();
        }
    }, [isSuperUser, isInviteDialogOpen, db]);

    // Effect to filter non-member users
    useEffect(() => {
        if (groupInfo && allUsers.length > 0) {
            const memberIds = new Set(groupInfo.members);
            const nonMembers = allUsers.filter(u => !memberIds.has(u.id));
            setNonMemberUsers(nonMembers);
        }
    }, [groupInfo, allUsers]);

    const handleInviteUser = async (invitedUser: AppUser) => {
        if (!user || !groupInfo) return;

        setInvitingUsers(prev => new Set(prev).add(invitedUser.id));

        try {
            // Check if an invitation already exists
            const invitationsRef = collection(db, 'invitations');
            const q = query(invitationsRef, 
                where('groupId', '==', groupId), 
                where('userId', '==', invitedUser.id),
                where('status', '==', 'pending')
            );
            const existingInvitation = await getDocs(q);

            if (!existingInvitation.empty) {
                toast({ title: "Undangan Sudah Ada", description: `${invitedUser.displayName} sudah diundang ke grup ini.`, variant: "default" });
                return;
            }

            await addDoc(invitationsRef, {
                groupId: groupId,
                groupName: groupInfo.name,
                userId: invitedUser.id,
                invitedBy: user.displayName,
                createdAt: serverTimestamp(),
                status: 'pending' // pending, accepted, rejected
            });

            toast({ title: "Undangan Terkirim", description: `Undangan telah dikirim ke ${invitedUser.displayName}.` });
            
        } catch (error) {
            console.error("Error sending invitation:", error);
            toast({ title: "Gagal Mengundang", description: "Terjadi kesalahan saat mengirim undangan.", variant: "destructive" });
        } finally {
            setInvitingUsers(prev => {
                const newSet = new Set(prev);
                newSet.delete(invitedUser.id);
                return newSet;
            });
        }
    };
    
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

    const handleDeleteMessage = async (messageId: string) => {
        if (!groupId) return;
        try {
            await deleteDoc(doc(db, 'groups', groupId, 'messages', messageId));
            toast({
                title: "Pesan Dihapus",
                description: "Pesan suara telah berhasil dihapus.",
            });
        } catch (error) {
            console.error("Error deleting message:", error);
            toast({
                title: "Gagal Menghapus",
                description: "Terjadi kesalahan saat menghapus pesan.",
                variant: "destructive",
            });
        }
    };


    const sendVoiceNote = async (audioBlob: Blob, duration: number) => {
        if (!user || !groupId || duration < 0.5) return;
    
        try {
            const base64data = await blobToBase64(audioBlob);

            if (!base64data) {
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
                lastMessage: `Pesan suara (${formatTime(Math.round(duration))})`,
                lastMessageTime: serverTimestamp()
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

        recorder.onstop = async () => {
            stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
            if(recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
            URL.revokeObjectURL(workerObjectUrl);
            
            const finalDuration = (Date.now() - startTimeRef.current) / 1000;
            setRecordingDuration(0);

            if (audioChunksRef.current.length > 0 && finalDuration > 0.5) {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                sendVoiceNote(audioBlob, finalDuration);
            }
            audioChunksRef.current = [];
        };

        recorder.start(100); // Trigger ondataavailable every 100ms

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
                 {isSuperUser && (
                    <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="ml-auto">
                                <UserPlus />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-[90vw] sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Undang Pengguna</DialogTitle>
                                <DialogDescription>
                                    Pilih pengguna untuk diundang ke grup "{groupInfo?.name}".
                                </DialogDescription>
                            </DialogHeader>
                            <ScrollArea className="h-72">
                                <div className="space-y-2 pr-4">
                                {nonMemberUsers.length > 0 ? nonMemberUsers.map(u => (
                                    <div key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted">
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={u.avatarUrl} />
                                            <AvatarFallback>{u.displayName.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <p className="font-semibold">{u.displayName}</p>
                                            <p className="text-xs text-muted-foreground">{u.email}</p>
                                        </div>
                                        <Button 
                                            size="sm" 
                                            onClick={() => handleInviteUser(u)}
                                            disabled={invitingUsers.has(u.id)}
                                        >
                                            {invitingUsers.has(u.id) ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <UserPlus className="h-4 w-4 mr-2" />
                                            )}
                                            Undang
                                        </Button>
                                    </div>
                                )) : <p className="text-center text-muted-foreground py-8">Semua pengguna sudah di dalam grup.</p>}
                                </div>
                            </ScrollArea>
                        </DialogContent>
                    </Dialog>
                 )}
            </header>

            <main className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map(msg => {
                    const isSender = msg.senderId === user?.uid;
                    const messageDate = msg.createdAt?.toDate();
                    const isDeletable = messageDate && (new Date().getTime() - messageDate.getTime()) < 5 * 60 * 1000;

                    return (
                        <div key={msg.id} className={`flex items-end gap-2 ${isSender ? 'justify-end' : 'justify-start'}`}>
                           
                           {!isSender && (
                               <Avatar className="h-8 w-8">
                                   <AvatarImage src={msg.senderAvatar} />
                                   <AvatarFallback>{msg.senderName?.charAt(0) || 'P'}</AvatarFallback>
                               </Avatar>
                           )}
                           
                            <div className={`flex items-center gap-2 ${isSender ? 'flex-row-reverse' : ''}`}>
                                {isSender && isDeletable && (
                                    <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive self-center">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Apakah Anda yakin ingin menghapus pesan suara ini? Tindakan ini tidak dapat diurungkan.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Batal</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeleteMessage(msg.id)}>Hapus</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                    </AlertDialog>
                                )}

                                <div className={`flex flex-col max-w-[75%] ${isSender ? 'items-end' : 'items-start'}`}>
                                    {!isSender && <p className="text-xs text-muted-foreground ml-3 mb-1">{msg.senderName}</p>}
                                    <Card className={`p-2 rounded-xl border-none ${isSender ? 'bg-primary/20' : 'bg-muted'}`}>
                                        <AudioPlayer src={msg.audioUrl} />
                                    </Card>
                                    <div className="flex items-center gap-2 mt-1 px-2">
                                        <p className="text-xs text-muted-foreground">
                                            {msg.createdAt ? formatDistanceToNow(msg.createdAt.toDate(), { addSuffix: false, locale: customLocale }) : ''}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatTime(msg.duration || 0)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </main>

            <footer className="p-4 border-t border-border bg-background sticky bottom-0">
                 <div className={`${neumorphicInsetStyle} flex items-center justify-between p-2 rounded-full h-20 gap-4`}>
                    
                    {isRecording && (
                        <div className="flex items-center gap-2 flex-1 justify-center">
                            <div className="h-2 w-2 rounded-full bg-destructive animate-pulse"></div>
                            <span className="font-mono text-lg text-foreground">{formatTime(recordingDuration)}</span>
                        </div>
                    )}
                    
                    {!isRecording && <div className="flex-1"></div>}

                    <Button 
                        size="icon" 
                        variant={isRecording ? "destructive" : "default"}
                        className="w-16 h-16 rounded-full bg-primary text-primary-foreground shadow-neumorphic-outset active:shadow-neumorphic-inset flex-shrink-0"
                        onClick={toggleRecording}
                    >
                        {isRecording ? <Square className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
                    </Button>
                 </div>
            </footer>
        </div>
    );
}

    