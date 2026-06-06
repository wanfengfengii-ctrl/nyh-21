export type LampshadeStatus = '完好' | '轻微划痕' | '裂纹' | '破损';
export type LightSourceStatus = '正常' | '亮度不足' | '故障' | '已更换';
export type ExhibitionStatus = '展出中' | '可展出' | '维护中' | '库房存储' | '不可展出';

export type UserRole = '系统管理员' | '馆区管理员' | '保管员' | '研究员' | '修复师';
export type BorrowRequestStatus = '待审批' | '已批准' | '借展中' | '已归还' | '已拒绝' | '已取消' | '已逾期';
export type RepairOrderStatus = '待分配' | '修复中' | '待验收' | '已完成' | '已取消';
export type RepairPriority = '高' | '中' | '低';
export type OperationLogAction = '创建' | '编辑' | '删除' | '新增维护记录' | '新增灯罩检查' | '新增光源更换' | '展陈流转' | '创建借展申请' | '审批借展' | '取消借展' | '借展归还' | '创建修复工单' | '分配修复' | '开始修复' | '完成修复' | '验收修复' | '创建整改任务' | '开始整改' | '完成整改' | '验收整改' | '取消整改任务' | '上传附件' | '用户登录' | '切换馆区' | '导出数据';

export interface Museum {
	id: string;
	name: string;
	type: '主馆' | '分馆' | '合作馆';
	address: string;
	contact: string;
	description: string;
	createdAt: string;
	updatedAt: string;
}

export interface User {
	id: string;
	username: string;
	fullName: string;
	role: UserRole;
	museumId: string;
	email: string;
	phone: string;
	createdAt: string;
	updatedAt: string;
}

