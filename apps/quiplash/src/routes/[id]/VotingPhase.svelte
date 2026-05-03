<script lang="ts">
	import { enhance } from '$app/forms';
	import type { Player } from '@games/db/types';
	import type { VotingAnswer } from '$lib/websocket';

	interface Props {
		rounds: number[];
		answers: VotingAnswer[];
		endsAt: string;
		players: Player[];
		playerId: string | null;
		playerVoteCounts: Map<string, number>;
	}

	let { rounds, answers, endsAt, players, playerId, playerVoteCounts }: Props = $props();

	const VOTE_DURATION = 60;
	const RADIUS = 52;
	const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

	let timeLeft = $state(VOTE_DURATION);
	let myVotes = $state<Map<number, string>>(new Map());

	let timerColor = $derived(timeLeft > 30 ? '#34d399' : timeLeft > 15 ? '#fbbf24' : '#ef4444');
	let timerGlowRgb = $derived(
		timeLeft > 30 ? '52,211,153' : timeLeft > 15 ? '251,191,36' : '239,68,68'
	);
	let dashOffset = $derived(
		CIRCUMFERENCE * (1 - Math.max(0, Math.min(timeLeft, VOTE_DURATION)) / VOTE_DURATION)
	);
	let isUrgent = $derived(timeLeft <= 15 && timeLeft > 0);

	let answersByRound = $derived.by(() => {
		const groups = new Map<number, { question: string; entries: VotingAnswer[] }>();
		for (const a of answers) {
			if (!groups.has(a.roundNumber)) {
				groups.set(a.roundNumber, { question: a.question, entries: [] });
			}
			groups.get(a.roundNumber)!.entries.push(a);
		}
		return [...groups.entries()]
			.filter(([rn]) => rounds.includes(rn))
			.sort(([a], [b]) => a - b);
	});

	let allVoted = $derived(myVotes.size === rounds.length);

	$effect(() => {
		if (!endsAt) return;
		const end = new Date(endsAt).getTime();
		const update = () => {
			timeLeft = Math.max(0, Math.ceil((end - Date.now()) / 1000));
		};
		update();
		const interval = setInterval(update, 250);
		return () => clearInterval(interval);
	});
</script>

