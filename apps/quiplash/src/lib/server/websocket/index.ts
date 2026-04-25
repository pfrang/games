import type { WsMessage } from '$lib/websocket/index';
import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocketServer, WebSocket } from 'ws';
import { getPlayerById } from '$lib/db/players';

// roomCode → connected clients
const rooms = new Map<string, Set<WebSocket>>();
// ws → playerId so we can broadcast player_left on disconnect
const playerIds = new WeakMap<WebSocket, string>();

export const wss = new WebSocketServer({ noServer: true });

wss.on('connection', async (ws: WebSocket, roomCode: string, playerId: string) => {
	if (!rooms.has(roomCode)) rooms.set(roomCode, new Set());
	rooms.get(roomCode)!.add(ws);
	playerIds.set(ws, playerId);

	console.log(`[ws] client joined room ${roomCode} (${rooms.get(roomCode)!.size} total)`);

	if (playerId) {
		try {
			const player = await getPlayerById(playerId);
			if (player) {
				broadcast(roomCode, { action: 'player_joined', player });
			}
		} catch (e) {
			console.error(`Failed to fetch player data for playerId ${playerId}:`, e);
		}
	}

	ws.on('close', () => {
		const pid = playerIds.get(ws);
		rooms.get(roomCode)?.delete(ws);
		if (pid) {
			broadcast(roomCode, { action: 'player_left', playerId: pid });
		}
		if (rooms.get(roomCode)?.size === 0) rooms.delete(roomCode);
		console.log(`[ws] client left room ${roomCode}`);
	});
});

export function broadcast(roomCode: string, message: WsMessage) {
	const payload = JSON.stringify(message);
	rooms.get(roomCode)?.forEach((client) => {
		if (client.readyState === WebSocket.OPEN) {
			client.send(payload);
		}
	});
}

declare global {
	var __quiplashHandleUpgrade:
		| ((request: IncomingMessage, socket: Duplex, head: Buffer) => void)
		| undefined;
}

globalThis.__quiplashHandleUpgrade = handleUpgrade;

export function handleUpgrade(request: IncomingMessage, socket: Duplex, head: Buffer) {
	const url = new URL(request.url ?? '/', `http://localhost`);
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
}
