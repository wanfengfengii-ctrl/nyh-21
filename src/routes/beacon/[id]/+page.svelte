<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import {
		beaconLights,
		maintenanceRecords,
		lampshadeInspections,
		lightSourceReplacements,
		exhibitionStatusHistories,
		borrowRequests,
		repairOrders,
		attachments,
		museums,
		currentUser,
		currentMuseumId,
		deleteBeaconLight,
		addMaintenanceRecord,
		addLampshadeInspection,
		addLightSourceReplacement,
		changeExhibitionStatus,
		createRepairOrder,
		uploadAttachment,
		deleteAttachment
	} from '$lib/stores';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import type {
		BeaconLight,
		MaintenanceRecord,
		LampshadeInspection,
		LightSourceReplacement,
		ExhibitionStatusHistory,
		RepairPriority
	} from '$lib/types';
	import { EXHIBITION_STATUS_OPTIONS, LAMPSHADE_STATUS_OPTIONS, REPAIR_PRIORITY_OPTIONS } from '$lib/types';
	import type { LampshadeStatus, ExhibitionStatus } from '$lib/types';
	import {
		validateExhibitionStatusChange,
		validateLampshadeInspection,
		validateLightSourceReplacement,
		validateMaintenanceRecord,
		validateRepairOrder,
		getToday
	} from '$lib/validation';

	let beaconId = $derived($page.params.id ?? '');
	let activeTab = $state<
		'info' | 'maintenance' | 'lampshade' | 'lightSource' | 'exhibition' | 'borrow' | 'repair' | 'attachment'
	>('info');

	let light = $derived($beaconLights.find(l => l.id === beaconId));
	let records = $derived($maintenanceRecords.filter(r => r.beaconLightId === beaconId).sort((a, b) => b.date.localeCompare(a.date)));
	let inspections = $derived($lampshadeInspections.filter(i => i.beaconLightId === beaconId).sort((a, b) => b.date.localeCompare(a.date)));
	let replacements = $derived($lightSourceReplacements.filter(r => r.beaconLightId === beaconId).sort((a, b) => b.date.localeCompare(a.date)));
	let histories = $derived($exhibitionStatusHistories.filter(h => h.beaconLightId === beaconId).sort((a, b) => b.date.localeCompare(a.date)));
	let lightBorrows = $derived($borrowRequests.filter(b => b.beaconLightId === beaconId).sort((a, b) => b.applyDate.localeCompare(a.applyDate)));
	let lightRepairs = $derived($repairOrders.filter(r => r.beaconLightId === beaconId).sort((a, b) => b.createDate.localeCompare(a.createDate)));
	let lightAttachments = $derived($attachments.filter(a => a.beaconLightId === beaconId).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)));
	let museum = $derived(light ? $museums.find(m => m.id === light.museumId) : undefined);

	let tabLabels = $derived([
		{ id: 'info', label: '基本信息' },
		{ id: 'maintenance', label: `维护记录 (${records.length})` },
		{ id: 'lampshade', label: `灯罩检查 (${inspections.length})` },
		{ id: 'lightSource', label: `光源更换 (${replacements.length})` },
		{ id: 'exhibition', label: `展陈流转 (${histories.length})` },
		{ id: 'borrow', label: `借展记录 (${lightBorrows.length})` },
		{ id: 'repair', label: `修复工单 (${lightRepairs.length})` },
		{ id: 'attachment', label: `附件 (${lightAttachments.length})` }
	]);

	let showMaintenanceModal = $state(false);
	let showLampshadeModal = $state(false);
	let showLightSourceModal = $state(false);
	let showExhibitionModal = $state(false);
	let showRepairModal = $state(false);
	let showAttachmentModal = $state(false);
	let showDeleteConfirm = $state(false);

	let maintenanceForm = $state({
		date: getToday(),
		type: '常规维护' as MaintenanceRecord['type'],
		description: '',
		operator: '',
		replaceReason: ''
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

	let repairForm = $state({
		repairType: '常规维护',
		priority: '中' as RepairPriority,
		description: '',
		estimatedDays: 7
	});
	let repairErrors = $state<string[]>([]);

	let attachmentForm = $state({
		fileName: '',
		fileType: '',
		fileSize: 0,
		description: ''
	});

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
		maintenanceForm = { date: getToday(), type: '常规维护', description: '', operator: '', replaceReason: '' };
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
			light.lampshadeStatus,
			light.isOnBorrow,
			light.isUnderRepair
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

	function openRepairModal() {
		repairForm = {
			repairType: '常规维护',
			priority: '中' as RepairPriority,
			description: '',
			estimatedDays: 7
		};
		repairErrors = [];
		showRepairModal = true;
	}

	function submitRepair() {
		if (!light) return;
		const result = validateRepairOrder(repairForm, light);
		if (!result.valid) {
			repairErrors = result.errors;
			return;
		}
		createRepairOrder({
			beaconLightId: beaconId,
			museumId: light.museumId,
			reporterId: $currentUser?.id || '',
			repairType: repairForm.repairType,
			priority: repairForm.priority,
			description: repairForm.description
		});
		showRepairModal = false;
	}

	function openAttachmentModal() {
		attachmentForm = {
			fileName: '',
			fileType: '',
			fileSize: 0,
			description: ''
		};
		showAttachmentModal = true;
	}

	function handleFileSelect(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) {
			attachmentForm.fileName = file.name;
			attachmentForm.fileType = file.type || '未知类型';
			attachmentForm.fileSize = file.size;
		}
	}

	function submitAttachment() {
		if (!light) return;
		if (!attachmentForm.fileName) {
			return;
		}
		uploadAttachment({
			beaconLightId: beaconId,
			fileName: attachmentForm.fileName,
			fileType: attachmentForm.fileType,
			fileSize: attachmentForm.fileSize,
			description: attachmentForm.description,
			uploaderId: $currentUser?.id || '',
			uploaderName: $currentUser?.fullName || '',
			url: `#att-${Date.now()}`
		});
		showAttachmentModal = false;
	}

	function handleDeleteAttachment(id: string) {
		if (!confirm('确认删除该附件？')) return;
		deleteAttachment(id);
	}

	function formatFileSize(bytes: number): string {
		if (bytes < 1024) return bytes + ' B';
		if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
		return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
	}

	function getBorrowStatusClass(status: string) {
		const base = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium';
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

	function getRepairStatusClass(status: string) {
		const base = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium';
		switch (status) {
			case '待分配': return `${base} bg-amber-100 text-amber-800`;
			case '修复中': return `${base} bg-blue-100 text-blue-800`;
			case '待验收': return `${base} bg-purple-100 text-purple-800`;
			case '已完成': return `${base} bg-emerald-100 text-emerald-800`;
			case '已取消': return `${base} bg-gray-100 text-gray-600`;
			default: return `${base} bg-gray-100 text-gray-800`;
		}
	}

	function getRepairPriorityClass(priority: string) {
		const base = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium';
		switch (priority) {
			case '紧急': return `${base} bg-red-100 text-red-700`;
			case '高': return `${base} bg-orange-100 text-orange-700`;
			case '中': return `${base} bg-amber-100 text-amber-700`;
			case '低': return `${base} bg-gray-100 text-gray-600`;
			default: return `${base} bg-gray-100 text-gray-600`;
		}
	}

	const canEdit = $derived(() => {
		if (!$currentUser || !light) return false;
		if ($currentUser.role === '系统管理员') return true;
		if ($currentUser.role === '馆区管理员' && light.museumId === $currentMuseumId) return true;
		if ($currentUser.role === '保管员' && light.museumId === $currentMuseumId) return true;
		return false;
	});
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
						{#if museum}
							<p class="text-amber-200 text-sm mt-1">
								<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
								</svg>
								{museum.name}
							</p>
						{/if}
					</div>
					<div class="flex flex-col items-end gap-2">
						<StatusBadge status={light.exhibitionStatus} type="exhibition" />
						{#if light.isOnBorrow}
							<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
								借展中
							</span>
						{/if}
						{#if light.isUnderRepair}
							<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
								修复中
							</span>
						{/if}
					</div>
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
								<div class="flex justify-between">
									<span class="text-gray-500">所属馆区</span>
									<span class="font-medium">{museum?.name || '-'}</span>
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
								<div class="flex justify-between items-center">
									<span class="text-gray-500">借展状态</span>
									<span class="font-medium {light.isOnBorrow ? 'text-amber-600' : 'text-gray-600'}">
										{light.isOnBorrow ? '借出中' : '在馆'}
									</span>
								</div>
								<div class="flex justify-between items-center">
									<span class="text-gray-500">修复状态</span>
									<span class="font-medium {light.isUnderRepair ? 'text-red-600' : 'text-gray-600'}">
										{light.isUnderRepair ? '修复中' : '正常'}
									</span>
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

					{#if light.description}
						<div class="mt-6">
							<h3 class="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-3">藏品描述</h3>
							<p class="text-gray-700 leading-relaxed">{light.description}</p>
						</div>
					{/if}

					<div class="flex flex-wrap gap-3 mt-8 pt-6 border-t border-gray-200">
						{#if canEdit()}
							<button
								on:click={goEdit}
								class="inline-flex items-center gap-2 px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors font-medium"
							>
								<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
								</svg>
								编辑档案
							</button>
						{/if}
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
							on:click={openRepairModal}
							class="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
						>
							<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
							</svg>
							创建修复
						</button>
						<button
							on:click={openAttachmentModal}
							class="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
						>
							<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
							</svg>
							上传附件
						</button>
						{#if canEdit()}
							<button
								on:click={() => (showDeleteConfirm = true)}
								class="inline-flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium ml-auto"
							>
								<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
								</svg>
								删除档案
							</button>
						{/if}
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

				{#if activeTab === 'borrow'}
					<div class="space-y-4">
						<div class="flex justify-between items-center">
							<h3 class="text-lg font-semibold text-gray-800">借展记录</h3>
							<a
								href="/borrow"
								class="text-sm px-3 py-1.5 bg-amber-700 text-white rounded-md hover:bg-amber-800 transition-colors"
							>
								去借展管理
							</a>
						</div>
						{#if lightBorrows.length > 0}
							<div class="space-y-3">
								{#each lightBorrows as borrow}
									<div class="p-4 bg-gray-50 rounded-lg border border-gray-100">
										<div class="flex justify-between items-start mb-3">
											<div class="flex items-center gap-3">
												<span class={getBorrowStatusClass(borrow.status)}>{borrow.status}</span>
												<span class="text-gray-500 text-sm">{borrow.applyDate} 申请</span>
											</div>
											<span class="text-sm text-gray-600">申请人：{borrow.applicantName}</span>
										</div>
										<div class="grid grid-cols-2 gap-3 text-sm">
											<div>
												<span class="text-gray-500">出借馆区：</span>
												<span class="text-gray-700">{borrow.sourceMuseumName}</span>
											</div>
											<div>
												<span class="text-gray-500">借入馆区：</span>
												<span class="text-gray-700">{borrow.targetMuseumName}</span>
											</div>
											<div>
												<span class="text-gray-500">计划时间：</span>
												<span class="text-gray-700">{borrow.plannedStartDate} ~ {borrow.plannedEndDate}</span>
											</div>
											<div>
												<span class="text-gray-500">展陈位置：</span>
												<span class="text-gray-700">{borrow.exhibitionLocation}</span>
											</div>
										</div>
										<p class="text-sm text-gray-600 mt-2">用途：{borrow.purpose}</p>
										{#if borrow.approvalHistory.length > 0}
											<div class="mt-3 pt-3 border-t border-gray-200">
												<p class="text-xs text-gray-500 mb-2">审批记录：</p>
												<div class="space-y-1">
													{#each borrow.approvalHistory as record}
														<div class="text-xs text-gray-600 flex gap-2">
															<span class="text-gray-400">{record.timestamp}</span>
															<span class="font-medium">{record.approverName}</span>
															<span class={
																record.action === '通过' ? 'text-emerald-600' :
																record.action === '拒绝' ? 'text-red-600' : 'text-blue-600'
															}>[{record.action}]</span>
															<span>{record.comment}</span>
														</div>
													{/each}
												</div>
											</div>
										{/if}
									</div>
								{/each}
							</div>
						{:else}
							<p class="text-gray-500 text-center py-8">暂无借展记录</p>
						{/if}
					</div>
				{/if}

				{#if activeTab === 'repair'}
					<div class="space-y-4">
						<div class="flex justify-between items-center">
							<h3 class="text-lg font-semibold text-gray-800">修复工单</h3>
							<div class="flex gap-2">
								<button
									on:click={openRepairModal}
									class="text-sm px-3 py-1.5 bg-amber-700 text-white rounded-md hover:bg-amber-800 transition-colors"
								>
									+ 创建工单
								</button>
								<a
									href="/repair"
									class="text-sm px-3 py-1.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
								>
									去修复管理
								</a>
							</div>
						</div>
						{#if lightRepairs.length > 0}
							<div class="space-y-3">
								{#each lightRepairs as repair}
									<div class="p-4 bg-gray-50 rounded-lg border border-gray-100">
										<div class="flex justify-between items-start mb-2">
											<div class="flex items-center gap-3">
												<span class={getRepairStatusClass(repair.status)}>{repair.status}</span>
												<span class={getRepairPriorityClass(repair.priority)}>{repair.priority}优先级</span>
												<span class="text-gray-500 text-sm">{repair.createDate}</span>
											</div>
											<span class="text-sm text-gray-600">报告人：{repair.reporterName}</span>
										</div>
										<div class="grid grid-cols-2 gap-3 text-sm mb-2">
											<div>
												<span class="text-gray-500">修复类型：</span>
												<span class="text-gray-700">{repair.repairType}</span>
											</div>
											<div>
												<span class="text-gray-500">分配日期：</span>
												<span class="text-gray-700">{repair.assignDate || '-'}</span>
											</div>
											{#if repair.assigneeName}
												<div>
													<span class="text-gray-500">修复师：</span>
													<span class="text-gray-700">{repair.assigneeName}</span>
												</div>
											{/if}
											{#if repair.completeDate}
												<div>
													<span class="text-gray-500">完成日期：</span>
													<span class="text-gray-700">{repair.completeDate}</span>
												</div>
											{/if}
										</div>
										<p class="text-sm text-gray-700">问题描述：{repair.description}</p>
										{#if repair.repairResult}
											<p class="text-sm text-emerald-600 mt-2">修复结果：{repair.repairResult}</p>
										{/if}
									</div>
								{/each}
							</div>
						{:else}
							<p class="text-gray-500 text-center py-8">暂无修复工单记录</p>
						{/if}
					</div>
				{/if}

				{#if activeTab === 'attachment'}
					<div class="space-y-4">
						<div class="flex justify-between items-center">
							<h3 class="text-lg font-semibold text-gray-800">附件管理</h3>
							<button
								on:click={openAttachmentModal}
								class="text-sm px-3 py-1.5 bg-amber-700 text-white rounded-md hover:bg-amber-800 transition-colors"
							>
								+ 上传附件
							</button>
						</div>
						{#if lightAttachments.length > 0}
							<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
								{#each lightAttachments as attachment}
									<div class="p-4 bg-gray-50 rounded-lg border border-gray-100 flex items-start gap-3">
										<div class="flex-shrink-0">
											<div class="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
												<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
												</svg>
											</div>
										</div>
										<div class="flex-1 min-w-0">
											<p class="font-medium text-gray-800 truncate">{attachment.fileName}</p>
											<p class="text-xs text-gray-500 mt-0.5">
												{formatFileSize(attachment.fileSize)} · {attachment.uploaderName || attachment.uploadedBy} · {attachment.uploadedAt}
											</p>
											{#if attachment.description}
												<p class="text-sm text-gray-600 mt-1">{attachment.description}</p>
											{/if}
										</div>
										<button
											on:click={() => handleDeleteAttachment(attachment.id)}
											class="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors"
											title="删除"
										>
											<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
											</svg>
										</button>
									</div>
								{/each}
							</div>
						{:else}
							<p class="text-gray-500 text-center py-8">暂无附件，点击上方按钮上传</p>
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
					{#if maintenanceForm.type === '光源更换'}
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">更换原因 *</label>
							<textarea bind:value={maintenanceForm.replaceReason} rows={2}
								class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none"
								placeholder="请填写光源更换的原因"></textarea>
						</div>
					{/if}
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
						<p class="text-xs text-gray-500 mt-1">注意：借展中、修复中、灯罩破损时不能标记为"展出中"</p>
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

	{#if showRepairModal}
		<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" on:click={() => (showRepairModal = false)}>
			<div class="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto" on:click|stopPropagation>
				<div class="px-6 py-4 border-b border-gray-200">
					<h3 class="text-lg font-semibold text-gray-800">创建修复工单</h3>
				</div>
				<form on:submit|preventDefault={submitRepair} class="p-6 space-y-4">
					{#if repairErrors.length > 0}
						<div class="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
							{#each repairErrors as err}
								<p>{err}</p>
							{/each}
						</div>
					{/if}
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">修复类型</label>
						<select bind:value={repairForm.repairType}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none">
							<option value="常规维护">常规维护</option>
							<option value="灯罩修复">灯罩修复</option>
							<option value="结构修复">结构修复</option>
							<option value="配件更换">配件更换</option>
							<option value="清洁保养">清洁保养</option>
							<option value="其他">其他</option>
						</select>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">优先级</label>
						<select bind:value={repairForm.priority}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none">
							{#each REPAIR_PRIORITY_OPTIONS as p}
								<option value={p}>{p}</option>
							{/each}
						</select>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">问题描述 *</label>
						<textarea bind:value={repairForm.description} rows={3}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none"
							placeholder="请详细描述需要修复的问题"></textarea>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">预计修复天数</label>
						<input type="number" bind:value={repairForm.estimatedDays} min="1"
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none" />
					</div>
					<div class="flex justify-end gap-3 pt-2">
						<button type="button" on:click={() => (showRepairModal = false)}
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

	{#if showAttachmentModal}
		<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" on:click={() => (showAttachmentModal = false)}>
			<div class="bg-white rounded-xl shadow-xl max-w-md w-full" on:click|stopPropagation>
				<div class="px-6 py-4 border-b border-gray-200">
					<h3 class="text-lg font-semibold text-gray-800">上传附件</h3>
				</div>
				<form on:submit|preventDefault={submitAttachment} class="p-6 space-y-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">选择文件</label>
						<label class="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
							<svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
							</svg>
							<p class="text-sm text-gray-500">
								{attachmentForm.fileName || '点击选择文件'}
							</p>
							<input type="file" class="hidden" on:change={handleFileSelect} />
						</label>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">文件描述</label>
						<textarea bind:value={attachmentForm.description} rows={2}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none"
							placeholder="可选：添加文件描述"></textarea>
					</div>
					<div class="flex justify-end gap-3 pt-2">
						<button type="button" on:click={() => (showAttachmentModal = false)}
							class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
							取消
						</button>
						<button type="submit" disabled={!attachmentForm.fileName}
							class="px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
							上传
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
