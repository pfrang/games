import { db } from '$lib/server/db';
import { answersTable, roundsTable, playersTable } from '@games/db';
import { eq, and } from '@games/db/orm';
import type { GameAnswer } from '$lib/websocket';

export async function getPlayerAnswerForRound(playerId: string, roundNumber: number) {
	return db.query.answersTable.findFirst({
		where: and(eq(answersTable.playerId, playerId), eq(answersTable.roundNumber, roundNumber))
	});
}

export async function getAnswerCountForRound(lobbyId: string, roundNumber: number) {
	const answers = await db.query.answersTable.findMany({
		where: and(eq(answersTable.lobbyId, lobbyId), eq(answersTable.roundNumber, roundNumber))
	});
	return answers.length;
}

export async function getAnswersSummary(lobbyId: string): Promise<GameAnswer[]> {
	const [answers, rounds, players] = await Promise.all([
		db.query.answersTable.findMany({ where: eq(answersTable.lobbyId, lobbyId) }),
		db.query.roundsTable.findMany({ where: eq(roundsTable.lobbyId, lobbyId) }),
		db.query.playersTable.findMany({ where: eq(playersTable.lobbyId, lobbyId) })
	]);

	const roundMap = new Map(rounds.map((r) => [r.roundNumber, r.question]));
	const playerMap = new Map(players.map((p) => [p.id, p.name]));

	return answers
		.map((a) => ({
			playerId: a.playerId,
			playerName: playerMap.get(a.playerId) ?? 'Unknown',
			roundNumber: a.roundNumber,
			question: roundMap.get(a.roundNumber) ?? '',
			answer: a.answer
		}))
		.sort((a, b) => a.roundNumber - b.roundNumber || a.playerName.localeCompare(b.playerName));
}
