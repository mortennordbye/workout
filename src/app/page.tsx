/**
 * Home Page - Smart Workout PWA
 *
 * Landing page for the workout tracking application.
 * Provides quick access to start a workout or view history.
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ClockIcon, DumbbellIcon, TrendingUpIcon } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <div className="container max-w-4xl mx-auto py-16 px-4">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold tracking-tight mb-4">
            Smart Workout PWA
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Track your workouts, monitor your progress, and achieve your fitness
            goals with intelligent progress tracking and offline-first design.
          </p>
        </div>

        {/* CTA Button */}
        <div className="flex justify-center mb-16">
          <Link href="/workout">
            <Button size="lg" className="text-lg px-8 py-6">
              <DumbbellIcon className="mr-2 h-5 w-5" />
              Start Workout
            </Button>
          </Link>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="border-2">
            <CardContent className="pt-6 text-center">
              <div className="mb-4 flex justify-center">
                <div className="p-3 rounded-full bg-primary/10">
                  <DumbbellIcon className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h3 className="font-semibold text-lg mb-2">Track Every Rep</h3>
              <p className="text-sm text-muted-foreground">
                Log weight, reps, and RPE for each set with an intuitive
                mobile-first interface
              </p>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardContent className="pt-6 text-center">
              <div className="mb-4 flex justify-center">
                <div className="p-3 rounded-full bg-primary/10">
                  <TrendingUpIcon className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h3 className="font-semibold text-lg mb-2">Monitor Progress</h3>
              <p className="text-sm text-muted-foreground">
                Visualize your gains with workout history and performance trends
              </p>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardContent className="pt-6 text-center">
              <div className="mb-4 flex justify-center">
                <div className="p-3 rounded-full bg-primary/10">
                  <ClockIcon className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h3 className="font-semibold text-lg mb-2">Smart Rest Timer</h3>
              <p className="text-sm text-muted-foreground">
                Auto-starting countdown timer with visual cues helps you stick
                to rest periods
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Coming Soon Features */}
        <div className="mt-16 p-6 bg-muted rounded-lg">
          <h2 className="text-2xl font-bold mb-4 text-center">Coming Soon</h2>
          <ul className="grid md:grid-cols-2 gap-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">•</span>
              <span>Personal Record (PR) detection and celebrations</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">•</span>
              <span>Auto-deload suggestions based on RPE trends</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">•</span>
              <span>Workout templates and training programs</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">•</span>
              <span>Volume tracking and progressive overload</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
