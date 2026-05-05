<script lang="ts">
	import { enhance } from '$app/forms';
	import type { Player } from '@games/db/types';
	import type { GameAnswer, VotingAnswer, VoteTally, ScoreboardEntry } from '$lib/websocket';
	import GameDone from './GameDone.svelte';
	import VotingPhase from './VotingPhase.svelte';

	interface Props {
		round: number;
		totalRounds: number;
		question: string;
		endsAt: string;
		phase: 'answering' | 'voting' | 'finished';
		hasSubmitted: boolean;
		players: Player[];
		playerId: string | null;
		submittedPlayerIds: Set<string>;
		answers: GameAnswer[];
		scoreboard: ScoreboardEntry[];
		votingBatchRounds: number[];
		votingCurrentRound: number;
		votingAnswers: VotingAnswer[];
		votingEndsAt: string;
		votingSubPhase: 'voting' | 'results' | 'scoreboard';
		votingTallies: VoteTally[];
		votingResultsQuestion: string;
		votingResultsEndsAt: string;
		playerVoteCounts: Map<string, number>;
		votingBatchScoreboard: ScoreboardEntry[];
	}

	let {
		round,
		totalRounds,
		question,
		endsAt,
		phase,
		hasSubmitted,
		players,
		playerId,
		submittedPlayerIds,
		answers,
		scoreboard,
		votingBatchRounds,
		votingCurrentRound,
		votingAnswers,
		votingEndsAt,
		votingSubPhase,
		votingTallies,
		votingResultsQuestion,
		votingResultsEndsAt,
		playerVoteCounts,
		votingBatchScoreboard
	}: Props = $props();

	const ROUND_DURATION = 60;
	const RADIUS = 50;
	const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

	let timeLeft = $state(ROUND_DURATION);

	let timerColor = $derived(timeLeft > 30 ? '#06d6a0' : timeLeft > 15 ? '#ffd60a' : '#ff4747');

	let dashOffset = $derived(
		CIRCUMFERENCE * (1 - Math.max(0, Math.min(timeLeft, ROUND_DURATION)) / ROUND_DURATION)
	);

	let isTransitioning = $derived(timeLeft === 0 && phase === 'answering');

	$effect(() => {
		if (phase === 'finished' || !endsAt) return;

		const roundEndsAt = new Date(endsAt).getTime();

		const update = () => {
			timeLeft = Math.max(0, Math.ceil((roundEndsAt - Date.now()) / 1000));
		};

		update();
		const interval = setInterval(update, 250);
		return () => clearInterval(interval);
	});
</script>

