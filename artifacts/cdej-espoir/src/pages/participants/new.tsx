import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateParticipant, getListParticipantsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useForm, Controller } from "react-hook-form";
import { ArrowLeft, Save } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

const ELECTROPHORESES = ["AA", "AC", "AS", "SC", "SS"];
const GROUPES_SANGUINS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
const VILLAGES = ["AVEDZE", "AGBELOUVE", "AFAGNAN", "GATI", "KPEDZE", "TSEVIE", "LOME", "TABLIGBO", "NOTSE"];
const VIT_CHEZ = ["Père", "Mère", "Les deux parents", "Tuteur", "Grand-père", "Grand-mère", "Oncle/Tante", "Seul"];
const SITUATIONS = ["Marié(e)", "Divorcé(e)", "Veuf/Veuve", "Célibataire"];

type FormValues = {
  nom_prenoms: string;
  sexe: string;
  date_naissance: string;
  electrophorese: string;
  groupe_sanguin: string;
  village: string;
  quartier: string;
  contact_participant: string;
  eglise_participant: string;
  date_bapteme: string;
  classe: string;
  vit_chez: string;
  contact_tuteur: string;
  religion_tuteur: string;
  situation_familiale: string;
  pere_vivant: boolean;
  mere_vivante: boolean;
};

export default function ParticipantsNew() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createMutation = useCreateParticipant();
  const { register, handleSubmit, control, formState: { errors } } = useForm<FormValues>({
    defaultValues: { pere_vivant: true, mere_vivante: true }
  });

  function onSubmit(data: FormValues) {
    createMutation.mutate({ data: {
      nom_prenoms: data.nom_prenoms,
      sexe: data.sexe as "M" | "F",
      date_naissance: data.date_naissance || undefined,
      electrophorese: data.electrophorese || undefined,
      groupe_sanguin: data.groupe_sanguin || undefined,
      village: data.village || undefined,
      quartier: data.quartier || undefined,
      contact_participant: data.contact_participant || undefined,
      eglise_participant: data.eglise_participant || undefined,
      date_bapteme: data.date_bapteme || undefined,
      classe: data.classe || undefined,
      vit_chez: data.vit_chez || undefined,
      contact_tuteur: data.contact_tuteur || undefined,
      religion_tuteur: data.religion_tuteur || undefined,
      situation_familiale: data.situation_familiale || undefined,
      pere_vivant: data.pere_vivant,
      mere_vivante: data.mere_vivante,
    } as Parameters<typeof createMutation.mutate>[0]["data"] }, {
      onSuccess: (participant) => {
        queryClient.invalidateQueries({ queryKey: getListParticipantsQueryKey() });
        toast({ title: "Participant créé avec succès" });
        navigate(`/participants/${participant.id}`);
      },
      onError: () => {
        toast({ title: "Erreur lors de la création", variant: "destructive" });
      }
    });
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/participants">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-2" />Retour</Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Nouveau participant</h1>
          <p className="text-muted-foreground text-sm">Enregistrer un nouveau bénéficiaire</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Identité</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-1">
              <Label>Nom et prénoms <span className="text-destructive">*</span></Label>
              <Input {...register("nom_prenoms", { required: "Requis" })} placeholder="Nom complet" />
              {errors.nom_prenoms && <p className="text-destructive text-xs">{errors.nom_prenoms.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Sexe <span className="text-destructive">*</span></Label>
              <Controller name="sexe" control={control} rules={{ required: "Requis" }} render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Masculin</SelectItem>
                    <SelectItem value="F">Féminin</SelectItem>
                  </SelectContent>
                </Select>
              )} />
              {errors.sexe && <p className="text-destructive text-xs">{errors.sexe.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Date de naissance</Label>
              <Input type="date" {...register("date_naissance")} />
            </div>
            <div className="space-y-1">
              <Label>Village</Label>
              <Controller name="village" control={control} render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un village" /></SelectTrigger>
                  <SelectContent>{VILLAGES.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                </Select>
              )} />
            </div>
            <div className="space-y-1">
              <Label>Quartier</Label>
              <Input {...register("quartier")} placeholder="Quartier" />
            </div>
            <div className="space-y-1">
              <Label>Contact participant</Label>
              <Input {...register("contact_participant")} placeholder="+228 9X XX XX XX" />
            </div>
            <div className="space-y-1">
              <Label>Classe scolaire</Label>
              <Input {...register("classe")} placeholder="Ex: CM2, 4ème..." />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Situation familiale</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Vit chez</Label>
              <Controller name="vit_chez" control={control} render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue placeholder="Avec qui vit-il/elle ?" /></SelectTrigger>
                  <SelectContent>{VIT_CHEZ.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                </Select>
              )} />
            </div>
            <div className="space-y-1">
              <Label>Contact tuteur</Label>
              <Input {...register("contact_tuteur")} placeholder="+228 9X XX XX XX" />
            </div>
            <div className="space-y-1">
              <Label>Religion tuteur</Label>
              <Input {...register("religion_tuteur")} placeholder="Religion du tuteur" />
            </div>
            <div className="space-y-1">
              <Label>Situation familiale</Label>
              <Controller name="situation_familiale" control={control} render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue placeholder="Situation" /></SelectTrigger>
                  <SelectContent>{SITUATIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              )} />
            </div>
            <div className="flex items-center gap-6">
              <Controller name="pere_vivant" control={control} render={({ field }) => (
                <div className="flex items-center gap-2">
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} id="pere_vivant" />
                  <Label htmlFor="pere_vivant">Père vivant</Label>
                </div>
              )} />
              <Controller name="mere_vivante" control={control} render={({ field }) => (
                <div className="flex items-center gap-2">
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} id="mere_vivante" />
                  <Label htmlFor="mere_vivante">Mère vivante</Label>
                </div>
              )} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Données de santé</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Électrophorèse</Label>
              <Controller name="electrophorese" control={control} render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue placeholder="Type d'hémoglobine" /></SelectTrigger>
                  <SelectContent>{ELECTROPHORESES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                </Select>
              )} />
            </div>
            <div className="space-y-1">
              <Label>Groupe sanguin</Label>
              <Controller name="groupe_sanguin" control={control} render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue placeholder="Groupe sanguin" /></SelectTrigger>
                  <SelectContent>{GROUPES_SANGUINS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              )} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Vie spirituelle</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Église</Label>
              <Input {...register("eglise_participant")} placeholder="Nom de l'église" />
            </div>
            <div className="space-y-1">
              <Label>Date de baptême</Label>
              <Input type="date" {...register("date_bapteme")} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href="/participants"><Button type="button" variant="outline">Annuler</Button></Link>
          <Button type="submit" disabled={createMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />{createMutation.isPending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </form>
    </div>
  );
}
