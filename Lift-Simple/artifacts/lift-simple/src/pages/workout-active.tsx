import { useState, useRef, useCallback, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import {
  useGetWorkout,
  useListExercises,
  useAddExerciseToWorkout,
  useAddSet,
  useUpdateSet,
  useDeleteSet,
  useCompleteWorkout,
  getGetWorkoutQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Check, Plus, X, Target, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useActiveWorkout } from "@/contexts/active-workout-context";

/** Progressive overload goal based on last workout sets and rep range. */
function getProgressiveGoal(
  lastTimeSets: any[],
  exercise: any,
): { goalReps: number[]; suggestedWeight: number; message: string; increaseWeight: boolean } | null {
  if (!lastTimeSets || lastTimeSets.length === 0) return null;
  const targetRepMax = exercise?.targetRepMax ?? 12;
  const targetRepMin = exercise?.targetRepMin ?? 6;
  const lastWeight = lastTimeSets[0]?.weight ?? 0;
  const allAtTop = lastTimeSets.every((s: any) => s.reps >= targetRepMax);

  if (allAtTop) {
    const inc = exercise?.unit === "kg" ? 2.5 : 5;
    return {
      increaseWeight: true,
      suggestedWeight: lastWeight + inc,
      goalReps: lastTimeSets.map(() => targetRepMin),
      message: `All sets hit ${targetRepMax} reps — try adding ${inc} ${exercise?.unit ?? "lbs"} and aim for ${targetRepMin}+ reps per set.`,
    };
  }
  const goalReps = lastTimeSets.map((s: any) => Math.min(s.reps + 1, targetRepMax));
  return {
    increaseWeight: false,
    suggestedWeight: lastWeight,
    goalReps,
    message: `Aim for ${goalReps.join(", ")} reps — try to add 1 rep compared to last time.`,
  };
}

export default function WorkoutActivePage() {
  const { id } = useParams();
  const workoutId = parseInt(id || "0", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { setActiveWorkout, clearActiveWorkout } = useActiveWorkout();

  const { data: workout, isLoading } = useGetWorkout(workoutId, {
    query: { enabled: !!workoutId, queryKey: getGetWorkoutQueryKey(workoutId) },
  });

  // Register this workout as active so the sidebar can show a "Resume" link
  // when the user navigates away. Clear only when the workout is actually finished.
  useEffect(() => {
    if (workout && !workout.isCompleted) {
      setActiveWorkout(workoutId, workout.title || "Workout");
    }
    if (workout?.isCompleted) {
      clearActiveWorkout();
    }
  }, [workout, workoutId, setActiveWorkout, clearActiveWorkout]);

  const { data: exercises } = useListExercises();
  const addExercise = useAddExerciseToWorkout();
  const completeWorkout = useCompleteWorkout();
  const [exerciseDialogOpen, setExerciseDialogOpen] = useState(false);

  const handleAddExercise = (exerciseId: number) => {
    addExercise.mutate(
      { id: workoutId, data: { exerciseId } },
      {
        onSuccess: () => {
          setExerciseDialogOpen(false);
          queryClient.invalidateQueries({ queryKey: getGetWorkoutQueryKey(workoutId) });
        },
        onError: () => {
          toast({ title: "Error", description: "Could not add exercise", variant: "destructive" });
        },
      },
    );
  };

  const handleFinishWorkout = () => {
    completeWorkout.mutate(
      { id: workoutId },
      {
        onSuccess: (summary) => {
          clearActiveWorkout();
          sessionStorage.setItem("workout_summary", JSON.stringify(summary));
          setLocation(`/workouts/${workoutId}/complete`);
        },
        onError: () => {
          toast({ title: "Error", description: "Could not finish workout", variant: "destructive" });
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  if (!workout) return <div>Workout not found</div>;

  return (
    <div className="pb-24 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8 sticky top-0 bg-background/80 backdrop-blur-md z-10 py-4 -mt-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.history.back()}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-foreground">
              {workout.title || "Workout"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {format(parseISO(workout.date as string), "MMM d, yyyy")}
            </p>
          </div>
        </div>
        {!workout.isCompleted && (
          <Button
            onClick={handleFinishWorkout}
            disabled={completeWorkout.isPending}
            className="rounded-full font-bold shadow-sm"
          >
            <Check className="w-4 h-4 mr-1" /> Finish
          </Button>
        )}
      </div>

      <div className="space-y-8">
        {workout.exercises?.map((we) => (
          <WorkoutExerciseBlock
            key={we.id}
            workoutExercise={we}
            workoutId={workoutId}
            isCompleted={workout.isCompleted}
          />
        ))}

        {!workout.isCompleted && (
          <Dialog open={exerciseDialogOpen} onOpenChange={setExerciseDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full h-16 border-dashed border-2 rounded-2xl text-lg font-semibold text-primary hover:text-primary/80 hover:bg-primary/5"
              >
                <Plus className="w-5 h-5 mr-2" /> Add Exercise
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[80vh] flex flex-col p-0 overflow-hidden sm:rounded-3xl">
              <DialogHeader className="p-6 pb-2 border-b">
                <DialogTitle className="text-xl font-bold">Select Exercise</DialogTitle>
              </DialogHeader>
              <div className="overflow-y-auto p-4 flex-1">
                <div className="space-y-2">
                  {exercises?.map((ex) => (
                    <button
                      key={ex.id}
                      onClick={() => handleAddExercise(ex.id)}
                      className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-secondary transition-colors text-left border border-transparent hover:border-border"
                    >
                      <div>
                        <span className="font-bold block text-foreground">{ex.name}</span>
                        <span className="text-sm text-muted-foreground capitalize">
                          {ex.category.replace("_", " ")}
                        </span>
                      </div>
                      <Plus className="w-5 h-5 text-primary opacity-0 group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}

function WorkoutExerciseBlock({
  workoutExercise: we,
  workoutId,
  isCompleted,
}: {
  workoutExercise: any;
  workoutId: number;
  isCompleted: boolean;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const addSet = useAddSet();
  const updateSet = useUpdateSet();
  const deleteSet = useDeleteSet();

  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const weightRef = useRef<HTMLInputElement>(null);

  const goal = getProgressiveGoal(we.lastTimeSets, we.exercise);

  const handleAddSet = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!weight || !reps) return;

      addSet.mutate(
        { workoutExerciseId: we.id, data: { weight: Number(weight), reps: Number(reps) } },
        {
          onSuccess: () => {
            setReps("");
            // Keep weight filled for next set; focus back to weight field so user
            // can just type the next reps and tap + again
            setTimeout(() => weightRef.current?.focus(), 50);
            queryClient.invalidateQueries({ queryKey: getGetWorkoutQueryKey(workoutId) });
          },
          onError: () =>
            toast({ title: "Error", description: "Failed to add set", variant: "destructive" }),
        },
      );
    },
    [we.id, weight, reps, workoutId, addSet, queryClient, toast],
  );

  const handleToggleComplete = (setId: number, current: boolean) => {
    updateSet.mutate(
      { id: setId, data: { isCompleted: !current } },
      {
        onSuccess: () =>
          queryClient.invalidateQueries({ queryKey: getGetWorkoutQueryKey(workoutId) }),
      },
    );
  };

  const handleDeleteSet = (setId: number) => {
    deleteSet.mutate(
      { id: setId },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetWorkoutQueryKey(workoutId) }) },
    );
  };

  return (
    <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
      {/* Exercise header */}
      <div className="p-4 md:p-6 border-b border-border/50 bg-secondary/30">
        <h2 className="text-xl font-extrabold text-foreground">{we.exercise.name}</h2>

        {/* Last time */}
        {we.lastTimeSets?.length > 0 && (
          <p className="text-sm text-muted-foreground mt-1">
            Last time:{" "}
            {we.lastTimeSets.map((s: any) => `${s.weight}×${s.reps}`).join(", ")}
          </p>
        )}

        {/* Progressive overload goal */}
        {!isCompleted && goal && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-primary/8 border border-primary/20 px-3 py-2">
            <TrendingUp className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="text-sm">
              <span className="font-semibold text-primary">Next workout goal: </span>
              {goal.increaseWeight ? (
                <span className="text-foreground">
                  {goal.suggestedWeight} {we.exercise.unit} — aim for{" "}
                  {goal.goalReps.join(", ")} reps
                </span>
              ) : (
                <span className="text-foreground">
                  Aim for{" "}
                  <strong>{goal.goalReps.join(", ")}</strong> reps at {goal.suggestedWeight}{" "}
                  {we.exercise.unit}
                </span>
              )}
              <p className="text-muted-foreground text-xs mt-0.5">{goal.message}</p>
            </div>
          </div>
        )}

        {/* First time hint */}
        {!isCompleted && !goal && we.lastTimeSets?.length === 0 && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-accent/10 border border-accent/20 px-3 py-2">
            <Target className="w-4 h-4 text-accent shrink-0" />
            <p className="text-sm text-muted-foreground">
              First time doing this exercise — start light and focus on good form.
            </p>
          </div>
        )}
      </div>

      {/* Sets list */}
      <div className="p-4 md:p-6 space-y-3">
        {/* Column header */}
        {we.sets?.length > 0 && (
          <div className="flex items-center gap-4 px-1 mb-1">
            <div className="w-8 shrink-0" />
            <div className="flex-1 grid grid-cols-2 gap-4 text-center">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Weight
              </span>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Reps
              </span>
            </div>
            <div className="w-20 shrink-0" />
          </div>
        )}

        {we.sets?.map((set: any, index: number) => {
          const done = set.isCompleted ?? false;
          return (
            <div
              key={set.id}
              className={`flex items-center gap-4 rounded-2xl p-3 transition-colors ${
                done ? "bg-primary/10 border border-primary/20" : "bg-secondary/50"
              }`}
            >
              {/* Set number */}
              <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center font-bold text-sm text-muted-foreground shrink-0 border border-border">
                {index + 1}
              </div>

              {/* Weight + reps */}
              <div className="flex-1 grid grid-cols-2 gap-4 text-center">
                <div className={`font-bold text-lg ${done ? "text-primary" : ""}`}>
                  {set.weight}{" "}
                  <span className="text-xs text-muted-foreground font-normal">
                    {we.exercise.unit}
                  </span>
                </div>
                <div className={`font-bold text-lg ${done ? "text-primary" : ""}`}>
                  {set.reps}{" "}
                  <span className="text-xs text-muted-foreground font-normal">reps</span>
                </div>
              </div>

              {/* Actions */}
              <div className="shrink-0 flex items-center gap-1">
                {!isCompleted && (
                  <>
                    {/* Completion checkbox */}
                    <button
                      onClick={() => handleToggleComplete(set.id, done)}
                      aria-label={done ? "Mark set incomplete" : "Mark set complete"}
                      className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors border-2 ${
                        done
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-border bg-background text-transparent hover:border-primary/60"
                      }`}
                    >
                      <Check className="w-4 h-4" />
                    </button>

                    {/* Delete */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteSet(set.id)}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 w-8 rounded-full"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                )}
                {isCompleted && done && (
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Add set form */}
        {!isCompleted && (
          <>
            <form onSubmit={handleAddSet} className="flex items-center gap-2 md:gap-4 mt-4">
              <div className="w-8 shrink-0" />
              <div className="flex-1 grid grid-cols-2 gap-2 md:gap-4">
                <Input
                  ref={weightRef}
                  type="number"
                  inputMode="decimal"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder={goal ? `${goal.suggestedWeight} ${we.exercise.unit}` : "Weight"}
                  className="h-12 rounded-xl text-center font-bold text-lg bg-background placeholder:text-muted-foreground placeholder:opacity-60 placeholder:font-normal"
                />
                <Input
                  type="number"
                  inputMode="numeric"
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  placeholder={goal ? `${goal.goalReps[we.sets?.length ?? 0] ?? goal.goalReps[goal.goalReps.length - 1]} reps` : "Reps"}
                  className="h-12 rounded-xl text-center font-bold text-lg bg-background placeholder:text-muted-foreground placeholder:opacity-60 placeholder:font-normal"
                />
              </div>
              <Button
                type="submit"
                size="icon"
                disabled={addSet.isPending || !weight || !reps}
                className="h-12 w-12 rounded-xl shrink-0"
              >
                <Plus className="w-5 h-5" />
              </Button>
            </form>
            <p className="text-xs text-muted-foreground text-center pb-1">
              Tap <strong>+</strong> to log a set — keep tapping to add more sets
            </p>
          </>
        )}
      </div>
    </div>
  );
}
