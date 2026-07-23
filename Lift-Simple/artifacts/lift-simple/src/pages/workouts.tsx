import { useListWorkouts } from "@workspace/api-client-react";
import { Link } from "wouter";
import { format, parseISO } from "date-fns";
import { Dumbbell, Plus, ChevronRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function WorkoutsPage() {
  const { data: workouts, isLoading } = useListWorkouts();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-10 rounded-xl" />
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="pb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-extrabold text-foreground">Workouts</h1>
        <Button size="icon" className="rounded-xl shadow-sm" asChild>
          <Link href="/workouts/new">
            <Plus className="w-5 h-5" />
          </Link>
        </Button>
      </div>

      {!workouts || workouts.length === 0 ? (
        <div className="text-center py-16 px-4 bg-card rounded-3xl border border-border shadow-sm">
          <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
            <Dumbbell className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold mb-2 text-foreground">No workouts yet</h2>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
            Ready to start your fitness journey? Your first workout is just a tap away.
          </p>
          <Button size="lg" className="rounded-xl shadow-sm" asChild>
            <Link href="/workouts/new">Start Your First Workout</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {workouts.map((workout) => (
            <Link key={workout.id} href={`/workouts/${workout.id}`}>
              <div className="bg-card rounded-2xl p-5 border border-border shadow-sm hover:border-primary/50 transition-all cursor-pointer group flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${workout.isCompleted ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'}`}>
                    {workout.isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <Dumbbell className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                      {workout.title || "Workout"}
                    </h3>
                    <p className="text-muted-foreground text-sm font-medium">
                      {format(parseISO(workout.date), "EEEE, MMMM d, yyyy")}
                    </p>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-secondary/50 group-hover:bg-primary/10 transition-colors">
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
