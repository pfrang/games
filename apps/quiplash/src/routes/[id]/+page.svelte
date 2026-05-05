<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Socket, type WsMessage, type GameAnswer, type VotingAnswer, type VoteTally, type ScoreboardEntry } from '$lib/websocket';
	import type { Lobby, Player } from '@games/db/types';
	import type { PageProps } from './$types';
	import Game from './Game.svelte';

	let { data }: PageProps = $props();

	let playerCookie = $derived(data.playerCookie);
	let playerId = $derived(playerCookie?.id ?? null);

	let players = $state<Player[]>(data.players ?? []);
	let lobbyStatus = $state<Lobby['status']>(data.lobby?.status ?? 'waiting');

	let lobby = $derived({ ...data.lobby, status: lobbyStatus });

	let isPlayerInLobby = $derived(players.some((p) => p.id === playerId));

	// Game state
	let gameRound = $state<number>(data.currentRound?.roundNumber ?? 0);
	let gameTotalRounds = $state<number>(10);
	let gameQuestion = $state<string>(data.currentRound?.question ?? '');
	let gameEndsAt = $state<string>(data.currentRound?.endsAt ?? '');
	let hasSubmitted = $state<boolean>(data.hasSubmitted ?? false);
	let submittedPlayerIds = $state<Set<string>>(new Set());
	let gameAnswers = $state<GameAnswer[]>(data.gameAnswers ?? []);
	let gameScoreboard = $state<ScoreboardEntry[]>([]);

	// Voting state — per-question
	let isVoting = $state<boolean>(!!data.votingBatch);
	let votingBatchRounds = $state<number[]>(data.votingBatch?.batchRounds ?? []);
	let votingCurrentRound = $state<number>(data.votingBatch?.currentRound ?? 0);
	let votingAnswers = $state<VotingAnswer[]>(data.votingBatch?.answers ?? []);
	let votingEndsAt = $state<string>(data.votingBatch?.endsAt ?? '');
	let votingSubPhase = $state<'voting' | 'results'>('voting');
	let votingTallies = $state<VoteTally[]>([]);
	let votingResultsQuestion = $state<string>('');
	let playerVoteCounts = $state<Map<string, number>>(new Map());

	let gamePhase = $derived<'answering' | 'voting' | 'finished'>(
		lobbyStatus === 'finished' ? 'finished' : isVoting ? 'voting' : 'answering'
	);

	function getStatusLabel(status: Lobby['status']): string {
		switch (status) {
			case 'waiting':
				return 'WAITING FOR PLAYERS';
			case 'in_progress':
				return 'IN PROGRESS';
			case 'finished':
				return 'FINISHED';
			default:
				return 'UNKNOWN';
		}
	}

	let statusLabel = $derived(getStatusLabel(lobbyStatus));

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
			lobbyStatus = 'in_progress';
		} else if (msg.action === 'round_started') {
			isVoting = false;
			playerVoteCounts = new Map();
			gameRound = msg.round;
			gameTotalRounds = msg.totalRounds;
			gameQuestion = msg.question;
			gameEndsAt = msg.endsAt;
			hasSubmitted = false;
			submittedPlayerIds = new Set();
		} else if (msg.action === 'answer_submitted') {
			if (msg.round === gameRound) {
				submittedPlayerIds = new Set([...submittedPlayerIds, msg.playerId]);
			}
			if (msg.playerId === playerId) {
				hasSubmitted = true;
			}
		} else if (msg.action === 'voting_question_started') {
			isVoting = true;
			votingBatchRounds = msg.batchRounds;
			votingCurrentRound = msg.roundNumber;
			votingAnswers = msg.answers;
			votingEndsAt = msg.endsAt;
			votingSubPhase = 'voting';
			votingTallies = [];
			playerVoteCounts = new Map();
		} else if (msg.action === 'vote_submitted') {
			playerVoteCounts = new Map([
				...playerVoteCounts,
				[msg.playerId, (playerVoteCounts.get(msg.playerId) ?? 0) + 1]
			]);
		} else if (msg.action === 'voting_question_results') {
			votingSubPhase = 'results';
			votingTallies = msg.tallies;
			votingResultsQuestion = msg.question;
		} else if (msg.action === 'voting_finished') {
			// All questions done — round_started or game_finished follows
		} else if (msg.action === 'game_finished') {
			lobbyStatus = 'finished';
			gameAnswers = msg.answers;
			gameScoreboard = msg.scoreboard;
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

{#if lobby.status === 'waiting'}
	<!-- ── LOBBY ── -->
	<div class="lobby-layout">
		<!-- Left: room code + status -->
		<div class="lobby-left">
			<p class="code-label">ROOM CODE</p>
			<h1 class="room-code">{lobby?.roomCode ?? '—'}</h1>
			<div class="status-badge waiting">
				<span class="status-dot"></span>
				{statusLabel}
			</div>
			<p class="meta">Created at {createdDate}</p>
		</div>

		<!-- Right: players + actions -->
		<div class="lobby-right">
			<div class="players-section">
				<div class="players-header">
					<span class="players-label">PLAYERS</span>
					<span class="players-count">{players.length}</span>
				</div>
				<div class="players-grid">
					{#each players as p (p.id)}
						<div class="player-chip" class:you={p.id === playerId} class:host={p.isHost}>
							{#if p.isHost}<span class="crown">♛</span>{/if}
							<span class="chip-name">{p.name}</span>
							{#if p.id === playerId}<span class="you-badge">YOU</span>{/if}
						</div>
					{/each}
				</div>
			</div>

			{#if !isPlayerInLobby}
				<form method="post" action="?/join" class="join-form">
					<input type="text" name="playerName" placeholder="ENTER YOUR NAME" class="join-input" />
					<button type="submit" class="btn-join">JOIN GAME</button>
				</form>
			{/if}

			{#if players.length > 1 && playerCookie?.isHost && lobby?.status === 'waiting'}
				<form method="POST" action="?/start" class="start-form">
					<button type="submit" name="action" value="start" class="btn-start">
						START GAME! 🎮
					</button>
				</form>
			{/if}
		</div>
	</div>

{:else if lobby?.status === 'in_progress' || lobby?.status === 'finished'}
	<!-- ── GAME IN PROGRESS / FINISHED ── -->
	<div class="game-layout">
		<div class="game-topbar">
			<span class="room-code-badge">{lobby?.roomCode}</span>
			<div
				class="status-pill"
				class:playing={lobby?.status === 'in_progress'}
				class:finished={lobby?.status === 'finished'}
			>
				<span class="status-dot"></span>
				{statusLabel}
			</div>
		</div>

		<Game
			round={gameRound}
			totalRounds={gameTotalRounds}
			question={gameQuestion}
			endsAt={gameEndsAt}
			phase={gamePhase}
			{hasSubmitted}
			{players}
			{playerId}
			{submittedPlayerIds}
			answers={gameAnswers}
			scoreboard={gameScoreboard}
			{votingBatchRounds}
			{votingCurrentRound}
			{votingAnswers}
			{votingEndsAt}
			{votingSubPhase}
			{votingTallies}
			{votingResultsQuestion}
			{playerVoteCounts}
		/>
	</div>
{/if}

<style>
	/* ── LOBBY layout ── */
	.lobby-layout {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 3rem;
		width: 100%;
		max-width: 820px;
		align-items: start;
	}

	@media (max-width: 580px) {
		.lobby-layout {
			grid-template-columns: 1fr;
			gap: 1.75rem;
		}
	}

	/* Left col */
	.lobby-left {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.code-label {
		font-family: 'Bangers', cursive;
		font-size: 0.85rem;
		letter-spacing: 0.3em;
		color: #7a6a4f;
	}

	.room-code {
		font-family: 'Bangers', cursive;
		font-size: clamp(3.5rem, 10vw, 6rem);
		letter-spacing: 0.18em;
		line-height: 1;
		color: #ff3b82;
		-webkit-text-stroke: 2px #1a1a1a;
		paint-order: stroke fill;
	}

	.status-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.55rem;
		padding: 0.4rem 1rem;
		background: #f0ece0;
		border: 2px solid #1a1a1a;
		border-radius: 50px;
		font-family: 'Bangers', cursive;
		font-size: 0.9rem;
		letter-spacing: 0.18em;
		color: #1a1a1a;
		box-shadow: 2px 2px 0 #1a1a1a;
		align-self: flex-start;
	}

	.status-badge.waiting {
		background: #ffd60a;
		animation: badge-blink 1.8s ease-in-out infinite;
	}

	@keyframes badge-blink {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.65;
		}
	}

	.status-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: #1a1a1a;
		flex-shrink: 0;
	}

	.meta {
		font-size: 0.75rem;
		font-weight: 700;
		color: #aaa;
		letter-spacing: 0.06em;
	}

	/* Right col */
	.lobby-right {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.players-section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.players-header {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.players-label {
		font-family: 'Bangers', cursive;
		font-size: 1rem;
		letter-spacing: 0.22em;
		color: #1a1a1a;
	}

	.players-count {
		font-family: 'Bangers', cursive;
		font-size: 0.9rem;
		color: #1a1a1a;
		background: #ffd60a;
		border: 2px solid #1a1a1a;
		border-radius: 99px;
		padding: 0.05rem 0.55rem;
		box-shadow: 2px 2px 0 #1a1a1a;
	}

	.players-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.player-chip {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.4rem 0.85rem;
		border-radius: 99px;
		background: #ffffff;
		border: 2px solid #1a1a1a;
		box-shadow: 2px 2px 0 #1a1a1a;
		font-size: 0.85rem;
		font-weight: 800;
		color: #1a1a1a;
	}

	.player-chip.host {
		border-color: #ff6b35;
	}

	.player-chip.you {
		background: #4cc9f0;
	}

	.player-chip.host.you {
		background: #ffd60a;
	}

	.crown {
		font-size: 0.7rem;
		color: #ff6b35;
	}

	.chip-name {
		line-height: 1;
	}

	.you-badge {
		font-family: 'Bangers', cursive;
		font-size: 0.6rem;
		letter-spacing: 0.1em;
		color: #1a1a1a;
		background: #ffffff;
		border: 1.5px solid #1a1a1a;
		border-radius: 99px;
		padding: 0.06rem 0.35rem;
		line-height: 1;
	}

	/* Join form */
	.join-form {
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
	}

	.join-input {
		width: 100%;
		padding: 0.8rem 1rem;
		background: #ffffff;
		border: 2.5px solid #1a1a1a;
		border-radius: 12px;
		color: #1a1a1a;
		font-family: 'Bangers', cursive;
		font-size: 1.2rem;
		letter-spacing: 0.18em;
		text-align: center;
		outline: none;
		transition: box-shadow 0.2s;
	}

	.join-input::placeholder {
		color: #c0b898;
		font-size: 0.95rem;
		letter-spacing: 0.12em;
	}

	.join-input:focus {
		box-shadow: 0 0 0 3px #ffd60a;
	}

	.btn-join {
		padding: 0.75rem 2rem;
		background: #ffd60a;
		border: 2.5px solid #1a1a1a;
		border-radius: 50px;
		box-shadow: 4px 4px 0 #1a1a1a;
		color: #1a1a1a;
		font-family: 'Bangers', cursive;
		font-size: 1.2rem;
		letter-spacing: 0.14em;
		cursor: pointer;
		width: 100%;
		transition:
			transform 0.1s,
			box-shadow 0.1s;
	}

	.btn-join:hover {
		transform: translate(-2px, -2px);
		box-shadow: 6px 6px 0 #1a1a1a;
	}

	.btn-join:active {
		transform: translate(2px, 2px);
		box-shadow: 2px 2px 0 #1a1a1a;
	}

	/* Start button */
	.start-form {
		width: 100%;
	}

	.btn-start {
		width: 100%;
		padding: 1rem 2rem;
		background: #06d6a0;
		border: 3px solid #1a1a1a;
		border-radius: 50px;
		box-shadow: 5px 5px 0 #1a1a1a;
		color: #1a1a1a;
		font-family: 'Bangers', cursive;
		font-size: 1.6rem;
		letter-spacing: 0.12em;
		cursor: pointer;
		animation: start-pulse 1.6s ease-in-out infinite;
		transition:
			transform 0.1s,
			box-shadow 0.1s;
	}

	@keyframes start-pulse {
		0%,
		100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.025);
		}
	}

	.btn-start:hover {
		animation: none;
		transform: translate(-3px, -3px);
		box-shadow: 8px 8px 0 #1a1a1a;
	}

	.btn-start:active {
		animation: none;
		transform: translate(3px, 3px);
		box-shadow: 2px 2px 0 #1a1a1a;
	}

	/* ── GAME layout ── */
	.game-layout {
		width: 100%;
		max-width: 760px;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.game-topbar {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.room-code-badge {
		font-family: 'Bangers', cursive;
		font-size: 1rem;
		letter-spacing: 0.22em;
		color: #ff3b82;
		background: #ffffff;
		border: 2px solid #1a1a1a;
		border-radius: 50px;
		padding: 0.2rem 0.85rem;
		box-shadow: 2px 2px 0 #1a1a1a;
	}

	.status-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.25rem 0.8rem;
		background: #f0ece0;
		border: 2px solid #1a1a1a;
		border-radius: 50px;
		font-family: 'Bangers', cursive;
		font-size: 0.78rem;
		letter-spacing: 0.16em;
		color: #1a1a1a;
		box-shadow: 2px 2px 0 #1a1a1a;
	}

	.status-pill.playing {
		background: #06d6a0;
	}

	.status-pill.finished {
		background: #4cc9f0;
	}
</style>
