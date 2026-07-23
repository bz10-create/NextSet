import { useState } from "react";
import { useGetProgress, useGetCurrentUser } from "@workspace/api-client-react";
import { Link } from "wouter";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Lock, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format, parseISO } from "date-fns";

export default function ProgressPage() {
  const [range, setRange] = useState<any>("month");
  const { data, isLoading } = useGetProgress({ range });
  const { data: user } = useGetCurrentUser();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32 mb-6" />
        <Skeleton className="h-[300px] rounded-3xl" />
        <Skeleton className="h-[300px] rounded-3xl" />
      </div>
    );
  }

  const TrendIcon = ({ trend }: { trend?: string | null }) => {
    if (trend === 'up') return <TrendingUp className="w-5 h-5 text-primary" />;
    if (trend === 'down') return <TrendingDown className="w-5 h-5 text-destructive" />;
    return <Minus className="w-5 h-5 text-muted-foreground" />;
  };

  return (
    <div className="pb-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-extrabold text-foreground">Progress</h1>
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-[140px] rounded-xl h-10 bg-card border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Past Week</SelectItem>
            <SelectItem value="month">Past Month</SelectItem>
            <SelectItem value="three_months">3 Months</SelectItem>
            <SelectItem value="year">Past Year</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!data?.exercises || data.exercises.length === 0 ? (
        <div className="bg-card rounded-3xl p-8 text-center border border-border shadow-sm">
          <p className="text-muted-foreground">Not enough data to show progress yet. Keep lifting!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {data.exercises.map((ex) => (
            <div key={ex.exerciseId} className="bg-card border border-border shadow-sm rounded-3xl p-6 relative overflow-hidden">
              {ex.isPremiumLocked && user?.plan === "free" && (
                <div className="absolute inset-0 bg-background/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-center p-6">
                  <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center text-accent mb-4">
                    <Lock className="w-8 h-8" />
                  </div>
                  <h3 className="font-bold text-xl mb-2 text-foreground">Premium Feature</h3>
                  <p className="text-muted-foreground mb-6 max-w-xs">
                    Viewing progress beyond the past week is a premium feature. 
                  </p>
                  <Button className="rounded-xl font-bold" asChild>
                    <Link href="/settings">Try Demo in Settings</Link>
                  </Button>
                </div>
              )}

              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-extrabold text-foreground">{ex.exerciseName}</h2>
                  <p className="text-sm text-muted-foreground">Estimated 1RM</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="font-bold text-2xl text-foreground">{Math.round(ex.bestOneRepMax || 0)}</span>
                    <span className="text-sm text-muted-foreground ml-1">lbs</span>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                    <TrendIcon trend={ex.trend} />
                  </div>
                </div>
              </div>

              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={ex.dataPoints}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(val) => format(parseISO(val), "MMM d")}
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      dy={10}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      dx={-10}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                      labelFormatter={(val) => format(parseISO(val), "MMM d, yyyy")}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: "hsl(var(--primary))", strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
