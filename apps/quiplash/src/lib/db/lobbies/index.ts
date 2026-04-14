import { db } from '$lib/server/db';
import { lobbiesTable } from '@games/db';
import { eq } from '@games/db/orm';

export async function getLobbyByRoomCode(roomCode: string) {
	const lobby = await db.query.lobbiesTable.findFirst({
		where: eq(lobbiesTable.roomCode, roomCode)
	});

	return lobby;
}
