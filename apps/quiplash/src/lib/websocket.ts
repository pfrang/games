export class Socket {
	private socket: WebSocket;
	private url: string;

	constructor(url: string) {
		this.url = url;
		this.socket = new WebSocket(this.url);
	}

	public send(data: any) {
		if (this.socket.readyState === WebSocket.OPEN) {
			this.socket.send(JSON.stringify(data));
		} else {
			console.error('WebSocket is not open. Ready state: ' + this.socket.readyState);
		}
	}

	public onMessage(callback: (data: any) => void) {
		this.socket.onmessage = (event) => {
			callback(JSON.parse(event.data));
		};
	}

	public onError(callback: (error: any) => void) {
		this.socket.onerror = (event) => {
			callback(event);
		};
	}

	public onClose(callback: () => void) {
		this.socket.onclose = () => {
			callback();
		};
	}
}
