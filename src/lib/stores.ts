import { writable, derived, get } from 'svelte/store';
import { generateId, getToday, validateBeaconLight, checkBorrowOverdue, isDateBefore, getDefaultExhibitionStatus, validateEnvMonitorPoint, validateEnvMonitorRecord, validateThresholdConfig, validateRectificationTask, checkEnvThreshold, calculateOverallRiskLevel, validateAlertRule, validateEmergencyMeeting, validateEmergencyPlan, validateBatchTask, shouldEscalateAlert, calculateAlertAgeMinutes, getNextEscalationLevel, calculateSLATargetHours, calculateRiskScore, formatDuration, exportToCSV as exportCSVUtil, downloadCSV as downloadCSVUtil } from './validation';
import type {
	BeaconLight,
	MaintenanceRecord,
	LampshadeInspection,
	LightSourceReplacement,
	ExhibitionStatusHistory,
	ExhibitionStatus,
	LampshadeStatus,
	LightSourceStatus,
	Museum,
	User,
	UserRole,
	BorrowRequest,
	BorrowRequestStatus,
	ApprovalRecord,
	RepairOrder,
	RepairOrderStatus,
	Attachment,
	OperationLog,
	OperationLogAction,
	EnvMonitorPoint,
	EnvMonitorRecord,
	EnvThresholdConfig,
	EnvAlert,
	EnvRiskAssessment,
	RectificationTask,
	EnvMonitorDataType,
	RiskLevel,
	AlertStatus,
	RectificationTaskStatus,
	AlertRule,
	Notification,
	EmergencyMeeting,
	EmergencyPlan,
	DisposalTimelineEvent,
	BatchTask,
	BatchTaskItem,
	SLARecord,
	AlertEscalationLevel,
	DisposalTimelineEventType
} from './types';

const STORAGE_KEY = 'beacon_light_platform_v2';

interface PersistentState {
	beaconLights: BeaconLight[];
	maintenanceRecords: MaintenanceRecord[];
	lampshadeInspections: LampshadeInspection[];
	lightSourceReplacements: LightSourceReplacement[];
	exhibitionStatusHistories: ExhibitionStatusHistory[];
	museums: Museum[];
	users: User[];
	borrowRequests: BorrowRequest[];
	repairOrders: RepairOrder[];
	attachments: Attachment[];
	operationLogs: OperationLog[];
	envMonitorPoints: EnvMonitorPoint[];
	envMonitorRecords: EnvMonitorRecord[];
	envThresholdConfigs: EnvThresholdConfig[];
	envAlerts: EnvAlert[];
	envRiskAssessments: EnvRiskAssessment[];
	rectificationTasks: RectificationTask[];
	alertRules: AlertRule[];
	notifications: Notification[];
	emergencyMeetings: EmergencyMeeting[];
	emergencyPlans: EmergencyPlan[];
	disposalTimelineEvents: DisposalTimelineEvent[];
	batchTasks: BatchTask[];
	slaRecords: SLARecord[];
	currentUserId: string;
	currentMuseumId: string;
}

function loadFromStorage(): PersistentState | null {
	if (typeof localStorage === 'undefined') return null;
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) {
			return JSON.parse(raw) as PersistentState;
		}
	} catch (e) {
		console.error('Failed to load from localStorage:', e);
	}
	return null;
}

function saveToStorage(state: Partial<PersistentState>) {
	if (typeof localStorage === 'undefined') return;
	try {
		const existing = loadFromStorage() || ({} as PersistentState);
		const toSave = { ...existing, ...state };
		localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
	} catch (e) {
		console.error('Failed to save to localStorage:', e);
	}
}

const mockMuseums: Museum[] = [
	{
		id: 'm1',
		name: '海事博物馆主馆',
		type: '主馆',
		address: '北京市朝阳区文博路1号',
		contact: '010-12345678',
		description: '国家级海事文物收藏与展示中心',
		createdAt: '2020-01-01',
		updatedAt: '2024-01-01'
	},
	{
		id: 'm2',
		name: '上海海事分馆',
		type: '分馆',
		address: '上海市浦东新区滨江大道88号',
		contact: '021-87654321',
		description: '华东地区海事文物展示分馆',
		createdAt: '2021-03-15',
		updatedAt: '2024-02-10'
	},
	{
		id: 'm3',
		name: '广州航海博物馆',
		type: '合作馆',
		address: '广州市海珠区阅江中路380号',
		contact: '020-11112222',
		description: '华南地区合作航海主题博物馆',
		createdAt: '2022-06-01',
		updatedAt: '2024-03-05'
	}
];

const mockUsers: User[] = [
	{
		id: 'u1',
		username: 'admin',
		fullName: '系统管理员',
		role: '系统管理员',
		museumId: 'm1',
		email: 'admin@museum.com',
		phone: '13800000001',
		createdAt: '2020-01-01',
		updatedAt: '2024-01-01'
	},
	{
		id: 'u2',
		username: 'curator1',
		fullName: '王馆长',
		role: '馆区管理员',
		museumId: 'm1',
		email: 'wang@museum.com',
		phone: '13800000002',
		createdAt: '2020-02-01',
		updatedAt: '2024-01-15'
	},
	{
		id: 'u3',
		username: 'keeper1',
		fullName: '张保管',
		role: '保管员',
		museumId: 'm1',
		email: 'zhang@museum.com',
		phone: '13800000003',
		createdAt: '2020-03-01',
		updatedAt: '2024-02-01'
	},
	{
		id: 'u4',
		username: 'researcher1',
		fullName: '李研究员',
		role: '研究员',
		museumId: 'm1',
		email: 'li@museum.com',
		phone: '13800000004',
		createdAt: '2021-01-01',
		updatedAt: '2024-01-20'
	},
	{
		id: 'u5',
		username: 'curator2',
		fullName: '陈馆长',
		role: '馆区管理员',
		museumId: 'm2',
		email: 'chen@shmuseum.com',
		phone: '13800000005',
		createdAt: '2021-04-01',
		updatedAt: '2024-02-15'
	},
	{
		id: 'u6',
		username: 'restorer1',
		fullName: '刘修复师',
		role: '修复师',
		museumId: 'm1',
		email: 'liu@museum.com',
		phone: '13800000006',
		createdAt: '2022-01-10',
		updatedAt: '2024-01-20'
	}
];

const mockBeaconLights: BeaconLight[] = [
	{
		id: '1',
		code: 'HBD-001',
		name: '渤海老铁山灯塔灯器',
		manufactureYear: 1893,
		material: '铜制',
		originalSeaArea: '渤海',
		museumId: 'm1',
		museumName: '海事博物馆主馆',
		lampshadeStatus: '完好',
		lightSourceStatus: '正常',
		exhibitionStatus: '展出中',
		exhibitionLocation: '一楼展厅A区',
		isOnBorrow: false,
		isUnderRepair: false,
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
		museumId: 'm1',
		museumName: '海事博物馆主馆',
		lampshadeStatus: '轻微划痕',
		lightSourceStatus: '亮度不足',
		exhibitionStatus: '维护中',
		exhibitionLocation: '二楼展厅B区',
		isOnBorrow: false,
		isUnderRepair: true,
		currentRepairOrderId: 'ro1',
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
		museumId: 'm2',
		museumName: '上海海事分馆',
		lampshadeStatus: '裂纹',
		lightSourceStatus: '故障',
		exhibitionStatus: '库房存储',
		exhibitionLocation: '文物库房3号柜',
		isOnBorrow: false,
		isUnderRepair: false,
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
		museumId: 'm1',
		museumName: '海事博物馆主馆',
		lampshadeStatus: '破损',
		lightSourceStatus: '已更换',
		exhibitionStatus: '不可展出',
		exhibitionLocation: '修复工作室',
		isOnBorrow: false,
		isUnderRepair: false,
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
		museumId: 'm3',
		museumName: '广州航海博物馆',
		lampshadeStatus: '完好',
		lightSourceStatus: '正常',
		exhibitionStatus: '可展出',
		exhibitionLocation: '一楼展厅C区',
		isOnBorrow: true,
		currentBorrowId: 'br1',
		isUnderRepair: false,
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
		museumId: 'm2',
		museumName: '上海海事分馆',
		lampshadeStatus: '完好',
		lightSourceStatus: '正常',
		exhibitionStatus: '展出中',
		exhibitionLocation: '二楼展厅A区',
		isOnBorrow: false,
		isUnderRepair: false,
		createdAt: '2022-03-18',
		updatedAt: '2024-03-05'
	}
];

const mockMaintenanceRecords: MaintenanceRecord[] = [
	{ id: 'm1', beaconLightId: '1', date: '2024-03-20', type: '常规维护', description: '清洁灯罩，检查电路', operator: '张保管' },
	{ id: 'm2', beaconLightId: '2', date: '2024-05-10', type: '光源更换', description: '更换LED光源', operator: '张保管', replaceReason: '亮度不足' },
	{ id: 'm3', beaconLightId: '3', date: '2024-02-28', type: '灯罩检查', description: '发现裂纹，建议修复', operator: '张保管' },
	{ id: 'm4', beaconLightId: '1', date: '2024-01-15', type: '常规维护', description: '例行检查，状态良好', operator: '张保管' },
	{ id: 'm5', beaconLightId: '5', date: '2024-04-10', type: '常规维护', description: '清洁保养', operator: '李研究员' }
];

const mockLampshadeInspections: LampshadeInspection[] = [
	{ id: 'l1', beaconLightId: '1', date: '2024-03-20', inspector: '张保管', status: '完好', findings: '灯罩透明，无划痕' },
	{ id: 'l2', beaconLightId: '2', date: '2024-04-15', inspector: '张保管', status: '轻微划痕', findings: '表面有细微划痕，不影响使用' },
	{ id: 'l3', beaconLightId: '3', date: '2024-02-28', inspector: '张保管', status: '裂纹', findings: '边缘有裂纹，需修复' },
	{ id: 'l4', beaconLightId: '4', date: '2024-04-15', inspector: '张保管', status: '破损', findings: '大面积破损，需更换' }
];

const mockLightSourceReplacements: LightSourceReplacement[] = [
	{ id: 'r1', beaconLightId: '2', date: '2024-05-10', reason: '亮度不足，影响展示效果', oldSourceType: '白炽灯', newSourceType: 'LED灯', operator: '张保管' },
	{ id: 'r2', beaconLightId: '4', date: '2024-03-20', reason: '光源故障，无法点亮', oldSourceType: '卤素灯', newSourceType: 'LED灯', operator: '张保管' }
];

const mockExhibitionStatusHistories: ExhibitionStatusHistory[] = [
	{ id: 'e1', beaconLightId: '2', date: '2024-05-10', fromStatus: '展出中', toStatus: '维护中', operator: '王馆长', remark: '光源更换维护' },
	{ id: 'e2', beaconLightId: '3', date: '2024-02-28', fromStatus: '展出中', toStatus: '库房存储', operator: '王馆长', remark: '灯罩裂纹，撤展入库' },
	{ id: 'e3', beaconLightId: '5', date: '2024-01-20', fromStatus: '库房存储', toStatus: '可展出', operator: '王馆长', remark: '修复完成，待展出' }
];

const mockBorrowRequests: BorrowRequest[] = [
	{
		id: 'br1',
		beaconLightId: '5',
		beaconLightName: '大沽灯塔棱镜组',
		beaconLightCode: 'HBD-005',
		sourceMuseumId: 'm3',
		sourceMuseumName: '广州航海博物馆',
		targetMuseumId: 'm1',
		targetMuseumName: '海事博物馆主馆',
		applicantId: 'u3',
		applicantName: '张保管',
		applyDate: '2024-05-01',
		plannedStartDate: '2024-05-15',
		plannedEndDate: '2024-08-15',
		actualStartDate: '2024-05-16',
		purpose: '配合"近代航海科技展"专题展览',
		exhibitionLocation: '三楼特展厅',
		status: '借展中',
		approvalHistory: [
			{
				id: 'ar1',
				approverId: 'u5',
				approverName: '陈馆长',
				approverRole: '馆区管理员',
				action: '通过',
				comment: '同意出借，请妥善保管',
				timestamp: '2024-05-05 10:30:00'
			},
			{
				id: 'ar2',
				approverId: 'u2',
				approverName: '王馆长',
				approverRole: '馆区管理员',
				action: '通过',
				comment: '已安排接收',
				timestamp: '2024-05-10 14:20:00'
			}
		],
		remark: '需特别注意防震',
		createdAt: '2024-05-01',
		updatedAt: '2024-05-16'
	},
	{
		id: 'br2',
		beaconLightId: '1',
		beaconLightName: '渤海老铁山灯塔灯器',
		beaconLightCode: 'HBD-001',
		sourceMuseumId: 'm1',
		sourceMuseumName: '海事博物馆主馆',
		targetMuseumId: 'm2',
		targetMuseumName: '上海海事分馆',
		applicantId: 'u5',
		applicantName: '陈馆长',
		applyDate: '2024-06-01',
		plannedStartDate: '2024-07-01',
		plannedEndDate: '2024-09-30',
		purpose: '上海分馆"百年灯塔"专题展',
		exhibitionLocation: '主展厅一号位',
		status: '待审批',
		currentApproverRole: '馆区管理员',
		approvalHistory: [
			{
				id: 'ar3',
				approverId: 'u5',
				approverName: '陈馆长',
				approverRole: '馆区管理员',
				action: '提交',
				comment: '申请借展',
				timestamp: '2024-06-01 09:00:00'
			}
		],
		remark: '希望能延长至年底',
		createdAt: '2024-06-01',
		updatedAt: '2024-06-01'
	}
];

const mockRepairOrders: RepairOrder[] = [
	{
		id: 'ro1',
		beaconLightId: '2',
		beaconLightName: '黄海成山号灯船灯器',
		beaconLightCode: 'HBD-002',
		museumId: 'm1',
		museumName: '海事博物馆主馆',
		reporterId: 'u3',
		reporterName: '张保管',
		reportDate: '2024-05-08',
		createDate: '2024-05-08',
		repairType: '光源修复',
		priority: '中',
		description: '光源亮度不足，影响展示效果，需检修或更换',
		assignedTo: 'u6',
		assignedToName: '刘修复师',
		assigneeId: 'u6',
		assigneeName: '刘修复师',
		assignDate: '2024-05-09',
		repairStartDate: '2024-05-10',
		status: '修复中',
		cost: 2500,
		remark: '已订购LED光源组件',
		createdAt: '2024-05-08',
		updatedAt: '2024-05-10'
	},
	{
		id: 'ro2',
		beaconLightId: '4',
		beaconLightName: '南海诸岛灯塔灯器',
		beaconLightCode: 'HBD-004',
		museumId: 'm1',
		museumName: '海事博物馆主馆',
		reporterId: 'u3',
		reporterName: '张保管',
		reportDate: '2024-04-20',
		createDate: '2024-04-20',
		repairType: '灯罩修复',
		priority: '高',
		description: '灯罩大面积破损，需专业修复',
		assignedTo: 'u6',
		assignedToName: '刘修复师',
		assigneeId: 'u6',
		assigneeName: '刘修复师',
		assignDate: '2024-04-22',
		repairPlan: '联系专业玻璃修复机构，评估修复方案',
		status: '待分配',
		remark: '修复难度较大',
		createdAt: '2024-04-20',
		updatedAt: '2024-04-22'
	}
];

const mockAttachments: Attachment[] = [
	{
		id: 'att1',
		beaconLightId: '1',
		fileName: '老铁山灯塔灯器正面照.jpg',
		fileType: 'image/jpeg',
		fileSize: 2048000,
		uploadedBy: '张保管',
		uploadedAt: '2024-03-20',
		url: '#att1'
	},
	{
		id: 'att2',
		repairOrderId: 'ro2',
		fileName: '灯罩破损情况说明.pdf',
		fileType: 'application/pdf',
		fileSize: 1024000,
		uploadedBy: '李研究员',
		uploadedAt: '2024-04-22',
		url: '#att2'
	}
];

