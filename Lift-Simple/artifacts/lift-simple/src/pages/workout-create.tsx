import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateWorkout } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Dumbbell } from "lucide-react";

export default function WorkoutCreatePage() {
  const [, setLocation] = useLocation();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  
  const createWorkout = useCreateWorkout();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createWorkout.mutate(
      { data: { title: title.trim() || undefined, date } },
      {
        onSuccess: (workout) => {
          setLocation(`/workouts/${workout.id}`);
        },
      }
    );
  };

  return (
    <div className="max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-extrabold text-foreground">New Workout</h1>
      </div>

      <div className="bg-card rounded-3xl p-6 md:p-8 border border-border shadow-sm">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6">
          <Dumbbell className="w-8 h-8" />
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="date" className="text-base font-semibold text-foreground">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="h-14 rounded-xl text-lg px-4"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title" className="text-base font-semibold text-foreground">Title (Optional)</Label>
            <Input
              id="title"
              placeholder="e.g. Upper Body Focus"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-14 rounded-xl text-lg px-4"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full h-14 text-lg font-bold rounded-xl shadow-md"
            disabled={createWorkout.isPending}
          >
            {createWorkout.isPending ? "Starting..." : "Start Workout"}
          </Button>
        </form>
      </div>
    </div>
  );
}
