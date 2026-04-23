<script lang="ts">
	import { enhance } from '$app/forms';
	import type { Player } from '@games/db/types';
	import type { GameAnswer } from '$lib/websocket';

	interface Props {
		round: number;
		question: string;
		endsAt: string;
		phase: 'answering' | 'finished';
		hasSubmitted: boolean;
		players: Player[];
		playerId: string | null;
		submittedPlayerIds: Set<string>;
		answers: GameAnswer[];
		onSubmitted: () => void;
	}

	let {
		round,
		question,
		endsAt,
		phase,
		hasSubmitted,
		players,
		playerId,
		submittedPlayerIds,
		answers,
		onSubmitted
	}: Props = $props();

	const TOTAL_ROUNDS = 10;
	const ROUND_DURATION = 60;
	const RADIUS = 52;
	const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

	let timeLeft = $state(ROUND_DURATION);

	let timerColor = $derived(
		timeLeft > 30 ? '#34d399' : timeLeft > 15 ? '#fbbf24' : '#ef4444'
	);

	let timerGlowRgb = $derived(
		timeLeft > 30 ? '52,211,153' : timeLeft > 15 ? '251,191,36' : '239,68,68'
	);

	let dashOffset = $derived(
		CIRCUMFERENCE * (1 - Math.max(0, Math.min(timeLeft, ROUND_DURATION)) / ROUND_DURATION)
	);

	let isTransitioning = $derived(timeLeft === 0 && phase === 'answering');

	$effect(() => {
		if (phase === 'finished' || !endsAt) return;

		const update = () => {
			const remaining = Math.max(
				0,
				Math.ceil((new Date(endsAt).getTime() - Date.now()) / 1000)
			);
			timeLeft = remaining;
		};

		update();
		const interval = setInterval(update, 250);
		return () => clearInterval(interval);
	});

	let answersByRound = $derived.by(() => {
		const groups = new Map<number, { question: string; entries: GameAnswer[] }>();
		for (const a of answers) {
			if (!groups.has(a.roundNumber)) {
				groups.set(a.roundNumber, { question: a.question, entries: [] });
			}
			groups.get(a.roundNumber)!.entries.push(a);
		}
		return [...groups.entries()].sort(([a], [b]) => a - b);
	});
</script>

