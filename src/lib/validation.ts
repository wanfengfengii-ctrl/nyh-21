import type { BeaconLight, MaintenanceRecord, LampshadeInspection, LightSourceReplacement, ExhibitionStatusHistory, BorrowRequest, RepairOrder, LampshadeStatus, ExhibitionStatus } from './types';

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

export function getDaysBetween(date1: string, date2: string): number {
	const d1 = new Date(date1);
	const d2 = new Date(date2);
	const diffTime = d2.getTime() - d1.getTime();
	return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function isDateBefore(date1: string, date2: string): boolean {
	return new Date(date1) < new Date(date2);
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

	if (light.lampshadeStatus === '破损' && (light.exhibitionStatus === '可展出' || light.exhibitionStatus === '展出中')) {
		errors.push('灯罩破损时不能标记为可展出或展出中');
	}

	if (light.isOnBorrow && light.exhibitionStatus === '展出中') {
		errors.push('借展中的藏品不能标记为展出中');
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

	if (record.type === '光源更换' && (!record.replaceReason || record.replaceReason.trim() === '')) {
		errors.push('光源更换必须记录更换原因');
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
	lampshadeStatus: string,
	isOnBorrow: boolean = false,
	isUnderRepair: boolean = false
): ValidationResult {
	const errors: string[] = [];

	if ((toStatus === '可展出' || toStatus === '展出中') && lampshadeStatus === '破损') {
		errors.push('灯罩破损时不能标记为可展出或展出中');
	}

	if (fromStatus === toStatus) {
		errors.push('新状态不能与当前状态相同');
	}

	if (isOnBorrow && toStatus === '展出中') {
		errors.push('借展中的藏品不能标记为展出中');
	}

	if (isUnderRepair && toStatus === '展出中') {
		errors.push('修复中的藏品不能标记为展出中');
	}

	return { valid: errors.length === 0, errors };
}

export function validateBorrowRequest(
	data: Partial<BorrowRequest>,
	beaconLight?: BeaconLight,
	activeBorrowRequests?: BorrowRequest[]
): ValidationResult {
	const errors: string[] = [];

	if (!data.beaconLightId) {
		errors.push('请选择借展藏品');
	}

	if (!data.sourceMuseumId) {
		errors.push('请选择出借馆区');
	}

	if (!data.targetMuseumId) {
		errors.push('请选择借入馆区');
	}

	if (data.sourceMuseumId && data.targetMuseumId && data.sourceMuseumId === data.targetMuseumId) {
		errors.push('出借馆区和借入馆区不能相同');
	}

	if (!data.plannedStartDate || data.plannedStartDate.trim() === '') {
		errors.push('请选择计划开始日期');
	}

	if (!data.plannedEndDate || data.plannedEndDate.trim() === '') {
		errors.push('请选择计划结束日期');
	}

	if (data.plannedStartDate && data.plannedEndDate && isDateBefore(data.plannedEndDate, data.plannedStartDate)) {
		errors.push('结束日期不能早于开始日期');
	}

	if (!data.purpose || data.purpose.trim() === '') {
		errors.push('请填写借展用途');
	}

	if (!data.exhibitionLocation || data.exhibitionLocation.trim() === '') {
		errors.push('请填写展陈位置');
	}

	if (beaconLight) {
		if (beaconLight.isUnderRepair) {
			errors.push('修复中的藏品不能发起借展');
		}

		if (beaconLight.isOnBorrow) {
			errors.push('该藏品正在借展中，不能重复借展');
		}

		if (beaconLight.lampshadeStatus === '破损') {
			errors.push('灯罩破损的藏品不可借展');
		}
	}

	return { valid: errors.length === 0, errors };
}

export function validateRepairOrder(
	data: Partial<RepairOrder>,
	beaconLight?: BeaconLight
): ValidationResult {
	const errors: string[] = [];

	if (!data.beaconLightId) {
		errors.push('请选择修复藏品');
	}

	if (!data.repairType || data.repairType.trim() === '') {
		errors.push('请选择修复类型');
	}

	if (!data.priority) {
		errors.push('请选择优先级');
	}

	if (!data.description || data.description.trim() === '') {
		errors.push('请填写问题描述');
	}

	if (beaconLight && beaconLight.isUnderRepair) {
		errors.push('该藏品已有进行中的修复工单');
	}

	return { valid: errors.length === 0, errors };
}

export function checkBorrowOverdue(request: BorrowRequest): boolean {
	if (request.status !== '借展中') return false;
	const today = getToday();
	return isDateBefore(request.plannedEndDate, today);
}

export function getBorrowDaysRemaining(request: BorrowRequest): number {
	if (request.status !== '借展中') return 0;
	const today = getToday();
	return getDaysBetween(today, request.plannedEndDate);
}

export function getDefaultExhibitionStatus(lampshadeStatus: LampshadeStatus): ExhibitionStatus {
	if (lampshadeStatus === '破损') {
		return '不可展出';
	} else if (lampshadeStatus === '裂纹') {
		return '维护中';
	}
	return '可展出';
}
