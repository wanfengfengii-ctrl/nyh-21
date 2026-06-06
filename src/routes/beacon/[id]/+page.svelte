<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { beaconLights, maintenanceRecords, lampshadeInspections, lightSourceReplacements, exhibitionStatusHistories, deleteBeaconLight } from '$lib/stores';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import type { BeaconLight, MaintenanceRecord, LampshadeInspection, LightSourceReplacement, ExhibitionStatusHistory } from '$lib/types';
	import { EXHIBITION_STATUS_OPTIONS, LAMPSHADE_STATUS_OPTIONS } from '$lib/types';
	import type { LampshadeStatus, ExhibitionStatus } from '$lib/types';
	import { validateExhibitionStatusChange, validateLampshadeInspection, validateLightSourceReplacement, validateMaintenanceRecord, getToday } from '$lib/validation';
	import { addMaintenanceRecord, addLampshadeInspection, addLightSourceReplacement, changeExhibitionStatus } from '$lib/stores';

	let beaconId = $derived($page.params.id ?? '');
	let activeTab = $state<'info' | 'maintenance' | 'lampshade' | 'lightSource' | 'exhibition'>('info');

	let light = $derived($beaconLights.find(l => l.id === beaconId));
	let records = $derived($maintenanceRecords.filter(r => r.beaconLightId === beaconId).sort((a, b) => b.date.localeCompare(a.date)));
	let inspections = $derived($lampshadeInspections.filter(i => i.beaconLightId === beaconId).sort((a, b) => b.date.localeCompare(a.date)));
	let replacements = $derived($lightSourceReplacements.filter(r => r.beaconLightId === beaconId).sort((a, b) => b.date.localeCompare(a.date)));
	let histories = $derived($exhibitionStatusHistories.filter(h => h.beaconLightId === beaconId).sort((a, b) => b.date.localeCompare(a.date)));

	let tabLabels = $derived([
		{ id: 'info', label: '基本信息' },
		{ id: 'maintenance', label: `维护记录 (${records.length})` },
		{ id: 'lampshade', label: `灯罩检查 (${inspections.length})` },
		{ id: 'lightSource', label: `光源更换 (${replacements.length})` },
		{ id: 'exhibition', label: `展陈流转 (${histories.length})` }
	]);

	let showMaintenanceModal = $state(false);
	let showLampshadeModal = $state(false);
	let showLightSourceModal = $state(false);
	let showExhibitionModal = $state(false);
	let showDeleteConfirm = $state(false);

	let maintenanceForm = $state({
		date: getToday(),
		type: '常规维护' as const,
		description: '',
		operator: ''
	});
	let maintenanceErrors = $state<string[]>([]);

	let lampshadeForm = $state({
		date: getToday(),
		inspector: '',
		status: '完好' as LampshadeStatus,
		findings: ''
	});
	let lampshadeErrors = $state<string[]>([]);

	let lightSourceForm = $state({
		date: getToday(),
		reason: '',
		oldSourceType: '',
		newSourceType: '',
		operator: ''
	});
	let lightSourceErrors = $state<string[]>([]);

	let exhibitionForm = $state({
		toStatus: '展出中' as ExhibitionStatus,
		operator: '',
		remark: ''
	});
	let exhibitionErrors = $state<string[]>([]);

	onMount(() => {
		if (!$page.params.id) {
			goto('/');
		}
	});

	function goBack() {
		goto('/');
	}

	function goEdit() {
		goto(`/beacon/${beaconId}/edit`);
	}

	function handleDelete() {
		deleteBeaconLight(beaconId);
		goto('/');
	}

	function openMaintenanceModal() {
		maintenanceForm = { date: getToday(), type: '常规维护', description: '', operator: '' };
		maintenanceErrors = [];
		showMaintenanceModal = true;
	}

	function submitMaintenance() {
		const result = validateMaintenanceRecord({ ...maintenanceForm, beaconLightId: beaconId });
		if (!result.valid) {
			maintenanceErrors = result.errors;
			return;
		}
		addMaintenanceRecord({
			beaconLightId: beaconId,
			...maintenanceForm
		});
		showMaintenanceModal = false;
	}

	function openLampshadeModal() {
		lampshadeForm = { date: getToday(), inspector: '', status: light?.lampshadeStatus ?? '完好', findings: '' };
		lampshadeErrors = [];
		showLampshadeModal = true;
	}

	function submitLampshade() {
		const result = validateLampshadeInspection({ ...lampshadeForm, beaconLightId: beaconId });
		if (!result.valid) {
			lampshadeErrors = result.errors;
			return;
		}
		addLampshadeInspection({
			beaconLightId: beaconId,
			...lampshadeForm
		});
		showLampshadeModal = false;
	}

	function openLightSourceModal() {
		lightSourceForm = { date: getToday(), reason: '', oldSourceType: '', newSourceType: '', operator: '' };
		lightSourceErrors = [];
		showLightSourceModal = true;
	}

	function submitLightSource() {
		const result = validateLightSourceReplacement({ ...lightSourceForm, beaconLightId: beaconId });
		if (!result.valid) {
			lightSourceErrors = result.errors;
			return;
		}
		addLightSourceReplacement({
			beaconLightId: beaconId,
			...lightSourceForm
		});
		showLightSourceModal = false;
	}

	function openExhibitionModal() {
		exhibitionForm = { toStatus: '展出中', operator: '', remark: '' };
		exhibitionErrors = [];
		showExhibitionModal = true;
	}

	function submitExhibition() {
		if (!light) return;
		const result = validateExhibitionStatusChange(
			light.exhibitionStatus,
			exhibitionForm.toStatus,
			light.lampshadeStatus
		);
		if (!result.valid) {
			exhibitionErrors = result.errors;
			return;
		}
		if (!exhibitionForm.operator.trim()) {
			exhibitionErrors = ['操作人员不能为空'];
			return;
		}
		changeExhibitionStatus(beaconId, exhibitionForm.toStatus, exhibitionForm.operator, exhibitionForm.remark);
		showExhibitionModal = false;
	}
