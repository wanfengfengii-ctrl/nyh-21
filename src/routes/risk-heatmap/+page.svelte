<script lang="ts">
	import {
		calculateRiskHeatmapData,
		envAlerts,
		envMonitorPoints,
		beaconLights,
		currentMuseumId,
		currentUser,
		museums
	} from '$lib/stores';
	import { RISK_LEVEL_OPTIONS, ENV_LOCATION_TYPE_OPTIONS } from '$lib/types';
	import type {
		RiskHeatmapData,
		RiskLevel,
		EnvAlert
	} from '$lib/types';

	let museumFilter = $state<string>('');
	let locationTypeFilter = $state<string>('');
	let riskLevelFilter = $state<string>('');
	let showDetailModal = $state(false);
	let selectedPoint = $state<RiskHeatmapData | null>(null);
	let refreshKey = $state(0);

	let filteredData = $state<RiskHeatmapData[]>([]);
	let stats = $state({
		total: 0,
		highRisk: 0,
		mediumRisk: 0,
		lowRisk: 0
	});
	let pointAlerts = $state<EnvAlert[]>([]);

	$effect(() => {
		void refreshKey;
		void $envMonitorPoints;
		void $envAlerts;
		void $beaconLights;
		void museumFilter;
		void locationTypeFilter;
		void riskLevelFilter;
		void $currentUser;
		void $currentMuseumId;

		const allData = calculateRiskHeatmapData();

		let filtered = allData;
		if ($currentUser?.role !== '系统管理员') {
			filtered = filtered.filter(d => d.museumId === $currentMuseumId);
		} else if (museumFilter) {
			filtered = filtered.filter(d => d.museumId === museumFilter);
		}

		if (locationTypeFilter) {
			filtered = filtered.filter(d => d.locationType === locationTypeFilter);
		}

		if (riskLevelFilter) {
			filtered = filtered.filter(d => d.riskLevel === riskLevelFilter);
		}

		filteredData = filtered;
		stats = {
			total: filtered.length,
			highRisk: filtered.filter(d => d.riskLevel === '高风险').length,
			mediumRisk: filtered.filter(d => d.riskLevel === '中风险').length,
			lowRisk: filtered.filter(d => d.riskLevel === '低风险').length
		};
	});

	$effect(() => {
		void selectedPoint;
		void $envAlerts;

		const point = selectedPoint;
		if (!point?.pointId) {
			pointAlerts = [];
			return;
		}

		pointAlerts = $envAlerts
			.filter(a => a.pointId === point.pointId)
			.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
	});

	function refreshData() {
		refreshKey++;
	}

	function getRiskLevelClass(level: RiskLevel) {
		const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
		switch (level) {
			case '低风险': return `${base} bg-yellow-100 text-yellow-800`;
			case '中风险': return `${base} bg-orange-100 text-orange-800`;
			case '高风险': return `${base} bg-red-100 text-red-800`;
			default: return `${base} bg-green-100 text-green-800`;
		}
	}

	function getRiskCardBgClass(level: RiskLevel) {
		switch (level) {
			case '高风险': return 'bg-gradient-to-br from-red-50 to-red-100 border-red-300 hover:border-red-400';
			case '中风险': return 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-300 hover:border-orange-400';
			case '低风险': return 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-300 hover:border-yellow-400';
			default: return 'bg-gradient-to-br from-green-50 to-green-100 border-green-300 hover:border-green-400';
		}
	}

	function getRiskScoreColor(level: RiskLevel) {
		switch (level) {
			case '高风险': return 'bg-red-500';
			case '中风险': return 'bg-orange-500';
			case '低风险': return 'bg-yellow-500';
			default: return 'bg-green-500';
		}
	}

	function getAlertStatusClass(status: string) {
		const base = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium';
		switch (status) {
			case '待处理': return `${base} bg-red-100 text-red-800`;
			case '处理中': return `${base} bg-amber-100 text-amber-800`;
			case '已确认': return `${base} bg-green-100 text-green-800`;
			case '已忽略': return `${base} bg-gray-100 text-gray-600`;
			default: return `${base} bg-gray-100 text-gray-800`;
		}
	}

	function openDetail(point: RiskHeatmapData) {
		selectedPoint = point;
		showDetailModal = true;
	}
</script>

