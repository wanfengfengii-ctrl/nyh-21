import { writable, derived } from 'svelte/store';
import { generateId, getToday, validateBeaconLight } from './validation';
import type {
	BeaconLight,
	MaintenanceRecord,
	LampshadeInspection,
	LightSourceReplacement,
	ExhibitionStatusHistory,
	ExhibitionStatus,
	LampshadeStatus,
	LightSourceStatus
} from './types';

const mockBeaconLights: BeaconLight[] = [
	{
		id: '1',
		code: 'HBD-001',
		name: '渤海老铁山灯塔灯器',
		manufactureYear: 1893,
		material: '铜制',
		originalSeaArea: '渤海',
		lampshadeStatus: '完好',
		lightSourceStatus: '正常',
		exhibitionStatus: '展出中',
		exhibitionLocation: '一楼展厅A区',
		createdAt: '2020-01-15',
		updatedAt: '2024-03-20'
	},
	{
		id: '2',
		code: 'HBD-002',
		name: '黄海成山号灯船灯器',
		manufactureYear: 1921,
		material: '铁制',
		originalSeaArea: '黄海',
		lampshadeStatus: '轻微划痕',
		lightSourceStatus: '亮度不足',
		exhibitionStatus: '维护中',
		exhibitionLocation: '二楼展厅B区',
		createdAt: '2020-02-20',
		updatedAt: '2024-05-10'
	},
	{
		id: '3',
		code: 'HBD-003',
		name: '东海花鸟山灯塔透镜',
		manufactureYear: 1956,
		material: '玻璃',
		originalSeaArea: '东海',
		lampshadeStatus: '裂纹',
		lightSourceStatus: '故障',
		exhibitionStatus: '库房存储',
		exhibitionLocation: '文物库房3号柜',
		createdAt: '2021-03-10',
		updatedAt: '2024-02-28'
	},
	{
		id: '4',
		code: 'HBD-004',
		name: '南海诸岛灯塔灯器',
		manufactureYear: 1988,
		material: '钢制',
		originalSeaArea: '南海',
		lampshadeStatus: '破损',
		lightSourceStatus: '已更换',
		exhibitionStatus: '不可展出',
		exhibitionLocation: '修复工作室',
		createdAt: '2021-06-15',
		updatedAt: '2024-04-15'
	},
	{
		id: '5',
		code: 'HBD-005',
		name: '大沽灯塔棱镜组',
		manufactureYear: 1972,
		material: '铜制',
		originalSeaArea: '渤海',
		lampshadeStatus: '完好',
		lightSourceStatus: '正常',
		exhibitionStatus: '可展出',
		exhibitionLocation: '一楼展厅C区',
		createdAt: '2022-01-05',
		updatedAt: '2024-01-20'
	},
	{
		id: '6',
		code: 'HBD-006',
		name: '长江口灯船灯器',
		manufactureYear: 1905,
		material: '铜制',
		originalSeaArea: '东海',
		lampshadeStatus: '完好',
		lightSourceStatus: '正常',
		exhibitionStatus: '展出中',
		exhibitionLocation: '二楼展厅A区',
		createdAt: '2022-03-18',
		updatedAt: '2024-03-05'
	}
];

const mockMaintenanceRecords: MaintenanceRecord[] = [
	{ id: 'm1', beaconLightId: '1', date: '2024-03-20', type: '常规维护', description: '清洁灯罩，检查电路', operator: '张工' },
	{ id: 'm2', beaconLightId: '2', date: '2024-05-10', type: '光源更换', description: '更换LED光源', operator: '李工', replaceReason: '亮度不足' },
	{ id: 'm3', beaconLightId: '3', date: '2024-02-28', type: '灯罩检查', description: '发现裂纹，建议修复', operator: '王工' },
	{ id: 'm4', beaconLightId: '1', date: '2024-01-15', type: '常规维护', description: '例行检查，状态良好', operator: '张工' },
	{ id: 'm5', beaconLightId: '5', date: '2024-04-10', type: '常规维护', description: '清洁保养', operator: '赵工' }
];

const mockLampshadeInspections: LampshadeInspection[] = [
	{ id: 'l1', beaconLightId: '1', date: '2024-03-20', inspector: '张工', status: '完好', findings: '灯罩透明，无划痕' },
	{ id: 'l2', beaconLightId: '2', date: '2024-04-15', inspector: '李工', status: '轻微划痕', findings: '表面有细微划痕，不影响使用' },
	{ id: 'l3', beaconLightId: '3', date: '2024-02-28', inspector: '王工', status: '裂纹', findings: '边缘有裂纹，需修复' },
	{ id: 'l4', beaconLightId: '4', date: '2024-04-15', inspector: '赵工', status: '破损', findings: '大面积破损，需更换' }
];

const mockLightSourceReplacements: LightSourceReplacement[] = [
	{ id: 'r1', beaconLightId: '2', date: '2024-05-10', reason: '亮度不足，影响展示效果', oldSourceType: '白炽灯', newSourceType: 'LED灯', operator: '李工' },
	{ id: 'r2', beaconLightId: '4', date: '2024-03-20', reason: '光源故障，无法点亮', oldSourceType: '卤素灯', newSourceType: 'LED灯', operator: '张工' }
];

const mockExhibitionStatusHistories: ExhibitionStatusHistory[] = [
	{ id: 'e1', beaconLightId: '2', date: '2024-05-10', fromStatus: '展出中', toStatus: '维护中', operator: '馆长', remark: '光源更换维护' },
	{ id: 'e2', beaconLightId: '3', date: '2024-02-28', fromStatus: '展出中', toStatus: '库房存储', operator: '馆长', remark: '灯罩裂纹，撤展入库' },
	{ id: 'e3', beaconLightId: '5', date: '2024-01-20', fromStatus: '库房存储', toStatus: '可展出', operator: '馆长', remark: '修复完成，待展出' }
];

