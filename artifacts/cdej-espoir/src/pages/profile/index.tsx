import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/layout/PageHeader";
import { User, Lock, Mail, ShieldCheck } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrateur",
  coordinateur: "Coordinateur",
  enseignant: "Enseignant",
  sante: "Santé",
  comptable: "Comptable",
  viewer: "Lecteur",
};

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [nomComplet, setNomComplet] = useState(user?.nom_complet ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);

  const initials = (user?.nom_complet ?? "?").split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch("/api/auth/profile", { method: "PATCH", body: JSON.stringify({ nom_complet: nomComplet }) });
      toast({ title: "Profil mis à jour" });
    } catch (err) {
      toast({ title: "Erreur", description: err instanceof Error ? err.message : "Erreur inconnue", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: "Les mots de passe ne correspondent pas", variant: "destructive" });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: "Le mot de passe doit contenir au moins 8 caractères", variant: "destructive" });
      return;
    }
    setChangingPwd(true);
    try {
      await apiFetch("/api/auth/change-password", { method: "POST", body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }) });
      toast({ title: "Mot de passe modifié" });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err) {
      toast({ title: "Erreur", description: err instanceof Error ? err.message : "Identifiants invalides", variant: "destructive" });
    } finally {
      setChangingPwd(false);
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader title="Mon profil" subtitle="Gérez vos informations personnelles et votre sécurité" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Informations du compte
                </CardTitle>
                <CardDescription>
                  <span className="flex items-center gap-1 mt-1"><Mail className="w-3 h-3" />{user?.email}</span>
                </CardDescription>
                <Badge className="mt-1" variant="secondary">{ROLE_LABELS[user?.role ?? ""] ?? user?.role}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nom-complet">Nom complet</Label>
                <Input id="nom-complet" value={nomComplet} onChange={e => setNomComplet(e.target.value)} data-testid="input-nom-complet" />
              </div>
              <Button type="submit" disabled={saving} data-testid="button-save-profile">
                {saving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Lock className="w-4 h-4" />Sécurité</CardTitle>
            <CardDescription>Modifiez votre mot de passe</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Mot de passe actuel</Label>
                <Input id="current-password" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} data-testid="input-current-password" />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="new-password">Nouveau mot de passe</Label>
                <Input id="new-password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} data-testid="input-new-password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
                <Input id="confirm-password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} data-testid="input-confirm-password" />
              </div>
              <Button type="submit" disabled={changingPwd} variant="outline" data-testid="button-change-password">
                {changingPwd ? "Modification..." : "Modifier le mot de passe"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" />Informations de session</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><dt className="text-muted-foreground">Email</dt><dd className="font-medium">{user?.email}</dd></div>
              <div><dt className="text-muted-foreground">Rôle</dt><dd className="font-medium">{ROLE_LABELS[user?.role ?? ""] ?? user?.role}</dd></div>
              <div><dt className="text-muted-foreground">Compte actif</dt><dd className="font-medium">{user?.actif ? "Oui" : "Non"}</dd></div>
              <div><dt className="text-muted-foreground">Dernière connexion</dt><dd className="font-medium">{user?.last_login_at ? new Date(user.last_login_at).toLocaleDateString('fr-FR') : "—"}</dd></div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
