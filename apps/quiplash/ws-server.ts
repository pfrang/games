import { WebSocketServer, WebSocket } from 'ws';
import Redis from 'ioredis';
import type { Server } from 'node:http';

type Room = Map<string, WebSocket>; // playerId → socket

const rooms = new Map<string, Room>(); // roomCode → room

interface GameEvent {
	roomCode: string;
	excludeId?: string;
	payload: object;
}

export function setupWebSocketServer(httpServer: Server) {
	const wss = new WebSocketServer({ noServer: true });

	const redisUrl = process.env.REDIS_URL;
	if (!redisUrl) throw new Error('REDIS_URL is not set');

	const sub = new Redis(redisUrl);
	const pub = new Redis(redisUrl);

	// Redis pub/sub → broadcast to all local sockets in this process
	sub.subscribe('game:events');
	sub.on('message', (_ch, raw) => {
		const event: GameEvent = JSON.parse(raw);
		broadcastToRoom(event.roomCode, event.payload, event.excludeId);
	});

	// Only intercept upgrades to /ws — leave all other paths (Vite HMR, etc.) untouched
	httpServer.on('upgrade', (request, socket, head) => {
		const { pathname } = new URL(request.url!, `http://${request.headers.host}`);
		if (pathname !== '/ws') return;

		wss.handleUpgrade(request, socket, head, (ws) => {
			wss.emit('connection', ws, request);
		});
	});

	wss.on('connection', (socket) => {
		let roomCode: string | null = null;
		let playerId: string | null = null;

		socket.on('message', (raw) => {
			try {
				const msg = JSON.parse(raw.toString());

				if (msg.type === 'join') {
					roomCode = msg.roomCode as string;
					playerId = msg.playerId as string;

					if (!rooms.has(roomCode)) rooms.set(roomCode, new Map());
					rooms.get(roomCode)!.set(playerId, socket);

					socket.send(JSON.stringify({ type: 'joined', roomCode }));
					console.log(`[WS] ${playerId} joined room ${roomCode}`);
				}
			} catch (err) {
				console.error('[WS] message error', err);
			}
		});

		socket.on('close', () => {
			if (!roomCode || !playerId) return;

			rooms.get(roomCode)?.delete(playerId);
			if (rooms.get(roomCode)?.size === 0) rooms.delete(roomCode);

			pub.publish(
				'game:events',
				JSON.stringify({
					roomCode,
					payload: { type: 'player-left', playerId }
				} satisfies GameEvent)
			);

			console.log(`[WS] ${playerId} left room ${roomCode}`);
		});

		socket.on('error', (err) => console.error('[WS] socket error', err));
	});

	console.log('[WS] WebSocket server ready on path /ws');
}

export function broadcastToRoom(roomCode: string, payload: object, excludeId?: string) {
	const room = rooms.get(roomCode);
	if (!room) return;

	const msg = JSON.stringify(payload);
	for (const [id, socket] of room) {
		if (id !== excludeId && socket.readyState === WebSocket.OPEN) {
			socket.send(msg);
		}
	}
}
