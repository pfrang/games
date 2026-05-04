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
		<span class="go-word orange">GAME</span>
		<span class="go-word pink">OVER</span>
	</div>
	<p class="go-sub">thanks for playing!</p>

	{#if scoreboard.length > 0}
		<div class="divider"></div>

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
		<div class="divider"></div>

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
	.game-over {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.25rem;
		animation: gameover-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
	}

	@keyframes gameover-in {
		from {
			opacity: 0;
			transform: scale(0.9) translateY(20px);
		}
		to {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}

	/* ── Headline ── */
	.go-headline {
		display: flex;
		gap: 0.55rem;
		align-items: baseline;
	}

	.go-word {
		font-family: 'Bangers', cursive;
		font-size: 2.8rem;
		letter-spacing: 0.15em;
		line-height: 1;
		-webkit-text-stroke: 2px #1a1a1a;
		paint-order: stroke fill;
	}

	.go-word.orange {
		color: #ff6b35;
	}

	.go-word.pink {
		color: #ff3b82;
	}

	.go-sub {
		font-size: 0.75rem;
		font-weight: 800;
		color: #7a6a4f;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		margin-top: -0.75rem;
	}

	.divider {
		width: 100%;
		height: 2.5px;
		background: #1a1a1a;
		opacity: 0.12;
		border-radius: 99px;
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
		font-family: 'Bangers', cursive;
		font-size: 0.85rem;
		letter-spacing: 0.35em;
		color: #7a6a4f;
	}

	.winner-card {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		background: #ffd60a;
		border: 3px solid #1a1a1a;
		border-radius: 14px;
		padding: 0.85rem 1.4rem;
		box-shadow: 5px 5px 0 #1a1a1a;
		width: 100%;
		animation: winner-pop 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.15s both;
	}

	@keyframes winner-pop {
		from {
			opacity: 0;
			transform: scale(0.8) rotate(-2deg);
		}
		to {
			opacity: 1;
			transform: scale(1) rotate(0deg);
		}
	}

	.crown {
		font-size: 1.4rem;
		line-height: 1;
		filter: drop-shadow(1px 1px 0 #1a1a1a);
	}

	.winner-name {
		font-family: 'Bangers', cursive;
		font-size: 1.4rem;
		letter-spacing: 0.08em;
		color: #1a1a1a;
		flex: 1;
	}

	.winner-votes {
		font-size: 0.75rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		color: rgba(26, 26, 26, 0.55);
	}

	.sb-list {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.sb-row {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		padding: 0.5rem 0.85rem;
		border-radius: 10px;
		background: #ffffff;
		border: 2px solid #e0d8c0;
		box-shadow: 2px 2px 0 #e0d8c0;
		transition:
			border-color 0.2s,
			box-shadow 0.2s;
	}

	.sb-row.top {
		border-color: #1a1a1a;
		background: #fff9e6;
		box-shadow: 3px 3px 0 #1a1a1a;
	}

	.sb-row.me {
		border-color: #4cc9f0;
		background: #edf9ff;
		box-shadow: 3px 3px 0 #4cc9f0;
	}

	.sb-row.top.me {
		border-color: #1a1a1a;
		background: #ffd60a;
		box-shadow: 3px 3px 0 #1a1a1a;
	}

	.sb-rank {
		font-family: 'Bangers', cursive;
		font-size: 0.8rem;
		letter-spacing: 0.06em;
		color: #bbb;
		min-width: 1.6rem;
	}

	.sb-row.top .sb-rank {
		color: #ff6b35;
	}

	.sb-name {
		font-size: 0.9rem;
		font-weight: 800;
		color: #1a1a1a;
		flex: 1;
	}

	.sb-score {
		font-family: 'Bangers', cursive;
		font-size: 1rem;
		letter-spacing: 0.06em;
		color: #1a1a1a;
		background: #f0ece0;
		border: 2px solid #ddd;
		border-radius: 6px;
		padding: 0.1rem 0.5rem;
		min-width: 2rem;
		text-align: center;
	}

	.sb-row.top .sb-score {
		background: #ffd60a;
		border-color: #1a1a1a;
	}

	/* ── Results ── */
	.results {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}

	.round-block {
		background: #ffffff;
		border: 2.5px solid #1a1a1a;
		border-radius: 12px;
		box-shadow: 4px 4px 0 #1a1a1a;
		overflow: hidden;
	}

	.rb-header {
		display: flex;
		align-items: flex-start;
		gap: 0.6rem;
		padding: 0.65rem 0.9rem;
		background: #1a1a1a;
	}

	.rb-badge {
		font-family: 'Bangers', cursive;
		font-size: 0.72rem;
		letter-spacing: 0.12em;
		color: #1a1a1a;
		background: #ffd60a;
		border-radius: 4px;
		padding: 0.1rem 0.4rem;
		flex-shrink: 0;
		margin-top: 0.08rem;
	}

	.rb-question {
		font-size: 0.8rem;
		font-weight: 800;
		color: #ffffff;
		line-height: 1.45;
	}

	.rb-answers {
		display: flex;
		flex-direction: column;
	}

	.rb-row {
		display: flex;
		align-items: baseline;
		gap: 0.65rem;
		padding: 0.55rem 0.9rem;
		border-bottom: 2px solid #f0e8d0;
		transition: background 0.15s;
	}

	.rb-row:last-child {
		border-bottom: none;
	}

	.rb-row.mine {
		background: #fff9e6;
	}

	.rb-name {
		font-size: 0.7rem;
		font-weight: 800;
		letter-spacing: 0.05em;
		color: #bbb;
		min-width: 52px;
		flex-shrink: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		text-transform: uppercase;
	}

	.rb-row.mine .rb-name {
		color: #ff6b35;
	}

	.rb-answer {
		font-size: 0.9rem;
		font-weight: 800;
		color: #1a1a1a;
		line-height: 1.4;
		flex: 1;
	}

	.you-tag {
		font-family: 'Bangers', cursive;
		font-size: 0.6rem;
		letter-spacing: 0.1em;
		color: #1a1a1a;
		background: #ffd60a;
		border: 1.5px solid #1a1a1a;
		border-radius: 99px;
		padding: 0.1rem 0.4rem;
		flex-shrink: 0;
	}

	.empty-note {
		font-size: 0.85rem;
		font-weight: 700;
		color: #aaa;
		letter-spacing: 0.08em;
	}
</style>
