import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListEnseignants, useListSessions, useCreateSession, useSavePresencesBatch,
  useGetSession, useDeleteSession, getListSessionsQueryKey, getGetSessionQueryKey
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, XCircle, Plus, Save, ChevronRight, Users, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { savePresencesOffline, syncPendingPresences, getPendingCount } from "@/lib/syncQueue";

type PresenceEntry = { eleve_id: number; eleve_nom: string; statut: "P" | "A" };
type Enseignant = { id: number; nom: string; classe?: string | null };
type Session = { id: number; enseignant_id: number; enseignant_nom: string; date_session: string; nb_presents: number; nb_absents: number };
type SessionDetail = { presences?: PresenceEntry[]; enseignant_id: number; enseignant_nom: string; date_session: string };

export default function Presences() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isOnline = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [step, setStep] = useState<"select" | "saisie">("select");
  const [selEnseignant, setSelEnseignant] = useState("");
  const [dateSession, setDateSession] = useState(new Date().toISOString().split("T")[0]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [presences, setPresences] = useState<PresenceEntry[]>([]);

  useEffect(() => {
    getPendingCount().then(setPendingCount);
  }, []);

  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      handleSync();
    }
  }, [isOnline, pendingCount]);

  async function handleSync() {
    const { synced, errors } = await syncPendingPresences();
    if (synced > 0) {
      toast({ title: `${synced} présences synchronisées` });
      queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
    }
    if (errors > 0) {
      toast({ title: "Erreur de synchronisation", description: `${errors} erreurs.`, variant: "destructive" });
    }
    const newCount = await getPendingCount();
    setPendingCount(newCount);
  }

  const { data: enseignants = [] } = useListEnseignants({});
  const { data: sessions = [] } = useListSessions({ enseignant_id: selEnseignant ? Number(selEnseignant) : undefined } as Parameters<typeof useListSessions>[0]);
  const { data: sessionDetail } = useGetSession(sessionId!, { query: { enabled: !!sessionId, queryKey: getGetSessionQueryKey(sessionId!) } });

  const createSession = useCreateSession();
  const savePresences = useSavePresencesBatch();
  const deleteSession = useDeleteSession();

  const ensList = Array.isArray(enseignants) ? enseignants as Enseignant[] : [];
  const sessionsList = Array.isArray(sessions) ? sessions as Session[] : [];

  async function handleStartSession() {
    if (!selEnseignant || !dateSession) return;
    if (!isOnline) {
      toast({ title: "Connexion requise", description: "La création d'une nouvelle session nécessite une connexion internet.", variant: "destructive" });
      return;
    }
    createSession.mutate({ data: { enseignant_id: Number(selEnseignant), date_session: dateSession } as Parameters<typeof createSession.mutate>[0]["data"] }, {
      onSuccess: (session: unknown) => {
        const s = session as { id: number; presences?: PresenceEntry[] };
        setSessionId(s.id);
        queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
        toast({ title: "Session créée" });
        setStep("saisie");
        if (s.presences) {
          setPresences(s.presences.map((p: PresenceEntry) => ({ ...p, statut: p.statut || "P" as "P" | "A" })));
        }
      },
      onError: () => toast({ title: "Erreur de création de session", variant: "destructive" })
    });
  }

  function loadSession(s: Session) {
    setSelEnseignant(String(s.enseignant_id));
    setDateSession(s.date_session);
    setSessionId(s.id);
    setStep("saisie");
  }

  function toggleStatut(eleveId: number) {
    setPresences(prev => prev.map(p => p.eleve_id === eleveId ? { ...p, statut: p.statut === "P" ? "A" as "A" : "P" as "P" } : p));
  }

  function markAll(statut: "P" | "A") {
    setPresences(prev => prev.map(p => ({ ...p, statut })));
  }

  function handleSave() {
    if (!sessionId) return;
    if (!isOnline) {
      savePresencesOffline(sessionId, presences).then(() => {
        toast({ title: "Sauvegardé hors ligne" });
        setStep("select");
        setSessionId(null);
        setPresences([]);
        getPendingCount().then(setPendingCount);
      });
      return;
    }
    savePresences.mutate({ data: { session_id: sessionId, presences } as Parameters<typeof savePresences.mutate>[0]["data"] }, {
      onSuccess: () => { toast({ title: "Présences enregistrées" }); queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() }); setStep("select"); setSessionId(null); setPresences([]); },
      onError: () => toast({ title: "Erreur d'enregistrement", variant: "destructive" })
    });
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Présences</h1>
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">Saisie et consultation des présences</p>
          {pendingCount > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-amber-100 text-amber-800">{pendingCount} en attente de sync</Badge>
              {isOnline && (
                <Button size="sm" variant="outline" onClick={handleSync}>
                  <RefreshCw className="w-4 h-4 mr-2" /> Synchroniser maintenant
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {step === "select" && (
        <>
          <Card>
            <CardHeader><CardTitle>Nouvelle session</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Enseignant</Label>
                  <Select value={selEnseignant} onValueChange={setSelEnseignant}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner un enseignant" /></SelectTrigger>
                    <SelectContent>{ensList.map(e => <SelectItem key={e.id} value={String(e.id)}>{e.nom}{e.classe ? ` — ${e.classe}` : ""}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Date de session</Label>
                  <Input type="date" value={dateSession} onChange={e => setDateSession(e.target.value)} />
                </div>
              </div>
              <Button onClick={handleStartSession} disabled={!selEnseignant || !dateSession || createSession.isPending}>
                <Plus className="h-4 w-4 mr-2" />{createSession.isPending ? "Création..." : "Démarrer la session"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Sessions récentes</CardTitle>
                {selEnseignant && (
                  <Select value={selEnseignant} onValueChange={setSelEnseignant}>
                    <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>{ensList.map(e => <SelectItem key={e.id} value={String(e.id)}>{e.nom}</SelectItem>)}</SelectContent>
                  </Select>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Enseignant</TableHead><TableHead className="text-center">Présents</TableHead><TableHead className="text-center">Absents</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {sessionsList.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucune session</TableCell></TableRow>
                  ) : sessionsList.slice(0, 20).map(s => (
                    <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => loadSession(s)}>
                      <TableCell>{new Date(s.date_session).toLocaleDateString("fr-FR")}</TableCell>
                      <TableCell className="font-medium">{s.enseignant_nom}</TableCell>
                      <TableCell className="text-center"><Badge className="bg-green-100 text-green-800">{s.nb_presents}</Badge></TableCell>
                      <TableCell className="text-center"><Badge className="bg-red-100 text-red-800">{s.nb_absents}</Badge></TableCell>
                      <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {step === "saisie" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                Saisie — {ensList.find(e => String(e.id) === selEnseignant)?.nom || "Enseignant"} — {new Date(dateSession).toLocaleDateString("fr-FR")}
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => { setStep("select"); setSessionId(null); setPresences([]); }}>Annuler</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {presences.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p>Aucun élève affecté à cet enseignant.</p>
                <p className="text-sm">Affectez des élèves depuis la page Affectations.</p>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => markAll("P")}>Tous présents</Button>
                  <Button size="sm" variant="outline" onClick={() => markAll("A")}>Tous absents</Button>
                  <span className="ml-auto text-sm text-muted-foreground self-center">
                    {presences.filter(p => p.statut === "P").length} présents / {presences.filter(p => p.statut === "A").length} absents
                  </span>
                </div>
                <div className="space-y-2">
                  {presences.map(p => (
                    <div key={p.eleve_id} className={`flex items-center justify-between p-3 rounded border cursor-pointer transition-colors ${p.statut === "P" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`} onClick={() => toggleStatut(p.eleve_id)}>
                      <span className="font-medium">{p.eleve_nom}</span>
                      <div className="flex items-center gap-2">
                        {p.statut === "P" ? <CheckCircle className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-red-500" />}
                        <Badge className={p.statut === "P" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>{p.statut === "P" ? "Présent" : "Absent"}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
                <Button className="w-full" onClick={handleSave} disabled={savePresences.isPending}>
                  <Save className="h-4 w-4 mr-2" />{savePresences.isPending ? "Enregistrement..." : "Enregistrer les présences"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
