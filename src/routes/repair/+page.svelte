<script lang="ts">
	import {
		repairOrders,
		beaconLights,
		currentUser,
		currentMuseumId,
		createRepairOrder,
		assignRepairOrder,
		startRepair,
		completeRepair,
		cancelRepairOrder,
		exportToCSV,
		downloadCSV
	} from '$lib/stores';
	import { validateRepairOrder } from '$lib/validation';
	import type { RepairOrder, RepairPriority, RepairOrderStatus } from '$lib/types';
	import { REPAIR_STATUS_OPTIONS, REPAIR_PRIORITY_OPTIONS } from '$lib/types';
	import StatusBadge from '$lib/components/StatusBadge.svelte';

	let showCreateModal = $state(false);
	let showDetailModal = $state(false);
	let selectedOrder = $state<RepairOrder | null>(null);
	let activeTab = $state<'all' | 'pending' | 'inProgress' | 'completed'>('all');
	let statusFilter = $state<string>('');
	let searchKeyword = $state('');
	let createErrors = $state<string[]>([]);

	let createForm = $state({
		beaconLightId: '',
		repairType: '常规维护',
		priority: '中' as RepairPriority,
		description: '',
		estimatedDays: 7
	});

	$effect(() => {
		// 重置表单
	});

	const filteredOrders = $derived(() => {
		let result = [...$repairOrders];

		if ($currentUser?.role !== '系统管理员') {
			result = result.filter(r => r.museumId === $currentMuseumId);
		}

		if (activeTab === 'pending') {
			result = result.filter(r => r.status === '待分配');
		} else if (activeTab === 'inProgress') {
			result = result.filter(r => r.status === '修复中' || r.status === '待验收');
		} else if (activeTab === 'completed') {
			result = result.filter(r => r.status === '已完成' || r.status === '已取消');
		}

		if (statusFilter) {
			result = result.filter(r => r.status === statusFilter);
		}

		if (searchKeyword.trim()) {
			const kw = searchKeyword.toLowerCase();
			result = result.filter(r =>
				r.beaconLightName.toLowerCase().includes(kw) ||
				r.beaconLightCode.toLowerCase().includes(kw) ||
				r.description.toLowerCase().includes(kw) ||
				r.repairType.toLowerCase().includes(kw)
			);
		}

		return result.sort((a, b) => b.createDate.localeCompare(a.createDate));
	});

	const availableLights = $derived(() => {
		return $beaconLights.filter(l =>
			l.museumId === $currentMuseumId && !l.isUnderRepair
		);
	});

	function openCreateModal() {
		createForm = {
			beaconLightId: '',
			repairType: '常规维护',
			priority: '中' as RepairPriority,
			description: '',
			estimatedDays: 7
		};
		createErrors = [];
		showCreateModal = true;
	}

	function handleCreate() {
		const light = $beaconLights.find(l => l.id === createForm.beaconLightId);
		const result = validateRepairOrder(createForm, light);

		if (!result.valid) {
			createErrors = result.errors;
			return;
		}

		createRepairOrder({
			beaconLightId: createForm.beaconLightId,
			museumId: $currentMuseumId,
			reporterId: $currentUser?.id || '',
			repairType: createForm.repairType,
			priority: createForm.priority,
			description: createForm.description
		});

		showCreateModal = false;
	}

	function openDetail(order: RepairOrder) {
		selectedOrder = order;
		showDetailModal = true;
	}

	function handleAssign() {
		if (!selectedOrder) return;
		if (!confirm('确认分配该修复工单？')) return;
		assignRepairOrder(selectedOrder.id, $currentUser?.id || '');
		selectedOrder = $repairOrders.find(r => r.id === selectedOrder?.id) || null;
	}

	function handleStart() {
		if (!selectedOrder) return;
		const repairPlan = prompt('请输入修复方案：', '');
		if (repairPlan === null) return;
		startRepair(selectedOrder.id, repairPlan || '开始修复');
		selectedOrder = $repairOrders.find(r => r.id === selectedOrder?.id) || null;
	}

	function handleComplete() {
		if (!selectedOrder) return;
		if (!confirm('确认完成修复？')) return;
		completeRepair(selectedOrder.id);
		selectedOrder = $repairOrders.find(r => r.id === selectedOrder?.id) || null;
	}

	function handleCancel() {
		if (!selectedOrder) return;
		const reason = prompt('请输入取消原因：', '');
		if (reason === null) return;
		cancelRepairOrder(selectedOrder.id, reason || '取消');
		selectedOrder = $repairOrders.find(r => r.id === selectedOrder?.id) || null;
	}

	function handleExport() {
		const csv = exportToCSV('repairOrders');
		downloadCSV(csv, '修复工单记录.csv');
	}

	function getRepairStatusClass(status: RepairOrderStatus) {
		const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
		switch (status) {
			case '待分配': return `${base} bg-amber-100 text-amber-800`;
			case '修复中': return `${base} bg-blue-100 text-blue-800`;
			case '待验收': return `${base} bg-purple-100 text-purple-800`;
			case '已完成': return `${base} bg-emerald-100 text-emerald-800`;
			case '已取消': return `${base} bg-gray-100 text-gray-600`;
			default: return `${base} bg-gray-100 text-gray-800`;
		}
	}

	function getPriorityClass(priority: RepairPriority) {
		const base = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium';
		switch (priority) {
			case '高': return `${base} bg-orange-100 text-orange-700`;
			case '中': return `${base} bg-amber-100 text-amber-700`;
			case '低': return `${base} bg-gray-100 text-gray-600`;
			default: return `${base} bg-gray-100 text-gray-600`;
		}
	}

	const tabCounts = $derived(() => {
		const all = filteredOrders().length;
		const pending = $repairOrders.filter(r => r.status === '待分配').length;
		const inProgress = $repairOrders.filter(r => r.status === '修复中' || r.status === '待验收').length;
		const completed = $repairOrders.filter(r => r.status === '已完成' || r.status === '已取消').length;
		return { all, pending, inProgress, completed };
	});

	const tabs = $derived(() => [
		{ id: 'all', label: '全部', count: tabCounts().all },
		{ id: 'pending', label: '待分配', count: tabCounts().pending },
		{ id: 'inProgress', label: '进行中', count: tabCounts().inProgress },
		{ id: 'completed', label: '已完成', count: tabCounts().completed }
	]);

	const canCreateRepair = $derived(() => {
		return $currentUser?.role === '保管员' || $currentUser?.role === '研究员' ||
			$currentUser?.role === '馆区管理员' || $currentUser?.role === '系统管理员';
	});

	const canAssignRepair = $derived(() => {
		return $currentUser?.role === '馆区管理员' || $currentUser?.role === '系统管理员';
	});

	const canDoRepair = $derived(() => {
		return $currentUser?.role === '修复师' || $currentUser?.role === '系统管理员';
	});