const mockOperationLogs: OperationLog[] = [
	{
		id: 'log1',
		userId: 'u2',
		userName: '王馆长',
		userRole: '馆区管理员',
		museumId: 'm1',
		museumName: '海事博物馆主馆',
		action: '创建',
		targetType: '航标灯',
		targetId: '1',
		targetName: '渤海老铁山灯塔灯器',
		detail: '创建航标灯档案',
		timestamp: '2024-03-20 10:00:00'
	},
	{
		id: 'log2',
		userId: 'u3',
		userName: '张保管',
		userRole: '保管员',
		museumId: 'm1',
		museumName: '海事博物馆主馆',
		action: '新增维护记录',
		targetType: '航标灯',
		targetId: '1',
		targetName: '渤海老铁山灯塔灯器',
		detail: '新增常规维护记录：清洁灯罩，检查电路',
		timestamp: '2024-03-20 14:30:00'
	},
	{
		id: 'log3',
		userId: 'u5',
		userName: '陈馆长',
		userRole: '馆区管理员',
		museumId: 'm2',
		museumName: '上海海事分馆',
		action: '创建借展申请',
		targetType: '借展申请',
		targetId: 'br2',
		targetName: '渤海老铁山灯塔灯器借展申请',
		detail: '提交借展申请，从主馆借展至上海分馆',
		timestamp: '2024-06-01 09:00:00'
	}
];

const mockEnvMonitorPoints: EnvMonitorPoint[] = [
	{
		id: 'ep1',
		code: 'Z-G-001',
		name: '主馆一楼A展柜',
		type: '展柜',
		museumId: 'm1',
		museumName: '海事博物馆主馆',
		location: '一楼展厅A区',
		beaconLightIds: ['1'],
		beaconLightNames: ['渤海老铁山灯塔灯器'],
		createdAt: '2024-01-01',
		updatedAt: '2024-03-01'
	},
	{
		id: 'ep2',
		code: 'Z-G-002',
		name: '主馆二楼B展柜',
		type: '展柜',
		museumId: 'm1',
		museumName: '海事博物馆主馆',
		location: '二楼展厅B区',
		beaconLightIds: ['2'],
		beaconLightNames: ['黄海成山号灯船灯器'],
		createdAt: '2024-01-05',
		updatedAt: '2024-03-05'
	},
	{
		id: 'ep3',
		code: 'K-F-001',
		name: '主馆文物库房3号柜',
		type: '库房',
		museumId: 'm1',
		museumName: '海事博物馆主馆',
		location: '地下一层库房',
		beaconLightIds: ['3', '4'],
		beaconLightNames: ['东海花鸟山灯塔透镜', '南海诸岛灯塔灯器'],
		createdAt: '2024-01-10',
		updatedAt: '2024-02-28'
	},
	{
		id: 'ep4',
		code: 'Z-G-003',
		name: '上海分馆二楼A展柜',
		type: '展柜',
		museumId: 'm2',
		museumName: '上海海事分馆',
		location: '二楼展厅A区',
		beaconLightIds: ['6'],
		beaconLightNames: ['长江口灯船灯器'],
		createdAt: '2024-02-01',
		updatedAt: '2024-03-10'
	},
	{
		id: 'ep5',
		code: 'Z-G-004',
		name: '广州馆一楼C展柜',
		type: '展柜',
		museumId: 'm3',
		museumName: '广州航海博物馆',
		location: '一楼展厅C区',
		beaconLightIds: ['5'],
		beaconLightNames: ['大沽灯塔棱镜组'],
		createdAt: '2024-02-15',
		updatedAt: '2024-03-15'
	}
];

function generateMockEnvRecords(): EnvMonitorRecord[] {
	const records: EnvMonitorRecord[] = [];
	const points = mockEnvMonitorPoints;
	const now = new Date();

	for (let i = 30; i >= 0; i--) {
		const date = new Date(now);
		date.setDate(date.getDate() - i);

		points.forEach((point, pointIdx) => {
			const baseTemp = 22 + pointIdx * 0.5;
			const baseHum = 50 + pointIdx * 2;
			const tempVariation = Math.sin(i * 0.3 + pointIdx) * 3;
			const humVariation = Math.cos(i * 0.25 + pointIdx) * 5;

			let temperature = Math.round((baseTemp + tempVariation + (Math.random() - 0.5) * 2) * 10) / 10;
			let humidity = Math.round((baseHum + humVariation + (Math.random() - 0.5) * 4) * 10) / 10;
			let illuminance = Math.round(150 + Math.sin(i * 0.4) * 50 + Math.random() * 30);
			let vibration = Math.round((0.05 + Math.random() * 0.1) * 100) / 100;

			if (i === 5 && point.id === 'ep3') {
				temperature = 28.5;
				humidity = 70;
				illuminance = 50;
				vibration = 0.3;
			}
			if (i === 3 && point.id === 'ep1') {
				illuminance = 280;
			}

			const saltFogLevels = ['无', '无', '无', '轻微'] as const;
			const saltFogLevel = saltFogLevels[Math.floor(Math.random() * saltFogLevels.length)];

			records.push({
				id: `er_${i}_${point.id}`,
				pointId: point.id,
				pointName: point.name,
				museumId: point.museumId,
				museumName: point.museumName,
				temperature,
				humidity,
				illuminance,
				vibration,
				saltFogLevel,
				collectedAt: date.toISOString().slice(0, 10) + ' 10:00:00',
				createdAt: date.toISOString().slice(0, 10)
			});
		});
	}

	return records.sort((a, b) => b.collectedAt.localeCompare(a.collectedAt));
}

const mockEnvMonitorRecords = generateMockEnvRecords();

const mockEnvThresholdConfigs: EnvThresholdConfig[] = [
	{
		id: 'etc1',
		pointId: 'ep1',
		pointName: '主馆一楼A展柜',
		museumId: 'm1',
		museumName: '海事博物馆主馆',
		temperatureMin: 18,
		temperatureMax: 25,
		humidityMin: 40,
		humidityMax: 60,
		illuminanceMax: 200,
		vibrationMax: 0.2,
		saltFogMaxLevel: '轻微',
		createdAt: '2024-01-01',
		updatedAt: '2024-03-01'
	},
	{
		id: 'etc2',
		pointId: 'ep2',
		pointName: '主馆二楼B展柜',
		museumId: 'm1',
		museumName: '海事博物馆主馆',
		temperatureMin: 18,
		temperatureMax: 25,
		humidityMin: 40,
		humidityMax: 60,
		illuminanceMax: 150,
		vibrationMax: 0.2,
		saltFogMaxLevel: '轻微',
		createdAt: '2024-01-05',
		updatedAt: '2024-03-05'
	},
	{
		id: 'etc3',
		pointId: 'ep3',
		pointName: '主馆文物库房3号柜',
		museumId: 'm1',
		museumName: '海事博物馆主馆',
		temperatureMin: 15,
		temperatureMax: 22,
		humidityMin: 45,
		humidityMax: 55,
		illuminanceMax: 50,
		vibrationMax: 0.1,
		saltFogMaxLevel: '无',
		createdAt: '2024-01-10',
		updatedAt: '2024-02-28'
	},
	{
		id: 'etc4',
		pointId: 'ep4',
		pointName: '上海分馆二楼A展柜',
		museumId: 'm2',
		museumName: '上海海事分馆',
		temperatureMin: 18,
		temperatureMax: 25,
		humidityMin: 40,
		humidityMax: 60,
		illuminanceMax: 180,
		vibrationMax: 0.2,
		saltFogMaxLevel: '轻微',
		createdAt: '2024-02-01',
		updatedAt: '2024-03-10'
	},
	{
		id: 'etc5',
		pointId: 'ep5',
		pointName: '广州馆一楼C展柜',
		museumId: 'm3',
		museumName: '广州航海博物馆',
		temperatureMin: 20,
		temperatureMax: 26,
		humidityMin: 45,
		humidityMax: 65,
		illuminanceMax: 200,
		vibrationMax: 0.2,
		saltFogMaxLevel: '中等',
		createdAt: '2024-02-15',
		updatedAt: '2024-03-15'
	}
];

const mockEnvAlerts: EnvAlert[] = [
	{
		id: 'ea1',
		pointId: 'ep3',
		pointName: '主馆文物库房3号柜',
		museumId: 'm1',
		museumName: '海事博物馆主馆',
		alertType: '温度',
		alertLevel: '高风险',
		threshold: '15-22°C',
		actualValue: '28.5°C',
		description: '温度超高，当前28.5°C，阈值范围15-22°C',
		status: '待处理',
		recordId: 'er_5_ep3',
		createdAt: '2024-06-01 10:00:00',
		updatedAt: '2024-06-01 10:00:00'
	},
	{
		id: 'ea2',
		pointId: 'ep3',
		pointName: '主馆文物库房3号柜',
		museumId: 'm1',
		museumName: '海事博物馆主馆',
		alertType: '湿度',
		alertLevel: '中风险',
		threshold: '45-55%',
		actualValue: '70%',
		description: '湿度超高，当前70%，阈值范围45-55%',
		status: '待处理',
		recordId: 'er_5_ep3',
		createdAt: '2024-06-01 10:00:00',
		updatedAt: '2024-06-01 10:00:00'
	},
	{
		id: 'ea3',
		pointId: 'ep3',
		pointName: '主馆文物库房3号柜',
		museumId: 'm1',
		museumName: '海事博物馆主馆',
		alertType: '震动',
		alertLevel: '中风险',
		threshold: '≤0.1 mm/s',
		actualValue: '0.3 mm/s',
		description: '震动值超高，当前0.3 mm/s，阈值≤0.1 mm/s',
		status: '处理中',
		recordId: 'er_5_ep3',
		confirmedBy: '张保管',
		confirmedAt: '2024-06-01 14:30:00',
		confirmRemark: '已发现异常，正在排查原因',
		createdAt: '2024-06-01 10:00:00',
		updatedAt: '2024-06-01 14:30:00'
	},
	{
		id: 'ea4',
		pointId: 'ep1',
		pointName: '主馆一楼A展柜',
		museumId: 'm1',
		museumName: '海事博物馆主馆',
		alertType: '照度',
		alertLevel: '低风险',
		threshold: '≤200 lux',
		actualValue: '280 lux',
		description: '照度超高，当前280 lux，阈值≤200 lux',
		status: '已确认',
		recordId: 'er_3_ep1',
		confirmedBy: '王馆长',
		confirmedAt: '2024-06-03 09:15:00',
		confirmRemark: '因临时展览活动，已调整展柜位置，待活动结束后恢复',
		createdAt: '2024-06-03 10:00:00',
		updatedAt: '2024-06-03 09:15:00'
	}
];

const mockEnvRiskAssessments: EnvRiskAssessment[] = [
	{
		id: 'era1',
		beaconLightId: '3',
		beaconLightName: '东海花鸟山灯塔透镜',
		beaconLightCode: 'HBD-003',
		museumId: 'm1',
		museumName: '海事博物馆主馆',
		pointId: 'ep3',
		pointName: '主馆文物库房3号柜',
		riskLevel: '高风险',
		riskFactors: ['温度超高', '湿度过高', '震动超标'],
		description: '库房3号柜近期出现多项环境指标超标，对玻璃材质藏品存在较大风险，建议立即采取整改措施',
		assessmentDate: '2024-06-01',
		assessedBy: '王馆长',
		createdAt: '2024-06-01',
		updatedAt: '2024-06-01'
	},
	{
		id: 'era2',
		beaconLightId: '4',
		beaconLightName: '南海诸岛灯塔灯器',
		beaconLightCode: 'HBD-004',
		museumId: 'm1',
		museumName: '海事博物馆主馆',
		pointId: 'ep3',
		pointName: '主馆文物库房3号柜',
		riskLevel: '高风险',
		riskFactors: ['温度超高', '湿度过高', '震动超标'],
		description: '库房3号柜多项环境指标超标，钢制藏品存在锈蚀风险，需尽快整改',
		assessmentDate: '2024-06-01',
		assessedBy: '王馆长',
		createdAt: '2024-06-01',
		updatedAt: '2024-06-01'
	}
];

const mockRectificationTasks: RectificationTask[] = [
	{
		id: 'rt1',
		alertId: 'ea1',
		alertType: '温度',
		pointId: 'ep3',
		pointName: '主馆文物库房3号柜',
		museumId: 'm1',
		museumName: '海事博物馆主馆',
		title: '库房3号柜温湿度超标整改',
		description: '近期库房3号柜温度和湿度均出现超标情况，需排查空调系统运行状态，检查库房密封性，必要时增加除湿设备',
		beaconLightIds: ['3', '4'],
		beaconLightNames: ['东海花鸟山灯塔透镜', '南海诸岛灯塔灯器'],
		riskLevel: '高风险',
		status: '整改中',
		assigneeId: 'u3',
		assigneeName: '张保管',
		createdBy: '王馆长',
		createdAt: '2024-06-01',
		dueDate: '2024-06-10',
		startDate: '2024-06-02',
		remark: '优先处理玻璃材质藏品的保护',
		updatedAt: '2024-06-02'
	},
	{
		id: 'rt2',
		alertId: 'ea4',
		alertType: '照度',
		pointId: 'ep1',
		pointName: '主馆一楼A展柜',
		museumId: 'm1',
		museumName: '海事博物馆主馆',
		title: 'A展柜照度超标整改',
		description: 'A展柜照度临时超标，因展览活动调整了展柜位置，活动结束后需立即恢复原位置并检查光照强度',
		beaconLightIds: ['1'],
		beaconLightNames: ['渤海老铁山灯塔灯器'],
		riskLevel: '低风险',
		status: '已完成',
		assigneeId: 'u3',
		assigneeName: '张保管',
		createdBy: '王馆长',
		createdAt: '2024-06-03',
		startDate: '2024-06-03',
		completeDate: '2024-06-04',
		acceptanceDate: '2024-06-04',
		rectificationResult: '展柜已恢复原位，照度恢复正常',
		acceptanceResult: '验收通过，环境指标恢复正常',
		updatedAt: '2024-06-04'
	}
];