</script>

{#if light}
	<div class="space-y-6">
		<div class="flex items-center gap-4">
			<button
				on:click={goBack}
				class="inline-flex items-center gap-1 text-gray-600 hover:text-amber-700 transition-colors"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
				返回列表
			</button>
		</div>

		<div class="bg-white rounded-xl shadow-md overflow-hidden">
			<div class="bg-gradient-to-r from-amber-800 to-amber-700 px-6 py-5">
				<div class="flex justify-between items-start">
					<div>
						<span class="text-amber-200 text-sm font-mono">{light.code}</span>
						<h2 class="text-2xl font-bold text-white mt-1">{light.name}</h2>
					</div>
					<StatusBadge status={light.exhibitionStatus} type="exhibition" />
				</div>
			</div>

			<div class="border-b border-gray-200">
				<nav class="flex -mb-px overflow-x-auto">
					{#each tabLabels as tab}
						<button
							on:click={() => (activeTab = tab.id as typeof activeTab)}
							class="whitespace-nowrap px-4 py-3 text-sm font-medium border-b-2 transition-colors {
								activeTab === tab.id
									? 'border-amber-600 text-amber-700'
									: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
							}"
						>
							{tab.label}
						</button>
					{/each}
				</nav>
			</div>

			<div class="p-6">
				{#if activeTab === 'info'}
					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div class="space-y-4">
							<h3 class="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">基础档案</h3>
							<div class="space-y-3">
								<div class="flex justify-between">
									<span class="text-gray-500">航标灯编号</span>
									<span class="font-medium font-mono">{light.code}</span>
								</div>
								<div class="flex justify-between">
									<span class="text-gray-500">名称</span>
									<span class="font-medium">{light.name}</span>
								</div>
								<div class="flex justify-between">
									<span class="text-gray-500">制造年代</span>
									<span class="font-medium">{light.manufactureYear}年</span>
								</div>
								<div class="flex justify-between">
									<span class="text-gray-500">材质</span>
									<span class="font-medium">{light.material}</span>
								</div>
								<div class="flex justify-between">
									<span class="text-gray-500">原使用海域</span>
									<span class="font-medium">{light.originalSeaArea}</span>
								</div>
								<div class="flex justify-between">
									<span class="text-gray-500">展陈位置</span>
									<span class="font-medium">{light.exhibitionLocation || '-'}</span>
								</div>
							</div>
						</div>

						<div class="space-y-4">
							<h3 class="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">当前状态</h3>
							<div class="space-y-3">
								<div class="flex justify-between items-center">
									<span class="text-gray-500">灯罩状态</span>
									<StatusBadge status={light.lampshadeStatus} type="lampshade" />
								</div>
								<div class="flex justify-between items-center">
									<span class="text-gray-500">光源状态</span>
									<StatusBadge status={light.lightSourceStatus} type="lightSource" />
								</div>
								<div class="flex justify-between items-center">
									<span class="text-gray-500">展陈状态</span>
									<StatusBadge status={light.exhibitionStatus} type="exhibition" />
								</div>
							</div>

							<h3 class="text-lg font-semibold text-gray-800 border-b border-gray-200 pt-4 pb-2">记录时间</h3>
							<div class="space-y-3">
								<div class="flex justify-between">
									<span class="text-gray-500">创建时间</span>
									<span class="font-medium">{light.createdAt}</span>
								</div>
								<div class="flex justify-between">
									<span class="text-gray-500">最近更新</span>
									<span class="font-medium">{light.updatedAt}</span>
								</div>
							</div>
						</div>
					</div>

					<div class="flex flex-wrap gap-3 mt-8 pt-6 border-t border-gray-200">
						<button
							on:click={goEdit}
							class="inline-flex items-center gap-2 px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors font-medium"
						>
							<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
							</svg>
							编辑档案
						</button>
						<button
							on:click={openMaintenanceModal}
							class="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
						>
							<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							记录维护
						</button>
						<button
							on:click={openLampshadeModal}
							class="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
						>
							<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
							</svg>
							灯罩检查
						</button>
						<button
							on:click={openLightSourceModal}
							class="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
						>
							<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
							</svg>
							更换光源
						</button>
						<button
							on:click={openExhibitionModal}
							class="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
						>
							<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
							</svg>
							状态流转
						</button>
						<button
							on:click={() => (showDeleteConfirm = true)}
							class="inline-flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium ml-auto"
						>
							<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
							</svg>
							删除档案
						</button>
					</div>
				{/if}

				{#if activeTab === 'maintenance'}
					<div class="space-y-4">
						<div class="flex justify-between items-center">
							<h3 class="text-lg font-semibold text-gray-800">维护记录</h3>
							<button
								on:click={openMaintenanceModal}
								class="text-sm px-3 py-1.5 bg-amber-700 text-white rounded-md hover:bg-amber-800 transition-colors"
							>
								+ 新增记录
							</button>
						</div>
						{#if records.length > 0}
							<div class="space-y-3">
								{#each records as record}
									<div class="p-4 bg-gray-50 rounded-lg border border-gray-100">
										<div class="flex justify-between items-start mb-2">
											<div>
												<span class="inline-block px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-medium rounded">
													{record.type}
												</span>
												<span class="text-gray-500 text-sm ml-3">{record.date}</span>
											</div>
											<span class="text-sm text-gray-600">操作人：{record.operator}</span>
										</div>
										<p class="text-gray-700">{record.description}</p>
										{#if record.replaceReason}
											<p class="text-sm text-gray-500 mt-2">更换原因：{record.replaceReason}</p>
										{/if}
									</div>
								{/each}
							</div>
						{:else}
							<p class="text-gray-500 text-center py-8">暂无维护记录</p>
						{/if}
					</div>
				{/if}

				{#if activeTab === 'lampshade'}
					<div class="space-y-4">
						<div class="flex justify-between items-center">
							<h3 class="text-lg font-semibold text-gray-800">灯罩检查记录</h3>
							<button
								on:click={openLampshadeModal}
								class="text-sm px-3 py-1.5 bg-amber-700 text-white rounded-md hover:bg-amber-800 transition-colors"
							>
								+ 新增检查
							</button>
						</div>
						{#if inspections.length > 0}
							<div class="space-y-3">
								{#each inspections as inspection}
									<div class="p-4 bg-gray-50 rounded-lg border border-gray-100">
										<div class="flex justify-between items-start mb-2">
											<div class="flex items-center gap-3">
												<StatusBadge status={inspection.status} type="lampshade" />
												<span class="text-gray-500 text-sm">{inspection.date}</span>
											</div>
											<span class="text-sm text-gray-600">检查人：{inspection.inspector}</span>
										</div>
										<p class="text-gray-700 text-sm">检查结果：{inspection.findings}</p>
									</div>
								{/each}
							</div>
						{:else}
							<p class="text-gray-500 text-center py-8">暂无灯罩检查记录</p>
						{/if}
					</div>
				{/if}

				{#if activeTab === 'lightSource'}
					<div class="space-y-4">
						<div class="flex justify-between items-center">
							<h3 class="text-lg font-semibold text-gray-800">光源更换记录</h3>
							<button
								on:click={openLightSourceModal}
								class="text-sm px-3 py-1.5 bg-amber-700 text-white rounded-md hover:bg-amber-800 transition-colors"
							>
								+ 记录更换
							</button>
						</div>
						{#if replacements.length > 0}
							<div class="space-y-3">
								{#each replacements as replacement}
									<div class="p-4 bg-gray-50 rounded-lg border border-gray-100">
										<div class="flex justify-between items-start mb-2">
											<span class="text-gray-500 text-sm">{replacement.date}</span>
											<span class="text-sm text-gray-600">操作人：{replacement.operator}</span>
										</div>
										<p class="text-gray-700 font-medium mb-2">
											{replacement.oldSourceType} → {replacement.newSourceType}
										</p>
										<p class="text-sm text-gray-600">更换原因：{replacement.reason}</p>
									</div>
								{/each}
							</div>
						{:else}
							<p class="text-gray-500 text-center py-8">暂无光源更换记录</p>
						{/if}
					</div>
				{/if}

				{#if activeTab === 'exhibition'}
					<div class="space-y-4">
						<div class="flex justify-between items-center">
							<h3 class="text-lg font-semibold text-gray-800">展陈状态流转</h3>
							<button
								on:click={openExhibitionModal}
								class="text-sm px-3 py-1.5 bg-amber-700 text-white rounded-md hover:bg-amber-800 transition-colors"
							>
								+ 状态变更
							</button>
						</div>
						{#if histories.length > 0}
							<div class="relative">
								<div class="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
								<div class="space-y-4">
									{#each histories as history}
										<div class="relative pl-10">
											<div class="absolute left-2.5 top-1 w-3 h-3 rounded-full bg-amber-600 ring-4 ring-amber-100"></div>
											<div class="bg-gray-50 rounded-lg p-4 border border-gray-100">
												<div class="flex justify-between items-start mb-2">
													<span class="text-gray-500 text-sm">{history.date}</span>
													<span class="text-sm text-gray-600">操作人：{history.operator}</span>
												</div>
												<div class="flex items-center gap-2">
													<StatusBadge status={history.fromStatus} type="exhibition" />
													<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
													</svg>
													<StatusBadge status={history.toStatus} type="exhibition" />
												</div>
												{#if history.remark}
													<p class="text-sm text-gray-600 mt-2">备注：{history.remark}</p>
												{/if}
											</div>
										</div>
									{/each}
								</div>
							</div>
						{:else}
							<p class="text-gray-500 text-center py-8">暂无展陈状态变更记录</p>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</div>

	{#if showMaintenanceModal}
		<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" on:click={() => (showMaintenanceModal = false)}>
			<div class="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto" on:click|stopPropagation>
				<div class="px-6 py-4 border-b border-gray-200">
					<h3 class="text-lg font-semibold text-gray-800">记录维护</h3>
				</div>
				<form on:submit|preventDefault={submitMaintenance} class="p-6 space-y-4">
					{#if maintenanceErrors.length > 0}
						<div class="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
							{#each maintenanceErrors as err}
								<p>{err}</p>
							{/each}
						</div>
					{/if}
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">维护日期</label>
						<input type="date" bind:value={maintenanceForm.date}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none" />
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">维护类型</label>
						<select bind:value={maintenanceForm.type}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none">
							<option value="常规维护">常规维护</option>
							<option value="灯罩检查">灯罩检查</option>
							<option value="光源更换">光源更换</option>
							<option value="其他">其他</option>
						</select>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">维护描述</label>
						<textarea bind:value={maintenanceForm.description} rows={3}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none"></textarea>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">操作人员</label>
						<input type="text" bind:value={maintenanceForm.operator}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none" />
					</div>
					<div class="flex justify-end gap-3 pt-2">
						<button type="button" on:click={() => (showMaintenanceModal = false)}
							class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
							取消
						</button>
						<button type="submit"
							class="px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors">
							保存
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	{#if showLampshadeModal}
		<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" on:click={() => (showLampshadeModal = false)}>
			<div class="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto" on:click|stopPropagation>
				<div class="px-6 py-4 border-b border-gray-200">
					<h3 class="text-lg font-semibold text-gray-800">灯罩检查</h3>
				</div>
				<form on:submit|preventDefault={submitLampshade} class="p-6 space-y-4">
					{#if lampshadeErrors.length > 0}
						<div class="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
							{#each lampshadeErrors as err}
								<p>{err}</p>
							{/each}
						</div>
					{/if}
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">检查日期</label>
						<input type="date" bind:value={lampshadeForm.date}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none" />
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">检查人员</label>
						<input type="text" bind:value={lampshadeForm.inspector}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none" />
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">灯罩状态</label>
						<select bind:value={lampshadeForm.status}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none">
							{#each LAMPSHADE_STATUS_OPTIONS as opt}
								<option value={opt}>{opt}</option>
							{/each}
						</select>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">检查发现</label>
						<textarea bind:value={lampshadeForm.findings} rows={3}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none"></textarea>
					</div>
					<div class="flex justify-end gap-3 pt-2">
						<button type="button" on:click={() => (showLampshadeModal = false)}
							class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
							取消
						</button>
						<button type="submit"
							class="px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors">
							保存
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	{#if showLightSourceModal}
		<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" on:click={() => (showLightSourceModal = false)}>
			<div class="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto" on:click|stopPropagation>
				<div class="px-6 py-4 border-b border-gray-200">
					<h3 class="text-lg font-semibold text-gray-800">光源更换</h3>
				</div>
				<form on:submit|preventDefault={submitLightSource} class="p-6 space-y-4">
					{#if lightSourceErrors.length > 0}
						<div class="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
							{#each lightSourceErrors as err}
								<p>{err}</p>
							{/each}
						</div>
					{/if}
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">更换日期</label>
						<input type="date" bind:value={lightSourceForm.date}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none" />
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">
							更换原因 <span class="text-red-500">*</span>
						</label>
						<textarea bind:value={lightSourceForm.reason} rows={2}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none"></textarea>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">原光源类型</label>
						<input type="text" bind:value={lightSourceForm.oldSourceType} placeholder="如：白炽灯"
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none" />
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">新光源类型</label>
						<input type="text" bind:value={lightSourceForm.newSourceType} placeholder="如：LED灯"
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none" />
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">操作人员</label>
						<input type="text" bind:value={lightSourceForm.operator}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none" />
					</div>
					<div class="flex justify-end gap-3 pt-2">
						<button type="button" on:click={() => (showLightSourceModal = false)}
							class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
							取消
						</button>
						<button type="submit"
							class="px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors">
							保存
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	{#if showExhibitionModal}
		<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" on:click={() => (showExhibitionModal = false)}>
			<div class="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto" on:click|stopPropagation>
				<div class="px-6 py-4 border-b border-gray-200">
					<h3 class="text-lg font-semibold text-gray-800">展陈状态变更</h3>
				</div>
				<form on:submit|preventDefault={submitExhibition} class="p-6 space-y-4">
					{#if exhibitionErrors.length > 0}
						<div class="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
							{#each exhibitionErrors as err}
								<p>{err}</p>
							{/each}
						</div>
					{/if}
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">当前状态</label>
						<div class="px-3 py-2 bg-gray-100 rounded-lg">
							<StatusBadge status={light.exhibitionStatus} type="exhibition" />
						</div>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">变更为</label>
						<select bind:value={exhibitionForm.toStatus}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none">
							{#each EXHIBITION_STATUS_OPTIONS as opt}
								<option value={opt}>{opt}</option>
							{/each}
						</select>
						<p class="text-xs text-gray-500 mt-1">注意：灯罩破损时不能标记为"可展出"</p>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">操作人员</label>
						<input type="text" bind:value={exhibitionForm.operator}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none" />
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">备注</label>
						<textarea bind:value={exhibitionForm.remark} rows={2}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none"></textarea>
					</div>
					<div class="flex justify-end gap-3 pt-2">
						<button type="button" on:click={() => (showExhibitionModal = false)}
							class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
							取消
						</button>
						<button type="submit"
							class="px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors">
							确认变更
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	{#if showDeleteConfirm}
		<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" on:click={() => (showDeleteConfirm = false)}>
			<div class="bg-white rounded-xl shadow-xl max-w-sm w-full" on:click|stopPropagation>
				<div class="p-6">
					<div class="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
						<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
						</svg>
					</div>
					<h3 class="text-lg font-semibold text-gray-800 text-center mb-2">确认删除</h3>
					<p class="text-gray-600 text-center text-sm mb-6">
						确定要删除航标灯"{light.name}"吗？所有相关记录将一并删除，此操作不可撤销。
					</p>
					<div class="flex gap-3">
						<button on:click={() => (showDeleteConfirm = false)}
							class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
							取消
						</button>
						<button on:click={handleDelete}
							class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
							确认删除
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
{:else}
	<div class="text-center py-16">
		<p class="text-gray-500">未找到该航标灯记录</p>
		<button on:click={goBack} class="mt-4 text-amber-700 hover:underline">返回列表</button>
	</div>
{/if}
