<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Chart, registerables } from 'chart.js';
	import {
		envMonitorPoints,
		envMonitorRecords,
		envThresholdConfigs,
		envAlerts,
		envRiskAssessments,
		rectificationTasks,
		currentUser,
		currentMuseumId,
		beaconLights,
		users,
		addEnvMonitorRecord,
		updateThresholdConfig,
		confirmEnvAlert,
		createRectificationTask,
		startRectificationTask,
		completeRectificationTask,
		acceptRectificationTask,
		cancelRectificationTask,
		assignRectificationTask,
		addEnvMonitorPoint,
		updateEnvMonitorPoint,
		deleteEnvMonitorPoint
	} from '$lib/stores';
	import { SALT_FOG_LEVEL_OPTIONS, RISK_LEVEL_OPTIONS, ALERT_STATUS_OPTIONS, RECTIFICATION_STATUS_OPTIONS, ENV_LOCATION_TYPE_OPTIONS } from '$lib/types';
	import type {
		EnvMonitorPoint,
		EnvAlert,
		RectificationTask,
		RiskLevel,
		AlertStatus,
		RectificationTaskStatus,
		SaltFogLevel,
		EnvMonitorLocationType
	} from '$lib/types';

	Chart.register(...registerables);

	let activeTab = $state<'overview' | 'alerts' | 'threshold' | 'rectification' | 'points'>('overview');
	let selectedPointId = $state<string>('');
	let searchKeyword = $state('');
	let alertStatusFilter = $state<string>('');
	let riskLevelFilter = $state<string>('');
	let rectStatusFilter = $state<string>('');

	let showRecordModal = $state(false);
	let showAlertModal = $state(false);
	let showThresholdModal = $state(false);
	let showRectificationModal = $state(false);
	let showPointModal = $state(false);
	let showDetailModal = $state(false);

	let selectedAlert = $state<EnvAlert | null>(null);
	let selectedTask = $state<RectificationTask | null>(null);
	let selectedPoint = $state<EnvMonitorPoint | null>(null);

	let recordForm = $state({
		temperature: 22,
		humidity: 50,
		illuminance: 150,
		vibration: 0.05,
		saltFogLevel: '无' as SaltFogLevel,
		collectedAt: ''
	});
	let recordErrors = $state<string[]>([]);

	let thresholdForm = $state({
		temperatureMin: 18,
		temperatureMax: 25,
		humidityMin: 40,
		humidityMax: 60,
		illuminanceMax: 200,
		vibrationMax: 0.2,
		saltFogMaxLevel: '轻微' as SaltFogLevel
	});
	let thresholdErrors = $state<string[]>([]);

	let alertForm = $state({
		status: '处理中' as AlertStatus,
		remark: ''
	});

	let rectificationForm = $state({
		title: '',
		description: '',
		riskLevel: '中风险' as RiskLevel,
		assigneeId: '',
		dueDate: '',
		remark: ''
	});
	let rectificationErrors = $state<string[]>([]);

	let pointForm = $state({
		code: '',
		name: '',
		type: '展柜' as EnvMonitorLocationType,
		location: '',
		beaconLightIds: [] as string[]
	});
	let pointErrors = $state<string[]>([]);
	let isEditingPoint = $state(false);

	let trendChartEl: HTMLCanvasElement;
	let trendChart: Chart | null = null;

	const tabs = [
		{ id: 'overview', label: '数据概览', icon: 'chart' },
		{ id: 'alerts', label: '告警管理', icon: 'alert' },
		{ id: 'threshold', label: '阈值配置', icon: 'settings' },
		{ id: 'rectification', label: '整改任务', icon: 'task' },
		{ id: 'points', label: '监测点管理', icon: 'location' }
	];

	const filteredPoints = $derived(() => {
		let result = [...$envMonitorPoints];
		if ($currentUser?.role !== '系统管理员') {
			result = result.filter(p => p.museumId === $currentMuseumId);
		}
		if (searchKeyword.trim()) {
			const kw = searchKeyword.toLowerCase();
			result = result.filter(p =>
				p.name.toLowerCase().includes(kw) ||
				p.code.toLowerCase().includes(kw) ||
				p.location.toLowerCase().includes(kw)
			);
		}
		return result;
	});

	const currentPoint = $derived(() => {
		if (selectedPointId) return $envMonitorPoints.find(p => p.id === selectedPointId);
		return filteredPoints[0] || null;
	});

	const pointRecords = $derived(() => {
		const point = currentPoint;
		if (!point) return [];
		return $envMonitorRecords
			.filter(r => r.pointId === point.id)
			.sort((a, b) => b.collectedAt.localeCompare(a.collectedAt))
			.slice(0, 30);
	});

	const currentThreshold = $derived(() => {
		const point = currentPoint;
		if (!point) return null;
		return $envThresholdConfigs.find(c => c.pointId === point.id) || null;
	});

	const filteredAlerts = $derived(() => {
		let result = [...$envAlerts];
		if ($currentUser?.role !== '系统管理员') {
			result = result.filter(a => a.museumId === $currentMuseumId);
		}
		if (selectedPointId) {
			result = result.filter(a => a.pointId === selectedPointId);
		}
		if (alertStatusFilter) {
			result = result.filter(a => a.status === alertStatusFilter);
		}
		if (riskLevelFilter) {
			result = result.filter(a => a.alertLevel === riskLevelFilter);
		}
		return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
	});

	const filteredTasks = $derived(() => {
		let result = [...$rectificationTasks];
		if ($currentUser?.role !== '系统管理员') {
			result = result.filter(t => t.museumId === $currentMuseumId);
		}
		if (selectedPointId) {
			result = result.filter(t => t.pointId === selectedPointId);
		}
		if (rectStatusFilter) {
			result = result.filter(t => t.status === rectStatusFilter);
		}
		return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
	});

	const pointLights = $derived(() => {
		const point = currentPoint;
		if (!point) return [];
		return $beaconLights.filter(l => point.beaconLightIds.includes(l.id));
	});

	const availableLights = $derived(() => {
		return $beaconLights.filter(l => l.museumId === $currentMuseumId);
	});

	const alertStats = $derived(() => {
		const alerts = $envAlerts.filter(a => {
			if ($currentUser?.role !== '系统管理员') {
				return a.museumId === $currentMuseumId;
			}
			return true;
		});
		return {
			total: alerts.length,
			pending: alerts.filter(a => a.status === '待处理').length,
			processing: alerts.filter(a => a.status === '处理中').length,
			highRisk: alerts.filter(a => a.alertLevel === '高风险' && a.status !== '已确认' && a.status !== '已忽略').length
		};
	});

	const taskStats = $derived(() => {
		const tasks = $rectificationTasks.filter(t => {
			if ($currentUser?.role !== '系统管理员') {
				return t.museumId === $currentMuseumId;
			}
			return true;
		});
		return {
			total: tasks.length,
			pending: tasks.filter(t => t.status === '待整改').length,
			processing: tasks.filter(t => t.status === '整改中').length,
			completed: tasks.filter(t => t.status === '已完成').length
		};
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

	function getAlertStatusClass(status: AlertStatus) {
		const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
		switch (status) {
			case '待处理': return `${base} bg-red-100 text-red-800`;
			case '处理中': return `${base} bg-amber-100 text-amber-800`;
			case '已确认': return `${base} bg-green-100 text-green-800`;
			case '已忽略': return `${base} bg-gray-100 text-gray-600`;
			default: return `${base} bg-gray-100 text-gray-800`;
		}
	}

	function getRectStatusClass(status: RectificationTaskStatus) {
		const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
		switch (status) {
			case '待整改': return `${base} bg-red-100 text-red-800`;
			case '整改中': return `${base} bg-amber-100 text-amber-800`;
			case '待验收': return `${base} bg-blue-100 text-blue-800`;
			case '已完成': return `${base} bg-green-100 text-green-800`;
			case '已取消': return `${base} bg-gray-100 text-gray-600`;
			default: return `${base} bg-gray-100 text-gray-800`;
		}
	}

	function openRecordModal() {
		const now = new Date();
		recordForm = {
			temperature: 22,
			humidity: 50,
			illuminance: 150,
			vibration: 0.05,
			saltFogLevel: '无',
			collectedAt: now.toISOString().slice(0, 16)
		};
		recordErrors = [];
		showRecordModal = true;
	}

	function handleAddRecord() {
		const point = currentPoint();
		if (!point) return;

		const result = addEnvMonitorRecord({
			pointId: point.id,
			temperature: recordForm.temperature,
			humidity: recordForm.humidity,
			illuminance: recordForm.illuminance,
			vibration: recordForm.vibration,
			saltFogLevel: recordForm.saltFogLevel,
			collectedAt: recordForm.collectedAt.replace('T', ' ') + ':00'
		}) as any;

		if (result && !result.success) {
			recordErrors = result.errors;
			return;
		}

		showRecordModal = false;
	}

	function openAlertDetail(alert: EnvAlert) {
		selectedAlert = alert;
		alertForm = {
			status: alert.status,
			remark: alert.confirmRemark || ''
		};
		showAlertModal = true;
	}

	function handleAlertConfirm() {
		if (!selectedAlert) return;
		confirmEnvAlert(selectedAlert.id, alertForm.status, alertForm.remark);
		selectedAlert = $envAlerts.find(a => a.id === selectedAlert?.id) || null;
	}

	function openThresholdModal() {
		const config = currentThreshold();
		if (config) {
			thresholdForm = {
				temperatureMin: config.temperatureMin,
				temperatureMax: config.temperatureMax,
				humidityMin: config.humidityMin,
				humidityMax: config.humidityMax,
				illuminanceMax: config.illuminanceMax,
				vibrationMax: config.vibrationMax,
				saltFogMaxLevel: config.saltFogMaxLevel
			};
		}
		thresholdErrors = [];
		showThresholdModal = true;
	}

	function handleSaveThreshold() {
		const point = currentPoint();
		if (!point) return;

		const result = updateThresholdConfig(point.id, thresholdForm);
		if (!result.success) {
			thresholdErrors = result.errors;
			return;
		}
		showThresholdModal = false;
	}

	function openCreateTaskModal() {
		const point = currentPoint();
		rectificationForm = {
			title: '',
			description: '',
			riskLevel: '中风险',
			assigneeId: '',
			dueDate: '',
			remark: ''
		};
		rectificationErrors = [];
		showRectificationModal = true;
	}

	function handleCreateTask() {
		const point = currentPoint();
		if (!point) return;

		const result = createRectificationTask({
			pointId: point.id,
			title: rectificationForm.title,
			description: rectificationForm.description,
			beaconLightIds: point.beaconLightIds,
			riskLevel: rectificationForm.riskLevel,
			assigneeId: rectificationForm.assigneeId || undefined,
			dueDate: rectificationForm.dueDate || undefined,
			remark: rectificationForm.remark || undefined
		}) as any;

		if (result && !result.success) {
			rectificationErrors = result.errors;
			return;
		}

		showRectificationModal = false;
	}

	function openTaskDetail(task: RectificationTask) {
		selectedTask = task;
		showDetailModal = true;
	}

	function handleStartTask() {
		if (!selectedTask) return;
		startRectificationTask(selectedTask.id);
		selectedTask = $rectificationTasks.find(t => t.id === selectedTask?.id) || null;
	}

	function handleCompleteTask() {
		if (!selectedTask) return;
		const result = prompt('请输入整改结果：', '');
		if (result === null) return;
		const res = completeRectificationTask(selectedTask.id, result || '整改完成');
		if (res && typeof res === 'object' && !res.success) {
			alert(res.error);
			return;
		}
		selectedTask = $rectificationTasks.find(t => t.id === selectedTask?.id) || null;
	}

	function handleAcceptTask() {
		if (!selectedTask) return;
		const result = prompt('请输入验收结果：', '');
		if (result === null) return;
		acceptRectificationTask(selectedTask.id, result || '验收通过');
		selectedTask = $rectificationTasks.find(t => t.id === selectedTask?.id) || null;
	}

	function handleCancelTask() {
		if (!selectedTask) return;
		const reason = prompt('请输入取消原因：', '');
		if (reason === null) return;
		const res = cancelRectificationTask(selectedTask.id, reason || '取消');
		if (res && typeof res === 'object' && !res.success) {
			alert(res.error);
			return;
		}
		selectedTask = $rectificationTasks.find(t => t.id === selectedTask?.id) || null;
	}

	function openPointModal(point?: EnvMonitorPoint) {
		if (point) {
			isEditingPoint = true;
			selectedPoint = point;
			pointForm = {
				code: point.code,
				name: point.name,
				type: point.type,
				location: point.location,
				beaconLightIds: [...point.beaconLightIds]
			};
		} else {
			isEditingPoint = false;
			selectedPoint = null;
			pointForm = {
				code: '',
				name: '',
				type: '展柜',
				location: '',
				beaconLightIds: []
			};
		}
		pointErrors = [];
		showPointModal = true;
	}

	function handleSavePoint() {
		if (isEditingPoint && selectedPoint) {
			const result = updateEnvMonitorPoint(selectedPoint.id, pointForm);
			if (!result.success) {
				pointErrors = result.errors;
				return;
			}
		} else {
			const result = addEnvMonitorPoint({
				...pointForm,
				museumId: $currentMuseumId
			}) as any;
			if (result && !result.success) {
				pointErrors = result.errors;
				return;
			}
		}
		showPointModal = false;
	}

	function handleDeletePoint(point: EnvMonitorPoint) {
		if (!confirm(`确定要删除监测点"${point.name}"吗？相关的监测记录、告警和整改任务也会被删除。`)) return;
		deleteEnvMonitorPoint(point.id);
	}

	function getTrendData() {
		const records = pointRecords.slice().reverse();
		const labels = records.map(r => r.collectedAt.slice(5, 10));
		return {
			labels,
			temperature: records.map(r => r.temperature),
			humidity: records.map(r => r.humidity),
			illuminance: records.map(r => r.illuminance),
			vibration: records.map(r => r.vibration)
		};
	}

	function initTrendChart() {
		if (!trendChartEl) return;

		const data = getTrendData();
		const config = currentThreshold();

		trendChart = new Chart(trendChartEl, {
			type: 'line',
			data: {
				labels: data.labels,
				datasets: [
					{
						label: '温度 (°C)',
						data: data.temperature,
						borderColor: 'rgba(239, 68, 68, 0.8)',
						backgroundColor: 'rgba(239, 68, 68, 0.1)',
						fill: true,
						tension: 0.4,
						yAxisID: 'y'
					},
					{
						label: '湿度 (%)',
						data: data.humidity,
						borderColor: 'rgba(59, 130, 246, 0.8)',
						backgroundColor: 'rgba(59, 130, 246, 0.1)',
						fill: true,
						tension: 0.4,
						yAxisID: 'y1'
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				interaction: {
					mode: 'index',
					intersect: false
				},
				plugins: {
					legend: {
						position: 'top',
						labels: { usePointStyle: true }
					},
					title: {
						display: true,
						text: '温湿度趋势图',
						font: { size: 16, weight: 'bold' as const },
						color: '#78350f',
						padding: { bottom: 20 }
					}
				},
				scales: {
					y: {
						type: 'linear',
						display: true,
						position: 'left',
						title: {
							display: true,
							text: '温度 (°C)'
						}
					},
					y1: {
						type: 'linear',
						display: true,
						position: 'right',
						title: {
							display: true,
							text: '湿度 (%)'
						},
						grid: {
							drawOnChartArea: false
						}
					},
					x: {
						grid: { display: false }
					}
				}
			}
		});
	}

	function updateTrendChart() {
		if (!trendChart) return;
		const data = getTrendData();
		trendChart.data.labels = data.labels;
		trendChart.data.datasets[0].data = data.temperature;
		trendChart.data.datasets[1].data = data.humidity;
		trendChart.update();
	}

	function destroyTrendChart() {
		trendChart?.destroy();
	}

	onMount(() => {
		if (filteredPoints.length > 0 && !selectedPointId) {
			selectedPointId = filteredPoints[0].id;
		}
	});

	$effect(() => {
		if (activeTab === 'overview' && currentPoint) {
			if (trendChart) {
				updateTrendChart();
			} else {
				setTimeout(() => {
					initTrendChart();
				}, 100);
			}
		}
	});

	onDestroy(() => {
		destroyTrendChart();
	});

	const canManagePoints = $derived(() => {
		return $currentUser?.role === '馆区管理员' || $currentUser?.role === '系统管理员';
	});

	const canAddRecord = $derived(() => {
		return $currentUser?.role === '保管员' || $currentUser?.role === '研究员' ||
			$currentUser?.role === '馆区管理员' || $currentUser?.role === '系统管理员';
	});

	const canConfirmAlert = $derived(() => {
		return $currentUser?.role === '保管员' || $currentUser?.role === '馆区管理员' ||
			$currentUser?.role === '系统管理员';
	});

	const canCreateTask = $derived(() => {
		return $currentUser?.role === '馆区管理员' || $currentUser?.role === '系统管理员';
	});

	const canDoTask = $derived(() => {
		return $currentUser?.role === '保管员' || $currentUser?.role === '修复师' ||
			$currentUser?.role === '系统管理员';
	});

	const canAcceptTask = $derived(() => {
		return $currentUser?.role === '馆区管理员' || $currentUser?.role === '系统管理员';
	});
</script>

<div class="space-y-6">
	<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
		<div>
			<h2 class="text-2xl font-bold text-amber-900">环境监测与文物风险联动</h2>
			<p class="text-gray-600 mt-1">温湿度、照度、震动、盐雾监测与风险预警管理</p>
		</div>
		<div class="flex gap-2">
			{#if canAddRecord && currentPoint()}
				<button
					on:click={openRecordModal}
					class="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium shadow-md"
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
					</svg>
					录入数据
				</button>
			{/if}
		</div>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-4 gap-4">
		<div class="lg:col-span-1">
			<div class="bg-white rounded-xl shadow-md p-4">
				<h3 class="font-semibold text-gray-800 mb-3">监测点选择</h3>
				<div class="space-y-2 max-h-96 overflow-y-auto">
					{#each filteredPoints as point}
						<button
							on:click={() => selectedPointId = point.id}
							class="w-full text-left p-3 rounded-lg transition-colors {
								selectedPointId === point.id
									? 'bg-amber-100 border-2 border-amber-500'
									: 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
							}"
						>
							<div class="flex items-center justify-between">
								<span class="font-medium text-gray-800 text-sm">{point.name}</span>
								<span class="text-xs text-gray-500">{point.type}</span>
							</div>
							<p class="text-xs text-gray-500 mt-1">{point.code} · {point.location}</p>
							<p class="text-xs text-amber-600 mt-1">
								{point.beaconLightIds.length} 件藏品
							</p>
						</button>
					{/each}
				</div>
			</div>
		</div>

		<div class="lg:col-span-3">
			<div class="bg-white rounded-xl shadow-md overflow-hidden">
				<div class="flex border-b border-gray-200">
					{#each tabs as tab}
						<button
							on:click={() => { activeTab = tab.id as typeof activeTab; }}
							class="flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 {
								activeTab === tab.id
									? 'text-amber-800 bg-amber-50 border-b-2 border-amber-500'
									: 'text-gray-600 hover:bg-gray-50'
							}"
						>
							{#if tab.icon === 'chart'}
								<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
								</svg>
							{:else if tab.icon === 'alert'}
								<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
								</svg>
							{:else if tab.icon === 'settings'}
								<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
								</svg>
							{:else if tab.icon === 'task'}
								<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
								</svg>
							{:else if tab.icon === 'location'}
								<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
								</svg>
							{/if}
							{tab.label}
						</button>
					{/each}
				</div>

				<div class="p-6">
					{#if activeTab === 'overview'}
						<div class="space-y-6">
							{#if currentPoint()}
								<div class="grid grid-cols-2 md:grid-cols-5 gap-4">
									<div class="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4">
										<p class="text-sm text-red-600">温度</p>
										<p class="text-2xl font-bold text-red-700 mt-1">
											{pointRecords[0]?.temperature ?? '--'}°C
										</p>
										{#if currentThreshold()}
											<p class="text-xs text-red-500 mt-1">
												阈值: {currentThreshold()!.temperatureMin}-{currentThreshold()!.temperatureMax}°C
											</p>
										{/if}
									</div>
									<div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
										<p class="text-sm text-blue-600">湿度</p>
										<p class="text-2xl font-bold text-blue-700 mt-1">
											{pointRecords[0]?.humidity ?? '--'}%
										</p>
										{#if currentThreshold()}
											<p class="text-xs text-blue-500 mt-1">
												阈值: {currentThreshold()!.humidityMin}-{currentThreshold()!.humidityMax}%
											</p>
										{/if}
									</div>
									<div class="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4">
										<p class="text-sm text-amber-600">照度</p>
										<p class="text-2xl font-bold text-amber-700 mt-1">
											{pointRecords[0]?.illuminance ?? '--'} lux
										</p>
										{#if currentThreshold()}
											<p class="text-xs text-amber-500 mt-1">
												阈值: ≤{currentThreshold()!.illuminanceMax} lux
											</p>
										{/if}
									</div>
									<div class="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
										<p class="text-sm text-purple-600">震动</p>
										<p class="text-2xl font-bold text-purple-700 mt-1">
											{pointRecords[0]?.vibration ?? '--'} mm/s
										</p>
										{#if currentThreshold()}
											<p class="text-xs text-purple-500 mt-1">
												阈值: ≤{currentThreshold()!.vibrationMax} mm/s
											</p>
										{/if}
									</div>
									<div class="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-4">
										<p class="text-sm text-emerald-600">盐雾等级</p>
										<p class="text-2xl font-bold text-emerald-700 mt-1">
											{pointRecords[0]?.saltFogLevel ?? '--'}
										</p>
										{#if currentThreshold()}
											<p class="text-xs text-emerald-500 mt-1">
												阈值: ≤{currentThreshold()!.saltFogMaxLevel}
											</p>
										{/if}
									</div>
								</div>

								<div class="bg-white border border-gray-200 rounded-xl p-6">
									<div class="h-72">
										<canvas bind:this={trendChartEl}></canvas>
									</div>
								</div>

								<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div class="bg-red-50 border border-red-200 rounded-xl p-5">
										<div class="flex items-center justify-between mb-4">
											<h3 class="font-semibold text-red-800">告警统计</h3>
											<span class="bg-red-200 text-red-800 text-xs font-bold px-2 py-1 rounded-full">
												{alertStats.total}
											</span>
										</div>
										<div class="grid grid-cols-3 gap-3">
											<div class="text-center">
												<p class="text-2xl font-bold text-red-600">{alertStats.pending}</p>
												<p class="text-xs text-red-600">待处理</p>
											</div>
											<div class="text-center">
												<p class="text-2xl font-bold text-amber-600">{alertStats.processing}</p>
												<p class="text-xs text-amber-600">处理中</p>
											</div>
											<div class="text-center">
												<p class="text-2xl font-bold text-red-700">{alertStats.highRisk}</p>
												<p class="text-xs text-red-700">高风险</p>
											</div>
										</div>
									</div>

									<div class="bg-blue-50 border border-blue-200 rounded-xl p-5">
										<div class="flex items-center justify-between mb-4">
											<h3 class="font-semibold text-blue-800">整改任务</h3>
											<span class="bg-blue-200 text-blue-800 text-xs font-bold px-2 py-1 rounded-full">
												{taskStats.total}
											</span>
										</div>
										<div class="grid grid-cols-3 gap-3">
											<div class="text-center">
												<p class="text-2xl font-bold text-red-600">{taskStats.pending}</p>
												<p class="text-xs text-red-600">待整改</p>
											</div>
											<div class="text-center">
												<p class="text-2xl font-bold text-amber-600">{taskStats.processing}</p>
												<p class="text-xs text-amber-600">整改中</p>
											</div>
											<div class="text-center">
												<p class="text-2xl font-bold text-green-600">{taskStats.completed}</p>
												<p class="text-xs text-green-600">已完成</p>
											</div>
										</div>
									</div>
								</div>

								<div>
									<h3 class="font-semibold text-gray-800 mb-3">关联藏品</h3>
									<div class="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
										{#each pointLights as light}
											<div class="p-3 flex items-center justify-between">
												<div>
													<div class="flex items-center gap-2">
														<span class="text-xs text-amber-700 font-mono">{light.code}</span>
														<span class="font-medium text-gray-800">{light.name}</span>
													</div>
													<p class="text-xs text-gray-500 mt-1">
														材质：{light.material} · {light.exhibitionStatus}
													</p>
												</div>
												{#each $envRiskAssessments.filter(a => a.beaconLightId === light.id && a.pointId === currentPoint()?.id) as assessment}
													<span class={getRiskLevelClass(assessment.riskLevel)}>{assessment.riskLevel}</span>
												{/each}
											</div>
										{/each}
										{#if pointLights.length === 0}
											<div class="p-6 text-center text-gray-500 text-sm">
												暂无关联藏品
											</div>
										{/if}
									</div>
								</div>
							{:else}
								<div class="text-center py-12 text-gray-500">
									<svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
									</svg>
									<p>请选择一个监测点查看详情</p>
								</div>
							{/if}
						</div>

					{:else if activeTab === 'alerts'}
						<div class="space-y-4">
							<div class="flex flex-wrap gap-3">
								<select
									bind:value={alertStatusFilter}
									class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
								>
									<option value="">全部状态</option>
									{#each ALERT_STATUS_OPTIONS as status}
										<option value={status}>{status}</option>
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

							<div class="bg-white border border-gray-200 rounded-xl overflow-hidden">
								{#if filteredAlerts.length > 0}
									<div class="divide-y divide-gray-100">
										{#each filteredAlerts as alert}
											<div
												class="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
												on:click={() => openAlertDetail(alert)}
											>
												<div class="flex items-start justify-between">
													<div class="flex-1 min-w-0">
														<div class="flex items-center gap-2 mb-1">
															<span class={getAlertStatusClass(alert.status)}>{alert.status}</span>
															<span class={getRiskLevelClass(alert.alertLevel)}>{alert.alertLevel}</span>
															<span class="text-sm font-medium text-gray-800">{alert.alertType}告警</span>
														</div>
														<p class="text-sm text-gray-600">{alert.description}</p>
														<div class="flex items-center gap-4 mt-2 text-xs text-gray-500">
															<span>监测点：{alert.pointName}</span>
															<span>阈值：{alert.threshold}</span>
															<span>实际值：{alert.actualValue}</span>
														</div>
													</div>
													<div class="text-right ml-4">
														<p class="text-xs text-gray-500">{alert.createdAt.slice(5, 16)}</p>
														{#if alert.confirmedBy}
															<p class="text-xs text-gray-400 mt-1">处理人：{alert.confirmedBy}</p>
														{/if}
													</div>
												</div>
											</div>
										{/each}
									</div>
								{:else}
									<div class="p-12 text-center text-gray-500">
										<svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
										</svg>
										<p>暂无告警记录</p>
									</div>
								{/if}
							</div>
						</div>

					{:else if activeTab === 'threshold'}
						<div class="space-y-4">
							{#if currentPoint()}
								<div class="flex justify-end">
									{#if canManagePoints()}
										<button
											on:click={openThresholdModal}
											class="inline-flex items-center gap-2 px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors text-sm font-medium"
										>
											<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
											</svg>
											编辑阈值
										</button>
									{/if}
								</div>

								{#if currentThreshold()}
									<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
										<div class="bg-gradient-to-br from-red-50 to-white rounded-xl border border-red-100 p-5">
											<h4 class="font-semibold text-red-800 mb-3">温度阈值</h4>
											<div class="flex items-baseline gap-2">
												<span class="text-3xl font-bold text-red-600">{currentThreshold()!.temperatureMin}</span>
												<span class="text-gray-400">~</span>
												<span class="text-3xl font-bold text-red-600">{currentThreshold()!.temperatureMax}</span>
												<span class="text-gray-500 text-sm">°C</span>
											</div>
										</div>

										<div class="bg-gradient-to-br from-blue-50 to-white rounded-xl border border-blue-100 p-5">
											<h4 class="font-semibold text-blue-800 mb-3">湿度阈值</h4>
											<div class="flex items-baseline gap-2">
												<span class="text-3xl font-bold text-blue-600">{currentThreshold()!.humidityMin}</span>
												<span class="text-gray-400">~</span>
												<span class="text-3xl font-bold text-blue-600">{currentThreshold()!.humidityMax}</span>
												<span class="text-gray-500 text-sm">%</span>
											</div>
										</div>

										<div class="bg-gradient-to-br from-amber-50 to-white rounded-xl border border-amber-100 p-5">
											<h4 class="font-semibold text-amber-800 mb-3">照度上限</h4>
											<div class="flex items-baseline gap-2">
												<span class="text-3xl font-bold text-amber-600">{currentThreshold()!.illuminanceMax}</span>
												<span class="text-gray-500 text-sm">lux</span>
											</div>
										</div>

										<div class="bg-gradient-to-br from-purple-50 to-white rounded-xl border border-purple-100 p-5">
											<h4 class="font-semibold text-purple-800 mb-3">震动上限</h4>
											<div class="flex items-baseline gap-2">
												<span class="text-3xl font-bold text-purple-600">{currentThreshold()!.vibrationMax}</span>
												<span class="text-gray-500 text-sm">mm/s</span>
											</div>
										</div>

										<div class="bg-gradient-to-br from-emerald-50 to-white rounded-xl border border-emerald-100 p-5">
											<h4 class="font-semibold text-emerald-800 mb-3">盐雾最大等级</h4>
											<div class="flex items-baseline gap-2">
												<span class="text-3xl font-bold text-emerald-600">{currentThreshold()!.saltFogMaxLevel}</span>
											</div>
										</div>
									</div>
								{:else}
									<div class="text-center py-8 text-gray-500">
										<p>暂无阈值配置，点击"编辑阈值"进行设置</p>
									</div>
								{/if}
							{:else}
								<div class="text-center py-12 text-gray-500">
									<p>请选择一个监测点查看阈值配置</p>
								</div>
							{/if}
						</div>

					{:else if activeTab === 'rectification'}
						<div class="space-y-4">
							<div class="flex flex-wrap justify-between items-center gap-3">
								<select
									bind:value={rectStatusFilter}
									class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
								>
									<option value="">全部状态</option>
									{#each RECTIFICATION_STATUS_OPTIONS as status}
										<option value={status}>{status}</option>
									{/each}
								</select>

								{#if canCreateTask && currentPoint()}
									<button
										on:click={openCreateTaskModal}
										class="inline-flex items-center gap-2 px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors text-sm font-medium"
									>
										<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
										</svg>
										派发整改任务
									</button>
								{/if}
							</div>

							<div class="bg-white border border-gray-200 rounded-xl overflow-hidden">
								{#if filteredTasks.length > 0}
									<div class="divide-y divide-gray-100">
										{#each filteredTasks as task}
											<div
												class="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
												on:click={() => openTaskDetail(task)}
											>
												<div class="flex items-start justify-between">
													<div class="flex-1 min-w-0">
														<div class="flex items-center gap-2 mb-1">
															<span class={getRectStatusClass(task.status)}>{task.status}</span>
															<span class={getRiskLevelClass(task.riskLevel)}>{task.riskLevel}</span>
															<h4 class="font-medium text-gray-800">{task.title}</h4>
														</div>
														<p class="text-sm text-gray-600 line-clamp-2">{task.description}</p>
														<div class="flex items-center gap-4 mt-2 text-xs text-gray-500">
															<span>监测点：{task.pointName}</span>
															<span>创建人：{task.createdBy}</span>
															{#if task.assigneeName}
																<span>负责人：{task.assigneeName}</span>
															{/if}
														</div>
													</div>
													<div class="text-right ml-4">
														<p class="text-xs text-gray-500">{task.createdAt}</p>
														{#if task.dueDate}
															<p class="text-xs text-amber-600 mt-1">截止：{task.dueDate}</p>
														{/if}
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
										<p>暂无整改任务</p>
									</div>
								{/if}
							</div>
						</div>

					{:else if activeTab === 'points'}
						<div class="space-y-4">
							<div class="flex justify-between items-center">
								<div class="relative">
									<input
										type="text"
										placeholder="搜索监测点..."
										bind:value={searchKeyword}
										class="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm w-64"
									/>
									<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
									</svg>
								</div>

								{#if canManagePoints()}
									<button
										on:click={() => openPointModal()}
										class="inline-flex items-center gap-2 px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors text-sm font-medium"
									>
										<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
										</svg>
										新增监测点
									</button>
								{/if}
							</div>

							<div class="bg-white border border-gray-200 rounded-xl overflow-hidden">
								{#if filteredPoints.length > 0}
									<table class="w-full">
										<thead class="bg-gray-50">
											<tr>
												<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">编号</th>
												<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名称</th>
												<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">类型</th>
												<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">位置</th>
												<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">藏品数</th>
												{#if canManagePoints()}
													<th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
												{/if}
											</tr>
										</thead>
										<tbody class="divide-y divide-gray-200">
											{#each filteredPoints as point}
												<tr class="hover:bg-gray-50">
													<td class="px-4 py-3 text-sm font-mono text-amber-700">{point.code}</td>
													<td class="px-4 py-3 text-sm font-medium text-gray-900">{point.name}</td>
													<td class="px-4 py-3 text-sm text-gray-600">{point.type}</td>
													<td class="px-4 py-3 text-sm text-gray-600">{point.location}</td>
													<td class="px-4 py-3 text-sm text-gray-600">{point.beaconLightIds.length} 件</td>
													{#if canManagePoints()}
														<td class="px-4 py-3 text-right text-sm">
															<button
																on:click={(e) => { e.stopPropagation(); openPointModal(point); }}
																class="text-amber-600 hover:text-amber-800 mr-3"
															>
																编辑
															</button>
															<button
																on:click={(e) => { e.stopPropagation(); handleDeletePoint(point); }}
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
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
										</svg>
										<p>暂无监测点</p>
									</div>
								{/if}
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>

	{#if showRecordModal && currentPoint()}
		<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" on:click={() => (showRecordModal = false)}>
			<div class="bg-white rounded-xl shadow-xl max-w-lg w-full" on:click|stopPropagation>
				<div class="px-6 py-4 border-b border-gray-200">
					<h3 class="text-lg font-semibold text-gray-800">录入环境监测数据</h3>
					<p class="text-sm text-gray-500 mt-1">{currentPoint()!.name}</p>
				</div>
				<form on:submit|preventDefault={handleAddRecord} class="p-6 space-y-4">
					{#if recordErrors.length > 0}
						<div class="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
							{#each recordErrors as err}
								<p>{err}</p>
							{/each}
						</div>
					{/if}

					<div class="grid grid-cols-2 gap-4">
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">温度 (°C) *</label>
							<input
								type="number"
								bind:value={recordForm.temperature}
								step="0.1"
								class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
							/>
						</div>
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">湿度 (%) *</label>
							<input
								type="number"
								bind:value={recordForm.humidity}
								step="0.1"
								class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
							/>
						</div>
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">照度 (lux) *</label>
							<input
								type="number"
								bind:value={recordForm.illuminance}
								class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
							/>
						</div>
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">震动 (mm/s) *</label>
							<input
								type="number"
								bind:value={recordForm.vibration}
								step="0.01"
								class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
							/>
						</div>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">盐雾等级 *</label>
						<select
							bind:value={recordForm.saltFogLevel}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
						>
							{#each SALT_FOG_LEVEL_OPTIONS as level}
								<option value={level}>{level}</option>
							{/each}
						</select>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">采集时间 *</label>
						<input
							type="datetime-local"
							bind:value={recordForm.collectedAt}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
						/>
					</div>

					<div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
						<button
							type="button"
							on:click={() => (showRecordModal = false)}
							class="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
						>
							取消
						</button>
						<button
							type="submit"
							class="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
						>
							确认录入
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	{#if showAlertModal && selectedAlert}
		<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" on:click={() => (showAlertModal = false)}>
			<div class="bg-white rounded-xl shadow-xl max-w-lg w-full" on:click|stopPropagation>
				<div class="px-6 py-4 border-b border-gray-200">
					<div class="flex items-center justify-between">
						<h3 class="text-lg font-semibold text-gray-800">告警详情</h3>
						<span class={getAlertStatusClass(selectedAlert.status)}>{selectedAlert.status}</span>
					</div>
				</div>
				<div class="p-6 space-y-4">
					<div class="grid grid-cols-2 gap-4">
						<div>
							<p class="text-xs text-gray-500">告警类型</p>
							<p class="font-medium text-gray-800">{selectedAlert.alertType}</p>
						</div>
						<div>
							<p class="text-xs text-gray-500">风险等级</p>
							<span class={getRiskLevelClass(selectedAlert.alertLevel)}>{selectedAlert.alertLevel}</span>
						</div>
						<div>
							<p class="text-xs text-gray-500">监测点</p>
							<p class="font-medium text-gray-800">{selectedAlert.pointName}</p>
						</div>
						<div>
							<p class="text-xs text-gray-500">创建时间</p>
							<p class="font-medium text-gray-800 text-sm">{selectedAlert.createdAt}</p>
						</div>
						<div>
							<p class="text-xs text-gray-500">阈值</p>
							<p class="font-medium text-gray-800">{selectedAlert.threshold}</p>
						</div>
						<div>
							<p class="text-xs text-gray-500">实际值</p>
							<p class="font-medium text-red-600">{selectedAlert.actualValue}</p>
						</div>
					</div>

					<div>
						<p class="text-xs text-gray-500 mb-1">告警描述</p>
						<p class="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedAlert.description}</p>
					</div>

					{#if selectedAlert.confirmedBy}
						<div>
							<p class="text-xs text-gray-500 mb-1">处理信息</p>
							<div class="bg-gray-50 p-3 rounded-lg text-sm">
								<p>处理人：{selectedAlert.confirmedBy}</p>
								<p>处理时间：{selectedAlert.confirmedAt}</p>
								{#if selectedAlert.confirmRemark}
									<p>备注：{selectedAlert.confirmRemark}</p>
								{/if}
							</div>
						</div>
					{/if}

					{#if canConfirmAlert && selectedAlert.status !== '已确认' && selectedAlert.status !== '已忽略'}
						<div class="border-t border-gray-200 pt-4 space-y-3">
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-1">处理状态</label>
								<select
									bind:value={alertForm.status}
									class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
								>
									<option value="处理中">处理中</option>
									<option value="已确认">已确认</option>
									<option value="已忽略">已忽略</option>
								</select>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-1">处理备注</label>
								<textarea
									bind:value={alertForm.remark}
									rows="3"
									placeholder="请输入处理备注..."
									class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none"
								/>
							</div>
							<div class="flex justify-end gap-3">
								<button
									type="button"
									on:click={() => (showAlertModal = false)}
									class="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
								>
									取消
								</button>
								<button
									on:click={handleAlertConfirm}
									class="px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors font-medium"
								>
									确认处理
								</button>
							</div>
						</div>
					{/if}

					{#if selectedAlert.status === '已确认' || selectedAlert.status === '已忽略'}
						<div class="flex justify-end">
							<button
								on:click={() => (showAlertModal = false)}
								class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
							>
								关闭
							</button>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	{#if showThresholdModal && currentPoint()}
		<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" on:click={() => (showThresholdModal = false)}>
			<div class="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" on:click|stopPropagation>
				<div class="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
					<h3 class="text-lg font-semibold text-gray-800">编辑阈值配置</h3>
					<p class="text-sm text-gray-500 mt-1">{currentPoint()!.name}</p>
				</div>
				<form on:submit|preventDefault={handleSaveThreshold} class="p-6 space-y-4">
					{#if thresholdErrors.length > 0}
						<div class="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
							{#each thresholdErrors as err}
								<p>{err}</p>
							{/each}
						</div>
					{/if}

					<div class="bg-red-50 rounded-lg p-4">
						<h4 class="font-medium text-red-800 mb-3">温度阈值 (°C)</h4>
						<div class="grid grid-cols-2 gap-4">
							<div>
								<label class="block text-sm text-gray-600 mb-1">最低值</label>
								<input
									type="number"
									bind:value={thresholdForm.temperatureMin}
									step="0.1"
									class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
								/>
							</div>
							<div>
								<label class="block text-sm text-gray-600 mb-1">最高值</label>
								<input
									type="number"
									bind:value={thresholdForm.temperatureMax}
									step="0.1"
									class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
								/>
							</div>
						</div>
					</div>

					<div class="bg-blue-50 rounded-lg p-4">
						<h4 class="font-medium text-blue-800 mb-3">湿度阈值 (%)</h4>
						<div class="grid grid-cols-2 gap-4">
							<div>
								<label class="block text-sm text-gray-600 mb-1">最低值</label>
								<input
									type="number"
									bind:value={thresholdForm.humidityMin}
									step="0.1"
									class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
								/>
							</div>
							<div>
								<label class="block text-sm text-gray-600 mb-1">最高值</label>
								<input
									type="number"
									bind:value={thresholdForm.humidityMax}
									step="0.1"
									class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
								/>
							</div>
						</div>
					</div>

					<div class="bg-amber-50 rounded-lg p-4">
						<h4 class="font-medium text-amber-800 mb-3">照度上限 (lux)</h4>
						<input
							type="number"
							bind:value={thresholdForm.illuminanceMax}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
						/>
					</div>

					<div class="bg-purple-50 rounded-lg p-4">
						<h4 class="font-medium text-purple-800 mb-3">震动上限 (mm/s)</h4>
						<input
							type="number"
							bind:value={thresholdForm.vibrationMax}
							step="0.01"
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
						/>
					</div>

					<div class="bg-emerald-50 rounded-lg p-4">
						<h4 class="font-medium text-emerald-800 mb-3">盐雾最大等级</h4>
						<select
							bind:value={thresholdForm.saltFogMaxLevel}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
						>
							{#each SALT_FOG_LEVEL_OPTIONS as level}
								<option value={level}>{level}</option>
							{/each}
						</select>
					</div>

					<div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
						<button
							type="button"
							on:click={() => (showThresholdModal = false)}
							class="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
						>
							取消
						</button>
						<button
							type="submit"
							class="px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors font-medium"
						>
							保存配置
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	{#if showRectificationModal && currentPoint()}
		<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" on:click={() => (showRectificationModal = false)}>
			<div class="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" on:click|stopPropagation>
				<div class="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
					<h3 class="text-lg font-semibold text-gray-800">派发整改任务</h3>
					<p class="text-sm text-gray-500 mt-1">{currentPoint()!.name}</p>
				</div>
				<form on:submit|preventDefault={handleCreateTask} class="p-6 space-y-4">
					{#if rectificationErrors.length > 0}
						<div class="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
							{#each rectificationErrors as err}
								<p>{err}</p>
							{/each}
						</div>
					{/if}

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">任务标题 *</label>
						<input
							type="text"
							bind:value={rectificationForm.title}
							placeholder="请输入任务标题"
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
						/>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">任务描述 *</label>
						<textarea
							bind:value={rectificationForm.description}
							rows="3"
							placeholder="请详细描述整改要求..."
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none"
						/>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">风险等级</label>
							<select
								bind:value={rectificationForm.riskLevel}
								class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
							>
								{#each RISK_LEVEL_OPTIONS as level}
									<option value={level}>{level}</option>
								{/each}
							</select>
						</div>
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">截止日期</label>
							<input
								type="date"
								bind:value={rectificationForm.dueDate}
								class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
							/>
						</div>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">负责人</label>
						<select
							bind:value={rectificationForm.assigneeId}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
						>
							<option value="">请选择负责人</option>
							{#each $users as user}
								{#if user.role === '保管员' || user.role === '修复师' || user.role === '馆区管理员'}
									<option value={user.id}>{user.fullName} ({user.role})</option>
								{/if}
							{/each}
						</select>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">备注</label>
						<textarea
							bind:value={rectificationForm.remark}
							rows="2"
							placeholder="其他补充说明..."
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none"
						/>
					</div>

					<div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
						<button
							type="button"
							on:click={() => (showRectificationModal = false)}
							class="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
						>
							取消
						</button>
						<button
							type="submit"
							class="px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors font-medium"
						>
							派发任务
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	{#if showPointModal}
		<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" on:click={() => (showPointModal = false)}>
			<div class="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" on:click|stopPropagation>
				<div class="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
					<h3 class="text-lg font-semibold text-gray-800">{isEditingPoint ? '编辑监测点' : '新增监测点'}</h3>
				</div>
				<form on:submit|preventDefault={handleSavePoint} class="p-6 space-y-4">
					{#if pointErrors.length > 0}
						<div class="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
							{#each pointErrors as err}
								<p>{err}</p>
							{/each}
						</div>
					{/if}

					<div class="grid grid-cols-2 gap-4">
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">监测点编号 *</label>
							<input
								type="text"
								bind:value={pointForm.code}
								placeholder="如：ENV-001"
								class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
							/>
						</div>
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">监测点类型 *</label>
							<select
								bind:value={pointForm.type}
								class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
							>
								{#each ENV_LOCATION_TYPE_OPTIONS as type}
									<option value={type}>{type}</option>
								{/each}
							</select>
						</div>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">监测点名称 *</label>
						<input
							type="text"
							bind:value={pointForm.name}
							placeholder="如：一号展厅展柜A"
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
						/>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">位置描述 *</label>
						<input
							type="text"
							bind:value={pointForm.location}
							placeholder="如：一层东侧展厅"
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
						/>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">关联航标灯藏品</label>
						<div class="border border-gray-300 rounded-lg max-h-48 overflow-y-auto">
							{#each availableLights() as light}
								<label class="flex items-center p-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0">
									<input
										type="checkbox"
										value={light.id}
										checked={pointForm.beaconLightIds.includes(light.id)}
										on:change={(e) => {
											const id = (e.target as HTMLInputElement).value;
											if ((e.target as HTMLInputElement).checked) {
												pointForm.beaconLightIds = [...pointForm.beaconLightIds, id];
											} else {
												pointForm.beaconLightIds = pointForm.beaconLightIds.filter(x => x !== id);
											}
										}}
										class="mr-3 w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
									/>
									<div>
										<span class="text-sm font-medium text-gray-800">{light.name}</span>
										<span class="text-xs text-gray-500 ml-2 font-mono">{light.code}</span>
									</div>
								</label>
							{/each}
							{#if availableLights().length === 0}
								<p class="p-4 text-center text-gray-500 text-sm">暂无可用藏品</p>
							{/if}
						</div>
						<p class="text-xs text-gray-500 mt-1">已选择 {pointForm.beaconLightIds.length} 件藏品</p>
					</div>

					<div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
						<button
							type="button"
							on:click={() => (showPointModal = false)}
							class="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
						>
							取消
						</button>
						<button
							type="submit"
							class="px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors font-medium"
						>
							{isEditingPoint ? '保存修改' : '创建监测点'}
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	{#if showDetailModal && selectedTask}
		<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" on:click={() => (showDetailModal = false)}>
			<div class="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" on:click|stopPropagation>
				<div class="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
					<div class="flex items-center justify-between">
						<h3 class="text-lg font-semibold text-gray-800">整改任务详情</h3>
						<span class={getRectStatusClass(selectedTask.status)}>{selectedTask.status}</span>
					</div>
				</div>
				<div class="p-6 space-y-4">
					<div>
						<h4 class="font-medium text-gray-800 text-lg">{selectedTask.title}</h4>
						<span class={getRiskLevelClass(selectedTask.riskLevel)}>{selectedTask.riskLevel}</span>
					</div>

					<div class="grid grid-cols-2 gap-4 text-sm">
						<div>
							<p class="text-gray-500">监测点</p>
							<p class="font-medium text-gray-800">{selectedTask.pointName}</p>
						</div>
						<div>
							<p class="text-gray-500">创建人</p>
							<p class="font-medium text-gray-800">{selectedTask.createdBy}</p>
						</div>
						<div>
							<p class="text-gray-500">创建时间</p>
							<p class="font-medium text-gray-800">{selectedTask.createdAt}</p>
						</div>
						{#if selectedTask.assigneeName}
							<div>
								<p class="text-gray-500">负责人</p>
								<p class="font-medium text-gray-800">{selectedTask.assigneeName}</p>
							</div>
						{/if}
						{#if selectedTask.dueDate}
							<div>
								<p class="text-gray-500">截止日期</p>
								<p class="font-medium text-amber-700">{selectedTask.dueDate}</p>
							</div>
						{/if}
						{#if selectedTask.completeDate}
							<div>
								<p class="text-gray-500">完成日期</p>
								<p class="font-medium text-green-700">{selectedTask.completeDate}</p>
							</div>
						{/if}
					</div>

					<div>
						<p class="text-sm text-gray-500 mb-1">任务描述</p>
						<p class="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">{selectedTask.description}</p>
					</div>

					{#if selectedTask.rectificationResult}
						<div>
							<p class="text-sm text-gray-500 mb-1">整改结果</p>
							<p class="text-sm text-gray-700 bg-green-50 p-3 rounded-lg whitespace-pre-wrap">{selectedTask.rectificationResult}</p>
						</div>
					{/if}

					{#if selectedTask.acceptanceResult}
						<div>
							<p class="text-sm text-gray-500 mb-1">验收结果</p>
							<p class="text-sm text-gray-700 bg-blue-50 p-3 rounded-lg whitespace-pre-wrap">{selectedTask.acceptanceResult}</p>
						</div>
					{/if}

					{#if selectedTask.remark}
						<div>
							<p class="text-sm text-gray-500 mb-1">备注</p>
							<p class="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">{selectedTask.remark}</p>
						</div>
					{/if}

					<div class="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
						{#if selectedTask.status === '待整改' && canDoTask}
							<button
								on:click={handleStartTask}
								class="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
							>
								开始整改
							</button>
						{/if}

						{#if selectedTask.status === '整改中' && canDoTask}
							<button
								on:click={handleCompleteTask}
								class="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
							>
								提交整改
							</button>
						{/if}

						{#if selectedTask.status === '待验收' && canAcceptTask()}
							<button
								on:click={handleAcceptTask}
								class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
							>
								验收通过
							</button>
						{/if}

						{#if (selectedTask.status === '待整改' || selectedTask.status === '整改中') && canCreateTask}
							<button
								on:click={handleCancelTask}
								class="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
							>
								取消任务
							</button>
						{/if}

						<button
							on:click={() => (showDetailModal = false)}
							class="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors ml-auto"
						>
							关闭
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>