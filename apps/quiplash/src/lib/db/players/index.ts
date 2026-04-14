import { db } from '$lib/server/db';
import { playersTable } from '@games/db';
import { eq } from '@games/db/orm';

export async function getPlayerById(playerId: string) {
	const player = await db.query.playersTable.findFirst({
		where: eq(playersTable.id, playerId)
	});

	return player;
}

export async function getPlayersByLobbyId(lobbyId: string) {
	return db.query.playersTable.findMany({
		where: eq(playersTable.lobbyId, lobbyId)
	});
}
