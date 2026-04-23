import { lobbiesTable, playersTable, questionsTable, roundsTable, answersTable } from "../src";

export type Player = typeof playersTable.$inferSelect;
export type Lobby = typeof lobbiesTable.$inferSelect;
export type Questions = typeof questionsTable.$inferSelect;
export type Round = typeof roundsTable.$inferSelect;
export type Answer = typeof answersTable.$inferSelect;
