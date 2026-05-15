import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListReferentiels, useCreateReferentiel, useDeleteReferentiel, getListReferentielsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Ref = { id: number; type: string; valeur: string; ordre: number; actif: boolean };

const TYPES = [
  { value: "village", label: "Villages" },
  { value: "religion", label: "Religions" },
  { value: "vit_chez", label: "Vit chez" },
  { value: "situation_familiale", label: "Situations familiales" },
];

function RefTab({ type, label }: { type: string; label: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: refs = [], isLoading } = useListReferentiels({ type });
  const createMutation = useCreateReferentiel();
  const deleteMutation = useDeleteReferentiel();
  const [newVal, setNewVal] = useState("");

  const list = Array.isArray(refs) ? refs as Ref[] : [];

  function handleAdd() {
    if (!newVal.trim()) return;
    createMutation.mutate({ data: { type, valeur: newVal.trim(), ordre: list.length, actif: true } as Parameters<typeof createMutation.mutate>[0]["data"] }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListReferentielsQueryKey({ type }) });
        toast({ title: `${label} ajouté` });
        setNewVal("");
      },
      onError: () => toast({ title: "Erreur", variant: "destructive" })
    });
  }

  function handleDelete(id: number) {
    deleteMutation.mutate({ id } as Parameters<typeof deleteMutation.mutate>[0], {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListReferentielsQueryKey({ type }) })
    });
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="flex gap-2">
        <Input value={newVal} onChange={e => setNewVal(e.target.value)} placeholder={`Nouveau ${label.toLowerCase().replace(/s$/, "").toLowerCase()}...`}
          onKeyDown={e => { if (e.key === "Enter") handleAdd(); }} />
        <Button onClick={handleAdd} disabled={!newVal.trim() || createMutation.isPending}><Plus className="h-4 w-4 mr-1" />Ajouter</Button>
      </div>
      {isLoading ? <p className="text-muted-foreground text-sm">Chargement...</p> : (
        <div className="space-y-2">
          {list.length === 0 ? <p className="text-muted-foreground text-sm">Aucune entrée</p> : list.map(r => (
            <div key={r.id} className="flex items-center justify-between p-3 rounded border bg-muted/30">
              <span className="font-medium">{r.valeur}</span>
              <div className="flex items-center gap-2">
                {!r.actif && <Badge variant="outline" className="text-xs">Inactif</Badge>}
                <Button variant="ghost" size="sm" onClick={() => handleDelete(r.id)} disabled={deleteMutation.isPending}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminReferentiels() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Données de référence</h1>
        <p className="text-muted-foreground text-sm">Gérer les listes de valeurs utilisées dans les formulaires</p>
      </div>

      <Tabs defaultValue="village">
        <TabsList className="grid grid-cols-4 w-full">
          {TYPES.map(t => <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>)}
        </TabsList>
        {TYPES.map(t => (
          <TabsContent key={t.value} value={t.value}>
            <Card>
              <CardHeader><CardTitle>{t.label}</CardTitle></CardHeader>
              <CardContent><RefTab type={t.value} label={t.label} /></CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
