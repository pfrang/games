import { db } from '$lib/server/db';
import { answersTable } from '@games/db';

export async function createAnswer(data: {
	lobbyId: string;
	playerId: string;
	roundNumber: number;
	answer: string;
}) {
	const [answer] = await db.insert(answersTable).values(data).returning();
	return answer;
}
