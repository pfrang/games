import { createRound } from '$lib/db/rounds/create';
import { getCurrentRound } from '$lib/db/rounds';
import { finishGame, saveGameQuestions, saveVotingPhase, clearVotingPhase } from '$lib/db/lobbies/edit';
import { getLobbyByRoomCode, getInProgressLobbies } from '$lib/db/lobbies';
import { getAnswersSummary, getAnswersForVoting } from '$lib/db/answers';
import { getVotesForBatch, getVoteCountForRound, getScoreboard } from '$lib/db/votes';
import { getPlayersByLobbyId } from '$lib/db/players';
import { broadcast } from '.';
import type { VoteTally } from '$lib/websocket';

export const ROUND_DURATION_MS = 60_000;
export const VOTE_DURATION_MS = 20_000;
export const RESULTS_DURATION_MS = 5_000;
export const TOTAL_ROUNDS = 10;
export const ROUNDS_PER_VOTING_BATCH = 3;

const roundTimers = new Map<string, ReturnType<typeof setTimeout>>();
const votingQuestionTimers = new Map<string, ReturnType<typeof setTimeout>>();
const votingResultsTimers = new Map<string, ReturnType<typeof setTimeout>>();

// In-memory batch state for early-advance logic
const votingBatchState = new Map<string, { batchRounds: number[]; questionIndex: number }>();

export function isVotingActive(roomCode: string) {
	return (
		votingQuestionTimers.has(roomCode) ||
		votingResultsTimers.has(roomCode) ||
		votingBatchState.has(roomCode)
	);
}

export async function getVotingBatch(roomCode: string) {
	const lobby = await getLobbyByRoomCode(roomCode);
	if (!lobby?.votingRounds || lobby.votingCurrentRound == null) return null;

	const batchRounds = JSON.parse(lobby.votingRounds) as number[];
	const currentRound = lobby.votingCurrentRound;
	const answers = await getAnswersForVoting(lobby.id, [currentRound]);

	return { batchRounds, currentRound, endsAt: lobby.votingEndsAt, answers };
}

export async function scheduleGame(roomCode: string, lobbyId: string, questions: string[]) {
	await saveGameQuestions(roomCode, questions);
	await startRound(roomCode, lobbyId, 0);
}

export async function startRound(roomCode: string, lobbyId: string, roundNumber: number) {
	const lobby = await getLobbyByRoomCode(roomCode);
	if (!lobby?.questionsOrder) return;

	const questions = JSON.parse(lobby.questionsOrder) as string[];
	const question = questions[roundNumber];
	const endsAt = new Date(Date.now() + ROUND_DURATION_MS);

	await createRound({ lobbyId, roundNumber, question, endsAt });
	armRoundTimer(roomCode, lobbyId, roundNumber, endsAt);

	broadcast(roomCode, {
		action: 'round_started',
		round: roundNumber,
		question,
		endsAt: endsAt.toISOString(),
		totalRounds: TOTAL_ROUNDS
	});

	console.log(`[game] room ${roomCode} — round ${roundNumber + 1}/${TOTAL_ROUNDS} started`);
}

export async function advanceFromRound(roomCode: string, lobbyId: string, roundNumber: number) {
	clearTimeout(roundTimers.get(roomCode));
	roundTimers.delete(roomCode);
	await triggerRoundEnd(roomCode, lobbyId, roundNumber);
}

async function expireRound(roomCode: string, lobbyId: string, roundNumber: number) {
	roundTimers.delete(roomCode);

	if (isVotingActive(roomCode)) return;
	const currentRound = await getCurrentRound(lobbyId);
	if (!currentRound || currentRound.roundNumber !== roundNumber) return;

	await triggerRoundEnd(roomCode, lobbyId, roundNumber);
}

async function triggerRoundEnd(roomCode: string, lobbyId: string, roundNumber: number) {
	const nextRound = roundNumber + 1;
	const isBatchEnd = nextRound % ROUNDS_PER_VOTING_BATCH === 0 || nextRound >= TOTAL_ROUNDS;

	if (isBatchEnd) {
		const batchStart = Math.floor(roundNumber / ROUNDS_PER_VOTING_BATCH) * ROUNDS_PER_VOTING_BATCH;
		const batchRounds = Array.from({ length: roundNumber - batchStart + 1 }, (_, i) => batchStart + i);
		await startVoting(roomCode, lobbyId, batchRounds);
	} else {
		await startRound(roomCode, lobbyId, nextRound);
	}
}

export async function startVoting(roomCode: string, lobbyId: string, batchRounds: number[]) {
	await startVotingQuestion(roomCode, lobbyId, batchRounds, 0);
}

async function startVotingQuestion(
	roomCode: string,
	lobbyId: string,
	batchRounds: number[],
	questionIndex: number
) {
	const roundNumber = batchRounds[questionIndex];
	const answers = await getAnswersForVoting(lobbyId, [roundNumber]);
	const players = await getPlayersByLobbyId(lobbyId);

	// Skip immediately if nobody can vote for this question
	const eligibleVoters = players.filter((p) => answers.some((a) => a.playerId !== p.id));
	if (eligibleVoters.length === 0) {
		await endVotingQuestion(roomCode, lobbyId, batchRounds, questionIndex);
		return;
	}

	const endsAt = new Date(Date.now() + VOTE_DURATION_MS);
	await saveVotingPhase(roomCode, batchRounds, roundNumber, endsAt);
	votingBatchState.set(roomCode, { batchRounds, questionIndex });

	armVotingQuestionTimer(roomCode, lobbyId, batchRounds, questionIndex, endsAt);

	broadcast(roomCode, {
		action: 'voting_question_started',
		roundNumber,
		batchRounds,
		answers,
		endsAt: endsAt.toISOString()
	});

	console.log(
		`[game] room ${roomCode} — voting Q${questionIndex + 1}/${batchRounds.length} (round ${roundNumber}) started`
	);
}

