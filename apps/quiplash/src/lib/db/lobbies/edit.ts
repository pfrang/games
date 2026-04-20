import { db } from '$lib/server/db';
import { lobbiesTable } from '@games/db';
import { eq } from '@games/db/orm';
import { getLobbyByRoomCode } from '.';

export async function startGame(roomCode: string) {
	const lobby = await getLobbyByRoomCode(roomCode);
	if (!lobby) {
		throw new Error('Lobby not found');
	}

	const [response] = await db
		.update(lobbiesTable)
		.set({ status: 'in_progress' })
		.where(eq(lobbiesTable.id, lobby.id))
		.returning();

	return response;
}
