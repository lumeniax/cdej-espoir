import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { AppLayout } from "@/components/layout/AppLayout";
import { ThemeProvider } from "next-themes";
import { useNavigationProgress } from "@/hooks/use-navigation-progress";

import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import ParticipantsList from "@/pages/participants";
import ParticipantsNew from "@/pages/participants/new";
import ParticipantDetail from "@/pages/participants/detail";
import ParticipantsEdit from "@/pages/participants/edit";
import EnseignantsList from "@/pages/enseignants";
import EnseignantDetail from "@/pages/enseignants/detail";
import EtablissementsList from "@/pages/etablissements";
import EtablissementDetail from "@/pages/etablissements/detail";
import Affectations from "@/pages/affectations";
import Presences from "@/pages/presences";
import ImcTracking from "@/pages/imc";
import FichesList from "@/pages/fiches";
import FicheNew from "@/pages/fiches/new";
import FicheDetail from "@/pages/fiches/detail";
import AdminReferentiels from "@/pages/admin/referentiels";
import AdminUsers from "@/pages/admin/users";
import About from "@/pages/about";
import Tuteurs from "@/pages/tuteurs";
import Sante from "@/pages/sante";
import Scolarite from "@/pages/scolarite";
import Spirituel from "@/pages/spirituel";
import Finances from "@/pages/finances";
import Documents from "@/pages/documents";
import Notifications from "@/pages/notifications";
import ImportExport from "@/pages/import-export";
import Profile from "@/pages/profile/index";
import RapportMensuel from "@/pages/rapport-mensuel";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Wrap({ children }: { children: React.ReactNode }) {
  return <AppLayout>{children}</AppLayout>;
}

function Router() {
  useNavigationProgress();
  return (
    <Switch>
      <Route path="/login" component={Login} />

      <Route path="/dashboard" component={() => <Wrap><Dashboard /></Wrap>} />
      <Route path="/rapport-mensuel" component={() => <Wrap><RapportMensuel /></Wrap>} />
      <Route path="/profile" component={() => <Wrap><Profile /></Wrap>} />

      <Route path="/participants/new" component={() => <Wrap><ParticipantsNew /></Wrap>} />
      <Route path="/participants/:id/edit" component={() => <Wrap><ParticipantsEdit /></Wrap>} />
      <Route path="/participants/:id" component={() => <Wrap><ParticipantDetail /></Wrap>} />
      <Route path="/participants" component={() => <Wrap><ParticipantsList /></Wrap>} />

      <Route path="/enseignants/:id" component={() => <Wrap><EnseignantDetail /></Wrap>} />
      <Route path="/enseignants" component={() => <Wrap><EnseignantsList /></Wrap>} />

      <Route path="/etablissements/:id" component={() => <Wrap><EtablissementDetail /></Wrap>} />
      <Route path="/etablissements" component={() => <Wrap><EtablissementsList /></Wrap>} />

      <Route path="/affectations" component={() => <Wrap><Affectations /></Wrap>} />
      <Route path="/presences" component={() => <Wrap><Presences /></Wrap>} />
      <Route path="/imc" component={() => <Wrap><ImcTracking /></Wrap>} />

      <Route path="/fiches-paiement/new" component={() => <Wrap><FicheNew /></Wrap>} />
      <Route path="/fiches-paiement/:id" component={() => <Wrap><FicheDetail /></Wrap>} />
      <Route path="/fiches-paiement" component={() => <Wrap><FichesList /></Wrap>} />

      <Route path="/tuteurs" component={() => <Wrap><Tuteurs /></Wrap>} />
      <Route path="/sante" component={() => <Wrap><Sante /></Wrap>} />
      <Route path="/scolarite" component={() => <Wrap><Scolarite /></Wrap>} />
      <Route path="/spirituel" component={() => <Wrap><Spirituel /></Wrap>} />
      <Route path="/finances" component={() => <Wrap><Finances /></Wrap>} />
      <Route path="/documents" component={() => <Wrap><Documents /></Wrap>} />
      <Route path="/notifications" component={() => <Wrap><Notifications /></Wrap>} />
      <Route path="/import-export" component={() => <Wrap><ImportExport /></Wrap>} />

      <Route path="/admin/referentiels" component={() => <Wrap><AdminReferentiels /></Wrap>} />
      <Route path="/admin/users" component={() => <Wrap><AdminUsers /></Wrap>} />

      <Route path="/about" component={() => <Wrap><About /></Wrap>} />
      <Route path="/" component={() => <Wrap><Dashboard /></Wrap>} />
      <Route component={() => <Wrap><NotFound /></Wrap>} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="cdej-theme">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
