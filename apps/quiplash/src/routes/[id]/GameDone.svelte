<script lang="ts">
	import type { GameAnswer } from '$lib/websocket';

	interface Props {
		answers: GameAnswer[];
		playerId: string | null;
	}

	let { answers, playerId }: Props = $props();

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
</style>