<div class="space-y-6">
	<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
		<div>
			<h2 class="text-2xl font-bold text-amber-900">风险热力图</h2>
			<p class="text-gray-600 mt-1">各监测点位风险等级分布与预警概览</p>
		</div>
		<button
			on:click={refreshData}
			class="inline-flex items-center gap-2 px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors font-medium shadow-md"
		>
			<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
			</svg>
			刷新数据
		</button>
	</div>

	<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
		<div class="bg-white rounded-xl shadow-md p-5 border-l-4 border-red-500">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm text-gray-500">高风险点位</p>
					<p class="text-3xl font-bold text-red-600 mt-1">{stats.highRisk}</p>
				</div>
				<div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
					<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
					</svg>
				</div>
			</div>
		</div>

		<div class="bg-white rounded-xl shadow-md p-5 border-l-4 border-orange-500">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm text-gray-500">中风险点位</p>
					<p class="text-3xl font-bold text-orange-600 mt-1">{stats.mediumRisk}</p>
				</div>
				<div class="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
					<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				</div>
			</div>
		</div>

		<div class="bg-white rounded-xl shadow-md p-5 border-l-4 border-yellow-500">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm text-gray-500">低风险点位</p>
					<p class="text-3xl font-bold text-yellow-600 mt-1">{stats.lowRisk}</p>
				</div>
				<div class="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
					<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				</div>
			</div>
		</div>

		<div class="bg-white rounded-xl shadow-md p-5 border-l-4 border-amber-500">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm text-gray-500">监测点总数</p>
					<p class="text-3xl font-bold text-amber-700 mt-1">{stats.total}</p>
				</div>
				<div class="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
					<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
					</svg>
				</div>
			</div>
		</div>
	</div>

	<div class="bg-white rounded-xl shadow-md p-5">
		<div class="flex flex-wrap gap-3">
			{#if $currentUser?.role === '系统管理员'}
				<select
					bind:value={museumFilter}
					class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
				>
					<option value="">全部馆区</option>
					{#each $museums as museum}
						<option value={museum.id}>{museum.name}</option>
					{/each}
				</select>
			{/if}

			<select
				bind:value={locationTypeFilter}
				class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
			>
				<option value="">全部位置类型</option>
				{#each ENV_LOCATION_TYPE_OPTIONS as type}
					<option value={type}>{type}</option>
				{/each}
			</select>

			<select
				bind:value={riskLevelFilter}
				class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
			>
				<option value="">全部风险等级</option>
				{#each RISK_LEVEL_OPTIONS as level}
					<option value={level}>{level}</option>
				{/each}
			</select>
		</div>
	</div>

	{#if filteredData.length > 0}
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
			{#each filteredData as point}
				<div
					on:click={() => openDetail(point)}
					class="rounded-xl border-2 p-5 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md {getRiskCardBgClass(point.riskLevel)}"
				>
					<div class="flex items-start justify-between mb-3">
						<div class="flex-1 min-w-0">
							<h3 class="font-semibold text-gray-800 truncate">{point.pointName}</h3>
							<p class="text-xs text-gray-500 mt-1">{point.location}</p>
						</div>
						<span class={getRiskLevelClass(point.riskLevel)}>{point.riskLevel}</span>
					</div>

					<div class="mb-4">
						<div class="flex justify-between text-xs text-gray-600 mb-1">
							<span>风险评分</span>
							<span class="font-medium">{point.riskScore} 分</span>
						</div>
						<div class="w-full bg-gray-200 rounded-full h-2">
							<div
								class="h-2 rounded-full transition-all {getRiskScoreColor(point.riskLevel)}"
								style="width: {Math.min(point.riskScore, 100)}%"
							></div>
						</div>
					</div>

					<div class="grid grid-cols-3 gap-2 text-center mb-3">
						<div class="bg-white bg-opacity-60 rounded-lg p-2">
							<p class="text-lg font-bold text-red-600">{point.highRiskCount}</p>
							<p class="text-xs text-gray-500">高警</p>
						</div>
						<div class="bg-white bg-opacity-60 rounded-lg p-2">
							<p class="text-lg font-bold text-orange-600">{point.mediumRiskCount}</p>
							<p class="text-xs text-gray-500">中警</p>
						</div>
						<div class="bg-white bg-opacity-60 rounded-lg p-2">
							<p class="text-lg font-bold text-yellow-600">{point.lowRiskCount}</p>
							<p class="text-xs text-gray-500">低警</p>
						</div>
					</div>

					<div class="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-200 border-opacity-50">
						<span class="flex items-center gap-1">
							<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
							</svg>
							{point.locationType}
						</span>
						<span class="flex items-center gap-1">
							<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
							</svg>
							{point.beaconLightCount} 件藏品
						</span>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="bg-white rounded-xl shadow-md p-12 text-center">
			<svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
			</svg>
			<p class="text-gray-500">暂无符合条件的监测点位</p>
		</div>
	{/if}

	{#if showDetailModal && selectedPoint}
		<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" on:click={() => (showDetailModal = false)}>
			<div class="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" on:click|stopPropagation>
				<div class="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
					<div class="flex items-center justify-between">
						<div>
							<h3 class="text-lg font-semibold text-gray-800">{selectedPoint.pointName}</h3>
							<p class="text-sm text-gray-500 mt-1">{selectedPoint.location} · {selectedPoint.museumName}</p>
						</div>
						<span class={getRiskLevelClass(selectedPoint.riskLevel)}>{selectedPoint.riskLevel}</span>
					</div>
				</div>

				<div class="p-6 space-y-6">
					<div class="bg-gray-50 rounded-xl p-5">
						<div class="flex justify-between items-center mb-3">
							<span class="font-medium text-gray-700">风险评分</span>
							<span class="text-2xl font-bold text-amber-700">{selectedPoint.riskScore} 分</span>
						</div>
						<div class="w-full bg-gray-200 rounded-full h-3">
							<div
								class="h-3 rounded-full transition-all {getRiskScoreColor(selectedPoint.riskLevel)}"
								style="width: {Math.min(selectedPoint.riskScore, 100)}%"
							></div>
						</div>
						<div class="flex justify-between text-xs text-gray-500 mt-2">
							<span>0</span>
							<span>50</span>
							<span>100</span>
						</div>
					</div>

					<div class="grid grid-cols-3 gap-4">
						<div class="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
							<p class="text-3xl font-bold text-red-600">{selectedPoint.highRiskCount}</p>
							<p class="text-sm text-red-700 mt-1">高风险告警</p>
						</div>
						<div class="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
							<p class="text-3xl font-bold text-orange-600">{selectedPoint.mediumRiskCount}</p>
							<p class="text-sm text-orange-700 mt-1">中风险告警</p>
						</div>
						<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
							<p class="text-3xl font-bold text-yellow-600">{selectedPoint.lowRiskCount}</p>
							<p class="text-sm text-yellow-700 mt-1">低风险告警</p>
						</div>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div>
							<p class="text-xs text-gray-500 mb-1">位置类型</p>
							<p class="font-medium text-gray-800">{selectedPoint.locationType}</p>
						</div>
						<div>
							<p class="text-xs text-gray-500 mb-1">关联藏品数</p>
							<p class="font-medium text-gray-800">{selectedPoint.beaconLightCount} 件</p>
						</div>
						<div class="col-span-2">
							<p class="text-xs text-gray-500 mb-1">关联藏品</p>
							<div class="flex flex-wrap gap-2">
								{#each selectedPoint.beaconLightNames as name}
									<span class="inline-flex items-center px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded-md">
										{name}
									</span>
								{/each}
								{#if selectedPoint.beaconLightNames.length === 0}
									<span class="text-gray-400 text-sm">暂无关联藏品</span>
								{/if}
							</div>
						</div>
					</div>

					<div>
						<h4 class="font-semibold text-gray-800 mb-3">告警列表</h4>
						{#if pointAlerts.length > 0}
							<div class="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-64 overflow-y-auto">
								{#each pointAlerts as alert}
									<div class="p-3 hover:bg-gray-50">
										<div class="flex items-start justify-between">
											<div class="flex-1 min-w-0">
												<div class="flex items-center gap-2 mb-1">
													<span class={getAlertStatusClass(alert.status)}>{alert.status}</span>
													<span class={getRiskLevelClass(alert.alertLevel)}>{alert.alertLevel}</span>
													<span class="text-sm font-medium text-gray-800">{alert.alertType}告警</span>
												</div>
												<p class="text-sm text-gray-600 truncate">{alert.description}</p>
											</div>
											<p class="text-xs text-gray-500 ml-3 whitespace-nowrap">{alert.createdAt.slice(5, 16)}</p>
										</div>
									</div>
								{/each}
							</div>
						{:else}
							<div class="bg-gray-50 rounded-lg p-6 text-center text-gray-500 text-sm">
								暂无告警记录
							</div>
						{/if}
					</div>
				</div>

				<div class="px-6 py-4 border-t border-gray-200 flex justify-end">
					<button
						on:click={() => (showDetailModal = false)}
						class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
					>
						关闭
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