{#if phase === 'finished'}
	<div class="game-over">
		<div class="go-headline">
			<span class="go-word">GAME</span>
			<span class="go-word gradient">OVER</span>
		</div>
		<p class="go-sub">thanks for playing</p>

		{#if answersByRound.length > 0}
			<div class="divider-line"></div>
			<div class="results">
				{#each answersByRound as [roundNum, { question: q, entries }]}
					<div class="round-block">
						<div class="rb-header">
							<span class="rb-badge">R{roundNum + 1}</span>
							<span class="rb-question">{q}</span>
						</div>
						<div class="rb-answers">
							{#each entries as entry}
								<div class="rb-row" class:mine={entry.playerId === playerId}>
									<span class="rb-name">{entry.playerName}</span>
									<span class="rb-answer">{entry.answer}</span>
									{#if entry.playerId === playerId}
										<span class="you-tag">YOU</span>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<p class="empty-note">No answers were recorded.</p>
		{/if}
	</div>
{:else}
	<div class="round-indicator">
		<span class="ri-current">ROUND {round + 1}</span>
		<span class="ri-slash">/</span>
		<span class="ri-total">{TOTAL_ROUNDS}</span>
	</div>

	<!-- Circular countdown timer -->
	<div
		class="timer-ring"
		class:urgent={timeLeft <= 15 && timeLeft > 0}
		style="--glow-rgb: {timerGlowRgb}; --timer-color: {timerColor}"
	>
		{#if isTransitioning}
			<div class="transitioning">
				<span class="t-dot"></span>
				<span class="t-dot"></span>
				<span class="t-dot"></span>
			</div>
		{:else}
			<svg viewBox="0 0 120 120" class="ring-svg">
				<circle
					cx="60"
					cy="60"
					r={RADIUS}
					fill="none"
					stroke="#1a1535"
					stroke-width="7"
				/>
				<circle
					cx="60"
					cy="60"
					r={RADIUS}
					fill="none"
					stroke={timerColor}
					stroke-width="7"
					stroke-linecap="round"
					stroke-dasharray={CIRCUMFERENCE}
					stroke-dashoffset={dashOffset}
					transform="rotate(-90 60 60)"
					class="ring-arc"
				/>
				<text
					x="60"
					y="55"
					text-anchor="middle"
					dominant-baseline="central"
					fill={timerColor}
					font-size="30"
					font-weight="900"
					font-family="monospace, Courier New"
				>{timeLeft}</text>
				<text
					x="60"
					y="75"
					text-anchor="middle"
					dominant-baseline="central"
					fill="#4a4470"
					font-size="8"
					font-weight="700"
					font-family="monospace, Courier New"
					letter-spacing="3"
				>SEC</text>
			</svg>
		{/if}
	</div>

	<!-- Question -->
	{#key round}
		<div class="question-card">
			<span class="q-glyph">"</span>
			<p class="q-body">{question}</p>
		</div>
	{/key}

	<!-- Answer interaction area -->
	{#if hasSubmitted}
		<div class="locked-state">
			<div class="locked-badge">
				<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
					<path d="M2 7.5L5.5 11L12 3.5" stroke="#34d399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
				ANSWER LOCKED IN
			</div>
			<p class="locked-sub">Waiting for the round to end…</p>
		</div>
	{:else if timeLeft > 0}
		<form
			method="POST"
			action="?/submit_answer"
			class="answer-form"
			use:enhance={() => async ({ result }) => {
				if (result.type === 'success') {
					onSubmitted();
				}
			}}
		>
			<input type="hidden" name="round" value={round} />
			<input
				type="text"
				name="answer"
				class="answer-field"
				placeholder="Type your answer…"
				autocomplete="off"
				maxlength="200"
				required
			/>
			<button type="submit" class="send-btn">SUBMIT</button>
		</form>
	{:else}
		<p class="times-up">TIME'S UP</p>
	{/if}

	<!-- Submission tracker -->
	{#if players.length > 0}
		<div class="tracker">
			{#each players as p (p.id)}
				<div class="track-chip" class:done={submittedPlayerIds.has(p.id)}>
					<span class="track-pip" class:done={submittedPlayerIds.has(p.id)}></span>
					{p.name}
				</div>
			{/each}
		</div>
	{/if}
{/if}

<style>
	/* ── Round indicator ── */
	.round-indicator {
		display: flex;
		align-items: baseline;
		gap: 0.45rem;
	}
	.ri-current {
		font-size: 1rem;
		font-weight: 900;
		letter-spacing: 0.22em;
		background: linear-gradient(90deg, #a78bfa, #f9a8d4);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}
	.ri-slash,
	.ri-total {
		font-size: 0.9rem;
		font-weight: 700;
		color: #4a4470;
		letter-spacing: 0.1em;
	}

	/* ── Timer ring ── */
	.timer-ring {
		position: relative;
		width: 128px;
		height: 128px;
		display: flex;
		align-items: center;
		justify-content: center;
		filter: drop-shadow(0 0 16px rgba(var(--glow-rgb), 0.45));
		transition: filter 0.4s ease;
	}
	.timer-ring.urgent {
		animation: ring-pulse 0.8s ease-in-out infinite;
	}
	@keyframes ring-pulse {
		0%, 100% { filter: drop-shadow(0 0 14px rgba(var(--glow-rgb), 0.4)); }
		50%       { filter: drop-shadow(0 0 28px rgba(var(--glow-rgb), 0.85)); }
	}
	.ring-svg {
		width: 100%;
		height: 100%;
	}
	.ring-arc {
		transition: stroke-dashoffset 0.26s linear, stroke 0.5s ease;
	}

	/* Transitioning dots */
	.transitioning {
		display: flex;
		gap: 0.45rem;
		align-items: center;
	}
	.t-dot {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		background: #a78bfa;
		animation: t-bounce 1.1s ease-in-out infinite;
	}
	.t-dot:nth-child(2) { animation-delay: 0.18s; }
	.t-dot:nth-child(3) { animation-delay: 0.36s; }
	@keyframes t-bounce {
		0%, 100% { transform: translateY(0);    opacity: 0.45; }
		50%       { transform: translateY(-9px); opacity: 1; }
	}

	/* ── Question card ── */
	.question-card {
		width: 100%;
		position: relative;
		background: #0d0d1e;
		border: 1px solid #2d2b55;
		border-radius: 16px;
		padding: 1.4rem 1.5rem 1.4rem 2.4rem;
		animation: q-appear 0.35s cubic-bezier(0.22, 1, 0.36, 1) both;
	}
	@keyframes q-appear {
		from { opacity: 0; transform: translateY(8px); }
		to   { opacity: 1; transform: translateY(0); }
	}
	.question-card::before {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: 16px;
		background: linear-gradient(135deg, #a78bfa0d, #f472b60a);
		pointer-events: none;
	}
	.q-glyph {
		position: absolute;
		top: -0.15rem;
		left: 0.65rem;
		font-size: 2.8rem;
		font-weight: 900;
		color: #a78bfa25;
		line-height: 1;
		font-family: Georgia, 'Times New Roman', serif;
		user-select: none;
	}
	.q-body {
		font-size: 1rem;
		font-weight: 600;
		color: #e2d9f3;
		line-height: 1.6;
		letter-spacing: 0.01em;
	}

	/* ── Answer form ── */
	.answer-form {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
	}
	.answer-field {
		width: 100%;
		background: #090915;
		border: 1.5px solid #2d2b55;
		border-radius: 10px;
		padding: 0.8rem 1rem;
		color: #e2d9f3;
		font-size: 0.95rem;
		font-family: inherit;
		outline: none;
		transition: border-color 0.2s, box-shadow 0.2s;
		box-sizing: border-box;
	}
	.answer-field::placeholder {
		color: #3a3560;
	}
	.answer-field:focus {
		border-color: #7c3aed;
		box-shadow: 0 0 0 3px #7c3aed1a;
	}
	.send-btn {
		width: 100%;
		padding: 0.8rem;
		background: linear-gradient(135deg, #6d28d9, #a855f7);
		border: none;
		border-radius: 10px;
		color: #fff;
		font-size: 0.85rem;
		font-weight: 900;
		letter-spacing: 0.25em;
		cursor: pointer;
		transition: box-shadow 0.2s, transform 0.1s;
		box-shadow: 0 4px 18px #7c3aed33;
	}
	.send-btn:hover {
		box-shadow: 0 4px 26px #7c3aed55;
	}
	.send-btn:active {
		transform: scale(0.98);
	}

	/* ── Locked / submitted ── */
	.locked-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.45rem;
	}
	.locked-badge {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		background: #081a10;
		border: 1.5px solid #34d39940;
		border-radius: 99px;
		padding: 0.45rem 1.1rem;
		color: #34d399;
		font-size: 0.8rem;
		font-weight: 800;
		letter-spacing: 0.18em;
		box-shadow: 0 0 14px #34d39915;
		animation: badge-in 0.3s cubic-bezier(0.22, 1, 0.36, 1) both;
	}
	@keyframes badge-in {
		from { opacity: 0; transform: scale(0.9); }
		to   { opacity: 1; transform: scale(1); }
	}
	.locked-sub {
		font-size: 0.72rem;
		color: #4a4470;
		letter-spacing: 0.1em;
	}
	.times-up {
		font-size: 0.95rem;
		font-weight: 900;
		letter-spacing: 0.35em;
		color: #ef4444;
		text-shadow: 0 0 18px #ef444466;
	}

	/* ── Submission tracker ── */
	.tracker {
		width: 100%;
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem;
	}
	.track-chip {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.28rem 0.65rem;
		border-radius: 99px;
		background: #080810;
		border: 1px solid #1e1c38;
		font-size: 0.72rem;
		font-weight: 600;
		color: #3a3560;
		letter-spacing: 0.04em;
		transition: border-color 0.3s, color 0.3s;
	}
	.track-chip.done {
		border-color: #34d39930;
		color: #7c6fa0;
	}
	.track-pip {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: #2d2b55;
		flex-shrink: 0;
		transition: background 0.3s, box-shadow 0.3s;
	}
	.track-pip.done {
		background: #34d399;
		box-shadow: 0 0 5px #34d39977;
	}

	/* ── Game Over ── */
	.game-over {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.25rem;
	}
	.go-headline {
		display: flex;
		gap: 0.55rem;
		align-items: baseline;
	}
	.go-word {
		font-size: 2.2rem;
		font-weight: 900;
		letter-spacing: 0.18em;
		color: #e2d9f3;
	}
	.go-word.gradient {
		background: linear-gradient(135deg, #f9a8d4 0%, #a78bfa 50%, #60a5fa 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		filter: drop-shadow(0 0 10px #a78bfa55);
	}
	.go-sub {
		font-size: 0.7rem;
		color: #4a4470;
		letter-spacing: 0.25em;
		text-transform: uppercase;
		margin-top: -0.75rem;
	}

	.divider-line {
		width: 100%;
		height: 1px;
		background: linear-gradient(90deg, transparent, #2d2b55, transparent);
	}

	.results {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}
	.round-block {
		background: #080810;
		border: 1px solid #1e1c38;
		border-radius: 12px;
		overflow: hidden;
	}
	.rb-header {
		display: flex;
		align-items: flex-start;
		gap: 0.65rem;
		padding: 0.65rem 0.9rem;
		background: #0d0d20;
		border-bottom: 1px solid #1e1c38;
	}
	.rb-badge {
		font-size: 0.6rem;
		font-weight: 900;
		letter-spacing: 0.15em;
		color: #a78bfa;
		background: #1e1a3a;
		border: 1px solid #4a4470;
		border-radius: 4px;
		padding: 0.12rem 0.38rem;
		flex-shrink: 0;
		margin-top: 0.1rem;
	}
	.rb-question {
		font-size: 0.78rem;
		font-weight: 600;
		color: #7c6fa0;
		line-height: 1.45;
	}
	.rb-answers {
		display: flex;
		flex-direction: column;
	}
	.rb-row {
		display: flex;
		align-items: baseline;
		gap: 0.6rem;
		padding: 0.55rem 0.9rem;
		border-bottom: 1px solid #0d0d1a;
		transition: background 0.15s;
	}
	.rb-row:last-child {
		border-bottom: none;
	}
	.rb-row.mine {
		background: #130f28;
	}
	.rb-name {
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		color: #4a4470;
		min-width: 52px;
		flex-shrink: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.rb-row.mine .rb-name {
		color: #a78bfa;
	}
	.rb-answer {
		font-size: 0.85rem;
		color: #c4b5fd;
		line-height: 1.4;
		flex: 1;
	}
	.rb-row.mine .rb-answer {
		color: #e2d9f3;
	}
	.you-tag {
		font-size: 0.55rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		color: #7c3aed;
		background: #2d1b69;
		border-radius: 99px;
		padding: 0.12rem 0.35rem;
		flex-shrink: 0;
	}

	.empty-note {
		font-size: 0.8rem;
		color: #4a4470;
		letter-spacing: 0.1em;
	}
</style>
