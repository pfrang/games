<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';

	let { children } = $props();

	let audio: HTMLAudioElement;
	let muted = $state(false);

	onMount(() => {
		audio.volume = 0.4;
		const tryPlay = () => audio.play().catch(() => {});
		tryPlay();
		document.addEventListener('click', tryPlay, { once: true });
		document.addEventListener('keydown', tryPlay, { once: true });
		return () => {
			document.removeEventListener('click', tryPlay);
			document.removeEventListener('keydown', tryPlay);
		};
	});

	function toggleMute() {
		muted = !muted;
		audio.muted = muted;
	}
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<audio bind:this={audio} src="/home.wav" loop preload="auto"></audio>

<div class="bg">
	<header class="site-header">
		<a href="/" class="logo">
			QUI<span class="logo-p">P</span>LASH
		</a>
		<button class="mute-btn" onclick={toggleMute} aria-label="Toggle music">
			{muted ? '🔇' : '🔊'}
		</button>
	</header>
	<main>
		{@render children()}
	</main>
</div>

<style>
	*,
	*::before,
	*::after {
		box-sizing: border-box;
		margin: 0;
		padding: 0;
	}

	:global(html, body) {
		height: 100%;
		font-family: 'Nunito', system-ui, sans-serif;
	}

	.bg {
		min-height: 100vh;
		background-color: #fff5d6;
		background-image: radial-gradient(circle, #e8d494 1.5px, transparent 1.5px);
		background-size: 32px 32px;
	}

	.site-header {
		display: flex;
		align-items: center;
		padding: 0 2rem;
		height: 4.5rem;
		background: #ffffff;
		border-bottom: 3px solid #1a1a1a;
		position: sticky;
		top: 0;
		z-index: 100;
	}

	.logo {
		font-family: 'Bangers', cursive;
		font-size: 2.4rem;
		letter-spacing: 0.08em;
		color: #1a1a1a;
		text-decoration: none;
		display: inline-block;
		transition: transform 0.15s;
	}

	.logo:hover {
		transform: scale(1.05) rotate(-1deg);
	}

	.logo-p {
		color: #ff3b82;
	}

	.mute-btn {
		margin-left: auto;
		background: #ffd60a;
		border: 2.5px solid #1a1a1a;
		border-radius: 50%;
		width: 2.5rem;
		height: 2.5rem;
		cursor: pointer;
		font-size: 1rem;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 3px 3px 0 #1a1a1a;
		transition:
			transform 0.1s,
			box-shadow 0.1s;
	}

	.mute-btn:hover {
		transform: translate(-1px, -1px);
		box-shadow: 4px 4px 0 #1a1a1a;
	}

	.mute-btn:active {
		transform: translate(2px, 2px);
		box-shadow: 1px 1px 0 #1a1a1a;
	}

	main {
		display: flex;
		align-items: flex-start;
		justify-content: center;
		width: 100%;
		min-height: calc(100vh - 4.5rem);
		padding: 2.5rem 1rem;
	}
</style>
