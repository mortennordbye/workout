CREATE TABLE "training_cycle_slots" (
	"id" serial PRIMARY KEY NOT NULL,
	"training_cycle_id" integer NOT NULL,
	"day_of_week" integer,
	"order_index" integer,
	"label" text,
	"program_id" integer,
	"notes" text,
	CONSTRAINT "uniq_cycle_day" UNIQUE("training_cycle_id","day_of_week"),
	CONSTRAINT "uniq_cycle_order" UNIQUE("training_cycle_id","order_index")
);
--> statement-breakpoint
CREATE TABLE "training_cycles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"duration_weeks" integer NOT NULL,
	"schedule_type" text DEFAULT 'day_of_week' NOT NULL,
	"start_date" date,
	"status" text DEFAULT 'draft' NOT NULL,
	"end_action" text DEFAULT 'none' NOT NULL,
	"end_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "body_area" text;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "muscle_group" text;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "equipment" text;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "movement_pattern" text;--> statement-breakpoint
ALTER TABLE "training_cycle_slots" ADD CONSTRAINT "training_cycle_slots_training_cycle_id_training_cycles_id_fk" FOREIGN KEY ("training_cycle_id") REFERENCES "public"."training_cycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_cycle_slots" ADD CONSTRAINT "training_cycle_slots_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_cycles" ADD CONSTRAINT "training_cycles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;