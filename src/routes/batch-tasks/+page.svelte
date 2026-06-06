<script lang="ts">
	import {
		batchTasks,
		createBatchTask,
		dispatchBatchTask,
		updateBatchTaskItem,
		beaconLights,
		currentUser,
		currentMuseumId
	} from '$lib/stores';
	import {
		BATCH_TASK_PRIORITY_OPTIONS,
		BATCH_TASK_STATUS_OPTIONS
	} from '$lib/types';
	import type {
		BatchTask,
		BatchTaskItem,
		BatchTaskPriority,
		BatchTaskStatus
	} from '$lib/types';

	const BATCH_TASK_TYPE_OPTIONS = ['批量巡检', '批量通知', '批量导出', '批量更新', '其他'] as const;
	const BATCH_TASK_ITEM_STATUS_OPTIONS = ['待处理', '处理中', '已完成', '失败'] as const;

	type BatchTaskType = typeof BATCH_TASK_TYPE_OPTIONS[number];

	let searchKeyword = $state('');
	let statusFilter = $state<string>('');
	let typeFilter = $state<string>('');

	let showCreateModal = $state(false);
	let showDetailModal = $state(false);
	let selectedTask = $state<BatchTask | null>(null);

	let formErrors = $state<string[]>([]);

	let taskForm = $state({
		title: '',
		description: '',
		type: '批量巡检' as BatchTaskType,
		priority: '中' as BatchTaskPriority,
		selectedItemIds: [] as string[]
	});

	const filteredTasks = $derived(() => {
		let result = [...$batchTasks];

		if ($currentUser?.role !== '系统管理员') {
			result = result.filter(t => t.museumId === $currentMuseumId);
		}

		if (searchKeyword.trim()) {
			const kw = searchKeyword.toLowerCase();
			result = result.filter(t =>
				t.title.toLowerCase().includes(kw) ||
				t.description?.toLowerCase().includes(kw)
			);
		}

		if (statusFilter) {
			result = result.filter(t => t.status === statusFilter);
		}

		if (typeFilter) {
			result = result.filter(t => t.type === typeFilter);
		}

		return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
	});

	const availableBeacons = $derived(() => {
		return $beaconLights.filter(l => {
			if ($currentUser?.role !== '系统管理员') {
				return l.museumId === $currentMuseumId;
			}
			return true;
		});
	});

	const canCreate = $derived(() => {
		return $currentUser?.role === '馆区管理员' || $currentUser?.role === '系统管理员';
	});

	const canDispatch = $derived(() => {
		return $currentUser?.role === '馆区管理员' || $currentUser?.role === '系统管理员';
	});

	function getStatusClass(status: string) {
		const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
		switch (status) {
			case '待派发': return `${base} bg-gray-100 text-gray-700`;
			case '已派发': return `${base} bg-blue-100 text-blue-800`;
			case '进行中': return `${base} bg-amber-100 text-amber-800`;
			case '已完成': return `${base} bg-green-100 text-green-800`;
			case '已取消': return `${base} bg-gray-100 text-gray-500`;
			default: return `${base} bg-gray-100 text-gray-800`;
		}
	}

	function getPriorityClass(priority: string) {
		const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
		switch (priority) {
			case '高': return `${base} bg-red-100 text-red-800`;
			case '中': return `${base} bg-amber-100 text-amber-800`;
			case '低': return `${base} bg-green-100 text-green-800`;
			default: return `${base} bg-gray-100 text-gray-800`;
		}
	}

	function getTypeClass(type: string) {
		const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
		switch (type) {
			case '批量巡检': return `${base} bg-blue-100 text-blue-800`;
			case '批量通知': return `${base} bg-purple-100 text-purple-800`;
			case '批量导出': return `${base} bg-emerald-100 text-emerald-800`;
			case '批量更新': return `${base} bg-orange-100 text-orange-800`;
			case '其他': return `${base} bg-gray-100 text-gray-700`;
			default: return `${base} bg-gray-100 text-gray-800`;
		}
	}

	function getItemStatusClass(status: string) {
		const base = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium';
		switch (status) {
			case '待处理': return `${base} bg-gray-100 text-gray-600`;
			case '处理中': return `${base} bg-amber-100 text-amber-700`;
			case '已完成': return `${base} bg-green-100 text-green-700`;
			case '失败': return `${base} bg-red-100 text-red-700`;
			default: return `${base} bg-gray-100 text-gray-600`;
		}
	}

	function getProgress(task: BatchTask) {
		if (task.totalCount === 0) return 0;
		return Math.round(((task.completedCount + task.failedCount) / task.totalCount) * 100);
	}

	function openCreateModal() {
		taskForm = {
			title: '',
			description: '',
			type: '批量巡检',
			priority: '中',
			selectedItemIds: []
		};
		formErrors = [];
		showCreateModal = true;
	}

	function handleCreateTask() {
		formErrors = [];

		if (!taskForm.title.trim()) {
			formErrors.push('任务标题不能为空');
		}

		if (taskForm.selectedItemIds.length === 0) {
			formErrors.push('请至少选择一个任务项');
		}

		if (formErrors.length > 0) return;

		const items = taskForm.selectedItemIds.map(id => {
			const beacon = $beaconLights.find(b => b.id === id);
			return {
				targetId: id,
				targetName: beacon?.name || '',
				targetType: '航标灯' as const
			};
		});

		const result = createBatchTask({
			title: taskForm.title,
			description: taskForm.description || undefined,
			type: taskForm.type as any,
			priority: taskForm.priority,
			items
		}) as any;

		if (result && !result.success) {
			formErrors = result.errors;
			return;
		}

		showCreateModal = false;
	}

	function openTaskDetail(task: BatchTask) {
		selectedTask = task;
		showDetailModal = true;
	}

	function handleDispatchTask() {
		if (!selectedTask) return;
		dispatchBatchTask(selectedTask.id);
		selectedTask = $batchTasks.find(t => t.id === selectedTask?.id) || null;
	}

	function toggleItemSelection(id: string) {
		const idx = taskForm.selectedItemIds.indexOf(id);
		if (idx > -1) {
			taskForm.selectedItemIds.splice(idx, 1);
		} else {
			taskForm.selectedItemIds.push(id);
		}
	}

	function selectAllItems() {
		taskForm.selectedItemIds = availableBeacons.map(b => b.id);
	}

	function clearAllItems() {
		taskForm.selectedItemIds = [];
	}

	const taskStats = $derived(() => {
		const tasks = $batchTasks.filter(t => {
			if ($currentUser?.role !== '系统管理员') {
				return t.museumId === $currentMuseumId;
			}
			return true;
		});
		return {
			total: tasks.length,
			pending: tasks.filter(t => t.status === '待派发').length,
			running: tasks.filter(t => t.status === '进行中' || t.status === '已派发').length,
			completed: tasks.filter(t => t.status === '已完成').length
		};
	});
