import { createRound } from '$lib/db/rounds/create';
import { finishGame } from '$lib/db/lobbies/edit';
import { getAnswersSummary, getAnswersForVoting } from '$lib/db/answers';
import { getVotesForBatch, getScoreboard } from '$lib/db/votes';
import { broadcast } from '.';
import type { VotingAnswer, VoteTally } from '$lib/websocket';

export const ROUND_DURATION_MS = 60_000;
export const TOTAL_ROUNDS = 10;
export const ROUNDS_PER_VOTING_BATCH = 3;

interface VotingBatch {
	roundNumbers: number[];
	endsAt: Date;
	timer: ReturnType<typeof setTimeout>;
	answers: VotingAnswer[];
}

// roomCode → shuffled question list for the game
const gameQuestions = new Map<string, string[]>();
// roomCode → active voting batch
const votingBatches = new Map<string, VotingBatch>();

export function getVotingBatch(roomCode: string) {
	return votingBatches.get(roomCode) ?? null;
}

export function isVotingActive(roomCode: string) {
	return votingBatches.has(roomCode);
}

export async function scheduleGame(roomCode: string, lobbyId: string, questions: string[]) {
	gameQuestions.set(roomCode, questions);
	await startRound(roomCode, lobbyId, 0);
}

export async function startRound(roomCode: string, lobbyId: string, roundNumber: number) {
	const questions = gameQuestions.get(roomCode);
	if (!questions) return;

	const question = questions[roundNumber];
	const endsAt = new Date(Date.now() + ROUND_DURATION_MS);

	await createRound({ lobbyId, roundNumber, question, endsAt });

	broadcast(roomCode, {
		action: 'round_started',
		round: roundNumber,
		question,
		endsAt: endsAt.toISOString(),
		totalRounds: TOTAL_ROUNDS
	});

	console.log(`[game] room ${roomCode} — round ${roundNumber + 1}/${TOTAL_ROUNDS} started`);
}

export async function startVoting(roomCode: string, lobbyId: string, roundNumbers: number[]) {
	const endsAt = new Date(Date.now() + ROUND_DURATION_MS);
	const answers = await getAnswersForVoting(lobbyId, roundNumbers);

	const timer = setTimeout(async () => {
		await endVoting(roomCode, lobbyId);
	}, ROUND_DURATION_MS);

	votingBatches.set(roomCode, { roundNumbers, endsAt, timer, answers });

	broadcast(roomCode, {
		action: 'voting_started',
		rounds: roundNumbers,
		answers,
		endsAt: endsAt.toISOString()
	});

	console.log(`[game] room ${roomCode} — voting started for rounds [${roundNumbers.join(', ')}]`);
}

export async function endVoting(roomCode: string, lobbyId: string) {
	const batch = votingBatches.get(roomCode);
	if (!batch) return;

	clearTimeout(batch.timer);
	votingBatches.delete(roomCode);

	const votes = await getVotesForBatch(lobbyId, batch.roundNumbers);

	const tallyMap = new Map<string, VoteTally>();
	for (const a of batch.answers) {
		tallyMap.set(a.answerId, {
			answerId: a.answerId,
			playerId: a.playerId,
			playerName: a.playerName,
			voteCount: 0
		});
	}
	for (const vote of votes) {
		const tally = tallyMap.get(vote.answerId);
		if (tally) tally.voteCount++;
	}

	broadcast(roomCode, {
		action: 'voting_finished',
		tallies: [...tallyMap.values()]
	});

	const lastRound = Math.max(...batch.roundNumbers);
	const nextRound = lastRound + 1;

	if (nextRound < TOTAL_ROUNDS) {
		await startRound(roomCode, lobbyId, nextRound);
	} else {
		await endGame(roomCode, lobbyId);
	}

	console.log(`[game] room ${roomCode} — voting ended for rounds [${batch.roundNumbers.join(', ')}]`);
}

export async function endGame(roomCode: string, lobbyId: string) {
	gameQuestions.delete(roomCode);
	await finishGame(roomCode);
	const [answers, scoreboard] = await Promise.all([
		getAnswersSummary(lobbyId),
		getScoreboard(lobbyId)
	]);
	broadcast(roomCode, { action: 'game_finished', answers, scoreboard });
	console.log(`[game] room ${roomCode} — game finished`);
}
