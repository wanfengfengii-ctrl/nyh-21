<script lang="ts">
	import {
		createAlertRule,
		updateAlertRule,
		deleteAlertRule,
		toggleAlertRule,
		filteredAlertRules,
		currentUser
	} from '$lib/stores';
	import {
		ALERT_RULE_TYPE_OPTIONS,
		RISK_LEVEL_OPTIONS,
		ALERT_ESCALATION_LEVELS,
		USER_ROLE_OPTIONS,
		ALERT_RULE_CONDITION_OPERATORS
	} from '$lib/types';
	import type {
		AlertRule,
		AlertRuleCondition,
		AlertEscalationRule,
		RiskLevel,
		AlertRuleType,
		AlertEscalationLevel
	} from '$lib/types';

	let activeTab = $state<'list' | 'conditions' | 'escalation'>('list');
	let searchKeyword = $state('');
	let typeFilter = $state<string>('');
	let riskLevelFilter = $state<string>('');
	let statusFilter = $state<string>('');

	let showModal = $state(false);
	let isEditing = $state(false);
	let selectedRule = $state<AlertRule | null>(null);
	let modalTab = $state<'basic' | 'conditions' | 'escalation'>('basic');

	let formErrors = $state<string[]>([]);

	let ruleForm = $state({
		name: '',
		description: '',
		type: '环境阈值' as AlertRuleType,
		riskLevel: '中风险' as RiskLevel,
		enabled: true,
		conditionLogic: 'ALL' as 'ALL' | 'ANY',
		conditions: [] as AlertRuleCondition[],
		escalationEnabled: false,
		escalationRules: [] as AlertEscalationRule[]
	});

	const tabs = [
		{ id: 'list', label: '规则列表' },
		{ id: 'conditions', label: '触发条件配置' },
		{ id: 'escalation', label: '升级规则配置' }
	];

	let filteredRules = $state<AlertRule[]>([]);
	let canManage = $state(false);

	$effect(() => {
		let result = [...$filteredAlertRules];

		if (searchKeyword.trim()) {
			const kw = searchKeyword.toLowerCase();
			result = result.filter(r =>
				r.name.toLowerCase().includes(kw) ||
				r.description?.toLowerCase().includes(kw)
			);
		}

		if (typeFilter) {
			result = result.filter(r => r.type === typeFilter);
		}

		if (riskLevelFilter) {
			result = result.filter(r => r.riskLevel === riskLevelFilter);
		}

		if (statusFilter) {
			if (statusFilter === 'enabled') {
				result = result.filter(r => r.enabled);
			} else if (statusFilter === 'disabled') {
				result = result.filter(r => !r.enabled);
			}
		}

		filteredRules = result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
	});

	$effect(() => {
		canManage = $currentUser?.role === '系统管理员' || $currentUser?.role === '馆区管理员';
	});

	function getRiskLevelClass(level: RiskLevel) {
		const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
		switch (level) {
			case '低风险': return `${base} bg-green-100 text-green-800`;
			case '中风险': return `${base} bg-amber-100 text-amber-800`;
			case '高风险': return `${base} bg-red-100 text-red-800`;
			default: return `${base} bg-gray-100 text-gray-800`;
		}
	}

	function getTypeClass(type: AlertRuleType) {
		const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
		switch (type) {
			case '环境阈值': return `${base} bg-blue-100 text-blue-800`;
			case '藏品状态': return `${base} bg-purple-100 text-purple-800`;
			case '借展逾期': return `${base} bg-orange-100 text-orange-800`;
			case '修复超时': return `${base} bg-yellow-100 text-yellow-800`;
			case '自定义': return `${base} bg-gray-100 text-gray-800`;
			default: return `${base} bg-gray-100 text-gray-800`;
		}
	}

	function getStatusClass(enabled: boolean) {
		const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
		return enabled
			? `${base} bg-green-100 text-green-800`
			: `${base} bg-gray-100 text-gray-600`;
	}

	function openCreateModal() {
		isEditing = false;
		selectedRule = null;
		modalTab = 'basic';
		formErrors = [];
		ruleForm = {
			name: '',
			description: '',
			type: '环境阈值',
			riskLevel: '中风险',
			enabled: true,
			conditionLogic: 'ALL',
			conditions: [
				{ id: crypto.randomUUID(), field: 'temperature', operator: '>', value: 25, logicOperator: 'AND' }
			],
			escalationEnabled: false,
			escalationRules: []
		};
		showModal = true;
	}

	function openEditModal(rule: AlertRule) {
		isEditing = true;
		selectedRule = rule;
		modalTab = 'basic';
		formErrors = [];
		ruleForm = {
			name: rule.name,
			description: rule.description || '',
			type: rule.type,
			riskLevel: rule.riskLevel,
			enabled: rule.enabled,
			conditionLogic: rule.conditionLogic,
			conditions: rule.conditions.map(c => ({ ...c })),
			escalationEnabled: rule.escalationEnabled,
			escalationRules: rule.escalationRules.map(e => ({ ...e, notifyRoles: [...e.notifyRoles], notifyUsers: [...e.notifyUsers], actions: e.actions.map(a => ({ ...a })) }))
		};
		showModal = true;
	}

	function handleSave() {
		formErrors = [];

		if (!ruleForm.name.trim()) {
			formErrors.push('规则名称不能为空');
		}

		if (ruleForm.conditions.length === 0) {
			formErrors.push('至少配置一个触发条件');
		}

		if (ruleForm.escalationEnabled && ruleForm.escalationRules.length === 0) {
			formErrors.push('启用升级规则后至少配置一级升级规则');
		}

		if (formErrors.length > 0) return;

		const ruleData = {
			name: ruleForm.name,
			description: ruleForm.description,
			type: ruleForm.type,
			riskLevel: ruleForm.riskLevel,
			enabled: ruleForm.enabled,
			conditionLogic: ruleForm.conditionLogic,
			conditions: ruleForm.conditions,
			actions: [],
			escalationEnabled: ruleForm.escalationEnabled,
			escalationRules: ruleForm.escalationRules
		};

		let result;

		if (isEditing && selectedRule) {
			result = updateAlertRule(selectedRule.id, ruleData);
		} else {
			result = createAlertRule(ruleData) as any;
		}

		if (!result.success) {
			formErrors = result.errors || ['保存失败'];
			return;
		}

		showModal = false;
	}

	function handleDelete(rule: AlertRule) {
		if (!confirm(`确定要删除预警规则"${rule.name}"吗？`)) return;
		deleteAlertRule(rule.id);
	}

	function handleToggle(rule: AlertRule) {
		toggleAlertRule(rule.id, !rule.enabled);
	}

	function addCondition() {
		ruleForm.conditions.push({
			id: crypto.randomUUID(),
			field: 'temperature',
			operator: '>',
			value: 0,
			logicOperator: 'AND'
		});
	}

	function removeCondition(id: string) {
		ruleForm.conditions = ruleForm.conditions.filter(c => c.id !== id);
	}

	function addEscalationRule() {
		const nextLevel = (ruleForm.escalationRules.length + 1) as AlertEscalationLevel;
		if (nextLevel > 5) return;

		ruleForm.escalationRules.push({
			id: crypto.randomUUID(),
			level: nextLevel,
			timeoutMinutes: 30,
			notifyRoles: [],
			notifyUsers: [],
			actions: []
		});

		ruleForm.escalationRules.sort((a, b) => a.level - b.level);
	}

	function removeEscalationRule(id: string) {
		ruleForm.escalationRules = ruleForm.escalationRules.filter(e => e.id !== id);
		ruleForm.escalationRules.forEach((e, idx) => {
			e.level = (idx + 1) as AlertEscalationLevel;
		});
	}

	function getFieldLabel(field: string) {
		const fieldMap: Record<string, string> = {
			temperature: '温度',
			humidity: '湿度',
			illuminance: '照度',
			vibration: '震动',
			saltFogLevel: '盐雾等级',
			daysRemaining: '剩余天数',
			status: '状态',
			exhibitionStatus: '展陈状态'
		};
		return fieldMap[field] || field;
	}

	function getConditionSummary(conditions: AlertRuleCondition[]) {
		if (conditions.length === 0) return '未配置';
		return conditions.map(c => `${getFieldLabel(c.field)} ${c.operator} ${c.value}`).join(' 且 ');
	}

	function getEscalationSummary(rules: AlertEscalationRule[]) {
		if (rules.length === 0) return '未启用';
		return `${rules.length} 级升级`;
	}