</script>

<div class="space-y-6">
	<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
		<div>
			<h2 class="text-2xl font-bold text-amber-900">批量任务派发</h2>
			<p class="text-gray-600 mt-1">批量创建、派发和管理任务执行进度</p>
		</div>
		{#if canCreate}
			<button
				on:click={openCreateModal}
				class="inline-flex items-center gap-2 px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors font-medium shadow-md"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
				</svg>
				创建任务
			</button>
		{/if}
	</div>

	<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
		<div class="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
			<p class="text-sm text-amber-600">全部任务</p>
			<p class="text-2xl font-bold text-amber-700 mt-1">{taskStats.total}</p>
		</div>
		<div class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
			<p class="text-sm text-gray-600">待派发</p>
			<p class="text-2xl font-bold text-gray-700 mt-1">{taskStats.pending}</p>
		</div>
		<div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
			<p class="text-sm text-blue-600">进行中</p>
			<p class="text-2xl font-bold text-blue-700 mt-1">{taskStats.running}</p>
		</div>
		<div class="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
			<p class="text-sm text-green-600">已完成</p>
			<p class="text-2xl font-bold text-green-700 mt-1">{taskStats.completed}</p>
		</div>
	</div>

	<div class="flex flex-wrap gap-3">
		<div class="relative flex-1 min-w-64">
			<input
				type="text"
				placeholder="搜索任务标题或描述..."
				bind:value={searchKeyword}
				class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
			/>
			<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
			</svg>
		</div>
		<select
			bind:value={statusFilter}
			class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
		>
			<option value="">全部状态</option>
			{#each ['待派发', '进行中', '已完成', '已取消'] as status}
				<option value={status}>{status}</option>
			{/each}
		</select>
		<select
			bind:value={typeFilter}
			class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
		>
			<option value="">全部类型</option>
			{#each BATCH_TASK_TYPE_OPTIONS as type}
				<option value={type}>{type}</option>
			{/each}
		</select>
	</div>

	<div class="bg-white border border-gray-200 rounded-xl overflow-hidden">
		{#if filteredTasks.length > 0}
			<div class="divide-y divide-gray-100">
				{#each filteredTasks as task}
					<div
						class="p-5 hover:bg-gray-50 cursor-pointer transition-colors"
						on:click={() => openTaskDetail(task)}
					>
						<div class="flex items-start justify-between gap-4">
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2 mb-2 flex-wrap">
									<h3 class="font-semibold text-gray-900">{task.title}</h3>
									<span class={getStatusClass(task.status)}>{task.status}</span>
									<span class={getTypeClass(task.type)}>{task.type}</span>
									<span class={getPriorityClass(task.priority)}>{task.priority}优先级</span>
								</div>
								{#if task.description}
									<p class="text-sm text-gray-600 line-clamp-1 mb-3">{task.description}</p>
								{/if}
								<div class="flex items-center gap-4 text-xs text-gray-500">
									<span>创建人：{task.creatorName}</span>
									<span>创建时间：{task.createdAt}</span>
								</div>
							</div>
							<div class="text-right min-w-32">
								<div class="text-sm font-medium text-gray-700 mb-2">
									{task.completedCount}/{task.totalCount} 完成
									{#if task.failedCount > 0}
										<span class="text-red-500 ml-2">· {task.failedCount} 失败</span>
									{/if}
								</div>
								<div class="w-full bg-gray-200 rounded-full h-2">
									<div
										class="h-2 rounded-full transition-all {
											task.status === '已完成'
												? 'bg-green-500'
												: task.failedCount > 0
													? 'bg-amber-500'
													: 'bg-amber-500'
										}"
										style="width: {getProgress(task)}%"
									></div>
								</div>
								<p class="text-xs text-gray-500 mt-1">{getProgress(task)}%</p>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="p-12 text-center text-gray-500">
				<svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
				</svg>
				<p>暂无批量任务</p>
			</div>
		{/if}
	</div>

	{#if showCreateModal}
		<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" on:click={() => (showCreateModal = false)}>
			<div class="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" on:click|stopPropagation>
				<div class="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
					<h3 class="text-lg font-semibold text-gray-800">创建批量任务</h3>
				</div>
				<form on:submit|preventDefault={handleCreateTask} class="p-6 space-y-5">
					{#if formErrors.length > 0}
						<div class="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
							{#each formErrors as err}
								<p>{err}</p>
							{/each}
						</div>
					{/if}

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">任务标题 *</label>
						<input
							type="text"
							bind:value={taskForm.title}
							placeholder="请输入任务标题"
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
						/>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">任务描述</label>
						<textarea
							bind:value={taskForm.description}
							placeholder="请输入任务描述"
							rows="3"
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none"
						></textarea>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">任务类型 *</label>
							<select
								bind:value={taskForm.type}
								class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
							>
								{#each BATCH_TASK_TYPE_OPTIONS as type}
									<option value={type}>{type}</option>
								{/each}
							</select>
						</div>
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">优先级 *</label>
							<select
								bind:value={taskForm.priority}
								class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
							>
								{#each BATCH_TASK_PRIORITY_OPTIONS as priority}
									<option value={priority}>{priority}</option>
								{/each}
							</select>
						</div>
					</div>

					<div>
						<div class="flex items-center justify-between mb-2">
							<label class="block text-sm font-medium text-gray-700">选择任务项 *</label>
							<div class="flex gap-2">
								<button
									type="button"
									on:click={selectAllItems}
									class="text-xs text-amber-600 hover:text-amber-800"
								>
									全选
								</button>
								<span class="text-gray-300">|</span>
								<button
									type="button"
									on:click={clearAllItems}
									class="text-xs text-gray-500 hover:text-gray-700"
								>
									清空
								</button>
							</div>
						</div>
						<p class="text-xs text-gray-500 mb-2">已选择 {taskForm.selectedItemIds.length} 项</p>
						<div class="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
							{#if availableBeacons.length > 0}
								<div class="divide-y divide-gray-100">
									{#each availableBeacons as beacon}
										<label
											class="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
										>
											<input
												type="checkbox"
												checked={taskForm.selectedItemIds.includes(beacon.id)}
												on:change={() => toggleItemSelection(beacon.id)}
												class="w-4 h-4 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
											/>
											<div class="flex-1 min-w-0">
												<div class="flex items-center gap-2">
													<span class="text-xs text-amber-700 font-mono">{beacon.code}</span>
													<span class="font-medium text-gray-800 text-sm">{beacon.name}</span>
												</div>
												<p class="text-xs text-gray-500">{beacon.material} · {beacon.exhibitionStatus}</p>
											</div>
										</label>
									{/each}
								</div>
							{:else}
								<div class="p-6 text-center text-gray-500 text-sm">
									暂无可选的航标灯
								</div>
							{/if}
						</div>
					</div>

					<div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
						<button
							type="button"
							on:click={() => (showCreateModal = false)}
							class="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
						>
							取消
						</button>
						<button
							type="submit"
							class="px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors font-medium"
						>
							创建任务
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	{#if showDetailModal && selectedTask}
		<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" on:click={() => (showDetailModal = false)}>
			<div class="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" on:click|stopPropagation>
				<div class="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
					<div class="flex items-center justify-between">
						<h3 class="text-lg font-semibold text-gray-800">任务详情</h3>
						<span class={getStatusClass(selectedTask.status)}>{selectedTask.status}</span>
					</div>
				</div>
				<div class="p-6 space-y-6">
					<div class="grid grid-cols-2 gap-4">
						<div>
							<p class="text-xs text-gray-500 mb-1">任务标题</p>
							<p class="font-medium text-gray-800">{selectedTask.title}</p>
						</div>
						<div>
							<p class="text-xs text-gray-500 mb-1">任务类型</p>
							<span class={getTypeClass(selectedTask.type)}>{selectedTask.type}</span>
						</div>
						<div>
							<p class="text-xs text-gray-500 mb-1">优先级</p>
							<span class={getPriorityClass(selectedTask.priority)}>{selectedTask.priority}优先级</span>
						</div>
						<div>
							<p class="text-xs text-gray-500 mb-1">创建人</p>
							<p class="font-medium text-gray-800">{selectedTask.creatorName}</p>
						</div>
						<div>
							<p class="text-xs text-gray-500 mb-1">创建时间</p>
							<p class="text-sm text-gray-700">{selectedTask.createdAt}</p>
						</div>
						{#if selectedTask.dispatchedAt}
							<div>
								<p class="text-xs text-gray-500 mb-1">派发时间</p>
								<p class="text-sm text-gray-700">{selectedTask.dispatchedAt}</p>
							</div>
						{/if}
					</div>

					{#if selectedTask.description}
						<div>
							<p class="text-xs text-gray-500 mb-1">任务描述</p>
							<p class="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedTask.description}</p>
						</div>
					{/if}

					<div class="bg-amber-50 border border-amber-200 rounded-lg p-4">
						<div class="flex items-center justify-between mb-3">
							<span class="text-sm font-medium text-amber-800">执行进度</span>
							<span class="text-sm text-amber-700">
								{selectedTask.completedCount}/{selectedTask.totalCount} 完成
								{#if selectedTask.failedCount > 0}
									<span class="text-red-600 ml-2">· {selectedTask.failedCount} 失败</span>
								{/if}
							</span>
						</div>
						<div class="w-full bg-amber-200 rounded-full h-3">
							<div
								class="h-3 rounded-full transition-all {
									selectedTask.status === '已完成'
										? 'bg-green-500'
										: 'bg-amber-500'
								}"
								style="width: {getProgress(selectedTask)}%"
							></div>
						</div>
						<p class="text-xs text-amber-600 mt-2 text-right">{getProgress(selectedTask)}%</p>
					</div>

					{#if canDispatch && selectedTask.status === '待派发'}
						<div class="flex justify-end">
							<button
								on:click={handleDispatchTask}
								class="inline-flex items-center gap-2 px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors font-medium"
							>
								<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
								</svg>
								派发任务
							</button>
						</div>
					{/if}

					<div>
						<div class="flex items-center justify-between mb-3">
							<h4 class="font-semibold text-gray-800">子任务列表</h4>
							<span class="text-xs text-gray-500">共 {selectedTask.items.length} 项</span>
						</div>
						<div class="border border-gray-200 rounded-lg overflow-hidden">
							{#if selectedTask.items.length > 0}
								<div class="divide-y divide-gray-100 max-h-80 overflow-y-auto">
									{#each selectedTask.items as item}
										<div class="p-4 hover:bg-gray-50">
											<div class="flex items-start justify-between gap-4">
												<div class="flex-1 min-w-0">
													<div class="flex items-center gap-2 mb-1">
														<span class={getItemStatusClass(item.status)}>{item.status}</span>
														<span class="text-xs text-gray-500">{item.targetType}</span>
													</div>
													<p class="font-medium text-gray-800 text-sm">{item.targetName}</p>
													{#if item.assigneeName}
														<p class="text-xs text-gray-500 mt-1">负责人：{item.assigneeName}</p>
													{/if}
												</div>
												{#if item.completedAt}
													<p class="text-xs text-gray-400 whitespace-nowrap">{item.completedAt.slice(5, 16)}</p>
												{/if}
											</div>
											{#if item.result}
												<div class="mt-2 bg-green-50 border border-green-200 rounded p-2">
													<p class="text-xs text-green-700">
														<span class="font-medium">结果：</span>{item.result}
													</p>
												</div>
											{/if}
											{#if item.errorMessage}
												<div class="mt-2 bg-red-50 border border-red-200 rounded p-2">
													<p class="text-xs text-red-700">
														<span class="font-medium">错误：</span>{item.errorMessage}
													</p>
												</div>
											{/if}
										</div>
									{/each}
								</div>
							{:else}
								<div class="p-8 text-center text-gray-500 text-sm">
									暂无子任务
								</div>
							{/if}
						</div>
					</div>

					<div class="flex justify-end pt-4 border-t border-gray-200">
						<button
							on:click={() => (showDetailModal = false)}
							class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
						>
							关闭
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
