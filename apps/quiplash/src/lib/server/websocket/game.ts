import { createRound } from '$lib/db/rounds/create';
import { finishGame, saveGameQuestions, saveVotingPhase, clearVotingPhase } from '$lib/db/lobbies/edit';
import { getLobbyByRoomCode, getInProgressLobbies } from '$lib/db/lobbies';
import { getAnswersSummary, getAnswersForVoting } from '$lib/db/answers';
import { getVotesForBatch, getScoreboard } from '$lib/db/votes';
import { broadcast } from '.';
import type { VoteTally } from '$lib/websocket';

export const ROUND_DURATION_MS = 60_000;
export const TOTAL_ROUNDS = 10;
export const ROUNDS_PER_VOTING_BATCH = 3;

// The only state that cannot be stored in the DB — setTimeout handles.
const votingTimers = new Map<string, ReturnType<typeof setTimeout>>();

export async function getVotingBatch(roomCode: string) {
	const lobby = await getLobbyByRoomCode(roomCode);
	if (!lobby?.votingEndsAt || !lobby.votingRounds) return null;

	const roundNumbers = JSON.parse(lobby.votingRounds) as number[];
	const answers = await getAnswersForVoting(lobby.id, roundNumbers);

	return {
		roundNumbers,
		endsAt: lobby.votingEndsAt,
		answers
	};
}

export function isVotingActive(roomCode: string) {
	return votingTimers.has(roomCode);
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

	await saveVotingPhase(roomCode, roundNumbers, endsAt);
	armVotingTimer(roomCode, lobbyId, endsAt);

	broadcast(roomCode, {
		action: 'voting_started',
		rounds: roundNumbers,
		answers,
		endsAt: endsAt.toISOString()
	});

	console.log(`[game] room ${roomCode} — voting started for rounds [${roundNumbers.join(', ')}]`);
}

export async function endVoting(roomCode: string, lobbyId: string) {
	const timer = votingTimers.get(roomCode);
	if (timer === undefined) return;

	clearTimeout(timer);
	votingTimers.delete(roomCode);

	const lobby = await getLobbyByRoomCode(roomCode);
	if (!lobby?.votingRounds) return;

	const roundNumbers = JSON.parse(lobby.votingRounds) as number[];
	const [votes, answers] = await Promise.all([
		getVotesForBatch(lobbyId, roundNumbers),
		getAnswersForVoting(lobbyId, roundNumbers)
	]);

	await clearVotingPhase(roomCode);

	const tallyMap = new Map<string, VoteTally>();
	for (const a of answers) {
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

	const lastRound = Math.max(...roundNumbers);
	const nextRound = lastRound + 1;

	if (nextRound < TOTAL_ROUNDS) {
		await startRound(roomCode, lobbyId, nextRound);
	} else {
		await endGame(roomCode, lobbyId);
	}

	console.log(`[game] room ${roomCode} — voting ended for rounds [${roundNumbers.join(', ')}]`);
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

function armVotingTimer(roomCode: string, lobbyId: string, endsAt: Date) {
	const msLeft = Math.max(0, endsAt.getTime() - Date.now());
	const timer = setTimeout(async () => {
		await endVoting(roomCode, lobbyId);
	}, msLeft);
	votingTimers.set(roomCode, timer);
}

export async function recoverGames() {
	const lobbies = await getInProgressLobbies();
	if (lobbies.length === 0) return;

	console.log(`[game] recovering ${lobbies.length} in-progress game(s)`);

	for (const lobby of lobbies) {
		if (!lobby.votingEndsAt || !lobby.votingRounds) continue;

		const msLeft = Math.max(0, lobby.votingEndsAt.getTime() - Date.now());
		armVotingTimer(lobby.roomCode, lobby.id, lobby.votingEndsAt);

		console.log(
			`[game] recovered voting for room ${lobby.roomCode} (${Math.round(msLeft / 1000)}s left)`
		);
	}
}
