import { fail, redirect, type Actions } from '@sveltejs/kit';
import { getPlayersByLobbyId } from '$lib/db/players';
import { getLobbyByRoomCode } from '$lib/db/lobbies';
import { createPlayer } from '$lib/db/players/create';
import type { PlayerCookie } from '$lib/types/player';
import { parseCookie } from '$lib/utils/cookies';
import { getQuestions } from '$lib/db/questions';
import { startGame } from '$lib/db/lobbies/edit';
import { broadcast } from '$lib/server/websocket';
import { getCurrentRound } from '$lib/db/rounds';
import {
	getPlayerAnswerForRound,
	getAnswerCountForRound,
	getAnswersSummary
} from '$lib/db/answers';
import { createAnswer } from '$lib/db/answers/create';
import { getVoteForPlayerRound, getVoteCountForRound } from '$lib/db/votes';
import { createVote } from '$lib/db/votes/create';
import type { PageServerLoad } from './$types';
import {
	scheduleGame,
	advanceFromRound,
	endVoting,
	getVotingBatch,
	TOTAL_ROUNDS
} from '$lib/server/websocket/game';

export const load: PageServerLoad = async ({ params, cookies }) => {
	const roomCode = params.id;

	const lobby = await getLobbyByRoomCode(roomCode);
	if (!lobby) redirect(302, '/');

	let playerCookie = parseCookie<PlayerCookie>(cookies, 'quiplash-player');
	if (playerCookie && playerCookie.roomCode !== roomCode) {
		playerCookie = undefined;
	}

	const [players, questions] = await Promise.all([getPlayersByLobbyId(lobby.id), getQuestions()]);

	if (lobby.status === 'in_progress') {
		// Check if there's an active voting batch
		const votingBatch = await getVotingBatch(roomCode);
		if (votingBatch) {
			return {
				lobby,
				players,
				playerCookie,
				questions,
				currentRound: null,
				hasSubmitted: false,
				gameAnswers: null,
				votingBatch: {
					rounds: votingBatch.roundNumbers,
					answers: votingBatch.answers,
					endsAt: votingBatch.endsAt.toISOString()
				}
			};
		}

		const currentRound = await getCurrentRound(lobby.id);
		let hasSubmitted = false;
		if (currentRound && playerCookie) {
			const existing = await getPlayerAnswerForRound(playerCookie.id, currentRound.roundNumber);
			hasSubmitted = !!existing;
		}
		return {
			lobby,
			players,
			playerCookie,
			questions,
			currentRound: currentRound
				? { ...currentRound, endsAt: currentRound.endsAt.toISOString() }
				: null,
			hasSubmitted,
			gameAnswers: null,
			votingBatch: null
		};
	}

	if (lobby.status === 'finished') {
		const gameAnswers = await getAnswersSummary(lobby.id);
		return {
			lobby,
			players,
			playerCookie,
			questions,
			currentRound: null,
			hasSubmitted: false,
			gameAnswers,
			votingBatch: null
		};
	}

	return {
		lobby,
		players,
		playerCookie,
		questions,
		currentRound: null,
		hasSubmitted: false,
		gameAnswers: null,
		votingBatch: null
	};
};