const mockAlertRules: AlertRule[] = [
	{
		id: 'ar1',
		name: '温度高风险告警规则',
		description: '监测点温度超过阈值上限50%时触发高风险告警',
		type: '环境阈值',
		enabled: true,
		riskLevel: '高风险',
		conditions: [
			{ id: 'c1', field: 'temperature', operator: '>', value: 25, logicOperator: 'AND' }
		],
		conditionLogic: 'ALL',
		actions: [
			{ id: 'a1', type: '站内通知', target: '保管员', template: '温度超标告警' },
			{ id: 'a2', type: '短信通知', target: '馆区管理员', template: '温度超标告警' }
		],
		escalationEnabled: true,
		escalationRules: [
			{ id: 'er1', level: 1, timeoutMinutes: 30, notifyRoles: ['保管员'], notifyUsers: [], actions: [{ id: 'ea1', type: '站内通知', target: '保管员' }] },
			{ id: 'er2', level: 2, timeoutMinutes: 60, notifyRoles: ['馆区管理员'], notifyUsers: [], actions: [{ id: 'ea2', type: '短信通知', target: '馆区管理员' }] },
			{ id: 'er3', level: 3, timeoutMinutes: 120, notifyRoles: ['系统管理员'], notifyUsers: [], actions: [{ id: 'ea3', type: '邮件通知', target: '系统管理员' }] }
		],
		createdBy: '系统管理员',
		createdAt: '2024-01-01',
		updatedAt: '2024-03-15'
	},
	{
		id: 'ar2',
		name: '湿度超标告警规则',
		description: '监测点湿度超过阈值时触发告警',
		type: '环境阈值',
		enabled: true,
		riskLevel: '中风险',
		conditions: [
			{ id: 'c1', field: 'humidity', operator: '>', value: 60, logicOperator: 'AND' }
		],
		conditionLogic: 'ALL',
		actions: [
			{ id: 'a1', type: '站内通知', target: '保管员', template: '湿度超标告警' }
		],
		escalationEnabled: true,
		escalationRules: [
			{ id: 'er1', level: 1, timeoutMinutes: 60, notifyRoles: ['保管员'], notifyUsers: [], actions: [{ id: 'ea1', type: '站内通知', target: '保管员' }] },
			{ id: 'er2', level: 2, timeoutMinutes: 180, notifyRoles: ['馆区管理员'], notifyUsers: [], actions: [{ id: 'ea2', type: '短信通知', target: '馆区管理员' }] }
		],
		createdBy: '系统管理员',
		createdAt: '2024-01-01',
		updatedAt: '2024-02-20'
	},
	{
		id: 'ar3',
		name: '借展逾期自动提醒',
		description: '借展到期前7天自动提醒，逾期自动升级',
		type: '借展逾期',
		enabled: true,
		riskLevel: '中风险',
		conditions: [
			{ id: 'c1', field: 'daysRemaining', operator: '<=', value: 7, logicOperator: 'AND' }
		],
		conditionLogic: 'ALL',
		actions: [
			{ id: 'a1', type: '站内通知', target: '馆区管理员', template: '借展到期提醒' }
		],
		escalationEnabled: false,
		escalationRules: [],
		createdBy: '系统管理员',
		createdAt: '2024-02-01',
		updatedAt: '2024-02-01'
	}
];

const mockNotifications: Notification[] = [
	{
		id: 'n1',
		userId: 'u2',
		userName: '王馆长',
		channel: '站内',
		type: '告警通知',
		title: '【高风险告警】主馆文物库房3号柜温度超标',
		content: '主馆文物库房3号柜当前温度28.5°C，超出阈值范围15-22°C，请及时处理。',
		alertId: 'ea1',
		status: '未读',
		createdAt: '2024-06-01 10:00:00',
		museumId: 'm1',
		museumName: '海事博物馆主馆'
	},
	{
		id: 'n2',
		userId: 'u2',
		userName: '王馆长',
		channel: '站内',
		type: '升级通知',
		title: '【告警升级】震动告警已升级至2级',
		content: '主馆文物库房3号柜震动告警超过30分钟未响应，已自动升级至2级，请馆区管理员关注。',
		alertId: 'ea3',
		status: '已读',
		readAt: '2024-06-01 15:00:00',
		createdAt: '2024-06-01 14:30:00',
		museumId: 'm1',
		museumName: '海事博物馆主馆'
	},
	{
		id: 'n3',
		userId: 'u3',
		userName: '张保管',
		channel: '短信',
		type: '任务通知',
		title: '您有新的整改任务待处理',
		content: '您被分配了"库房3号柜温湿度超标整改"任务，请及时处理。',
		taskId: 'rt1',
		status: '已读',
		readAt: '2024-06-02 09:00:00',
		createdAt: '2024-06-01 16:00:00',
		museumId: 'm1',
		museumName: '海事博物馆主馆'
	}
];

const mockEmergencyMeetings: EmergencyMeeting[] = [
	{
		id: 'em1',
		title: '库房温湿度超标应急会商会',
		description: '主馆文物库房3号柜多项环境指标超标，召开跨馆应急会商讨论处置方案。',
		alertId: 'ea1',
		riskLevel: '高风险',
		priority: '紧急',
		status: '进行中',
		initiatorId: 'u2',
		initiatorName: '王馆长',
		museumId: 'm1',
		museumName: '海事博物馆主馆',
		participants: [
			{ userId: 'u2', userName: '王馆长', userRole: '馆区管理员', museumId: 'm1', museumName: '海事博物馆主馆', status: '已出席', joinedAt: '2024-06-01 14:00:00' },
			{ userId: 'u5', userName: '陈馆长', userRole: '馆区管理员', museumId: 'm2', museumName: '上海海事分馆', status: '已出席', joinedAt: '2024-06-01 14:05:00' },
			{ userId: 'u3', userName: '张保管', userRole: '保管员', museumId: 'm1', museumName: '海事博物馆主馆', status: '已出席', joinedAt: '2024-06-01 14:02:00' },
			{ userId: 'u4', userName: '李研究员', userRole: '研究员', museumId: 'm1', museumName: '海事博物馆主馆', status: '已确认' }
		],
		messages: [
			{ id: 'm1', meetingId: 'em1', userId: 'u2', userName: '王馆长', userRole: '馆区管理员', content: '各位好，今天库房3号柜温度和湿度都超标了，我们开个紧急会议讨论一下处置方案。', timestamp: '2024-06-01 14:00:00' },
			{ id: 'm2', meetingId: 'em1', userId: 'u3', userName: '张保管', userRole: '保管员', content: '我已经去现场看过了，空调系统运行正常，但库房密封胶条有老化现象，可能是这个原因。', timestamp: '2024-06-01 14:05:00' },
			{ id: 'm3', meetingId: 'em1', userId: 'u5', userName: '陈馆长', userRole: '馆区管理员', content: '上海分馆之前也遇到过类似情况，建议先临时加放除湿设备，同时安排维修密封胶条。', timestamp: '2024-06-01 14:10:00' }
		],
		scheduledAt: '2024-06-01 14:00:00',
		startedAt: '2024-06-01 14:00:00',
		createdAt: '2024-06-01 13:50:00',
		updatedAt: '2024-06-01 14:10:00'
	}
];

const mockEmergencyPlans: EmergencyPlan[] = [
	{
		id: 'ep1',
		name: '环境温湿度超标应急预案',
		category: '环境突发事件',
		description: '针对展柜或库房温湿度超出安全阈值的应急处置预案',
		riskLevel: '高风险',
		status: '已发布',
		scope: '所有馆区的展柜和库房环境监测点',
		steps: [
			{ id: 's1', stepNumber: 1, title: '告警确认与初步评估', description: '保管员收到告警后15分钟内到达现场，确认告警真实性，评估影响范围和严重程度', responsibleRole: '保管员', durationMinutes: 15 },
			{ id: 's2', stepNumber: 2, title: '临时应急措施', description: '采取临时措施：调整空调温度、开启备用除湿机、转移易损藏品等', responsibleRole: '保管员', durationMinutes: 30, requiredResources: ['便携式温湿度计', '备用除湿机', '移动展柜'] },
			{ id: 's3', stepNumber: 3, title: '上报与升级', description: '高风险告警需立即上报馆区管理员，2小时内未解决需上报系统管理员', responsibleRole: '保管员', durationMinutes: 10 },
			{ id: 's4', stepNumber: 4, title: '故障排查与修复', description: '技术人员排查设备故障原因，进行维修或更换', responsibleRole: '修复师', durationMinutes: 120 },
			{ id: 's5', stepNumber: 5, title: '效果验证与记录', description: '修复后持续监测24小时，确认环境指标稳定恢复正常，记录完整处置过程', responsibleRole: '保管员', durationMinutes: 1440 }
		],
		responsibleRoles: ['馆区管理员', '保管员', '修复师'],
		contactList: [
			{ name: '王馆长', role: '馆区管理员', phone: '13800000002', email: 'wang@museum.com' },
			{ name: '张保管', role: '保管员', phone: '13800000003', email: 'zhang@museum.com' },
			{ name: '刘修复师', role: '修复师', phone: '13800000006', email: 'liu@museum.com' }
		],
		resources: ['便携式温湿度计', '备用除湿机', '移动展柜', '密封胶条', '空调遥控器'],
		version: 'v2.1',
		createdBy: '系统管理员',
		createdAt: '2024-01-01',
		updatedAt: '2024-03-15',
		publishedAt: '2024-03-15'
	},
	{
		id: 'ep2',
		name: '藏品损坏应急处置预案',
		category: '藏品损坏',
		description: '针对藏品发现损坏或状态恶化时的应急处置流程',
		riskLevel: '高风险',
		status: '已发布',
		scope: '所有馆藏航标灯类藏品',
		steps: [
			{ id: 's1', stepNumber: 1, title: '发现与保护', description: '发现藏品损坏后，立即停止操作，保持现场原状，做好防护措施', responsibleRole: '保管员', durationMinutes: 10 },
			{ id: 's2', stepNumber: 2, title: '上报与评估', description: '立即上报馆区管理员和研究员，进行初步评估和拍照记录', responsibleRole: '保管员', durationMinutes: 20 },
			{ id: 's3', stepNumber: 3, title: '应急会商', description: '组织跨馆专家进行应急会商，制定修复方案', responsibleRole: '馆区管理员', durationMinutes: 60 },
			{ id: 's4', stepNumber: 4, title: '实施修复', description: '按照修复方案实施修复工作，做好过程记录', responsibleRole: '修复师', durationMinutes: 480 }
		],
		responsibleRoles: ['馆区管理员', '保管员', '研究员', '修复师'],
		contactList: [
			{ name: '王馆长', role: '馆区管理员', phone: '13800000002', email: 'wang@museum.com' },
			{ name: '李研究员', role: '研究员', phone: '13800000004', email: 'li@museum.com' },
			{ name: '刘修复师', role: '修复师', phone: '13800000006', email: 'liu@museum.com' }
		],
		version: 'v1.5',
		createdBy: '系统管理员',
		createdAt: '2024-02-01',
		updatedAt: '2024-04-10',
		publishedAt: '2024-04-10'
	}
];

const mockDisposalTimelineEvents: DisposalTimelineEvent[] = [
	{
		id: 'dt1',
		alertId: 'ea1',
		eventType: '告警产生',
		title: '温度高风险告警',
		description: '主馆文物库房3号柜温度达到28.5°C，超出阈值范围，触发高风险告警',
		operatorName: '系统',
		operatorRole: '系统',
		timestamp: '2024-06-01 10:00:00',
		museumId: 'm1',
		museumName: '海事博物馆主馆'
	},
	{
		id: 'dt2',
		alertId: 'ea1',
		eventType: '告警确认',
		title: '保管员确认告警',
		description: '张保管已到达现场确认告警属实，温度确实超标',
		operatorId: 'u3',
		operatorName: '张保管',
		operatorRole: '保管员',
		fromStatus: '待处理',
		toStatus: '处理中',
		timestamp: '2024-06-01 10:25:00',
		museumId: 'm1',
		museumName: '海事博物馆主馆'
	},
	{
		id: 'dt3',
		alertId: 'ea1',
		eventType: '告警升级',
		title: '告警自动升级至2级',
		description: '告警超过30分钟未解决，已自动升级至2级，通知馆区管理员',
		operatorName: '系统',
		operatorRole: '系统',
		escalationLevel: 2,
		timestamp: '2024-06-01 10:35:00',
		museumId: 'm1',
		museumName: '海事博物馆主馆'
	},
	{
		id: 'dt4',
		alertId: 'ea1',
		eventType: '创建整改',
		title: '创建整改任务',
		description: '王馆长创建整改任务"库房3号柜温湿度超标整改"，分配给张保管',
		operatorId: 'u2',
		operatorName: '王馆长',
		operatorRole: '馆区管理员',
		timestamp: '2024-06-01 11:00:00',
		museumId: 'm1',
		museumName: '海事博物馆主馆'
	},
	{
		id: 'dt5',
		alertId: 'ea1',
		eventType: '应急会商',
		title: '召开跨馆应急会商',
		description: '召开"库房温湿度超标应急会商会"，上海分馆陈馆长分享处置经验',
		operatorId: 'u2',
		operatorName: '王馆长',
		operatorRole: '馆区管理员',
		timestamp: '2024-06-01 14:00:00',
		museumId: 'm1',
		museumName: '海事博物馆主馆'
	},
	{
		id: 'dt6',
		alertId: 'ea1',
		taskId: 'rt1',
		eventType: '开始整改',
		title: '整改工作开始',
		description: '张保管开始进行整改工作：临时加放除湿机，联系维修密封胶条',
		operatorId: 'u3',
		operatorName: '张保管',
		operatorRole: '保管员',
		fromStatus: '待整改',
		toStatus: '整改中',
		timestamp: '2024-06-02 09:00:00',
		museumId: 'm1',
		museumName: '海事博物馆主馆'
	}
];

const mockBatchTasks: BatchTask[] = [
	{
		id: 'bt1',
		title: '主馆展柜季度巡检',
		description: '对主馆所有展柜的环境监测设备进行季度巡检和校准',
		type: '批量巡检',
		priority: '中',
		status: '进行中',
		totalCount: 3,
		completedCount: 1,
		failedCount: 0,
		items: [
			{ id: 'bti1', batchId: 'bt1', targetId: 'ep1', targetName: '主馆一楼A展柜', targetType: '监测点', status: '已完成', assigneeId: 'u3', assigneeName: '张保管', result: '巡检完成，设备运行正常', completedAt: '2024-06-02 10:30:00' },
			{ id: 'bti2', batchId: 'bt1', targetId: 'ep2', targetName: '主馆二楼B展柜', targetType: '监测点', status: '处理中', assigneeId: 'u3', assigneeName: '张保管' },
			{ id: 'bti3', batchId: 'bt1', targetId: 'ep3', targetName: '主馆文物库房3号柜', targetType: '监测点', status: '待处理' }
		],
		creatorId: 'u2',
		creatorName: '王馆长',
		museumId: 'm1',
		museumName: '海事博物馆主馆',
		createdAt: '2024-06-01 09:00:00',
		dispatchedAt: '2024-06-01 09:30:00',
		updatedAt: '2024-06-02 10:30:00'
	},
	{
		id: 'bt2',
		title: '高风险告警批量整改通知',
		description: '对本周所有高风险告警发送批量整改通知',
		type: '批量通知',
		priority: '高',
		status: '已完成',
		totalCount: 2,
		completedCount: 2,
		failedCount: 0,
		items: [
			{ id: 'bti4', batchId: 'bt2', targetId: 'ea1', targetName: '温度高风险告警', targetType: '告警', status: '已完成', result: '通知已发送', completedAt: '2024-06-01 10:05:00' },
			{ id: 'bti5', batchId: 'bt2', targetId: 'ea2', targetName: '湿度中风险告警', targetType: '告警', status: '已完成', result: '通知已发送', completedAt: '2024-06-01 10:05:00' }
		],
		creatorId: 'u2',
		creatorName: '王馆长',
		museumId: 'm1',
		museumName: '海事博物馆主馆',
		createdAt: '2024-06-01 10:00:00',
		dispatchedAt: '2024-06-01 10:00:00',
		completedAt: '2024-06-01 10:05:00',
		updatedAt: '2024-06-01 10:05:00'
	}
];

