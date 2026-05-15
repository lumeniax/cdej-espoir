import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiClient } from "@/lib/apiClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, Trash2, FileText, Image, File } from "lucide-react";
import { useListParticipants, getListParticipantsQueryKey } from "@workspace/api-client-react";

interface Doc { id: number; participant_id?: number; type: string; nom: string; mime_type?: string; taille?: number; description?: string; confidentiel?: boolean; created_at: string; url: string; }

const DOC_TYPES: Record<string, string> = {
  photo: "Photo", acte_naissance: "Acte de naissance", autorisation: "Autorisation parentale",
  bulletin: "Bulletin scolaire", medical: "Document médical", paiement: "Preuve de paiement", autre: "Autre",
};

function fileIcon(mime?: string) {
  if (!mime) return <File className="w-8 h-8 text-gray-400" />;
  if (mime.startsWith("image/")) return <Image className="w-8 h-8 text-blue-400" />;
  return <FileText className="w-8 h-8 text-orange-400" />;
}

function fmtSize(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

export default function Documents() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [form, setForm] = useState({ type: "autre", description: "", participant_id: "" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: participants = [] } = useListParticipants({ page: 1, page_size: 200 }, { query: { queryKey: getListParticipantsQueryKey({ page: 1, page_size: 200 }) } });
  const participantList = (participants as any)?.items ?? participants;

  const { data: docs = [] } = useQuery<Doc[]>({
    queryKey: ["/api/documents"],
    queryFn: () => apiFetch("/api/documents"),
  });

  const filtered = filterType === "all" ? docs : docs.filter(d => d.type === filterType);

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiClient(`/api/documents/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/documents"] }); toast({ title: "Document supprimé" }); },
  });

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });
      const res = await apiClient("/api/documents/upload", {
        method: "POST",
        body: JSON.stringify({
          nom: selectedFile.name,
          data: base64,
          mime_type: selectedFile.type,
          type: form.type,
          description: form.description || undefined,
          participant_id: form.participant_id || undefined,
        }),
      });
      if (!res.ok) throw new Error("Erreur upload");
      qc.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "Document uploadé" });
      setDialogOpen(false);
      setSelectedFile(null);
      setForm({ type: "autre", description: "", participant_id: "" });
    } catch (e) {
      toast({ title: String(e), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const pName = (id?: number) => {
    if (!id) return null;
    const found = participantList.find((x: any) => x.id === id);
    return found ? found.nom_prenoms : null;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Documents</h1>
          <p className="text-muted-foreground mt-1">{docs.length} document{docs.length > 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Upload className="w-4 h-4 mr-2" />Uploader</Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button size="sm" variant={filterType === "all" ? "default" : "outline"} onClick={() => setFilterType("all")}>Tous</Button>
        {Object.entries(DOC_TYPES).map(([k, v]) => (
          <Button key={k} size="sm" variant={filterType === k ? "default" : "outline"} onClick={() => setFilterType(k)}>{v}</Button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(d => (
          <Card key={d.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">{fileIcon(d.mime_type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{d.nom}</p>
                  {pName(d.participant_id) && <p className="text-xs text-muted-foreground truncate">{pName(d.participant_id)}</p>}
                  <div className="flex gap-1 mt-1 flex-wrap">
                    <Badge variant="outline" className="text-xs">{DOC_TYPES[d.type] ?? d.type}</Badge>
                    {d.taille && <Badge variant="outline" className="text-xs">{fmtSize(d.taille)}</Badge>}
                    {d.confidentiel && <Badge variant="destructive" className="text-xs">Confidentiel</Badge>}
                  </div>
                  {d.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{d.description}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{new Date(d.created_at).toLocaleDateString("fr-FR")}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" className="flex-1" asChild>
                  <a href={d.url} download={d.nom}><Download className="w-3.5 h-3.5 mr-1.5" />Télécharger</a>
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteMut.mutate(d.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && <p className="col-span-3 text-center py-12 text-muted-foreground">Aucun document</p>}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Uploader un document</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors" onClick={() => fileRef.current?.click()}>
              {selectedFile ? (
                <div>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">{fmtSize(selectedFile.size)}</p>
                </div>
              ) : (
                <div>
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Cliquer pour choisir un fichier</p>
                  <p className="text-xs text-muted-foreground">PDF, images, Word — max 10 Mo</p>
                </div>
              )}
              <input ref={fileRef} type="file" className="hidden" onChange={e => setSelectedFile(e.target.files?.[0] ?? null)} accept="image/*,.pdf,.doc,.docx,.xlsx" />
            </div>
            <div className="space-y-1">
              <Label>Type de document</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(DOC_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Participant (optionnel)</Label>
              <Select value={form.participant_id} onValueChange={v => setForm(f => ({ ...f, participant_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                <SelectContent className="max-h-48">
                  <SelectItem value="">Aucun</SelectItem>
                  {participantList.map((pt: any) => <SelectItem key={pt.id} value={String(pt.id)}>{pt.nom_prenoms}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleUpload} disabled={!selectedFile || uploading}>
              {uploading ? "Upload..." : "Uploader"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
