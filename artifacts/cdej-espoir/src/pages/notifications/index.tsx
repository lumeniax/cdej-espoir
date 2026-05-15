import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiClient } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Bell, Check, CheckCheck, Cake, AlertTriangle, Heart, Calendar, UserX, Syringe, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Notif { id: number; type: string; titre: string; message: string; lue: boolean; participant_id?: number; created_at: string; }

const TYPE_META: Record<string, { icon: React.ComponentType<{className?: string}>; color: string }> = {
  anniversaire: { icon: Cake, color: "text-pink-600" },
  absence_critique: { icon: AlertTriangle, color: "text-red-600" },
  alerte_sante: { icon: Heart, color: "text-orange-600" },
  depart_proche: { icon: Calendar, color: "text-blue-600" },
  sans_enseignant: { icon: UserX, color: "text-yellow-600" },
  vaccin_retard: { icon: Syringe, color: "text-purple-600" },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${Math.floor(h / 24)}j`;
}

export default function Notifications() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ items: Notif[]; unread: number }>({
    queryKey: ["/api/notifications"],
    queryFn: () => apiFetch("/api/notifications"),
    refetchInterval: 30000,
  });

  const notifications = data?.items ?? [];
  const unread = data?.unread ?? 0;

  const markReadMut = useMutation({
    mutationFn: (id: number) => apiClient(`/api/notifications/${id}/lire`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const markAllMut = useMutation({
    mutationFn: () => apiClient("/api/notifications/tout-lire", { method: "POST" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/notifications"] }); toast({ title: "Toutes marquées comme lues" }); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiClient(`/api/notifications/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const generateMut = useMutation({
    mutationFn: () => apiClient("/api/notifications/generer", { method: "POST" }),
    onSuccess: (res) => res.json().then((d: any) => {
      qc.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({ title: `${d.generated} nouvelle${d.generated > 1 ? "s" : ""} notification${d.generated > 1 ? "s" : ""} générée${d.generated > 1 ? "s" : ""}` });
    }),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            Notifications
            {unread > 0 && <Badge className="bg-red-500 text-white text-base px-3">{unread}</Badge>}
          </h1>
          <p className="text-muted-foreground mt-1">{notifications.length} notification{notifications.length > 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => generateMut.mutate()} disabled={generateMut.isPending}>
            <RefreshCw className={cn("w-4 h-4 mr-2", generateMut.isPending && "animate-spin")} />
            Générer alertes
          </Button>
          {unread > 0 && (
            <Button variant="outline" onClick={() => markAllMut.mutate()} disabled={markAllMut.isPending}>
              <CheckCheck className="w-4 h-4 mr-2" />Tout lire
            </Button>
          )}
        </div>
      </div>

      {isLoading && <p className="text-center py-12 text-muted-foreground">Chargement...</p>}

      {!isLoading && notifications.length === 0 && (
        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-4">
            <Bell className="w-12 h-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">Aucune notification</p>
            <Button variant="outline" onClick={() => generateMut.mutate()}>
              <RefreshCw className="w-4 h-4 mr-2" />Générer les alertes automatiques
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {notifications.map(n => {
          const meta = TYPE_META[n.type] ?? { icon: Bell, color: "text-muted-foreground" };
          const Icon = meta.icon;
          return (
            <Card key={n.id} className={cn("transition-colors", !n.lue && "border-primary/30 bg-primary/5")}>
              <CardContent className="py-3">
                <div className="flex items-start gap-3">
                  <div className={cn("mt-0.5 flex-shrink-0", meta.color)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn("text-sm font-medium", !n.lue && "font-semibold")}>{n.titre}</p>
                      {!n.lue && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {!n.lue && (
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => markReadMut.mutate(n.id)} title="Marquer comme lu">
                        <Check className="w-4 h-4" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteMut.mutate(n.id)} title="Supprimer">
                      ×
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
