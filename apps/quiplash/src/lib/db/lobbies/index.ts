import { db } from '$lib/server/db';
import { lobbiesTable } from '@games/db';
import { eq } from '@games/db/orm';

export async function getLobbyByRoomCode(roomCode: string) {
	return db.query.lobbiesTable.findFirst({
		where: eq(lobbiesTable.roomCode, roomCode)
	});
}

export async function getInProgressLobbies() {
	return db.query.lobbiesTable.findMany({
		where: eq(lobbiesTable.status, 'in_progress')
	});
}
