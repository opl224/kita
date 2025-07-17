import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bell, DollarSign, MessageSquare } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const neumorphicCardStyle = "bg-background rounded-2xl shadow-[6px_6px_12px_#0d0d0d,-6px_-6px_12px_#262626] transition-all duration-300";
  const neumorphicInsetStyle = "bg-background rounded-2xl shadow-[inset_4px_4px_8px_#0d0d0d,inset_-4px_-4px_8px_#262626]";
  
  const notifications = [
    {
      id: 1,
      user: "Alex Doe",
      action: "started a new call.",
      time: "5m ago",
      avatar: "https://placehold.co/40x40.png?text=AD",
    },
    {
      id: 2,
      user: "Jane Smith",
      action: "sent you a message.",
      time: "1h ago",
      avatar: "https://placehold.co/40x40.png?text=JS",
    },
    {
      id: 3,
      user: "System",
      action: "You have a new follower!",
      time: "3h ago",
      avatar: "https://placehold.co/40x40.png?text=S",
    },
  ];

  return (
    <div className="flex flex-col gap-8 animate-in fade-in-50">
      <header>
        <h1 className="text-4xl font-headline font-bold text-foreground" style={{ textShadow: '1px 1px 2px #0d0d0d' }}>
          Beranda
        </h1>
        <p className="text-muted-foreground mt-1">Selamat datang kembali!</p>
      </header>
      
      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2 flex flex-col gap-8">
          <Card className={`${neumorphicCardStyle} p-6 sm:p-8`}>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <Avatar className="h-24 w-24 border-4 border-background shadow-[4px_4px_8px_#0d0d0d,-4px_-4px_8px_#262626]">
                <AvatarImage src="https://placehold.co/100x100.png" alt="User Avatar" data-ai-hint="user avatar" />
                <AvatarFallback>UL</AvatarFallback>
              </Avatar>
              <div className="text-center sm:text-left">
                <h2 className="text-2xl font-headline font-semibold text-foreground">
                  Selamat Datang, User Ling!
                </h2>
                <p className="text-muted-foreground mt-1">Senang melihat Anda lagi hari ini.</p>
              </div>
            </div>
          </Card>

          <Card className={`${neumorphicCardStyle} p-6`}>
            <h3 className="text-xl font-headline font-semibold mb-4 text-foreground">Pemberitahuan Terbaru</h3>
            <div className="space-y-4">
              {notifications.map((n) => (
                <div key={n.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={n.avatar} />
                    <AvatarFallback>{n.user.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-grow">
                    <p className="text-sm text-foreground"><span className="font-semibold">{n.user}</span> {n.action}</p>
                    <p className="text-xs text-muted-foreground">{n.time}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="text-center mt-4">
                <Link href="/notifications" className="text-sm font-semibold text-primary hover:underline">
                  Lihat semua pemberitahuan
                </Link>
              </div>
            </div>
          </Card>
        </section>

        <aside className="lg:col-span-1 flex flex-col gap-8">
           <Card className={`${neumorphicInsetStyle} p-6`}>
            <div className="flex items-center gap-4 text-primary">
              <DollarSign className="h-8 w-8" />
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Uang Terkumpul</span>
                <span className="text-3xl font-bold text-foreground">Rp 1.234.567</span>
              </div>
            </div>
          </Card>

          <Card className={`${neumorphicCardStyle} p-6`}>
            <h3 className="text-xl font-headline font-semibold mb-4 text-foreground">Tindakan Cepat</h3>
            <div className="flex flex-col gap-4">
                <Button variant="default" size="lg" className="w-full justify-start text-left h-14 bg-primary text-primary-foreground shadow-[3px_3px_6px_#0d0d0d,-3px_-3px_6px_#262626] active:shadow-[inset_3px_3px_6px_#0d0d0d,inset_-3px_-3px_6px_#262626]">
                    <Bell className="mr-3" />
                    Mulai Panggilan Baru
                </Button>
                <Button variant="secondary" size="lg" className="w-full justify-start text-left h-14 shadow-[3px_3px_6px_#0d0d0d,-3px_-3px_6px_#262626] active:shadow-[inset_3px_3px_6px_#0d0d0d,inset_-3px_-3px_6px_#262626]">
                    Lihat Kontak Online
                </Button>
            </div>
          </Card>
        </aside>
      </main>
    </div>
  );
}
