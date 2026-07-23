import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Dumbbell, ShieldCheck } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center">
      <header className="w-full max-w-5xl mx-auto p-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="Lift Simple" className="w-8 h-8" />
          <span className="font-bold text-xl text-primary">Lift Simple</span>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" className="font-medium text-foreground" asChild>
            <Link href="/sign-in">Sign In</Link>
          </Button>
          <Button className="font-medium" asChild>
            <Link href="/sign-up">Get Started</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto flex flex-col items-center justify-center p-6 text-center pt-16 md:pt-32">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary font-medium text-sm mb-8">
          <Dumbbell className="w-4 h-4" />
          <span>Strength training for everyone</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold text-foreground tracking-tight max-w-3xl mb-6">
          The friendly way to <span className="text-primary">build strength</span> and confidence.
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed">
          No complex jargon. No overwhelming routines. Just a simple, supportive companion to help you track your weights and see your progress.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-16 w-full sm:w-auto">
          <Button size="lg" className="w-full sm:w-auto text-lg h-14 px-8 shadow-xl hover:scale-105 transition-transform" asChild>
            <Link href="/sign-up">
              Start Your Journey <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl text-left">
          {[
            {
              title: "Simple Logging",
              desc: "Quickly enter your sets, reps, and weights. We handle the math.",
              icon: CheckCircle2
            },
            {
              title: "Built-in History",
              desc: "See exactly what you lifted last time, so you always know your goal.",
              icon: Dumbbell
            },
            {
              title: "Clear Progress",
              desc: "Watch your estimated 1-rep max grow with simple, encouraging charts.",
              icon: ShieldCheck
            }
          ].map((feature, i) => (
            <div key={i} className="bg-card p-6 rounded-2xl border border-border/50 shadow-sm">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-lg text-foreground mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="w-full border-t py-12 mt-20 bg-white">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between text-muted-foreground text-sm">
          <span>&copy; {new Date().getFullYear()} Lift Simple.</span>
          <span>A friendly fitness companion.</span>
        </div>
      </footer>
    </div>
  );
}
