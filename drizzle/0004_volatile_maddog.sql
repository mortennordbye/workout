DO $$ BEGIN
  CREATE TYPE "public"."workout_feeling" AS ENUM('Tired', 'OK', 'Good', 'Awesome');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD COLUMN "feeling" "workout_feeling";