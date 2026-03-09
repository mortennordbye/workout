"use client";

/**
 * Rest Timer Component
 *
 * An auto-starting countdown timer for rest periods between sets.
 * Provides visual feedback with color changes and progress indication.
 *
 * Features:
 * - Auto-starts when mounted (triggered after logging a set)
 * - Pause/Resume controls
 * - Visual warning when < 10 seconds remain (red color)
 * - Progress bar for quick visual reference
 * - Formatted MM:SS display
 * - Optional completion callback
 *
 * Usage:
 * ```typescript
 * <RestTimer
 *   durationSeconds={90}
 *   onComplete={() => console.log("Rest complete!")}
 * />
 * ```
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PauseIcon, PlayIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface RestTimerProps {
  durationSeconds: number;
  onComplete?: () => void;
  onDismiss?: () => void;
}

export function RestTimer({
  durationSeconds,
  onComplete,
  onDismiss,
}: RestTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(durationSeconds);
  const [isRunning, setIsRunning] = useState(true); // Auto-start
  const [isComplete, setIsComplete] = useState(false);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Calculate progress percentage
  const progressPercentage =
    ((durationSeconds - timeRemaining) / durationSeconds) * 100;

  // Determine if in warning zone (< 10 seconds)
  const isWarningZone = timeRemaining > 0 && timeRemaining <= 10;

  // Timer effect
  useEffect(() => {
    if (!isRunning || isComplete) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsComplete(true);
          setIsRunning(false);
          onComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, isComplete, onComplete]);

  const handleTogglePause = useCallback(() => {
    setIsRunning((prev) => !prev);
  }, []);

  const handleDismiss = useCallback(() => {
    onDismiss?.();
  }, [onDismiss]);

  return (
    <Card
      className={`
        border-2 transition-all duration-300
        ${isComplete ? "border-green-500 bg-green-50 dark:bg-green-950" : ""}
        ${isWarningZone ? "border-red-500 bg-red-50 dark:bg-red-950" : ""}
        ${!isComplete && !isWarningZone ? "border-blue-500 bg-blue-50 dark:bg-blue-950" : ""}
      `}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            {isComplete ? "Rest Complete!" : "Rest Timer"}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="h-8 w-8"
            aria-label="Dismiss timer"
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Timer Display */}
        <div
          className={`
            text-center text-5xl font-bold tabular-nums
            transition-colors duration-300
            ${isComplete ? "text-green-600 dark:text-green-400" : ""}
            ${isWarningZone ? "text-red-600 dark:text-red-400 animate-pulse" : ""}
            ${!isComplete && !isWarningZone ? "text-blue-600 dark:text-blue-400" : ""}
          `}
        >
          {formatTime(timeRemaining)}
        </div>

        {/* Progress Bar */}
        <Progress
          value={progressPercentage}
          className={`
            h-3
            ${isComplete ? "[&>div]:bg-green-500" : ""}
            ${isWarningZone ? "[&>div]:bg-red-500" : ""}
            ${!isComplete && !isWarningZone ? "[&>div]:bg-blue-500" : ""}
          `}
        />

        {/* Control Buttons */}
        {!isComplete && (
          <div className="flex justify-center gap-2">
            <Button
              onClick={handleTogglePause}
              variant="outline"
              size="lg"
              className="min-w-[120px]"
            >
              {isRunning ? (
                <>
                  <PauseIcon className="mr-2 h-4 w-4" />
                  Pause
                </>
              ) : (
                <>
                  <PlayIcon className="mr-2 h-4 w-4" />
                  Resume
                </>
              )}
            </Button>
          </div>
        )}

        {/* Completion Message */}
        {isComplete && (
          <p className="text-center text-sm text-muted-foreground">
            Ready for your next set!
          </p>
        )}

        {/* Time Remaining Text (for screen readers) */}
        <span className="sr-only" aria-live="polite" aria-atomic="true">
          {timeRemaining} seconds remaining
        </span>
      </CardContent>
    </Card>
  );
}
