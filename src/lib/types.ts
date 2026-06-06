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

export type AlertRuleType = '环境阈值' | '藏品状态' | '借展逾期' | '修复超时' | '自定义';
export type AlertRuleConditionOperator = '>' | '<' | '>=' | '<=' | '==' | '!=' | '包含' | '不包含';
export type AlertEscalationLevel = 1 | 2 | 3 | 4 | 5;

export interface AlertRuleCondition {
	id: string;
	field: string;
	operator: AlertRuleConditionOperator;
	value: string | number;
	logicOperator?: 'AND' | 'OR';
}

export interface AlertRuleAction {
	id: string;
	type: '站内通知' | '短信通知' | '邮件通知' | '创建整改任务' | '自动升级';
	target?: string;
	template?: string;
}

export interface AlertEscalationRule {
	id: string;
	level: AlertEscalationLevel;
	timeoutMinutes: number;
	notifyRoles: UserRole[];
	notifyUsers: string[];
	actions: AlertRuleAction[];
}

export interface AlertRule {
	id: string;
	name: string;
	description?: string;
	type: AlertRuleType;
	enabled: boolean;
	riskLevel: RiskLevel;
	conditions: AlertRuleCondition[];
	conditionLogic: 'ALL' | 'ANY';
	actions: AlertRuleAction[];
	escalationEnabled: boolean;
	escalationRules: AlertEscalationRule[];
	museumId?: string;
	museumName?: string;
	createdBy: string;
	createdAt: string;
	updatedAt: string;
}

export type NotificationChannel = '站内' | '短信' | '邮件';
export type NotificationType = '告警通知' | '升级通知' | '催办通知' | '系统通知' | '任务通知';
export type NotificationStatus = '未读' | '已读' | '已处理';

export interface Notification {
	id: string;
	userId: string;
	userName?: string;
	channel: NotificationChannel;
	type: NotificationType;
	title: string;
	content: string;
	alertId?: string;
	taskId?: string;
	meetingId?: string;
	status: NotificationStatus;
	readAt?: string;
	createdAt: string;
	museumId?: string;
	museumName?: string;
}

export type EmergencyMeetingStatus = '筹备中' | '进行中' | '已结束' | '已取消';
export type EmergencyMeetingPriority = '紧急' | '高' | '中' | '低';

export interface EmergencyMeetingParticipant {
	userId: string;
	userName: string;
	userRole: UserRole;
	museumId: string;
	museumName: string;
	status: '邀请中' | '已确认' | '已拒绝' | '已出席';
	joinedAt?: string;
	leftAt?: string;
}

export interface EmergencyMeetingMessage {
	id: string;
	meetingId: string;
	userId: string;
	userName: string;
	userRole: UserRole;
	content: string;
	timestamp: string;
	attachmentIds?: string[];
}

export interface EmergencyMeeting {
	id: string;
	title: string;
	description?: string;
	alertId?: string;
	riskLevel: RiskLevel;
	priority: EmergencyMeetingPriority;
	status: EmergencyMeetingStatus;
	initiatorId: string;
	initiatorName: string;
	museumId: string;
	museumName: string;
	participants: EmergencyMeetingParticipant[];
	messages: EmergencyMeetingMessage[];
	scheduledAt: string;
	startedAt?: string;
	endedAt?: string;
	conclusion?: string;
	actionItems?: string[];
	createdAt: string;
	updatedAt: string;
}

export type EmergencyPlanCategory = '环境突发事件' | '藏品损坏' | '自然灾害' | '安全事故' | '公共卫生' | '其他';
export type EmergencyPlanStatus = '草稿' | '已发布' | '已归档';

export interface EmergencyPlanStep {
	id: string;
	stepNumber: number;
	title: string;
	description: string;
	responsibleRole?: UserRole;
	durationMinutes?: number;
	requiredResources?: string[];
}

export interface EmergencyPlan {
	id: string;
	name: string;
	category: EmergencyPlanCategory;
	description?: string;
	riskLevel: RiskLevel;
	status: EmergencyPlanStatus;
	scope: string;
	steps: EmergencyPlanStep[];
	responsibleRoles: UserRole[];
	contactList: { name: string; role: string; phone: string; email: string }[];
	resources?: string[];
	version: string;
	museumId?: string;
	museumName?: string;
	createdBy: string;
	createdAt: string;
	updatedAt: string;
	publishedAt?: string;
}

export type DisposalTimelineEventType = '告警产生' | '告警确认' | '告警升级' | '创建整改' | '开始整改' | '完成整改' | '整改验收' | '应急会商' | '任务派发' | '状态变更' | '备注记录';

export interface DisposalTimelineEvent {
	id: string;
	alertId?: string;
	taskId?: string;
	beaconLightId?: string;
	eventType: DisposalTimelineEventType;
	title: string;
	description: string;
	operatorId?: string;
	operatorName?: string;
	operatorRole?: string;
	escalationLevel?: AlertEscalationLevel;
	fromStatus?: string;
	toStatus?: string;
	attachments?: { id: string; name: string }[];
	timestamp: string;
	museumId?: string;
	museumName?: string;
}

export type BatchTaskStatus = '待派发' | '已派发' | '进行中' | '已完成' | '已取消';
export type BatchTaskPriority = '高' | '中' | '低';

