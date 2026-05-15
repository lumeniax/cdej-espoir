import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { MobileHeader } from "./MobileHeader";
import { ProtectedRoute } from "./ProtectedRoute";
import { useOnlineStatus } from "@/hooks/use-online-status";

export function AppLayout({ children }: { children: ReactNode }) {
  const isOnline = useOnlineStatus();
  return (
    <ProtectedRoute>
      <div className="min-h-[100dvh] flex bg-muted/30">
        <div className="hidden md:flex">
          <Sidebar />
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <MobileHeader />
          <main className="flex-1 flex flex-col min-w-0">
            {!isOnline && (
              <div className="bg-amber-500 text-white text-center text-sm py-2 px-4">
                Vous êtes hors ligne — les présences sont sauvegardées localement
              </div>
            )}
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
