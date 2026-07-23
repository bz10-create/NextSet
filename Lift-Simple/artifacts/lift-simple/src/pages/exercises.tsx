import { useState } from "react";
import { useListExercises, useCreateExercise, useDeleteExercise, getListExercisesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dumbbell, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = ["lower_body", "upper_body", "back", "shoulders", "arms", "core", "full_body"] as const;
const MOVEMENT_TYPES = ["upper_body", "lower_body"] as const;

export default function ExercisesPage() {
  const { data: exercises, isLoading } = useListExercises();
  const [createOpen, setCreateOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const createExercise = useCreateExercise();
  const deleteExercise = useDeleteExercise();

  const [name, setName] = useState("");
  const [category, setCategory] = useState<any>("full_body");
  const [movementType, setMovementType] = useState<string>("upper_body");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createExercise.mutate(
      { data: { name, category, unit: "lbs", movementType } },
      {
        onSuccess: () => {
          setCreateOpen(false);
          setName("");
          setCategory("full_body");
          setMovementType("upper_body");
          queryClient.invalidateQueries({ queryKey: getListExercisesQueryKey() });
          toast({ title: "Exercise created" });
        },
        onError: () => toast({ title: "Failed to create", variant: "destructive" })
      }
    );
  };

  const handleDelete = (id: number) => {
    if (!confirm("Are you sure?")) return;
    deleteExercise.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListExercisesQueryKey() });
          toast({ title: "Exercise deleted" });
        }
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40 mb-6" />
        {[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="pb-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-extrabold text-foreground">Exercises</h1>
        
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="icon" className="rounded-xl shadow-sm"><Plus className="w-5 h-5" /></Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">New Exercise</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-6 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Name</label>
                <Input value={name} onChange={e => setName(e.target.value)} required className="h-12 rounded-xl" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Category</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c} value={c} className="capitalize">{c.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Movement Type</label>
                <Select value={movementType} onValueChange={setMovementType}>
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MOVEMENT_TYPES.map(m => (
                      <SelectItem key={m} value={m} className="capitalize">{m.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full h-12 text-lg rounded-xl font-bold" disabled={createExercise.isPending || !name}>
                Create Exercise
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {exercises?.map(ex => (
          <div key={ex.id} className="bg-card border border-border shadow-sm rounded-2xl p-4 flex items-center justify-between group hover:border-primary/50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                <Dumbbell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">{ex.name}</h3>
                <p className="text-xs text-muted-foreground capitalize">{ex.category.replace('_', ' ')} • {ex.isCustom ? "Custom" : "Library"}</p>
              </div>
            </div>
            {ex.isCustom && (
              <Button variant="ghost" size="icon" onClick={() => handleDelete(ex.id)} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