</script>

<div class="space-y-6">
	<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
		<div>
			<h2 class="text-2xl font-bold text-amber-900">修复工单</h2>
			<p class="text-gray-600 mt-1">航标灯修复申请、分配与管理</p>
		</div>
		<div class="flex gap-2">
			<button
				on:click={handleExport}
				class="inline-flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
				</svg>
				导出
			</button>
			{#if canCreateRepair()}
				<button
					on:click={openCreateModal}
					class="inline-flex items-center gap-2 px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors font-medium shadow-md"
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
					</svg>
					创建工单
				</button>
			{/if}
		</div>
	</div>

	<!-- 筛选与搜索 -->
	<div class="bg-white rounded-xl shadow-md p-4">
		<div class="flex flex-col md:flex-row gap-4">
			<div class="flex-1">
				<div class="relative">
					<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
					</svg>
					<input
						type="text"
						placeholder="搜索藏品名称、编号、问题描述..."
						bind:value={searchKeyword}
						class="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all outline-none"
					/>
				</div>
			</div>
			<div class="md:w-48">
				<select
					bind:value={statusFilter}
					class="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
				>
					<option value="">全部状态</option>
					{#each REPAIR_STATUS_OPTIONS as status}
						<option value={status}>{status}</option>
					{/each}
				</select>
			</div>
		</div>

		<!-- 标签页 -->
		<div class="flex gap-1 mt-4 border-t border-gray-100 pt-4">
			{#each tabs() as tab}
				<button
					on:click={() => (activeTab = tab.id as typeof activeTab)}
					class="px-4 py-2 text-sm font-medium rounded-lg transition-colors {
						activeTab === tab.id
							? 'bg-amber-100 text-amber-800'
							: 'text-gray-600 hover:bg-gray-100'
					}"
				>
					{tab.label}
					<span class="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-gray-200 text-gray-600">
						{tab.count}
					</span>
				</button>
			{/each}
		</div>
	</div>

	<!-- 工单列表 -->
	<div class="bg-white rounded-xl shadow-md overflow-hidden">
		{#if filteredOrders().length > 0}
			<div class="divide-y divide-gray-100">
				{#each filteredOrders() as order (order.id)}
					<div
						class="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
						on:click={() => openDetail(order)}
					>
						<div class="flex items-start justify-between">
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-3 mb-2">
									<span class="text-xs text-amber-700 font-mono font-semibold">{order.beaconLightCode}</span>
									<h3 class="font-semibold text-gray-800 truncate">{order.beaconLightName}</h3>
									<span class={getRepairStatusClass(order.status)}>{order.status}</span>
									<span class={getPriorityClass(order.priority)}>{order.priority}优先级</span>
								</div>
								<div class="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
									<span>
										<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
										</svg>
										{order.repairType}
									</span>
									<span>
										<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
										</svg>
										报告人：{order.reporterName}
									</span>
									<span>
										<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
										</svg>
										{order.createDate}
									</span>
								</div>
								<p class="text-sm text-gray-500 mt-2 line-clamp-2">{order.description}</p>
								{#if order.assigneeName}
									<p class="text-xs text-gray-400 mt-1">
										修复师：{order.assigneeName}
									</p>
								{/if}
							</div>
							<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-gray-400 flex-shrink-0 ml-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
							</svg>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="p-12 text-center">
				<svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
				</svg>
				<p class="text-gray-500">暂无修复工单记录</p>
			</div>
		{/if}
	</div>

	<!-- 创建工单弹窗 -->
	{#if showCreateModal}
		<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" on:click={() => (showCreateModal = false)}>
			<div class="bg-white rounded-xl shadow-xl max-w-lg w-full" on:click|stopPropagation>
				<div class="px-6 py-4 border-b border-gray-200">
					<h3 class="text-lg font-semibold text-gray-800">创建修复工单</h3>
				</div>
				<form on:submit|preventDefault={handleCreate} class="p-6 space-y-4">
					{#if createErrors.length > 0}
						<div class="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
							{#each createErrors as err}
								<p>{err}</p>
							{/each}
						</div>
					{/if}

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">选择藏品 *</label>
						<select
							bind:value={createForm.beaconLightId}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
						>
							<option value="">请选择需要修复的藏品</option>
							{#if availableLights().length > 0}
								{#each availableLights() as light}
									<option value={light.id}>[{light.code}] {light.name}</option>
								{/each}
							{:else}
								<option value="" disabled>该馆区所有藏品均在修复中</option>
							{/if}
						</select>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">修复类型 *</label>
							<select
								bind:value={createForm.repairType}
								class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
							>
								<option value="常规维护">常规维护</option>
								<option value="灯罩修复">灯罩修复</option>
								<option value="结构修复">结构修复</option>
								<option value="配件更换">配件更换</option>
								<option value="清洁保养">清洁保养</option>
								<option value="其他">其他</option>
							</select>
						</div>
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">优先级 *</label>
							<select
								bind:value={createForm.priority}
								class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
							>
								{#each REPAIR_PRIORITY_OPTIONS as p}
									<option value={p}>{p}</option>
								{/each}
							</select>
						</div>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">问题描述 *</label>
						<textarea
							bind:value={createForm.description}
							rows={3}
							placeholder="请详细描述需要修复的问题"
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none"
						></textarea>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">预计修复天数</label>
						<input
							type="number"
							bind:value={createForm.estimatedDays}
							min="1"
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
						/>
					</div>

					<div class="flex justify-end gap-3 pt-2 border-t border-gray-100">
						<button type="button" on:click={() => (showCreateModal = false)}
							class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
							取消
						</button>
						<button type="submit"
							class="px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors">
							提交工单
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	<!-- 工单详情弹窗 -->
	{#if showDetailModal && selectedOrder}
		<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" on:click={() => (showDetailModal = false)}>
			<div class="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" on:click|stopPropagation>
				<div class="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
					<div class="flex justify-between items-center">
						<h3 class="text-lg font-semibold text-gray-800">修复工单详情</h3>
						<div class="flex gap-2">
							<span class={getPriorityClass(selectedOrder.priority)}>{selectedOrder.priority}</span>
							<span class={getRepairStatusClass(selectedOrder.status)}>{selectedOrder.status}</span>
						</div>
					</div>
				</div>

				<div class="p-6 space-y-6">
					<!-- 基本信息 -->
					<div class="grid grid-cols-2 gap-4">
						<div>
							<p class="text-sm text-gray-500">藏品编号</p>
							<p class="font-mono font-medium text-amber-700">{selectedOrder.beaconLightCode}</p>
						</div>
						<div>
							<p class="text-sm text-gray-500">藏品名称</p>
							<p class="font-medium">{selectedOrder.beaconLightName}</p>
						</div>
						<div>
							<p class="text-sm text-gray-500">修复类型</p>
							<p class="font-medium">{selectedOrder.repairType}</p>
						</div>
						<div>
							<p class="text-sm text-gray-500">报告人</p>
							<p class="font-medium">{selectedOrder.reporterName}</p>
						</div>
						<div>
							<p class="text-sm text-gray-500">创建日期</p>
							<p class="font-medium">{selectedOrder.createDate}</p>
						</div>
						{#if selectedOrder.assignDate}
							<div>
								<p class="text-sm text-gray-500">分配日期</p>
								<p class="font-medium">{selectedOrder.assignDate}</p>
							</div>
						{/if}
						{#if selectedOrder.assigneeName}
							<div>
								<p class="text-sm text-gray-500">修复师</p>
								<p class="font-medium">{selectedOrder.assigneeName}</p>
							</div>
						{/if}
						{#if selectedOrder.completeDate}
							<div>
								<p class="text-sm text-gray-500">完成日期</p>
								<p class="font-medium">{selectedOrder.completeDate}</p>
							</div>
						{/if}
					</div>

					<!-- 问题描述 -->
					<div class="bg-gray-50 rounded-lg p-4">
						<h4 class="font-medium text-gray-800 mb-2">问题描述</h4>
						<p class="text-gray-700 whitespace-pre-wrap">{selectedOrder.description}</p>
					</div>

					{#if selectedOrder.repairResult}
						<div class="bg-emerald-50 rounded-lg p-4">
							<h4 class="font-medium text-emerald-800 mb-2">修复结果</h4>
							<p class="text-emerald-700 whitespace-pre-wrap">{selectedOrder.repairResult}</p>
						</div>
					{/if}

					{#if selectedOrder.cancelReason}
						<div class="bg-red-50 rounded-lg p-4">
							<h4 class="font-medium text-red-800 mb-2">取消原因</h4>
							<p class="text-red-700 whitespace-pre-wrap">{selectedOrder.cancelReason}</p>
						</div>
					{/if}

					<!-- 操作按钮 -->
					<div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
						{#if selectedOrder.status === '待分配' && canAssignRepair()}
							<button
								on:click={handleAssign}
								class="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
							>
								分配给我
							</button>
						{/if}

						{#if selectedOrder.status === '待分配' && selectedOrder.assigneeId === $currentUser?.id && canDoRepair()}
							<button
								on:click={handleStart}
								class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
							>
								开始修复
							</button>
						{/if}

						{#if selectedOrder.status === '修复中' && selectedOrder.assigneeId === $currentUser?.id}
							<button
								on:click={handleComplete}
								class="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
							>
								完成修复
							</button>
						{/if}

						{#if (selectedOrder.status === '待分配' || selectedOrder.status === '修复中') &&
							($currentUser?.role === '馆区管理员' || $currentUser?.role === '系统管理员')}
							<button
								on:click={handleCancel}
								class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
							>
								取消工单
							</button>
						{/if}

						<button
							on:click={() => (showDetailModal = false)}
							class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
						>
							关闭
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
