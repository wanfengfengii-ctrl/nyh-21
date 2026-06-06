<script lang="ts">
	import {
		emergencyMeetings,
		createEmergencyMeeting,
		startEmergencyMeeting,
		endEmergencyMeeting,
		addMeetingMessage,
		confirmMeetingParticipation,
		currentUser,
		users,
		envAlerts
	} from '$lib/stores';
	import {
		EMERGENCY_MEETING_STATUS_OPTIONS,
		EMERGENCY_MEETING_PRIORITY_OPTIONS,
		RISK_LEVEL_OPTIONS
	} from '$lib/types';
	import type {
		EmergencyMeeting,
		EmergencyMeetingPriority,
		RiskLevel,
		EmergencyMeetingStatus,
		EnvAlert
	} from '$lib/types';

	const EMERGENCY_MEETING_PARTICIPANT_STATUS_OPTIONS = ['邀请中', '已确认', '已拒绝', '已出席'] as const;

	let viewMode = $state<'list' | 'detail'>('list');
	let selectedMeetingId = $state<string>('');
	let statusFilter = $state<string>('');
	let searchKeyword = $state('');

	let showCreateModal = $state(false);
	let showEndModal = $state(false);

	let createForm = $state({
		title: '',
		description: '',
		alertId: '',
		riskLevel: '中风险' as RiskLevel,
		priority: '中' as EmergencyMeetingPriority,
		scheduledAt: '',
		participantUserIds: [] as string[]
	});
	let createErrors = $state<string[]>([]);

	let endForm = $state({
		conclusion: '',
		actionItems: ''
	});
	let endErrors = $state<string[]>([]);

	let newMessage = $state('');

	const filteredMeetings = $derived(() => {
		let result = [...$emergencyMeetings];
		if ($currentUser?.role !== '系统管理员') {
			result = result.filter(m =>
				m.museumId === $currentUser?.museumId ||
				m.participants.some(p => p.userId === $currentUser?.id)
			);
		}
		if (statusFilter) {
			result = result.filter(m => m.status === statusFilter);
		}
		if (searchKeyword.trim()) {
			const kw = searchKeyword.toLowerCase();
			result = result.filter(m =>
				m.title.toLowerCase().includes(kw) ||
				m.description?.toLowerCase().includes(kw) ||
				m.initiatorName.toLowerCase().includes(kw)
			);
		}
		return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
	});

	const selectedMeeting = $derived(() => {
		if (!selectedMeetingId) return null;
		return $emergencyMeetings.find(m => m.id === selectedMeetingId) || null;
	});

	const availableAlerts = $derived(() => {
		if ($currentUser?.role === '系统管理员') {
			return $envAlerts.filter(a => a.status !== '已确认' && a.status !== '已忽略');
		}
		return $envAlerts.filter(a =>
			a.museumId === $currentUser?.museumId &&
			a.status !== '已确认' && a.status !== '已忽略'
		);
	});

	const availableUsers = $derived(() => {
		if ($currentUser?.role === '系统管理员') {
			return $users;
		}
		return $users.filter(u => u.museumId === $currentUser?.museumId || u.role === '馆区管理员');
	});

	const meetingStats = $derived(() => {
		const meetings = filteredMeetings();
		return {
			total: meetings.length,
			preparing: meetings.filter(m => m.status === '筹备中').length,
			ongoing: meetings.filter(m => m.status === '进行中').length,
			ended: meetings.filter(m => m.status === '已结束').length
		};
	});

	const currentUserParticipant = $derived(() => {
		const meeting = selectedMeeting();
		if (!meeting || !$currentUser) return null;
		return meeting.participants.find(p => p.userId === $currentUser.id) || null;
	});

	const canCreateMeeting = $derived(() => {
		return $currentUser?.role === '馆区管理员' || $currentUser?.role === '系统管理员';
	});

	const canStartMeeting = $derived(() => {
		const meeting = selectedMeeting();
		if (!meeting || !$currentUser) return false;
		return meeting.status === '筹备中' &&
			(meeting.initiatorId === $currentUser.id || $currentUser.role === '系统管理员');
	});

	const canEndMeeting = $derived(() => {
		const meeting = selectedMeeting();
		if (!meeting || !$currentUser) return false;
		return meeting.status === '进行中' &&
			(meeting.initiatorId === $currentUser.id || $currentUser.role === '系统管理员');
	});

	function getRiskLevelClass(level: RiskLevel) {
		const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
		switch (level) {
			case '低风险': return `${base} bg-green-100 text-green-800`;
			case '中风险': return `${base} bg-amber-100 text-amber-800`;
			case '高风险': return `${base} bg-red-100 text-red-800`;
			default: return `${base} bg-gray-100 text-gray-800`;
		}
	}

	function getPriorityClass(priority: EmergencyMeetingPriority) {
		const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
		switch (priority) {
			case '紧急': return `${base} bg-red-100 text-red-800`;
			case '高': return `${base} bg-orange-100 text-orange-800`;
			case '中': return `${base} bg-amber-100 text-amber-800`;
			case '低': return `${base} bg-gray-100 text-gray-600`;
			default: return `${base} bg-gray-100 text-gray-800`;
		}
	}

	function getStatusClass(status: EmergencyMeetingStatus) {
		const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
		switch (status) {
			case '筹备中': return `${base} bg-blue-100 text-blue-800`;
			case '进行中': return `${base} bg-green-100 text-green-800`;
			case '已结束': return `${base} bg-gray-100 text-gray-600`;
			case '已取消': return `${base} bg-red-100 text-red-600`;
			default: return `${base} bg-gray-100 text-gray-800`;
		}
	}

	function getParticipantStatusClass(status: string) {
		const base = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium';
		switch (status) {
			case '邀请中': return `${base} bg-amber-100 text-amber-800`;
			case '已确认': return `${base} bg-green-100 text-green-800`;
			case '已拒绝': return `${base} bg-red-100 text-red-800`;
			case '已出席': return `${base} bg-blue-100 text-blue-800`;
			default: return `${base} bg-gray-100 text-gray-800`;
		}
	}

	function openCreateModal() {
		const now = new Date();
		now.setHours(now.getHours() + 1);
		createForm = {
			title: '',
			description: '',
			alertId: '',
			riskLevel: '中风险',
			priority: '中',
			scheduledAt: now.toISOString().slice(0, 16),
			participantUserIds: []
		};
		createErrors = [];
		showCreateModal = true;
	}

	function handleCreateMeeting() {
		const result = createEmergencyMeeting({
			title: createForm.title,
			description: createForm.description || undefined,
			alertId: createForm.alertId || undefined,
			riskLevel: createForm.riskLevel,
			priority: createForm.priority,
			scheduledAt: createForm.scheduledAt.replace('T', ' ') + ':00',
			participantUserIds: createForm.participantUserIds
		}) as any;

		if (result && !result.success) {
			createErrors = result.errors;
			return;
		}

		showCreateModal = false;
	}

	function openMeetingDetail(meeting: EmergencyMeeting) {
		selectedMeetingId = meeting.id;
		viewMode = 'detail';
	}

	function goBackToList() {
		viewMode = 'list';
		selectedMeetingId = '';
	}

	function handleStartMeeting() {
		if (!selectedMeeting()) return;
		startEmergencyMeeting(selectedMeeting()!.id);
	}

	function openEndModal() {
		endForm = {
			conclusion: '',
			actionItems: ''
		};
		endErrors = [];
		showEndModal = true;
	}

	function handleEndMeeting() {
		if (!selectedMeeting()) return;

		if (!endForm.conclusion.trim()) {
			endErrors = ['请输入会议结论'];
			return;
		}

		const actionItems = endForm.actionItems
			.split('\n')
			.map(item => item.trim())
			.filter(item => item.length > 0);

		endEmergencyMeeting(selectedMeeting()!.id, endForm.conclusion, actionItems);
		showEndModal = false;
	}

	function handleSendMessage() {
		if (!selectedMeeting() || !newMessage.trim()) return;
		addMeetingMessage(selectedMeeting()!.id, newMessage.trim());
		newMessage = '';
	}

	function handleConfirmParticipation(accept: boolean) {
		if (!selectedMeeting() || !$currentUser) return;
		confirmMeetingParticipation(selectedMeeting()!.id, $currentUser.id, accept);
	}

	function toggleParticipant(userId: string) {
		const idx = createForm.participantUserIds.indexOf(userId);
		if (idx > -1) {
			createForm.participantUserIds.splice(idx, 1);
		} else {
			createForm.participantUserIds.push(userId);
		}
	}
