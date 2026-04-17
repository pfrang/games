import { defineConfig } from 'vitest/config';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import type { Plugin } from 'vite';

function webSocketDevPlugin(): Plugin {
	return {
		name: 'websocket-dev',
		configureServer(server) {
			server.httpServer?.on('upgrade', (request, socket, head) => {
				if (request.url?.startsWith('/ws/')) {
					import('./src/lib/server/websocket/index.js').then(({ handleUpgrade }) => {
						handleUpgrade(request, socket as never, head as never);
					});
				}
			});
		}
	};
}

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), webSocketDevPlugin()],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
