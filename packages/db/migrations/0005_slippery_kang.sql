ALTER TABLE "lobbies" ADD COLUMN "questions_order" text;--> statement-breakpoint
ALTER TABLE "lobbies" ADD COLUMN "voting_ends_at" timestamp;--> statement-breakpoint
ALTER TABLE "lobbies" ADD COLUMN "voting_rounds" text;