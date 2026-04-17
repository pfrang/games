import { env } from '$env/dynamic/public';

export function isProduction() {
	return env.PUBLIC_BASE_URL === 'http://localhost:5173';
}
