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
