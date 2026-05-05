<script lang="ts">
	import { enhance } from '$app/forms';
	import type { Player } from '@games/db/types';
	import type { VotingAnswer, VoteTally } from '$lib/websocket';

	interface Props {
		batchRounds: number[];
		currentRoundNumber: number;
		answers: VotingAnswer[];
		endsAt: string;
		subPhase: 'voting' | 'results';
		tallies: VoteTally[];
		talliesQuestion: string;
		players: Player[];
		playerId: string | null;
		playerVoteCounts: Map<string, number>;
	}

	let {
		batchRounds,
		currentRoundNumber,
		answers,
		endsAt,
		subPhase,
		tallies,
		talliesQuestion,
		players,
		playerId,
		playerVoteCounts
	}: Props = $props();

	const VOTE_DURATION = 20;
	const RADIUS = 50;
	const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

	let timeLeft = $state(VOTE_DURATION);
	let myVote = $state<string | null>(null);

	// Reset vote selection when question changes
	$effect(() => {
		currentRoundNumber;
		myVote = null;
	});

	let timerColor = $derived(timeLeft > 10 ? '#06d6a0' : timeLeft > 5 ? '#ffd60a' : '#ff4747');
	let dashOffset = $derived(
		CIRCUMFERENCE * (1 - Math.max(0, Math.min(timeLeft, VOTE_DURATION)) / VOTE_DURATION)
	);
	let isUrgent = $derived(timeLeft <= 5 && timeLeft > 0);

	let currentQuestionIndex = $derived(batchRounds.indexOf(currentRoundNumber));

	// The question text — from answers during voting, from talliesQuestion during results
	let question = $derived(subPhase === 'results' ? talliesQuestion : (answers[0]?.question ?? ''));

	let hasVoted = $derived(myVote !== null);
	let allVoted = $derived(
		players.length > 0 &&
			[...playerVoteCounts.values()].filter(Boolean).length >= players.length - 1
	);

	// Sorted tallies: highest votes first
	let sortedTallies = $derived([...tallies].sort((a, b) => b.voteCount - a.voteCount));
	let winnerVoteCount = $derived(sortedTallies[0]?.voteCount ?? 0);

	$effect(() => {
		if (subPhase !== 'voting' || !endsAt) {
			timeLeft = 0;
			return;
		}
		const end = new Date(endsAt).getTime();
		const update = () => {
			timeLeft = Math.max(0, Math.ceil((end - Date.now()) / 1000));
		};
		update();
		const interval = setInterval(update, 250);
		return () => clearInterval(interval);
	});
</script>

