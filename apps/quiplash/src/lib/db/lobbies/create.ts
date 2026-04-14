import { db } from '$lib/server/db';
import { lobbiesTable } from '@games/db';
import { eq } from '@games/db/orm';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L

function generateCode(): string {
	return Array.from(crypto.getRandomValues(new Uint8Array(6)))
		.map((b) => CHARS[b % CHARS.length])
		.join('');
}

export async function createLobby() {
	let code: string;
	let existing: unknown;

	do {
		code = generateCode();
		existing = await db.query.lobbiesTable.findFirst({
			where: eq(lobbiesTable.roomCode, code)
		});
	} while (existing);

	const [lobby] = await db
		.insert(lobbiesTable)
		.values({ roomCode: code, status: 'waiting', createdAt: new Date() })
		.returning();

	return lobby;
}
