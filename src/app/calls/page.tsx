import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, Phone, Video } from "lucide-react";

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

export default function CallsPage() {
  return (
    <div className="flex flex-col gap-8 animate-in fade-in-50">
      <header>
        <h1 className="text-4xl font-headline font-bold text-foreground" style={{ textShadow: '1px 1px 2px #0d0d0d' }}>
          Panggilan Audio
        </h1>
        <p className="text-muted-foreground mt-1">Terhubung dengan teman Anda.</p>
      </header>

      <main className="space-y-12">
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