export interface BeaconLight {
	id: string;
	code: string;
	name: string;
	manufactureYear: number;
	material: string;
	originalSeaArea: string;
	museumId: string;
	museumName: string;
	description?: string;
	lampshadeStatus: LampshadeStatus;
	lightSourceStatus: LightSourceStatus;
	exhibitionStatus: ExhibitionStatus;
	exhibitionLocation: string;
	isOnBorrow: boolean;
	currentBorrowId?: string;
	isUnderRepair: boolean;
	currentRepairOrderId?: string;
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

export interface ApprovalRecord {
	id: string;
	approverId: string;
	approverName: string;
	approverRole: UserRole;
	action: '提交' | '通过' | '拒绝' | '退回';
	comment: string;
	timestamp: string;
}

export interface BorrowRequest {
	id: string;
	beaconLightId: string;
	beaconLightName: string;
	beaconLightCode: string;
	sourceMuseumId: string;
	sourceMuseumName: string;
	targetMuseumId: string;
	targetMuseumName: string;
	applicantId: string;
	applicantName: string;
	applyDate: string;
	plannedStartDate: string;
	plannedEndDate: string;
	actualStartDate?: string;
	actualEndDate?: string;
	purpose: string;
	exhibitionLocation: string;
	status: BorrowRequestStatus;
	currentApproverRole?: UserRole;
	approvalHistory: ApprovalRecord[];
	remark?: string;
	createdAt: string;
	updatedAt: string;
}

export interface RepairOrder {
	id: string;
	beaconLightId: string;
	beaconLightName: string;
	beaconLightCode: string;
	museumId: string;
	museumName: string;
	reporterId: string;
	reporterName: string;
	reportDate: string;
	createDate: string;
	repairType: string;
	priority: RepairPriority;
	description: string;
	assignedTo?: string;
	assignedToName?: string;
	assigneeId?: string;
	assigneeName?: string;
	assignDate?: string;
	repairPlan?: string;
	repairStartDate?: string;
	repairEndDate?: string;
	completeDate?: string;
	repairResult?: string;
	status: RepairOrderStatus;
	acceptanceDate?: string;
	acceptanceResult?: string;
	cancelReason?: string;
	cost?: number;
	remark?: string;
	createdAt: string;
	updatedAt: string;
}

export interface Attachment {
	id: string;
	beaconLightId?: string;
	borrowRequestId?: string;
	repairOrderId?: string;
	museumId?: string;
	fileName: string;
	fileType: string;
	fileSize: number;
	uploadedBy: string;
	uploadedAt: string;
	uploaderId?: string;
	uploaderName?: string;
	uploadTime?: string;
	description?: string;
	url: string;
}

export type OperationType = '创建' | '编辑' | '删除' | '新增维护记录' | '新增灯罩检查' | '新增光源更换' | '状态变更' | '创建借展申请' | '审批通过' | '审批拒绝' | '取消借展' | '借出' | '归还' | '创建修复工单' | '分配修复' | '开始修复' | '完成修复' | '验收修复' | '上传附件' | '删除附件' | '用户登录' | '切换馆区' | '导出数据';

export type LogModule = '藏品档案' | '借展管理' | '修复工单' | '附件管理' | '用户管理' | '系统设置' | '环境监测';

export interface OperationLog {
	id: string;
	userId: string;
	userName: string;
	userRole: string;
	operatorId?: string;
	operatorName?: string;
	operatorRole?: string;
	operationType?: OperationType;
	museumId: string;
	museumName: string;
	module?: LogModule;
	action: OperationLogAction;
	targetType: '航标灯' | '借展申请' | '修复工单' | '附件' | '用户' | '馆区';
	targetId: string;
	targetName: string;
	description?: string;
	detail: string;
	timestamp: string;
}

export const MATERIAL_OPTIONS = ['铜制', '铁制', '钢制', '玻璃', '陶瓷', '木质', '其他'];

export const SEA_AREA_OPTIONS = ['渤海', '黄海', '东海', '南海', '太平洋', '印度洋', '大西洋', '其他'];

export const LAMPSHADE_STATUS_OPTIONS: LampshadeStatus[] = ['完好', '轻微划痕', '裂纹', '破损'];

export const LIGHT_SOURCE_STATUS_OPTIONS: LightSourceStatus[] = ['正常', '亮度不足', '故障', '已更换'];

export const EXHIBITION_STATUS_OPTIONS: ExhibitionStatus[] = ['展出中', '可展出', '维护中', '库房存储', '不可展出'];

export const USER_ROLE_OPTIONS: UserRole[] = ['系统管理员', '馆区管理员', '保管员', '研究员', '修复师'];

export const BORROW_STATUS_OPTIONS: BorrowRequestStatus[] = ['待审批', '已批准', '借展中', '已归还', '已拒绝', '已取消', '已逾期'];

export const REPAIR_STATUS_OPTIONS: RepairOrderStatus[] = ['待分配', '修复中', '待验收', '已完成', '已取消'];

export const REPAIR_PRIORITY_OPTIONS: RepairPriority[] = ['高', '中', '低'];

export const REPAIR_TYPE_OPTIONS = ['灯罩修复', '光源修复', '结构修复', '清洁保养', '其他修复'];

export const MUSEUM_TYPE_OPTIONS = ['主馆', '分馆', '合作馆'];

export const OPERATION_TYPE_OPTIONS: OperationType[] = ['创建', '编辑', '删除', '新增维护记录', '新增灯罩检查', '新增光源更换', '状态变更', '创建借展申请', '审批通过', '审批拒绝', '取消借展', '借出', '归还', '创建修复工单', '分配修复', '开始修复', '完成修复', '验收修复', '上传附件', '删除附件', '用户登录', '切换馆区', '导出数据'];

export const LOG_MODULE_OPTIONS: LogModule[] = ['藏品档案', '借展管理', '修复工单', '附件管理', '用户管理', '系统设置', '环境监测'];

export type EnvMonitorLocationType = '展柜' | '库房';
export type EnvMonitorDataType = '温度' | '湿度' | '照度' | '震动' | '盐雾';
export type RiskLevel = '低风险' | '中风险' | '高风险';
export type AlertStatus = '待处理' | '处理中' | '已确认' | '已忽略';
export type RectificationTaskStatus = '待整改' | '整改中' | '待验收' | '已完成' | '已取消';
export type SaltFogLevel = '无' | '轻微' | '中等' | '严重';

export interface EnvMonitorPoint {
	id: string;
	code: string;
	name: string;
	type: EnvMonitorLocationType;
	museumId: string;
	museumName: string;
	location: string;
	beaconLightIds: string[];
	beaconLightNames: string[];
	createdAt: string;
	updatedAt: string;
}

export interface EnvMonitorRecord {
	id: string;
	pointId: string;
	pointName: string;
	museumId: string;
	museumName: string;
	temperature: number;
	humidity: number;
	illuminance: number;
	vibration: number;
	saltFogLevel: SaltFogLevel;
	collectedAt: string;
	createdAt: string;
}

export interface EnvThresholdConfig {
	id: string;
	pointId: string;
	pointName: string;
	museumId: string;
	museumName: string;
	temperatureMin: number;
	temperatureMax: number;
	humidityMin: number;
	humidityMax: number;
	illuminanceMax: number;
	vibrationMax: number;
	saltFogMaxLevel: SaltFogLevel;
	createdAt: string;
	updatedAt: string;
}

export interface EnvAlert {
	id: string;
	pointId: string;
	pointName: string;
	museumId: string;
	museumName: string;
	alertType: EnvMonitorDataType;
	alertLevel: RiskLevel;
	threshold: string;
	actualValue: string;
	description: string;
	status: AlertStatus;
	recordId: string;
	confirmedBy?: string;
	confirmedAt?: string;
	confirmRemark?: string;
	createdAt: string;
	updatedAt: string;
}

export interface EnvRiskAssessment {
	id: string;
	beaconLightId: string;
	beaconLightName: string;
	beaconLightCode: string;
	museumId: string;
	museumName: string;
	pointId: string;
	pointName: string;
	riskLevel: RiskLevel;
	riskFactors: string[];
	description: string;
	assessmentDate: string;
	assessedBy: string;
	createdAt: string;
	updatedAt: string;
}

export interface RectificationTask {
	id: string;
	alertId?: string;
	alertType?: EnvMonitorDataType;
	pointId: string;
	pointName: string;
	museumId: string;
	museumName: string;
	title: string;
	description: string;
	beaconLightIds: string[];
	beaconLightNames: string[];
	riskLevel: RiskLevel;
	status: RectificationTaskStatus;
	assigneeId?: string;
	assigneeName?: string;
	createdBy: string;
	createdAt: string;
	dueDate?: string;
	startDate?: string;
	completeDate?: string;
	acceptanceDate?: string;
	rectificationResult?: string;
	acceptanceResult?: string;
	cancelReason?: string;
	remark?: string;
	updatedAt: string;
}

export const ENV_LOCATION_TYPE_OPTIONS: EnvMonitorLocationType[] = ['展柜', '库房'];
export const ENV_DATA_TYPE_OPTIONS: EnvMonitorDataType[] = ['温度', '湿度', '照度', '震动', '盐雾'];
export const RISK_LEVEL_OPTIONS: RiskLevel[] = ['低风险', '中风险', '高风险'];
export const ALERT_STATUS_OPTIONS: AlertStatus[] = ['待处理', '处理中', '已确认', '已忽略'];
export const RECTIFICATION_STATUS_OPTIONS: RectificationTaskStatus[] = ['待整改', '整改中', '待验收', '已完成', '已取消'];
export const SALT_FOG_LEVEL_OPTIONS: SaltFogLevel[] = ['无', '轻微', '中等', '严重'];
