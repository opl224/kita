
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
import { ArrowLeft, Mic, Send, Trash2, UserPlus, Square } from 'lucide-react';
import OpusMediaRecorder from 'opus-media-recorder';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';

type Message = {
    id: string;
    senderId: string;
    senderName: string;
    senderAvatar: string;
    audioUrl: string; // Base64 data URI
    createdAt: any;
    duration: number;
};

type GroupInfo = {
    name: string;
    members: string[];
    createdBy: string;
}

const neumorphicCardStyle = "bg-background rounded-2xl shadow-[6px_6px_12px_#0d0d0d,-6px_-6px_12px_#262626] p-4";
const neumorphicInsetStyle = "bg-background rounded-2xl shadow-[inset_4px_4px_8px_#0d0d0d,inset_-4px_-4px_8px_#262626]";

export default function GroupChatPage() {
    const [user, setUser] = useState<User | null>(null);
    const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);

    const mediaRecorderRef = useRef<OpusMediaRecorder | null>(null);
    const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingStartTimeRef = useRef<number | null>(null);


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

    const sendVoiceNote = async (audioBlob: Blob, duration: number) => {
        if (!audioBlob || !user || !groupId) return;
    
        try {
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = async () => {
                const base64data = reader.result as string;
                if (base64data.length > 1048576) {
                     toast({ title: "File Terlalu Besar", description: "Pesan suara terlalu besar untuk dikirim.", variant: "destructive"});
                     return;
                }
                
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                const userData = userDoc.data();
    
                const messagesColRef = collection(db, 'groups', groupId, 'messages');
                await addDoc(messagesColRef, {
                    senderId: user.uid,
                    senderName: userData?.displayName || 'Pengguna Anonim',
                    senderAvatar: userData?.avatarUrl || '',
                    audioUrl: base64data,
                    createdAt: serverTimestamp(),
                    duration: Math.round(duration)
                });
    
                const groupDocRef = doc(db, 'groups', groupId);
                await updateDoc(groupDocRef, {
                    lastMessage: "Pesan suara",
                    lastMessageTime: formatDistanceToNow(new Date(), { addSuffix: true, locale: id })
                });
    
                toast({ title: "Pesan Suara Terkirim" });
            };
        } catch (error) {
            console.error("Error sending voice note:", error);
            toast({ title: "Gagal Mengirim Pesan", variant: "destructive" });
        }
    };
    

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
        }
    };


    const startRecording = async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            toast({ title: 'Error', description: 'API Perekaman tidak didukung di browser ini.', variant: 'destructive' });
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const options = {
                mimeType: 'audio/ogg; codecs=opus',
            };
            const workerOptions = {
                OggOpusEncoderWasmPath: 'https://cdn.jsdelivr.net/npm/opus-media-recorder@latest/OggOpusEncoder.wasm',
                WebMOpusEncoderWasmPath: 'https://cdn.jsdelivr.net/npm/opus-media-recorder@latest/WebMOpusEncoder.wasm'
            };

            mediaRecorderRef.current = new OpusMediaRecorder(stream, options, workerOptions);
            audioChunksRef.current = [];
            
            mediaRecorderRef.current.onstart = () => {
                setIsRecording(true);
                recordingStartTimeRef.current = Date.now();
                
                if(recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    
                recordingIntervalRef.current = setInterval(() => {
                    if(recordingStartTimeRef.current){
                        const newDuration = (Date.now() - recordingStartTimeRef.current) / 1000;
                        setRecordingDuration(newDuration);
                        if (newDuration >= 30) {
                            stopRecording();
                        }
                    }
                }, 100);
            };

            mediaRecorderRef.current.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/ogg; codecs=opus' });
                const finalDuration = recordingDuration;
                
                // Reset state
                setIsRecording(false);
                if(recordingIntervalRef.current) {
                    clearInterval(recordingIntervalRef.current);
                    recordingIntervalRef.current = null;
                }
                setRecordingDuration(0);
                recordingStartTimeRef.current = null;
                stream.getTracks().forEach(track => track.stop());

                // Send the note
                if(blob.size > 0 && finalDuration > 0.5) { // Ensure not an empty recording
                    sendVoiceNote(blob, finalDuration);
                }
                audioChunksRef.current = [];
            };

            mediaRecorderRef.current.start();
        } catch (err) {
            console.error("Error starting recording:", err);
            toast({ title: 'Gagal Memulai Rekaman', description: 'Pastikan Anda telah memberikan izin mikrofon.', variant: 'destructive' });
        }
    };


    const handleMicPress = () => {
        startRecording();
    };

    const handleMicRelease = () => {
        stopRecording();
    };


    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
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
                                <audio controls src={msg.audioUrl} className="w-full h-10" />
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
                <div className={`${neumorphicInsetStyle} flex items-center justify-center p-2 rounded-full h-20`}>
                    {isRecording ? (
                         <>
                            <div className="flex-1 text-center font-mono text-lg text-primary animate-pulse">{formatTime(recordingDuration)} / 0:30</div>
                            <Button 
                                size="icon" 
                                variant="destructive" 
                                className="rounded-full w-14 h-14 bg-red-500 text-white shadow-[4px_4px_8px_#0d0d0d,-4px_-4px_8px_#262626]" 
                                onClick={handleMicRelease}
                            >
                                <Square />
                            </Button>
                        </>
                    ) : (
                        <>
                            <div className="flex-1 text-center text-muted-foreground">Tahan untuk merekam</div>
                            <Button 
                                size="icon" 
                                variant="default" 
                                className="rounded-full w-14 h-14 bg-primary text-primary-foreground shadow-[4px_4px_8px_#0d0d0d,-4px_-4px_8px_#262626] active:shadow-[inset_4px_4px_8px_#0d0d0d,inset_-4px_-4px_8px_#262626]" 
                                onMouseDown={handleMicPress} 
                                onMouseUp={handleMicRelease} 
                                onTouchStart={(e) => {e.preventDefault(); handleMicPress();}} 
                                onTouchEnd={(e) => {e.preventDefault(); handleMicRelease();}}
                            >
                                <Mic />
                            </Button>
                        </>
                    )}
                </div>
            </footer>
        </div>
    );

    