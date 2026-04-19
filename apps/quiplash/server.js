import { createServer } from 'node:http';
import { handler } from './build/handler.js';

// Importing handler triggers hooks.server.ts which imports the websocket module,
// registering globalThis.__quiplashHandleUpgrade before any requests arrive.

const HOST = process.env.HOST ?? '0.0.0.0';
const PORT = parseInt(process.env.PORT ?? '3000');

const server = createServer(handler);

server.on('upgrade', (request, socket, head) => {
	globalThis.__quiplashHandleUpgrade?.(request, socket, head);
});

server.listen(PORT, HOST, () => {
	console.log(`[server] listening on http://${HOST}:${PORT}`);
});

const shutdown = () => server.close(() => process.exit(0));
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
