import { useGetCurrentUser, useUpdateUserPlan, getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { useClerk } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { LogOut, User as UserIcon, Sparkles, Moon, Sun } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/contexts/theme-context";

export default function SettingsPage() {
  const { data: user, isLoading } = useGetCurrentUser();
  const updateUserPlan = useUpdateUserPlan();
  const { signOut } = useClerk();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();

  const handleTogglePlan = () => {
    if (!user) return;
    const newPlan = user.plan === "free" ? "premium" : "free";
    updateUserPlan.mutate(
      { data: { plan: newPlan } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
          toast({ title: `Switched to ${newPlan} plan (Demo)` });
        }
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32 mb-6" />
        <Skeleton className="h-24 rounded-3xl" />
        <Skeleton className="h-24 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="pb-8 animate-in fade-in duration-500">
      <h1 className="text-3xl font-extrabold text-foreground mb-8">Settings</h1>

      <div className="space-y-6">
        <div className="bg-card rounded-3xl p-6 border border-border shadow-sm flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <UserIcon className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">{user?.name}</h2>
            <p className="text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <div className="bg-card rounded-3xl p-6 border border-border shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                {theme === "dark" ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-accent" />} Appearance
              </h3>
              <p className="text-sm text-muted-foreground max-w-[200px] mt-1">
                Switch between light and dark mode. Your choice is saved automatically.
              </p>
            </div>
            <Switch
              checked={theme === "dark"}
              onCheckedChange={toggleTheme}
              className="mt-1"
            />
          </div>
        </div>

        <div className="bg-card rounded-3xl p-6 border border-border shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-accent" /> Premium Demo
              </h3>
              <p className="text-sm text-muted-foreground max-w-[200px] mt-1">
                Toggle premium status to preview locked features. No real payment required.
              </p>
            </div>
            <Switch 
              checked={user?.plan === "premium"} 
              onCheckedChange={handleTogglePlan}
              disabled={updateUserPlan.isPending}
              className="mt-1"
            />
          </div>
        </div>

        <Button 
          variant="outline" 
          onClick={() => signOut()}
          className="w-full h-14 rounded-2xl text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20 font-bold"
        >
          <LogOut className="w-5 h-5 mr-2" /> Log out
        </Button>
      </div>
    </div>
  );
}
