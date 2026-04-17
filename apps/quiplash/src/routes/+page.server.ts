import { getLobbyByRoomCode } from '$lib/db/lobbies';
import { createLobby } from '$lib/db/lobbies/create';
import { createPlayer } from '$lib/db/players/create';
import { getRedisClient } from '$lib/redis/cli';
import type { PlayerCookie } from '$lib/types/player';
import { parseCookie } from '$lib/utils/cookies.js';
import { set } from '@games/redis';
import type { Actions } from '@sveltejs/kit';
import { fail, redirect } from '@sveltejs/kit';

export const load = async ({ cookies }) => {
	const playerCookie = parseCookie<PlayerCookie>(cookies, 'quiplash-player');
	return { playerCookie };
};

export const actions = {
	join: async ({ request }) => {
		const formData = await request.formData();
		const roomCode = formData.get('roomCode');
		if (!roomCode || typeof roomCode !== 'string') {
			return fail(400, { roomCode, message: 'Room code is required.' });
		}

		const lobby = await getLobbyByRoomCode(roomCode);

		if (!lobby) {
			return fail(400, { roomCode, message: 'Room not found.' });
		}

		redirect(302, `/${lobby.roomCode}`);
	},

	create: async ({ request, cookies }) => {
		const formData = await request.formData();
		const playerName = formData.get('playerName');
		if (!playerName || typeof playerName !== 'string') {
			return fail(400, { message: 'Your name is required.' });
		}

		const client = await getRedisClient();

		let lobby, player;
		try {
			lobby = await createLobby();
			player = await createPlayer(lobby.id, playerName, true);
			await set(client, 'quiplash:lobby:' + lobby.id, JSON.stringify(lobby), 24 * 3600);
		} catch (e) {
			console.error(e);
			return fail(500, { message: 'Could not create room. Try again.' });
		}
		if (lobby && player) {
			const playerCookie: PlayerCookie = {
				...player,
				roomCode: lobby.roomCode
			};

			cookies.set('quiplash-player', JSON.stringify(playerCookie), { path: '/' });

			redirect(302, `/${lobby.roomCode}`);
		}
	}
} satisfies Actions;