export const beaconLights = writable<BeaconLight[]>(mockBeaconLights);
export const maintenanceRecords = writable<MaintenanceRecord[]>(mockMaintenanceRecords);
export const lampshadeInspections = writable<LampshadeInspection[]>(mockLampshadeInspections);
export const lightSourceReplacements = writable<LightSourceReplacement[]>(mockLightSourceReplacements);
export const exhibitionStatusHistories = writable<ExhibitionStatusHistory[]>(mockExhibitionStatusHistories);
export const searchKeyword = writable<string>('');

export const filteredBeaconLights = derived(
	[beaconLights, searchKeyword],
	([$lights, $keyword]) => {
		if (!$keyword.trim()) return $lights;
		const kw = $keyword.toLowerCase();
		return $lights.filter(
			(l) =>
				l.code.toLowerCase().includes(kw) ||
				l.name.toLowerCase().includes(kw) ||
				l.material.toLowerCase().includes(kw) ||
				l.originalSeaArea.toLowerCase().includes(kw) ||
				l.exhibitionLocation.toLowerCase().includes(kw)
		);
	}
);

export function addBeaconLight(light: Omit<BeaconLight, 'id' | 'createdAt' | 'updatedAt'>) {
	const today = getToday();
	const newLight: BeaconLight = {
		...light,
		id: generateId(),
		createdAt: today,
		updatedAt: today
	};
	beaconLights.update((lights) => [...lights, newLight]);
	return newLight;
}

export function updateBeaconLight(id: string, updates: Partial<BeaconLight>) {
	beaconLights.update((lights) =>
		lights.map((l) => (l.id === id ? { ...l, ...updates, updatedAt: getToday() } : l))
	);
}

export function deleteBeaconLight(id: string) {
	beaconLights.update((lights) => lights.filter((l) => l.id !== id));
	maintenanceRecords.update((records) => records.filter((r) => r.beaconLightId !== id));
	lampshadeInspections.update((inspections) => inspections.filter((i) => i.beaconLightId !== id));
	lightSourceReplacements.update((replacements) => replacements.filter((r) => r.beaconLightId !== id));
	exhibitionStatusHistories.update((histories) => histories.filter((h) => h.beaconLightId !== id));
}

export function addMaintenanceRecord(record: Omit<MaintenanceRecord, 'id'>) {
	const newRecord: MaintenanceRecord = { ...record, id: generateId() };
	maintenanceRecords.update((records) => [...records, newRecord]);
	return newRecord;
}

export function addLampshadeInspection(inspection: Omit<LampshadeInspection, 'id'>) {
	const newInspection: LampshadeInspection = { ...inspection, id: generateId() };
	lampshadeInspections.update((inspections) => [...inspections, newInspection]);
	updateBeaconLight(inspection.beaconLightId, { lampshadeStatus: inspection.status });
	return newInspection;
}

export function addLightSourceReplacement(replacement: Omit<LightSourceReplacement, 'id'>) {
	const newReplacement: LightSourceReplacement = { ...replacement, id: generateId() };
	lightSourceReplacements.update((replacements) => [...replacements, newReplacement]);

	const record: Omit<MaintenanceRecord, 'id'> = {
		beaconLightId: replacement.beaconLightId,
		date: replacement.date,
		type: '光源更换',
		description: `更换光源：${replacement.oldSourceType} → ${replacement.newSourceType}`,
		operator: replacement.operator,
		replaceReason: replacement.reason
	};
	addMaintenanceRecord(record);

	updateBeaconLight(replacement.beaconLightId, { lightSourceStatus: '已更换' });

	return newReplacement;
}

export function changeExhibitionStatus(
	beaconLightId: string,
	toStatus: ExhibitionStatus,
	operator: string,
	remark: string
) {
	let fromStatus: ExhibitionStatus = '库房存储';
	beaconLights.update((lights) =>
		lights.map((l) => {
			if (l.id === beaconLightId) {
				fromStatus = l.exhibitionStatus;
				return { ...l, exhibitionStatus: toStatus, updatedAt: getToday() };
			}
			return l;
		})
	);

	const history: Omit<ExhibitionStatusHistory, 'id'> = {
		beaconLightId,
		date: getToday(),
		fromStatus,
		toStatus,
		operator,
		remark
	};
	exhibitionStatusHistories.update((histories) => [...histories, { ...history, id: generateId() }]);
}

export function getBeaconLightById(id: string): BeaconLight | undefined {
	let result: BeaconLight | undefined;
	beaconLights.subscribe((lights) => {
		result = lights.find((l) => l.id === id);
	})();
	return result;
}

export function getRecordsByBeaconLightId(id: string) {
	let records: MaintenanceRecord[] = [];
	let inspections: LampshadeInspection[] = [];
	let replacements: LightSourceReplacement[] = [];
	let histories: ExhibitionStatusHistory[] = [];

	maintenanceRecords.subscribe((r) => { records = r.filter((x) => x.beaconLightId === id); })();
	lampshadeInspections.subscribe((i) => { inspections = i.filter((x) => x.beaconLightId === id); })();
	lightSourceReplacements.subscribe((r) => { replacements = r.filter((x) => x.beaconLightId === id); })();
	exhibitionStatusHistories.subscribe((h) => { histories = h.filter((x) => x.beaconLightId === id); })();

	return { records, inspections, replacements, histories };
}
