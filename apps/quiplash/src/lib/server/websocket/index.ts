import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocketServer, WebSocket } from 'ws';
import type { WsMessage } from '$lib/websocket';

// roomCode → connected clients
const rooms = new Map<string, Set<WebSocket>>();

export const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws: WebSocket, roomCode: string) => {
	if (!rooms.has(roomCode)) rooms.set(roomCode, new Set());
	rooms.get(roomCode)!.add(ws);

	console.log(`[ws] client joined room ${roomCode} (${rooms.get(roomCode)!.size} total)`);

	ws.on('close', () => {
		rooms.get(roomCode)?.delete(ws);
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

export function handleUpgrade(request: IncomingMessage, socket: Duplex, head: Buffer) {
	const url = new URL(request.url ?? '/', `http://localhost`);
	const match = url.pathname.match(/^\/ws\/([^/]+)$/);

	if (!match) {
		socket.destroy();
		return;
	}

	const roomCode = match[1];
	wss.handleUpgrade(request, socket, head, (ws) => {
		wss.emit('connection', ws, roomCode);
	});
}
