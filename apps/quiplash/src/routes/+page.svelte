<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';

	let { form, data } = $props();
	let playerCookie = $derived(data.playerCookie);

	let mode = $state<'join' | 'create'>('join');
	let loading = $state(false);
	let clearedOnSubmit = $state(false);

	let visibleError = $derived(clearedOnSubmit ? null : (form?.message ?? null));

	function switchMode(next: 'join' | 'create') {
		if (next === mode) return;
		mode = next;
		clearedOnSubmit = true;
	}
</script>

<div class="container">
	<div class="title-wrap">
		<h1 class="title">QUIPLASH</h1>
		<p class="subtitle">the game where your words do the talking</p>
	</div>

	{#if playerCookie?.roomCode}
		<div class="rejoin-banner">
			<p class="rejoin-text">
				You're already in a game · <strong class="rejoin-code">{playerCookie.roomCode}</strong>
			</p>
			<a href="/{playerCookie.roomCode}" class="rejoin-btn">BACK TO GAME →</a>
		</div>
	{/if}

	<div class="card">
		<div class="toggle">
			<button
				type="button"
				class="toggle-btn"
				class:active={mode === 'join'}
				onclick={() => switchMode('join')}
			>JOIN</button>
			<button
				type="button"
				class="toggle-btn"
				class:active={mode === 'create'}
				onclick={() => switchMode('create')}
			>CREATE</button>
		</div>

		{#if mode === 'join'}
			<form
				method="POST"
				action="?/join"
				use:enhance={() => {
					loading = true;
					clearedOnSubmit = true;
					return async ({ update }) => {
						try {
							await update({ reset: false });
						} finally {
							clearedOnSubmit = false;
							loading = false;
						}
					};
				}}
				class="game-form"
			>
				<input
					type="text"
					name="roomCode"
					placeholder="ROOM CODE"
					autocomplete="off"
					spellcheck="false"
					maxlength="8"
					disabled={loading}
					class="game-input"
				/>
				<div class="error-row">
					{#if visibleError}<p class="error">{visibleError}</p>{/if}
				</div>
				<button type="submit" class="btn-primary" disabled={loading}>
					{loading ? 'JOINING...' : "LET'S GO!"}
				</button>
			</form>
		{:else}
			<form
				method="POST"
				action="?/create"
				use:enhance={() => {
					loading = true;
					clearedOnSubmit = true;
					return async ({ update }) => {
						try {
							await update({ reset: false });
						} finally {
							clearedOnSubmit = false;
							loading = false;
						}
					};
				}}
				class="game-form"
			>
				<input
					type="text"
					name="playerName"
					placeholder="YOUR NAME"
					autocomplete="off"
					spellcheck="false"
					maxlength="20"
					disabled={loading}
					class="game-input"
				/>
				<div class="error-row">
					{#if visibleError}<p class="error">{visibleError}</p>{/if}
				</div>
				<button type="submit" class="btn-primary btn-create" disabled={loading}>
					{loading ? 'CREATING...' : 'CREATE ROOM'}
				</button>
			</form>
		{/if}
	</div>

	<p class="hint">
		{mode === 'join'
			? 'Ask your host for the room code'
			: 'Start a new game and invite your friends'}
	</p>
</div>

<style>
	.container {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.75rem;
		width: 100%;
		max-width: 460px;
	}

	/* ── Title ── */
	.title-wrap {
		text-align: center;
	}

	.title {
		font-family: 'Bangers', cursive;
		font-size: clamp(4rem, 16vw, 6.5rem);
		letter-spacing: 0.1em;
		line-height: 1;
		color: #ffd60a;
		-webkit-text-stroke: 3px #1a1a1a;
		paint-order: stroke fill;
		display: inline-block;
		animation: title-wobble 3.5s ease-in-out infinite;
	}

	@keyframes title-wobble {
		0%,
		100% {
			transform: rotate(-1.5deg) scale(1);
		}
		50% {
			transform: rotate(1.5deg) scale(1.025);
		}
	}

	.subtitle {
		margin-top: 0.5rem;
		font-size: 0.82rem;
		font-weight: 800;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: #7a6a4f;
	}

	/* ── Rejoin banner ── */
	.rejoin-banner {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.85rem;
		padding: 1.25rem 1.5rem;
		background: #ffffff;
		border: 2.5px solid #1a1a1a;
		border-radius: 14px;
		box-shadow: 4px 4px 0 #1a1a1a;
		text-align: center;
	}

	.rejoin-text {
		font-size: 0.9rem;
		font-weight: 700;
		color: #1a1a1a;
	}

	.rejoin-code {
		color: #ff3b82;
		letter-spacing: 0.2em;
		font-family: 'Bangers', cursive;
		font-size: 1.1rem;
	}

	.rejoin-btn {
		display: inline-block;
		padding: 0.55rem 1.4rem;
		background: #4cc9f0;
		border: 2.5px solid #1a1a1a;
		border-radius: 50px;
		box-shadow: 3px 3px 0 #1a1a1a;
		color: #1a1a1a;
		font-family: 'Bangers', cursive;
		font-size: 1.05rem;
		letter-spacing: 0.1em;
		text-decoration: none;
		transition:
			transform 0.1s,
			box-shadow 0.1s;
	}

	.rejoin-btn:hover {
		transform: translate(-2px, -2px);
		box-shadow: 5px 5px 0 #1a1a1a;
	}

	.rejoin-btn:active {
		transform: translate(1px, 1px);
		box-shadow: 2px 2px 0 #1a1a1a;
	}

	/* ── Card ── */
	.card {
		width: 100%;
		background: #ffffff;
		border: 3px solid #1a1a1a;
		border-radius: 20px;
		box-shadow: 6px 6px 0 #1a1a1a;
		padding: 1.75rem;
		display: flex;
		flex-direction: column;
		gap: 1.4rem;
	}

	/* ── Toggle ── */
	.toggle {
		display: grid;
		grid-template-columns: 1fr 1fr;
		border: 2.5px solid #1a1a1a;
		border-radius: 50px;
		overflow: hidden;
		background: #f0ece0;
	}

	.toggle-btn {
		padding: 0.6rem 1rem;
		border: none;
		background: transparent;
		font-family: 'Bangers', cursive;
		font-size: 1.1rem;
		letter-spacing: 0.18em;
		color: #aaa;
		cursor: pointer;
		transition:
			background 0.2s,
			color 0.2s;
	}

	.toggle-btn.active {
		background: #ffd60a;
		color: #1a1a1a;
	}

	/* ── Form ── */
	.game-form {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: 0.4rem;
	}

	.game-input {
		width: 100%;
		padding: 0.85rem 1rem;
		background: #fafaf7;
		border: 2.5px solid #1a1a1a;
		border-radius: 12px;
		color: #1a1a1a;
		font-family: 'Bangers', cursive;
		font-size: 1.5rem;
		letter-spacing: 0.3em;
		text-align: center;
		outline: none;
		transition: box-shadow 0.2s;
	}

	.game-input::placeholder {
		color: #c0b898;
		letter-spacing: 0.15em;
		font-size: 1.1rem;
	}

	.game-input:focus {
		box-shadow: 0 0 0 3px #ffd60a;
	}

	.game-input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.error-row {
		min-height: 1.4rem;
		text-align: center;
	}

	.error {
		font-size: 0.85rem;
		font-weight: 800;
		color: #ff4747;
	}

	/* ── Buttons ── */
	.btn-primary {
		padding: 0.85rem 2rem;
		background: #ffd60a;
		border: 2.5px solid #1a1a1a;
		border-radius: 50px;
		box-shadow: 4px 4px 0 #1a1a1a;
		color: #1a1a1a;
		font-family: 'Bangers', cursive;
		font-size: 1.3rem;
		letter-spacing: 0.14em;
		cursor: pointer;
		transition:
			transform 0.1s,
			box-shadow 0.1s;
		width: 100%;
	}

	.btn-primary:hover:not(:disabled) {
		transform: translate(-2px, -2px);
		box-shadow: 6px 6px 0 #1a1a1a;
	}

	.btn-primary:active:not(:disabled) {
		transform: translate(2px, 2px);
		box-shadow: 2px 2px 0 #1a1a1a;
	}

	.btn-primary:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.btn-create {
		background: #ff6b35;
		color: #ffffff;
	}

	/* ── Hint ── */
	.hint {
		font-size: 0.8rem;
		font-weight: 700;
		color: #8b7a55;
		letter-spacing: 0.06em;
		text-align: center;
	}
</style>
