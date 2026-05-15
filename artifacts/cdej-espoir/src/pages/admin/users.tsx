import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListUsers, useCreateUser, useUpdateUser, useDeleteUser, getListUsersQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, UserCog } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

type User = { id: string; email: string; nom_complet: string; role: string; actif: boolean; last_login_at?: string | null };

const ROLES: Record<string, { label: string; cls: string }> = {
  admin: { label: "Administrateur", cls: "bg-purple-100 text-purple-800" },
  coordinator: { label: "Coordinateur", cls: "bg-blue-100 text-blue-800" },
  enseignant: { label: "Enseignant", cls: "bg-green-100 text-green-800" },
  viewer: { label: "Lecture seule", cls: "bg-gray-100 text-gray-700" },
};

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: users = [], isLoading } = useListUsers({});
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();

  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState({ email: "", nom_complet: "", role: "viewer", password: "" });

  const list = Array.isArray(users) ? users as User[] : [];

  if (user?.role !== "admin") {
    return <div className="p-6"><p className="text-destructive font-medium">Accès refusé. Réservé aux administrateurs.</p></div>;
  }

  function handleCreate() {
    if (!form.email || !form.nom_complet || !form.role || !form.password) return;
    createMutation.mutate({ data: { email: form.email, nom_complet: form.nom_complet, role: form.role as "admin" | "coordinator" | "enseignant" | "viewer", password: form.password } as Parameters<typeof createMutation.mutate>[0]["data"] }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        toast({ title: "Utilisateur créé" });
        setCreateOpen(false);
        setForm({ email: "", nom_complet: "", role: "viewer", password: "" });
      },
      onError: () => toast({ title: "Erreur de création", variant: "destructive" })
    });
  }

  function handleUpdate() {
    if (!editUser) return;
    updateMutation.mutate({ id: editUser.id, data: { nom_complet: form.nom_complet, role: form.role as "admin" | "coordinator" | "enseignant" | "viewer", actif: editUser.actif } as Parameters<typeof updateMutation.mutate>[0]["data"] }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        toast({ title: "Utilisateur mis à jour" });
        setEditUser(null);
      },
      onError: () => toast({ title: "Erreur", variant: "destructive" })
    });
  }

  function handleDelete(id: string) {
    deleteMutation.mutate({ id } as Parameters<typeof deleteMutation.mutate>[0], {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() }); toast({ title: "Utilisateur supprimé" }); }
    });
  }

  function openEdit(u: User) {
    setEditUser(u);
    setForm({ email: u.email, nom_complet: u.nom_complet, role: u.role, password: "" });
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestion des utilisateurs</h1>
          <p className="text-muted-foreground text-sm">{list.length} utilisateur{list.length > 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />Nouvel utilisateur</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Dernière connexion</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
              ) : list.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucun utilisateur</TableCell></TableRow>
              ) : list.map(u => {
                const role = ROLES[u.role] || { label: u.role, cls: "bg-gray-100 text-gray-700" };
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.nom_complet}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell><Badge className={role.cls}>{role.label}</Badge></TableCell>
                    <TableCell><Badge className={u.actif ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}>{u.actif ? "Actif" : "Inactif"}</Badge></TableCell>
                    <TableCell className="text-muted-foreground text-sm">{u.last_login_at ? new Date(u.last_login_at).toLocaleDateString("fr-FR") : "Jamais"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(u)}><Edit className="h-4 w-4" /></Button>
                        {u.id !== user?.id && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>Supprimer {u.nom_complet} ?</AlertDialogTitle><AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(u.id)} className="bg-destructive text-destructive-foreground">Supprimer</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvel utilisateur</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1"><Label>Nom complet <span className="text-destructive">*</span></Label><Input value={form.nom_complet} onChange={e => setForm(f => ({ ...f, nom_complet: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Email <span className="text-destructive">*</span></Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div className="space-y-1">
              <Label>Rôle</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(ROLES).map(([v, r]) => <SelectItem key={v} value={v}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Mot de passe <span className="text-destructive">*</span></Label><Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={!form.email || !form.nom_complet || !form.password || createMutation.isPending}>{createMutation.isPending ? "Création..." : "Créer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editUser} onOpenChange={v => !v && setEditUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Modifier l'utilisateur</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1"><Label>Nom complet</Label><Input value={form.nom_complet} onChange={e => setForm(f => ({ ...f, nom_complet: e.target.value }))} /></div>
            <div className="space-y-1">
              <Label>Rôle</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(ROLES).map(([v, r]) => <SelectItem key={v} value={v}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Annuler</Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
