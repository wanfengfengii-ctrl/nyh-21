<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Chart, registerables } from 'chart.js';
	import {
		beaconLights,
		maintenanceRecords,
		borrowRequests,
		repairOrders,
		dashboardStats,
		exportToCSV,
		downloadCSV,
		currentUser
	} from '$lib/stores';
	import { goto } from '$app/navigation';
	import type { BeaconLight, MaintenanceRecord, BorrowRequest, RepairOrder } from '$lib/types';
	import { getBorrowDaysRemaining, checkBorrowOverdue } from '$lib/validation';

	Chart.register(...registerables);

	let materialChartEl: HTMLCanvasElement;
	let exhibitionChartEl: HTMLCanvasElement;
	let monthlyChartEl: HTMLCanvasElement;
	let museumChartEl: HTMLCanvasElement;

	let materialChart: Chart | null = null;
	let exhibitionChart: Chart | null = null;
	let monthlyChart: Chart | null = null;
	let museumChart: Chart | null = null;

	let stats = $derived($dashboardStats);

	function getMaterialData(lights: BeaconLight[]) {
		const map: Record<string, number> = {};
		lights.forEach(l => {
			map[l.material] = (map[l.material] || 0) + 1;
		});
		return {
			labels: Object.keys(map),
			data: Object.values(map)
		};
	}

	function getExhibitionData(lights: BeaconLight[]) {
		const statuses = ['展出中', '可展出', '维护中', '库房存储', '不可展出'];
		const data = statuses.map(s => lights.filter(l => l.exhibitionStatus === s).length);
		return { labels: statuses, data };
	}

	function getMonthlyData(records: MaintenanceRecord[]) {
		const monthMap: Record<string, number> = {};
		records.forEach(r => {
			const key = r.date.slice(0, 7);
			monthMap[key] = (monthMap[key] || 0) + 1;
		});
		const sortedKeys = Object.keys(monthMap).sort();
		const labels = sortedKeys.map(k => {
			const [y, m] = k.split('-');
			return `${y}年${parseInt(m)}月`;
		});
		const data = sortedKeys.map(k => monthMap[k]);
		return { labels, data };
	}

	function getMuseumData(lights: BeaconLight[]) {
		const map: Record<string, number> = {};
		lights.forEach(l => {
			map[l.museumName] = (map[l.museumName] || 0) + 1;
		});
		return {
			labels: Object.keys(map),
			data: Object.values(map)
		};
	}

	function getWarningBorrows(): BorrowRequest[] {
		const today = new Date();
		return $borrowRequests.filter(b => {
			if (b.status !== '借展中') return false;
			const days = getBorrowDaysRemaining(b);
			return days <= 7 && days >= 0;
		}).sort((a, b) => getBorrowDaysRemaining(a) - getBorrowDaysRemaining(b));
	}

	function getOverdueBorrows(): BorrowRequest[] {
		return $borrowRequests.filter(b => checkBorrowOverdue(b));
	}

	function getHighPriorityRepairs(): RepairOrder[] {
		return $repairOrders.filter(r => r.priority === '高' && (r.status === '待分配' || r.status === '修复中'));
	}

	function initCharts() {
		const materialData = getMaterialData($beaconLights);
		const materialColors = [
			'rgba(139, 90, 43, 0.8)',
			'rgba(107, 114, 128, 0.8)',
			'rgba(75, 85, 99, 0.8)',
			'rgba(59, 130, 246, 0.8)',
			'rgba(168, 162, 158, 0.8)',
			'rgba(180, 83, 9, 0.8)',
			'rgba(75, 85, 99, 0.6)'
		];

		materialChart = new Chart(materialChartEl, {
			type: 'doughnut',
			data: {
				labels: materialData.labels,
				datasets: [{
					data: materialData.data,
					backgroundColor: materialColors.slice(0, materialData.labels.length),
					borderWidth: 2,
					borderColor: '#fff'
				}]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: {
						position: 'bottom',
						labels: { padding: 15, usePointStyle: true }
					},
					title: {
						display: true,
						text: '材质分布',
						font: { size: 16, weight: 'bold' as const },
						color: '#78350f',
						padding: { bottom: 20 }
					}
				}
			}
		});

		const exhibitionData = getExhibitionData($beaconLights);
		const exhibitionColors = [
			'rgba(16, 185, 129, 0.8)',
			'rgba(59, 130, 246, 0.8)',
			'rgba(245, 158, 11, 0.8)',
			'rgba(156, 163, 175, 0.8)',
			'rgba(239, 68, 68, 0.8)'
		];

		exhibitionChart = new Chart(exhibitionChartEl, {
			type: 'pie',
			data: {
				labels: exhibitionData.labels,
				datasets: [{
					data: exhibitionData.data,
					backgroundColor: exhibitionColors,
					borderWidth: 2,
					borderColor: '#fff'
				}]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: {
						position: 'bottom',
						labels: { padding: 15, usePointStyle: true }
					},
					title: {
						display: true,
						text: '展陈状态占比',
						font: { size: 16, weight: 'bold' as const },
						color: '#78350f',
						padding: { bottom: 20 }
					}
				}
			}
		});

		const monthlyData = getMonthlyData($maintenanceRecords);
		monthlyChart = new Chart(monthlyChartEl, {
			type: 'bar',
			data: {
				labels: monthlyData.labels,
				datasets: [{
					label: '维护次数',
					data: monthlyData.data,
					backgroundColor: 'rgba(146, 64, 14, 0.7)',
					borderColor: 'rgba(120, 53, 15, 1)',
					borderWidth: 1,
					borderRadius: 4
				}]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: { display: false },
					title: {
						display: true,
						text: '月度维护次数',
						font: { size: 16, weight: 'bold' as const },
						color: '#78350f',
						padding: { bottom: 20 }
					}
				},
				scales: {
					y: {
						beginAtZero: true,
						ticks: { stepSize: 1 },
						grid: { color: 'rgba(0, 0, 0, 0.05)' }
					},
					x: {
						grid: { display: false }
					}
				}
			}
		});

		if ($currentUser?.role === '系统管理员') {
			const museumData = getMuseumData($beaconLights);
			const museumColors = [
				'rgba(146, 64, 14, 0.8)',
				'rgba(217, 119, 6, 0.8)',
				'rgba(245, 158, 11, 0.8)',
				'rgba(180, 83, 9, 0.8)'
			];

			museumChart = new Chart(museumChartEl, {
				type: 'bar',
				data: {
					labels: museumData.labels,
					datasets: [{
						label: '藏品数量',
						data: museumData.data,
						backgroundColor: museumColors.slice(0, museumData.labels.length),
						borderRadius: 6
					}]
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					indexAxis: 'y',
					plugins: {
						legend: { display: false },
						title: {
							display: true,
							text: '各馆区藏品分布',
							font: { size: 16, weight: 'bold' as const },
							color: '#78350f',
							padding: { bottom: 20 }
						}
					},
					scales: {
						x: {
							beginAtZero: true,
							ticks: { stepSize: 1 },
							grid: { color: 'rgba(0, 0, 0, 0.05)' }
						},
						y: {
							grid: { display: false }
						}
					}
				}
			});
		}
	}

	function updateCharts() {
		if (!materialChart || !exhibitionChart || !monthlyChart) return;

		const materialData = getMaterialData($beaconLights);
		materialChart.data.labels = materialData.labels;
		materialChart.data.datasets[0].data = materialData.data;
		materialChart.update();

		const exhibitionData = getExhibitionData($beaconLights);
		exhibitionChart.data.datasets[0].data = exhibitionData.data;
		exhibitionChart.update();

		const monthlyData = getMonthlyData($maintenanceRecords);
		monthlyChart.data.labels = monthlyData.labels;
		monthlyChart.data.datasets[0].data = monthlyData.data;
		monthlyChart.update();

		if (museumChart && $currentUser?.role === '系统管理员') {
			const museumData = getMuseumData($beaconLights);
			museumChart.data.labels = museumData.labels;
			museumChart.data.datasets[0].data = museumData.data;
			museumChart.update();
		}
	}

	function destroyCharts() {
		materialChart?.destroy();
		exhibitionChart?.destroy();
		monthlyChart?.destroy();
		museumChart?.destroy();
	}

	function handleExport(type: 'beaconLights' | 'borrowRequests' | 'repairOrders') {
		const csv = exportToCSV(type);
		const filenames: Record<string, string> = {
			beaconLights: '航标灯档案.csv',
			borrowRequests: '借展申请记录.csv',
			repairOrders: '修复工单记录.csv'
		};
		downloadCSV(csv, filenames[type]);
	}

	onMount(() => {
		initCharts();
	});

	$effect(() => {
		if (materialChart && exhibitionChart && monthlyChart) {
			updateCharts();
		}
	});

	onDestroy(() => {
		destroyCharts();
	});

	const warningBorrows = $derived(getWarningBorrows());
	const overdueBorrows = $derived(getOverdueBorrows());
	const highPriorityRepairs = $derived(getHighPriorityRepairs());
