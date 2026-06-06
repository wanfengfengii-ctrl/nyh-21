import type { BeaconLight, MaintenanceRecord, LampshadeInspection, LightSourceReplacement, ExhibitionStatusHistory, BorrowRequest, RepairOrder, LampshadeStatus, ExhibitionStatus, EnvMonitorPoint, EnvMonitorRecord, EnvThresholdConfig, EnvAlert, RectificationTask, EnvMonitorDataType, SaltFogLevel } from './types';

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

export function validateEnvMonitorPoint(point: Partial<EnvMonitorPoint>, existingPoints: EnvMonitorPoint[], currentId?: string): ValidationResult {
	const errors: string[] = [];

	if (!point.code || point.code.trim() === '') {
		errors.push('监测点编号不能为空');
	} else {
		const duplicate = existingPoints.find(p => p.code === point.code && p.id !== currentId);
		if (duplicate) {
			errors.push('监测点编号不能重复');
		}
	}

	if (!point.name || point.name.trim() === '') {
		errors.push('监测点名称不能为空');
	}

	if (!point.type) {
		errors.push('请选择监测点类型');
	}

	if (!point.location || point.location.trim() === '') {
		errors.push('位置信息不能为空');
	}

	if (!point.museumId) {
		errors.push('请选择所属馆区');
	}

	return { valid: errors.length === 0, errors };
}

export function validateEnvMonitorRecord(record: Partial<EnvMonitorRecord>): ValidationResult {
	const errors: string[] = [];

	if (!record.pointId) {
		errors.push('请选择监测点');
	}

	if (record.temperature === undefined || record.temperature === null) {
		errors.push('温度值不能为空');
	} else if (record.temperature < -50 || record.temperature > 100) {
		errors.push('温度值超出合理范围');
	}

	if (record.humidity === undefined || record.humidity === null) {
		errors.push('湿度值不能为空');
	} else if (record.humidity < 0 || record.humidity > 100) {
		errors.push('湿度值必须在0-100%之间');
	}

	if (record.illuminance === undefined || record.illuminance === null) {
		errors.push('照度值不能为空');
	} else if (record.illuminance < 0) {
		errors.push('照度值不能为负数');
	}

	if (record.vibration === undefined || record.vibration === null) {
		errors.push('震动值不能为空');
	} else if (record.vibration < 0) {
		errors.push('震动值不能为负数');
	}

	if (!record.saltFogLevel) {
		errors.push('请选择盐雾等级');
	}

	if (!record.collectedAt || record.collectedAt.trim() === '') {
		errors.push('采集时间不能为空');
	}

	return { valid: errors.length === 0, errors };
}

export function validateThresholdConfig(config: Partial<EnvThresholdConfig>): ValidationResult {
	const errors: string[] = [];

	if (!config.pointId) {
		errors.push('请选择监测点');
	}

	if (config.temperatureMin === undefined || config.temperatureMin === null) {
		errors.push('温度下限不能为空');
	}
	if (config.temperatureMax === undefined || config.temperatureMax === null) {
		errors.push('温度上限不能为空');
	}
	if (config.temperatureMin !== undefined && config.temperatureMax !== undefined && config.temperatureMin >= config.temperatureMax) {
		errors.push('温度下限必须小于上限');
	}

	if (config.humidityMin === undefined || config.humidityMin === null) {
		errors.push('湿度下限不能为空');
	}
	if (config.humidityMax === undefined || config.humidityMax === null) {
		errors.push('湿度上限不能为空');
	}
	if (config.humidityMin !== undefined && config.humidityMax !== undefined && config.humidityMin >= config.humidityMax) {
		errors.push('湿度下限必须小于上限');
	}

	if (config.illuminanceMax === undefined || config.illuminanceMax === null) {
		errors.push('照度上限不能为空');
	} else if (config.illuminanceMax < 0) {
		errors.push('照度上限不能为负数');
	}

	if (config.vibrationMax === undefined || config.vibrationMax === null) {
		errors.push('震动上限不能为空');
	} else if (config.vibrationMax < 0) {
		errors.push('震动上限不能为负数');
	}

	if (!config.saltFogMaxLevel) {
		errors.push('请选择盐雾最大等级');
	}

	return { valid: errors.length === 0, errors };
}

