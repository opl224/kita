import { Card } from "@/components/ui/card";
import { Bell } from "lucide-react";

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
      </header>

      <main className="space-y-4">
        <Card className="flex flex-col items-center justify-center p-12 text-center bg-background rounded-2xl shadow-[inset_4px_4px_8px_#0d0d0d,inset_-4px_-4px_8px_#262626]">
            <Bell className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-foreground">Tidak Ada Pemberitahuan</h3>
            <p className="text-muted-foreground">Pemberitahuan baru akan muncul di sini.</p>
        </Card>
      </main>
    </div>
  );
}
