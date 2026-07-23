import { useGetDashboard } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dumbbell, Plus, Flame, Calendar, Trophy, ChevronRight } from "lucide-react";
import { format, parseISO } from "date-fns";

export default function DashboardPage() {
  const { data: dashboard, isLoading, error } = useGetDashboard();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-destructive">
        <p>Could not load your dashboard. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-extrabold text-foreground mb-2">Welcome back!</h1>
        <p className="text-muted-foreground">Ready to crush your next workout?</p>
      </div>

      <div className="bg-gradient-to-br from-primary to-primary/80 rounded-3xl p-6 text-primary-foreground shadow-lg relative overflow-hidden">
        <div className="absolute -right-6 -top-6 opacity-20">
          <Dumbbell className="w-32 h-32" />
        </div>
        <div className="relative z-10">
          <h2 className="text-xl font-bold mb-1">Let's get lifting</h2>
          <p className="text-primary-foreground/80 mb-6 max-w-[200px]">
            Track your sets, log your progress, and build strength.
          </p>
          <Button size="lg" className="w-full sm:w-auto bg-white text-primary hover:bg-white/90 font-bold rounded-xl h-14" asChild>
            <Link href="/workouts/new">
              <Plus className="mr-2 w-5 h-5" /> Start a Workout
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl p-5 border border-border shadow-sm flex flex-col items-center text-center">
          <div className="w-10 h-10 rounded-full bg-accent/10 text-accent flex items-center justify-center mb-3">
            <Flame className="w-5 h-5" />
          </div>
          <span className="text-2xl font-extrabold text-foreground">{dashboard?.currentStreak || 0}</span>
          <span className="text-sm font-medium text-muted-foreground">Day Streak</span>
        </div>
        <div className="bg-card rounded-2xl p-5 border border-border shadow-sm flex flex-col items-center text-center">
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
            <Calendar className="w-5 h-5" />
          </div>
          <span className="text-2xl font-extrabold text-foreground">{dashboard?.thisWeekWorkouts || 0}</span>
          <span className="text-sm font-medium text-muted-foreground">Workouts this week</span>
        </div>
      </div>

      {dashboard?.recentWorkouts && dashboard.recentWorkouts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">Recent Workouts</h2>
            <Link href="/workouts" className="text-primary text-sm font-medium flex items-center hover:underline">
              See all <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <div className="space-y-3">
            {dashboard.recentWorkouts.slice(0, 3).map((workout) => (
              <Link key={workout.id} href={`/workouts/${workout.id}`}>
                <div className="bg-card rounded-2xl p-4 border border-border shadow-sm hover:border-primary/50 transition-colors flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <Dumbbell className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">{workout.title || "Workout"}</h3>
                      <p className="text-sm text-muted-foreground">{format(parseISO(workout.date), "MMM d, yyyy")}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {dashboard?.topExercises && dashboard.topExercises.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-accent" /> Top PRs
          </h2>
          <div className="grid gap-3">
            {dashboard.topExercises.map((pr) => (
              <div key={pr.exerciseId} className="bg-card rounded-2xl p-4 border border-border shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{(pr as any).exerciseName ?? `Exercise #${pr.exerciseId}`} PR</h3>
                  <p className="text-sm text-muted-foreground">Est. 1RM</p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-lg text-primary">{Math.round(pr.bestOneRepMax || 0)}</span>
                  <span className="text-xs text-muted-foreground ml-1">lbs</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {dashboard?.recentWorkouts?.length === 0 && (
        <div className="bg-secondary/50 rounded-2xl p-8 text-center border border-dashed border-border mt-8">
          <div className="w-16 h-16 mx-auto bg-background rounded-full flex items-center justify-center text-muted-foreground mb-4 shadow-sm">
            <Dumbbell className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-lg mb-2 text-foreground">No workouts yet</h3>
          <p className="text-muted-foreground mb-6">Your fitness journey starts with a single step. Let's log your first workout!</p>
          <Button asChild>
            <Link href="/workouts/new">Start Workout</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
