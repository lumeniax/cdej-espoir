import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListParticipants, useListEnseignants, useListEtablissements,
  useAffecterEnseignant, useDesaffecterEnseignant, useAffecterEtablissement, useDesaffecterEtablissement,
  getListParticipantsQueryKey
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { UserCheck, Building2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Participant = {
  id: number;
  nom_prenoms: string;
  id_participant: string;
  enseignant?: { id: number; nom: string } | null;
  etablissement?: { id: number; nom: string } | null;
};

type Enseignant = { id: number; nom: string; classe?: string | null };
type Etablissement = { id: number; nom: string };

export default function Affectations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchP, setSearchP] = useState("");
  const [selParticipantEns, setSelParticipantEns] = useState("");
  const [selEnseignant, setSelEnseignant] = useState("");
  const [selParticipantEtab, setSelParticipantEtab] = useState("");
  const [selEtablissement, setSelEtablissement] = useState("");
  const [anneeScolaire, setAnneeScolaire] = useState("");
  const [classeEtab, setClasseEtab] = useState("");

  const { data: participantsData } = useListParticipants({ q: searchP, page: 1, page_size: 100 });
  const { data: enseignants = [] } = useListEnseignants({});
  const { data: etablissements = [] } = useListEtablissements({});

  const affecterEns = useAffecterEnseignant();
  const desaffecterEns = useDesaffecterEnseignant();
  const affecterEtab = useAffecterEtablissement();
  const desaffecterEtab = useDesaffecterEtablissement();

  const participants: Participant[] = (participantsData?.items || []) as Participant[];
  const ensList = Array.isArray(enseignants) ? enseignants as Enseignant[] : [];
  const etabList = Array.isArray(etablissements) ? etablissements as Etablissement[] : [];

  function handleAffecterEns() {
    if (!selParticipantEns || !selEnseignant) return;
    affecterEns.mutate({ data: { eleve_id: Number(selParticipantEns), enseignant_id: Number(selEnseignant) } as Parameters<typeof affecterEns.mutate>[0]["data"] }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListParticipantsQueryKey() }); toast({ title: "Affectation enregistrée" }); setSelParticipantEns(""); setSelEnseignant(""); },
      onError: (e: unknown) => toast({ title: (e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Erreur d'affectation", variant: "destructive" })
    });
  }

  function handleDesaffecterEns(eleveId: number) {
    desaffecterEns.mutate({ eleveId } as Parameters<typeof desaffecterEns.mutate>[0], {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListParticipantsQueryKey() }); toast({ title: "Affectation supprimée" }); }
    });
  }

  function handleAffecterEtab() {
    if (!selParticipantEtab || !selEtablissement) return;
    affecterEtab.mutate({ data: { eleve_id: Number(selParticipantEtab), etablissement_id: Number(selEtablissement), annee_scolaire: anneeScolaire || undefined, classe: classeEtab || undefined } as Parameters<typeof affecterEtab.mutate>[0]["data"] }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListParticipantsQueryKey() }); toast({ title: "Inscription enregistrée" }); setSelParticipantEtab(""); setSelEtablissement(""); setAnneeScolaire(""); setClasseEtab(""); },
      onError: () => toast({ title: "Erreur d'inscription", variant: "destructive" })
    });
  }

  function handleDesaffecterEtab(eleveId: number) {
    desaffecterEtab.mutate({ eleveId } as Parameters<typeof desaffecterEtab.mutate>[0], {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListParticipantsQueryKey() }); toast({ title: "Inscription supprimée" }); }
    });
  }

  const withEns = participants.filter(p => p.enseignant);
  const withEtab = participants.filter(p => p.etablissement);

  return (
    <div className="p-6 space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Affectations</h1>
        <p className="text-muted-foreground text-sm">Gérer les affectations aux enseignants et établissements</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><UserCheck className="h-5 w-5" />Affecter à un enseignant</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Rechercher un participant</Label>
              <Input placeholder="Nom ou identifiant..." value={searchP} onChange={e => setSearchP(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Participant</Label>
              <Select value={selParticipantEns} onValueChange={setSelParticipantEns}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un participant" /></SelectTrigger>
                <SelectContent>{participants.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.nom_prenoms} ({p.id_participant})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Enseignant</Label>
              <Select value={selEnseignant} onValueChange={setSelEnseignant}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un enseignant" /></SelectTrigger>
                <SelectContent>{ensList.map(e => <SelectItem key={e.id} value={String(e.id)}>{e.nom}{e.classe ? ` — ${e.classe}` : ""}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button className="w-full" disabled={!selParticipantEns || !selEnseignant || affecterEns.isPending} onClick={handleAffecterEns}>Affecter</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />Inscrire dans un établissement</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Participant</Label>
              <Select value={selParticipantEtab} onValueChange={setSelParticipantEtab}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un participant" /></SelectTrigger>
                <SelectContent>{participants.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.nom_prenoms} ({p.id_participant})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Établissement</Label>
              <Select value={selEtablissement} onValueChange={setSelEtablissement}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un établissement" /></SelectTrigger>
                <SelectContent>{etabList.map(e => <SelectItem key={e.id} value={String(e.id)}>{e.nom}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1"><Label>Année scolaire</Label><Input value={anneeScolaire} onChange={e => setAnneeScolaire(e.target.value)} placeholder="2024-2025" /></div>
              <div className="space-y-1"><Label>Classe</Label><Input value={classeEtab} onChange={e => setClasseEtab(e.target.value)} placeholder="CM2, 5ème..." /></div>
            </div>
            <Button className="w-full" disabled={!selParticipantEtab || !selEtablissement || affecterEtab.isPending} onClick={handleAffecterEtab}>Inscrire</Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Affectations enseignants ({withEns.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-y-auto">
            {withEns.length === 0 ? <p className="text-muted-foreground text-sm">Aucune affectation</p> : withEns.map(p => (
              <div key={p.id} className="flex items-center justify-between p-2 rounded border text-sm">
                <div><p className="font-medium">{p.nom_prenoms}</p><p className="text-muted-foreground">{p.enseignant!.nom}</p></div>
                <Button variant="ghost" size="sm" onClick={() => handleDesaffecterEns(p.id)}><X className="h-3 w-3" /></Button>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Inscriptions scolaires ({withEtab.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-y-auto">
            {withEtab.length === 0 ? <p className="text-muted-foreground text-sm">Aucune inscription</p> : withEtab.map(p => (
              <div key={p.id} className="flex items-center justify-between p-2 rounded border text-sm">
                <div><p className="font-medium">{p.nom_prenoms}</p><p className="text-muted-foreground">{p.etablissement!.nom}</p></div>
                <Button variant="ghost" size="sm" onClick={() => handleDesaffecterEtab(p.id)}><X className="h-3 w-3" /></Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
