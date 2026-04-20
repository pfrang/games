import {
  pgTable,
  text,
  uuid,
  boolean,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";

export const lobbyStatusEnum = pgEnum("lobby_status", [
  "waiting",
  "in_progress",
  "finished",
]);

export const lobbiesTable = pgTable("lobbies", {
  id: uuid("id").primaryKey().defaultRandom(),
  roomCode: text("room_code").notNull().unique(),
  status: lobbyStatusEnum("status").notNull().default("waiting"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const playersTable = pgTable("players", {
  id: uuid("id").primaryKey().defaultRandom(),
  lobbyId: uuid("lobby_id")
    .notNull()
    .references(() => lobbiesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  isHost: boolean("is_host").notNull().default(false),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});

export const questionsTable = pgTable("questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  questions: text("questions").notNull(),
});
