export type LampshadeStatus = '完好' | '轻微划痕' | '裂纹' | '破损';
export type LightSourceStatus = '正常' | '亮度不足' | '故障' | '已更换';
export type ExhibitionStatus = '展出中' | '可展出' | '维护中' | '库房存储' | '不可展出';

export interface BeaconLight {
	id: string;
	code: string;
	name: string;
	manufactureYear: number;
	material: string;
	originalSeaArea: string;
	lampshadeStatus: LampshadeStatus;
	lightSourceStatus: LightSourceStatus;
	exhibitionStatus: ExhibitionStatus;
	exhibitionLocation: string;
	createdAt: string;
	updatedAt: string;
}

export interface MaintenanceRecord {
	id: string;
	beaconLightId: string;
	date: string;
	type: '常规维护' | '灯罩检查' | '光源更换' | '其他';
	description: string;
	operator: string;
	replaceReason?: string;
}

export interface LampshadeInspection {
	id: string;
	beaconLightId: string;
	date: string;
	inspector: string;
	status: LampshadeStatus;
	findings: string;
}

export interface LightSourceReplacement {
	id: string;
	beaconLightId: string;
	date: string;
	reason: string;
	oldSourceType: string;
	newSourceType: string;
	operator: string;
}

export interface ExhibitionStatusHistory {
	id: string;
	beaconLightId: string;
	date: string;
	fromStatus: ExhibitionStatus;
	toStatus: ExhibitionStatus;
	operator: string;
	remark: string;
}

export const MATERIAL_OPTIONS = ['铜制', '铁制', '钢制', '玻璃', '陶瓷', '木质', '其他'];

export const SEA_AREA_OPTIONS = ['渤海', '黄海', '东海', '南海', '太平洋', '印度洋', '大西洋', '其他'];

export const LAMPSHADE_STATUS_OPTIONS: LampshadeStatus[] = ['完好', '轻微划痕', '裂纹', '破损'];

export const LIGHT_SOURCE_STATUS_OPTIONS: LightSourceStatus[] = ['正常', '亮度不足', '故障', '已更换'];

export const EXHIBITION_STATUS_OPTIONS: ExhibitionStatus[] = ['展出中', '可展出', '维护中', '库房存储', '不可展出'];
