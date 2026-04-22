import type { PageServerLoad } from './$types';
import { fail, redirect, type Actions } from '@sveltejs/kit';
import { getPlayersByLobbyId } from '$lib/db/players';
import { getLobbyByRoomCode } from '$lib/db/lobbies';
import { createPlayer } from '$lib/db/players/create';
import type { PlayerCookie } from '$lib/types/player';
import { parseCookie } from '$lib/utils/cookies';
import { getQuestions } from '$lib/db/questions';
import { startGame } from '$lib/db/lobbies/edit';
import { broadcast } from '$lib/server/websocket';

export const load: PageServerLoad = async ({ params, cookies }) => {
	const roomCode = params.id;

	const lobby = await getLobbyByRoomCode(roomCode);

	if (!lobby) redirect(302, '/');

	let playerCookie = parseCookie<PlayerCookie>(cookies, 'quiplash-player');
	if (playerCookie && playerCookie.roomCode !== roomCode) {
		playerCookie = undefined;
	}

	const [players, questions] = await Promise.all([getPlayersByLobbyId(lobby.id), getQuestions()]);

	return { lobby, players, playerCookie, questions };
};

export const actions = {
	join: async ({ request, params, cookies }) => {
		const roomCode = params.id;
		if (!roomCode) {
			return fail(400, { roomCode, message: 'Room code is required.' });
		}

		const formData = await request.formData();
		const playerName = formData.get('playerName');
		if (!playerName || typeof playerName !== 'string') {
			return fail(400, { playerName, message: 'Player name is required.' });
		}

		const lobby = await getLobbyByRoomCode(roomCode);
		if (!lobby) {
			return fail(400, { roomCode, message: 'Room not found.' });
		}

		const player = await createPlayer(lobby.id, playerName, false);

		const playerCookie: PlayerCookie = { ...player, roomCode };
		cookies.set('quiplash-player', JSON.stringify(playerCookie), { path: '/' });

		redirect(302, `/${roomCode}`);
	},
	start: async ({ request, params, cookies }) => {
		const roomCode = params.id;
		if (!roomCode) {
			return fail(400, { roomCode, message: 'Room code is required.' });
		}
		broadcast(roomCode, { action: 'game_started' });

		await startGame(roomCode);
	}
} satisfies Actions;