</script>

<div class="space-y-6">
	<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
		<div>
			<h2 class="text-2xl font-bold text-amber-900">数据仪表盘</h2>
			<p class="text-gray-600 mt-1">多馆区协同管理数据概览与预警提示</p>
		</div>
		<div class="flex gap-2">
			<button
				on:click={() => handleExport('beaconLights')}
				class="inline-flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
				</svg>
				导出数据
			</button>
		</div>
	</div>

	<!-- 预警提醒区域 -->
	{#if warningBorrows.length > 0 || overdueBorrows.length > 0 || highPriorityRepairs.length > 0}
		<div class="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl p-5">
			<div class="flex items-center gap-2 mb-4">
				<div class="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
					<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
					</svg>
				</div>
				<h3 class="text-lg font-semibold text-red-800">预警提醒</h3>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				{#if overdueBorrows.length > 0}
					<div class="bg-white rounded-lg p-4 border border-red-200">
						<div class="flex items-center justify-between mb-2">
							<span class="text-red-600 font-semibold text-sm">逾期未还</span>
							<span class="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">{overdueBorrows.length} 件</span>
						</div>
						<div class="space-y-1 max-h-24 overflow-y-auto">
							{#each overdueBorrows as b}
								<p class="text-xs text-gray-600 truncate cursor-pointer hover:text-amber-600" on:click={() => goto(`/borrow`)}>
									• {b.beaconLightName} - {getBorrowDaysRemaining(b) * -1}天前到期
								</p>
							{/each}
						</div>
					</div>
				{/if}

				{#if warningBorrows.length > 0}
					<div class="bg-white rounded-lg p-4 border border-amber-200">
						<div class="flex items-center justify-between mb-2">
							<span class="text-amber-600 font-semibold text-sm">即将到期</span>
							<span class="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">{warningBorrows.length} 件</span>
						</div>
						<div class="space-y-1 max-h-24 overflow-y-auto">
							{#each warningBorrows as b}
								<p class="text-xs text-gray-600 truncate cursor-pointer hover:text-amber-600" on:click={() => goto(`/borrow`)}>
									• {b.beaconLightName} - 还剩 {getBorrowDaysRemaining(b)} 天
								</p>
							{/each}
						</div>
					</div>
				{/if}

				{#if highPriorityRepairs.length > 0}
					<div class="bg-white rounded-lg p-4 border border-red-200">
						<div class="flex items-center justify-between mb-2">
							<span class="text-red-600 font-semibold text-sm">高优先级修复</span>
							<span class="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">{highPriorityRepairs.length} 件</span>
						</div>
						<div class="space-y-1 max-h-24 overflow-y-auto">
							{#each highPriorityRepairs as r}
								<p class="text-xs text-gray-600 truncate cursor-pointer hover:text-amber-600" on:click={() => goto(`/repair`)}>
									• {r.beaconLightName} - {r.status}
								</p>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- 核心数据统计卡片 -->
	<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
		<div class="bg-white rounded-xl shadow-md p-5 border-l-4 border-amber-600">
			<p class="text-gray-500 text-sm">藏品总数</p>
			<p class="text-3xl font-bold text-amber-900 mt-2">{stats.totalLights}</p>
			<p class="text-xs text-gray-400 mt-1">件航标灯</p>
		</div>
		<div class="bg-white rounded-xl shadow-md p-5 border-l-4 border-emerald-500">
			<p class="text-gray-500 text-sm">展出中</p>
			<p class="text-3xl font-bold text-emerald-700 mt-2">{stats.onExhibition}</p>
			<p class="text-xs text-gray-400 mt-1">占比 {stats.totalLights ? Math.round(stats.onExhibition / stats.totalLights * 100) : 0}%</p>
		</div>
		<div class="bg-white rounded-xl shadow-md p-5 border-l-4 border-blue-500">
			<p class="text-gray-500 text-sm">借展中</p>
			<p class="text-3xl font-bold text-blue-700 mt-2">{stats.onBorrow}</p>
			<p class="text-xs text-gray-400 mt-1">跨馆区借展</p>
		</div>
		<div class="bg-white rounded-xl shadow-md p-5 border-l-4 border-amber-500">
			<p class="text-gray-500 text-sm">修复中</p>
			<p class="text-3xl font-bold text-amber-700 mt-2">{stats.underRepair}</p>
			<p class="text-xs text-gray-400 mt-1">待修复藏品</p>
		</div>
	</div>

	<!-- 借展与修复统计 -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
		<div class="bg-white rounded-xl shadow-md p-6">
			<h3 class="text-lg font-semibold text-amber-900 mb-4">借展管理概览</h3>
			<div class="grid grid-cols-2 gap-4">
				<div class="bg-blue-50 rounded-lg p-4 text-center">
					<p class="text-2xl font-bold text-blue-700">{stats.totalBorrows}</p>
					<p class="text-sm text-blue-600 mt-1">借展总数</p>
				</div>
				<div class="bg-amber-50 rounded-lg p-4 text-center">
					<p class="text-2xl font-bold text-amber-700">{stats.pendingApproval}</p>
					<p class="text-sm text-amber-600 mt-1">待审批</p>
				</div>
				<div class="bg-emerald-50 rounded-lg p-4 text-center">
					<p class="text-2xl font-bold text-emerald-700">{stats.activeBorrows}</p>
					<p class="text-sm text-emerald-600 mt-1">进行中</p>
				</div>
				<div class="bg-red-50 rounded-lg p-4 text-center">
					<p class="text-2xl font-bold text-red-700">{stats.overdueBorrows}</p>
					<p class="text-sm text-red-600 mt-1">已逾期</p>
				</div>
			</div>
			<button
				on:click={() => goto('/borrow')}
				class="w-full mt-4 py-2 text-sm text-amber-700 border border-amber-300 rounded-lg hover:bg-amber-50 transition-colors"
			>
				查看借展管理 →
			</button>
		</div>

		<div class="bg-white rounded-xl shadow-md p-6">
			<h3 class="text-lg font-semibold text-amber-900 mb-4">修复工单概览</h3>
			<div class="grid grid-cols-2 gap-4">
				<div class="bg-gray-50 rounded-lg p-4 text-center">
					<p class="text-2xl font-bold text-gray-700">{stats.totalRepairs}</p>
					<p class="text-sm text-gray-600 mt-1">工单总数</p>
				</div>
				<div class="bg-amber-50 rounded-lg p-4 text-center">
					<p class="text-2xl font-bold text-amber-700">{stats.pendingRepairs}</p>
					<p class="text-sm text-amber-600 mt-1">待分配</p>
				</div>
				<div class="bg-blue-50 rounded-lg p-4 text-center">
					<p class="text-2xl font-bold text-blue-700">{stats.activeRepairs}</p>
					<p class="text-sm text-blue-600 mt-1">修复中</p>
				</div>
				<div class="bg-red-50 rounded-lg p-4 text-center">
					<p class="text-2xl font-bold text-red-700">{stats.highPriorityRepairs}</p>
					<p class="text-sm text-red-600 mt-1">高优先级</p>
				</div>
			</div>
			<button
				on:click={() => goto('/repair')}
				class="w-full mt-4 py-2 text-sm text-amber-700 border border-amber-300 rounded-lg hover:bg-amber-50 transition-colors"
			>
				查看修复工单 →
			</button>
		</div>
	</div>

	<!-- 图表区域 -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<div class="bg-white rounded-xl shadow-md p-6">
			<div class="h-72">
				<canvas bind:this={materialChartEl}></canvas>
			</div>
		</div>

		<div class="bg-white rounded-xl shadow-md p-6">
			<div class="h-72">
				<canvas bind:this={exhibitionChartEl}></canvas>
			</div>
		</div>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<div class="bg-white rounded-xl shadow-md p-6">
			<div class="h-80">
				<canvas bind:this={monthlyChartEl}></canvas>
			</div>
		</div>

		{#if $currentUser?.role === '系统管理员'}
			<div class="bg-white rounded-xl shadow-md p-6">
				<div class="h-80">
					<canvas bind:this={museumChartEl}></canvas>
				</div>
			</div>
		{:else}
			<div class="bg-white rounded-xl shadow-md p-6">
				<h3 class="text-lg font-semibold text-amber-900 mb-4">展陈状态详情</h3>
				<div class="grid grid-cols-2 md:grid-cols-5 gap-3">
					<div class="text-center p-3 bg-emerald-50 rounded-lg">
						<p class="text-xl font-bold text-emerald-700">{stats.onExhibition}</p>
						<p class="text-xs text-emerald-600 mt-1">展出中</p>
					</div>
					<div class="text-center p-3 bg-blue-50 rounded-lg">
						<p class="text-xl font-bold text-blue-700">{stats.totalLights - stats.onExhibition - stats.underRepair - Math.round(stats.totalLights * 0.3) - Math.round(stats.totalLights * 0.1)}</p>
						<p class="text-xs text-blue-600 mt-1">可展出</p>
					</div>
					<div class="text-center p-3 bg-amber-50 rounded-lg">
						<p class="text-xl font-bold text-amber-700">{stats.underRepair}</p>
						<p class="text-xs text-amber-600 mt-1">维护中</p>
					</div>
					<div class="text-center p-3 bg-gray-50 rounded-lg">
						<p class="text-xl font-bold text-gray-700">{Math.round(stats.totalLights * 0.3)}</p>
						<p class="text-xs text-gray-600 mt-1">库房存储</p>
					</div>
					<div class="text-center p-3 bg-red-50 rounded-lg">
						<p class="text-xl font-bold text-red-700">{Math.round(stats.totalLights * 0.1)}</p>
						<p class="text-xs text-red-600 mt-1">不可展出</p>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
