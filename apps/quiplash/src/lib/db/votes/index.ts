import { db } from '$lib/server/db';
import { votesTable, answersTable, playersTable } from '@games/db';
import { eq, and, inArray } from '@games/db/orm';
import type { ScoreboardEntry } from '$lib/websocket';

export async function getVoteForPlayerRound(voterId: string, lobbyId: string, roundNumber: number) {
	return db.query.votesTable.findFirst({
		where: and(
			eq(votesTable.voterId, voterId),
			eq(votesTable.lobbyId, lobbyId),
			eq(votesTable.roundNumber, roundNumber)
		)
	});
}

export async function getVoteCountForRound(lobbyId: string, roundNumber: number) {
	const votes = await db.query.votesTable.findMany({
		where: and(eq(votesTable.lobbyId, lobbyId), eq(votesTable.roundNumber, roundNumber))
	});
	return votes.length;
}

export async function getVotesForBatch(lobbyId: string, roundNumbers: number[]) {
	return db.query.votesTable.findMany({
		where: and(eq(votesTable.lobbyId, lobbyId), inArray(votesTable.roundNumber, roundNumbers))
	});
}

export async function getScoreboard(lobbyId: string): Promise<ScoreboardEntry[]> {
	const [votes, players, answers] = await Promise.all([
		db.query.votesTable.findMany({ where: eq(votesTable.lobbyId, lobbyId) }),
		db.query.playersTable.findMany({ where: eq(playersTable.lobbyId, lobbyId) }),
		db.query.answersTable.findMany({ where: eq(answersTable.lobbyId, lobbyId) })
	]);

	const answerPlayerMap = new Map(answers.map((a) => [a.id, a.playerId]));

	const voteCounts = new Map<string, number>(players.map((p) => [p.id, 0]));
	for (const vote of votes) {
		const authorId = answerPlayerMap.get(vote.answerId);
		if (authorId) voteCounts.set(authorId, (voteCounts.get(authorId) ?? 0) + 1);
	}

	return players
		.map((p) => ({
			playerId: p.id,
			playerName: p.name,
			totalVotes: voteCounts.get(p.id) ?? 0
		}))
		.sort((a, b) => b.totalVotes - a.totalVotes);
}
