import { writable, derived, get } from 'svelte/store';
import { generateId, getToday, validateBeaconLight, checkBorrowOverdue, isDateBefore, getDefaultExhibitionStatus, validateEnvMonitorPoint, validateEnvMonitorRecord, validateThresholdConfig, validateRectificationTask, checkEnvThreshold, calculateOverallRiskLevel } from './validation';
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
	RectificationTaskStatus
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
}

export function createBorrowRequest(data: Omit<BorrowRequest, 'id' | 'status' | 'approvalHistory' | 'createdAt' | 'updatedAt' | 'beaconLightName' | 'beaconLightCode' | 'sourceMuseumName' | 'targetMuseumName' | 'applicantName'>) {
	const light = get(beaconLights).find(l => l.id === data.beaconLightId);
	const sourceMuseum = get(museums).find(m => m.id === data.sourceMuseumId);
	const targetMuseum = get(museums).find(m => m.id === data.targetMuseumId);
	const user = get(currentUser);

	if (!light || !sourceMuseum || !targetMuseum || !user) return null;

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
	return request;
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
		action: '创建修复工单',
		targetType: '修复工单',
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
		action: '开始修复',
		targetType: '修复工单',
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
		action: '完成修复',
		targetType: '修复工单',
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
		action: '验收修复',
		targetType: '修复工单',
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
		action: '删除',
		targetType: '修复工单',
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
		action: '分配修复',
		targetType: '修复工单',
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
