<script lang="ts">
	import {
		operationLogs,
		currentUser,
		currentMuseumId,
		exportToCSV,
		downloadCSV
	} from '$lib/stores';
	import type { OperationLog, OperationType, LogModule } from '$lib/types';
	import { OPERATION_TYPE_OPTIONS, LOG_MODULE_OPTIONS } from '$lib/types';

	let searchKeyword = $state('');
	let typeFilter = $state<string>('');
	let moduleFilter = $state<string>('');
	let userFilter = $state<string>('');

	const filteredLogs = $derived(() => {
		let result = [...$operationLogs];

		if ($currentUser?.role !== '系统管理员') {
			result = result.filter(l => l.museumId === $currentMuseumId);
		}

		if (typeFilter) {
			result = result.filter(l => l.operationType === typeFilter);
		}

		if (moduleFilter) {
			result = result.filter(l => l.module === moduleFilter);
		}

		if (userFilter) {
			result = result.filter(l => l.operatorId === userFilter);
		}

		if (searchKeyword.trim()) {
			const kw = searchKeyword.toLowerCase();
			result = result.filter(l =>
				(l.operatorName || '').toLowerCase().includes(kw) ||
				l.targetName.toLowerCase().includes(kw) ||
				(l.description || '').toLowerCase().includes(kw) ||
				l.detail.toLowerCase().includes(kw)
			);
		}

		return result.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
	});

	const uniqueUsers = $derived(() => {
		const map = new Map<string, string>();
		$operationLogs.forEach(log => {
			if (log.operatorId && !map.has(log.operatorId)) {
				map.set(log.operatorId, log.operatorName || '');
			}
		});
		return Array.from(map.entries());
	});

	function handleExport() {
		const csv = exportToCSV('operationLogs');
		downloadCSV(csv, '操作日志.csv');
	}

	function getTypeColor(type?: OperationType) {
		switch (type) {
			case '创建': return 'text-emerald-600 bg-emerald-50';
			case '编辑': return 'text-blue-600 bg-blue-50';
			case '删除': return 'text-red-600 bg-red-50';
			case '审批通过': return 'text-emerald-600 bg-emerald-50';
			case '审批拒绝': return 'text-red-600 bg-red-50';
			case '借出': return 'text-amber-600 bg-amber-50';
			case '归还': return 'text-purple-600 bg-purple-50';
			case '开始修复': return 'text-amber-600 bg-amber-50';
			case '完成修复': return 'text-emerald-600 bg-emerald-50';
			case '状态变更': return 'text-indigo-600 bg-indigo-50';
			default: return 'text-gray-600 bg-gray-50';
		}
	}

	function getModuleIcon(module?: LogModule) {
		switch (module) {
			case '藏品档案':
				return `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />`;
			case '借展管理':
				return `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />`;
			case '修复工单':
				return `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />`;
			case '附件管理':
				return `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />`;
			case '用户管理':
				return `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />`;
			default:
				return `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />`;
		}
	}
</script>

<div class="space-y-6">
	<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
		<div>
			<h2 class="text-2xl font-bold text-amber-900">操作日志</h2>
			<p class="text-gray-600 mt-1">系统操作审计记录与追溯</p>
		</div>
		<button
			on:click={handleExport}
			class="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
		>
			<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
			</svg>
			导出日志
		</button>
	</div>

	<!-- 筛选器 -->
	<div class="bg-white rounded-xl shadow-md p-4">
		<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-1">搜索</label>
				<div class="relative">
					<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
					</svg>
					<input
						type="text"
						placeholder="搜索操作人、目标..."
						bind:value={searchKeyword}
						class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
					/>
				</div>
			</div>
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-1">操作类型</label>
				<select
					bind:value={typeFilter}
					class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
				>
					<option value="">全部类型</option>
					{#each OPERATION_TYPE_OPTIONS as type}
						<option value={type}>{type}</option>
					{/each}
				</select>
			</div>
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-1">功能模块</label>
				<select
					bind:value={moduleFilter}
					class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
				>
					<option value="">全部模块</option>
					{#each LOG_MODULE_OPTIONS as mod}
						<option value={mod}>{mod}</option>
					{/each}
				</select>
			</div>
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-1">操作人</label>
				<select
					bind:value={userFilter}
					class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
				>
					<option value="">全部人员</option>
					{#each uniqueUsers() as [id, name]}
						<option value={id}>{name}</option>
					{/each}
				</select>
			</div>
		</div>
	</div>

	<!-- 日志列表 -->
	<div class="bg-white rounded-xl shadow-md overflow-hidden">
		{#if filteredLogs().length > 0}
			<div class="divide-y divide-gray-100">
				{#each filteredLogs() as log (log.id)}
					<div class="p-4 hover:bg-gray-50 transition-colors">
						<div class="flex items-start gap-4">
							<div class="flex-shrink-0">
								<div class="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
									<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										{@html getModuleIcon(log.module)}
									</svg>
								</div>
							</div>
							<div class="flex-1 min-w-0">
								<div class="flex flex-wrap items-center gap-2 mb-1">
									<span class="font-medium text-gray-800">{log.operatorName}</span>
									<span class="text-xs text-gray-400">({log.operatorRole})</span>
									<span class="text-gray-300">·</span>
									<span class="text-xs text-gray-500">{log.module}</span>
									<span class="text-gray-300">·</span>
									<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {getTypeColor(log.operationType)}">
										{log.operationType}
									</span>
								</div>
								<p class="text-sm text-gray-700 mb-1">
									{log.description}
									{#if log.targetName}
										<span class="font-medium text-amber-700">「{log.targetName}」</span>
									{/if}
								</p>
								{#if log.detail}
									<p class="text-xs text-gray-500 line-clamp-2">{log.detail}</p>
								{/if}
								<p class="text-xs text-gray-400 mt-2">{log.timestamp}</p>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="p-12 text-center">
				<svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
				</svg>
				<p class="text-gray-500">暂无操作日志记录</p>
			</div>
		{/if}
	</div>
</div>
