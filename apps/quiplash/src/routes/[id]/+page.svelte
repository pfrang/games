<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Socket, type WsMessage } from '$lib/websocket';
	import type { Lobby, Player } from '@games/db/types';

	let { data } = $props();

	let lobby = $derived(data.lobby);
	let playerCookie = $derived(data.playerCookie);
	let playerId = $derived(playerCookie?.id ?? null);

	let players = $state<Player[]>(data.players ?? []);

	let isPlayerInLobby = $derived(players.some((p) => p.id === playerId));

	function getStatusLabel(status: Lobby['status']): string {
		switch (status) {
			case 'waiting':
				return 'WAITING FOR PLAYERS';
			case 'in_progress':
				return 'IN PROGRESS';
			default:
				return (status ?? 'UNKNOWN').toUpperCase();
		}
	}

	let statusLabel = $derived(getStatusLabel(lobby?.status));

	let createdDate = $derived(
		lobby?.createdAt
			? new Date(lobby.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
			: ''
	);

	let connection: Socket | null = null;

	function handleMessage(msg: WsMessage) {
		if (msg.action === 'player_joined') {
			if (!players.some((p) => p.id === msg.player.id)) {
				players = [...players, msg.player];
			}
		} else if (msg.action === 'player_left') {
			players = players.filter((p) => p.id !== msg.playerId);
		} else if (msg.action === 'game_started') {
			statusLabel = 'IN PROGRESS';
		}
	}

	onMount(() => {
		if (lobby?.roomCode && playerCookie) {
			connection = new Socket(lobby.roomCode, playerCookie.id);
			connection.addListener(handleMessage);
		}
	});

	onDestroy(() => {
		if (connection) {
			connection.removeListener(handleMessage);
			connection.close();
			connection = null;
		}
	});
</script>

<div class="container">
	<div class="title-wrap">
		<p class="label">ROOM CODE</p>
		<h1 class="room-code">{lobby?.roomCode ?? '—'}</h1>
	</div>
	{#if lobby.status === 'waiting'}
		<div class="card">
			<div class="card-inner">
				<div class="status-row">
					<span class="status-dot" class:waiting={lobby?.status === 'waiting'}></span>
					<span class="status-text">{statusLabel}</span>
				</div>

				<div class="divider"></div>

				<p class="meta">Created at {createdDate}</p>
			</div>
		</div>

		{#if !isPlayerInLobby}
			<form method="post" action="?/join">
				<input type="text" name="playerName" placeholder="Enter your name" />
				<button type="submit">Join</button>
			</form>
		{/if}
	{:else if lobby?.status === 'in_progress'}
		<div class="card">
			<div class="card-inner">
				<div class="status-row">
					<span class="status-dot" class:playing={lobby?.status === 'in_progress'}></span>
					<span class="status-text">{statusLabel}</span>
				</div>

				<div class="divider"></div>

				<p class="meta">Game is currently in progress...</p>
			</div>
		</div>
	{/if}

	<div class="players-section">
		<div class="players-header">
			<span class="players-label">PLAYERS</span>
			<span class="players-count">{players.length}</span>
		</div>

		<div class="players-grid">
			{#each players as p (p.id)}
				<div class="player-chip" class:you={p.id === playerId} class:host={p.isHost}>
					{#if p.isHost}
						<span class="crown">♛</span>
					{/if}
					<span class="chip-name">{p.name}</span>
					{#if p.id === playerId}
						<span class="you-badge">YOU</span>
					{/if}
				</div>
			{/each}
		</div>
	</div>

	{#if players.length > 1 && playerCookie?.isHost && lobby?.status === 'waiting'}
		<form method="POST" action="?/start" class="size-20 bg-white">
			<button type="submit" name="action" value="start">Start Game</button>
		</form>
	{/if}
</div>

<style>
	.container {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2rem;
		padding: 2rem 1rem;
		width: 100%;
		max-width: 480px;
	}

	.title-wrap {
		text-align: center;
	}

	.label {
		font-size: 0.75rem;
		letter-spacing: 0.25em;
		text-transform: uppercase;
		color: #7c6fa0;
		margin-bottom: 0.5rem;
	}

	.room-code {
		font-size: clamp(3rem, 14vw, 5.5rem);
		font-weight: 900;
		letter-spacing: 0.15em;
		line-height: 1;
		background: linear-gradient(135deg, #f9a8d4 0%, #a78bfa 40%, #60a5fa 80%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		filter: drop-shadow(0 0 24px #a78bfa88);
		animation: pulse-glow 3s ease-in-out infinite;
	}

	@keyframes pulse-glow {
		0%,
		100% {
			filter: drop-shadow(0 0 18px #a78bfa88);
		}
		50% {
			filter: drop-shadow(0 0 36px #a78bfacc);
		}
	}

	.card {
		width: 100%;
		border-radius: 20px;
		padding: 2px;
		background: linear-gradient(135deg, #a78bfa55, #f472b655, #60a5fa55);
		box-shadow:
			0 8px 40px #0007,
			0 0 60px #a78bfa22;
		animation: card-float 4s ease-in-out infinite;
	}

	@keyframes card-float {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-6px);
		}
	}

	.card-inner {
		background: #13132a;
		border-radius: 18px;
		padding: 2.5rem 2rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
	}

	.status-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.status-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: #4a4470;
		flex-shrink: 0;
	}

	.status-dot.waiting {
		background: #a78bfa;
		box-shadow: 0 0 8px #a78bfa99;
		animation: blink 1.5s ease-in-out infinite;
	}

	.status-dot.playing {
		background: #34d399;
		box-shadow: 0 0 8px #34d39999;
	}

	@keyframes blink {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.35;
		}
	}

	.status-text {
		font-size: 0.85rem;
		font-weight: 700;
		letter-spacing: 0.2em;
		color: #a78bfa;
	}

	.divider {
		width: 100%;
		height: 1px;
		background: linear-gradient(90deg, transparent, #2d2b55, transparent);
	}

	.meta {
		font-size: 0.75rem;
		color: #4a4470;
		letter-spacing: 0.08em;
	}

	/* ---- players ---- */
	.players-section {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.players-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.players-header::before,
	.players-header::after {
		content: '';
		flex: 1;
		height: 1px;
		background: linear-gradient(90deg, transparent, #2d2b55);
	}

	.players-header::after {
		background: linear-gradient(270deg, transparent, #2d2b55);
	}

	.players-label {
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.25em;
		color: #4a4470;
		white-space: nowrap;
	}

	.players-count {
		font-size: 0.7rem;
		font-weight: 800;
		color: #a78bfa;
		background: #1e1a3a;
		border: 1px solid #2d2b55;
		border-radius: 99px;
		padding: 0.1rem 0.5rem;
		min-width: 1.5rem;
		text-align: center;
	}

	.players-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}

	.player-chip {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.45rem 0.85rem;
		border-radius: 99px;
		background: #0d0d1a;
		border: 1.5px solid #2d2b55;
		font-size: 0.85rem;
		font-weight: 600;
		color: #a09ac0;
		letter-spacing: 0.04em;
		transition: border-color 0.2s;
	}

	.player-chip.host {
		border-color: #4a3a7a;
		color: #c4b5fd;
	}

	.player-chip.you {
		border-color: #7c3aed;
		background: #1a1035;
		color: #e2d9f3;
		box-shadow: 0 0 12px #7c3aed33;
	}

	.player-chip.host.you {
		border-color: #a78bfa;
		box-shadow: 0 0 14px #a78bfa44;
	}

	.crown {
		font-size: 0.75rem;
		color: #a78bfa;
		line-height: 1;
	}

	.chip-name {
		line-height: 1;
	}

	.you-badge {
		font-size: 0.6rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		color: #7c3aed;
		background: #2d1b69;
		border-radius: 99px;
		padding: 0.15rem 0.4rem;
		line-height: 1;
	}
</style>
