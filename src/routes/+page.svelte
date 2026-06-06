<script lang="ts">
	import { filteredBeaconLights, searchKeyword, beaconLights, exhibitionStatusFilter, lampshadeStatusFilter, lightSourceStatusFilter, museumFilter, museums, currentUser, exportToCSV, downloadCSV } from '$lib/stores';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import { goto } from '$app/navigation';
	import { EXHIBITION_STATUS_OPTIONS, LAMPSHADE_STATUS_OPTIONS, LIGHT_SOURCE_STATUS_OPTIONS } from '$lib/types';

	let searchValue = '';
	let showFilters = false;

	function handleSearch(e: Event) {
		const target = e.target as HTMLInputElement;
		$searchKeyword = target.value;
	}

	function goToDetail(id: string) {
		goto(`/beacon/${id}`);
	}

	function goToCreate() {
		goto('/beacon/new');
	}

	function handleExport() {
		const csv = exportToCSV('beaconLights');
		if (csv) {
			downloadCSV(csv, `航标灯档案_${new Date().toISOString().slice(0, 10)}.csv`);
		}
	}

	function resetFilters() {
		$searchKeyword = '';
		searchValue = '';
		$exhibitionStatusFilter = '';
		$lampshadeStatusFilter = '';
		$lightSourceStatusFilter = '';
		$museumFilter = '';
	}

	let totalCount = 0;
	beaconLights.subscribe(lights => { totalCount = lights.length;
	})();
</script>

<div class="space-y-6">
	<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
		<div>
			<h2 class="text-2xl font-bold text-amber-900">航标灯档案</h2>
			<p class="text-gray-600 mt-1">共 <span class="font-semibold">{$filteredBeaconLights.length}</span> / {totalCount} 条记录</p>
		</div>
		<div class="flex gap-2 flex-wrap">
			<button
				onclick={handleExport}
				class="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 transition-colors font-medium shadow-sm"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
				</svg>
				导出
			</button>
			<button
				onclick={() => showFilters = !showFilters}
				class="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 transition-colors font-medium shadow-sm"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
				</svg>
				筛选
			</button>
			<button
				onclick={goToCreate}
				class="inline-flex items-center gap-2 px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors font-medium shadow-md"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
				</svg>
				新增航标灯
			</button>
		</div>
	</div>

	{#if showFilters}
		<div class="bg-white rounded-xl shadow-md p-5 space-y-4">
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				{#if $currentUser?.role === '系统管理员'}
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">所属馆区</label>
						<select
							bind:value={$museumFilter}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all outline-none"
						>
							<option value="">全部馆区</option>
							{#each $museums as museum}
								<option value={museum.id}>{museum.name}</option>
							{/each}
						</select>
					</div>
				{/if}
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">展陈状态</label>
					<select
						bind:value={$exhibitionStatusFilter}
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all outline-none"
					>
						<option value="">全部状态</option>
						{#each EXHIBITION_STATUS_OPTIONS as status}
							<option value={status}>{status}</option>
						{/each}
					</select>
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">灯罩状态</label>
					<select
						bind:value={$lampshadeStatusFilter}
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all outline-none"
					>
						<option value="">全部状态</option>
						{#each LAMPSHADE_STATUS_OPTIONS as status}
							<option value={status}>{status}</option>
						{/each}
					</select>
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">光源状态</label>
					<select
						bind:value={$lightSourceStatusFilter}
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all outline-none"
					>
						<option value="">全部状态</option>
						{#each LIGHT_SOURCE_STATUS_OPTIONS as status}
							<option value={status}>{status}</option>
						{/each}
					</select>
				</div>
			</div>
			<div class="flex justify-end">
				<button
					onclick={resetFilters}
					class="px-4 py-2 text-sm text-gray-600 hover:text-amber-700 transition-colors"
				>
					重置筛选
				</button>
			</div>
		</div>
	{/if}

	<div class="bg-white rounded-xl shadow-md p-4">
		<div class="relative">
			<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
			</svg>
			<input
				type="text"
				placeholder="搜索航标灯编号、名称、材质、海域、展陈位置..."
				bind:value={searchValue}
				oninput={handleSearch}
				class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all outline-none"
			/>
		</div>
	</div>

	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
		{#each $filteredBeaconLights as light (light.id)}
			<div
				class="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-amber-600"
				onclick={() => goToDetail(light.id)}
			>
				<div class="p-5">
					<div class="flex justify-between items-start mb-3">
						<div>
							<span class="text-xs text-amber-700 font-mono font-semibold">{light.code}</span>
							<h3 class="text-lg font-bold text-gray-800 mt-1">{light.name}</h3>
						</div>
						<StatusBadge status={light.exhibitionStatus} type="exhibition" />
					</div>

					<div class="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-4">
						<div>
							<span class="text-gray-400">制造年代：</span>
							<span class="font-medium">{light.manufactureYear}年</span>
						</div>
						<div>
							<span class="text-gray-400">材质：</span>
							<span class="font-medium">{light.material}</span>
						</div>
						<div>
							<span class="text-gray-400">原海域：</span>
							<span class="font-medium">{light.originalSeaArea}</span>
						</div>
						<div>
							<span class="text-gray-400">馆区：</span>
							<span class="font-medium text-xs">{light.museumName}</span>
						</div>
					</div>

					<div class="flex gap-2 pt-3 border-t border-gray-100">
						<div class="flex-1">
							<span class="text-xs text-gray-400 block mb-1">灯罩</span>
							<StatusBadge status={light.lampshadeStatus} type="lampshade" />
						</div>
						<div class="flex-1">
							<span class="text-xs text-gray-400 block mb-1">光源</span>
							<StatusBadge status={light.lightSourceStatus} type="lightSource" />
						</div>
					</div>

					{#if light.isOnBorrow || light.isUnderRepair}
						<div class="flex gap-2 mt-3 pt-3 border-t border-gray-100 flex-wrap">
							{#if light.isOnBorrow}
								<span class="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">借展中</span>
							{/if}
							{#if light.isUnderRepair}
								<span class="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full">修复中</span>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		{:else}
			<div class="col-span-full bg-white rounded-xl shadow-md p-12 text-center">
				<svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<p class="text-gray-500">没有找到匹配的航标灯记录</p>
			</div>
		{/each}
	</div>
</div>
