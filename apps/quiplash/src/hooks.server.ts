import { env } from '$env/dynamic/private';
import { initRedis } from '@games/redis';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	initRedis({ url: env.REDIS_URL, password: env.REDIS_PASSWORD });

	const response = await resolve(event);
	return response;
};
