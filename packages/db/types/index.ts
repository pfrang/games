import { lobbiesTable, playersTable, questionsTable } from "../src";

export type Player = typeof playersTable.$inferSelect;
export type Lobby = typeof lobbiesTable.$inferSelect;
export type Questions = typeof questionsTable.$inferSelect;
