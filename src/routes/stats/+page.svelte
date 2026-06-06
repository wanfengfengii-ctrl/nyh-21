<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Chart, registerables } from 'chart.js';
	import { beaconLights, maintenanceRecords } from '$lib/stores';
	import type { BeaconLight, MaintenanceRecord } from '$lib/types';

	Chart.register(...registerables);

	let materialChartEl: HTMLCanvasElement;
	let exhibitionChartEl: HTMLCanvasElement;
	let monthlyChartEl: HTMLCanvasElement;

	let materialChart: Chart | null = null;
	let exhibitionChart: Chart | null = null;
	let monthlyChart: Chart | null = null;

	let totalCount = $derived($beaconLights.length);
	let onExhibition = $derived($beaconLights.filter(l => l.exhibitionStatus === '展出中').length);
	let canExhibit = $derived($beaconLights.filter(l => l.exhibitionStatus === '可展出').length);
	let underMaintenance = $derived($beaconLights.filter(l => l.exhibitionStatus === '维护中').length);
	let inStorage = $derived($beaconLights.filter(l => l.exhibitionStatus === '库房存储').length);
	let cannotExhibit = $derived($beaconLights.filter(l => l.exhibitionStatus === '不可展出').length);
	let maintenanceCount = $derived($maintenanceRecords.length);

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
		const now = new Date();
		const currentYear = now.getFullYear();
		
		for (let i = 0; i < 12; i++) {
			const month = String(i + 1).padStart(2, '0');
			monthMap[`${currentYear}-${month}`] = 0;
		}

		records.forEach(r => {
			if (r.date.startsWith(String(currentYear))) {
				const key = r.date.slice(0, 7);
				monthMap[key] = (monthMap[key] || 0) + 1;
			}
		});

		const sortedKeys = Object.keys(monthMap).sort();
		const labels = sortedKeys.map(k => {
			const [, m] = k.split('-');
			return `${parseInt(m)}月`;
		});
		const data = sortedKeys.map(k => monthMap[k]);

		return { labels, data };
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
	}

	function destroyCharts() {
		materialChart?.destroy();
		exhibitionChart?.destroy();
		monthlyChart?.destroy();
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
</script>

<div class="space-y-6">
	<div>
		<h2 class="text-2xl font-bold text-amber-900">统计视图</h2>
		<p class="text-gray-600 mt-1">航标灯收藏与维护数据概览</p>
	</div>

	<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
		<div class="bg-white rounded-xl shadow-md p-5 border-l-4 border-amber-600">
			<p class="text-gray-500 text-sm">藏品总数</p>
			<p class="text-3xl font-bold text-amber-900 mt-2">{totalCount}</p>
			<p class="text-xs text-gray-400 mt-1">件航标灯</p>
		</div>
		<div class="bg-white rounded-xl shadow-md p-5 border-l-4 border-emerald-500">
			<p class="text-gray-500 text-sm">展出中</p>
			<p class="text-3xl font-bold text-emerald-700 mt-2">{onExhibition}</p>
			<p class="text-xs text-gray-400 mt-1">占比 {totalCount ? Math.round(onExhibition / totalCount * 100) : 0}%</p>
		</div>
		<div class="bg-white rounded-xl shadow-md p-5 border-l-4 border-amber-500">
			<p class="text-gray-500 text-sm">维护中</p>
			<p class="text-3xl font-bold text-amber-700 mt-2">{underMaintenance}</p>
			<p class="text-xs text-gray-400 mt-1">占比 {totalCount ? Math.round(underMaintenance / totalCount * 100) : 0}%</p>
		</div>
		<div class="bg-white rounded-xl shadow-md p-5 border-l-4 border-gray-400">
			<p class="text-gray-500 text-sm">累计维护</p>
			<p class="text-3xl font-bold text-gray-700 mt-2">{maintenanceCount}</p>
			<p class="text-xs text-gray-400 mt-1">次记录</p>
		</div>
	</div>

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

	<div class="bg-white rounded-xl shadow-md p-6">
		<div class="h-80">
			<canvas bind:this={monthlyChartEl}></canvas>
		</div>
	</div>

	<div class="bg-white rounded-xl shadow-md p-6">
		<h3 class="text-lg font-semibold text-amber-900 mb-4">展陈状态详情</h3>
		<div class="grid grid-cols-2 md:grid-cols-5 gap-4">
			<div class="text-center p-4 bg-emerald-50 rounded-lg">
				<p class="text-2xl font-bold text-emerald-700">{onExhibition}</p>
				<p class="text-sm text-emerald-600 mt-1">展出中</p>
			</div>
			<div class="text-center p-4 bg-blue-50 rounded-lg">
				<p class="text-2xl font-bold text-blue-700">{canExhibit}</p>
				<p class="text-sm text-blue-600 mt-1">可展出</p>
			</div>
			<div class="text-center p-4 bg-amber-50 rounded-lg">
				<p class="text-2xl font-bold text-amber-700">{underMaintenance}</p>
				<p class="text-sm text-amber-600 mt-1">维护中</p>
			</div>
			<div class="text-center p-4 bg-gray-50 rounded-lg">
				<p class="text-2xl font-bold text-gray-700">{inStorage}</p>
				<p class="text-sm text-gray-600 mt-1">库房存储</p>
			</div>
			<div class="text-center p-4 bg-red-50 rounded-lg">
				<p class="text-2xl font-bold text-red-700">{cannotExhibit}</p>
				<p class="text-sm text-red-600 mt-1">不可展出</p>
			</div>
		</div>
	</div>
</div>
