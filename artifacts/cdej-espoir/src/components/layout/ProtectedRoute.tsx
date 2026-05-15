import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

/**
 * Garde-fou pour les routes authentifiées.
 *
 * Important : tant que le provider d'auth est en phase de bootstrap
 * (`initializing === true`), on affiche un loader plutôt que de rediriger
 * vers `/login`. Sans cela, un utilisateur qui rafraîchit la page se
 * retrouverait sur le login le temps que le refresh silencieux aboutisse.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, initializing } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!initializing && !isAuthenticated) {
      setLocation("/login");
    }
  }, [initializing, isAuthenticated, setLocation]);

  if (initializing) {
    return (
      <div
        className="min-h-[100dvh] flex items-center justify-center bg-background"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="sr-only">Chargement…</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
