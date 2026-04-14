import { pgTable, text, uuid, boolean, timestamp } from "drizzle-orm/pg-core";

export const lobbiesTable = pgTable("lobbies", {
  id: uuid("id").primaryKey().defaultRandom(),
  roomCode: text("room_code").notNull().unique(),
  status: text("status").notNull().default("waiting"), // 'waiting' | 'in_progress' | 'finished'
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
