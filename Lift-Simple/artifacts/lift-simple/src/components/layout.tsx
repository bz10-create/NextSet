import { Link, useLocation } from "wouter";
import { Dumbbell, Home, LineChart, Settings, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { useActiveWorkout } from "@/contexts/active-workout-context";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { activeWorkout } = useActiveWorkout();

  // Only show the resume banner when the user is NOT already on that workout page
  const showResumeBanner =
    activeWorkout !== null &&
    !location.startsWith(`/workouts/${activeWorkout.id}`);

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: Home },
    { label: "Workouts", href: "/workouts", icon: Dumbbell },
    { label: "Progress", href: "/progress", icon: LineChart },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background">
      {/* Desktop Sidebar */}
      <nav className="hidden md:flex w-64 flex-col border-r bg-card fixed h-full z-10 p-4">
        <Link href="/dashboard" className="flex items-center gap-2 mb-8 px-2 cursor-pointer">
          <img src="/logo.svg" alt="Lift Simple" className="w-8 h-8" />
          <span className="font-bold text-xl text-primary">Lift Simple</span>
        </Link>
        <div className="flex flex-col gap-2 flex-1">
          {navItems.map((item) => {
            const isActive = location === item.href || location.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-xl transition-colors text-sm font-medium",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Resume workout banner — desktop sidebar bottom */}
        {showResumeBanner && (
          <Link
            href={`/workouts/${activeWorkout!.id}`}
            className="flex items-center gap-3 px-3 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors mt-2 shadow-sm"
          >
            <Play className="w-4 h-4 fill-current shrink-0" />
            <span className="truncate">Resume: {activeWorkout!.title}</span>
          </Link>
        )}
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 pb-20 md:pb-0 overflow-x-hidden">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b bg-card sticky top-0 z-10">
          <Link href="/dashboard" className="flex items-center gap-2 cursor-pointer">
            <img src="/logo.svg" alt="Lift Simple" className="w-6 h-6" />
            <span className="font-bold text-lg text-primary">Lift Simple</span>
          </Link>
        </header>
        
        <div className="p-4 md:p-8 max-w-3xl mx-auto w-full">
          {children}
        </div>
      </main>

      {/* Resume workout banner — mobile, sits just above bottom nav */}
      {showResumeBanner && (
        <div className="md:hidden fixed bottom-[72px] left-0 right-0 z-20 px-4 pb-1">
          <Link
            href={`/workouts/${activeWorkout!.id}`}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-lg w-full"
          >
            <Play className="w-4 h-4 fill-current shrink-0" />
            <span className="truncate flex-1">Resume: {activeWorkout!.title}</span>
            <span className="text-primary-foreground/70 text-xs font-normal">Tap to return →</span>
          </Link>
        </div>
      )}

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 w-full border-t bg-card flex items-center justify-around p-2 pb-safe z-20 shadow-[0_-4px_16px_rgba(0,0,0,0.05)]">
        {navItems.map((item) => {
          const isActive = location === item.href || location.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors w-16",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-full transition-colors",
                isActive ? "bg-primary/10" : "bg-transparent"
              )}>
                <Icon className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
