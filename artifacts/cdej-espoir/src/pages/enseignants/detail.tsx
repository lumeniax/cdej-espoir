import { useParams, Link } from "wouter";
import { useGetEnseignant, useUpdateEnseignant, getListEnseignantsQueryKey, getGetEnseignantQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Edit, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function EnseignantDetail() {
  const { id } = useParams<{ id: string }>();
  const numId = Number(id);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: enseignant, isLoading } = useGetEnseignant(numId, { query: { enabled: !!numId, queryKey: getGetEnseignantQueryKey(numId) } });
  const updateMutation = useUpdateEnseignant();
  const [open, setOpen] = useState(false);
  const [nom, setNom] = useState("");
  const [classe, setClasse] = useState("");

  useEffect(() => {
    if (enseignant) { setNom(enseignant.nom || ""); setClasse(enseignant.classe || ""); }
  }, [enseignant]);

  function handleUpdate() {
    updateMutation.mutate({ id: numId, data: { nom, classe: classe || undefined } as Parameters<typeof updateMutation.mutate>[0]["data"] }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListEnseignantsQueryKey() }); toast({ title: "Enseignant mis à jour" }); setOpen(false); },
      onError: () => toast({ title: "Erreur", variant: "destructive" })
    });
  }

  if (isLoading) return <div className="p-6"><Skeleton className="h-64 w-full" /></div>;
  if (!enseignant) return <div className="p-6"><p className="text-muted-foreground">Enseignant non trouvé.</p></div>;

  const e = enseignant as typeof enseignant & { eleves?: Array<{ id: number; nom_prenoms: string; id_participant: string; sexe: string; programme?: string | null; tranche_age?: string | null }>; sessions_recentes?: Array<{ id: number; date_session: string; nb_presents: number; nb_absents: number }> };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/enseignants"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-2" />Retour</Button></Link>
          <div>
            <h1 className="text-2xl font-bold">{enseignant.nom}</h1>
            <p className="text-muted-foreground text-sm">{enseignant.classe || "Classe non précisée"} — <Users className="inline h-3 w-3" /> {enseignant.nb_eleves} élève{enseignant.nb_eleves !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}><Edit className="h-4 w-4 mr-2" />Modifier</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Élèves affectés ({enseignant.nb_eleves || 0})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Identifiant</TableHead><TableHead>Nom</TableHead><TableHead>Sexe</TableHead><TableHead>Programme</TableHead><TableHead>Tranche</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {!e.eleves || e.eleves.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucun élève affecté</TableCell></TableRow>
              ) : e.eleves.map((el) => (
                <TableRow key={el.id}>
                  <TableCell className="font-mono text-sm">{el.id_participant}</TableCell>
                  <TableCell className="font-medium">{el.nom_prenoms}</TableCell>
                  <TableCell>{el.sexe === "M" ? "Masculin" : "Féminin"}</TableCell>
                  <TableCell>{el.programme ? <Badge className={el.programme === "CDSP" ? "bg-blue-100 text-blue-800" : "bg-orange-100 text-orange-800"}>{el.programme}</Badge> : "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{el.tranche_age || "—"}</TableCell>
                  <TableCell><Link href={`/participants/${el.id}`}><Button variant="ghost" size="sm">Voir</Button></Link></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {e.sessions_recentes && e.sessions_recentes.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Sessions récentes</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead className="text-center">Présents</TableHead><TableHead className="text-center">Absents</TableHead></TableRow></TableHeader>
              <TableBody>
                {e.sessions_recentes.map(s => (
                  <TableRow key={s.id}>
                    <TableCell>{new Date(s.date_session).toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell className="text-center"><Badge className="bg-green-100 text-green-800">{s.nb_presents}</Badge></TableCell>
                    <TableCell className="text-center"><Badge className="bg-red-100 text-red-800">{s.nb_absents}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Modifier l'enseignant</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1"><Label>Nom</Label><Input value={nom} onChange={e => setNom(e.target.value)} /></div>
            <div className="space-y-1"><Label>Classe</Label><Input value={classe} onChange={e => setClasse(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
