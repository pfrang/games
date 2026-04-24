import { getLobbyByRoomCode } from '$lib/db/lobbies';
import { createLobby } from '$lib/db/lobbies/create';
import { env } from '$env/dynamic/private';
import { createPlayer } from '$lib/db/players/create';
import type { PlayerCookie } from '$lib/types/player';
import { parseCookie } from '$lib/utils/cookies.js';
import { getJSON, initRedis, setJSON, subscribe } from '@games/redis';
import type { Actions } from '@sveltejs/kit';
import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	const playerCookie = parseCookie<PlayerCookie>(cookies, 'quiplash-player');
	if (playerCookie) {
		const lobbyRedis = await getJSON('quiplash:lobby:');
	}
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

		let lobby, player;
		try {
			lobby = await createLobby();
			player = await createPlayer(lobby.id, playerName, true);
			await subscribe(`quiplash:lobby:${lobby.id}`, (message) => {
				console.log(message);
			});
			await setJSON('quiplash:lobby:' + lobby.id, lobby, 24 * 3600);
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