export const actions = {
	join: async ({ request, params, cookies }) => {
		const roomCode = params.id;
		if (!roomCode) return fail(400, { message: 'Room code is required.' });

		const formData = await request.formData();
		const playerName = formData.get('playerName');
		if (!playerName || typeof playerName !== 'string') {
			return fail(400, { message: 'Player name is required.' });
		}

		const lobby = await getLobbyByRoomCode(roomCode);
		if (!lobby) return fail(400, { message: 'Room not found.' });

		const player = await createPlayer(lobby.id, playerName, false);

		const playerCookie: PlayerCookie = { ...player, roomCode };
		cookies.set('quiplash-player', JSON.stringify(playerCookie), { path: '/' });

		redirect(302, `/${roomCode}`);
	},

	start: async ({ params }) => {
		const roomCode = params.id;
		if (!roomCode) return fail(400, { message: 'Room code is required.' });

		const lobby = await getLobbyByRoomCode(roomCode);
		if (!lobby) return fail(400, { message: 'Room not found.' });

		const allQuestions = await getQuestions();
		const shuffled = allQuestions.map((q) => q.questions).sort(() => Math.random() - 0.5);
		const selected = shuffled.slice(0, TOTAL_ROUNDS);

		await startGame(roomCode);
		broadcast(roomCode, { action: 'game_started' });
		await scheduleGame(roomCode, lobby.id, selected);
	},

	submit_answer: async ({ request, params, cookies }) => {
		const roomCode = params.id;
		if (!roomCode) return fail(400, { message: 'Room code is required.' });

		const formData = await request.formData();
		const answer = formData.get('answer');
		const roundStr = formData.get('round');

		if (!answer || typeof answer !== 'string' || !answer.trim()) {
			return fail(400, { message: 'Answer is required.' });
		}

		const roundNumber = parseInt(roundStr as string, 10);
		if (isNaN(roundNumber)) return fail(400, { message: 'Invalid round.' });

		const playerCookie = parseCookie<PlayerCookie>(cookies, 'quiplash-player');
		if (!playerCookie) return fail(401, { message: 'Not authenticated.' });

		const lobby = await getLobbyByRoomCode(roomCode);
		if (!lobby) return fail(400, { message: 'Room not found.' });

		const existing = await getPlayerAnswerForRound(playerCookie.id, roundNumber);
		if (existing) return fail(400, { message: 'Already submitted for this round.' });

		await createAnswer({
			lobbyId: lobby.id,
			playerId: playerCookie.id,
			roundNumber,
			answer: answer.trim()
		});

		broadcast(roomCode, {
			action: 'answer_submitted',
			playerId: playerCookie.id,
			round: roundNumber
		});

		const [players, answerCount] = await Promise.all([
			getPlayersByLobbyId(lobby.id),
			getAnswerCountForRound(lobby.id, roundNumber)
		]);

		if (answerCount >= players.length) {
			await advanceFromRound(roomCode, lobby.id, roundNumber);
		}

		return { success: true };
	},

	submit_vote: async ({ request, params, cookies }) => {
		const roomCode = params.id;
		if (!roomCode) return fail(400, { message: 'Room code is required.' });

		const formData = await request.formData();
		const answerId = formData.get('answerId') as string;
		const roundStr = formData.get('roundNumber') as string;
		const roundNumber = parseInt(roundStr, 10);

		if (!answerId || isNaN(roundNumber)) {
			return fail(400, { message: 'Invalid vote data.' });
		}

		const playerCookie = parseCookie<PlayerCookie>(cookies, 'quiplash-player');
		if (!playerCookie) return fail(401, { message: 'Not authenticated.' });

		const lobby = await getLobbyByRoomCode(roomCode);
		if (!lobby) return fail(400, { message: 'Room not found.' });

		const batch = await getVotingBatch(roomCode);
		if (!batch) return fail(400, { message: 'No active voting.' });

		const targetAnswer = batch.answers.find((a) => a.answerId === answerId);
		if (!targetAnswer) return fail(400, { message: 'Invalid answer.' });
		if (targetAnswer.playerId === playerCookie.id) {
			return fail(400, { message: 'Cannot vote for your own answer.' });
		}

		const existingVote = await getVoteForPlayerRound(playerCookie.id, lobby.id, roundNumber);
		if (existingVote) return fail(400, { message: 'Already voted for this round.' });

		await createVote({
			lobbyId: lobby.id,
			voterId: playerCookie.id,
			answerId,
			roundNumber
		});

		broadcast(roomCode, {
			action: 'vote_submitted',
			playerId: playerCookie.id,
			roundNumber
		});

		// Check if all eligible players have voted for all rounds
		const players = await getPlayersByLobbyId(lobby.id);
		let allVoted = true;

		for (const rn of batch.roundNumbers) {
			const answersInRound = batch.answers.filter((a) => a.roundNumber === rn);
			const eligibleVoters = players.filter((p) =>
				answersInRound.some((a) => a.playerId !== p.id)
			);
			const voteCount = await getVoteCountForRound(lobby.id, rn);
			if (voteCount < eligibleVoters.length) {
				allVoted = false;
				break;
			}
		}

		if (allVoted) {
			await endVoting(roomCode, lobby.id);
		}

		return { success: true };
	}
} satisfies Actions;