const mockSLARecords: SLARecord[] = [
	{
		id: 'sla1',
		taskId: 'rt1',
		taskType: '整改任务',
		riskLevel: '高风险',
		createdAt: '2024-06-01 11:00:00',
		dueDate: '2024-06-02',
		startedAt: '2024-06-02 09:00:00',
		firstResponseAt: '2024-06-01 11:30:00',
		slaTargetHours: 24,
		firstResponseHours: 0.5,
		isFirstResponseOnTime: true,
		museumId: 'm1',
		museumName: '海事博物馆主馆'
	},
	{
		id: 'sla2',
		taskId: 'rt2',
		taskType: '整改任务',
		riskLevel: '低风险',
		createdAt: '2024-06-03 10:00:00',
		startedAt: '2024-06-03 14:00:00',
		completedAt: '2024-06-04 10:00:00',
		firstResponseAt: '2024-06-03 12:00:00',
		slaTargetHours: 168,
		actualHours: 24,
		firstResponseHours: 2,
		isOnTime: true,
		isFirstResponseOnTime: true,
		museumId: 'm1',
		museumName: '海事博物馆主馆'
	},
	{
		id: 'sla3',
		taskId: 'ea1',
		taskType: '告警响应',
		riskLevel: '高风险',
		createdAt: '2024-06-01 10:00:00',
		firstResponseAt: '2024-06-01 10:25:00',
		slaTargetHours: 1,
		firstResponseHours: 0.42,
		isFirstResponseOnTime: true,
		museumId: 'm1',
		museumName: '海事博物馆主馆'
	},
	{
		id: 'sla4',
		taskId: 'ro1',
		taskType: '修复工单',
		riskLevel: '中风险',
		createdAt: '2024-05-08 10:00:00',
		startedAt: '2024-05-10 09:00:00',
		slaTargetHours: 96,
		firstResponseHours: 47,
		isFirstResponseOnTime: true,
		museumId: 'm1',
		museumName: '海事博物馆主馆'
	}
];

const stored = loadFromStorage();

export const museums = writable<Museum[]>(stored?.museums || mockMuseums);
export const users = writable<User[]>(stored?.users || mockUsers);
export const beaconLights = writable<BeaconLight[]>(stored?.beaconLights || mockBeaconLights);
export const maintenanceRecords = writable<MaintenanceRecord[]>(stored?.maintenanceRecords || mockMaintenanceRecords);
export const lampshadeInspections = writable<LampshadeInspection[]>(stored?.lampshadeInspections || mockLampshadeInspections);
export const lightSourceReplacements = writable<LightSourceReplacement[]>(stored?.lightSourceReplacements || mockLightSourceReplacements);
export const exhibitionStatusHistories = writable<ExhibitionStatusHistory[]>(stored?.exhibitionStatusHistories || mockExhibitionStatusHistories);
export const borrowRequests = writable<BorrowRequest[]>(stored?.borrowRequests || mockBorrowRequests);
export const repairOrders = writable<RepairOrder[]>(stored?.repairOrders || mockRepairOrders);
export const attachments = writable<Attachment[]>(stored?.attachments || mockAttachments);
export const operationLogs = writable<OperationLog[]>(stored?.operationLogs || mockOperationLogs);
export const envMonitorPoints = writable<EnvMonitorPoint[]>(stored?.envMonitorPoints || mockEnvMonitorPoints);
export const envMonitorRecords = writable<EnvMonitorRecord[]>(stored?.envMonitorRecords || mockEnvMonitorRecords);
export const envThresholdConfigs = writable<EnvThresholdConfig[]>(stored?.envThresholdConfigs || mockEnvThresholdConfigs);
export const envAlerts = writable<EnvAlert[]>(stored?.envAlerts || mockEnvAlerts);
export const envRiskAssessments = writable<EnvRiskAssessment[]>(stored?.envRiskAssessments || mockEnvRiskAssessments);
export const rectificationTasks = writable<RectificationTask[]>(stored?.rectificationTasks || mockRectificationTasks);
export const alertRules = writable<AlertRule[]>(stored?.alertRules || mockAlertRules);
export const notifications = writable<Notification[]>(stored?.notifications || mockNotifications);
export const emergencyMeetings = writable<EmergencyMeeting[]>(stored?.emergencyMeetings || mockEmergencyMeetings);
export const emergencyPlans = writable<EmergencyPlan[]>(stored?.emergencyPlans || mockEmergencyPlans);
export const disposalTimelineEvents = writable<DisposalTimelineEvent[]>(stored?.disposalTimelineEvents || mockDisposalTimelineEvents);
export const batchTasks = writable<BatchTask[]>(stored?.batchTasks || mockBatchTasks);
export const slaRecords = writable<SLARecord[]>(stored?.slaRecords || mockSLARecords);

export const currentUserId = writable<string>(stored?.currentUserId || 'u2');
export const currentMuseumId = writable<string>(stored?.currentMuseumId || 'm1');
export const searchKeyword = writable<string>('');
export const exhibitionStatusFilter = writable<string>('');
export const lampshadeStatusFilter = writable<string>('');
export const lightSourceStatusFilter = writable<string>('');
export const museumFilter = writable<string>('');

export const currentUser = derived(
	[currentUserId, users],
	([$userId, $users]) => $users.find(u => u.id === $userId) || null
);

export const currentMuseum = derived(
	[currentMuseumId, museums],
	([$museumId, $museums]) => $museums.find(m => m.id === $museumId) || null
);

export const filteredBeaconLights = derived(
	[beaconLights, searchKeyword, currentMuseumId, currentUser, exhibitionStatusFilter, lampshadeStatusFilter, lightSourceStatusFilter, museumFilter],
	([$lights, $keyword, $museumId, $user, $exhibitionStatus, $lampshadeStatus, $lightSourceStatus, $museumFilter]) => {
		let result = $lights;

		if ($user?.role !== '系统管理员') {
			result = result.filter(l => l.museumId === $museumId);
		} else if ($museumFilter) {
			result = result.filter(l => l.museumId === $museumFilter);
		}

		if ($exhibitionStatus) {
			result = result.filter(l => l.exhibitionStatus === $exhibitionStatus);
		}

		if ($lampshadeStatus) {
			result = result.filter(l => l.lampshadeStatus === $lampshadeStatus);
		}

		if ($lightSourceStatus) {
			result = result.filter(l => l.lightSourceStatus === $lightSourceStatus);
		}

		if ($keyword.trim()) {
			const kw = $keyword.toLowerCase();
			result = result.filter(
				(l) =>
					l.code.toLowerCase().includes(kw) ||
					l.name.toLowerCase().includes(kw) ||
					l.material.toLowerCase().includes(kw) ||
					l.originalSeaArea.toLowerCase().includes(kw) ||
					l.exhibitionLocation.toLowerCase().includes(kw)
			);
		}
		return result;
	}
);

export const dashboardStats = derived(
	[beaconLights, borrowRequests, repairOrders, currentUser, currentMuseumId],
	([$lights, $borrows, $repairs, $user, $museumId]) => {
		let lights = $lights;
		let borrows = $borrows;
		let repairs = $repairs;

		if ($user?.role !== '系统管理员') {
			lights = $lights.filter(l => l.museumId === $museumId);
			borrows = $borrows.filter(b => b.sourceMuseumId === $museumId || b.targetMuseumId === $museumId);
			repairs = $repairs.filter(r => r.museumId === $museumId);
		}

		const today = getToday();
		const warningBorrows = borrows.filter(b => {
			if (b.status !== '借展中') return false;
			const endDate = new Date(b.plannedEndDate);
			const now = new Date(today);
			const diffDays = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
			return diffDays <= 7 && diffDays >= 0;
		});

		const overdueBorrows = borrows.filter(b => checkBorrowOverdue(b));

		const highPriorityRepairs = repairs.filter(r => r.status === '修复中' && r.priority === '高');
		const pendingRepairs = repairs.filter(r => r.status === '待分配');

		return {
			totalLights: lights.length,
			onExhibition: lights.filter(l => l.exhibitionStatus === '展出中').length,
			onBorrow: lights.filter(l => l.isOnBorrow).length,
			underRepair: lights.filter(l => l.isUnderRepair).length,
			totalBorrows: borrows.length,
			pendingApproval: borrows.filter(b => b.status === '待审批').length,
			activeBorrows: borrows.filter(b => b.status === '借展中').length,
			warningBorrows: warningBorrows.length,
			overdueBorrows: overdueBorrows.length,
			totalRepairs: repairs.length,
			activeRepairs: repairs.filter(r => r.status === '修复中').length,
			pendingRepairs: pendingRepairs.length,
			highPriorityRepairs: highPriorityRepairs.length
		};
	}
);

function persistAll() {
	saveToStorage({
		beaconLights: get(beaconLights),
		maintenanceRecords: get(maintenanceRecords),
		lampshadeInspections: get(lampshadeInspections),
		lightSourceReplacements: get(lightSourceReplacements),
		exhibitionStatusHistories: get(exhibitionStatusHistories),
		museums: get(museums),
		users: get(users),
		borrowRequests: get(borrowRequests),
		repairOrders: get(repairOrders),
		attachments: get(attachments),
		operationLogs: get(operationLogs),
		envMonitorPoints: get(envMonitorPoints),
		envMonitorRecords: get(envMonitorRecords),
		envThresholdConfigs: get(envThresholdConfigs),
		envAlerts: get(envAlerts),
		envRiskAssessments: get(envRiskAssessments),
		rectificationTasks: get(rectificationTasks),
		alertRules: get(alertRules),
		notifications: get(notifications),
		emergencyMeetings: get(emergencyMeetings),
		emergencyPlans: get(emergencyPlans),
		disposalTimelineEvents: get(disposalTimelineEvents),
		batchTasks: get(batchTasks),
		slaRecords: get(slaRecords),
		currentUserId: get(currentUserId),
		currentMuseumId: get(currentMuseumId)
	});
}

export function addOperationLog(params: {
	action: OperationLogAction;
	targetType: OperationLog['targetType'];
	targetId: string;
	targetName: string;
	detail: string;
}) {
	const user = get(currentUser);
	const museum = get(currentMuseum);
	const log: OperationLog = {
		id: generateId(),
		userId: user?.id || 'system',
		userName: user?.fullName || '系统',
		userRole: user?.role || '访客',
		museumId: museum?.id || '',
		museumName: museum?.name || '',
		action: params.action,
		targetType: params.targetType,
		targetId: params.targetId,
		targetName: params.targetName,
		detail: params.detail,
		timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19)
	};
	operationLogs.update(logs => [log, ...logs]);
	persistAll();
}

export function switchUser(userId: string) {
	const userList = get(users);
	const user = userList.find(u => u.id === userId);
	if (user) {
		currentUserId.set(userId);
		currentMuseumId.set(user.museumId);
		addOperationLog({
			action: '用户登录',
			targetType: '用户',
			targetId: userId,
			targetName: user.fullName,
			detail: `用户切换为：${user.fullName}（${user.role}）`
		});
		persistAll();
	}
}

export function switchMuseum(museumId: string) {
	const museum = get(museums).find(m => m.id === museumId);
	currentMuseumId.set(museumId);
	if (museum) {
		addOperationLog({
			action: '切换馆区',
			targetType: '馆区',
			targetId: museumId,
			targetName: museum.name,
			detail: `切换到馆区：${museum.name}`
		});
	}
	persistAll();
}

export function addBeaconLight(light: Omit<BeaconLight, 'id' | 'createdAt' | 'updatedAt' | 'isOnBorrow' | 'isUnderRepair' | 'museumName'>) {
	const museum = get(museums).find(m => m.id === light.museumId);
	const today = getToday();
	const newLight: BeaconLight = {
		...light,
		id: generateId(),
		museumName: museum?.name || '',
		isOnBorrow: false,
		isUnderRepair: false,
		createdAt: today,
		updatedAt: today
	};
	beaconLights.update((lights) => [...lights, newLight]);
	addOperationLog({
		action: '创建',
		targetType: '航标灯',
		targetId: newLight.id,
		targetName: newLight.name,
		detail: `创建航标灯档案：${newLight.code}`
	});
	persistAll();
	return newLight;
}

export function updateBeaconLight(id: string, updates: Partial<BeaconLight>) {
	const existing = get(beaconLights).find(l => l.id === id);
	const combined = { ...existing, ...updates };
	const validation = validateBeaconLight(combined, get(beaconLights), id);
	if (!validation.valid) {
		return { success: false, errors: validation.errors };
	}

	beaconLights.update((lights) =>
		lights.map((l) => (l.id === id ? { ...l, ...updates, updatedAt: getToday() } : l))
	);
	addOperationLog({
		action: '编辑',
		targetType: '航标灯',
		targetId: id,
		targetName: updates.name || existing?.name || '',
		detail: '编辑航标灯档案信息'
	});
	persistAll();
	return { success: true, errors: [] };
}

export function deleteBeaconLight(id: string) {
	const light = get(beaconLights).find(l => l.id === id);
	beaconLights.update((lights) => lights.filter((l) => l.id !== id));
	maintenanceRecords.update((records) => records.filter((r) => r.beaconLightId !== id));
	lampshadeInspections.update((inspections) => inspections.filter((i) => i.beaconLightId !== id));
	lightSourceReplacements.update((replacements) => replacements.filter((r) => r.beaconLightId !== id));
	exhibitionStatusHistories.update((histories) => histories.filter((h) => h.beaconLightId !== id));
	attachments.update(atts => atts.filter(a => a.beaconLightId !== id));
	if (light) {
		addOperationLog({
			action: '删除',
			targetType: '航标灯',
			targetId: id,
			targetName: light.name,
			detail: `删除航标灯档案：${light.code}`
		});
	}
	persistAll();
}

export function addMaintenanceRecord(record: Omit<MaintenanceRecord, 'id'>) {
	const newRecord: MaintenanceRecord = { ...record, id: generateId() };
	maintenanceRecords.update((records) => [...records, newRecord]);
	const light = get(beaconLights).find(l => l.id === record.beaconLightId);
	addOperationLog({
		action: '新增维护记录',
		targetType: '航标灯',
		targetId: record.beaconLightId,
		targetName: light?.name || '',
		detail: `新增${record.type}记录：${record.description}`
	});
	persistAll();
	return newRecord;
}

export function addLampshadeInspection(inspection: Omit<LampshadeInspection, 'id'>) {
	const newInspection: LampshadeInspection = { ...inspection, id: generateId() };
	lampshadeInspections.update((inspections) => [...inspections, newInspection]);

	const updates: Partial<BeaconLight> = { lampshadeStatus: inspection.status };
	if (inspection.status === '破损') {
		let fromStatus: ExhibitionStatus = '库房存储';
		beaconLights.update((lights) =>
			lights.map((l) => {
				if (l.id === inspection.beaconLightId) {
					fromStatus = l.exhibitionStatus;
					return { ...l, ...updates, exhibitionStatus: '不可展出' as const, updatedAt: getToday() };
				}
				return l;
			})
		);
		const history: Omit<ExhibitionStatusHistory, 'id'> = {
			beaconLightId: inspection.beaconLightId,
			date: getToday(),
			fromStatus,
			toStatus: '不可展出',
			operator: inspection.inspector,
			remark: '灯罩检查发现破损，自动标记为不可展出'
		};
		exhibitionStatusHistories.update((histories) => [...histories, { ...history, id: generateId() }]);
	} else {
		updateBeaconLight(inspection.beaconLightId, updates);
	}

	const light = get(beaconLights).find(l => l.id === inspection.beaconLightId);
	addOperationLog({
		action: '新增灯罩检查',
		targetType: '航标灯',
		targetId: inspection.beaconLightId,
		targetName: light?.name || '',
		detail: `新增灯罩检查记录，状态：${inspection.status}`
	});
	persistAll();
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

	const light = get(beaconLights).find(l => l.id === replacement.beaconLightId);
	addOperationLog({
		action: '新增光源更换',
		targetType: '航标灯',
		targetId: replacement.beaconLightId,
		targetName: light?.name || '',
		detail: `光源更换：${replacement.oldSourceType} → ${replacement.newSourceType}`
	});
	persistAll();
	return newReplacement;
}

