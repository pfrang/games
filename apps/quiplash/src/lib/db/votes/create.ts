import { db } from '$lib/server/db';
import { votesTable } from '@games/db';

export async function createVote(data: {
	lobbyId: string;
	voterId: string;
	answerId: string;
	roundNumber: number;
}) {
	const [vote] = await db.insert(votesTable).values(data).returning();
	return vote;
}
