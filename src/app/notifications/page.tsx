import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bell, Phone, UserPlus, MessageCircle } from "lucide-react";
import Link from 'next/link';

const allNotifications = [
    {
      id: 1,
      icon: <Phone className="h-5 w-5 text-primary" />,
      title: "Panggilan tak terjawab",
      description: "Anda melewatkan panggilan dari Bunga Citra.",
      time: "15 menit yang lalu",
      link: "/calls",
      userAvatar: "https://placehold.co/40x40.png?text=BC"
    },
    {
      id: 2,
      icon: <MessageCircle className="h-5 w-5 text-green-400" />,
      title: "Pesan Baru",
      description: "Jane Smith: 'Jangan lupa meeting jam 3 sore ya!'",
      time: "1 jam yang lalu",
      link: "#",
      userAvatar: "https://placehold.co/40x40.png?text=JS"
    },
    {
      id: 3,
      icon: <UserPlus className="h-5 w-5 text-blue-400" />,
      title: "Pengikut Baru",
      description: "Andi Sukma sekarang mengikuti Anda.",
      time: "3 jam yang lalu",
      link: "/profile/andi-sukma",
      userAvatar: "https://placehold.co/40x40.png?text=AS"
    },
    {
      id: 4,
      icon: <Bell className="h-5 w-5 text-yellow-400" />,
      title: "Pembaruan Sistem",
      description: "VoiceLink telah diperbarui ke versi 2.0. Nikmati fitur baru!",
      time: "1 hari yang lalu",
      link: "#",
      userAvatar: "https://placehold.co/40x40.png?text=VL"
    },
    {
      id: 5,
      icon: <Phone className="h-5 w-5 text-primary" />,
      title: "Panggilan Selesai",
      description: "Panggilan Anda dengan Eko Prasetyo berlangsung selama 12:34.",
      time: "2 hari yang lalu",
      link: "/calls",
      userAvatar: "https://placehold.co/40x40.png?text=EP"
    }
];

const neumorphicCardStyle = "bg-background rounded-2xl shadow-[inset_4px_4px_8px_#0d0d0d,inset_-4px_-4px_8px_#262626] transition-all duration-300 p-4";
const neumorphicIconContainer = "bg-background rounded-full p-3 shadow-[4px_4px_8px_#0d0d0d,-4px_-4px_8px_#262626]";

export default function NotificationsPage() {
  return (
    <div className="flex flex-col gap-8 animate-in fade-in-50">
      <header className="flex justify-between items-center">
        <div>
            <h1 className="text-4xl font-headline font-bold text-foreground" style={{ textShadow: '1px 1px 2px #0d0d0d' }}>
              Pemberitahuan
            </h1>
            <p className="text-muted-foreground mt-1">Semua pembaruan Anda ada di sini.</p>
        </div>
        <Button className="shadow-[3px_3px_6px_#0d0d0d,-3px_-3px_6px_#262626] active:shadow-[inset_3px_3px_6px_#0d0d0d,inset_-3px_-3px_6px_#262626]">
            Tandai semua sudah dibaca
        </Button>
      </header>

      <main className="space-y-4">
        {allNotifications.map((notif) => (
            <Card key={notif.id} className="bg-transparent border-none p-0">
                <Link href={notif.link} className="block">
                    <div className={`${neumorphicCardStyle} hover:shadow-[6px_6px_12px_#0d0d0d,-6px_-6px_12px_#262626] group`}>
                        <div className="flex items-center gap-4">
                            <div className={`${neumorphicIconContainer} group-hover:scale-110 transition-transform`}>
                                {notif.icon}
                            </div>
                            <div className="flex-grow">
                                <h3 className="font-semibold font-body text-foreground">{notif.title}</h3>
                                <p className="text-sm text-muted-foreground">{notif.description}</p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={notif.userAvatar} />
                                    <AvatarFallback>U</AvatarFallback>
                                </Avatar>
                                <p className="text-xs text-muted-foreground">{notif.time}</p>
                            </div>
                        </div>
                    </div>
                </Link>
            </Card>
        ))}
      </main>
    </div>
  );
}
