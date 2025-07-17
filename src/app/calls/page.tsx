
'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, MessageCircle, ArrowRight } from "lucide-react";

const voiceGroups = [
  { 
    id: '1', 
    name: 'Grup Keluarga Ceria', 
    members: [
      { name: 'Andi', avatar: 'https://placehold.co/40x40.png?text=A', data_ai_hint: 'man portrait' },
      { name: 'Bunga', avatar: 'https://placehold.co/40x40.png?text=B', data_ai_hint: 'woman portrait' },
      { name: 'Cahya', avatar: 'https://placehold.co/40x40.png?text=C', data_ai_hint: 'person smiling' },
    ],
    lastMessage: "Oke, sampai jumpa besok!",
    lastMessageTime: "5m"
  },
  { 
    id: '2', 
    name: 'Tim Proyek Alpha', 
    members: [
      { name: 'Dewi', avatar: 'https://placehold.co/40x40.png?text=D', data_ai_hint: 'woman glasses' },
      { name: 'Eko', avatar: 'https://placehold.co/40x40.png?text=E', data_ai_hint: 'man thinking' },
    ],
    lastMessage: "Jangan lupa revisi desainnya ya.",
    lastMessageTime: "1h"
  },
  { 
    id: '3', 
    name: 'Teman Nongkrong', 
    members: [
      { name: 'Fitri', avatar: 'https://placehold.co/40x40.png?text=F', data_ai_hint: 'woman nature' },
      { name: 'Gilang', avatar: 'https://placehold.co/40x40.png?text=G', data_ai_hint: 'man smiling' },
      { name: 'Hana', avatar: 'https://placehold.co/40x40.png?text=H', data_ai_hint: 'person glasses' },
      { name: 'Irfan', avatar: 'https://placehold.co/40x40.png?text=I', data_ai_hint: 'man portrait' },
    ],
    lastMessage: "Malam ini jadi kan?",
    lastMessageTime: "3h"
  },
];

const neumorphicCardStyle = "bg-background rounded-2xl shadow-[6px_6px_12px_#0d0d0d,-6px_-6px_12px_#262626] transition-all duration-300 p-6";
const neumorphicButtonStyle = "rounded-full aspect-square w-14 h-14 bg-background shadow-[4px_4px_8px_#0d0d0d,-4px_-4px_8px_#262626] text-muted-foreground hover:text-primary active:shadow-[inset_4px_4px_8px_#0d0d0d,inset_-4px_-4px_8px_#262626] transition-all";

export default function VoiceNoteGroupsPage() {
  return (
    <div className="flex flex-col gap-8 animate-in fade-in-50">
      <header>
        <h1 className="text-4xl font-headline font-bold text-foreground" style={{ textShadow: '1px 1px 2px #0d0d0d' }}>
          Pesan Suara Grup
        </h1>
        <p className="text-muted-foreground mt-1">Dengarkan dan kirim pesan suara ke grup Anda.</p>
      </header>

      <main className="space-y-6">
        {voiceGroups.map(group => (
          <Card key={group.id} className={neumorphicCardStyle}>
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-start">
                  <div>
                      <h2 className="text-xl font-headline font-semibold text-foreground">{group.name}</h2>
                      <div className="flex items-center -space-x-2 mt-2">
                        {group.members.map(member => (
                          <Avatar key={member.name} className="h-8 w-8 border-2 border-background">
                            <AvatarImage src={member.avatar} alt={member.name} data-ai-hint={member.data_ai_hint} />
                            <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                  </div>
                   <Button variant="ghost" size="icon" className="text-primary hover:text-primary/80">
                      <ArrowRight className="h-6 w-6" />
                      <span className="sr-only">Masuk Grup</span>
                   </Button>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground pt-4 border-t border-border/20">
                    <MessageCircle className="h-4 w-4"/>
                    <p className="flex-grow truncate">{group.lastMessage}</p>
                    <span className="text-xs shrink-0">{group.lastMessageTime}</span>
              </div>
            </div>
          </Card>
        ))}
         <div className="text-center pt-4">
            <Button variant="default" className="h-14 rounded-xl shadow-[4px_4px_8px_#0d0d0d,-4px_-4px_8px_#262626] active:shadow-[inset_4px_4px_8px_#0d0d0d,inset_-4px_-4px_8px_#262626] transition-all text-base font-bold bg-primary text-primary-foreground">
                Buat Grup Baru
            </Button>
         </div>
      </main>
    </div>
  );
}