export function validateRectificationTask(task: Partial<RectificationTask>): ValidationResult {
	const errors: string[] = [];

	if (!task.pointId) {
		errors.push('请选择监测点');
	}

	if (!task.title || task.title.trim() === '') {
		errors.push('整改任务标题不能为空');
	}

	if (!task.description || task.description.trim() === '') {
		errors.push('整改任务描述不能为空');
	}

	if (!task.riskLevel) {
		errors.push('请选择风险等级');
	}

	if (task.dueDate && task.createdAt && isDateBefore(task.dueDate, task.createdAt)) {
		errors.push('截止日期不能早于创建日期');
	}

	return { valid: errors.length === 0, errors };
}

export function checkEnvThreshold(record: EnvMonitorRecord, config: EnvThresholdConfig): { alerts: { type: EnvMonitorDataType; level: '低风险' | '中风险' | '高风险'; actual: string; threshold: string; desc: string }[] } {
	const alerts: { type: EnvMonitorDataType; level: '低风险' | '中风险' | '高风险'; actual: string; threshold: string; desc: string }[] = [];

	const tempRange = config.temperatureMax - config.temperatureMin;
	if (record.temperature < config.temperatureMin || record.temperature > config.temperatureMax) {
		const deviation = Math.max(config.temperatureMin - record.temperature, record.temperature - config.temperatureMax);
		const level = deviation > tempRange * 0.5 ? '高风险' : deviation > tempRange * 0.2 ? '中风险' : '低风险';
		alerts.push({
			type: '温度',
			level,
			actual: `${record.temperature}°C`,
			threshold: `${config.temperatureMin}-${config.temperatureMax}°C`,
			desc: `温度${record.temperature > config.temperatureMax ? '超高' : '过低'}，当前${record.temperature}°C，阈值范围${config.temperatureMin}-${config.temperatureMax}°C`
		});
	}

	const humRange = config.humidityMax - config.humidityMin;
	if (record.humidity < config.humidityMin || record.humidity > config.humidityMax) {
		const deviation = Math.max(config.humidityMin - record.humidity, record.humidity - config.humidityMax);
		const level = deviation > humRange * 0.5 ? '高风险' : deviation > humRange * 0.2 ? '中风险' : '低风险';
		alerts.push({
			type: '湿度',
			level,
			actual: `${record.humidity}%`,
			threshold: `${config.humidityMin}-${config.humidityMax}%`,
			desc: `湿度${record.humidity > config.humidityMax ? '超高' : '过低'}，当前${record.humidity}%，阈值范围${config.humidityMin}-${config.humidityMax}%`
		});
	}

	if (record.illuminance > config.illuminanceMax) {
		const ratio = record.illuminance / config.illuminanceMax;
		const level = ratio > 2 ? '高风险' : ratio > 1.5 ? '中风险' : '低风险';
		alerts.push({
			type: '照度',
			level,
			actual: `${record.illuminance} lux`,
			threshold: `≤${config.illuminanceMax} lux`,
			desc: `照度超高，当前${record.illuminance} lux，阈值≤${config.illuminanceMax} lux`
		});
	}

	if (record.vibration > config.vibrationMax) {
		const ratio = record.vibration / config.vibrationMax;
		const level = ratio > 2 ? '高风险' : ratio > 1.5 ? '中风险' : '低风险';
		alerts.push({
			type: '震动',
			level,
			actual: `${record.vibration} mm/s`,
			threshold: `≤${config.vibrationMax} mm/s`,
			desc: `震动值超高，当前${record.vibration} mm/s，阈值≤${config.vibrationMax} mm/s`
		});
	}

	const saltFogOrder: SaltFogLevel[] = ['无', '轻微', '中等', '严重'];
	const recordLevelIdx = saltFogOrder.indexOf(record.saltFogLevel);
	const maxLevelIdx = saltFogOrder.indexOf(config.saltFogMaxLevel);
	if (recordLevelIdx > maxLevelIdx) {
		const diff = recordLevelIdx - maxLevelIdx;
		const level = diff >= 2 ? '高风险' : '中风险';
		alerts.push({
			type: '盐雾',
			level,
			actual: record.saltFogLevel,
			threshold: `≤${config.saltFogMaxLevel}`,
			desc: `盐雾等级超标，当前${record.saltFogLevel}，阈值≤${config.saltFogMaxLevel}`
		});
	}

	return { alerts };
}

export function calculateOverallRiskLevel(alerts: { level: '低风险' | '中风险' | '高风险' }[]): '低风险' | '中风险' | '高风险' {
	if (alerts.some(a => a.level === '高风险')) return '高风险';
	if (alerts.some(a => a.level === '中风险')) return '中风险';
	return '低风险';
}

export function getSaltFogLevelIndex(level: SaltFogLevel): number {
	const order: SaltFogLevel[] = ['无', '轻微', '中等', '严重'];
	return order.indexOf(level);
}
