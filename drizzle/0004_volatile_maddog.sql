CREATE TYPE "public"."workout_feeling" AS ENUM('Tired', 'OK', 'Good', 'Awesome');--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD COLUMN "feeling" "workout_feeling";