export function changeExhibitionStatus(
	beaconLightId: string,
	toStatus: ExhibitionStatus,
	operator: string,
	remark: string
) {
	const riskValidation = validateExhibitionStatusChangeWithRisk(beaconLightId, toStatus);
	if (!riskValidation.valid) {
		return { success: false, errors: riskValidation.errors };
	}

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

	const light = get(beaconLights).find(l => l.id === beaconLightId);
	addOperationLog({
		action: '展陈流转',
		targetType: '航标灯',
		targetId: beaconLightId,
		targetName: light?.name || '',
		detail: `展陈状态变更：${fromStatus} → ${toStatus}`
	});
	persistAll();
	return { success: true, errors: [] };
}

export function createBorrowRequest(data: Omit<BorrowRequest, 'id' | 'status' | 'approvalHistory' | 'createdAt' | 'updatedAt' | 'beaconLightName' | 'beaconLightCode' | 'sourceMuseumName' | 'targetMuseumName' | 'applicantName'>) {
	const light = get(beaconLights).find(l => l.id === data.beaconLightId);
	const sourceMuseum = get(museums).find(m => m.id === data.sourceMuseumId);
	const targetMuseum = get(museums).find(m => m.id === data.targetMuseumId);
	const user = get(currentUser);

	if (!light || !sourceMuseum || !targetMuseum || !user) {
		return { success: false, errors: ['参数不完整'], request: null };
	}

	if (isBeaconLightHighRisk(data.beaconLightId)) {
		return { success: false, errors: ['高风险藏品不能发起借展申请'], request: null };
	}

	const approvalRecord: ApprovalRecord = {
		id: generateId(),
		approverId: user.id,
		approverName: user.fullName,
		approverRole: user.role,
		action: '提交',
		comment: '提交借展申请',
		timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19)
	};

	const request: BorrowRequest = {
		...data,
		id: generateId(),
		beaconLightName: light.name,
		beaconLightCode: light.code,
		sourceMuseumName: sourceMuseum.name,
		targetMuseumName: targetMuseum.name,
		applicantName: user.fullName,
		status: '待审批',
		currentApproverRole: '馆区管理员',
		approvalHistory: [approvalRecord],
		createdAt: getToday(),
		updatedAt: getToday()
	};

	borrowRequests.update(reqs => [...reqs, request]);
	addOperationLog({
		action: '创建借展申请',
		targetType: '借展申请',
		targetId: request.id,
		targetName: `${light.name}借展申请`,
		detail: `从${sourceMuseum.name}借展至${targetMuseum.name}，用途：${data.purpose}`
	});
	persistAll();
	return { success: true, errors: [], request };
}

export function approveBorrowRequest(requestId: string, action: '通过' | '拒绝', comment: string) {
	const user = get(currentUser);
	if (!user) return false;

	borrowRequests.update(reqs => {
		return reqs.map(req => {
			if (req.id !== requestId) return req;

			const record: ApprovalRecord = {
				id: generateId(),
				approverId: user.id,
				approverName: user.fullName,
				approverRole: user.role,
				action,
				comment,
				timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19)
			};

			let newStatus: BorrowRequestStatus = req.status;
			if (action === '拒绝') {
				newStatus = '已拒绝';
			} else if (action === '通过') {
				if (req.status === '待审批') {
					newStatus = '已批准';
				}
			}

			return {
				...req,
				status: newStatus,
				currentApproverRole: undefined,
				approvalHistory: [...req.approvalHistory, record],
				updatedAt: getToday()
			};
		});
	});

	const req = get(borrowRequests).find(r => r.id === requestId);
	if (req) {
		addOperationLog({
			action: '审批借展',
			targetType: '借展申请',
			targetId: requestId,
			targetName: `${req.beaconLightName}借展申请`,
			detail: `${user.fullName}${action}借展申请：${comment}`
		});
	}
	persistAll();
	return true;
}

export function startBorrow(requestId: string) {
	borrowRequests.update(reqs => {
		return reqs.map(req => {
			if (req.id !== requestId) return req;
			return { ...req, status: '借展中', actualStartDate: getToday(), updatedAt: getToday() };
		});
	});

	const req = get(borrowRequests).find(r => r.id === requestId);
	if (req) {
		beaconLights.update(lights =>
			lights.map(l => l.id === req.beaconLightId ? { ...l, isOnBorrow: true, currentBorrowId: requestId, updatedAt: getToday() } : l)
		);
		addOperationLog({
			action: '审批借展',
			targetType: '借展申请',
			targetId: requestId,
			targetName: `${req.beaconLightName}借展申请`,
			detail: '借展开始，藏品已借出'
		});
	}
	persistAll();
}

export function returnBorrow(requestId: string) {
	borrowRequests.update(reqs => {
		return reqs.map(req => {
			if (req.id !== requestId) return req;
			return { ...req, status: '已归还', actualEndDate: getToday(), updatedAt: getToday() };
		});
	});

	const req = get(borrowRequests).find(r => r.id === requestId);
	if (req) {
		beaconLights.update(lights =>
			lights.map(l => l.id === req.beaconLightId ? { ...l, isOnBorrow: false, currentBorrowId: undefined, updatedAt: getToday() } : l)
		);
		addOperationLog({
			action: '借展归还',
			targetType: '借展申请',
			targetId: requestId,
			targetName: `${req.beaconLightName}借展申请`,
			detail: '借展结束，藏品已归还'
		});
	}
	persistAll();
}

export function cancelBorrowRequest(requestId: string) {
	borrowRequests.update(reqs => {
		return reqs.map(req => {
			if (req.id !== requestId) return req;
			return { ...req, status: '已取消', updatedAt: getToday() };
		});
	});
	const req = get(borrowRequests).find(r => r.id === requestId);
	if (req) {
		addOperationLog({
			action: '取消借展',
			targetType: '借展申请',
			targetId: requestId,
			targetName: `${req.beaconLightName}借展申请`,
			detail: '取消借展申请'
		});
	}
	persistAll();
}

export function updateOverdueBorrows() {
	const today = getToday();
	let updatedCount = 0;
	borrowRequests.update(reqs => {
		return reqs.map(req => {
			if (req.status === '借展中' && isDateBefore(req.plannedEndDate, today)) {
				updatedCount++;
				return { ...req, status: '已逾期', updatedAt: today };
			}
			return req;
		});
	});
	if (updatedCount > 0) {
		persistAll();
	}
	return updatedCount;
}

export function createRepairOrder(data: Omit<RepairOrder, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'beaconLightName' | 'beaconLightCode' | 'museumName' | 'reporterName' | 'reportDate' | 'createDate'>) {
	const light = get(beaconLights).find(l => l.id === data.beaconLightId);
	const museum = get(museums).find(m => m.id === data.museumId);
	const user = get(currentUser);

	if (!light || !museum || !user) return null;

	const today = getToday();
	const order: RepairOrder = {
		...data,
		id: generateId(),
		beaconLightName: light.name,
		beaconLightCode: light.code,
		museumName: museum.name,
		reporterName: user.fullName,
		reportDate: today,
		createDate: today,
		status: '待分配',
		createdAt: today,
		updatedAt: today
	};

	repairOrders.update(orders => [...orders, order]);

	beaconLights.update(lights =>
		lights.map(l => l.id === data.beaconLightId
			? { ...l, isUnderRepair: true, currentRepairOrderId: order.id, exhibitionStatus: '维护中', updatedAt: getToday() }
			: l
		)
	);

	addOperationLog({
		action: '创建修复工单',
		targetType: '修复工单',
		targetId: order.id,
		targetName: `${light.name}修复工单`,
		detail: `创建${data.repairType}工单，优先级：${data.priority}`
	});
	persistAll();
	return order;
}

export function assignRepairOrder(orderId: string, assigneeId: string) {
	const assignee = get(users).find(u => u.id === assigneeId);
	if (!assignee) return false;
	if (assignee.role !== '修复师') return false;

	repairOrders.update(orders =>
		orders.map(o => o.id === orderId
			? { ...o, assignedTo: assigneeId, assignedToName: assignee.fullName, assignDate: getToday(), updatedAt: getToday() }
			: o
		)
	);

	const order = get(repairOrders).find(o => o.id === orderId);
	if (order) {
		addOperationLog({
			action: '分配修复',
			targetType: '修复工单',
			targetId: orderId,
			targetName: order.beaconLightName + '修复工单',
			detail: `分配给：${assignee.fullName}`
		});
	}
	persistAll();
	return true;
}

export function startRepair(orderId: string, repairPlan: string) {
	repairOrders.update(orders =>
		orders.map(o => o.id === orderId
			? { ...o, status: '修复中' as RepairOrderStatus, repairPlan, repairStartDate: getToday(), updatedAt: getToday() }
			: o
		)
	);

	const order = get(repairOrders).find(o => o.id === orderId);
	if (order) {
		addOperationLog({
			action: '开始修复',
			targetType: '修复工单',
			targetId: orderId,
			targetName: order.beaconLightName + '修复工单',
			detail: '开始修复工作'
		});
	}
	persistAll();
}

export function completeRepair(orderId: string) {
	repairOrders.update(orders =>
		orders.map(o => o.id === orderId
			? { ...o, status: '待验收' as RepairOrderStatus, repairEndDate: getToday(), updatedAt: getToday() }
			: o
		)
	);

	const order = get(repairOrders).find(o => o.id === orderId);
	if (order) {
		addOperationLog({
			action: '完成修复',
			targetType: '修复工单',
			targetId: orderId,
			targetName: order.beaconLightName + '修复工单',
			detail: '修复完成，等待验收'
		});
	}
	persistAll();
}

export function acceptRepair(orderId: string, result: string) {
	repairOrders.update(orders =>
		orders.map(o => o.id === orderId
			? { ...o, status: '已完成' as RepairOrderStatus, acceptanceDate: getToday(), acceptanceResult: result, updatedAt: getToday() }
			: o
		)
	);

	const order = get(repairOrders).find(o => o.id === orderId);
	if (order) {
		const light = get(beaconLights).find(l => l.id === order.beaconLightId);
		const defaultStatus = light ? getDefaultExhibitionStatus(light.lampshadeStatus) : '库房存储';
		beaconLights.update(lights =>
			lights.map(l => l.id === order.beaconLightId
				? { ...l, isUnderRepair: false, currentRepairOrderId: undefined, exhibitionStatus: defaultStatus, updatedAt: getToday() }
				: l
			)
		);
		addOperationLog({
			action: '验收修复',
			targetType: '修复工单',
			targetId: orderId,
			targetName: order.beaconLightName + '修复工单',
			detail: `修复验收通过：${result}`
		});
	}
	persistAll();
}

export function cancelRepairOrder(orderId: string, reason: string) {
	repairOrders.update(orders =>
		orders.map(o => o.id === orderId
			? { ...o, status: '已取消' as RepairOrderStatus, remark: reason, updatedAt: getToday() }
			: o
		)
	);

	const order = get(repairOrders).find(o => o.id === orderId);
	if (order) {
		const light = get(beaconLights).find(l => l.id === order.beaconLightId);
		const defaultStatus = light ? getDefaultExhibitionStatus(light.lampshadeStatus) : '库房存储';
		beaconLights.update(lights =>
			lights.map(l => l.id === order.beaconLightId
				? { ...l, isUnderRepair: false, currentRepairOrderId: undefined, exhibitionStatus: defaultStatus, updatedAt: getToday() }
				: l
			)
		);
		addOperationLog({
			action: '删除',
			targetType: '修复工单',
			targetId: orderId,
			targetName: order.beaconLightName + '修复工单',
			detail: `取消修复工单：${reason}`
		});
	}
	persistAll();
}

export function uploadAttachment(data: Omit<Attachment, 'id' | 'uploadedAt' | 'uploadedBy'>) {
	const user = get(currentUser);
	const attachment: Attachment = {
		...data,
		id: generateId(),
		uploadedBy: user?.fullName || '系统',
		uploadedAt: getToday()
	};

	attachments.update(atts => [...atts, attachment]);

	let targetName = data.fileName;
	let targetType: OperationLog['targetType'] = '附件';

	if (data.beaconLightId) {
		const light = get(beaconLights).find(l => l.id === data.beaconLightId);
		targetName = light?.name || data.fileName;
		targetType = '航标灯';
	} else if (data.repairOrderId) {
		const order = get(repairOrders).find(o => o.id === data.repairOrderId);
		targetName = order?.beaconLightName + '修复工单' || data.fileName;
		targetType = '修复工单';
	} else if (data.borrowRequestId) {
		const req = get(borrowRequests).find(r => r.id === data.borrowRequestId);
		targetName = req?.beaconLightName + '借展申请' || data.fileName;
		targetType = '借展申请';
	}

	addOperationLog({
		action: '上传附件',
		targetType,
		targetId: data.beaconLightId || data.repairOrderId || data.borrowRequestId || attachment.id,
		targetName,
		detail: `上传附件：${data.fileName}`
	});

	persistAll();
	return attachment;
}

export function deleteAttachment(attachmentId: string) {
	const att = get(attachments).find(a => a.id === attachmentId);
	attachments.update(atts => atts.filter(a => a.id !== attachmentId));
	if (att) {
		addOperationLog({
			action: '删除',
			targetType: '附件',
			targetId: attachmentId,
			targetName: att.fileName,
			detail: `删除附件：${att.fileName}`
		});
	}
	persistAll();
}

export function exportToCSV(type: 'beaconLights' | 'borrowRequests' | 'repairOrders' | 'operationLogs'): string {
	let data: any[] = [];
	let headers: string[] = [];

	switch (type) {
		case 'beaconLights':
			data = get(beaconLights).map(l => ({
				编号: l.code,
				名称: l.name,
				制造年代: l.manufactureYear,
				材质: l.material,
				原海域: l.originalSeaArea,
				所属馆区: l.museumName,
				灯罩状态: l.lampshadeStatus,
				光源状态: l.lightSourceStatus,
				展陈状态: l.exhibitionStatus,
				展陈位置: l.exhibitionLocation,
				是否借展: l.isOnBorrow ? '是' : '否',
				是否修复中: l.isUnderRepair ? '是' : '否',
				创建时间: l.createdAt,
				更新时间: l.updatedAt
			}));
			headers = ['编号', '名称', '制造年代', '材质', '原海域', '所属馆区', '灯罩状态', '光源状态', '展陈状态', '展陈位置', '是否借展', '是否修复中', '创建时间', '更新时间'];
			break;
		case 'borrowRequests':
			data = get(borrowRequests).map(b => ({
				申请编号: b.id,
				藏品编号: b.beaconLightCode,
				藏品名称: b.beaconLightName,
				出借馆区: b.sourceMuseumName,
				借入馆区: b.targetMuseumName,
				申请人: b.applicantName,
				申请日期: b.applyDate,
				计划开始: b.plannedStartDate,
				计划结束: b.plannedEndDate,
				实际开始: b.actualStartDate || '-',
				实际结束: b.actualEndDate || '-',
				状态: b.status,
				用途: b.purpose,
				展陈位置: b.exhibitionLocation
			}));
			headers = ['申请编号', '藏品编号', '藏品名称', '出借馆区', '借入馆区', '申请人', '申请日期', '计划开始', '计划结束', '实际开始', '实际结束', '状态', '用途', '展陈位置'];
			break;
		case 'repairOrders':
			data = get(repairOrders).map(r => ({
				工单编号: r.id,
				藏品编号: r.beaconLightCode,
				藏品名称: r.beaconLightName,
				所属馆区: r.museumName,
				报修人: r.reporterName,
				报修日期: r.reportDate,
				修复类型: r.repairType,
				优先级: r.priority,
				状态: r.status,
				负责人: r.assignedToName || '-',
				问题描述: r.description,
				费用: r.cost || '-'
			}));
			headers = ['工单编号', '藏品编号', '藏品名称', '所属馆区', '报修人', '报修日期', '修复类型', '优先级', '状态', '负责人', '问题描述', '费用'];
			break;
		case 'operationLogs':
			data = get(operationLogs).map(l => ({
				时间: l.timestamp,
				操作人: l.userName,
				角色: l.userRole,
				馆区: l.museumName,
				动作: l.action,
				目标类型: l.targetType,
				目标名称: l.targetName,
				详情: l.detail
			}));
			headers = ['时间', '操作人', '角色', '馆区', '动作', '目标类型', '目标名称', '详情'];
			break;
	}

	if (data.length === 0) return '';

	const csvContent = [
		headers.join(','),
		...data.map(row => headers.map(h => `"${(row[h] || '').toString().replace(/"/g, '""')}"`).join(','))
	].join('\n');

	addOperationLog({
		action: '导出数据',
		targetType: '航标灯',
		targetId: 'export',
		targetName: type,
		detail: `导出${type}数据，共${data.length}条记录`
	});

	return csvContent;
}

