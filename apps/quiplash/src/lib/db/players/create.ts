import { playersTable } from '@games/db';
import { db } from '$lib/server/db';

export async function createPlayer(lobbyId: string, playerName: string, isHost: boolean = false) {
	const [player] = await db
		.insert(playersTable)
		.values({
			lobbyId,
			name: playerName,
			isHost
		})
		.returning();

	return player;
}
