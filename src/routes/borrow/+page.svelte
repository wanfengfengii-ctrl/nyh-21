<script lang="ts">
	import {
		borrowRequests,
		beaconLights,
		museums,
		currentUser,
		currentMuseumId,
		createBorrowRequest,
		approveBorrowRequest,
		startBorrow,
		returnBorrow,
		cancelBorrowRequest,
		exportToCSV,
		downloadCSV
	} from '$lib/stores';
	import { validateBorrowRequest, getBorrowDaysRemaining, getToday } from '$lib/validation';
	import type { BorrowRequest, BorrowRequestStatus } from '$lib/types';
	import { BORROW_STATUS_OPTIONS } from '$lib/types';
	import StatusBadge from '$lib/components/StatusBadge.svelte';

	let showCreateModal = $state(false);
	let showDetailModal = $state(false);
	let selectedRequest = $state<BorrowRequest | null>(null);
	let activeTab = $state<'all' | 'pending' | 'active' | 'returned'>('all');
	let statusFilter = $state<string>('');
	let searchKeyword = $state('');
	let createErrors = $state<string[]>([]);

	let createForm = $state({
		beaconLightId: '',
		sourceMuseumId: '',
		targetMuseumId: '',
		plannedStartDate: '',
		plannedEndDate: '',
		purpose: '',
		exhibitionLocation: '',
		remark: ''
	});

	$effect(() => {
		if ($currentUser?.role === '系统管理员') {
			createForm.sourceMuseumId = $currentMuseumId;
		} else {
			createForm.sourceMuseumId = $currentMuseumId;
		}
	});

	const filteredRequests = $derived(() => {
		let result = [...$borrowRequests];

		if ($currentUser?.role !== '系统管理员') {
			result = result.filter(r =>
				r.sourceMuseumId === $currentMuseumId || r.targetMuseumId === $currentMuseumId
			);
		}

		if (activeTab === 'pending') {
			result = result.filter(r => r.status === '待审批');
		} else if (activeTab === 'active') {
			result = result.filter(r => r.status === '借展中' || r.status === '已批准');
		} else if (activeTab === 'returned') {
			result = result.filter(r => r.status === '已归还' || r.status === '已拒绝' || r.status === '已取消');
		}

		if (statusFilter) {
			result = result.filter(r => r.status === statusFilter);
		}

		if (searchKeyword.trim()) {
			const kw = searchKeyword.toLowerCase();
			result = result.filter(r =>
				r.beaconLightName.toLowerCase().includes(kw) ||
				r.beaconLightCode.toLowerCase().includes(kw) ||
				r.applicantName.toLowerCase().includes(kw) ||
				r.sourceMuseumName.toLowerCase().includes(kw) ||
				r.targetMuseumName.toLowerCase().includes(kw)
			);
		}

		return result.sort((a, b) => b.applyDate.localeCompare(a.applyDate));
	});

	const availableLights = $derived(() => {
		return $beaconLights.filter(l =>
			l.museumId === createForm.sourceMuseumId &&
			!l.isOnBorrow &&
			!l.isUnderRepair &&
			l.lampshadeStatus !== '破损'
		);
	});

	function openCreateModal() {
		createForm = {
			beaconLightId: '',
			sourceMuseumId: $currentMuseumId,
			targetMuseumId: '',
			plannedStartDate: getToday(),
			plannedEndDate: '',
			purpose: '',
			exhibitionLocation: '',
			remark: ''
		};
		createErrors = [];
		showCreateModal = true;
	}

	function handleCreate() {
		const light = $beaconLights.find(l => l.id === createForm.beaconLightId);
		const result = validateBorrowRequest(createForm, light);

		if (!result.valid) {
			createErrors = result.errors;
			return;
		}

		const createResult = createBorrowRequest({
			beaconLightId: createForm.beaconLightId,
			sourceMuseumId: createForm.sourceMuseumId,
			targetMuseumId: createForm.targetMuseumId,
			applicantId: $currentUser?.id || '',
			applyDate: getToday(),
			plannedStartDate: createForm.plannedStartDate,
			plannedEndDate: createForm.plannedEndDate,
			purpose: createForm.purpose,
			exhibitionLocation: createForm.exhibitionLocation,
			remark: createForm.remark
		});

		if (!createResult.success) {
			createErrors = createResult.errors;
			return;
		}

		showCreateModal = false;
	}

	function openDetail(request: BorrowRequest) {
		selectedRequest = request;
		showDetailModal = true;
	}

	function handleApprove(action: '通过' | '拒绝') {
		if (!selectedRequest) return;
		const comment = prompt(action === '通过' ? '请输入审批意见：' : '请输入拒绝原因：', '');
		if (comment === null) return;
		approveBorrowRequest(selectedRequest.id, action, comment || (action === '通过' ? '同意' : '拒绝'));
		selectedRequest = $borrowRequests.find(r => r.id === selectedRequest?.id) || null;
	}

	function handleStart() {
		if (!selectedRequest) return;
		if (!confirm('确认开始借展？藏品将标记为借出状态。')) return;
		startBorrow(selectedRequest.id);
		selectedRequest = $borrowRequests.find(r => r.id === selectedRequest?.id) || null;
	}

	function handleReturn() {
		if (!selectedRequest) return;
		if (!confirm('确认归还？藏品将标记为已归还状态。')) return;
		returnBorrow(selectedRequest.id);
		selectedRequest = $borrowRequests.find(r => r.id === selectedRequest?.id) || null;
	}

	function handleCancel() {
		if (!selectedRequest) return;
		if (!confirm('确认取消该借展申请？')) return;
		cancelBorrowRequest(selectedRequest.id);
		selectedRequest = $borrowRequests.find(r => r.id === selectedRequest?.id) || null;
	}

	function handleExport() {
		const csv = exportToCSV('borrowRequests');
		downloadCSV(csv, '借展申请记录.csv');
	}

	function getBorrowStatusClass(status: BorrowRequestStatus) {
		const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
		switch (status) {
			case '待审批': return `${base} bg-amber-100 text-amber-800`;
			case '已批准': return `${base} bg-blue-100 text-blue-800`;
			case '借展中': return `${base} bg-emerald-100 text-emerald-800`;
			case '已归还': return `${base} bg-gray-100 text-gray-800`;
			case '已拒绝': return `${base} bg-red-100 text-red-800`;
			case '已取消': return `${base} bg-gray-100 text-gray-600`;
			case '已逾期': return `${base} bg-red-100 text-red-700`;
			default: return `${base} bg-gray-100 text-gray-800`;
		}
	}

	const tabCounts = $derived(() => {
		const all = filteredRequests().length;
		const pending = $borrowRequests.filter(r => r.status === '待审批').length;
		const active = $borrowRequests.filter(r => r.status === '借展中' || r.status === '已批准').length;
		const returned = $borrowRequests.filter(r => r.status === '已归还' || r.status === '已拒绝' || r.status === '已取消').length;
		return { all, pending, active, returned };
	});

	const tabs = $derived(() => [
		{ id: 'all', label: '全部', count: tabCounts().all },
		{ id: 'pending', label: '待审批', count: tabCounts().pending },
		{ id: 'active', label: '进行中', count: tabCounts().active },
		{ id: 'returned', label: '已完成', count: tabCounts().returned }
	]);

	const canCreateBorrow = $derived(() => {
		return $currentUser?.role === '馆区管理员' || $currentUser?.role === '系统管理员' || $currentUser?.role === '保管员';
	});

	const canApprove = $derived(() => {
		return $currentUser?.role === '馆区管理员' || $currentUser?.role === '系统管理员';
	});
