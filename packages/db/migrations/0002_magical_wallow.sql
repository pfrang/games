CREATE TYPE "public"."lobby_status" AS ENUM('waiting', 'in_progress', 'finished');--> statement-breakpoint
ALTER TABLE "lobbies" ALTER COLUMN "status" SET DEFAULT 'waiting'::"public"."lobby_status";--> statement-breakpoint
ALTER TABLE "lobbies" ALTER COLUMN "status" SET DATA TYPE "public"."lobby_status" USING "status"::"public"."lobby_status";