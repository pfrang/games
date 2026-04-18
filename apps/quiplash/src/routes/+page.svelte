<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';

	let { form, data } = $props();
	let playerCookie = $derived(data.playerCookie);

	let mode = $state<'join' | 'create'>('join');
	let loading = $state(false);
	let clearedOnSubmit = $state(false);

	// onMount(() => {
	// 	if (playerCookie?.id && playerCookie?.name && !connection) {
	// 		connection = new Socket(playerCookie.roomCode, playerCookie.id);
	// 	}
	// });

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
				You're already in a game · <span class="rejoin-code">{playerCookie.roomCode}</span>
			</p>
			<a href="/{playerCookie.roomCode}" class="join-btn rejoin-btn">
				<span>BACK TO GAME</span>
			</a>
		</div>
	{/if}
	<div class="card">
		<div class="card-inner">
			<div class="toggle">
				<button
					type="button"
					class="toggle-btn"
					class:active={mode === 'join'}
					onclick={() => switchMode('join')}>JOIN</button
				>
				<button
					type="button"
					class="toggle-btn"
					class:active={mode === 'create'}
					onclick={() => switchMode('create')}>CREATE</button
				>
				<div
					class="toggle-pill"
					style:transform={mode === 'create' ? 'translateX(100%)' : 'translateX(0)'}
				></div>
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
					<div class="input-wrap">
						<input
							type="text"
							name="roomCode"
							placeholder="ENTER ROOM CODE"
							autocomplete="off"
							spellcheck="false"
							maxlength="8"
							disabled={loading}
						/>
					</div>

					<div class="error-wrap">
						{#if visibleError}
							<p class="error">{visibleError}</p>
						{/if}
					</div>

					<button type="submit" class="join-btn" disabled={loading}>
						<span>{loading ? 'JOINING...' : "LET'S GO!"}</span>
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
					<div class="input-wrap">
						<input
							type="text"
							name="playerName"
							placeholder="YOUR NAME"
							autocomplete="off"
							spellcheck="false"
							maxlength="20"
							disabled={loading}
						/>
					</div>

					<div class="error-wrap">
						{#if visibleError}
							<p class="error">{visibleError}</p>
						{/if}
					</div>

					<button type="submit" class="join-btn create" disabled={loading}>
						<span>{loading ? 'CREATING...' : 'CREATE ROOM'}</span>
					</button>
				</form>
			{/if}
		</div>
	</div>

	<p class="hint">
		{mode === 'join'
			? 'Ask your host for the room code'
			: 'Start a new game and invite your friends'}
	</p>
</div>

<style>
	.error-wrap {
		width: 100%;
		text-align: center;
		height: 30px;
	}

	/* ---------- rejoin banner ---------- */
	.rejoin-banner {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 1.25rem 1.5rem;
		border-radius: 16px;
		border: 1.5px solid #a78bfa55;
		background: linear-gradient(135deg, #1a1040 0%, #13132a 100%);
		box-shadow: 0 0 30px #a78bfa22;
		text-align: center;
	}

	.rejoin-text {
		color: #c4b5fd;
		font-size: 0.9rem;
		font-weight: 600;
		letter-spacing: 0.1em;
	}

	.rejoin-code {
		color: #f0abfc;
		font-weight: 800;
		letter-spacing: 0.25em;
	}

	.rejoin-btn {
		padding: 0.7rem 2rem;
		font-size: 0.9rem;
	}

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

	/* ---------- title ---------- */
	.title-wrap {
		text-align: center;
	}

	.title {
		font-size: clamp(3rem, 12vw, 5.5rem);
		font-weight: 900;
		letter-spacing: 0.08em;
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

	.subtitle {
		margin-top: 0.5rem;
		font-size: 0.85rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: #7c6fa0;
	}

	/* ---------- card ---------- */
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
		gap: 1.75rem;
	}

	/* ---------- toggle ---------- */
	.toggle {
		position: relative;
		display: grid;
		grid-template-columns: 1fr 1fr;
		width: 100%;
		background: #0d0d1a;
		border-radius: 50px;
		border: 2px solid #2d2b55;
		overflow: hidden;
	}

	.toggle-pill {
		position: absolute;
		inset: 0;
		width: 50%;
		background: linear-gradient(135deg, #7c3aed, #db2777);
		border-radius: 50px;
		transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
		pointer-events: none;
	}

	.toggle-btn {
		position: relative;
		z-index: 1;
		padding: 0.65rem 1rem;
		border: none;
		background: transparent;
		color: #4a4470;
		font-size: 0.8rem;
		font-weight: 700;
		letter-spacing: 0.2em;
		cursor: pointer;
		transition: color 0.2s;
	}

	.toggle-btn.active {
		color: #fff;
	}

	/* ---------- form ---------- */
	.game-form {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.25rem;
	}

	.input-wrap {
		width: 100%;
	}

	.input-wrap input {
		width: 100%;
		padding: 0.9rem 1.25rem;
		border-radius: 12px;
		border: 2px solid #2d2b55;
		background: #0d0d1a;
		color: #e2d9f3;
		font-size: 1.35rem;
		font-weight: 700;
		letter-spacing: 0.35em;
		text-align: center;
		text-transform: uppercase;
		outline: none;
		transition:
			border-color 0.2s,
			box-shadow 0.2s;
		caret-color: #a78bfa;
	}

	.input-wrap input::placeholder {
		color: #3d3765;
		letter-spacing: 0.2em;
		font-weight: 500;
		font-size: 1rem;
	}

	.input-wrap input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.input-wrap input:focus {
		border-color: #a78bfa;
		box-shadow:
			0 0 0 3px #a78bfa33,
			0 0 20px #a78bfa22;
	}

	/* ---------- error ---------- */
	.error {
		color: #f87171;
		font-size: 0.85rem;
		font-weight: 600;
		letter-spacing: 0.05em;
	}

	/* ---------- button ---------- */
	.join-btn {
		position: relative;
		padding: 0.9rem 3rem;
		border: none;
		border-radius: 50px;
		background: linear-gradient(135deg, #7c3aed, #db2777);
		color: #fff;
		font-size: 1.1rem;
		font-weight: 800;
		letter-spacing: 0.18em;
		cursor: pointer;
		overflow: hidden;
		transition:
			transform 0.15s,
			box-shadow 0.15s;
		box-shadow: 0 4px 20px #7c3aed55;
	}

	.join-btn.create {
		background: linear-gradient(135deg, #0ea5e9, #6366f1);
		box-shadow: 0 4px 20px #0ea5e955;
	}

	.join-btn::before {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(135deg, #a855f7, #ec4899);
		opacity: 0;
		transition: opacity 0.2s;
	}

	.join-btn.create::before {
		background: linear-gradient(135deg, #38bdf8, #818cf8);
	}

	.join-btn:hover {
		transform: translateY(-2px) scale(1.03);
		box-shadow: 0 8px 30px #7c3aed77;
	}
	.join-btn.create:hover {
		box-shadow: 0 8px 30px #0ea5e977;
	}
	.join-btn:hover::before {
		opacity: 1;
	}
	.join-btn:active {
		transform: translateY(1px) scale(0.98);
	}
	.join-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none;
		box-shadow: none;
	}

	.join-btn span {
		position: relative;
		z-index: 1;
	}

	/* ---------- hint ---------- */
	.hint {
		font-size: 0.8rem;
		color: #4a4470;
		letter-spacing: 0.08em;
	}
</style>