export function downloadCSV(content: string, filename: string) {
	if (!content) return;
	const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}

export function addEnvMonitorPoint(point: Omit<EnvMonitorPoint, 'id' | 'createdAt' | 'updatedAt' | 'museumName' | 'beaconLightNames'>) {
	const museum = get(museums).find(m => m.id === point.museumId);
	const lights = get(beaconLights).filter(l => point.beaconLightIds.includes(l.id));
	const today = getToday();

	const newPoint: EnvMonitorPoint = {
		...point,
		id: generateId(),
		museumName: museum?.name || '',
		beaconLightNames: lights.map(l => l.name),
		createdAt: today,
		updatedAt: today
	};

	const validation = validateEnvMonitorPoint(newPoint, get(envMonitorPoints));
	if (!validation.valid) {
		return { success: false, errors: validation.errors };
	}

	envMonitorPoints.update(points => [...points, newPoint]);
	addOperationLog({
		action: '创建',
		targetType: '航标灯',
		targetId: newPoint.id,
		targetName: newPoint.name,
		detail: `创建环境监测点：${newPoint.code} - ${newPoint.name}`
	});
	persistAll();
	return { success: true, errors: [], point: newPoint };
}

export function updateEnvMonitorPoint(id: string, updates: Partial<EnvMonitorPoint>) {
	const existing = get(envMonitorPoints).find(p => p.id === id);
	if (!existing) return { success: false, errors: ['监测点不存在'] };

	const combined = { ...existing, ...updates };
	const validation = validateEnvMonitorPoint(combined, get(envMonitorPoints), id);
	if (!validation.valid) {
		return { success: false, errors: validation.errors };
	}

	if (updates.beaconLightIds) {
		const lights = get(beaconLights).filter(l => updates.beaconLightIds!.includes(l.id));
		updates.beaconLightNames = lights.map(l => l.name);
	}

	envMonitorPoints.update(points =>
		points.map(p => p.id === id ? { ...p, ...updates, updatedAt: getToday() } : p)
	);
	addOperationLog({
		action: '编辑',
		targetType: '航标灯',
		targetId: id,
		targetName: updates.name || existing.name,
		detail: `编辑环境监测点：${existing.code}`
	});
	persistAll();
	return { success: true, errors: [] };
}

export function deleteEnvMonitorPoint(id: string) {
	const point = get(envMonitorPoints).find(p => p.id === id);
	envMonitorPoints.update(points => points.filter(p => p.id !== id));
	envMonitorRecords.update(records => records.filter(r => r.pointId !== id));
	envThresholdConfigs.update(configs => configs.filter(c => c.pointId !== id));
	envAlerts.update(alerts => alerts.filter(a => a.pointId !== id));
	envRiskAssessments.update(assessments => assessments.filter(a => a.pointId !== id));
	rectificationTasks.update(tasks => tasks.filter(t => t.pointId !== id));

	if (point) {
		addOperationLog({
			action: '删除',
			targetType: '航标灯',
			targetId: id,
			targetName: point.name,
			detail: `删除环境监测点：${point.code} - ${point.name}`
		});
	}
	persistAll();
}

export function addEnvMonitorRecord(record: Omit<EnvMonitorRecord, 'id' | 'createdAt' | 'pointName' | 'museumId' | 'museumName'>) {
	const point = get(envMonitorPoints).find(p => p.id === record.pointId);
	if (!point) return null;

	const newRecord: EnvMonitorRecord = {
		...record,
		id: generateId(),
		pointName: point.name,
		museumId: point.museumId,
		museumName: point.museumName,
		createdAt: getToday()
	};

	const validation = validateEnvMonitorRecord(newRecord);
	if (!validation.valid) {
		return { success: false, errors: validation.errors };
	}

	envMonitorRecords.update(records => [newRecord, ...records]);

	const thresholdConfig = get(envThresholdConfigs).find(c => c.pointId === record.pointId);
	if (thresholdConfig) {
		const { alerts } = checkEnvThreshold(newRecord, thresholdConfig);
		alerts.forEach(alert => {
			const envAlert: EnvAlert = {
				id: generateId(),
				pointId: record.pointId,
				pointName: point.name,
				museumId: point.museumId,
				museumName: point.museumName,
				alertType: alert.type,
				alertLevel: alert.level,
				threshold: alert.threshold,
				actualValue: alert.actual,
				description: alert.desc,
				status: '待处理',
				recordId: newRecord.id,
				createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
				updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19)
			};
			envAlerts.update(a => [envAlert, ...a]);
			addOperationLog({
				action: '创建',
				targetType: '航标灯',
				targetId: envAlert.id,
				targetName: point.name,
				detail: `环境告警：${alert.type}${alert.level}，${alert.desc}`
			});
		});

		if (alerts.length > 0) {
			updateRiskAssessment(record.pointId);
		}
	}

	addOperationLog({
		action: '新增维护记录',
		targetType: '航标灯',
		targetId: record.pointId,
		targetName: point.name,
		detail: `新增环境监测记录：温度${record.temperature}°C，湿度${record.humidity}%`
	});

	persistAll();
	return { success: true, errors: [], record: newRecord };
}

export function updateThresholdConfig(pointId: string, config: Omit<EnvThresholdConfig, 'id' | 'pointId' | 'pointName' | 'museumId' | 'museumName' | 'createdAt' | 'updatedAt'>) {
	const point = get(envMonitorPoints).find(p => p.id === pointId);
	if (!point) return { success: false, errors: ['监测点不存在'] };

	const existing = get(envThresholdConfigs).find(c => c.pointId === pointId);
	const today = getToday();

	const fullConfig = {
		...config,
		pointId,
		pointName: point.name,
		museumId: point.museumId,
		museumName: point.museumName
	};

	const validation = validateThresholdConfig(fullConfig);
	if (!validation.valid) {
		return { success: false, errors: validation.errors };
	}

	if (existing) {
		envThresholdConfigs.update(configs =>
			configs.map(c => c.id === existing.id ? { ...c, ...config, updatedAt: today } : c)
		);
		addOperationLog({
			action: '编辑',
			targetType: '航标灯',
			targetId: existing.id,
			targetName: point.name,
			detail: `更新环境阈值配置：${point.name}`
		});
	} else {
		const newConfig: EnvThresholdConfig = {
			...fullConfig,
			id: generateId(),
			createdAt: today,
			updatedAt: today
		};
		envThresholdConfigs.update(configs => [...configs, newConfig]);
		addOperationLog({
			action: '创建',
			targetType: '航标灯',
			targetId: newConfig.id,
			targetName: point.name,
			detail: `创建环境阈值配置：${point.name}`
		});
	}

	persistAll();
	return { success: true, errors: [] };
}

export function confirmEnvAlert(alertId: string, status: AlertStatus, remark: string) {
	const user = get(currentUser);
	const alert = get(envAlerts).find(a => a.id === alertId);
	if (!alert) return false;

	envAlerts.update(alerts =>
		alerts.map(a => a.id === alertId ? {
			...a,
			status,
			confirmedBy: user?.fullName || '',
			confirmedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
			confirmRemark: remark,
			updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19)
		} : a)
	);

	addOperationLog({
		action: '编辑',
		targetType: '航标灯',
		targetId: alertId,
		targetName: alert.pointName,
		detail: `告警处置：${alert.alertType}告警，状态变更为${status}，备注：${remark}`
	});

	persistAll();
	return true;
}

export function updateRiskAssessment(pointId: string) {
	const point = get(envMonitorPoints).find(p => p.id === pointId);
	if (!point) return;

	const pendingAlerts = get(envAlerts).filter(a => a.pointId === pointId && a.status !== '已忽略');
	const overallRisk = calculateOverallRiskLevel(pendingAlerts.map(a => ({ level: a.alertLevel })));

	const riskFactors = pendingAlerts.map(a => `${a.alertType}${a.alertLevel === '高风险' ? '严重' : a.alertLevel === '中风险' ? '中度' : '轻微'}超标`);
	const uniqueFactors = [...new Set(riskFactors)];

	point.beaconLightIds.forEach(beaconLightId => {
		const light = get(beaconLights).find(l => l.id === beaconLightId);
		if (!light) return;

		const existingAssessment = get(envRiskAssessments).find(
			a => a.beaconLightId === beaconLightId && a.pointId === pointId
		);

		const user = get(currentUser);
		const today = getToday();

		if (existingAssessment) {
			envRiskAssessments.update(assessments =>
				assessments.map(a => a.id === existingAssessment.id ? {
					...a,
					riskLevel: overallRisk,
					riskFactors: uniqueFactors,
					description: `${point.name}当前环境风险等级：${overallRisk}，风险因素：${uniqueFactors.join('、')}`,
					assessmentDate: today,
					assessedBy: user?.fullName || '系统',
					updatedAt: today
				} : a)
			);
		} else {
			const assessment: EnvRiskAssessment = {
				id: generateId(),
				beaconLightId,
				beaconLightName: light.name,
				beaconLightCode: light.code,
				museumId: point.museumId,
				museumName: point.museumName,
				pointId,
				pointName: point.name,
				riskLevel: overallRisk,
				riskFactors: uniqueFactors,
				description: `${point.name}当前环境风险等级：${overallRisk}，风险因素：${uniqueFactors.join('、')}`,
				assessmentDate: today,
				assessedBy: user?.fullName || '系统',
				createdAt: today,
				updatedAt: today
			};
			envRiskAssessments.update(assessments => [...assessments, assessment]);
		}

		if (overallRisk === '高风险') {
			if (light.exhibitionStatus === '可展出' || light.exhibitionStatus === '展出中') {
				beaconLights.update(lights =>
					lights.map(l => l.id === beaconLightId ? { ...l, exhibitionStatus: '库房存储' as const, updatedAt: getToday() } : l)
				);
				addOperationLog({
					action: '展陈流转',
					targetType: '航标灯',
					targetId: beaconLightId,
					targetName: light.name,
					detail: `高风险自动撤展：环境风险等级为高风险，自动从${light.exhibitionStatus}变更为库房存储`
				});
			}
		}
	});

	persistAll();
}

export function isBeaconLightHighRisk(beaconLightId: string): boolean {
	const assessments = get(envRiskAssessments).filter(a => a.beaconLightId === beaconLightId);
	return assessments.some(a => a.riskLevel === '高风险');
}

export function createRectificationTask(data: {
	alertId?: string;
	alertType?: EnvMonitorDataType;
	pointId: string;
	title: string;
	description: string;
	beaconLightIds: string[];
	riskLevel: RiskLevel;
	assigneeId?: string;
	dueDate?: string;
	remark?: string;
}) {
	const point = get(envMonitorPoints).find(p => p.id === data.pointId);
	const user = get(currentUser);
	if (!point || !user) return null;

	const lights = get(beaconLights).filter(l => data.beaconLightIds.includes(l.id));
	const today = getToday();

	const task: RectificationTask = {
		id: generateId(),
		alertId: data.alertId,
		alertType: data.alertType,
		pointId: data.pointId,
		pointName: point.name,
		museumId: point.museumId,
		museumName: point.museumName,
		title: data.title,
		description: data.description,
		beaconLightIds: data.beaconLightIds,
		beaconLightNames: lights.map(l => l.name),
		riskLevel: data.riskLevel,
		status: '待整改',
		assigneeId: data.assigneeId,
		assigneeName: data.assigneeId ? get(users).find(u => u.id === data.assigneeId)?.fullName : undefined,
		createdBy: user.fullName,
		createdAt: today,
		dueDate: data.dueDate,
		remark: data.remark,
		updatedAt: today
	};

	const validation = validateRectificationTask(task);
	if (!validation.valid) {
		return { success: false, errors: validation.errors };
	}

	rectificationTasks.update(tasks => [task, ...tasks]);
	addOperationLog({
		action: '创建整改任务',
		targetType: '整改任务',
		targetId: task.id,
		targetName: task.title,
		detail: `创建整改任务：${task.title}，风险等级：${task.riskLevel}`
	});

	persistAll();
	return { success: true, errors: [], task };
}

export function startRectificationTask(taskId: string) {
	const user = get(currentUser);
	const task = get(rectificationTasks).find(t => t.id === taskId);
	if (!task) return false;

	rectificationTasks.update(tasks =>
		tasks.map(t => t.id === taskId ? {
			...t,
			status: '整改中',
			startDate: getToday(),
			assigneeId: user?.id,
			assigneeName: user?.fullName,
			updatedAt: getToday()
		} : t)
	);

	addOperationLog({
		action: '开始整改',
		targetType: '整改任务',
		targetId: taskId,
		targetName: task.title,
		detail: `开始整改任务：${task.title}`
	});

	persistAll();
	return true;
}

export function completeRectificationTask(taskId: string, result: string) {
	const task = get(rectificationTasks).find(t => t.id === taskId);
	if (!task) return false;

	if (task.alertId) {
		const alert = get(envAlerts).find(a => a.id === task.alertId);
		if (alert && alert.status === '待处理') {
			return { success: false, error: '存在未处理的关联告警，不能完成整改任务' };
		}
	}

	rectificationTasks.update(tasks =>
		tasks.map(t => t.id === taskId ? {
			...t,
			status: '待验收',
			completeDate: getToday(),
			rectificationResult: result,
			updatedAt: getToday()
		} : t)
	);

	addOperationLog({
		action: '完成整改',
		targetType: '整改任务',
		targetId: taskId,
		targetName: task.title,
		detail: `完成整改任务：${task.title}，整改结果：${result}`
	});

	persistAll();
	return { success: true, error: null };
}

export function acceptRectificationTask(taskId: string, result: string) {
	const task = get(rectificationTasks).find(t => t.id === taskId);
	if (!task) return false;

	rectificationTasks.update(tasks =>
		tasks.map(t => t.id === taskId ? {
			...t,
			status: '已完成',
			acceptanceDate: getToday(),
			acceptanceResult: result,
			updatedAt: getToday()
		} : t)
	);

	addOperationLog({
		action: '验收整改',
		targetType: '整改任务',
		targetId: taskId,
		targetName: task.title,
		detail: `验收整改任务：${task.title}，验收结果：${result}`
	});

	persistAll();
	return true;
}

export function cancelRectificationTask(taskId: string, reason: string) {
	const task = get(rectificationTasks).find(t => t.id === taskId);
	if (!task) return false;

	if (task.alertId) {
		const alert = get(envAlerts).find(a => a.id === task.alertId);
		if (alert && (alert.status === '待处理' || alert.status === '处理中')) {
			return { success: false, error: '存在未处理的关联告警，不能取消整改任务' };
		}
	}

	rectificationTasks.update(tasks =>
		tasks.map(t => t.id === taskId ? {
			...t,
			status: '已取消',
			cancelReason: reason,
			updatedAt: getToday()
		} : t)
	);

	addOperationLog({
		action: '取消整改任务',
		targetType: '整改任务',
		targetId: taskId,
		targetName: task.title,
		detail: `取消整改任务：${task.title}，原因：${reason}`
	});

	persistAll();
	return { success: true, error: null };
}

