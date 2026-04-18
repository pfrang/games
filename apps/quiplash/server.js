import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { handler } from './build/handler.js';

// server.js owns all WebSocket state in production. The compiled broadcast()
// in the SvelteKit SSR bundle delegates here via globalThis.__quiplashBroadcast,
// which is set synchronously before the HTTP server starts accepting requests.

const rooms = new Map();
const playerIds = new WeakMap();
const wss = new WebSocketServer({ noServer: true });

function broadcast(roomCode, message) {
	const payload = JSON.stringify(message);
	rooms.get(roomCode)?.forEach((client) => {
		if (client.readyState === 1 /* WebSocket.OPEN */) client.send(payload);
	});
}

globalThis.__quiplashBroadcast = broadcast;

wss.on('connection', (ws, roomCode, playerId) => {
	if (!rooms.has(roomCode)) rooms.set(roomCode, new Set());
	rooms.get(roomCode).add(ws);
	playerIds.set(ws, playerId);
	console.log(`[ws] client joined room ${roomCode} (${rooms.get(roomCode).size} total)`);

	ws.on('close', () => {
		const pid = playerIds.get(ws);
		rooms.get(roomCode)?.delete(ws);
		if (pid) broadcast(roomCode, { action: 'player_left', playerId: pid });
		if (!rooms.get(roomCode)?.size) rooms.delete(roomCode);
		console.log(`[ws] client left room ${roomCode}`);
	});
});

const HOST = process.env.HOST ?? '0.0.0.0';
const PORT = parseInt(process.env.PORT ?? '3000');

const server = createServer(handler);

server.on('upgrade', (request, socket, head) => {
	const url = new URL(request.url, `http://${request.headers.host}`);
	const match = url.pathname.match(/^\/ws\/([^/]+)$/);
	if (!match) {
		socket.destroy();
		return;
	}
	const roomCode = match[1];
	const playerId = url.searchParams.get('playerId') ?? '';
	wss.handleUpgrade(request, socket, head, (ws) => {
		wss.emit('connection', ws, roomCode, playerId);
	});
});

server.listen(PORT, HOST, () => {
	console.log(`[server] listening on http://${HOST}:${PORT}`);
});

const shutdown = () => server.close(() => process.exit(0));
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
