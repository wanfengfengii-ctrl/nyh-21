<script lang="ts">
	import {
		emergencyPlans,
		createEmergencyPlan,
		updateEmergencyPlan,
		deleteEmergencyPlan,
		publishEmergencyPlan,
		archiveEmergencyPlan,
		currentUser
	} from '$lib/stores';
	import {
		EMERGENCY_PLAN_STATUS_OPTIONS,
		EMERGENCY_PLAN_CATEGORY_OPTIONS,
		USER_ROLE_OPTIONS,
		RISK_LEVEL_OPTIONS
	} from '$lib/types';
	import type {
		EmergencyPlan,
		EmergencyPlanStep,
		EmergencyPlanStatus,
		EmergencyPlanCategory,
		UserRole,
		RiskLevel
	} from '$lib/types';

	let searchKeyword = $state('');
	let categoryFilter = $state<string>('');
	let statusFilter = $state<string>('');

	let showCreateModal = $state(false);
	let showDetailModal = $state(false);
	let showStepModal = $state(false);

	let selectedPlan = $state<EmergencyPlan | null>(null);
	let isEditingPlan = $state(false);
	let isEditingStep = $state(false);
	let editingStepId = $state<string>('');

	let planForm = $state({
		name: '',
		category: '环境突发事件' as EmergencyPlanCategory,
		description: '',
		riskLevel: '中风险' as RiskLevel,
		scope: '',
		version: 'v1.0',
		responsibleRoles: [] as UserRole[],
		resources: ''
	});
	let planErrors = $state<string[]>([]);

	let stepForm = $state({
		stepNumber: 1,
		title: '',
		description: '',
		responsibleRole: '保管员' as UserRole,
		durationMinutes: 30
	});
	let stepErrors = $state<string[]>([]);

	let filteredPlans = $state<EmergencyPlan[]>([]);
	let planStats = $state({ total: 0, draft: 0, published: 0, archived: 0 });
	let canManage = $state(false);

	$effect(() => {
		let result = [...$emergencyPlans];

		if (searchKeyword.trim()) {
			const kw = searchKeyword.toLowerCase();
			result = result.filter(
				(p) =>
					p.name.toLowerCase().includes(kw) ||
					(p.description && p.description.toLowerCase().includes(kw))
			);
		}

		if (categoryFilter) {
			result = result.filter((p) => p.category === categoryFilter);
		}

		if (statusFilter) {
			result = result.filter((p) => p.status === statusFilter);
		}

		filteredPlans = result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
	});

	$effect(() => {
		const plans = $emergencyPlans;
		planStats = {
			total: plans.length,
			draft: plans.filter((p) => p.status === '草稿').length,
			published: plans.filter((p) => p.status === '已发布').length,
			archived: plans.filter((p) => p.status === '已归档').length
		};
	});

	$effect(() => {
		canManage = $currentUser?.role === '馆区管理员' || $currentUser?.role === '系统管理员';
	});

	function getStatusClass(status: EmergencyPlanStatus) {
		const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
		switch (status) {
			case '草稿':
				return `${base} bg-gray-100 text-gray-800`;
			case '已发布':
				return `${base} bg-green-100 text-green-800`;
			case '已归档':
				return `${base} bg-amber-100 text-amber-800`;
			default:
				return `${base} bg-gray-100 text-gray-800`;
		}
	}

	function getRiskLevelClass(level: RiskLevel) {
		const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
		switch (level) {
			case '低风险':
				return `${base} bg-green-100 text-green-800`;
			case '中风险':
				return `${base} bg-amber-100 text-amber-800`;
			case '高风险':
				return `${base} bg-red-100 text-red-800`;
			default:
				return `${base} bg-gray-100 text-gray-800`;
		}
	}

	function openCreateModal() {
		isEditingPlan = false;
		selectedPlan = null;
		planForm = {
			name: '',
			category: '环境突发事件',
			description: '',
			riskLevel: '中风险',
			scope: '',
			version: 'v1.0',
			responsibleRoles: [],
			resources: ''
		};
		planErrors = [];
		showCreateModal = true;
	}

	function openEditModal(plan: EmergencyPlan) {
		isEditingPlan = true;
		selectedPlan = plan;
		planForm = {
			name: plan.name,
			category: plan.category,
			description: plan.description || '',
			riskLevel: plan.riskLevel,
			scope: plan.scope,
			version: plan.version,
			responsibleRoles: [...plan.responsibleRoles],
			resources: plan.resources?.join(', ') || ''
		};
		planErrors = [];
		showCreateModal = true;
	}

	function handleSavePlan(e: Event) {
		e.preventDefault();
		const resourcesArr = planForm.resources
			? planForm.resources.split(',').map((r) => r.trim()).filter(Boolean)
			: [];

		if (isEditingPlan && selectedPlan) {
			const result = updateEmergencyPlan(selectedPlan.id, {
				...planForm,
				resources: resourcesArr
			});
			if (!result.success) {
				planErrors = result.errors;
				return;
			}
			selectedPlan = $emergencyPlans.find((p) => p.id === selectedPlan?.id) || null;
		} else {
			const result = createEmergencyPlan({
				...planForm,
				resources: resourcesArr,
				status: '草稿',
				steps: [],
				contactList: []
			}) as any;
			if (result && !result.success) {
				planErrors = result.errors;
				return;
			}
		}

		showCreateModal = false;
	}

	function handleDeletePlan(plan: EmergencyPlan) {
		if (!confirm(`确定要删除应急预案"${plan.name}"吗？`)) return;
		deleteEmergencyPlan(plan.id);
	}

	function handlePublishPlan(plan: EmergencyPlan) {
		if (!confirm(`确定要发布应急预案"${plan.name}"吗？`)) return;
		publishEmergencyPlan(plan.id);
		selectedPlan = $emergencyPlans.find((p) => p.id === plan.id) || null;
	}

	function handleArchivePlan(plan: EmergencyPlan) {
		if (!confirm(`确定要归档应急预案"${plan.name}"吗？`)) return;
		archiveEmergencyPlan(plan.id);
		selectedPlan = $emergencyPlans.find((p) => p.id === plan.id) || null;
	}

	function openDetailModal(plan: EmergencyPlan) {
		selectedPlan = plan;
		showDetailModal = true;
	}

	function openAddStepModal() {
		if (!selectedPlan) return;
		isEditingStep = false;
		editingStepId = '';
		const nextStepNum = selectedPlan.steps.length
			? Math.max(...selectedPlan.steps.map((s) => s.stepNumber)) + 1
			: 1;
		stepForm = {
			stepNumber: nextStepNum,
			title: '',
			description: '',
			responsibleRole: '保管员',
			durationMinutes: 30
		};
		stepErrors = [];
		showStepModal = true;
	}

	function openEditStepModal(step: EmergencyPlanStep) {
		isEditingStep = true;
		editingStepId = step.id;
		stepForm = {
			stepNumber: step.stepNumber,
			title: step.title,
			description: step.description,
			responsibleRole: step.responsibleRole || '保管员',
			durationMinutes: step.durationMinutes || 30
		};
		stepErrors = [];
		showStepModal = true;
	}

	function handleSaveStep(e: Event) {
		e.preventDefault();
		if (!selectedPlan) return;

		if (!stepForm.title.trim()) {
			stepErrors = ['请输入步骤名称'];
			return;
		}

		if (isEditingStep) {
			const updatedSteps = selectedPlan.steps.map((s) =>
				s.id === editingStepId
					? { ...s, ...stepForm }
					: s
			);
			updateEmergencyPlan(selectedPlan.id, { steps: updatedSteps });
		} else {
			const newStep: EmergencyPlanStep = {
				id: `step_${Date.now()}`,
				...stepForm
			};
			const newSteps = [...selectedPlan.steps, newStep].sort(
				(a, b) => a.stepNumber - b.stepNumber
			);
			updateEmergencyPlan(selectedPlan.id, { steps: newSteps });
		}

		selectedPlan = $emergencyPlans.find((p) => p.id === selectedPlan?.id) || null;
		showStepModal = false;
	}

	function handleDeleteStep(stepId: string) {
		if (!selectedPlan) return;
		if (!confirm('确定要删除这个步骤吗？')) return;

		const newSteps = selectedPlan.steps.filter((s) => s.id !== stepId);
		updateEmergencyPlan(selectedPlan.id, { steps: newSteps });
		selectedPlan = $emergencyPlans.find((p) => p.id === selectedPlan?.id) || null;
	}

	function toggleRole(role: UserRole) {
		const idx = planForm.responsibleRoles.indexOf(role);
		if (idx === -1) {
			planForm.responsibleRoles = [...planForm.responsibleRoles, role];
		} else {
			planForm.responsibleRoles = planForm.responsibleRoles.filter((r) => r !== role);
		}
	}

	function formatDuration(minutes?: number) {
		if (!minutes) return '--';
		if (minutes < 60) return `${minutes} 分钟`;
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		return mins > 0 ? `${hours} 小时 ${mins} 分钟` : `${hours} 小时`;
	}
