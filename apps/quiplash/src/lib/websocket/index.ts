import type { Player } from '@games/db/types';

export type GameAnswer = {
	playerId: string;
	playerName: string;
	roundNumber: number;
	question: string;
	answer: string;
};

export type WsMessage =
	| { action: 'player_joined'; player: Player }
	| { action: 'player_left'; playerId: string }
	| { action: 'game_started' }
	| { action: 'round_started'; round: number; question: string; endsAt: string; totalRounds: number }
	| { action: 'answer_submitted'; playerId: string; round: number }
	| { action: 'game_finished'; answers: GameAnswer[] };

export class Socket {
	#socket: WebSocket;
	#callbacks: Set<(data: WsMessage) => void>;

	constructor(roomCode: string, playerId: string) {
		this.#callbacks = new Set();

		const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
		const params = new URLSearchParams({ playerId });
		this.#socket = new WebSocket(`${protocol}//${window.location.host}/ws/${roomCode}?${params}`);

		this.#socket.addEventListener('message', (event) => {
			try {
				const data = JSON.parse(event.data as string) as WsMessage;
				this.#callbacks.forEach((cb) => cb(data));
			} catch (e) {
				console.error('[ws] failed to parse message', e);
			}
		});

		this.#socket.addEventListener('close', () => {
			console.log(`[ws] disconnected from room ${roomCode}`);
		});
	}

	addListener(callback: (data: WsMessage) => void) {
		this.#callbacks.add(callback);
	}

	removeListener(callback: (data: WsMessage) => void) {
		this.#callbacks.delete(callback);
	}

	close() {
		this.#socket.close();
	}
}
