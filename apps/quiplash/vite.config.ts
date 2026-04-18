import { defineConfig } from 'vitest/config';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import type { Plugin } from 'vite';

function webSocketDevPlugin(): Plugin {
	return {
		name: 'websocket-dev',
		configureServer(server) {
			server.httpServer?.on('upgrade', async (request, socket, head) => {
				if (request.url?.startsWith('/ws/')) {
					const { handleUpgrade } = await server.ssrLoadModule(
						'/src/lib/server/websocket/index.ts'
					);
					handleUpgrade(request, socket as never, head as never);
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
