import { getLobbyByRoomCode } from '$lib/db/lobbies';
import { createLobby } from '$lib/db/lobbies/create';
import { createPlayer } from '$lib/db/players/create';
import type { Actions } from '@sveltejs/kit';
import { fail, redirect } from '@sveltejs/kit';

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
		} catch (e) {
			console.error(e);
			return fail(500, { message: 'Could not create room. Try again.' });
		}

		cookies.set('quiplash-player', player.id, { path: '/' });

		redirect(302, `/${lobby.roomCode}`);
	}
} satisfies Actions;
