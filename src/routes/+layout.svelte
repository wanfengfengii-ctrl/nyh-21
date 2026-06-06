<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/stores';

	let { children } = $props();

	const navItems = [
		{ href: '/', label: '航标灯档案' },
		{ href: '/stats', label: '统计视图' }
	];
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>海事博物馆 · 古航标灯管理系统</title>
</svelte:head>

<div class="min-h-screen flex flex-col">
	<header class="bg-gradient-to-r from-amber-900 to-amber-800 text-white shadow-lg">
		<div class="container mx-auto px-4 py-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-full bg-amber-600 flex items-center justify-center">
						<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 00-.463 3.731V21H9.666v-2.473a3.375 3.375 0 00-.464-3.731l-.549-.547z" />
						</svg>
					</div>
					<div>
						<h1 class="text-xl font-bold">海事博物馆</h1>
						<p class="text-amber-200 text-sm">古航标灯管理系统</p>
					</div>
				</div>
				<nav class="flex gap-1">
					{#each navItems as item}
						<a
							href={item.href}
							class="px-4 py-2 rounded-md font-medium transition-colors {
								$page.url.pathname === item.href
									? 'bg-amber-600 text-white'
									: 'text-amber-100 hover:bg-amber-700 hover:text-white'
							}"
						>
							{item.label}
						</a>
					{/each}
				</nav>
			</div>
		</div>
	</header>

	<main class="flex-1 container mx-auto px-4 py-6">
		{@render children()}
	</main>

	<footer class="bg-amber-900 text-amber-200 py-4 mt-8">
		<div class="container mx-auto px-4 text-center text-sm">
			<p>© 2024 海事博物馆 · 古航标灯数字化管理平台</p>
		</div>
	</footer>
</div>
