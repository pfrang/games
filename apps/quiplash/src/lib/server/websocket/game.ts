import { createRound } from '$lib/db/rounds/create';
import { finishGame } from '$lib/db/lobbies/edit';
import { getAnswersSummary } from '$lib/db/answers';
import { broadcast } from '.';

const ROUND_DURATION_MS = 60_000;
const TOTAL_ROUNDS = 10;
// roomCode → selected questions for the game
const gameQuestions = new Map<string, string[]>();

const gameTimers = new Map<string, ReturnType<typeof setTimeout>>();

export async function scheduleGame(roomCode: string, lobbyId: string, questions: string[]) {
	gameQuestions.set(roomCode, questions);
	await startRound(roomCode, lobbyId, 0);
}

async function startRound(roomCode: string, lobbyId: string, roundNumber: number) {
	const questions = gameQuestions.get(roomCode);
	if (!questions) return;

	const question = questions[roundNumber];
	const endsAt = new Date(Date.now() + ROUND_DURATION_MS);

	await createRound({ lobbyId, roundNumber, question, endsAt });

	broadcast(roomCode, {
		action: 'round_started',
		round: roundNumber,
		question,
		endsAt: endsAt.toISOString()
	});

	console.log(`[game] room ${roomCode} — round ${roundNumber + 1}/${TOTAL_ROUNDS} started`);

	const timer = setTimeout(async () => {
		gameTimers.delete(roomCode);
		const next = roundNumber + 1;
		if (next < TOTAL_ROUNDS) {
			await startRound(roomCode, lobbyId, next);
		} else {
			gameQuestions.delete(roomCode);
			try {
				await finishGame(roomCode);
				const answers = await getAnswersSummary(lobbyId);
				broadcast(roomCode, { action: 'game_finished', answers });
				console.log(`[game] room ${roomCode} — game finished`);
			} catch (e) {
				console.error(`[game] failed to finish game for room ${roomCode}:`, e);
			}
		}
	}, ROUND_DURATION_MS);

	gameTimers.set(roomCode, timer);
}
