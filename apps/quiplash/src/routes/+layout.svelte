<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<div class="bg">
	<div class="flex h-20 items-center border-b px-20 text-white">
		<a href="/">
			<p>
				QUI<span class="text-pink-500">P</span>LASH
			</p>
		</a>
	</div>
	<div class="stars"></div>
	<div class="stars2"></div>

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
		font-family: 'Segoe UI', system-ui, sans-serif;
	}

	.bg {
		min-height: 100vh;
		background: #0d0d1a;
		background-image:
			radial-gradient(ellipse 80% 50% at 50% -20%, #3b1fa855 0%, transparent 70%),
			radial-gradient(ellipse 60% 40% at 80% 110%, #c0392b33 0%, transparent 60%);
		overflow: hidden;
		position: relative;
	}

	main {
		position: relative;
		z-index: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
	}

	.stars,
	.stars2 {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.stars {
		background: transparent
			url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Ccircle cx='23' cy='55' r='1' fill='white' opacity='.5'/%3E%3Ccircle cx='90' cy='200' r='1.2' fill='white' opacity='.4'/%3E%3Ccircle cx='150' cy='30' r='.8' fill='white' opacity='.6'/%3E%3Ccircle cx='210' cy='320' r='1' fill='white' opacity='.5'/%3E%3Ccircle cx='300' cy='80' r='1.3' fill='white' opacity='.3'/%3E%3Ccircle cx='360' cy='260' r='.9' fill='white' opacity='.6'/%3E%3Ccircle cx='50' cy='350' r='1' fill='white' opacity='.4'/%3E%3Ccircle cx='330' cy='370' r='.7' fill='white' opacity='.5'/%3E%3C/svg%3E")
			repeat;
		animation: twinkle 6s ease-in-out infinite alternate;
	}

	.stars2 {
		background: transparent
			url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='600'%3E%3Ccircle cx='80' cy='120' r='.9' fill='%23a78bfa' opacity='.5'/%3E%3Ccircle cx='200' cy='500' r='1.1' fill='%23f472b6' opacity='.4'/%3E%3Ccircle cx='420' cy='60' r='.8' fill='%2360a5fa' opacity='.6'/%3E%3Ccircle cx='540' cy='300' r='1' fill='%23a78bfa' opacity='.3'/%3E%3Ccircle cx='140' cy='420' r='1.2' fill='%23f472b6' opacity='.5'/%3E%3Ccircle cx='480' cy='480' r='.7' fill='%2360a5fa' opacity='.4'/%3E%3C/svg%3E")
			repeat;
		animation: twinkle 9s ease-in-out infinite alternate-reverse;
	}

	@keyframes twinkle {
		from {
			opacity: 0.6;
			transform: scale(1);
		}
		to {
			opacity: 1;
			transform: scale(1.05);
		}
	}
</style>