{#if phase === 'finished'}
	<GameDone {answers} {playerId} {scoreboard} />
{:else if phase === 'voting'}
	<VotingPhase
		batchRounds={votingBatchRounds}
		currentRoundNumber={votingCurrentRound}
		answers={votingAnswers}
		endsAt={votingEndsAt}
		subPhase={votingSubPhase}
		tallies={votingTallies}
		talliesQuestion={votingResultsQuestion}
		talliesEndsAt={votingResultsEndsAt}
		{players}
		{playerId}
		{playerVoteCounts}
		batchScoreboard={votingBatchScoreboard}
	/>
{:else}
	<div class="answering-wrap">
		<!-- Round indicator -->
		<div class="round-indicator">
			<span class="round-pill">ROUND {round + 1} / {totalRounds}</span>
		</div>

		<!-- Countdown timer -->
		<div class="timer-wrap" class:urgent={timeLeft <= 15 && timeLeft > 0}>
			{#if isTransitioning}
				<div class="transitioning">
					<span class="t-dot"></span>
					<span class="t-dot"></span>
					<span class="t-dot"></span>
				</div>
			{:else}
				<svg viewBox="0 0 120 120" class="ring-svg">
					<circle cx="60" cy="60" r="58" fill="white" />
					<circle cx="60" cy="60" r={RADIUS} fill="none" stroke="#e8e0cc" stroke-width="8" />
					<circle
						cx="60"
						cy="60"
						r={RADIUS}
						fill="none"
						stroke={timerColor}
						stroke-width="8"
						stroke-linecap="round"
						stroke-dasharray={CIRCUMFERENCE}
						stroke-dashoffset={dashOffset}
						transform="rotate(-90 60 60)"
						class="ring-arc"
					/>
					<text
						x="60"
						y="57"
						text-anchor="middle"
						dominant-baseline="central"
						fill="#1a1a1a"
						font-size="32"
						font-weight="900"
						font-family="'Bangers', cursive">{timeLeft}</text
					>
					<text
						x="60"
						y="76"
						text-anchor="middle"
						dominant-baseline="central"
						fill="#aaa"
						font-size="9"
						font-weight="700"
						font-family="monospace"
						letter-spacing="3">SEC</text
					>
				</svg>
			{/if}
		</div>

		<!-- Question card with bounce-in animation keyed to round -->
		{#key round}
			<div class="question-card">
				<span class="q-glyph">"</span>
				<p class="q-body">{question}</p>
			</div>
		{/key}

		<!-- Answer area -->
		{#if hasSubmitted}
			<div class="locked-state">
				<div class="locked-badge">
					<svg width="16" height="16" viewBox="0 0 14 14" fill="none">
						<path
							d="M2 7.5L5.5 11L12 3.5"
							stroke="#1a1a1a"
							stroke-width="2.5"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
					ANSWER LOCKED IN!
				</div>
				<p class="locked-sub">Waiting for the round to end…</p>
			</div>
		{:else if timeLeft > 0}
			<form method="POST" action="?/submit_answer" class="answer-form" use:enhance>
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
				<button type="submit" class="send-btn">SUBMIT ✓</button>
			</form>
		{:else}
			<p class="times-up">TIME'S UP!</p>
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
	</div>
{/if}

<style>
	.answering-wrap {
		width: 100%;
		max-width: 540px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.25rem;
	}

	/* ── Round indicator ── */
	.round-indicator {
		width: 100%;
		display: flex;
		justify-content: center;
	}

	.round-pill {
		font-family: 'Bangers', cursive;
		font-size: 1rem;
		letter-spacing: 0.2em;
		color: #1a1a1a;
		background: #ffd60a;
		border: 2px solid #1a1a1a;
		border-radius: 50px;
		padding: 0.3rem 1rem;
		box-shadow: 2px 2px 0 #1a1a1a;
	}

	/* ── Timer ── */
	.timer-wrap {
		width: 130px;
		height: 130px;
		border-radius: 50%;
		border: 3px solid #1a1a1a;
		box-shadow: 4px 4px 0 #1a1a1a;
		overflow: hidden;
		background: white;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.timer-wrap.urgent {
		animation: timer-shake 0.5s ease-in-out infinite;
	}

	@keyframes timer-shake {
		0%,
		100% {
			transform: rotate(0deg);
		}
		25% {
			transform: rotate(-2deg) scale(1.04);
		}
		75% {
			transform: rotate(2deg) scale(1.04);
		}
	}

	.ring-svg {
		width: 100%;
		height: 100%;
	}

	.ring-arc {
		transition:
			stroke-dashoffset 0.26s linear,
			stroke 0.4s ease;
	}

	/* Transitioning dots */
	.transitioning {
		display: flex;
		gap: 0.45rem;
		align-items: center;
	}

	.t-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: #ffd60a;
		border: 2px solid #1a1a1a;
		animation: t-bounce 1.1s ease-in-out infinite;
	}

	.t-dot:nth-child(2) {
		animation-delay: 0.18s;
	}

	.t-dot:nth-child(3) {
		animation-delay: 0.36s;
	}

	@keyframes t-bounce {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-10px);
		}
	}

	/* ── Question card ── */
	.question-card {
		width: 100%;
		position: relative;
		background: #ffffff;
		border: 3px solid #1a1a1a;
		border-radius: 16px;
		box-shadow: 5px 5px 0 #1a1a1a;
		padding: 1.4rem 1.4rem 1.4rem 2.6rem;
		animation: q-bounce-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
	}

	@keyframes q-bounce-in {
		0% {
			opacity: 0;
			transform: translateY(-45px) scale(0.8) rotate(-3deg);
		}
		55% {
			opacity: 1;
			transform: translateY(7px) scale(1.04) rotate(1.5deg);
		}
		75% {
			transform: translateY(-3px) scale(0.99) rotate(-0.5deg);
		}
		90% {
			transform: translateY(2px) scale(1.005) rotate(0.2deg);
		}
		100% {
			opacity: 1;
			transform: translateY(0) scale(1) rotate(0deg);
		}
	}

	.q-glyph {
		position: absolute;
		top: -0.1rem;
		left: 0.6rem;
		font-size: 3.5rem;
		font-weight: 900;
		color: #ffd60a;
		line-height: 1;
		font-family: Georgia, 'Times New Roman', serif;
		user-select: none;
		-webkit-text-stroke: 1px #1a1a1a;
		paint-order: stroke fill;
	}

	.q-body {
		font-size: 1.05rem;
		font-weight: 800;
		color: #1a1a1a;
		line-height: 1.55;
	}

	/* ── Answer form ── */
	.answer-form {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.answer-field {
		width: 100%;
		background: #ffffff;
		border: 2.5px solid #1a1a1a;
		border-radius: 12px;
		padding: 0.85rem 1rem;
		color: #1a1a1a;
		font-size: 0.95rem;
		font-family: 'Nunito', inherit;
		font-weight: 700;
		outline: none;
		transition: box-shadow 0.2s;
		box-sizing: border-box;
	}

	.answer-field::placeholder {
		color: #bbb;
		font-weight: 600;
	}

	.answer-field:focus {
		box-shadow: 0 0 0 3px #ffd60a;
	}

	.send-btn {
		width: 100%;
		padding: 0.8rem;
		background: #ff6b35;
		border: 2.5px solid #1a1a1a;
		border-radius: 12px;
		box-shadow: 4px 4px 0 #1a1a1a;
		color: #ffffff;
		font-family: 'Bangers', cursive;
		font-size: 1.2rem;
		letter-spacing: 0.2em;
		cursor: pointer;
		transition:
			transform 0.1s,
			box-shadow 0.1s;
	}

	.send-btn:hover {
		transform: translate(-2px, -2px);
		box-shadow: 6px 6px 0 #1a1a1a;
	}

	.send-btn:active {
		transform: translate(2px, 2px);
		box-shadow: 2px 2px 0 #1a1a1a;
	}

	/* ── Locked state ── */
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
		background: #06d6a0;
		border: 2.5px solid #1a1a1a;
		border-radius: 50px;
		padding: 0.55rem 1.3rem;
		color: #1a1a1a;
		font-family: 'Bangers', cursive;
		font-size: 1.1rem;
		letter-spacing: 0.15em;
		box-shadow: 3px 3px 0 #1a1a1a;
		animation: badge-pop 0.35s cubic-bezier(0.22, 1, 0.36, 1) both;
	}

	@keyframes badge-pop {
		from {
			opacity: 0;
			transform: scale(0.8);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	.locked-sub {
		font-size: 0.75rem;
		font-weight: 700;
		color: #7a6a4f;
		letter-spacing: 0.08em;
	}

	.times-up {
		font-family: 'Bangers', cursive;
		font-size: 2rem;
		letter-spacing: 0.2em;
		color: #ff4747;
		-webkit-text-stroke: 1.5px #1a1a1a;
		paint-order: stroke fill;
		animation: times-up-shake 0.4s ease-in-out both;
	}

	@keyframes times-up-shake {
		0%,
		100% {
			transform: translateX(0);
		}
		20% {
			transform: translateX(-6px) rotate(-2deg);
		}
		40% {
			transform: translateX(6px) rotate(2deg);
		}
		60% {
			transform: translateX(-4px) rotate(-1deg);
		}
		80% {
			transform: translateX(4px) rotate(1deg);
		}
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
		gap: 0.38rem;
		padding: 0.28rem 0.7rem;
		border-radius: 99px;
		background: #ffffff;
		border: 2px solid #ddd;
		font-size: 0.72rem;
		font-weight: 800;
		color: #bbb;
		letter-spacing: 0.04em;
		transition:
			border-color 0.3s,
			color 0.3s,
			background 0.3s,
			box-shadow 0.3s;
	}

	.track-chip.done {
		border-color: #1a1a1a;
		background: #06d6a0;
		color: #1a1a1a;
		box-shadow: 2px 2px 0 #1a1a1a;
	}

	.track-pip {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: #ddd;
		flex-shrink: 0;
		transition:
			background 0.3s,
			transform 0.3s;
	}

	.track-pip.done {
		background: #1a1a1a;
		transform: scale(1.3);
	}
</style>
