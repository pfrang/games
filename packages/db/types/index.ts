import { lobbiesTable, playersTable } from "../src";

export type Player = typeof playersTable.$inferSelect;
export type Lobby = typeof lobbiesTable.$inferSelect;
