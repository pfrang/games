import { db } from '$lib/server/db';
import { roundsTable } from '@games/db';
import { eq, desc } from '@games/db/orm';

export async function getCurrentRound(lobbyId: string) {
	return db.query.roundsTable.findFirst({
		where: eq(roundsTable.lobbyId, lobbyId),
		orderBy: [desc(roundsTable.roundNumber)]
	});
}

export async function getRoundsByLobbyId(lobbyId: string) {
	return db.query.roundsTable.findMany({
		where: eq(roundsTable.lobbyId, lobbyId),
		orderBy: [desc(roundsTable.roundNumber)]
	});
}