export function assignRectificationTask(taskId: string, assigneeId: string) {
	const assignee = get(users).find(u => u.id === assigneeId);
	const task = get(rectificationTasks).find(t => t.id === taskId);
	if (!assignee || !task) return false;

	rectificationTasks.update(tasks =>
		tasks.map(t => t.id === taskId ? {
			...t,
			assigneeId,
			assigneeName: assignee.fullName,
			updatedAt: getToday()
		} : t)
	);

	addOperationLog({
		action: '编辑',
		targetType: '整改任务',
		targetId: taskId,
		targetName: task.title,
		detail: `分配整改任务给：${assignee.fullName}`
	});

	persistAll();
	return true;
}

export function canExhibitBeaconLight(beaconLightId: string): { can: boolean; reason?: string } {
	if (isBeaconLightHighRisk(beaconLightId)) {
		return { can: false, reason: '高风险藏品不能标记为可展出或借展中' };
	}
	return { can: true };
}

export function validateExhibitionStatusChangeWithRisk(
	beaconLightId: string,
	toStatus: ExhibitionStatus
): { valid: boolean; errors: string[] } {
	const errors: string[] = [];

	if ((toStatus === '可展出' || toStatus === '展出中') && isBeaconLightHighRisk(beaconLightId)) {
		errors.push('高风险藏品不能标记为可展出或展出中');
	}

	return { valid: errors.length === 0, errors };
}

export function addDisposalTimelineEvent(params: {
	alertId?: string;
	taskId?: string;
	beaconLightId?: string;
	eventType: DisposalTimelineEventType;
	title: string;
	description: string;
	escalationLevel?: AlertEscalationLevel;
	fromStatus?: string;
	toStatus?: string;
	museumId?: string;
	museumName?: string;
}) {
	const user = get(currentUser);
	const museum = get(currentMuseum);

	const event: DisposalTimelineEvent = {
		id: generateId(),
		alertId: params.alertId,
		taskId: params.taskId,
		beaconLightId: params.beaconLightId,
		eventType: params.eventType,
		title: params.title,
		description: params.description,
		operatorId: user?.id,
		operatorName: user?.fullName || '系统',
		operatorRole: user?.role || '系统',
		escalationLevel: params.escalationLevel,
		fromStatus: params.fromStatus,
		toStatus: params.toStatus,
		timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
		museumId: params.museumId || museum?.id,
		museumName: params.museumName || museum?.name
	};

	disposalTimelineEvents.update(events => [event, ...events]);
	persistAll();
	return event;
}

export function createAlertRule(data: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'> & { createdBy?: string }) {
	const user = get(currentUser);
	const museum = get(currentMuseum);
	const today = getToday();

	const rule: AlertRule = {
		...data,
		id: generateId(),
		createdBy: data.createdBy || user?.fullName || '系统',
		museumId: data.museumId || museum?.id,
		museumName: data.museumName || museum?.name,
		createdAt: today,
		updatedAt: today
	};

	const validation = validateAlertRule(rule);
	if (!validation.valid) {
		return { success: false, errors: validation.errors, rule: null };
	}

	alertRules.update(rules => [...rules, rule]);
	addOperationLog({
		action: '创建',
		targetType: '航标灯',
		targetId: rule.id,
		targetName: rule.name,
		detail: `创建预警规则：${rule.name}，类型：${rule.type}，风险等级：${rule.riskLevel}`
	});
	persistAll();
	return { success: true, errors: [], rule };
}

export function updateAlertRule(id: string, updates: Partial<AlertRule>) {
	const existing = get(alertRules).find(r => r.id === id);
	if (!existing) return { success: false, errors: ['规则不存在'] };

	const combined = { ...existing, ...updates };
	const validation = validateAlertRule(combined);
	if (!validation.valid) {
		return { success: false, errors: validation.errors };
	}

	alertRules.update(rules =>
		rules.map(r => r.id === id ? { ...r, ...updates, updatedAt: getToday() } : r)
	);
	addOperationLog({
		action: '编辑',
		targetType: '航标灯',
		targetId: id,
		targetName: updates.name || existing.name,
		detail: `编辑预警规则：${existing.name}`
	});
	persistAll();
	return { success: true, errors: [] };
}

export function deleteAlertRule(id: string) {
	const rule = get(alertRules).find(r => r.id === id);
	alertRules.update(rules => rules.filter(r => r.id !== id));

	if (rule) {
		addOperationLog({
			action: '删除',
			targetType: '航标灯',
			targetId: id,
			targetName: rule.name,
			detail: `删除预警规则：${rule.name}`
		});
	}
	persistAll();
}

export function toggleAlertRule(id: string, enabled: boolean) {
	alertRules.update(rules =>
		rules.map(r => r.id === id ? { ...r, enabled, updatedAt: getToday() } : r)
	);
	const rule = get(alertRules).find(r => r.id === id);
	if (rule) {
		addOperationLog({
			action: '编辑',
			targetType: '航标灯',
			targetId: id,
			targetName: rule.name,
			detail: `${enabled ? '启用' : '停用'}预警规则：${rule.name}`
		});
	}
	persistAll();
}

export function sendNotification(params: {
	userId: string;
	userName?: string;
	channel: Notification['channel'];
	type: Notification['type'];
	title: string;
	content: string;
	alertId?: string;
	taskId?: string;
	meetingId?: string;
	museumId?: string;
	museumName?: string;
}) {
	const museum = get(currentMuseum);

	const notification: Notification = {
		id: generateId(),
		userId: params.userId,
		userName: params.userName,
		channel: params.channel,
		type: params.type,
		title: params.title,
		content: params.content,
		alertId: params.alertId,
		taskId: params.taskId,
		meetingId: params.meetingId,
		status: '未读',
		createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
		museumId: params.museumId || museum?.id,
		museumName: params.museumName || museum?.name
	};

	notifications.update(notifs => [notification, ...notifs]);
	persistAll();
	return notification;
}

export function sendNotificationToRoles(params: {
	roles: UserRole[];
	channel: Notification['channel'];
	type: Notification['type'];
	title: string;
	content: string;
	alertId?: string;
	taskId?: string;
	meetingId?: string;
	museumId?: string;
}) {
	const userList = get(users);
	const museum = get(currentMuseum);
	const targetUsers = userList.filter(u => params.roles.includes(u.role) && (!params.museumId || u.museumId === params.museumId));

	const sentNotifications: Notification[] = [];
	targetUsers.forEach(user => {
		const notif = sendNotification({
			userId: user.id,
			userName: user.fullName,
			channel: params.channel,
			type: params.type,
			title: params.title,
			content: params.content,
			alertId: params.alertId,
			taskId: params.taskId,
			meetingId: params.meetingId,
			museumId: params.museumId || museum?.id,
			museumName: user.museumId === museum?.id ? museum?.name : undefined
		});
		sentNotifications.push(notif);
	});

	return sentNotifications;
}

export function markNotificationRead(notificationId: string) {
	notifications.update(notifs =>
		notifs.map(n => n.id === notificationId ? {
			...n,
			status: '已读',
			readAt: new Date().toISOString().replace('T', ' ').slice(0, 19)
		} : n)
	);
	persistAll();
}

export function markAllNotificationsRead(userId: string) {
	notifications.update(notifs =>
		notifs.map(n => n.userId === userId && n.status === '未读' ? {
			...n,
			status: '已读',
			readAt: new Date().toISOString().replace('T', ' ').slice(0, 19)
		} : n)
	);
	persistAll();
}

export const unreadNotificationCount = derived(
	[notifications, currentUserId],
	([$notifs, $userId]) => $notifs.filter(n => n.userId === $userId && n.status === '未读').length
);

export function escalateAlert(alertId: string, level: AlertEscalationLevel) {
	const alert = get(envAlerts).find(a => a.id === alertId);
	if (!alert) return { success: false, errors: ['告警不存在'] };

	const rule = get(alertRules).find(r => r.enabled && r.escalationEnabled);
	if (!rule) return { success: false, errors: ['未找到启用的升级规则'] };

	const escalationRule = rule.escalationRules.find(er => er.level === level);
	if (!escalationRule) return { success: false, errors: ['未找到对应等级的升级规则'] };

	if (escalationRule.notifyRoles.length > 0) {
		sendNotificationToRoles({
			roles: escalationRule.notifyRoles,
			channel: '站内',
			type: '升级通知',
			title: `【告警升级${level}级】${alert.pointName}${alert.alertType}告警`,
			content: `${alert.pointName}的${alert.alertType}告警超过${escalationRule.timeoutMinutes}分钟未响应，已自动升级至${level}级，请及时处理。\n告警详情：${alert.description}`,
			alertId: alert.id,
			museumId: alert.museumId
		});
	}

	addDisposalTimelineEvent({
		alertId: alert.id,
		eventType: '告警升级',
		title: `告警自动升级至${level}级`,
		description: `告警超过${escalationRule.timeoutMinutes}分钟未响应，已自动升级至${level}级`,
		escalationLevel: level,
		museumId: alert.museumId,
		museumName: alert.museumName
	});

	addOperationLog({
		action: '编辑',
		targetType: '航标灯',
		targetId: alertId,
		targetName: alert.pointName,
		detail: `告警升级至${level}级：${alert.alertType}${alert.alertLevel}`
	});

	persistAll();
	return { success: true, errors: [] };
}

export function checkAndEscalateAlerts() {
	const pendingAlerts = get(envAlerts).filter(a => a.status === '待处理' || a.status === '处理中');
	const rules = get(alertRules).filter(r => r.enabled && r.escalationEnabled);

	let escalatedCount = 0;

	pendingAlerts.forEach(alert => {
		const ageMinutes = calculateAlertAgeMinutes(alert.createdAt);

		rules.forEach(rule => {
			rule.escalationRules.forEach(escalationRule => {
				if (ageMinutes >= escalationRule.timeoutMinutes) {
					const existingEvents = get(disposalTimelineEvents).filter(
						e => e.alertId === alert.id && e.eventType === '告警升级' && e.escalationLevel === escalationRule.level
					);
					if (existingEvents.length === 0) {
						escalateAlert(alert.id, escalationRule.level);
						escalatedCount++;
					}
				}
			});
		});
	});

	return escalatedCount;
}

export function createEmergencyMeeting(data: {
	title: string;
	description?: string;
	alertId?: string;
	riskLevel: RiskLevel;
	priority: EmergencyMeeting['priority'];
	scheduledAt: string;
	participantUserIds: string[];
}) {
	const user = get(currentUser);
	const museum = get(currentMuseum);
	if (!user || !museum) return { success: false, errors: ['用户信息不完整'], meeting: null };

	const userList = get(users);
	const participants = data.participantUserIds.map(userId => {
		const u = userList.find(x => x.id === userId);
		return {
			userId,
			userName: u?.fullName || '',
			userRole: u?.role || '保管员',
			museumId: u?.museumId || '',
			museumName: u?.museumId === museum.id ? museum.name : (get(museums).find(m => m.id === u?.museumId)?.name || ''),
			status: '邀请中' as const
		};
	});

	const meeting: EmergencyMeeting = {
		id: generateId(),
		title: data.title,
		description: data.description,
		alertId: data.alertId,
		riskLevel: data.riskLevel,
		priority: data.priority,
		status: '筹备中',
		initiatorId: user.id,
		initiatorName: user.fullName,
		museumId: museum.id,
		museumName: museum.name,
		participants,
		messages: [],
		scheduledAt: data.scheduledAt,
		createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
		updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19)
	};

	const validation = validateEmergencyMeeting(meeting);
	if (!validation.valid) {
		return { success: false, errors: validation.errors, meeting: null };
	}

	emergencyMeetings.update(meetings => [meeting, ...meetings]);

	data.participantUserIds.forEach(userId => {
		sendNotification({
			userId,
			channel: '站内',
			type: '系统通知',
			title: `【应急会商邀请】${data.title}`,
			content: `${user.fullName}邀请您参加应急会商会：${data.title}\n时间：${data.scheduledAt}\n请及时确认参加。`,
			meetingId: meeting.id,
			museumId: museum.id,
			museumName: museum.name
		});
	});

	if (data.alertId) {
		addDisposalTimelineEvent({
			alertId: data.alertId,
			eventType: '应急会商',
			title: `召开应急会商：${data.title}`,
			description: `${user.fullName}发起应急会商，共${data.participantUserIds.length}人受邀参加`,
			museumId: museum.id,
			museumName: museum.name
		});
	}

	addOperationLog({
		action: '创建',
		targetType: '航标灯',
		targetId: meeting.id,
		targetName: meeting.title,
		detail: `创建应急会商：${data.title}，优先级：${data.priority}`
	});

	persistAll();
	return { success: true, errors: [], meeting };
}

export function startEmergencyMeeting(meetingId: string) {
	emergencyMeetings.update(meetings =>
		meetings.map(m => m.id === meetingId ? {
			...m,
			status: '进行中',
			startedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
			updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
			participants: m.participants.map(p => ({ ...p, status: p.status === '已确认' ? '已出席' : p.status }))
		} : m)
	);

	const meeting = get(emergencyMeetings).find(m => m.id === meetingId);
	if (meeting) {
		addOperationLog({
			action: '编辑',
			targetType: '航标灯',
			targetId: meetingId,
			targetName: meeting.title,
			detail: `开始应急会商：${meeting.title}`
		});
	}
	persistAll();
}

export function endEmergencyMeeting(meetingId: string, conclusion: string, actionItems: string[]) {
	emergencyMeetings.update(meetings =>
		meetings.map(m => m.id === meetingId ? {
			...m,
			status: '已结束',
			endedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
			conclusion,
			actionItems,
			updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19)
		} : m)
	);

	const meeting = get(emergencyMeetings).find(m => m.id === meetingId);
	if (meeting) {
		addOperationLog({
			action: '编辑',
			targetType: '航标灯',
			targetId: meetingId,
			targetName: meeting.title,
			detail: `结束应急会商：${meeting.title}，结论：${conclusion}`
		});
	}
	persistAll();
}

export function addMeetingMessage(meetingId: string, content: string) {
	const user = get(currentUser);
	if (!user) return null;

	const message: EmergencyMeeting['messages'][0] = {
		id: generateId(),
		meetingId,
		userId: user.id,
		userName: user.fullName,
		userRole: user.role,
		content,
		timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19)
	};

	emergencyMeetings.update(meetings =>
		meetings.map(m => m.id === meetingId ? {
			...m,
			messages: [...m.messages, message],
			updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19)
		} : m)
	);

	persistAll();
	return message;
}

export function confirmMeetingParticipation(meetingId: string, userId: string, accept: boolean) {
	emergencyMeetings.update(meetings =>
		meetings.map(m => m.id === meetingId ? {
			...m,
			participants: m.participants.map(p =>
				p.userId === userId ? { ...p, status: accept ? '已确认' : '已拒绝' } : p
			),
			updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19)
		} : m)
	);
	persistAll();
}

export function createEmergencyPlan(data: Omit<EmergencyPlan, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'publishedAt'> & { createdBy?: string }) {
	const user = get(currentUser);
	const today = getToday();

	const plan: EmergencyPlan = {
		...data,
		id: generateId(),
		createdBy: data.createdBy || user?.fullName || '系统',
		createdAt: today,
		updatedAt: today
	};

	const validation = validateEmergencyPlan(plan);
	if (!validation.valid) {
		return { success: false, errors: validation.errors, plan: null };
	}

	emergencyPlans.update(plans => [...plans, plan]);
	addOperationLog({
		action: '创建',
		targetType: '航标灯',
		targetId: plan.id,
		targetName: plan.name,
		detail: `创建应急预案：${plan.name}，分类：${plan.category}，版本：${plan.version}`
	});
	persistAll();
	return { success: true, errors: [], plan };
}

