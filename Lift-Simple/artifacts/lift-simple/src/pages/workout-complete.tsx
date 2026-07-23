import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Trophy, ArrowRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WorkoutCompletePage() {
  const [, setLocation] = useLocation();
  const summaryJson = sessionStorage.getItem("workout_summary");
  
  useEffect(() => {
    if (!summaryJson) {
      setLocation("/dashboard");
    }
  }, [summaryJson, setLocation]);

  if (!summaryJson) return null;

  const summary = JSON.parse(summaryJson);

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center animate-in zoom-in-95 fade-in duration-700">
      <div className="w-24 h-24 bg-accent/20 rounded-full flex items-center justify-center text-accent mb-6 shadow-[0_0_40px_rgba(251,191,36,0.3)]">
        <Trophy className="w-12 h-12" />
      </div>
      
      <h1 className="text-4xl font-extrabold text-foreground tracking-tight mb-4">
        Workout Complete!
      </h1>
      
      <p className="text-xl text-muted-foreground max-w-md mb-8">
        {summary.message}
      </p>

      {summary.highlights && summary.highlights.length > 0 && (
        <div className="bg-card border border-border shadow-sm rounded-3xl p-6 w-full max-w-sm mb-8 text-left">
          <h3 className="font-bold text-lg mb-4 text-foreground">Highlights</h3>
          <ul className="space-y-3">
            {summary.highlights.map((h: string, i: number) => (
              <li key={i} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <ArrowRight className="w-4 h-4" />
                </div>
                <span className="text-foreground font-medium">{h}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
        <Button size="lg" className="w-full h-14 text-lg font-bold rounded-xl" asChild>
          <Link href="/dashboard">
            <Home className="w-5 h-5 mr-2" /> Back to Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
