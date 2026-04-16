import type { Cookies } from '@sveltejs/kit';

export function parseCookie<T>(cookies: Cookies, name: string): T | undefined {
	let cookie: T | undefined;

	try {
		cookie = JSON.parse(cookies.get(name) ?? '');
	} catch (e) {}

	return cookie;
}
