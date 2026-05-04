import { env } from '$env/dynamic/private';
import { initRedis } from '@games/redis';
import '$lib/server/websocket';
import { recoverGames } from '$lib/server/websocket/game';
import type { Handle } from '@sveltejs/kit';

recoverGames().catch((e) => console.error('[game] recovery failed:', e));

export const handle: Handle = async ({ event, resolve }) => {
	initRedis({ url: env.REDIS_URL, password: env.REDIS_PASSWORD });

	const response = await resolve(event);
	return response;
};
