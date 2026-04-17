CREATE TABLE "ai_model_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"model_id" text NOT NULL,
	"label" text NOT NULL,
	"enabled" boolean NOT NULL DEFAULT true,
	"priority" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ai_model_configs_model_id_unique" UNIQUE("model_id")
);
--> statement-breakpoint
INSERT INTO "ai_model_configs" ("model_id", "label", "enabled", "priority") VALUES
  ('google/gemini-2.0-flash-exp:free', 'Gemini 2.0 Flash (free)', true, 1),
  ('deepseek/deepseek-chat-v3-0324:free', 'DeepSeek V3 (free)', true, 2),
  ('meta-llama/llama-3.3-70b-instruct:free', 'Llama 3.3 70B (free)', true, 3);
