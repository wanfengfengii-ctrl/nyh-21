import type { BeaconLight, MaintenanceRecord, LampshadeInspection, LightSourceReplacement, ExhibitionStatusHistory } from './types';

export function generateId(): string {
	return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

export function formatDate(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

export function getToday(): string {
	return formatDate(new Date());
}

export interface ValidationResult {
	valid: boolean;
	errors: string[];
}

export function validateBeaconLight(
	light: Partial<BeaconLight>,
	existingLights: BeaconLight[],
	currentId?: string
): ValidationResult {
	const errors: string[] = [];

	if (!light.code || light.code.trim() === '') {
		errors.push('航标灯编号不能为空');
	} else {
		const duplicate = existingLights.find(
			(l) => l.code === light.code && l.id !== currentId
		);
		if (duplicate) {
			errors.push('航标灯编号不能重复');
		}
	}

	if (!light.name || light.name.trim() === '') {
		errors.push('航标灯名称不能为空');
	}

	if (!light.manufactureYear) {
		errors.push('制造年代不能为空');
	} else if (light.manufactureYear < 1000 || light.manufactureYear > new Date().getFullYear()) {
		errors.push('制造年代不合法');
	}

	if (!light.material || light.material.trim() === '') {
		errors.push('材质不能为空');
	}

	if (!light.originalSeaArea || light.originalSeaArea.trim() === '') {
		errors.push('原使用海域不能为空');
	}

	if (light.lampshadeStatus === '破损' && light.exhibitionStatus === '可展出') {
		errors.push('灯罩破损时不能标记为可展出');
	}

	return { valid: errors.length === 0, errors };
}

export function validateMaintenanceRecord(record: Partial<MaintenanceRecord>): ValidationResult {
	const errors: string[] = [];

	if (!record.date || record.date.trim() === '') {
		errors.push('维护日期不能为空');
	} else if (record.date > getToday()) {
		errors.push('维护日期不能晚于当前日期');
	}

	if (!record.type) {
		errors.push('维护类型不能为空');
	}

	if (!record.description || record.description.trim() === '') {
		errors.push('维护描述不能为空');
	}

	if (!record.operator || record.operator.trim() === '') {
		errors.push('操作人员不能为空');
	}

	return { valid: errors.length === 0, errors };
}

export function validateLampshadeInspection(inspection: Partial<LampshadeInspection>): ValidationResult {
	const errors: string[] = [];

	if (!inspection.date || inspection.date.trim() === '') {
		errors.push('检查日期不能为空');
	} else if (inspection.date > getToday()) {
		errors.push('检查日期不能晚于当前日期');
	}

	if (!inspection.status) {
		errors.push('灯罩状态不能为空');
	}

	if (!inspection.inspector || inspection.inspector.trim() === '') {
		errors.push('检查人员不能为空');
	}

	return { valid: errors.length === 0, errors };
}

export function validateLightSourceReplacement(replacement: Partial<LightSourceReplacement>): ValidationResult {
	const errors: string[] = [];

	if (!replacement.date || replacement.date.trim() === '') {
		errors.push('更换日期不能为空');
	} else if (replacement.date > getToday()) {
		errors.push('更换日期不能晚于当前日期');
	}

	if (!replacement.reason || replacement.reason.trim() === '') {
		errors.push('更换原因必须记录');
	}

	if (!replacement.oldSourceType || replacement.oldSourceType.trim() === '') {
		errors.push('原光源类型不能为空');
	}

	if (!replacement.newSourceType || replacement.newSourceType.trim() === '') {
		errors.push('新光源类型不能为空');
	}

	if (!replacement.operator || replacement.operator.trim() === '') {
		errors.push('操作人员不能为空');
	}

	return { valid: errors.length === 0, errors };
}

export function validateExhibitionStatusChange(
	fromStatus: string,
	toStatus: string,
	lampshadeStatus: string
): ValidationResult {
	const errors: string[] = [];

	if (toStatus === '可展出' && lampshadeStatus === '破损') {
		errors.push('灯罩破损时不能标记为可展出');
	}

	if (fromStatus === toStatus) {
		errors.push('新状态不能与当前状态相同');
	}

	return { valid: errors.length === 0, errors };
}
