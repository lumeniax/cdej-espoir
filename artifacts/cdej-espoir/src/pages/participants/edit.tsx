import { useParams, useLocation, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useGetParticipant, useUpdateParticipant, getListParticipantsQueryKey, getGetParticipantQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useForm, Controller } from "react-hook-form";
import { ArrowLeft, Save } from "lucide-react";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const ELECTROPHORESES = ["AA", "AC", "AS", "SC", "SS"];
const GROUPES_SANGUINS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
const VILLAGES = ["AVEDZE", "AGBELOUVE", "AFAGNAN", "GATI", "KPEDZE", "TSEVIE", "LOME", "TABLIGBO", "NOTSE"];
const VIT_CHEZ = ["Père", "Mère", "Les deux parents", "Tuteur", "Grand-père", "Grand-mère", "Oncle/Tante", "Seul"];
const SITUATIONS = ["Marié(e)", "Divorcé(e)", "Veuf/Veuve", "Célibataire"];

export default function ParticipantsEdit() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const numId = Number(id);
  const { data: participant, isLoading } = useGetParticipant(numId, { query: { enabled: !!numId, queryKey: getGetParticipantQueryKey(numId) } });
  const updateMutation = useUpdateParticipant();

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm({
    defaultValues: { nom_prenoms: "", sexe: "", date_naissance: "", electrophorese: "", groupe_sanguin: "", village: "", quartier: "", contact_participant: "", eglise_participant: "", date_bapteme: "", classe: "", vit_chez: "", contact_tuteur: "", religion_tuteur: "", situation_familiale: "", pere_vivant: true, mere_vivante: true }
  });

  useEffect(() => {
    if (participant) {
      reset({
        nom_prenoms: participant.nom_prenoms || "",
        sexe: participant.sexe || "",
        date_naissance: participant.date_naissance || "",
        electrophorese: participant.electrophorese || "",
        groupe_sanguin: participant.groupe_sanguin || "",
        village: participant.village || "",
        quartier: participant.quartier || "",
        contact_participant: participant.contact_participant || "",
        eglise_participant: (participant as typeof participant & { eglise_participant?: string }).eglise_participant || "",
        date_bapteme: (participant as typeof participant & { date_bapteme?: string }).date_bapteme || "",
        classe: participant.classe || "",
        vit_chez: participant.vit_chez || "",
        contact_tuteur: participant.contact_tuteur || "",
        religion_tuteur: (participant as typeof participant & { religion_tuteur?: string }).religion_tuteur || "",
        situation_familiale: (participant as typeof participant & { situation_familiale?: string }).situation_familiale || "",
        pere_vivant: participant.pere_vivant ?? true,
        mere_vivante: participant.mere_vivante ?? true,
      });
    }
  }, [participant, reset]);

  function onSubmit(data: Record<string, unknown>) {
    updateMutation.mutate({ id: numId, data: {
      nom_prenoms: data.nom_prenoms as string,
      sexe: data.sexe as "M" | "F",
      date_naissance: (data.date_naissance as string) || undefined,
      electrophorese: (data.electrophorese as string) || undefined,
      groupe_sanguin: (data.groupe_sanguin as string) || undefined,
      village: (data.village as string) || undefined,
      quartier: (data.quartier as string) || undefined,
      contact_participant: (data.contact_participant as string) || undefined,
      eglise_participant: (data.eglise_participant as string) || undefined,
      date_bapteme: (data.date_bapteme as string) || undefined,
      classe: (data.classe as string) || undefined,
      vit_chez: (data.vit_chez as string) || undefined,
      contact_tuteur: (data.contact_tuteur as string) || undefined,
      religion_tuteur: (data.religion_tuteur as string) || undefined,
      situation_familiale: (data.situation_familiale as string) || undefined,
      pere_vivant: data.pere_vivant as boolean,
      mere_vivante: data.mere_vivante as boolean,
    } as Parameters<typeof updateMutation.mutate>[0]["data"] }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListParticipantsQueryKey() });
        toast({ title: "Participant mis à jour" });
        navigate(`/participants/${numId}`);
      },
      onError: () => toast({ title: "Erreur lors de la mise à jour", variant: "destructive" })
    });
  }

  if (isLoading) return <div className="p-6"><Skeleton className="h-96 w-full" /></div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/participants/${id}`}><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-2" />Retour</Button></Link>
        <div>
          <h1 className="text-2xl font-bold">Modifier le participant</h1>
          <p className="text-muted-foreground text-sm">{participant?.nom_prenoms} — {participant?.id_participant}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Identité</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-1">
              <Label>Nom et prénoms <span className="text-destructive">*</span></Label>
              <Input {...register("nom_prenoms", { required: true })} />
            </div>
            <div className="space-y-1">
              <Label>Sexe</Label>
              <Controller name="sexe" control={control} render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value as string}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="M">Masculin</SelectItem><SelectItem value="F">Féminin</SelectItem></SelectContent>
                </Select>
              )} />
            </div>
            <div className="space-y-1"><Label>Date de naissance</Label><Input type="date" {...register("date_naissance")} /></div>
            <div className="space-y-1">
              <Label>Village</Label>
              <Controller name="village" control={control} render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value as string}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{VILLAGES.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                </Select>
              )} />
            </div>
            <div className="space-y-1"><Label>Quartier</Label><Input {...register("quartier")} /></div>
            <div className="space-y-1"><Label>Contact participant</Label><Input {...register("contact_participant")} /></div>
            <div className="space-y-1"><Label>Classe scolaire</Label><Input {...register("classe")} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Famille</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Vit chez</Label>
              <Controller name="vit_chez" control={control} render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value as string}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{VIT_CHEZ.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                </Select>
              )} />
            </div>
            <div className="space-y-1"><Label>Contact tuteur</Label><Input {...register("contact_tuteur")} /></div>
            <div className="space-y-1"><Label>Religion tuteur</Label><Input {...register("religion_tuteur")} /></div>
            <div className="space-y-1">
              <Label>Situation familiale</Label>
              <Controller name="situation_familiale" control={control} render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value as string}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SITUATIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              )} />
            </div>
            <div className="flex items-center gap-6 col-span-2">
              <Controller name="pere_vivant" control={control} render={({ field }) => (
                <div className="flex items-center gap-2"><Checkbox checked={!!field.value} onCheckedChange={field.onChange} /><Label>Père vivant</Label></div>
              )} />
              <Controller name="mere_vivante" control={control} render={({ field }) => (
                <div className="flex items-center gap-2"><Checkbox checked={!!field.value} onCheckedChange={field.onChange} /><Label>Mère vivante</Label></div>
              )} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Santé</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Électrophorèse</Label>
              <Controller name="electrophorese" control={control} render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value as string}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ELECTROPHORESES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                </Select>
              )} />
            </div>
            <div className="space-y-1">
              <Label>Groupe sanguin</Label>
              <Controller name="groupe_sanguin" control={control} render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value as string}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{GROUPES_SANGUINS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              )} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Vie spirituelle</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1"><Label>Église</Label><Input {...register("eglise_participant")} /></div>
            <div className="space-y-1"><Label>Date de baptême</Label><Input type="date" {...register("date_bapteme")} /></div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href={`/participants/${id}`}><Button type="button" variant="outline">Annuler</Button></Link>
          <Button type="submit" disabled={updateMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />{updateMutation.isPending ? "Enregistrement..." : "Enregistrer les modifications"}
          </Button>
        </div>
      </form>
    </div>
  );
}
