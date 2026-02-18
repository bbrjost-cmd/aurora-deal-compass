import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Map, Kanban, Calculator, Database, Settings, Menu, X, BarChart3, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CommandBar } from "@/components/CommandBar";

const NAV_ITEMS = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/map", label: "Map", icon: Map },
  { path: "/pipeline", label: "Pipeline", icon: Kanban },
  { path: "/feasibility", label: "Feasibility", icon: Calculator },
  { path: "/ic", label: "IC", icon: BarChart3 },
  { path: "/data-sources", label: "Data", icon: Database },
  { path: "/admin", label: "Admin", icon: Settings },
];

// Bottom nav shows only the most important 5 items on mobile
const BOTTOM_NAV = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/map", label: "Map", icon: Map },
  { path: "/pipeline", label: "Pipeline", icon: Kanban },
  { path: "/ic", label: "IC", icon: BarChart3 },
  { path: "/admin", label: "Admin", icon: Settings },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-56 border-r border-border bg-sidebar flex flex-col transition-transform lg:relative lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand */}
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <div className="h-8 w-8 rounded-md aurora-gradient flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-white">A</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-foreground">AURORA</h1>
            <p className="text-[9px] tracking-[0.25em] text-muted-foreground uppercase">DevOS MX</p>
          </div>
          <Button variant="ghost" size="icon" className="ml-auto lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* ⌘K hint */}
        <div className="px-3 pb-3">
          <button
            onClick={() => setCmdOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md border border-border/60 text-xs text-muted-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Rechercher...</span>
            <kbd className="ml-auto text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
          </button>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <p className="text-[10px] text-muted-foreground text-center tracking-wider">Accor Development Tools</p>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-12 border-b border-border flex items-center gap-2 px-3 bg-background shrink-0">
          <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-4 w-4" />
          </Button>
          {/* Brand on mobile header */}
          <div className="flex items-center gap-1.5 lg:hidden">
            <div className="h-6 w-6 rounded aurora-gradient flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">A</span>
            </div>
            <span className="text-sm font-semibold tracking-tight">AURORA</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCmdOpen(true)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground h-7 px-2"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Rechercher</span>
              <kbd className="text-[10px] bg-muted px-1 py-0.5 rounded font-mono hidden sm:inline">⌘K</kbd>
            </Button>
            <div className="h-2 w-2 rounded-full bg-primary" title="Connected" />
          </div>
        </header>

        {/* Content — leave bottom padding on mobile for bottom nav */}
        <main className="flex-1 overflow-auto min-h-0 pb-16 lg:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-border bg-background/95 backdrop-blur-md">
        <div className="flex items-center justify-around px-1 py-1 safe-area-bottom">
          {BOTTOM_NAV.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg min-w-[52px] transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive && "text-primary")} />
                <span className={cn("text-[9px] font-medium tracking-tight", isActive ? "text-primary" : "text-muted-foreground")}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Command Bar */}
      <CommandBar open={cmdOpen} onOpenChange={setCmdOpen} />
    </div>
  );
}
