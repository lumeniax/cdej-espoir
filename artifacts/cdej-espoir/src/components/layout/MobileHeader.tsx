import { useState } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

export function MobileHeader() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-sidebar border-b border-sidebar-border sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <rect width="32" height="32" rx="8" fill="hsl(152,52%,24%)" />
            <path d="M16 6L8 12v8l8 6 8-6v-8L16 6z" fill="hsl(42,72%,52%)" opacity="0.9" />
            <path d="M16 10l-5 4v5l5 3.5 5-3.5v-5L16 10z" fill="hsl(152,52%,24%)" />
          </svg>
          <div>
            <span className="text-sidebar-foreground font-bold text-sm">CDEJ Espoir</span>
            <span className="text-sidebar-foreground/60 text-xs ml-1">TG0154</span>
          </div>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="p-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          data-testid="button-mobile-menu"
          aria-label="Ouvrir le menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="p-0 w-72 bg-sidebar border-sidebar-border">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