</script>

<div class="space-y-6">
	<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
		<div>
			<h2 class="text-2xl font-bold text-amber-900">应急预案模板管理</h2>
			<p class="text-gray-600 mt-1">
				应急预案的创建、编辑、发布与步骤管理
			</p>
		</div>
		{#if canManage}
			<button
				onclick={openCreateModal}
				class="inline-flex items-center gap-2 px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors font-medium shadow-md"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
				</svg>
				新建预案
			</button>
		{/if}
	</div>

	<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
		<div class="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
			<p class="text-sm text-amber-600">预案总数</p>
			<p class="text-2xl font-bold text-amber-700 mt-1">{planStats.total}</p>
		</div>
		<div class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
			<p class="text-sm text-gray-600">草稿</p>
			<p class="text-2xl font-bold text-gray-700 mt-1">{planStats.draft}</p>
		</div>
		<div class="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
			<p class="text-sm text-green-600">已发布</p>
			<p class="text-2xl font-bold text-green-700 mt-1">{planStats.published}</p>
		</div>
		<div class="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
			<p class="text-sm text-amber-600">已归档</p>
			<p class="text-2xl font-bold text-amber-700 mt-1">{planStats.archived}</p>
		</div>
	</div>

	<div class="flex flex-wrap gap-3">
		<div class="relative flex-1 min-w-64">
			<input
				type="text"
				placeholder="搜索预案名称或描述..."
				bind:value={searchKeyword}
				class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
			/>
			<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
			</svg>
		</div>
		<select
			bind:value={categoryFilter}
			class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
		>
			<option value="">全部分类</option>
			{#each EMERGENCY_PLAN_CATEGORY_OPTIONS as cat}
				<option value={cat}>{cat}</option>
			{/each}
		</select>
		<select
			bind:value={statusFilter}
			class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
		>
			<option value="">全部状态</option>
			{#each EMERGENCY_PLAN_STATUS_OPTIONS as status}
				<option value={status}>{status}</option>
			{/each}
		</select>
	</div>

	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
		{#if filteredPlans.length > 0}
			{#each filteredPlans as plan}
				<div
					role="button"
					tabindex="0"
					onclick={() => openDetailModal(plan)}
					onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') openDetailModal(plan); }}
					class="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
				>
					<div class="p-5">
						<div class="flex items-start justify-between mb-3">
							<h3 class="font-semibold text-gray-800 text-lg line-clamp-1">{plan.name}</h3>
							<span class={getStatusClass(plan.status)}>{plan.status}</span>
						</div>
						<div class="flex items-center gap-2 mb-3 flex-wrap">
							<span class="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded">{plan.category}</span>
							<span class={getRiskLevelClass(plan.riskLevel)}>{plan.riskLevel}</span>
							<span class="text-xs text-gray-500">{plan.version}</span>
						</div>
						<p class="text-sm text-gray-600 line-clamp-2 mb-4">{plan.description || '暂无描述'}</p>
						<div class="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
							<span>创建人：{plan.createdBy}</span>
							<span>{plan.createdAt}</span>
						</div>
						<div class="flex items-center gap-2 mt-3 text-xs text-gray-500">
							<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
							</svg>
							<span>{plan.steps.length} 个处置步骤</span>
						</div>
					</div>
				</div>
			{/each}
		{:else}
			<div class="col-span-full">
				<div class="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-500">
					<svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
					</svg>
					<p>暂无应急预案</p>
					{#if canManage}
						<button
							onclick={openCreateModal}
							class="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors text-sm font-medium"
						>
							新建预案
						</button>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>

{#if showCreateModal}
	<div
		role="button"
		tabindex="0"
		class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
		onclick={(e) => { if (e.target === e.currentTarget) showCreateModal = false; }}
		onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showCreateModal = false; } }}
	>
		<div class="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
			<div class="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
				<h3 class="text-lg font-semibold text-gray-800">
					{isEditingPlan ? '编辑应急预案' : '新建应急预案'}
				</h3>
			</div>
			<form onsubmit={handleSavePlan} class="p-6 space-y-4">
				{#if planErrors.length > 0}
					<div class="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
						{#each planErrors as err}
							<p>{err}</p>
						{/each}
					</div>
				{/if}

				<div>
					<label for="plan-name" class="block text-sm font-medium text-gray-700 mb-1">预案名称 *</label>
					<input
						id="plan-name"
						type="text"
						bind:value={planForm.name}
						placeholder="请输入预案名称"
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
					/>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="plan-category" class="block text-sm font-medium text-gray-700 mb-1">分类 *</label>
						<select
							id="plan-category"
							bind:value={planForm.category}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
						>
							{#each EMERGENCY_PLAN_CATEGORY_OPTIONS as cat}
								<option value={cat}>{cat}</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="plan-risk" class="block text-sm font-medium text-gray-700 mb-1">风险等级 *</label>
						<select
							id="plan-risk"
							bind:value={planForm.riskLevel}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
						>
							{#each RISK_LEVEL_OPTIONS as level}
								<option value={level}>{level}</option>
							{/each}
						</select>
					</div>
				</div>

				<div>
					<label for="plan-version" class="block text-sm font-medium text-gray-700 mb-1">版本号 *</label>
					<input
						id="plan-version"
						type="text"
						bind:value={planForm.version}
						placeholder="例如：v1.0"
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
					/>
				</div>

				<div>
					<label for="plan-scope" class="block text-sm font-medium text-gray-700 mb-1">适用范围</label>
					<input
						id="plan-scope"
						type="text"
						bind:value={planForm.scope}
						placeholder="请输入适用范围"
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
					/>
				</div>

				<div>
					<label for="plan-desc" class="block text-sm font-medium text-gray-700 mb-1">预案描述</label>
					<textarea
						id="plan-desc"
						bind:value={planForm.description}
						rows="3"
						placeholder="请输入预案描述"
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none"
					></textarea>
				</div>

				<div>
					<span class="block text-sm font-medium text-gray-700 mb-2">负责角色</span>
					<div class="flex flex-wrap gap-2">
						{#each USER_ROLE_OPTIONS as role}
							<button
								type="button"
								onclick={() => toggleRole(role)}
								class="px-3 py-1.5 text-sm rounded-lg border transition-colors {
									planForm.responsibleRoles.includes(role)
										? 'bg-amber-100 border-amber-500 text-amber-800'
										: 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
								}"
							>
								{role}
							</button>
						{/each}
					</div>
				</div>

				<div>
					<label for="plan-resources" class="block text-sm font-medium text-gray-700 mb-1">所需资源</label>
					<input
						id="plan-resources"
						type="text"
						bind:value={planForm.resources}
						placeholder="多个资源用逗号分隔"
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
					/>
				</div>

				<div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
					<button
						type="button"
						onclick={() => (showCreateModal = false)}
						class="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
					>
						取消
					</button>
					<button
						type="submit"
						class="px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors font-medium"
					>
						{isEditingPlan ? '保存修改' : '创建预案'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

{#if showDetailModal && selectedPlan}
	<div
		role="button"
		tabindex="0"
		class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
		onclick={(e) => { if (e.target === e.currentTarget) showDetailModal = false; }}
		onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showDetailModal = false; } }}
	>
		<div class="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
			<div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
				<div>
					<h3 class="text-lg font-semibold text-gray-800">{selectedPlan.name}</h3>
					<div class="flex items-center gap-2 mt-1">
						<span class={getStatusClass(selectedPlan.status)}>{selectedPlan.status}</span>
						<span class="text-xs text-gray-500">{selectedPlan.version}</span>
					</div>
				</div>
				<div class="flex items-center gap-2">
					{#if canManage && selectedPlan.status === '草稿'}
						<button
						onclick={() => handlePublishPlan(selectedPlan!)}
							class="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
						>
						发布
					</button>
					{/if}
					{#if canManage && selectedPlan.status === '已发布'}
						<button
							onclick={() => handleArchivePlan(selectedPlan!)}
							class="px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
						>
							归档
						</button>
					{/if}
					{#if canManage}
						<button
							onclick={() => { showDetailModal = false; openEditModal(selectedPlan!); }}
							class="px-3 py-1.5 text-sm bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors"
						>
							编辑
						</button>
						<button
							onclick={() => { handleDeletePlan(selectedPlan!); showDetailModal = false; }}
							class="px-3 py-1.5 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
						>
							删除
						</button>
					{/if}
					<button
						type="button"
						aria-label="关闭"
						onclick={() => (showDetailModal = false)}
						class="p-2 text-gray-400 hover:text-gray-600"
					>
						<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			</div>

			<div class="flex-1 overflow-y-auto p-6 space-y-6">
				<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
					<div>
						<p class="text-xs text-gray-500">分类</p>
						<p class="font-medium text-gray-800">{selectedPlan.category}</p>
					</div>
					<div>
						<p class="text-xs text-gray-500">风险等级</p>
						<span class={getRiskLevelClass(selectedPlan.riskLevel)}>{selectedPlan.riskLevel}</span>
					</div>
					<div>
						<p class="text-xs text-gray-500">创建人</p>
						<p class="font-medium text-gray-800">{selectedPlan.createdBy}</p>
					</div>
					<div>
						<p class="text-xs text-gray-500">创建时间</p>
						<p class="font-medium text-gray-800 text-sm">{selectedPlan.createdAt}</p>
					</div>
				</div>

				{#if selectedPlan.description}
					<div>
						<p class="text-xs text-gray-500 mb-1">预案描述</p>
						<p class="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedPlan.description}</p>
					</div>
				{/if}

				{#if selectedPlan.scope}
					<div>
						<p class="text-xs text-gray-500 mb-1">适用范围</p>
						<p class="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedPlan.scope}</p>
					</div>
				{/if}

				{#if selectedPlan.responsibleRoles.length > 0}
					<div>
						<p class="text-xs text-gray-500 mb-2">负责角色</p>
						<div class="flex flex-wrap gap-2">
							{#each selectedPlan.responsibleRoles as role}
								<span class="px-2.5 py-1 bg-amber-50 text-amber-700 text-sm rounded-lg">{role}</span>
							{/each}
						</div>
					</div>
				{/if}

				{#if selectedPlan.resources && selectedPlan.resources.length > 0}
					<div>
						<p class="text-xs text-gray-500 mb-2">所需资源</p>
						<div class="flex flex-wrap gap-2">
							{#each selectedPlan.resources as resource}
								<span class="px-2.5 py-1 bg-gray-100 text-gray-700 text-sm rounded-lg">{resource}</span>
							{/each}
						</div>
					</div>
				{/if}

				<div>
					<div class="flex items-center justify-between mb-3">
						<h4 class="font-semibold text-gray-800">处置步骤</h4>
						{#if canManage && selectedPlan.status !== '已归档'}
							<button
								onclick={openAddStepModal}
								class="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors"
							>
								<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
								</svg>
								添加步骤
							</button>
						{/if}
					</div>

					{#if selectedPlan.steps.length > 0}
						<div class="space-y-3">
							{#each selectedPlan.steps as step}
								<div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
									<div class="flex items-start gap-4">
										<div class="w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
											{step.stepNumber}
										</div>
										<div class="flex-1 min-w-0">
											<div class="flex items-center justify-between">
												<h5 class="font-medium text-gray-800">{step.title}</h5>
												{#if canManage && selectedPlan.status !== '已归档'}
													<div class="flex items-center gap-2">
														<button
															type="button"
															onclick={() => openEditStepModal(step)}
															class="text-amber-600 hover:text-amber-800 text-sm"
														>
															编辑
														</button>
														<button
															type="button"
															onclick={() => handleDeleteStep(step.id)}
															class="text-red-600 hover:text-red-800 text-sm"
														>
															删除
														</button>
													</div>
												{/if}
											</div>
											<p class="text-sm text-gray-600 mt-1">{step.description}</p>
											<div class="flex items-center gap-4 mt-2 text-xs text-gray-500">
												{#if step.responsibleRole}
													<span>责任人：{step.responsibleRole}</span>
												{/if}
												{#if step.durationMinutes}
													<span>预计时长：{formatDuration(step.durationMinutes)}</span>
												{/if}
											</div>
										</div>
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<div class="text-center py-8 text-gray-500 text-sm bg-gray-50 rounded-lg">
							暂无处置步骤
						</div>
					{/if}
				</div>

				{#if selectedPlan.publishedAt}
					<div class="text-xs text-gray-400 text-center pt-4 border-t border-gray-100">
						发布时间：{selectedPlan.publishedAt}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

{#if showStepModal}
	<div
		role="button"
		tabindex="0"
		class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
		onclick={(e) => { if (e.target === e.currentTarget) showStepModal = false; }}
		onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showStepModal = false; } }}
	>
		<div class="bg-white rounded-xl shadow-xl max-w-lg w-full">
			<div class="px-6 py-4 border-b border-gray-200">
				<h3 class="text-lg font-semibold text-gray-800">
					{isEditingStep ? '编辑步骤' : '添加步骤'}
				</h3>
			</div>
			<form onsubmit={handleSaveStep} class="p-6 space-y-4">
				{#if stepErrors.length > 0}
					<div class="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
						{#each stepErrors as err}
							<p>{err}</p>
						{/each}
					</div>
				{/if}

				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="step-number" class="block text-sm font-medium text-gray-700 mb-1">步骤序号 *</label>
						<input
							id="step-number"
							type="number"
							bind:value={stepForm.stepNumber}
							min="1"
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
						/>
					</div>
					<div>
						<label for="step-role" class="block text-sm font-medium text-gray-700 mb-1">责任人角色</label>
						<select
							id="step-role"
							bind:value={stepForm.responsibleRole}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
						>
							{#each USER_ROLE_OPTIONS as role}
								<option value={role}>{role}</option>
							{/each}
						</select>
					</div>
				</div>

				<div>
					<label for="step-title" class="block text-sm font-medium text-gray-700 mb-1">步骤名称 *</label>
					<input
						id="step-title"
						type="text"
						bind:value={stepForm.title}
						placeholder="请输入步骤名称"
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
					/>
				</div>

				<div>
					<label for="step-desc" class="block text-sm font-medium text-gray-700 mb-1">操作说明</label>
					<textarea
						id="step-desc"
						bind:value={stepForm.description}
						rows="3"
						placeholder="请输入操作说明"
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none"
					></textarea>
				</div>

				<div>
					<label for="step-duration" class="block text-sm font-medium text-gray-700 mb-1">预计时长（分钟）</label>
					<input
						id="step-duration"
						type="number"
						bind:value={stepForm.durationMinutes}
						min="1"
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
					/>
				</div>

				<div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
					<button
						type="button"
						onclick={() => (showStepModal = false)}
						class="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
					>
						取消
					</button>
					<button
						type="submit"
						class="px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors font-medium"
					>
						{isEditingStep ? '保存修改' : '添加步骤'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