</script>

<div class="space-y-6">
	<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
		<div>
			<h2 class="text-2xl font-bold text-amber-900">跨馆应急会商</h2>
			<p class="text-gray-600 mt-1">多馆协同应急处置与在线会商管理</p>
		</div>
		<div class="flex gap-2">
			{#if viewMode === 'list' && canCreateMeeting()}
				<button
					on:click={openCreateModal}
					class="inline-flex items-center gap-2 px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors font-medium shadow-md"
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
					</svg>
					创建会商
				</button>
			{/if}
			{#if viewMode === 'detail'}
				<button
					on:click={goBackToList}
					class="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
					返回列表
				</button>
			{/if}
		</div>
	</div>

	{#if viewMode === 'list'}
		<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
			<div class="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4">
				<p class="text-sm text-amber-700">全部会商</p>
				<p class="text-2xl font-bold text-amber-800 mt-1">{meetingStats.total}</p>
			</div>
			<div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
				<p class="text-sm text-blue-700">筹备中</p>
				<p class="text-2xl font-bold text-blue-800 mt-1">{meetingStats.preparing}</p>
			</div>
			<div class="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
				<p class="text-sm text-green-700">进行中</p>
				<p class="text-2xl font-bold text-green-800 mt-1">{meetingStats.ongoing}</p>
			</div>
			<div class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4">
				<p class="text-sm text-gray-700">已结束</p>
				<p class="text-2xl font-bold text-gray-800 mt-1">{meetingStats.ended}</p>
			</div>
		</div>

		<div class="flex flex-wrap gap-3 items-center">
			<div class="relative flex-1 min-w-64">
				<input
					type="text"
					placeholder="搜索会商标题、描述、发起人..."
					bind:value={searchKeyword}
					class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
				/>
				<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
				</svg>
			</div>
			<select
				bind:value={statusFilter}
				class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
			>
				<option value="">全部状态</option>
				{#each EMERGENCY_MEETING_STATUS_OPTIONS as status}
					<option value={status}>{status}</option>
				{/each}
			</select>
		</div>

		<div class="space-y-4">
			{#if filteredMeetings().length > 0}
				{#each filteredMeetings() as meeting}
					<div
						class="bg-white rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
						on:click={() => openMeetingDetail(meeting)}
					>
						<div class="p-5">
							<div class="flex items-start justify-between gap-4">
								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-2 mb-2 flex-wrap">
										<span class={getStatusClass(meeting.status)}>{meeting.status}</span>
										<span class={getRiskLevelClass(meeting.riskLevel)}>{meeting.riskLevel}</span>
										<span class={getPriorityClass(meeting.priority)}>{meeting.priority}优先级</span>
									</div>
									<h3 class="text-lg font-semibold text-gray-800 mb-2">{meeting.title}</h3>
									{#if meeting.description}
										<p class="text-sm text-gray-600 line-clamp-2 mb-3">{meeting.description}</p>
									{/if}
									<div class="flex flex-wrap items-center gap-4 text-xs text-gray-500">
										<span class="flex items-center gap-1">
											<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
											</svg>
											发起人：{meeting.initiatorName}
										</span>
										<span class="flex items-center gap-1">
											<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
											</svg>
											{meeting.museumName}
										</span>
										<span class="flex items-center gap-1">
											<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
											</svg>
											预定时间：{meeting.scheduledAt}
										</span>
									</div>
								</div>
								<div class="flex items-center gap-3">
									<div class="text-right">
										<div class="flex -space-x-2">
											{#each meeting.participants.slice(0, 3) as participant}
												<div
													class="w-8 h-8 rounded-full bg-amber-200 border-2 border-white flex items-center justify-center text-xs font-medium text-amber-800"
													title={participant.userName}
												>
													{participant.userName.slice(0, 1)}
												</div>
											{/each}
											{#if meeting.participants.length > 3}
												<div class="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600">
													+{meeting.participants.length - 3}
												</div>
											{/if}
										</div>
										<p class="text-xs text-gray-500 mt-1">{meeting.participants.length} 人参与</p>
									</div>
									<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
									</svg>
								</div>
							</div>
						</div>
						{#if meeting.status === '进行中'}
							<div class="bg-green-50 px-5 py-2 border-t border-green-100">
								<div class="flex items-center gap-2 text-green-700 text-sm">
									<span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
									会议进行中，点击进入参与会商
								</div>
							</div>
						{/if}
					</div>
				{/each}
			{:else}
				<div class="bg-white rounded-xl shadow-md p-12 text-center">
					<svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
					</svg>
					<p class="text-gray-500 mb-2">暂无应急会商</p>
					{#if canCreateMeeting()}
						<p class="text-sm text-gray-400">点击上方"创建会商"按钮发起新的应急会商</p>
					{/if}
				</div>
			{/if}
		</div>

	{:else if viewMode === 'detail' && selectedMeeting()}
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<div class="lg:col-span-2 space-y-6">
				<div class="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
					<div class="bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-5 border-b border-amber-100">
						<div class="flex items-start justify-between gap-4">
							<div>
								<div class="flex items-center gap-2 mb-2 flex-wrap">
									<span class={getStatusClass(selectedMeeting()!.status)}>{selectedMeeting()!.status}</span>
									<span class={getRiskLevelClass(selectedMeeting()!.riskLevel)}>{selectedMeeting()!.riskLevel}</span>
									<span class={getPriorityClass(selectedMeeting()!.priority)}>{selectedMeeting()!.priority}优先级</span>
								</div>
								<h2 class="text-xl font-bold text-gray-800">{selectedMeeting()!.title}</h2>
							</div>
							<div class="flex gap-2">
								{#if canStartMeeting()}
									<button
										on:click={handleStartMeeting}
										class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
									>
										开始会商
									</button>
								{/if}
								{#if canEndMeeting()}
									<button
										on:click={openEndModal}
										class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
									>
										结束会商
									</button>
								{/if}
							</div>
						</div>
						{#if selectedMeeting()!.description}
							<p class="text-sm text-gray-600 mt-3">{selectedMeeting()!.description}</p>
						{/if}
						<div class="flex flex-wrap items-center gap-4 mt-4 text-xs text-gray-500">
							<span>发起人：{selectedMeeting()!.initiatorName}</span>
							<span>发起馆区：{selectedMeeting()!.museumName}</span>
							<span>预定时间：{selectedMeeting()!.scheduledAt}</span>
							{#if selectedMeeting()!.startedAt}
								<span>开始时间：{selectedMeeting()!.startedAt}</span>
							{/if}
							{#if selectedMeeting()!.endedAt}
								<span>结束时间：{selectedMeeting()!.endedAt}</span>
							{/if}
						</div>
					</div>

					<div class="p-6">
						{#if currentUserParticipant() && currentUserParticipant()!.status === '邀请中'}
							<div class="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
								<div class="flex items-center justify-between">
									<div>
										<p class="font-medium text-amber-800">您已被邀请参加本次会商</p>
										<p class="text-sm text-amber-600 mt-1">请确认是否参加</p>
									</div>
									<div class="flex gap-2">
										<button
											on:click={() => handleConfirmParticipation(true)}
											class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
										>
											确认参加
										</button>
										<button
											on:click={() => handleConfirmParticipation(false)}
											class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
										>
											拒绝
										</button>
									</div>
								</div>
							</div>
						{/if}

						{#if selectedMeeting()!.status === '已结束' && selectedMeeting()!.conclusion}
							<div class="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
								<h4 class="font-medium text-gray-800 mb-2">会议结论</h4>
								<p class="text-sm text-gray-600">{selectedMeeting()!.conclusion}</p>
								{#if selectedMeeting()!.actionItems && selectedMeeting()!.actionItems!.length > 0}
									<h5 class="font-medium text-gray-700 mt-3 mb-2 text-sm">待办事项</h5>
									<ul class="text-sm text-gray-600 space-y-1">
										{#each selectedMeeting()!.actionItems! as item, idx}
											<li class="flex items-start gap-2">
												<span class="text-amber-600">{idx + 1}.</span>
												<span>{item}</span>
											</li>
										{/each}
									</ul>
								{/if}
							</div>
						{/if}

						<h3 class="font-semibold text-gray-800 mb-4">会议聊天</h3>

						<div class="border border-gray-200 rounded-lg overflow-hidden">
							<div class="h-96 overflow-y-auto p-4 bg-gray-50 space-y-4">
								{#if selectedMeeting()!.messages.length > 0}
									{#each selectedMeeting()!.messages as message}
										<div class="flex {message.userId === $currentUser?.id ? 'justify-end' : 'justify-start'}">
											<div class="max-w-md {message.userId === $currentUser?.id ? 'order-2' : 'order-1'}">
												<div class="flex items-center gap-2 mb-1 {message.userId === $currentUser?.id ? 'justify-end' : 'justify-start'}">
													<span class="text-xs font-medium text-gray-700">{message.userName}</span>
													<span class="text-xs text-gray-400">{message.userRole}</span>
												</div>
												<div
													class="px-4 py-2 rounded-2xl {
														message.userId === $currentUser?.id
															? 'bg-amber-600 text-white rounded-br-md'
															: 'bg-white text-gray-800 rounded-bl-md shadow-sm'
													}"
												>
													<p class="text-sm whitespace-pre-wrap">{message.content}</p>
												</div>
												<p class="text-xs text-gray-400 mt-1 {message.userId === $currentUser?.id ? 'text-right' : 'text-left'}">
													{message.timestamp.slice(11, 16)}
												</p>
											</div>
										</div>
									{/each}
								{:else}
									<div class="h-full flex items-center justify-center">
										<p class="text-gray-400 text-sm">暂无消息，发送第一条消息吧</p>
									</div>
								{/if}
							</div>

							{#if selectedMeeting()!.status === '进行中' && currentUserParticipant() &&
								(currentUserParticipant()!.status === '已确认' || currentUserParticipant()!.status === '已出席')}
								<div class="border-t border-gray-200 p-3 bg-white">
									<div class="flex gap-2">
										<input
											type="text"
											placeholder="输入消息..."
											bind:value={newMessage}
											on:keydown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
											class="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
										/>
										<button
											on:click={handleSendMessage}
											disabled={!newMessage.trim()}
											class="px-4 py-2 bg-amber-700 text-white rounded-full hover:bg-amber-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
										>
											<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
											</svg>
										</button>
									</div>
								</div>
							{/if}
						</div>
					</div>
				</div>
			</div>

			<div class="space-y-6">
				<div class="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
					<div class="px-5 py-4 border-b border-gray-100">
						<h3 class="font-semibold text-gray-800">参与者 ({selectedMeeting()!.participants.length})</h3>
					</div>
					<div class="divide-y divide-gray-100 max-h-96 overflow-y-auto">
						{#each selectedMeeting()!.participants as participant}
							<div class="px-5 py-3 flex items-center justify-between">
								<div class="flex items-center gap-3">
									<div class="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
										<span class="text-amber-800 font-medium">{participant.userName.slice(0, 1)}</span>
									</div>
									<div>
										<p class="font-medium text-gray-800 text-sm">{participant.userName}</p>
										<p class="text-xs text-gray-500">{participant.userRole} · {participant.museumName}</p>
									</div>
								</div>
								<span class={getParticipantStatusClass(participant.status)}>{participant.status}</span>
							</div>
						{/each}
					</div>
				</div>

				{#if selectedMeeting()!.alertId}
					{@const alert = $envAlerts.find(a => a.id === selectedMeeting()!.alertId)}
					<div class="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
						<div class="px-5 py-4 border-b border-gray-100">
							<h3 class="font-semibold text-gray-800">关联告警</h3>
						</div>
						<div class="p-5">
							{#if alert}
								<div class="bg-red-50 border border-red-100 rounded-lg p-4">
									<div class="flex items-center gap-2 mb-2">
										<span class={getRiskLevelClass(alert.alertLevel)}>{alert.alertLevel}</span>
										<span class="text-sm font-medium text-red-800">{alert.alertType}告警</span>
									</div>
									<p class="text-sm text-red-700">{alert.description}</p>
									<p class="text-xs text-red-500 mt-2">监测点：{alert.pointName}</p>
								</div>
							{:else}
								<p class="text-sm text-gray-500">关联告警不存在</p>
							{/if}
						</div>
					</div>
				{/if}

				{#if selectedMeeting()!.status === '进行中'}
					<div class="bg-green-50 border border-green-200 rounded-xl p-4">
						<div class="flex items-center gap-2">
							<span class="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
							<span class="font-medium text-green-800">会议进行中</span>
						</div>
						<p class="text-sm text-green-600 mt-2">
							已进行 {selectedMeeting()!.startedAt ?
								Math.floor((Date.now() - new Date(selectedMeeting()!.startedAt!).getTime()) / 60000) + ' 分钟' :
								'--'}
						</p>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	{#if showCreateModal}
		<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" on:click={() => (showCreateModal = false)}>
			<div class="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" on:click|stopPropagation>
				<div class="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
					<h3 class="text-lg font-semibold text-gray-800">创建应急会商</h3>
					<p class="text-sm text-gray-500 mt-1">填写会商信息，邀请相关人员参与</p>
				</div>
				<form on:submit|preventDefault={handleCreateMeeting} class="p-6 space-y-5">
					{#if createErrors.length > 0}
						<div class="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
							{#each createErrors as err}
								<p>{err}</p>
							{/each}
						</div>
					{/if}

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">会商标题 *</label>
						<input
							type="text"
							bind:value={createForm.title}
							placeholder="请输入会商标题"
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
						/>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">会商描述</label>
						<textarea
							bind:value={createForm.description}
							rows="3"
							placeholder="请输入会商描述..."
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none"
						/>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">风险等级 *</label>
							<select
								bind:value={createForm.riskLevel}
								class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
							>
								{#each RISK_LEVEL_OPTIONS as level}
									<option value={level}>{level}</option>
								{/each}
							</select>
						</div>
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">优先级 *</label>
							<select
								bind:value={createForm.priority}
								class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
							>
								{#each EMERGENCY_MEETING_PRIORITY_OPTIONS as priority}
									<option value={priority}>{priority}</option>
								{/each}
							</select>
						</div>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">预定时间 *</label>
						<input
							type="datetime-local"
							bind:value={createForm.scheduledAt}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
						/>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">关联告警</label>
						<select
							bind:value={createForm.alertId}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
						>
							<option value="">不关联告警</option>
							{#each availableAlerts() as alert}
								<option value={alert.id}>[{alert.alertLevel}] {alert.pointName} - {alert.alertType}</option>
							{/each}
						</select>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">参与者 *</label>
						<div class="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
							{#each availableUsers() as user}
								<label class="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
									<input
										type="checkbox"
										checked={createForm.participantUserIds.includes(user.id)}
										on:change={() => toggleParticipant(user.id)}
										class="w-4 h-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
									/>
									<div class="flex-1">
										<p class="text-sm font-medium text-gray-800">{user.fullName}</p>
										<p class="text-xs text-gray-500">{user.role} · {user.museumName}</p>
									</div>
								</label>
							{/each}
						</div>
						<p class="text-xs text-gray-500 mt-1">已选择 {createForm.participantUserIds.length} 人</p>
					</div>

					<div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
						<button
							type="button"
							on:click={() => (showCreateModal = false)}
							class="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
						>
							取消
						</button>
						<button
							type="submit"
							class="px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors font-medium"
						>
							创建会商
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	{#if showEndModal && selectedMeeting()}
		<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" on:click={() => (showEndModal = false)}>
			<div class="bg-white rounded-xl shadow-xl max-w-lg w-full" on:click|stopPropagation>
				<div class="px-6 py-4 border-b border-gray-200">
					<h3 class="text-lg font-semibold text-gray-800">结束会商</h3>
					<p class="text-sm text-gray-500 mt-1">填写会议结论和待办事项</p>
				</div>
				<form on:submit|preventDefault={handleEndMeeting} class="p-6 space-y-4">
					{#if endErrors.length > 0}
						<div class="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
							{#each endErrors as err}
								<p>{err}</p>
							{/each}
						</div>
					{/if}

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">会议结论 *</label>
						<textarea
							bind:value={endForm.conclusion}
							rows="3"
							placeholder="请输入会议结论..."
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none"
						/>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">待办事项</label>
						<textarea
							bind:value={endForm.actionItems}
							rows="4"
							placeholder="每行一条待办事项..."
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none"
						/>
						<p class="text-xs text-gray-500 mt-1">每行输入一条待办事项</p>
					</div>

					<div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
						<button
							type="button"
							on:click={() => (showEndModal = false)}
							class="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
						>
							取消
						</button>
						<button
							type="submit"
							class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
						>
							确认结束
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}
</div>
