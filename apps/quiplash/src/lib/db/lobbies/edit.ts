import { db } from '$lib/server/db';
import { lobbiesTable } from '@games/db';
import { eq } from '@games/db/orm';
import { getLobbyByRoomCode } from '.';

export async function startGame(roomCode: string) {
	const lobby = await getLobbyByRoomCode(roomCode);
	if (!lobby) throw new Error('Lobby not found');

	const [response] = await db
		.update(lobbiesTable)
		.set({ status: 'in_progress' })
		.where(eq(lobbiesTable.id, lobby.id))
		.returning();

	return response;
}

export async function finishGame(roomCode: string) {
	const lobby = await getLobbyByRoomCode(roomCode);
	if (!lobby) throw new Error('Lobby not found');

	const [response] = await db
		.update(lobbiesTable)
		.set({ status: 'finished', questionsOrder: null, votingEndsAt: null, votingRounds: null })
		.where(eq(lobbiesTable.id, lobby.id))
		.returning();

	return response;
}

export async function saveGameQuestions(roomCode: string, questions: string[]) {
	await db
		.update(lobbiesTable)
		.set({ questionsOrder: JSON.stringify(questions) })
		.where(eq(lobbiesTable.roomCode, roomCode));
}

export async function saveVotingPhase(
	roomCode: string,
	batchRounds: number[],
	currentRound: number,
	endsAt: Date
) {
	await db
		.update(lobbiesTable)
		.set({ votingEndsAt: endsAt, votingRounds: JSON.stringify(batchRounds), votingCurrentRound: currentRound })
		.where(eq(lobbiesTable.roomCode, roomCode));
}

export async function clearVotingPhase(roomCode: string) {
	await db
		.update(lobbiesTable)
		.set({ votingEndsAt: null, votingRounds: null, votingCurrentRound: null })
		.where(eq(lobbiesTable.roomCode, roomCode));
}