export function updateEmergencyPlan(id: string, updates: Partial<EmergencyPlan>) {
	const existing = get(emergencyPlans).find(p => p.id === id);
	if (!existing) return { success: false, errors: ['预案不存在'] };

	const combined = { ...existing, ...updates };
	const validation = validateEmergencyPlan(combined);
	if (!validation.valid) {
		return { success: false, errors: validation.errors };
	}

	emergencyPlans.update(plans =>
		plans.map(p => p.id === id ? { ...p, ...updates, updatedAt: getToday() } : p)
	);
	addOperationLog({
		action: '编辑',
		targetType: '航标灯',
		targetId: id,
		targetName: updates.name || existing.name,
		detail: `编辑应急预案：${existing.name}`
	});
	persistAll();
	return { success: true, errors: [] };
}

export function publishEmergencyPlan(id: string) {
	emergencyPlans.update(plans =>
		plans.map(p => p.id === id ? {
			...p,
			status: '已发布',
			publishedAt: getToday(),
			updatedAt: getToday()
		} : p)
	);
	const plan = get(emergencyPlans).find(p => p.id === id);
	if (plan) {
		addOperationLog({
			action: '编辑',
			targetType: '航标灯',
			targetId: id,
			targetName: plan.name,
			detail: `发布应急预案：${plan.name}`
		});
	}
	persistAll();
}

export function archiveEmergencyPlan(id: string) {
	emergencyPlans.update(plans =>
		plans.map(p => p.id === id ? { ...p, status: '已归档', updatedAt: getToday() } : p)
	);
	const plan = get(emergencyPlans).find(p => p.id === id);
	if (plan) {
		addOperationLog({
			action: '编辑',
			targetType: '航标灯',
			targetId: id,
			targetName: plan.name,
			detail: `归档应急预案：${plan.name}`
		});
	}
	persistAll();
}

export function deleteEmergencyPlan(id: string) {
	const plan = get(emergencyPlans).find(p => p.id === id);
	emergencyPlans.update(plans => plans.filter(p => p.id !== id));

	if (plan) {
		addOperationLog({
			action: '删除',
			targetType: '航标灯',
			targetId: id,
			targetName: plan.name,
			detail: `删除应急预案：${plan.name}`
		});
	}
	persistAll();
}

export function createBatchTask(data: {
	title: string;
	description?: string;
	type: BatchTask['type'];
	priority: BatchTask['priority'];
	items: { targetId: string; targetName: string; targetType: BatchTaskItem['targetType'] }[];
}) {
	const user = get(currentUser);
	const museum = get(currentMuseum);
	if (!user || !museum) return { success: false, errors: ['用户信息不完整'], task: null };

	const today = new Date().toISOString().replace('T', ' ').slice(0, 19);

	const taskItems: BatchTaskItem[] = data.items.map((item, idx) => ({
		id: generateId(),
		batchId: '',
		targetId: item.targetId,
		targetName: item.targetName,
		targetType: item.targetType,
		status: '待处理'
	}));

	const task: BatchTask = {
		id: generateId(),
		title: data.title,
		description: data.description,
		type: data.type,
		priority: data.priority,
		status: '待派发',
		totalCount: data.items.length,
		completedCount: 0,
		failedCount: 0,
		items: taskItems.map(item => ({ ...item, batchId: '' })),
		creatorId: user.id,
		creatorName: user.fullName,
		museumId: museum.id,
		museumName: museum.name,
		createdAt: today,
		updatedAt: today
	};

	task.items = taskItems.map(item => ({ ...item, batchId: task.id }));

	const validation = validateBatchTask(task);
	if (!validation.valid) {
		return { success: false, errors: validation.errors, task: null };
	}

	batchTasks.update(tasks => [task, ...tasks]);

	addDisposalTimelineEvent({
		eventType: '任务派发',
		title: `创建批量任务：${data.title}`,
		description: `共${data.items.length}项任务待派发`,
		museumId: museum.id,
		museumName: museum.name
	});

	addOperationLog({
		action: '创建',
		targetType: '航标灯',
		targetId: task.id,
		targetName: task.title,
		detail: `创建批量任务：${data.title}，类型：${data.type}，共${data.items.length}项`
	});

	persistAll();
	return { success: true, errors: [], task };
}

export function dispatchBatchTask(taskId: string) {
	batchTasks.update(tasks =>
		tasks.map(t => t.id === taskId ? {
			...t,
			status: '进行中',
			dispatchedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
			updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19)
		} : t)
	);

	const task = get(batchTasks).find(t => t.id === taskId);
	if (task) {
		addOperationLog({
			action: '编辑',
			targetType: '航标灯',
			targetId: taskId,
			targetName: task.title,
			detail: `派发批量任务：${task.title}`
		});
	}
	persistAll();
}

export function updateBatchTaskItem(itemId: string, status: BatchTaskItem['status'], result?: string, errorMessage?: string) {
	const task = get(batchTasks).find(t => t.items.some(i => i.id === itemId));
	if (!task) return false;

	let completedCount = 0;
	let failedCount = 0;

	batchTasks.update(tasks =>
		tasks.map(t => {
			if (t.id !== task.id) return t;

			const updatedItems = t.items.map(item => {
				if (item.id === itemId) {
					return {
						...item,
						status,
						result,
						errorMessage,
						completedAt: (status === '已完成' || status === '失败') ? new Date().toISOString().replace('T', ' ').slice(0, 19) : undefined
					};
				}
				return item;
			});

			completedCount = updatedItems.filter(i => i.status === '已完成').length;
			failedCount = updatedItems.filter(i => i.status === '失败').length;

			const allDone = completedCount + failedCount === t.totalCount;

			return {
				...t,
				items: updatedItems,
				completedCount,
				failedCount,
				status: allDone ? '已完成' : t.status,
				completedAt: allDone ? new Date().toISOString().replace('T', ' ').slice(0, 19) : undefined,
				updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19)
			};
		})
	);

	persistAll();
	return true;
}

export function createSLARecord(params: {
	taskId: string;
	taskType: SLARecord['taskType'];
	riskLevel: RiskLevel;
	createdAt: string;
	dueDate?: string;
	museumId?: string;
	museumName?: string;
}) {
	const slaTargetHours = calculateSLATargetHours(params.riskLevel, params.taskType);

	const record: SLARecord = {
		id: generateId(),
		taskId: params.taskId,
		taskType: params.taskType,
		riskLevel: params.riskLevel,
		createdAt: params.createdAt,
		dueDate: params.dueDate,
		slaTargetHours,
		isOnTime: true,
		isFirstResponseOnTime: true,
		museumId: params.museumId,
		museumName: params.museumName
	};

	slaRecords.update(records => [...records, record]);
	persistAll();
	return record;
}

export function updateSLARecordFirstResponse(taskId: string, firstResponseAt: string) {
	const record = get(slaRecords).find(r => r.taskId === taskId);
	if (!record) return false;

	const created = new Date(record.createdAt).getTime();
	const response = new Date(firstResponseAt).getTime();
	const firstResponseHours = (response - created) / (1000 * 60 * 60);

	slaRecords.update(records =>
		records.map(r => r.taskId === taskId ? {
			...r,
			firstResponseAt,
			firstResponseHours: Math.round(firstResponseHours * 100) / 100,
			isFirstResponseOnTime: firstResponseHours <= r.slaTargetHours
		} : r)
	);

	persistAll();
	return true;
}

export function updateSLARecordCompletion(taskId: string, completedAt: string) {
	const record = get(slaRecords).find(r => r.taskId === taskId);
	if (!record) return false;

	const created = new Date(record.createdAt).getTime();
	const completed = new Date(completedAt).getTime();
	const actualHours = (completed - created) / (1000 * 60 * 60);

	slaRecords.update(records =>
		records.map(r => r.taskId === taskId ? {
			...r,
			completedAt,
			actualHours: Math.round(actualHours * 100) / 100,
			isOnTime: actualHours <= r.slaTargetHours
		} : r)
	);

	persistAll();
	return true;
}

export function calculateSLAStats(records: SLARecord[]) {
	const total = records.length;
	const onTime = records.filter(r => r.isOnTime).length;
	const firstResponseOnTime = records.filter(r => r.isFirstResponseOnTime).length;
	const avgHours = records.filter(r => r.actualHours).reduce((sum, r) => sum + (r.actualHours || 0), 0) / (records.filter(r => r.actualHours).length || 1);

	return {
		total,
		onTime,
		onTimeRate: total > 0 ? Math.round((onTime / total) * 100) : 0,
		firstResponseOnTime,
		firstResponseOnTimeRate: total > 0 ? Math.round((firstResponseOnTime / total) * 100) : 0,
		avgHours: Math.round(avgHours * 10) / 10
	};
}

export function calculateAlertClosureStats(alerts: EnvAlert[], timeRange?: { start: string; end: string }): AlertClosureStats {
	let filteredAlerts = alerts;
	if (timeRange) {
		filteredAlerts = alerts.filter(a => a.createdAt >= timeRange.start && a.createdAt <= timeRange.end);
	}

	const closedAlerts = filteredAlerts.filter(a => a.status === '已确认' || a.status === '已忽略');
	const totalAlerts = filteredAlerts.length;
	const closureRate = totalAlerts > 0 ? Math.round((closedAlerts.length / totalAlerts) * 100) / 10 : 0;

	const closedWithTimes = closedAlerts.filter(a => a.confirmedAt);
	const avgClosureHours = closedWithTimes.length > 0
		? closedWithTimes.reduce((sum, a) => {
			const created = new Date(a.createdAt).getTime();
			const confirmed = new Date(a.confirmedAt!).getTime();
			return sum + (confirmed - created) / (1000 * 60 * 60);
		}, 0) / closedWithTimes.length
		: 0;

	const riskLevelStats = (['高风险', '中风险', '低风险'] as RiskLevel[]).map(level => {
		const levelAlerts = filteredAlerts.filter(a => a.alertLevel === level);
		const levelClosed = levelAlerts.filter(a => a.status === '已确认' || a.status === '已忽略');
		return {
			level,
			total: levelAlerts.length,
			closed: levelClosed.length,
			closureRate: levelAlerts.length > 0 ? Math.round((levelClosed.length / levelAlerts.length) * 100) / 10 : 0,
			avgHours: 0
		};
	});

	const typeStats = (['温度', '湿度', '照度', '震动', '盐雾'] as EnvMonitorDataType[]).map(type => {
		const typeAlerts = filteredAlerts.filter(a => a.alertType === type);
		const typeClosed = typeAlerts.filter(a => a.status === '已确认' || a.status === '已忽略');
		return {
			type,
			total: typeAlerts.length,
			closed: typeClosed.length,
			closureRate: typeAlerts.length > 0 ? Math.round((typeClosed.length / typeAlerts.length) * 100) / 10 : 0
		};
	});

	const museumList = [...new Set(filteredAlerts.map(a => a.museumId))];
	const museumStats = museumList.map(mid => {
		const museumAlerts = filteredAlerts.filter(a => a.museumId === mid);
		const museumClosed = museumAlerts.filter(a => a.status === '已确认' || a.status === '已忽略');
		return {
			museumId: mid,
			museumName: museumAlerts[0]?.museumName || '',
			total: museumAlerts.length,
			closed: museumClosed.length,
			closureRate: museumAlerts.length > 0 ? Math.round((museumClosed.length / museumAlerts.length) * 100) / 10 : 0
		};
	});

	return {
		totalAlerts,
		closedAlerts: closedAlerts.length,
		closureRate,
		avgClosureHours: Math.round(avgClosureHours * 10) / 10,
		autoClosed: 0,
		manualClosed: closedAlerts.length,
		byRiskLevel: riskLevelStats,
		byType: typeStats,
		byMuseum: museumStats,
		timeRange: timeRange || { start: '', end: '' }
	};
}

export function calculateRiskHeatmapData(): RiskHeatmapData[] {
	const points = get(envMonitorPoints);
	const alerts = get(envAlerts);
	const lights = get(beaconLights);

	return points.map(point => {
		const pointAlerts = alerts.filter(a => a.pointId === point.id && a.status !== '已忽略');
		const highRiskCount = pointAlerts.filter(a => a.alertLevel === '高风险').length;
		const mediumRiskCount = pointAlerts.filter(a => a.alertLevel === '中风险').length;
		const lowRiskCount = pointAlerts.filter(a => a.alertLevel === '低风险').length;

		const riskScore = calculateRiskScore(highRiskCount, mediumRiskCount, lowRiskCount);
		const overallRisk = calculateOverallRiskLevel(pointAlerts.map(a => ({ level: a.alertLevel })));

		const pointLights = lights.filter(l => point.beaconLightIds.includes(l.id));

		return {
			museumId: point.museumId,
			museumName: point.museumName,
			location: point.location,
			locationType: point.type,
			pointId: point.id,
			pointName: point.name,
			riskLevel: overallRisk,
			riskScore,
			alertCount: pointAlerts.length,
			highRiskCount,
			mediumRiskCount,
			lowRiskCount,
			beaconLightCount: pointLights.length,
			beaconLightNames: pointLights.map(l => l.name),
			lastUpdated: new Date().toISOString().replace('T', ' ').slice(0, 19)
		};
	});
}

export function exportDisposalTimeline(alertId?: string, format: 'CSV' | 'Excel' | 'PDF' = 'CSV'): string {
	let events = get(disposalTimelineEvents);
	if (alertId) {
		events = events.filter(e => e.alertId === alertId);
	}

	const data = events.map(e => ({
		时间: e.timestamp,
		事件类型: e.eventType,
		标题: e.title,
		描述: e.description,
		操作人: e.operatorName,
		角色: e.operatorRole,
		升级等级: e.escalationLevel || '',
		原状态: e.fromStatus || '',
		新状态: e.toStatus || '',
		馆区: e.museumName || ''
	}));

	const columns = [
		{ key: '时间', label: '时间' },
		{ key: '事件类型', label: '事件类型' },
		{ key: '标题', label: '标题' },
		{ key: '描述', label: '描述' },
		{ key: '操作人', label: '操作人' },
		{ key: '角色', label: '角色' },
		{ key: '升级等级', label: '升级等级' },
		{ key: '原状态', label: '原状态' },
		{ key: '新状态', label: '新状态' },
		{ key: '馆区', label: '馆区' }
	];

	const csv = exportCSVUtil(data, columns);

	addOperationLog({
		action: '导出数据',
		targetType: '航标灯',
		targetId: alertId || 'export',
		targetName: '处置时间线',
		detail: `导出处置时间线数据，共${events.length}条记录，格式：${format}`
	});

	return csv;
}

export function downloadDisposalTimeline(alertId?: string) {
	const csv = exportDisposalTimeline(alertId);
	if (csv) {
		const filename = `处置时间线_${alertId ? '告警_' + alertId : '全部'}_${getToday()}.csv`;
		downloadCSVUtil(csv, filename);
	}
}

export const currentUserNotifications = derived(
	[notifications, currentUserId],
	([$notifs, $userId]) => $notifs.filter(n => n.userId === $userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
);

export const filteredAlertRules = derived(
	[alertRules, currentMuseumId, currentUser],
	([$rules, $museumId, $user]) => {
		if ($user?.role === '系统管理员') return $rules;
		return $rules.filter(r => !r.museumId || r.museumId === $museumId);
	}
);
