import { Link, useLocation } from "wouter";
import { useTheme } from "next-themes";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  School,
  CalendarCheck,
  ActivitySquare,
  Receipt,
  Settings,
  Info,
  LogOut,
  Heart,
  BookOpen,
  Star,
  DollarSign,
  FileText,
  Bell,
  Upload,
  UserCheck,
  Moon,
  Sun,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLogout } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { GlobalSearch } from "../GlobalSearch";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const [location] = useLocation();
  const { user, logout: clearAuth } = useAuth();
  const { theme, setTheme } = useTheme();
  const logoutMutation = useLogout();

  const { data: notifData } = useQuery({
    queryKey: ["/api/notifications"],
    queryFn: () => apiClient("/api/notifications").then(r => r.json()),
    refetchInterval: 60000,
  });
  const unread: number = notifData?.unread ?? 0;

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => clearAuth(),
      onError: () => clearAuth(),
    });
  };

  const navItems = [
    { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
    { href: "/participants", label: "Participants", icon: Users },
    { href: "/tuteurs", label: "Tuteurs / Familles", icon: UserCheck },
    { href: "/enseignants", label: "Enseignants", icon: GraduationCap },
    { href: "/etablissements", label: "Établissements", icon: School },
    { href: "/affectations", label: "Affectations", icon: Users },
    { href: "/presences", label: "Présences", icon: CalendarCheck },
  ];

  const moduleItems = [
    { href: "/sante", label: "Santé", icon: Heart },
    { href: "/scolarite", label: "Scolarité", icon: BookOpen },
    { href: "/spirituel", label: "Spirituel", icon: Star },
    { href: "/finances", label: "Finances", icon: DollarSign },
    { href: "/documents", label: "Documents", icon: FileText },
    { href: "/import-export", label: "Import / Export", icon: Upload },
    { href: "/imc", label: "Suivi IMC", icon: ActivitySquare },
    { href: "/fiches-paiement", label: "Fiches de paiement", icon: Receipt },
  ];

  const adminItems = [
    { href: "/admin/referentiels", label: "Référentiels", icon: Settings },
    { href: "/admin/users", label: "Utilisateurs", icon: Users },
  ];

  const isActive = (path: string) => {
    if (path === "/dashboard" && (location === "/dashboard" || location === "/")) return true;
    if (path !== "/dashboard" && location.startsWith(path)) return true;
    return false;
  };

  const NavLink = ({ href, label, icon: Icon, badge }: { href: string; label: string; icon: React.ComponentType<{className?: string}>; badge?: number }) => {
    const active = isActive(href);
    return (
      <Link href={href} className="block" onClick={() => onNavigate?.()}>
        <div className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        )}>
          <Icon className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">{label}</span>
          {badge != null && badge > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
              {badge > 9 ? "9+" : badge}
            </span>
          )}
        </div>
      </Link>
    );
  };

  return (
    <div className="w-64 bg-sidebar text-sidebar-foreground flex flex-col flex-shrink-0 border-r border-sidebar-border">
      <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center font-bold text-primary-foreground text-sm">E</div>
          <span className="font-semibold text-lg tracking-tight">CDEJ Espoir</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        <div>
          <div className="mb-2">
            <GlobalSearch />
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </nav>
        </div>

        <div>
          <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">Modules</div>
          <nav className="space-y-1">
            {moduleItems.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </nav>
        </div>

        <div>
          <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">Notifications</div>
          <nav className="space-y-1">
            <NavLink href="/notifications" label="Notifications" icon={Bell} badge={unread} />
          </nav>
        </div>

        {user?.role === "admin" && (
          <div>
            <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">Administration</div>
            <nav className="space-y-1">
              {adminItems.map((item) => (
                <NavLink key={item.href} {...item} />
              ))}
            </nav>
          </div>
        )}

        <div>
          <nav className="space-y-1">
            <NavLink href="/about" label="À propos" icon={Info} />
          </nav>
        </div>
      </div>

      <div className="p-4 border-t border-sidebar-border bg-sidebar-accent/20">
        <div className="flex items-center gap-3 mb-4 px-2">
          <Avatar className="w-8 h-8 rounded-full border border-sidebar-border bg-sidebar-primary/20 text-sidebar-primary">
            <AvatarFallback className="bg-transparent font-medium text-sm">
              {user?.nom_complet?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() ?? 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.nom_complet}</p>
            <p className="text-xs text-sidebar-foreground/60 capitalize truncate">{user?.role}</p>
          </div>
        </div>
        <Link href="/profile" className="w-full flex items-center gap-2 px-3 py-2 mb-1 rounded-md text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors" onClick={() => onNavigate?.()}>
          <User className="w-4 h-4 flex-shrink-0" />
          <span>Mon profil</span>
        </Link>
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="w-full flex items-center gap-2 px-3 py-2 mb-1 rounded-md text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
          data-testid="button-dark-mode-toggle"
        >
          {theme === "dark" ? <Sun className="w-4 h-4 flex-shrink-0" /> : <Moon className="w-4 h-4 flex-shrink-0" />}
          <span>{theme === "dark" ? "Mode clair" : "Mode sombre"}</span>
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <span>Déconnexion</span>
        </button>
      </div>
    </div>
  );
}