</script>

<div class="space-y-6">
	<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
		<div>
			<h2 class="text-2xl font-bold text-amber-900">借展管理</h2>
			<p class="text-gray-600 mt-1">跨馆区借展申请、审批与归还管理</p>
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
			{#if canCreateBorrow()}
				<button
					on:click={openCreateModal}
					class="inline-flex items-center gap-2 px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors font-medium shadow-md"
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
					</svg>
					发起借展
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
						placeholder="搜索藏品名称、编号、申请人、馆区..."
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
					{#each BORROW_STATUS_OPTIONS as status}
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

	<!-- 借展列表 -->
	<div class="bg-white rounded-xl shadow-md overflow-hidden">
		{#if filteredRequests().length > 0}
			<div class="divide-y divide-gray-100">
				{#each filteredRequests() as request (request.id)}
					<div
						class="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
						on:click={() => openDetail(request)}
					>
						<div class="flex items-start justify-between">
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-3 mb-2">
									<span class="text-xs text-amber-700 font-mono font-semibold">{request.beaconLightCode}</span>
									<h3 class="font-semibold text-gray-800 truncate">{request.beaconLightName}</h3>
									<span class={getBorrowStatusClass(request.status)}>{request.status}</span>
									{#if request.status === '借展中' && getBorrowDaysRemaining(request) <= 7 && getBorrowDaysRemaining(request) >= 0}
										<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
											还剩 {getBorrowDaysRemaining(request)} 天
										</span>
									{/if}
									{#if request.status === '已逾期'}
										<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
											逾期 {getBorrowDaysRemaining(request) * -1} 天
										</span>
									{/if}
								</div>
								<div class="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
									<span>
										<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
										</svg>
										{request.sourceMuseumName} → {request.targetMuseumName}
									</span>
									<span>
										<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
										</svg>
										申请人：{request.applicantName}
									</span>
									<span>
										<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
										</svg>
										{request.plannedStartDate} ~ {request.plannedEndDate}
									</span>
								</div>
								<p class="text-sm text-gray-500 mt-2 line-clamp-1">用途：{request.purpose}</p>
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
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
				</svg>
				<p class="text-gray-500">暂无借展申请记录</p>
			</div>
		{/if}
	</div>

	<!-- 创建借展申请弹窗 -->
	{#if showCreateModal}
		<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" on:click={() => (showCreateModal = false)}>
			<div class="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" on:click|stopPropagation>
				<div class="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
					<h3 class="text-lg font-semibold text-gray-800">发起借展申请</h3>
				</div>
				<form on:submit|preventDefault={handleCreate} class="p-6 space-y-4">
					{#if createErrors.length > 0}
						<div class="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
							{#each createErrors as err}
								<p>{err}</p>
							{/each}
						</div>
					{/if}

					<div class="grid grid-cols-2 gap-4">
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">出借馆区 *</label>
							<select
								bind:value={createForm.sourceMuseumId}
								disabled={$currentUser?.role !== '系统管理员'}
								class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none disabled:bg-gray-100"
							>
								{#each $museums as museum}
									{#if $currentUser?.role === '系统管理员' || museum.id === $currentMuseumId}
										<option value={museum.id}>{museum.name}</option>
									{/if}
								{/each}
							</select>
						</div>
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">借入馆区 *</label>
							<select
								bind:value={createForm.targetMuseumId}
								class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
							>
								<option value="">请选择</option>
								{#each $museums as museum}
									{#if museum.id !== createForm.sourceMuseumId}
										<option value={museum.id}>{museum.name}</option>
									{/if}
								{/each}
							</select>
						</div>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">借展藏品 *</label>
						<select
							bind:value={createForm.beaconLightId}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
						>
							<option value="">请选择藏品</option>
							{#if availableLights().length > 0}
								{#each availableLights() as light}
									<option value={light.id}>[{light.code}] {light.name}</option>
								{/each}
							{:else}
								<option value="" disabled>该馆区暂无可借展藏品</option>
							{/if}
						</select>
						<p class="text-xs text-gray-500 mt-1">提示：修复中、借展中、灯罩破损的藏品不可借展</p>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">计划开始日期 *</label>
							<input
								type="date"
								bind:value={createForm.plannedStartDate}
								class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
							/>
						</div>
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">计划结束日期 *</label>
							<input
								type="date"
								bind:value={createForm.plannedEndDate}
								class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
							/>
						</div>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">借展用途 *</label>
						<textarea
							bind:value={createForm.purpose}
							rows={2}
							placeholder="请说明借展的目的和用途"
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none"
						></textarea>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">展陈位置 *</label>
						<input
							type="text"
							bind:value={createForm.exhibitionLocation}
							placeholder="借入馆区的具体展陈位置"
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
						/>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">备注</label>
						<textarea
							bind:value={createForm.remark}
							rows={2}
							placeholder="其他需要说明的事项"
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none"
						></textarea>
					</div>

					<div class="flex justify-end gap-3 pt-2 border-t border-gray-100">
						<button type="button" on:click={() => (showCreateModal = false)}
							class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
							取消
						</button>
						<button type="submit"
							class="px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors">
							提交申请
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	<!-- 借展详情弹窗 -->
	{#if showDetailModal && selectedRequest}
		<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" on:click={() => (showDetailModal = false)}>
			<div class="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" on:click|stopPropagation>
				<div class="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
					<div class="flex justify-between items-center">
						<h3 class="text-lg font-semibold text-gray-800">借展详情</h3>
						<span class={getBorrowStatusClass(selectedRequest.status)}>{selectedRequest.status}</span>
					</div>
				</div>

				<div class="p-6 space-y-6">
					<!-- 基本信息 -->
					<div class="grid grid-cols-2 gap-4">
						<div>
							<p class="text-sm text-gray-500">藏品编号</p>
							<p class="font-mono font-medium text-amber-700">{selectedRequest.beaconLightCode}</p>
						</div>
						<div>
							<p class="text-sm text-gray-500">藏品名称</p>
							<p class="font-medium">{selectedRequest.beaconLightName}</p>
						</div>
						<div>
							<p class="text-sm text-gray-500">出借馆区</p>
							<p class="font-medium">{selectedRequest.sourceMuseumName}</p>
						</div>
						<div>
							<p class="text-sm text-gray-500">借入馆区</p>
							<p class="font-medium">{selectedRequest.targetMuseumName}</p>
						</div>
						<div>
							<p class="text-sm text-gray-500">申请人</p>
							<p class="font-medium">{selectedRequest.applicantName}</p>
						</div>
						<div>
							<p class="text-sm text-gray-500">申请日期</p>
							<p class="font-medium">{selectedRequest.applyDate}</p>
						</div>
					</div>

					<!-- 时间信息 -->
					<div class="bg-gray-50 rounded-lg p-4">
						<h4 class="font-medium text-gray-800 mb-3">借展时间</h4>
						<div class="grid grid-cols-2 gap-4">
							<div>
								<p class="text-sm text-gray-500">计划开始</p>
								<p class="font-medium">{selectedRequest.plannedStartDate}</p>
							</div>
							<div>
								<p class="text-sm text-gray-500">计划结束</p>
								<p class="font-medium">{selectedRequest.plannedEndDate}</p>
							</div>
							<div>
								<p class="text-sm text-gray-500">实际开始</p>
								<p class="font-medium">{selectedRequest.actualStartDate || '-'}</p>
							</div>
							<div>
								<p class="text-sm text-gray-500">实际结束</p>
								<p class="font-medium">{selectedRequest.actualEndDate || '-'}</p>
							</div>
						</div>
						{#if selectedRequest.status === '借展中'}
							<div class="mt-3 pt-3 border-t border-gray-200">
								<p class="text-sm">
									<span class="text-gray-500">剩余天数：</span>
									{#if getBorrowDaysRemaining(selectedRequest) >= 0}
										<span class="font-medium text-emerald-600">还剩 {getBorrowDaysRemaining(selectedRequest)} 天</span>
									{:else}
										<span class="font-medium text-red-600">已逾期 {getBorrowDaysRemaining(selectedRequest) * -1} 天</span>
									{/if}
								</p>
							</div>
						{/if}
					</div>

					<!-- 用途与位置 -->
					<div class="space-y-3">
						<div>
							<p class="text-sm text-gray-500 mb-1">借展用途</p>
							<p class="text-gray-700">{selectedRequest.purpose}</p>
						</div>
						<div>
							<p class="text-sm text-gray-500 mb-1">展陈位置</p>
							<p class="text-gray-700">{selectedRequest.exhibitionLocation}</p>
						</div>
						{#if selectedRequest.remark}
							<div>
								<p class="text-sm text-gray-500 mb-1">备注</p>
								<p class="text-gray-700">{selectedRequest.remark}</p>
							</div>
						{/if}
					</div>

					<!-- 审批流程 -->
					<div>
						<h4 class="font-medium text-gray-800 mb-3">审批流程（审批留痕）</h4>
						<div class="relative">
							<div class="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200"></div>
							<div class="space-y-4">
								{#each selectedRequest.approvalHistory as record}
									<div class="relative pl-8">
										<div class="absolute left-1.5 top-1 w-3 h-3 rounded-full bg-amber-600 ring-4 ring-amber-100"></div>
										<div class="bg-gray-50 rounded-lg p-3 border border-gray-100">
											<div class="flex justify-between items-start mb-1">
												<div class="flex items-center gap-2">
													<span class="font-medium text-sm">{record.approverName}</span>
													<span class="text-xs text-gray-500">({record.approverRole})</span>
												</div>
												<span class="text-xs text-gray-400">{record.timestamp}</span>
											</div>
											<div class="flex items-center gap-2">
												<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium {
													record.action === '通过' ? 'bg-green-100 text-green-700' :
													record.action === '拒绝' ? 'bg-red-100 text-red-700' :
													'bg-blue-100 text-blue-700'
												}">
													{record.action}
												</span>
												<p class="text-sm text-gray-600">{record.comment}</p>
											</div>
										</div>
									</div>
								{/each}
							</div>
						</div>
					</div>

					<!-- 操作按钮 -->
					<div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
						{#if selectedRequest.status === '待审批' && canApprove()}
							<button
								on:click={() => handleApprove('通过')}
								class="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
							>
								审批通过
							</button>
							<button
								on:click={() => handleApprove('拒绝')}
								class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
							>
								审批拒绝
							</button>
						{/if}

						{#if selectedRequest.status === '已批准'}
							<button
								on:click={handleStart}
								class="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
							>
								确认借出
							</button>
						{/if}

						{#if selectedRequest.status === '借展中'}
							<button
								on:click={handleReturn}
								class="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
							>
								确认归还
							</button>
						{/if}

						{#if (selectedRequest.status === '待审批' || selectedRequest.status === '已批准') && selectedRequest.applicantId === $currentUser?.id}
							<button
								on:click={handleCancel}
								class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
							>
								取消申请
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
