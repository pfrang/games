import { createRound } from '$lib/db/rounds/create';
import { finishGame } from '$lib/db/lobbies/edit';
import { getAnswersSummary } from '$lib/db/answers';
import { broadcast } from '.';

export const ROUND_DURATION_MS = 60_000;
export const TOTAL_ROUNDS = 10;

// roomCode → shuffled question list for the game
const gameQuestions = new Map<string, string[]>();

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

export async function endGame(roomCode: string, lobbyId: string) {
	gameQuestions.delete(roomCode);
	await finishGame(roomCode);
	const answers = await getAnswersSummary(lobbyId);
	broadcast(roomCode, { action: 'game_finished', answers });
	console.log(`[game] room ${roomCode} — game finished`);
}
