import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Map, Kanban, Calculator, Database, Settings, Search, BarChart3,
} from "lucide-react";
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

const BOTTOM_NAV = [
  { path: "/", label: "Home", icon: LayoutDashboard },
  { path: "/map", label: "Map", icon: Map },
  { path: "/pipeline", label: "Pipeline", icon: Kanban },
  { path: "/ic", label: "IC", icon: BarChart3 },
  { path: "/admin", label: "Admin", icon: Settings },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
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

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex flex-col w-60 border-r border-border bg-background shrink-0">
        {/* Logo */}
        <div className="px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl aurora-gradient flex items-center justify-center shrink-0 shadow-sm">
              <span className="text-xs font-bold text-white tracking-tight">A</span>
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight text-foreground">Aurora</p>
              <p className="text-[10px] text-muted-foreground tracking-widest uppercase">Dev MX</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 mb-4">
          <button
            onClick={() => setCmdOpen(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-secondary text-muted-foreground text-xs hover:bg-muted transition-colors"
          >
            <Search className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 text-left">Search</span>
            <kbd className="text-[10px] bg-background px-1.5 py-0.5 rounded-md font-mono border border-border">⌘K</kbd>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors",
                  isActive
                    ? "bg-foreground text-background font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-border">
          <p className="text-[10px] text-muted-foreground tracking-widest uppercase">Accor Development</p>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden h-14 border-b border-border flex items-center justify-between px-4 bg-background/95 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg aurora-gradient flex items-center justify-center">
              <span className="text-[11px] font-bold text-white">A</span>
            </div>
            <span className="text-sm font-semibold tracking-tight">Aurora</span>
          </div>
          <button
            onClick={() => setCmdOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-secondary text-muted-foreground text-xs hover:bg-muted transition-colors"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search</span>
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto min-h-0 pb-20 lg:pb-0">
          {children}
        </main>
      </div>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-background/95 backdrop-blur-md border-t border-border">
        <div className="flex items-center justify-around px-2 py-2 pb-[env(safe-area-inset-bottom)]">
          {BOTTOM_NAV.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex flex-col items-center gap-0.5 px-3 py-1 min-w-[52px]"
              >
                <div className={cn(
                  "h-8 w-8 flex items-center justify-center rounded-xl transition-colors",
                  isActive ? "bg-foreground" : "bg-transparent"
                )}>
                  <item.icon className={cn(
                    "h-4.5 w-4.5",
                    isActive ? "text-background" : "text-muted-foreground"
                  )} style={{ width: '18px', height: '18px' }} />
                </div>
                <span className={cn(
                  "text-[9px] font-medium tracking-tight",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      <CommandBar open={cmdOpen} onOpenChange={setCmdOpen} />
    </div>
  );
}