<div class="voting-layout">
	<!-- Top bar: title + progress + timer -->
	<div class="voting-topbar">
		<div class="topbar-left">
			<h2 class="v-title">
				{#if subPhase === 'results'}
					<span class="v-word">RESULTS</span>
				{:else}
					<span class="v-word">VOTING</span>
					<span class="v-word accent">TIME</span>
				{/if}
			</h2>
			<div class="progress-dots">
				{#each batchRounds as rn, i}
					<span
						class="p-dot"
						class:current={i === currentQuestionIndex}
						class:done={i < currentQuestionIndex ||
							(i === currentQuestionIndex && subPhase === 'results')}
						aria-label="Question {i + 1}"
					></span>
				{/each}
			</div>
		</div>

		<!-- Timer (only during voting subphase) -->
		{#if subPhase === 'voting'}
			<div class="timer-wrap" class:urgent={isUrgent}>
				{#if timeLeft === 0}
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
		{/if}
	</div>

	<!-- Question card -->
	{#if question}
		{#key currentRoundNumber + subPhase}
			<div class="question-card" class:results-card={subPhase === 'results'}>
				<span class="q-counter">Q{currentQuestionIndex + 1}/{batchRounds.length}</span>
				<span class="q-glyph">"</span>
				<p class="q-body">{question}</p>
				{#if subPhase === 'voting' && hasVoted}
					<div class="voted-overlay">
						<span class="voted-badge">✓ VOTED</span>
					</div>
				{/if}
			</div>
		{/key}
	{/if}

	<!-- VOTING sub-phase: answers to vote on -->
	{#if subPhase === 'voting'}
		{#if answers.length === 0}
			<div class="empty-state">
				<span class="empty-emoji">😬</span>
				<p class="empty-head">OOPS!</p>
				<p class="empty-body">Nobody answered this one...</p>
				<p class="empty-hint">moving on shortly</p>
			</div>
		{:else}
			<div class="answers-grid">
				{#each answers as answer (answer.answerId)}
					{@const isOwn = answer.playerId === playerId}
					{@const isSelected = myVote === answer.answerId}
					{@const isDimmed = hasVoted && !isSelected}

					{#if isOwn}
						<div class="answer-card own" class:dimmed={isDimmed}>
							<span class="player-name">
								{answer.playerName}
								<span class="own-tag">YOU</span>
							</span>
							<p class="answer-text">{answer.answer}</p>
						</div>
					{:else}
						<form
							method="POST"
							action="?/submit_vote"
							use:enhance={() => {
								return async ({ result, update }) => {
									if (result.type === 'success' || result.type === 'redirect') {
										myVote = answer.answerId;
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
								disabled={hasVoted}
							>
								<span class="player-name">{answer.playerName}</span>
								<p class="answer-text">{answer.answer}</p>
								{#if isSelected}
									<span class="vote-indicator selected-indicator">✓ VOTED!</span>
								{:else if !hasVoted}
									<span class="vote-indicator vote-hint">TAP TO VOTE →</span>
								{/if}
							</button>
						</form>
					{/if}
				{/each}
			</div>

			<!-- All voted banner -->
			{#if allVoted}
				<div class="all-voted-banner">
					<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
						<path
							d="M2.5 8.5L6.5 12.5L13.5 4.5"
							stroke="#1a1a1a"
							stroke-width="2.2"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
					ALL VOTES IN — SHOWING RESULTS
				</div>
			{:else if hasVoted}
				<div class="voted-waiting">
					<span>WAITING FOR OTHERS...</span>
				</div>
			{/if}

			<!-- Voter tracker -->
			{#if players.length > 0}
				<div class="tracker-section">
					<span class="tracker-label">VOTERS</span>
					<div class="tracker-grid">
						{#each players as p (p.id)}
							{@const count = playerVoteCounts.get(p.id) ?? 0}
							{@const done = count > 0}
							<div class="track-chip" class:done>
								<span class="track-pip" class:done></span>
								<span>{p.name}</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		{/if}

		<!-- RESULTS sub-phase: show tallies with winner -->
	{:else if subPhase === 'results'}
		{#if sortedTallies.length === 0}
			<div class="empty-state">
				<span class="empty-emoji">🦗</span>
				<p class="empty-head">CRICKETS</p>
				<p class="empty-body">No votes were cast...</p>
			</div>
		{:else}
			<div class="results-grid">
				{#each sortedTallies as tally, i (tally.answerId)}
					{@const isWinner = tally.voteCount === winnerVoteCount && winnerVoteCount > 0}
					{@const isOwn = tally.playerId === playerId}
					<div class="result-card" class:winner={isWinner} class:own={isOwn}>
						{#if isWinner}
							<div class="winner-crown">👑 WINNER</div>
						{/if}
						<div class="result-header">
							<span class="result-name"
								>{tally.playerName}{#if isOwn}
									<span class="own-tag">YOU</span>{/if}</span
							>
							<span class="result-votes" class:winner={isWinner}>
								{tally.voteCount}
								{tally.voteCount === 1 ? 'vote' : 'votes'}
							</span>
						</div>
						<p class="result-answer">{tally.answer}</p>
						<div class="vote-bar">
							<div
								class="vote-bar-fill"
								class:winner={isWinner}
								style="width: {winnerVoteCount > 0
									? Math.round((tally.voteCount / winnerVoteCount) * 100)
									: 0}%"
							></div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</div>

<style>
	.voting-layout {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	/* ── Top bar ── */
	.voting-topbar {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
	}

	.topbar-left {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.v-title {
		display: flex;
		gap: 0.4rem;
		align-items: baseline;
	}

	.v-word {
		font-family: 'Bangers', cursive;
		font-size: 1.9rem;
		letter-spacing: 0.15em;
		color: #1a1a1a;
		line-height: 1;
	}

	.v-word.accent {
		color: #ff3b82;
		-webkit-text-stroke: 1px #1a1a1a;
		paint-order: stroke fill;
	}

	.progress-dots {
		display: flex;
		gap: 0.45rem;
		align-items: center;
	}

	.p-dot {
		display: inline-block;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		border: 2.5px solid #1a1a1a;
		background: white;
		transition:
			background 0.2s,
			transform 0.15s;
	}

	.p-dot.current {
		background: #ff3b82;
		transform: scale(1.3);
	}

	.p-dot.done {
		background: #06d6a0;
	}

	/* ── Timer ── */
	.timer-wrap {
		width: 110px;
		height: 110px;
		flex-shrink: 0;
		border-radius: 50%;
		border: 3px solid #1a1a1a;
		box-shadow: 4px 4px 0 #1a1a1a;
		overflow: hidden;
		background: white;
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

	.transitioning {
		display: flex;
		gap: 0.4rem;
		align-items: center;
	}

	.t-dot {
		width: 9px;
		height: 9px;
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
			transform: translateY(-9px);
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
		padding: 1.25rem 1.4rem 1.25rem 2.6rem;
		animation: q-bounce-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
	}

	.question-card.results-card {
		background: #fffbea;
		border-color: #ffd60a;
		box-shadow: 5px 5px 0 #ffd60a;
	}

	@keyframes q-bounce-in {
		0% {
			opacity: 0;
			transform: translateY(-40px) scale(0.82) rotate(-2.5deg);
		}
		55% {
			opacity: 1;
			transform: translateY(6px) scale(1.03) rotate(1deg);
		}
		75% {
			transform: translateY(-3px) scale(0.99) rotate(-0.3deg);
		}
		100% {
			opacity: 1;
			transform: translateY(0) scale(1) rotate(0deg);
		}
	}

	.q-counter {
		position: absolute;
		top: -0.6rem;
		right: 0.9rem;
		font-family: 'Bangers', cursive;
		font-size: 0.75rem;
		letter-spacing: 0.12em;
		color: #1a1a1a;
		background: #ffd60a;
		border: 2px solid #1a1a1a;
		border-radius: 99px;
		padding: 0.05rem 0.6rem;
	}

	.q-glyph {
		position: absolute;
		top: -0.1rem;
		left: 0.55rem;
		font-size: 3.5rem;
		font-weight: 900;
		color: #ffd60a;
		line-height: 1;
		font-family: Georgia, serif;
		user-select: none;
		-webkit-text-stroke: 1px #1a1a1a;
		paint-order: stroke fill;
	}

	.q-body {
		font-size: 1.05rem;
		font-weight: 800;
		color: #1a1a1a;
		line-height: 1.5;
	}

	.voted-overlay {
		position: absolute;
		bottom: 0.65rem;
		right: 0.85rem;
	}

	.voted-badge {
		font-family: 'Bangers', cursive;
		font-size: 0.8rem;
		letter-spacing: 0.12em;
		color: #1a1a1a;
		background: #06d6a0;
		border: 2px solid #1a1a1a;
		border-radius: 99px;
		padding: 0.1rem 0.6rem;
	}

	/* ── Answers grid ── */
	.answers-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 1rem;
		width: 100%;
	}

	.answers-grid form {
		display: contents;
	}

	.answer-card {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 1rem 1.1rem;
		background: #ffffff;
		border: 2.5px solid #1a1a1a;
		border-radius: 14px;
		box-shadow: 4px 4px 0 #1a1a1a;
		transition:
			transform 0.1s,
			box-shadow 0.1s,
			opacity 0.2s,
			background 0.15s;
	}

	.answer-card.own {
		opacity: 0.4;
		background: #f5f0e0;
		cursor: default;
	}

	.answer-card.dimmed {
		opacity: 0.3;
	}

	.vote-card {
		cursor: pointer;
		font-family: inherit;
		border: 2.5px solid #1a1a1a;
		color: inherit;
		text-align: left;
		width: 100%;
	}

	.vote-card:not(:disabled):not(.selected):hover {
		transform: translate(-2px, -2px);
		box-shadow: 6px 6px 0 #1a1a1a;
		background: #fff9e6;
	}

	.vote-card:not(:disabled):not(.selected):active {
		transform: translate(2px, 2px);
		box-shadow: 2px 2px 0 #1a1a1a;
	}

	.vote-card.selected {
		background: #ffd60a;
		border-color: #1a1a1a;
		box-shadow: 4px 4px 0 #1a1a1a;
	}

	.vote-card:disabled:not(.selected) {
		cursor: default;
	}

	.player-name {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		font-size: 0.68rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		color: #aaa;
		text-transform: uppercase;
	}

	.vote-card.selected .player-name {
		color: rgba(26, 26, 26, 0.6);
	}

	.own-tag {
		font-family: 'Bangers', cursive;
		font-size: 0.6rem;
		letter-spacing: 0.1em;
		color: #ffffff;
		background: #ff6b35;
		border-radius: 99px;
		padding: 0.08rem 0.4rem;
	}

	.answer-text {
		font-size: 1rem;
		font-weight: 800;
		color: #1a1a1a;
		line-height: 1.4;
		flex: 1;
	}

	.vote-indicator {
		display: block;
		font-family: 'Bangers', cursive;
		font-size: 0.72rem;
		letter-spacing: 0.18em;
		margin-top: 0.25rem;
	}

	.vote-hint {
		color: #ccc;
		transition: color 0.15s;
	}

	.vote-card:not(:disabled):hover .vote-hint {
		color: #ff6b35;
	}

	.selected-indicator {
		color: #1a1a1a;
	}

	/* ── All voted / waiting banners ── */
	.all-voted-banner {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		background: #06d6a0;
		border: 2.5px solid #1a1a1a;
		border-radius: 50px;
		padding: 0.6rem 1.3rem;
		color: #1a1a1a;
		font-family: 'Bangers', cursive;
		font-size: 0.95rem;
		letter-spacing: 0.14em;
		box-shadow: 3px 3px 0 #1a1a1a;
		align-self: center;
		animation: banner-pop 0.35s cubic-bezier(0.22, 1, 0.36, 1) both;
	}

	.voted-waiting {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.55rem;
		color: #aaa;
		font-family: 'Bangers', cursive;
		font-size: 0.9rem;
		letter-spacing: 0.16em;
		animation: banner-pop 0.35s cubic-bezier(0.22, 1, 0.36, 1) both;
	}

	@keyframes banner-pop {
		from {
			opacity: 0;
			transform: scale(0.85);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	/* ── Voter tracker ── */
	.tracker-section {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.tracker-label {
		font-family: 'Bangers', cursive;
		font-size: 0.85rem;
		letter-spacing: 0.22em;
		color: #7a6a4f;
		white-space: nowrap;
	}

	.tracker-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.track-chip {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.25rem 0.65rem;
		border-radius: 99px;
		background: #ffffff;
		border: 2px solid #ddd;
		font-size: 0.72rem;
		font-weight: 800;
		color: #bbb;
		transition:
			border-color 0.25s,
			color 0.25s,
			background 0.25s,
			box-shadow 0.25s;
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
		transition: background 0.25s;
	}

	.track-pip.done {
		background: #1a1a1a;
	}

	/* ── Results grid ── */
	.results-grid {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		width: 100%;
	}

	.result-card {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 1rem 1.1rem 0.8rem;
		background: #ffffff;
		border: 2.5px solid #1a1a1a;
		border-radius: 14px;
		box-shadow: 4px 4px 0 #1a1a1a;
		animation: result-drop 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
	}

	.result-card.winner {
		background: #fffbea;
		border-color: #ffd60a;
		box-shadow: 5px 5px 0 #ffd60a;
	}

	@keyframes result-drop {
		from {
			opacity: 0;
			transform: translateY(-20px) scale(0.95);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	.winner-crown {
		font-family: 'Bangers', cursive;
		font-size: 0.72rem;
		letter-spacing: 0.18em;
		color: #1a1a1a;
		background: #ffd60a;
		border: 2px solid #1a1a1a;
		border-radius: 99px;
		padding: 0.1rem 0.65rem;
		align-self: flex-start;
		margin-bottom: 0.1rem;
	}

	.result-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.result-name {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.72rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		color: #aaa;
		text-transform: uppercase;
	}

	.result-votes {
		font-family: 'Bangers', cursive;
		font-size: 0.85rem;
		letter-spacing: 0.1em;
		color: #aaa;
	}

	.result-votes.winner {
		color: #ff6b35;
	}

	.result-answer {
		font-size: 1rem;
		font-weight: 800;
		color: #1a1a1a;
		line-height: 1.4;
	}

	.vote-bar {
		height: 5px;
		background: #f0ece0;
		border-radius: 99px;
		overflow: hidden;
		margin-top: 0.2rem;
	}

	.vote-bar-fill {
		height: 100%;
		background: #ddd;
		border-radius: 99px;
		transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1);
	}

	.vote-bar-fill.winner {
		background: #ffd60a;
	}

	/* ── Empty state ── */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.6rem;
		padding: 2.5rem 1rem;
		text-align: center;
	}

	.empty-emoji {
		font-size: 4rem;
		line-height: 1;
		animation: drop-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
	}

	.empty-head {
		font-family: 'Bangers', cursive;
		font-size: 3.5rem;
		letter-spacing: 0.18em;
		color: #ff3b82;
		-webkit-text-stroke: 2px #1a1a1a;
		paint-order: stroke fill;
		line-height: 1;
		animation: drop-in 0.55s cubic-bezier(0.22, 1, 0.36, 1) 0.08s both;
	}

	.empty-body {
		font-size: 1rem;
		font-weight: 800;
		color: #1a1a1a;
		animation: drop-in 0.55s cubic-bezier(0.22, 1, 0.36, 1) 0.16s both;
	}

	.empty-hint {
		font-size: 0.75rem;
		font-weight: 700;
		color: #aaa;
		letter-spacing: 0.15em;
		text-transform: uppercase;
		margin-top: 0.25rem;
		animation:
			drop-in 0.55s cubic-bezier(0.22, 1, 0.36, 1) 0.26s both,
			hint-drift 2.2s ease-in-out 1s infinite;
	}

	@keyframes drop-in {
		0% {
			opacity: 0;
			transform: translateY(-55px) scale(0.7) rotate(-4deg);
		}
		55% {
			opacity: 1;
			transform: translateY(8px) scale(1.07) rotate(2deg);
		}
		75% {
			transform: translateY(-4px) scale(0.98) rotate(-1deg);
		}
		100% {
			opacity: 1;
			transform: translateY(0) scale(1) rotate(0deg);
		}
	}

	@keyframes hint-drift {
		0%,
		100% {
			transform: translateX(0);
			opacity: 1;
		}
		50% {
			transform: translateX(5px);
			opacity: 0.6;
		}
	}
</style>