async function endVotingQuestion(
	roomCode: string,
	lobbyId: string,
	batchRounds: number[],
	questionIndex: number
) {
	clearTimeout(votingQuestionTimers.get(roomCode));
	votingQuestionTimers.delete(roomCode);

	const roundNumber = batchRounds[questionIndex];
	const [votes, answers] = await Promise.all([
		getVotesForBatch(lobbyId, [roundNumber]),
		getAnswersForVoting(lobbyId, [roundNumber])
	]);

	const tallyMap = new Map<string, VoteTally>();
	for (const a of answers) {
		tallyMap.set(a.answerId, {
			answerId: a.answerId,
			playerId: a.playerId,
			playerName: a.playerName,
			answer: a.answer,
			voteCount: 0
		});
	}
	for (const vote of votes) {
		const tally = tallyMap.get(vote.answerId);
		if (tally) tally.voteCount++;
	}

	const question = answers[0]?.question ?? '';

	broadcast(roomCode, {
		action: 'voting_question_results',
		roundNumber,
		batchRounds,
		question,
		tallies: [...tallyMap.values()]
	});

	console.log(
		`[game] room ${roomCode} — voting Q${questionIndex + 1}/${batchRounds.length} results shown`
	);

	const timer = setTimeout(async () => {
		votingResultsTimers.delete(roomCode);
		await advanceVotingBatch(roomCode, lobbyId, batchRounds, questionIndex);
	}, RESULTS_DURATION_MS);
	votingResultsTimers.set(roomCode, timer);
}

async function advanceVotingBatch(
	roomCode: string,
	lobbyId: string,
	batchRounds: number[],
	questionIndex: number
) {
	const nextIndex = questionIndex + 1;

	if (nextIndex < batchRounds.length) {
		await startVotingQuestion(roomCode, lobbyId, batchRounds, nextIndex);
	} else {
		// All questions in batch done
		await clearVotingPhase(roomCode);
		votingBatchState.delete(roomCode);

		broadcast(roomCode, { action: 'voting_finished' });

		const lastRound = Math.max(...batchRounds);
		const nextRound = lastRound + 1;

		if (nextRound < TOTAL_ROUNDS) {
			await startRound(roomCode, lobbyId, nextRound);
		} else {
			await endGame(roomCode, lobbyId);
		}

		console.log(`[game] room ${roomCode} — voting batch [${batchRounds.join(', ')}] finished`);
	}
}

// Called from submit_vote when all eligible voters for the current question have voted
export async function advanceFromVotingQuestion(roomCode: string, lobbyId: string) {
	const state = votingBatchState.get(roomCode);
	if (!state) return;

	clearTimeout(votingQuestionTimers.get(roomCode));
	votingQuestionTimers.delete(roomCode);

	await endVotingQuestion(roomCode, lobbyId, state.batchRounds, state.questionIndex);
}

export async function endGame(roomCode: string, lobbyId: string) {
	await finishGame(roomCode);
	const [answers, scoreboard] = await Promise.all([
		getAnswersSummary(lobbyId),
		getScoreboard(lobbyId)
	]);
	broadcast(roomCode, { action: 'game_finished', answers, scoreboard });
	console.log(`[game] room ${roomCode} — game finished`);
}

function armRoundTimer(roomCode: string, lobbyId: string, roundNumber: number, endsAt: Date) {
	const msLeft = Math.max(0, endsAt.getTime() - Date.now());
	const timer = setTimeout(async () => {
		await expireRound(roomCode, lobbyId, roundNumber);
	}, msLeft);
	roundTimers.set(roomCode, timer);
}

function armVotingQuestionTimer(
	roomCode: string,
	lobbyId: string,
	batchRounds: number[],
	questionIndex: number,
	endsAt: Date
) {
	const msLeft = Math.max(0, endsAt.getTime() - Date.now());
	const timer = setTimeout(async () => {
		votingQuestionTimers.delete(roomCode);
		await endVotingQuestion(roomCode, lobbyId, batchRounds, questionIndex);
	}, msLeft);
	votingQuestionTimers.set(roomCode, timer);
}

export async function recoverGames() {
	const lobbies = await getInProgressLobbies();
	if (lobbies.length === 0) return;

	console.log(`[game] recovering ${lobbies.length} in-progress game(s)`);

	for (const lobby of lobbies) {
		if (lobby.votingEndsAt && lobby.votingRounds && lobby.votingCurrentRound != null) {
			const batchRounds = JSON.parse(lobby.votingRounds) as number[];
			const questionIndex = batchRounds.indexOf(lobby.votingCurrentRound);
			if (questionIndex === -1) continue;

			votingBatchState.set(lobby.roomCode, { batchRounds, questionIndex });
			armVotingQuestionTimer(lobby.roomCode, lobby.id, batchRounds, questionIndex, lobby.votingEndsAt);

			const msLeft = Math.max(0, lobby.votingEndsAt.getTime() - Date.now());
			console.log(
				`[game] recovered voting Q${questionIndex + 1}/${batchRounds.length} for room ${lobby.roomCode} (${Math.round(msLeft / 1000)}s left)`
			);
		} else {
			const currentRound = await getCurrentRound(lobby.id);
			if (currentRound) {
				armRoundTimer(lobby.roomCode, lobby.id, currentRound.roundNumber, currentRound.endsAt);
				const msLeft = Math.max(0, currentRound.endsAt.getTime() - Date.now());
				console.log(
					`[game] recovered round ${currentRound.roundNumber} for room ${lobby.roomCode} (${Math.round(msLeft / 1000)}s left)`
				);
			}
		}
	}
}
