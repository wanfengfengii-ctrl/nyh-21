<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/stores';
	import { currentUser, currentMuseum, currentUserId, currentMuseumId, users, museums, switchUser, switchMuseum, updateOverdueBorrows, unreadNotificationCount } from '$lib/stores';
	import { onMount } from 'svelte';

	let { children } = $props();

	let showUserMenu = $state(false);

	const navItems = [
		{ href: '/', label: '航标灯档案', icon: 'archive' },
		{ href: '/environment', label: '环境监测', icon: 'thermo' },
		{ href: '/alert-rules', label: '预警规则', icon: 'rule' },
		{ href: '/notifications', label: '通知中心', icon: 'bell', badge: $unreadNotificationCount },
		{ href: '/emergency-meeting', label: '应急会商', icon: 'meeting' },
		{ href: '/emergency-plan', label: '应急预案', icon: 'plan' },
		{ href: '/risk-heatmap', label: '风险热力图', icon: 'heatmap' },
		{ href: '/batch-tasks', label: '批量任务', icon: 'batch' },
		{ href: '/borrow', label: '借展管理', icon: 'exchange' },
		{ href: '/repair', label: '修复工单', icon: 'wrench' },
		{ href: '/stats', label: '数据统计', icon: 'chart' },
		{ href: '/logs', label: '操作日志', icon: 'list' }
	];

	function handleUserSwitch(userId: string) {
		switchUser(userId);
		showUserMenu = false;
	}

	function handleMuseumSwitch(museumId: string) {
		switchMuseum(museumId);
	}

	onMount(() => {
		updateOverdueBorrows();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>智能预警与跨馆协同应急处置平台</title>
</svelte:head>

<div class="min-h-screen flex flex-col bg-gray-50">
	<header class="bg-gradient-to-r from-amber-900 to-amber-800 text-white shadow-lg">
		<div class="container mx-auto px-4 py-3">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-full bg-amber-600 flex items-center justify-center">
						<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 00-.463 3.731V21H9.666v-2.473a3.375 3.375 0 00-.464-3.731l-.549-.547z" />
						</svg>
					</div>
					<div>
						<h1 class="text-lg font-bold">智能预警与跨馆协同应急处置平台</h1>
						<p class="text-amber-200 text-xs">多级预警 · 协同处置 · 全流程留痕</p>
					</div>
				</div>

				<div class="flex items-center gap-4">
					{#if $currentUser?.role === '系统管理员'}
						<div class="relative">
							<div class="flex items-center gap-2 text-sm bg-amber-800/50 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-amber-700/50 transition-colors"
								on:click={() => showUserMenu = !showUserMenu}>
								<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
								</svg>
								<span>{$currentMuseum?.name || '全馆区'}</span>
								<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
								</svg>
							</div>

							{#if showUserMenu}
								<div class="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50 text-gray-800">
									<div class="px-4 py-2 border-b border-gray-100">
										<p class="text-xs text-gray-500">切换馆区</p>
									</div>
									{#each $museums as museum}
										<button
											on:click={() => handleMuseumSwitch(museum.id)}
											class="w-full text-left px-4 py-2 hover:bg-amber-50 transition-colors flex items-center justify-between text-sm"
										>
											<span>{museum.name}</span>
											{#if museum.id === $currentMuseumId}
												<span class="text-amber-600">●</span>
											{/if}
										</button>
									{/each}
									<div class="px-4 py-2 border-t border-gray-100 mt-2">
										<p class="text-xs text-gray-500">切换用户角色</p>
									</div>
									{#each $users as user}
										<button
											on:click={() => handleUserSwitch(user.id)}
											class="w-full text-left px-4 py-2 hover:bg-amber-50 transition-colors flex items-center justify-between text-sm"
										>
											<div>
												<p class="font-medium">{user.fullName}</p>
												<p class="text-xs text-gray-500">{user.role}</p>
											</div>
											{#if user.id === $currentUserId}
												<span class="text-amber-600">●</span>
											{/if}
										</button>
									{/each}
								</div>
							{/if}
						</div>
					{/if}

					<div class="flex items-center gap-2 text-sm">
						<div class="w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center text-white font-medium">
							{$currentUser?.fullName?.charAt(0) || 'U'}
						</div>
						<div class="hidden sm:block">
							<p class="font-medium">{$currentUser?.fullName || '访客'}</p>
							<p class="text-amber-200 text-xs">{$currentUser?.role || ''}</p>
						</div>
					</div>
				</div>
			</div>
		</div>

		<nav class="bg-amber-950/30 border-t border-amber-800/30">
			<div class="container mx-auto px-4">
				<div class="flex gap-1 overflow-x-auto">
					{#each navItems as item}
						<a
							href={item.href}
							class="whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 relative {
								$page.url.pathname === item.href || (item.href !== '/' && $page.url.pathname.startsWith(item.href))
									? 'text-white bg-amber-700/50 border-b-2 border-amber-400'
									: 'text-amber-100 hover:text-white hover:bg-amber-800/30'
							}"
						>
							{#if item.badge && item.badge > 0}
								<span class="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">
									{item.badge > 99 ? '99+' : item.badge}
								</span>
							{/if}
							{#if item.icon === 'archive'}
								<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
								</svg>
							{:else if item.icon === 'chart'}
								<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
								</svg>
							{:else if item.icon === 'exchange'}
								<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
								</svg>
							{:else if item.icon === 'wrench'}
								<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
								</svg>
							{:else if item.icon === 'thermo'}
								<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
								</svg>
							{:else if item.icon === 'list'}
								<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
								</svg>
							{:else if item.icon === 'rule'}
								<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
								</svg>
							{:else if item.icon === 'bell'}
								<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 006 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
								</svg>
							{:else if item.icon === 'meeting'}
								<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
								</svg>
							{:else if item.icon === 'plan'}
								<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
								</svg>
							{:else if item.icon === 'heatmap'}
								<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 18.657A8 8 0 016.343 7.343 9 9 0 1017.657 18.657z" />
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.53 15.53A5 5 0 0114.47 10.53" />
								</svg>
							{:else if item.icon === 'batch'}
								<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
								</svg>
							{/if}
							{item.label}
						</a>
					{/each}
				</div>
			</div>
		</nav>
	</header>

	<main class="flex-1 container mx-auto px-4 py-6" on:click={() => showUserMenu = false}>
		{@render children()}
	</main>

	<footer class="bg-amber-900 text-amber-200 py-4 mt-8">
		<div class="container mx-auto px-4 text-center text-sm">
			<p>© 2024 智能预警与跨馆协同应急处置平台</p>
		</div>
	</footer>
</div>
