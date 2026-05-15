import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, LogIn } from "lucide-react";

/**
 * Page 404 publique (volontairement HORS du AppLayout protégé).
 * On adapte simplement le bouton de retour selon l'état d'auth.
 */
export default function NotFound() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 max-w-md px-4">
        <div className="relative">
          <div className="text-[120px] font-extrabold text-primary/10 select-none leading-none">404</div>
          <div className="absolute inset-0 flex items-center justify-center">
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none" aria-hidden="true">
              <rect width="80" height="80" rx="20" fill="hsl(152,52%,24%)" opacity="0.15" />
              <path d="M40 15L20 30v20l20 15 20-15V30L40 15z" fill="hsl(152,52%,24%)" opacity="0.4" />
              <text
                x="40"
                y="52"
                textAnchor="middle"
                fontSize="24"
                fill="hsl(152,52%,24%)"
                fontWeight="bold"
              >
                ?
              </text>
            </svg>
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Page introuvable</h1>
          <p className="text-muted-foreground">
            Cette page n'existe pas ou vous n'avez pas les droits d'accès nécessaires.
          </p>
        </div>
        {isAuthenticated ? (
          <Link href="/dashboard">
            <Button data-testid="button-back-home">
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Retour au tableau de bord
            </Button>
          </Link>
        ) : (
          <Link href="/login">
            <Button data-testid="button-back-login">
              <LogIn className="w-4 h-4 mr-2" />
              Se connecter
            </Button>
          </Link>
        )}
        <p className="text-xs text-muted-foreground">CDEJ Espoir TG0154</p>
      </div>
    </div>
  );
}