</script>

<div class="space-y-6">
	<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
		<div>
			<h2 class="text-2xl font-bold text-amber-900">多级预警规则引擎</h2>
			<p class="text-gray-600 mt-1">管理环境监测与藏品保护的预警触发规则和升级机制</p>
		</div>
		{#if canManage}
			<button
				on:click={openCreateModal}
				class="inline-flex items-center gap-2 px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors font-medium shadow-md"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
				</svg>
				新建规则
			</button>
		{/if}
	</div>

	<div class="bg-white rounded-xl shadow-md overflow-hidden">
		<div class="flex border-b border-gray-200">
			{#each tabs as tab}
				<button
					on:click={() => { activeTab = tab.id as typeof activeTab; }}
					class="flex-1 px-4 py-3 text-sm font-medium transition-colors {
						activeTab === tab.id
							? 'text-amber-800 bg-amber-50 border-b-2 border-amber-500'
							: 'text-gray-600 hover:bg-gray-50'
					}"
				>
					{tab.label}
				</button>
			{/each}
		</div>

		<div class="p-6">
			{#if activeTab === 'list'}
				<div class="space-y-4">
					<div class="flex flex-wrap gap-3">
						<div class="relative">
							<input
								type="text"
								placeholder="搜索规则名称..."
								bind:value={searchKeyword}
								class="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm w-64"
							/>
							<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
							</svg>
						</div>

						<select
							bind:value={typeFilter}
							class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
						>
							<option value="">全部类型</option>
							{#each ALERT_RULE_TYPE_OPTIONS as type}
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

						<select
							bind:value={statusFilter}
							class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
						>
							<option value="">全部状态</option>
							<option value="enabled">已启用</option>
							<option value="disabled">已停用</option>
						</select>
					</div>

					<div class="bg-white border border-gray-200 rounded-xl overflow-hidden">
						{#if filteredRules.length > 0}
							<table class="w-full">
								<thead class="bg-gray-50">
									<tr>
										<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">规则名称</th>
										<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">类型</th>
										<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">风险等级</th>
										<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
										<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">创建时间</th>
										{#if canManage}
											<th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
										{/if}
									</tr>
								</thead>
								<tbody class="divide-y divide-gray-200">
									{#each filteredRules as rule}
										<tr class="hover:bg-gray-50">
											<td class="px-4 py-3">
												<div class="font-medium text-gray-900">{rule.name}</div>
												{#if rule.description}
													<div class="text-xs text-gray-500 mt-0.5 line-clamp-1">{rule.description}</div>
												{/if}
											</td>
											<td class="px-4 py-3">
												<span class={getTypeClass(rule.type)}>{rule.type}</span>
											</td>
											<td class="px-4 py-3">
												<span class={getRiskLevelClass(rule.riskLevel)}>{rule.riskLevel}</span>
											</td>
											<td class="px-4 py-3">
												<span class={getStatusClass(rule.enabled)}>
													{rule.enabled ? '已启用' : '已停用'}
												</span>
											</td>
											<td class="px-4 py-3 text-sm text-gray-600">
												{rule.createdAt}
											</td>
											{#if canManage}
												<td class="px-4 py-3 text-right text-sm space-x-3">
													<button
														on:click={() => handleToggle(rule)}
														class="text-amber-600 hover:text-amber-800"
													>
														{rule.enabled ? '停用' : '启用'}
													</button>
													<button
														on:click={() => openEditModal(rule)}
														class="text-blue-600 hover:text-blue-800"
													>
														编辑
													</button>
													<button
														on:click={() => handleDelete(rule)}
														class="text-red-600 hover:text-red-800"
													>
														删除
													</button>
												</td>
											{/if}
										</tr>
									{/each}
								</tbody>
							</table>
						{:else}
							<div class="p-12 text-center text-gray-500">
								<svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
								</svg>
								<p>暂无预警规则</p>
								{#if canManage}
									<button
										on:click={openCreateModal}
										class="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors text-sm font-medium"
									>
										<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
										</svg>
										创建第一条规则
									</button>
								{/if}
							</div>
						{/if}
					</div>
				</div>

			{:else if activeTab === 'conditions'}
				<div class="space-y-4">
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{#each filteredRules as rule}
							<div class="bg-gradient-to-br from-amber-50 to-white rounded-xl border border-amber-100 p-5">
								<div class="flex items-start justify-between mb-3">
									<div>
										<h4 class="font-semibold text-gray-800">{rule.name}</h4>
										<div class="flex gap-2 mt-1">
											<span class={getTypeClass(rule.type)}>{rule.type}</span>
											<span class={getRiskLevelClass(rule.riskLevel)}>{rule.riskLevel}</span>
										</div>
									</div>
									<span class={getStatusClass(rule.enabled)}>
										{rule.enabled ? '已启用' : '已停用'}
									</span>
								</div>
								<div class="space-y-2">
									<p class="text-xs text-gray-500 font-medium">触发条件 ({rule.conditionLogic === 'ALL' ? '全部满足' : '任一满足'})</p>
									<div class="space-y-1">
										{#each rule.conditions as condition}
											<div class="bg-white rounded-lg px-3 py-2 text-sm border border-gray-100">
												<span class="text-gray-700">{getFieldLabel(condition.field)}</span>
												<span class="text-amber-600 mx-1">{condition.operator}</span>
												<span class="font-medium text-gray-900">{condition.value}</span>
											</div>
										{/each}
									</div>
								</div>
								{#if canManage}
									<div class="mt-4 pt-3 border-t border-amber-100">
										<button
											on:click={() => { openEditModal(rule); modalTab = 'conditions'; }}
											class="text-amber-700 hover:text-amber-900 text-sm font-medium"
										>
											编辑条件 →
										</button>
									</div>
								{/if}
							</div>
						{/each}
					</div>

					{#if filteredRules.length === 0}
						<div class="text-center py-12 text-gray-500">
							<p>暂无预警规则</p>
						</div>
					{/if}
				</div>

			{:else if activeTab === 'escalation'}
				<div class="space-y-4">
					<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
						{#each filteredRules as rule}
							<div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
								<div class="bg-gradient-to-r from-amber-100 to-amber-50 px-5 py-4 border-b border-amber-200">
									<div class="flex items-center justify-between">
										<div>
											<h4 class="font-semibold text-amber-900">{rule.name}</h4>
											<div class="flex gap-2 mt-1">
												<span class={getRiskLevelClass(rule.riskLevel)}>{rule.riskLevel}</span>
												<span class="text-xs text-amber-700">
													{rule.escalationEnabled ? '升级已启用' : '升级未启用'}
												</span>
											</div>
										</div>
										<span class={getStatusClass(rule.enabled)}>
											{rule.enabled ? '运行中' : '已停用'}
										</span>
									</div>
								</div>
								<div class="p-5">
									{#if rule.escalationEnabled && rule.escalationRules.length > 0}
										<div class="relative">
											{#each rule.escalationRules as escalation, idx}
												<div class="flex gap-4 {idx < rule.escalationRules.length - 1 ? 'pb-6' : ''}">
													<div class="flex flex-col items-center">
														<div class="w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
															{escalation.level}
														</div>
														{#if idx < rule.escalationRules.length - 1}
															<div class="w-0.5 flex-1 bg-amber-200 mt-2"></div>
														{/if}
													</div>
													<div class="flex-1 bg-amber-50 rounded-lg p-3">
														<div class="flex items-center justify-between mb-2">
															<span class="font-medium text-amber-900">第 {escalation.level} 级升级</span>
															<span class="text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
																{escalation.timeoutMinutes} 分钟未响应
															</span>
														</div>
														<div class="text-sm text-gray-600">
															<p class="mb-1">通知角色：</p>
															<div class="flex flex-wrap gap-1">
																{#each escalation.notifyRoles as role}
																	<span class="text-xs bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-700">
																		{role}
																	</span>
																{:else}
																	<span class="text-xs text-gray-400">未配置</span>
																{/each}
															</div>
														</div>
													</div>
												</div>
											{/each}
										</div>
									{:else}
										<div class="text-center py-6 text-gray-500">
											<svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 mx-auto text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
											</svg>
											<p class="text-sm">未配置升级规则</p>
										</div>
									{/if}
									{#if canManage}
										<div class="mt-4 pt-3 border-t border-gray-100">
											<button
												on:click={() => { openEditModal(rule); modalTab = 'escalation'; }}
												class="text-amber-700 hover:text-amber-900 text-sm font-medium"
											>
												配置升级规则 →
											</button>
										</div>
									{/if}
								</div>
							</div>
						{/each}
					</div>

					{#if filteredRules.length === 0}
						<div class="text-center py-12 text-gray-500">
							<p>暂无预警规则</p>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>

	{#if showModal}
		<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" on:click={() => (showModal = false)}>
			<div class="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col" on:click|stopPropagation>
				<div class="px-6 py-4 border-b border-gray-200 flex-shrink-0">
					<h3 class="text-lg font-semibold text-gray-800">
						{isEditing ? '编辑预警规则' : '新建预警规则'}
					</h3>
					<p class="text-sm text-gray-500 mt-1">配置预警规则的基本信息、触发条件和升级机制</p>
				</div>

				<div class="flex border-b border-gray-200 flex-shrink-0">
					<button
						on:click={() => { modalTab = 'basic'; }}
						class="flex-1 px-4 py-3 text-sm font-medium transition-colors {
							modalTab === 'basic'
								? 'text-amber-800 bg-amber-50 border-b-2 border-amber-500'
								: 'text-gray-600 hover:bg-gray-50'
						}"
					>
						基本信息
					</button>
					<button
						on:click={() => { modalTab = 'conditions'; }}
						class="flex-1 px-4 py-3 text-sm font-medium transition-colors {
							modalTab === 'conditions'
								? 'text-amber-800 bg-amber-50 border-b-2 border-amber-500'
								: 'text-gray-600 hover:bg-gray-50'
						}"
					>
						触发条件
					</button>
					<button
						on:click={() => { modalTab = 'escalation'; }}
						class="flex-1 px-4 py-3 text-sm font-medium transition-colors {
							modalTab === 'escalation'
								? 'text-amber-800 bg-amber-50 border-b-2 border-amber-500'
								: 'text-gray-600 hover:bg-gray-50'
						}"
					>
						升级规则
					</button>
				</div>

				<div class="p-6 overflow-y-auto flex-1">
					{#if formErrors.length > 0}
						<div class="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600 mb-4">
							{#each formErrors as err}
								<p>{err}</p>
							{/each}
						</div>
					{/if}

					{#if modalTab === 'basic'}
						<div class="space-y-4">
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-1">规则名称 *</label>
								<input
									type="text"
									bind:value={ruleForm.name}
									placeholder="请输入规则名称"
									class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
								/>
							</div>

							<div>
								<label class="block text-sm font-medium text-gray-700 mb-1">规则描述</label>
								<textarea
									bind:value={ruleForm.description}
									rows="2"
									placeholder="请输入规则描述（选填）"
									class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none"
								/>
							</div>

							<div class="grid grid-cols-2 gap-4">
								<div>
									<label class="block text-sm font-medium text-gray-700 mb-1">规则类型 *</label>
									<select
										bind:value={ruleForm.type}
										class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
									>
										{#each ALERT_RULE_TYPE_OPTIONS as type}
											<option value={type}>{type}</option>
										{/each}
									</select>
								</div>

								<div>
									<label class="block text-sm font-medium text-gray-700 mb-1">风险等级 *</label>
									<select
										bind:value={ruleForm.riskLevel}
										class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
									>
										{#each RISK_LEVEL_OPTIONS as level}
											<option value={level}>{level}</option>
										{/each}
									</select>
								</div>
							</div>

							<div class="flex items-center gap-3">
								<label class="relative inline-flex items-center cursor-pointer">
									<input
										type="checkbox"
										bind:checked={ruleForm.enabled}
										class="sr-only peer"
									/>
									<div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
								</label>
								<span class="text-sm text-gray-700">启用规则</span>
							</div>
						</div>

					{:else if modalTab === 'conditions'}
						<div class="space-y-4">
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-3">
									<span class="text-sm font-medium text-gray-700">条件逻辑：</span>
									<select
										bind:value={ruleForm.conditionLogic}
										class="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
									>
										<option value="ALL">全部满足</option>
										<option value="ANY">任一满足</option>
									</select>
								</div>
								<button
									on:click={addCondition}
									class="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 transition-colors text-sm font-medium"
								>
									<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
									</svg>
									添加条件
								</button>
							</div>

							<div class="space-y-3">
								{#each ruleForm.conditions as condition, idx}
									<div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
										<div class="flex items-center gap-3">
											{#if idx > 0}
												<span class="text-xs text-gray-500 font-medium">
													{condition.logicOperator || 'AND'}
												</span>
											{/if}
											<select
												bind:value={condition.field}
												class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none bg-white"
											>
												<option value="temperature">温度</option>
												<option value="humidity">湿度</option>
												<option value="illuminance">照度</option>
												<option value="vibration">震动</option>
												<option value="saltFogLevel">盐雾等级</option>
											</select>
											<select
												bind:value={condition.operator}
												class="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none bg-white"
											>
												{#each ALERT_RULE_CONDITION_OPERATORS as op}
													<option value={op}>{op}</option>
												{/each}
											</select>
											<input
												type="text"
												bind:value={condition.value}
												placeholder="阈值"
												class="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none bg-white"
											/>
											<button
												on:click={() => removeCondition(condition.id)}
												class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
											>
												<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
												</svg>
											</button>
										</div>
									</div>
								{/each}
							</div>

							{#if ruleForm.conditions.length === 0}
								<div class="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
									<p class="text-sm">暂无触发条件，点击上方"添加条件"按钮添加</p>
								</div>
							{/if}
						</div>

					{:else if modalTab === 'escalation'}
						<div class="space-y-4">
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-3">
									<label class="relative inline-flex items-center cursor-pointer">
										<input
											type="checkbox"
											bind:checked={ruleForm.escalationEnabled}
											class="sr-only peer"
										/>
										<div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
									</label>
									<span class="text-sm font-medium text-gray-700">启用多级升级</span>
								</div>
								{#if ruleForm.escalationEnabled}
									<button
										on:click={addEscalationRule}
										disabled={ruleForm.escalationRules.length >= 5}
										class="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
									>
										<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
										</svg>
										添加升级级别
									</button>
								{/if}
							</div>

							{#if ruleForm.escalationEnabled}
								{#if ruleForm.escalationRules.length > 0}
									<div class="space-y-4">
										{#each ruleForm.escalationRules as escalation, idx}
											<div class="bg-gradient-to-r from-amber-50 to-white rounded-lg border border-amber-200 p-4">
												<div class="flex items-center justify-between mb-3">
													<div class="flex items-center gap-3">
														<div class="w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center text-sm font-bold">
															{escalation.level}
														</div>
														<span class="font-medium text-amber-900">第 {escalation.level} 级升级</span>
													</div>
													<button
														on:click={() => removeEscalationRule(escalation.id)}
														class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
													>
														<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
														</svg>
													</button>
												</div>
												<div class="grid grid-cols-2 gap-4">
													<div>
														<label class="block text-xs font-medium text-gray-600 mb-1">超时时间（分钟）</label>
														<input
															type="number"
															bind:value={escalation.timeoutMinutes}
															min="1"
															class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none bg-white"
														/>
													</div>
													<div>
														<label class="block text-xs font-medium text-gray-600 mb-1">通知角色</label>
														<select
															bind:value={escalation.notifyRoles}
															multiple
															class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none bg-white h-20"
														>
															{#each USER_ROLE_OPTIONS as role}
																<option value={role}>{role}</option>
															{/each}
														</select>
													</div>
												</div>
											</div>
										{/each}
									</div>
								{:else}
									<div class="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
										<svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 mx-auto text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
										</svg>
										<p class="text-sm">暂无升级级别，点击上方"添加升级级别"按钮添加</p>
									</div>
								{/if}
							{:else}
								<div class="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
									<p class="text-sm">请先开启"启用多级升级"开关</p>
								</div>
							{/if}
						</div>
					{/if}
				</div>

				<div class="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
					<button
						type="button"
						on:click={() => (showModal = false)}
						class="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
					>
						取消
					</button>
					<button
						on:click={handleSave}
						class="px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors font-medium"
					>
						{isEditing ? '保存修改' : '创建规则'}
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
