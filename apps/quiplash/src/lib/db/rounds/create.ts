import { db } from '$lib/server/db';
import { roundsTable } from '@games/db';

export async function createRound(data: {
	lobbyId: string;
	roundNumber: number;
	question: string;
	endsAt: Date;
}) {
	const [round] = await db.insert(roundsTable).values(data).returning();
	return round;
}
