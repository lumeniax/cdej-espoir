import { useParams, useLocation, Link } from "wouter";
import { useGetParticipant, useDeleteParticipant, getListParticipantsQueryKey, getGetParticipantQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Edit, Trash2, User, Heart, School, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

function fmt(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR");
}

function ProgrammeBadge({ programme }: { programme: string | null | undefined }) {
  if (!programme) return <Badge variant="outline">—</Badge>;
  return <Badge className={programme === "CDSP" ? "bg-blue-600 text-white" : "bg-orange-500 text-white"}>{programme}</Badge>;
}

function AnneesBadge({ annees }: { annees: number | null | undefined }) {
  if (annees === null || annees === undefined) return null;
  let cls = "bg-green-100 text-green-800 border-green-200";
  if (annees <= 1) cls = "bg-red-100 text-red-800 border-red-200";
  else if (annees <= 3) cls = "bg-orange-100 text-orange-800 border-orange-200";
  else if (annees <= 5) cls = "bg-yellow-100 text-yellow-800 border-yellow-200";
  return <Badge variant="outline" className={cls}>{annees <= 0 ? "Départ imminent" : `${annees} an${annees > 1 ? "s" : ""} restant${annees > 1 ? "s" : ""}`}</Badge>;
}

function ElectrophoreseBadge({ val }: { val: string | null | undefined }) {
  if (!val) return <span className="text-muted-foreground">—</span>;
  const colors: Record<string, string> = { AA: "bg-green-100 text-green-800", AC: "bg-blue-100 text-blue-800", AS: "bg-yellow-100 text-yellow-800", SC: "bg-orange-100 text-orange-800", SS: "bg-red-100 text-red-800" };
  return <Badge className={colors[val] || ""}>{val}</Badge>;
}

export default function ParticipantDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const numId = Number(id);
  const { data: participant, isLoading, isError } = useGetParticipant(numId, { query: { enabled: !!numId, queryKey: getGetParticipantQueryKey(numId) } });
  const deleteMutation = useDeleteParticipant();

  function handleDelete() {
    deleteMutation.mutate({ id: numId } as Parameters<typeof deleteMutation.mutate>[0], {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListParticipantsQueryKey() });
        toast({ title: "Participant supprimé" });
        navigate("/participants");
      },
      onError: () => toast({ title: "Erreur lors de la suppression", variant: "destructive" })
    });
  }

  if (isLoading) return <div className="p-6 space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /></div>;
  if (isError || !participant) return <div className="p-6"><p className="text-destructive">Participant non trouvé.</p><Link href="/participants"><Button variant="outline" className="mt-4">Retour à la liste</Button></Link></div>;

  const p = participant as typeof participant & {
    imc_recents?: Array<{ id: number; date_mesure: string; poids_kg: number; taille_cm: number; imc: number; classification: string }>;
    presences_recentes?: Array<{ date_session: string; statut: string; enseignant_nom: string }>;
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/participants"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-2" />Retour</Button></Link>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">{p.nom_prenoms}</h1>
              <Badge variant="outline" className="font-mono text-sm">{p.id_participant}</Badge>
              <ProgrammeBadge programme={p.programme} />
              {p.annees_restantes !== null && p.annees_restantes !== undefined && <AnneesBadge annees={p.annees_restantes} />}
            </div>
            <p className="text-muted-foreground text-sm mt-1">{p.age_clair} — {p.tranche_age}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/participants/${id}/edit`}><Button variant="outline" size="sm"><Edit className="h-4 w-4 mr-2" />Modifier</Button></Link>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm"><Trash2 className="h-4 w-4 mr-2" />Supprimer</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer ce participant ?</AlertDialogTitle>
                <AlertDialogDescription>Cette action est irréversible. Toutes les données associées seront supprimées.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Supprimer</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Tabs defaultValue="identite">
        <TabsList>
          <TabsTrigger value="identite"><User className="h-4 w-4 mr-1" />Identité</TabsTrigger>
          <TabsTrigger value="sante"><Heart className="h-4 w-4 mr-1" />Santé</TabsTrigger>
          <TabsTrigger value="scolarite"><School className="h-4 w-4 mr-1" />Scolarité</TabsTrigger>
          <TabsTrigger value="presences"><Calendar className="h-4 w-4 mr-1" />Présences</TabsTrigger>
        </TabsList>

        <TabsContent value="identite">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Card><CardHeader><CardTitle className="text-base">Informations personnelles</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Row label="Sexe" val={p.sexe === "M" ? "Masculin" : "Féminin"} />
                <Row label="Date de naissance" val={fmt(p.date_naissance)} />
                <Row label="Âge" val={p.age_clair || "—"} />
                <Row label="Village" val={p.village || "—"} />
                <Row label="Quartier" val={p.quartier || "—"} />
                <Row label="Contact" val={p.contact_participant || "—"} />
                <Row label="Classe" val={p.classe || "—"} />
              </CardContent>
            </Card>
            <Card><CardHeader><CardTitle className="text-base">Famille</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Row label="Vit chez" val={p.vit_chez || "—"} />
                <Row label="Contact tuteur" val={p.contact_tuteur || "—"} />
                <Row label="Religion tuteur" val={p.religion_tuteur || "—"} />
                <Row label="Situation familiale" val={p.situation_familiale || "—"} />
                <Row label="Père vivant" val={p.pere_vivant === null ? "—" : p.pere_vivant ? "Oui" : "Non"} />
                <Row label="Mère vivante" val={p.mere_vivante === null ? "—" : p.mere_vivante ? "Oui" : "Non"} />
              </CardContent>
            </Card>
            <Card><CardHeader><CardTitle className="text-base">Spiritualité</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Row label="Église" val={p.eglise_participant || "—"} />
                <Row label="Date de baptême" val={fmt(p.date_bapteme)} />
              </CardContent>
            </Card>
            <Card><CardHeader><CardTitle className="text-base">Suivi au centre</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Row label="N° d'ordre" val={String(p.numero_ordre)} />
                <Row label="Identifiant" val={p.id_participant} />
                <Row label="Programme" val={<ProgrammeBadge programme={p.programme} />} />
                <Row label="Tranche d'âge" val={p.tranche_age || "—"} />
                <Row label="Départ prévu" val={fmt(p.date_depart_prevue)} />
                <Row label="Départ effectif" val={fmt(p.date_depart_effective)} />
                <Row label="Transfert" val={p.transfert || "—"} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sante">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Card><CardHeader><CardTitle className="text-base">Données biologiques</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Électrophorèse</span><ElectrophoreseBadge val={p.electrophorese} /></div>
                <Row label="Groupe sanguin" val={p.groupe_sanguin || "—"} />
              </CardContent>
            </Card>
            <Card><CardHeader><CardTitle className="text-base">Mesures IMC récentes</CardTitle></CardHeader>
              <CardContent>
                {(!p.imc_recents || p.imc_recents.length === 0)
                  ? <p className="text-muted-foreground text-sm">Aucune mesure enregistrée</p>
                  : <div className="space-y-2">{p.imc_recents.map((m: { id: number; date_mesure: string; poids_kg: number; taille_cm: number; imc: number; classification: string }) => (
                    <div key={m.id} className="text-sm border rounded p-3">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium">{fmt(m.date_mesure)}</span>
                        <Badge variant="outline">{Number(m.imc).toFixed(1)}</Badge>
                      </div>
                      <p className="text-muted-foreground">{m.poids_kg} kg / {m.taille_cm} cm — {m.classification}</p>
                    </div>
                  ))}</div>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="scolarite">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Card><CardHeader><CardTitle className="text-base">Enseignant</CardTitle></CardHeader>
              <CardContent className="text-sm">
                {p.enseignant ? <div className="space-y-2"><Row label="Nom" val={p.enseignant.nom} /><Row label="Classe" val={p.enseignant.classe || "—"} /></div> : <p className="text-muted-foreground">Aucun enseignant affecté</p>}
              </CardContent>
            </Card>
            <Card><CardHeader><CardTitle className="text-base">Établissement scolaire</CardTitle></CardHeader>
              <CardContent className="text-sm">
                {p.etablissement ? <Row label="Nom" val={p.etablissement.nom} /> : <p className="text-muted-foreground">Aucun établissement enregistré</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="presences">
          <Card className="mt-4">
            <CardHeader><CardTitle className="text-base">Historique des présences</CardTitle></CardHeader>
            <CardContent>
              {(!p.presences_recentes || p.presences_recentes.length === 0)
                ? <p className="text-muted-foreground text-sm">Aucune présence enregistrée</p>
                : <div className="space-y-2">{p.presences_recentes.map((pr: { date_session: string; statut: string; enseignant_nom: string }, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm border rounded p-3">
                    <span>{fmt(pr.date_session)}</span>
                    <span className="text-muted-foreground">{pr.enseignant_nom}</span>
                    <Badge className={pr.statut === "P" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>{pr.statut === "P" ? "Présent" : "Absent"}</Badge>
                  </div>
                ))}</div>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Row({ label, val }: { label: string; val: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right">{val}</span>
    </div>
  );
}
