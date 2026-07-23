import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Dumbbell } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center text-muted-foreground mb-6">
        <Dumbbell className="w-10 h-10" />
      </div>
      <h1 className="text-4xl font-extrabold text-foreground mb-2">404</h1>
      <p className="text-xl text-muted-foreground mb-8">
        We couldn't find that page. Maybe it's resting?
      </p>
      <Button size="lg" className="rounded-xl h-14 font-bold px-8" asChild>
        <Link href="/">Back to Home</Link>
      </Button>
    </div>
  );
}
