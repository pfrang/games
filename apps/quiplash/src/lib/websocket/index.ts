interface MessageBase {
	action: 'setUser' | 'message';
}

interface MessageSetUser extends MessageBase {
	action: 'setUser';
}

interface MessageData extends MessageBase {
	action: 'message';
	message: string;
}

export class Socket {
	#socket: WebSocket;
	#callbacks: Set<(data: MessageData) => void>;

	constructor(roomCode: string) {
		// Init
		this.#callbacks = new Set();
		// Setup socket
		// ✅ same server as SvelteKit, dynamic
		const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
		this.#socket = new WebSocket(`${protocol}//${window.location.host}/ws/${roomCode}`);
		// this.#socket.addEventListener('open', (event) => {
		// 	const payload: MessageSetUser = { action: 'setUser' };
		// 	this.#socket.send(JSON.stringify(payload));
		// });
		// this.#socket.addEventListener('close', (event) => {
		// 	console.log('Connection closed');
		// });
		// this.#socket.addEventListener('message', (event) => {
		// 	console.log('Message from server ', event.data);
		// 	// Parse message
		// 	const data = JSON.parse(event.data);
		// 	if (data.action === 'login' && data.token) {
		// 		this.#token = data.token;
		// 	} else {
		// 		this.#callbacks.forEach((callback) => {
		// 			callback(JSON.parse(event.data));
		// 		});
		// 	}
		// });
	}

	addListener(callback: (data: MessageData) => void) {
		this.#callbacks.add(callback);
	}

	removeListener(callback: (data: MessageData) => void) {
		this.#callbacks.delete(callback);
	}

	sendMessage(message: string) {
		this.#socket.send(JSON.stringify({ action: 'message', data: message }));
	}
}