export interface BatchTaskItem {
	id: string;
	batchId: string;
	targetId: string;
	targetName: string;
	targetType: '航标灯' | '监测点' | '告警' | '整改任务';
	status: '待处理' | '处理中' | '已完成' | '失败';
	assigneeId?: string;
	assigneeName?: string;
	result?: string;
	errorMessage?: string;
	completedAt?: string;
}

export interface BatchTask {
	id: string;
	title: string;
	description?: string;
	type: '批量整改' | '批量巡检' | '批量修复' | '批量通知' | '其他';
	priority: BatchTaskPriority;
	status: BatchTaskStatus;
	totalCount: number;
	completedCount: number;
	failedCount: number;
	items: BatchTaskItem[];
	creatorId: string;
	creatorName: string;
	museumId?: string;
	museumName?: string;
	createdAt: string;
	dispatchedAt?: string;
	completedAt?: string;
	updatedAt: string;
}

export interface SLARecord {
	id: string;
	taskId: string;
	taskType: '整改任务' | '修复工单' | '告警响应';
	riskLevel: RiskLevel;
	createdAt: string;
	dueDate?: string;
	startedAt?: string;
	completedAt?: string;
	firstResponseAt?: string;
	slaTargetHours: number;
	actualHours?: number;
	firstResponseHours?: number;
	isOnTime: boolean;
	isFirstResponseOnTime: boolean;
	museumId?: string;
	museumName?: string;
}

export interface AlertClosureStats {
	totalAlerts: number;
	closedAlerts: number;
	closureRate: number;
	avgClosureHours: number;
	autoClosed: number;
	manualClosed: number;
	byRiskLevel: {
		level: RiskLevel;
		total: number;
		closed: number;
		closureRate: number;
		avgHours: number;
	}[];
	byType: {
		type: EnvMonitorDataType;
		total: number;
		closed: number;
		closureRate: number;
	}[];
	byMuseum: {
		museumId: string;
		museumName: string;
		total: number;
		closed: number;
		closureRate: number;
	}[];
	timeRange: {
		start: string;
		end: string;
	};
}

export interface RiskHeatmapData {
	museumId: string;
	museumName: string;
	location: string;
	locationType: EnvMonitorLocationType;
	pointId?: string;
	pointName?: string;
	riskLevel: RiskLevel;
	riskScore: number;
	alertCount: number;
	highRiskCount: number;
	mediumRiskCount: number;
	lowRiskCount: number;
	beaconLightCount: number;
	beaconLightNames: string[];
	lastUpdated: string;
}

export type ExportFormat = 'CSV' | 'Excel' | 'PDF';

export interface ExportRecord {
	id: string;
	type: string;
	format: ExportFormat;
	filters?: Record<string, any>;
	createdBy: string;
	createdAt: string;
	fileName: string;
	fileSize?: number;
	status: '处理中' | '已完成' | '失败';
}

export const ALERT_RULE_TYPE_OPTIONS: AlertRuleType[] = ['环境阈值', '藏品状态', '借展逾期', '修复超时', '自定义'];
export const ALERT_RULE_CONDITION_OPERATORS: AlertRuleConditionOperator[] = ['>', '<', '>=', '<=', '==', '!=', '包含', '不包含'];
export const ALERT_ESCALATION_LEVELS: AlertEscalationLevel[] = [1, 2, 3, 4, 5];
export const NOTIFICATION_CHANNEL_OPTIONS: NotificationChannel[] = ['站内', '短信', '邮件'];
export const NOTIFICATION_TYPE_OPTIONS: NotificationType[] = ['告警通知', '升级通知', '催办通知', '系统通知', '任务通知'];
export const NOTIFICATION_STATUS_OPTIONS: NotificationStatus[] = ['未读', '已读', '已处理'];
export const EMERGENCY_MEETING_STATUS_OPTIONS: EmergencyMeetingStatus[] = ['筹备中', '进行中', '已结束', '已取消'];
export const EMERGENCY_MEETING_PRIORITY_OPTIONS: EmergencyMeetingPriority[] = ['紧急', '高', '中', '低'];
export const EMERGENCY_PLAN_CATEGORY_OPTIONS: EmergencyPlanCategory[] = ['环境突发事件', '藏品损坏', '自然灾害', '安全事故', '公共卫生', '其他'];
export const EMERGENCY_PLAN_STATUS_OPTIONS: EmergencyPlanStatus[] = ['草稿', '已发布', '已归档'];
export const DISPOSAL_TIMELINE_EVENT_TYPES: DisposalTimelineEventType[] = ['告警产生', '告警确认', '告警升级', '创建整改', '开始整改', '完成整改', '整改验收', '应急会商', '任务派发', '状态变更', '备注记录'];
export const BATCH_TASK_STATUS_OPTIONS: BatchTaskStatus[] = ['待派发', '已派发', '进行中', '已完成', '已取消'];
export const BATCH_TASK_PRIORITY_OPTIONS: BatchTaskPriority[] = ['高', '中', '低'];
export const EXPORT_FORMAT_OPTIONS: ExportFormat[] = ['CSV', 'Excel', 'PDF'];

export const SLA_TASK_TYPE_OPTIONS: ('整改任务' | '修复工单' | '告警响应')[] = ['整改任务', '修复工单', '告警响应'];
