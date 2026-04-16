import type { PageServerLoad } from './$types';
import { fail, redirect, type Actions } from '@sveltejs/kit';
import { getPlayersByLobbyId } from '$lib/db/players';
import { getLobbyByRoomCode } from '$lib/db/lobbies';
import { createPlayer } from '$lib/db/players/create';
import type { PlayerCookie } from '$lib/types/player';
import { parseCookie } from '$lib/utils/cookies';

export const load: PageServerLoad = async ({ params, cookies }) => {
	const roomCode = params.id;

	const lobby = await getLobbyByRoomCode(roomCode);

	if (!lobby) redirect(302, '/');

	const players = await getPlayersByLobbyId(lobby.id);
	const playerCookie = parseCookie<PlayerCookie>(cookies, 'quiplash-player');

	return { lobby, players, playerCookie };
};

export const actions = {
	default: async ({ request, params, cookies }) => {
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
		cookies.set('quiplash-player', player.id, { path: '/' });
		redirect(302, `/${roomCode}`);
	}
} satisfies Actions;
