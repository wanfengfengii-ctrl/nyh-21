<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { beaconLights, updateBeaconLight } from '$lib/stores';
	import { validateBeaconLight } from '$lib/validation';
	import {
		MATERIAL_OPTIONS,
		SEA_AREA_OPTIONS,
		LAMPSHADE_STATUS_OPTIONS,
		LIGHT_SOURCE_STATUS_OPTIONS,
		EXHIBITION_STATUS_OPTIONS
	} from '$lib/types';
	import type { BeaconLight } from '$lib/types';
	import { onMount } from 'svelte';

	let beaconId = '';
	let errors = $state<string[]>([]);
	let loaded = $state(false);

	let form = $state({
		code: '',
		name: '',
		manufactureYear: 0,
		material: '',
		originalSeaArea: '',
		lampshadeStatus: '完好' as BeaconLight['lampshadeStatus'],
		lightSourceStatus: '正常' as BeaconLight['lightSourceStatus'],
		exhibitionStatus: '库房存储' as BeaconLight['exhibitionStatus'],
		exhibitionLocation: ''
	});

	onMount(() => {
		const id = $page.params.id;
		if (!id) {
			goto('/');
			return;
		}
		beaconId = id;
		loadBeaconData();
	});

	function loadBeaconData() {
		let light: BeaconLight | undefined;
		beaconLights.subscribe((lights) => {
			light = lights.find((l) => l.id === beaconId);
		})();
		if (light) {
			form.code = light.code;
			form.name = light.name;
			form.manufactureYear = light.manufactureYear;
			form.material = light.material;
			form.originalSeaArea = light.originalSeaArea;
			form.lampshadeStatus = light.lampshadeStatus;
			form.lightSourceStatus = light.lightSourceStatus;
			form.exhibitionStatus = light.exhibitionStatus;
			form.exhibitionLocation = light.exhibitionLocation;
			loaded = true;
		} else {
			goto('/');
		}
	}

	function handleSubmit() {
		errors = [];
		
		let allLights: BeaconLight[] = [];
		beaconLights.subscribe((l) => { allLights = l; })();

		const result = validateBeaconLight(form, allLights, beaconId);
		
		if (!result.valid) {
			errors = result.errors;
			return;
		}

		updateBeaconLight(beaconId, form);
		goto(`/beacon/${beaconId}`);
	}

	function handleCancel() {
		goto(`/beacon/${beaconId}`);
	}

	function validateLampshadeExhibition() {
		if (form.lampshadeStatus === '破损' && form.exhibitionStatus === '可展出') {
			if (!errors.includes('灯罩破损时不能标记为可展出')) {
				errors = [...errors, '灯罩破损时不能标记为可展出'];
			}
		} else {
			errors = errors.filter((e) => e !== '灯罩破损时不能标记为可展出');
		}
	}
</script>

{#if loaded}
	<div class="max-w-3xl mx-auto">
		<div class="bg-white rounded-xl shadow-md overflow-hidden">
			<div class="bg-gradient-to-r from-amber-800 to-amber-700 px-6 py-4">
				<h2 class="text-xl font-bold text-white">编辑航标灯</h2>
			</div>

			<form onsubmit={handleSubmit} class="p-6 space-y-5">
				{#if errors.length > 0}
					<div class="bg-red-50 border border-red-200 rounded-lg p-4">
						<h3 class="text-red-800 font-medium mb-2">请修正以下错误：</h3>
						<ul class="list-disc list-inside text-red-600 text-sm space-y-1">
							{#each errors as error}
								<li>{error}</li>
							{/each}
						</ul>
					</div>
				{/if}

				<div class="grid grid-cols-1 md:grid-cols-2 gap-5">
					<div>
						<label for="edit-code" class="block text-sm font-medium text-gray-700 mb-1">
							航标灯编号 <span class="text-red-500">*</span>
						</label>
						<input
							id="edit-code"
							type="text"
							bind:value={form.code}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
						/>
					</div>

					<div>
						<label for="edit-name" class="block text-sm font-medium text-gray-700 mb-1">
							名称 <span class="text-red-500">*</span>
						</label>
						<input
							id="edit-name"
							type="text"
							bind:value={form.name}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
						/>
					</div>

					<div>
						<label for="edit-year" class="block text-sm font-medium text-gray-700 mb-1">
							制造年代 <span class="text-red-500">*</span>
						</label>
						<input
							id="edit-year"
							type="number"
							bind:value={form.manufactureYear}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
						/>
					</div>

					<div>
						<label for="edit-material" class="block text-sm font-medium text-gray-700 mb-1">
							材质 <span class="text-red-500">*</span>
						</label>
						<select
							id="edit-material"
							bind:value={form.material}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
						>
							<option value="">请选择材质</option>
							{#each MATERIAL_OPTIONS as opt}
								<option value={opt}>{opt}</option>
							{/each}
						</select>
					</div>

					<div>
						<label for="edit-sea" class="block text-sm font-medium text-gray-700 mb-1">
							原使用海域 <span class="text-red-500">*</span>
						</label>
						<select
							id="edit-sea"
							bind:value={form.originalSeaArea}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
						>
							<option value="">请选择海域</option>
							{#each SEA_AREA_OPTIONS as opt}
								<option value={opt}>{opt}</option>
							{/each}
						</select>
					</div>

					<div>
						<label for="edit-location" class="block text-sm font-medium text-gray-700 mb-1">
							展陈位置
						</label>
						<input
							id="edit-location"
							type="text"
							bind:value={form.exhibitionLocation}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
							placeholder="如：一楼展厅A区"
						/>
					</div>

					<div>
						<label for="edit-lampshade" class="block text-sm font-medium text-gray-700 mb-1">
							灯罩状态
						</label>
						<select
							id="edit-lampshade"
							bind:value={form.lampshadeStatus}
							onchange={validateLampshadeExhibition}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
						>
							{#each LAMPSHADE_STATUS_OPTIONS as opt}
								<option value={opt}>{opt}</option>
							{/each}
						</select>
					</div>

					<div>
						<label for="edit-light" class="block text-sm font-medium text-gray-700 mb-1">
							光源状态
						</label>
						<select
							id="edit-light"
							bind:value={form.lightSourceStatus}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
						>
							{#each LIGHT_SOURCE_STATUS_OPTIONS as opt}
								<option value={opt}>{opt}</option>
							{/each}
						</select>
					</div>

					<div class="md:col-span-2">
						<label for="edit-exhibition" class="block text-sm font-medium text-gray-700 mb-1">
							展陈状态
						</label>
						<select
							id="edit-exhibition"
							bind:value={form.exhibitionStatus}
							onchange={validateLampshadeExhibition}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
						>
							{#each EXHIBITION_STATUS_OPTIONS as opt}
								<option value={opt}>{opt}</option>
							{/each}
						</select>
						<p class="text-xs text-gray-500 mt-1">注意：灯罩破损时不能标记为"可展出"</p>
					</div>
				</div>

				<div class="flex justify-end gap-3 pt-4 border-t border-gray-100">
					<button
						type="button"
						onclick={handleCancel}
						class="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
					>
						取消
					</button>
					<button
						type="submit"
						class="px-5 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors font-medium"
					>
						保存修改
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
