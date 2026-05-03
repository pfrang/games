import {
  pgTable,
  text,
  uuid,
  boolean,
  timestamp,
  pgEnum,
  integer,
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

export const roundsTable = pgTable("rounds", {
  id: uuid("id").primaryKey().defaultRandom(),
  lobbyId: uuid("lobby_id")
    .notNull()
    .references(() => lobbiesTable.id, { onDelete: "cascade" }),
  roundNumber: integer("round_number").notNull(),
  question: text("question").notNull(),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  endsAt: timestamp("ends_at").notNull(),
});

export const answersTable = pgTable("answers", {
  id: uuid("id").primaryKey().defaultRandom(),
  lobbyId: uuid("lobby_id")
    .notNull()
    .references(() => lobbiesTable.id, { onDelete: "cascade" }),
  playerId: uuid("player_id")
    .notNull()
    .references(() => playersTable.id, { onDelete: "cascade" }),
  roundNumber: integer("round_number").notNull(),
  answer: text("answer").notNull(),
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
});

export const votesTable = pgTable("votes", {
  id: uuid("id").primaryKey().defaultRandom(),
  lobbyId: uuid("lobby_id")
    .notNull()
    .references(() => lobbiesTable.id, { onDelete: "cascade" }),
  voterId: uuid("voter_id")
    .notNull()
    .references(() => playersTable.id, { onDelete: "cascade" }),
  answerId: uuid("answer_id")
    .notNull()
    .references(() => answersTable.id, { onDelete: "cascade" }),
  roundNumber: integer("round_number").notNull(),
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
});
