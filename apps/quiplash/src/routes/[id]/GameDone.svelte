<script lang="ts">
	import type { GameAnswer, ScoreboardEntry } from '$lib/websocket';

	interface Props {
		answers: GameAnswer[];
		playerId: string | null;
		scoreboard: ScoreboardEntry[];
	}

	let { answers, playerId, scoreboard }: Props = $props();

	let winner = $derived(scoreboard.length > 0 ? scoreboard[0] : null);

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

<div class="game-over">
	<div class="go-headline">
		<span class="go-word">GAME</span>
		<span class="go-word gradient">OVER</span>
	</div>
	<p class="go-sub">thanks for playing</p>

	{#if scoreboard.length > 0}
		<div class="divider-line"></div>
		<div class="scoreboard">
			<p class="sb-title">LEADERBOARD</p>
			{#if winner}
				<div class="winner-card">
					<span class="crown">♛</span>
					<span class="winner-name">{winner.playerName}</span>
					<span class="winner-votes">{winner.totalVotes} vote{winner.totalVotes !== 1 ? 's' : ''}</span>
				</div>
			{/if}
			<div class="sb-list">
				{#each scoreboard as entry, i}
					<div class="sb-row" class:me={entry.playerId === playerId} class:top={i === 0}>
						<span class="sb-rank">#{i + 1}</span>
						<span class="sb-name">{entry.playerName}</span>
						<span class="sb-score">{entry.totalVotes}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}

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

<style>
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

	/* ── Scoreboard ── */
	.scoreboard {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.85rem;
	}
	.sb-title {
		font-size: 0.65rem;
		font-weight: 900;
		letter-spacing: 0.35em;
		color: #4a4470;
	}
	.winner-card {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		background: linear-gradient(135deg, #1a1200, #0d0d00);
		border: 1.5px solid #fbbf2440;
		border-radius: 12px;
		padding: 0.75rem 1.25rem;
		box-shadow:
			0 0 24px #fbbf2418,
			inset 0 0 20px #fbbf240a;
		animation: winner-glow 2.5s ease-in-out infinite;
	}
	@keyframes winner-glow {
		0%,
		100% {
			box-shadow:
				0 0 20px #fbbf2418,
				inset 0 0 20px #fbbf240a;
		}
		50% {
			box-shadow:
				0 0 36px #fbbf2435,
				inset 0 0 24px #fbbf2415;
		}
	}
	.crown {
		font-size: 1.1rem;
		color: #fbbf24;
		filter: drop-shadow(0 0 6px #fbbf2488);
	}
	.winner-name {
		font-size: 1rem;
		font-weight: 900;
		letter-spacing: 0.1em;
		color: #fde68a;
	}
	.winner-votes {
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		color: #fbbf2480;
		margin-left: 0.1rem;
	}
	.sb-list {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	.sb-row {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		padding: 0.45rem 0.8rem;
		border-radius: 8px;
		background: #080810;
		border: 1px solid #1e1c38;
		transition: border-color 0.2s;
	}
	.sb-row.top {
		border-color: #fbbf2430;
		background: #0f0e00;
	}
	.sb-row.me {
		border-color: #7c3aed40;
		background: #130f28;
	}
	.sb-rank {
		font-size: 0.62rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		color: #2d2b55;
		min-width: 1.5rem;
	}
	.sb-row.top .sb-rank {
		color: #fbbf2466;
	}
	.sb-name {
		font-size: 0.85rem;
		font-weight: 700;
		color: #7c6fa0;
		flex: 1;
	}
	.sb-row.top .sb-name {
		color: #fde68a;
	}
	.sb-row.me .sb-name {
		color: #c4b5fd;
	}
	.sb-score {
		font-size: 0.75rem;
		font-weight: 900;
		letter-spacing: 0.08em;
		color: #3a3560;
		background: #0d0d20;
		border: 1px solid #2d2b55;
		border-radius: 6px;
		padding: 0.1rem 0.45rem;
		min-width: 2rem;
		text-align: center;
	}
	.sb-row.top .sb-score {
		color: #fbbf24;
		background: #1a1200;
		border-color: #fbbf2435;
	}
</style>