<div class="voting-wrap">
	<!-- Header -->
	<div class="v-header">
		<div class="v-title">
			<span class="v-label">VOTING</span>
			<span class="v-label accent">ROUND</span>
		</div>
		<p class="v-sub">pick your favourite answer for each question</p>
	</div>

	<!-- Timer -->
	<div
		class="timer-ring"
		class:urgent={isUrgent}
		style="--glow-rgb: {timerGlowRgb}; --timer-color: {timerColor}"
	>
		{#if timeLeft === 0}
			<div class="transitioning">
				<span class="t-dot"></span>
				<span class="t-dot"></span>
				<span class="t-dot"></span>
			</div>
		{:else}
			<svg viewBox="0 0 120 120" class="ring-svg">
				<circle cx="60" cy="60" r={RADIUS} fill="none" stroke="#1a1535" stroke-width="7" />
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
					font-family="monospace, Courier New">{timeLeft}</text
				>
				<text
					x="60"
					y="75"
					text-anchor="middle"
					dominant-baseline="central"
					fill="#4a4470"
					font-size="8"
					font-weight="700"
					font-family="monospace, Courier New"
					letter-spacing="3">SEC</text
				>
			</svg>
		{/if}
	</div>

	{#if allVoted}
		<div class="all-voted-banner">
			<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
				<path
					d="M2.5 8.5L6.5 12.5L13.5 4.5"
					stroke="#34d399"
					stroke-width="2.2"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
			<span>ALL VOTES IN — WAITING FOR OTHERS</span>
		</div>
	{/if}

	<!-- Round groups -->
	<div class="rounds-list">
		{#each answersByRound as [roundNum, { question: q, entries }]}
			{@const voted = myVotes.get(roundNum)}
			<div class="round-block" class:voted={!!voted}>
				<div class="rb-header">
					<span class="rb-badge">R{roundNum + 1}</span>
					<span class="rb-question">{q}</span>
					{#if voted}
						<span class="vote-locked-tag">
							<svg width="10" height="10" viewBox="0 0 10 10" fill="none">
								<path
									d="M1.5 5.5L4 8L8.5 2.5"
									stroke="#fbbf24"
									stroke-width="1.8"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							</svg>
							VOTE LOCKED
						</span>
					{/if}
				</div>

				<div class="answer-cards">
					{#each entries as answer (answer.answerId)}
						{@const isOwn = answer.playerId === playerId}
						{@const isSelected = voted === answer.answerId}
						{@const isDimmed = !!voted && !isSelected}

						{#if isOwn}
							<div class="answer-card own" class:dimmed={isDimmed}>
								<div class="card-name">
									{answer.playerName}
									<span class="own-tag">YOUR ANSWER</span>
								</div>
								<div class="card-text">{answer.answer}</div>
							</div>
						{:else}
							<form
								method="POST"
								action="?/submit_vote"
								use:enhance={() => {
									return async ({ result, update }) => {
										if (result.type === 'success' || result.type === 'redirect') {
											myVotes = new Map([...myVotes, [answer.roundNumber, answer.answerId]]);
										}
										await update({ reset: false });
									};
								}}
							>
								<input type="hidden" name="answerId" value={answer.answerId} />
								<input type="hidden" name="roundNumber" value={answer.roundNumber} />
								<button
									type="submit"
									class="answer-card vote-card"
									class:selected={isSelected}
									class:dimmed={isDimmed}
									disabled={!!voted}
								>
									<div class="card-name">{answer.playerName}</div>
									<div class="card-text">{answer.answer}</div>
									{#if isSelected}
										<div class="selected-indicator">
											<svg width="12" height="12" viewBox="0 0 12 12" fill="none">
												<path
													d="M1.5 6.5L4.5 9.5L10.5 2.5"
													stroke="#fbbf24"
													stroke-width="2"
													stroke-linecap="round"
													stroke-linejoin="round"
												/>
											</svg>
											VOTED
										</div>
									{:else if !voted}
										<div class="vote-hint">TAP TO VOTE</div>
									{/if}
								</button>
							</form>
						{/if}
					{/each}
				</div>
			</div>
		{/each}
	</div>

	<!-- Player vote tracker -->
	{#if players.length > 0}
		<div class="tracker-section">
			<div class="tracker-label">VOTERS</div>
			<div class="tracker-grid">
				{#each players as p (p.id)}
					{@const count = playerVoteCounts.get(p.id) ?? 0}
					{@const done = count >= rounds.length}
					<div class="track-chip" class:done>
						<span class="track-pip" class:done></span>
						<span class="track-name">{p.name}</span>
						<span class="track-count" class:done>{count}/{rounds.length}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.voting-wrap {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
	}

	/* ── Header ── */
	.v-header {
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.35rem;
	}
	.v-title {
		display: flex;
		gap: 0.5rem;
		align-items: baseline;
	}
	.v-label {
		font-size: 1.4rem;
		font-weight: 900;
		letter-spacing: 0.22em;
		color: #e2d9f3;
	}
	.v-label.accent {
		background: linear-gradient(90deg, #f9a8d4, #a78bfa);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		filter: drop-shadow(0 0 10px #a78bfa66);
	}
	.v-sub {
		font-size: 0.68rem;
		letter-spacing: 0.15em;
		color: #4a4470;
		text-transform: uppercase;
	}

	/* ── Timer ── */
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
		0%,
		100% {
			filter: drop-shadow(0 0 14px rgba(var(--glow-rgb), 0.4));
		}
		50% {
			filter: drop-shadow(0 0 28px rgba(var(--glow-rgb), 0.85));
		}
	}
	.ring-svg {
		width: 100%;
		height: 100%;
	}
	.ring-arc {
		transition:
			stroke-dashoffset 0.26s linear,
			stroke 0.5s ease;
	}
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
			opacity: 0.45;
		}
		50% {
			transform: translateY(-9px);
			opacity: 1;
		}
	}

	/* ── All voted banner ── */
	.all-voted-banner {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		background: #081a10;
		border: 1.5px solid #34d39940;
		border-radius: 99px;
		padding: 0.55rem 1.2rem;
		color: #34d399;
		font-size: 0.75rem;
		font-weight: 800;
		letter-spacing: 0.15em;
		box-shadow: 0 0 18px #34d39918;
		animation: banner-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) both;
	}
	@keyframes banner-in {
		from {
			opacity: 0;
			transform: scale(0.92) translateY(4px);
		}
		to {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}

	/* ── Round blocks ── */
	.rounds-list {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.round-block {
		width: 100%;
		background: #080810;
		border: 1px solid #1e1c38;
		border-radius: 14px;
		overflow: hidden;
		transition: border-color 0.3s;
	}
	.round-block.voted {
		border-color: #fbbf2430;
	}
	.rb-header {
		display: flex;
		align-items: flex-start;
		gap: 0.65rem;
		padding: 0.7rem 0.9rem;
		background: #0d0d20;
		border-bottom: 1px solid #1e1c38;
		flex-wrap: wrap;
	}
	.rb-badge {
		font-size: 0.58rem;
		font-weight: 900;
		letter-spacing: 0.15em;
		color: #a78bfa;
		background: #1e1a3a;
		border: 1px solid #4a4470;
		border-radius: 4px;
		padding: 0.12rem 0.38rem;
		flex-shrink: 0;
		margin-top: 0.12rem;
	}
	.rb-question {
		font-size: 0.8rem;
		font-weight: 600;
		color: #7c6fa0;
		line-height: 1.45;
		flex: 1;
	}
	.vote-locked-tag {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.6rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		color: #fbbf24;
		background: #1a1200;
		border: 1px solid #fbbf2435;
		border-radius: 99px;
		padding: 0.15rem 0.55rem;
		flex-shrink: 0;
		margin-top: 0.08rem;
		animation: tag-in 0.25s cubic-bezier(0.22, 1, 0.36, 1) both;
	}
	@keyframes tag-in {
		from {
			opacity: 0;
			transform: scale(0.85);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	/* ── Answer cards ── */
	.answer-cards {
		display: flex;
		flex-direction: column;
		gap: 0;
	}
	.answer-cards form {
		display: contents;
	}
	.answer-card {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.7rem 0.9rem;
		border-bottom: 1px solid #0d0d1a;
		background: transparent;
		transition:
			background 0.2s,
			opacity 0.25s;
		text-align: left;
		width: 100%;
		box-sizing: border-box;
	}
	.answer-card:last-child,
	.answer-cards > form:last-child .answer-card {
		border-bottom: none;
	}
	.answer-card.own {
		opacity: 0.45;
		cursor: default;
	}
	.answer-card.dimmed {
		opacity: 0.25;
	}
	.vote-card {
		cursor: pointer;
		font-family: inherit;
		border: none;
		color: inherit;
		position: relative;
	}
	.vote-card:not(:disabled):not(.selected):hover {
		background: #13132a;
	}
	.vote-card:not(:disabled):not(.selected):active {
		background: #1a1535;
	}
	.vote-card.selected {
		background: #1a1200;
		border-left: 2px solid #fbbf24;
		padding-left: calc(0.9rem - 2px);
	}
	.vote-card:disabled:not(.selected) {
		cursor: default;
	}
	.card-name {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		color: #4a4470;
	}
	.vote-card.selected .card-name {
		color: #fbbf24cc;
	}
	.card-text {
		font-size: 0.9rem;
		font-weight: 600;
		color: #c4b5fd;
		line-height: 1.4;
	}
	.vote-card.selected .card-text {
		color: #fde68a;
	}
	.own-tag {
		font-size: 0.55rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		color: #7c3aed;
		background: #2d1b69;
		border-radius: 99px;
		padding: 0.1rem 0.38rem;
	}
	.selected-indicator {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.58rem;
		font-weight: 800;
		letter-spacing: 0.18em;
		color: #fbbf24;
		margin-top: 0.1rem;
	}
	.vote-hint {
		font-size: 0.56rem;
		font-weight: 700;
		letter-spacing: 0.2em;
		color: #2d2b55;
		margin-top: 0.1rem;
		transition: color 0.2s;
	}
	.vote-card:not(:disabled):hover .vote-hint {
		color: #a78bfa66;
	}

	/* ── Tracker ── */
	.tracker-section {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.tracker-label {
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.25em;
		color: #2d2b55;
		text-align: center;
	}
	.tracker-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem;
	}
	.track-chip {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.3rem 0.7rem;
		border-radius: 99px;
		background: #080810;
		border: 1px solid #1e1c38;
		font-size: 0.72rem;
		font-weight: 600;
		color: #3a3560;
		letter-spacing: 0.04em;
		transition:
			border-color 0.3s,
			color 0.3s;
	}
	.track-chip.done {
		border-color: #a78bfa40;
		color: #a78bfa;
		background: #13102a;
	}
	.track-pip {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: #2d2b55;
		flex-shrink: 0;
		transition:
			background 0.3s,
			box-shadow 0.3s;
	}
	.track-pip.done {
		background: #a78bfa;
		box-shadow: 0 0 5px #a78bfa88;
	}
	.track-name {
		line-height: 1;
	}
	.track-count {
		font-size: 0.6rem;
		font-weight: 700;
		color: #2d2b55;
		letter-spacing: 0.05em;
		transition: color 0.3s;
	}
	.track-count.done {
		color: #a78bfa;
	}
</style>
