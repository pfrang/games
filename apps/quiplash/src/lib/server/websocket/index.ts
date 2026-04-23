import type { WsMessage } from '$lib/websocket/index';
import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocketServer, WebSocket } from 'ws';
import { getPlayerById } from '$lib/db/players';
import { createRound } from '$lib/db/rounds/create';
import { finishGame } from '$lib/db/lobbies/edit';
import { getAnswersSummary } from '$lib/db/answers';

const ROUND_DURATION_MS = 60_000;
const TOTAL_ROUNDS = 10;

// roomCode → connected clients
const rooms = new Map<string, Set<WebSocket>>();
// ws → playerId so we can broadcast player_left on disconnect
const playerIds = new WeakMap<WebSocket, string>();
// roomCode → active round timer
const gameTimers = new Map<string, ReturnType<typeof setTimeout>>();
// roomCode → selected questions for the game
const gameQuestions = new Map<string, string[]>();

export const wss = new WebSocketServer({ noServer: true });

export const startWebsocketServer = async (httpServer: unknown) => {
	(httpServer as { on: (e: string, h: unknown) => void }).on('upgrade', handleUpgrade);
};

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

export async function scheduleGame(roomCode: string, lobbyId: string, questions: string[]) {
	gameQuestions.set(roomCode, questions);
	await startRound(roomCode, lobbyId, 0);
}

async function startRound(roomCode: string, lobbyId: string, roundNumber: number) {
	const questions = gameQuestions.get(roomCode);
	if (!questions) return;

	const question = questions[roundNumber];
	const endsAt = new Date(Date.now() + ROUND_DURATION_MS);

	await createRound({ lobbyId, roundNumber, question, endsAt });

	broadcast(roomCode, {
		action: 'round_started',
		round: roundNumber,
		question,
		endsAt: endsAt.toISOString()
	});

	console.log(`[game] room ${roomCode} — round ${roundNumber + 1}/${TOTAL_ROUNDS} started`);

	const timer = setTimeout(async () => {
		gameTimers.delete(roomCode);
		const next = roundNumber + 1;
		if (next < TOTAL_ROUNDS) {
			await startRound(roomCode, lobbyId, next);
		} else {
			gameQuestions.delete(roomCode);
			try {
				await finishGame(roomCode);
				const answers = await getAnswersSummary(lobbyId);
				broadcast(roomCode, { action: 'game_finished', answers });
				console.log(`[game] room ${roomCode} — game finished`);
			} catch (e) {
				console.error(`[game] failed to finish game for room ${roomCode}:`, e);
			}
		}
	}, ROUND_DURATION_MS);

	gameTimers.set(roomCode, timer);
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
