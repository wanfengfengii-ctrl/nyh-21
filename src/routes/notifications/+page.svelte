<script lang="ts">
	import {
		notifications,
		currentUserNotifications,
		markNotificationRead,
		markAllNotificationsRead,
		currentUser,
		unreadNotificationCount
	} from '$lib/stores';
	import {
		NOTIFICATION_TYPE_OPTIONS,
		NOTIFICATION_CHANNEL_OPTIONS,
		NOTIFICATION_STATUS_OPTIONS
	} from '$lib/types';
	import type {
		Notification,
		NotificationType,
		NotificationChannel,
		NotificationStatus
	} from '$lib/types';

	let typeFilter = $state<string>('');
	let channelFilter = $state<string>('');
	let statusFilter = $state<string>('');
	let selectedNotificationId = $state<string>('');
	let searchKeyword = $state('');

	let filteredNotifications = $state<Notification[]>([]);
	let selectedNotification = $state<Notification | null>(null);

	$effect(() => {
		let result = [...$currentUserNotifications];

		if (typeFilter) {
			result = result.filter(n => n.type === typeFilter);
		}

		if (channelFilter) {
			result = result.filter(n => n.channel === channelFilter);
		}

		if (statusFilter) {
			result = result.filter(n => n.status === statusFilter);
		}

		if (searchKeyword.trim()) {
			const kw = searchKeyword.toLowerCase();
			result = result.filter(n =>
				n.title.toLowerCase().includes(kw) ||
				n.content.toLowerCase().includes(kw)
			);
		}

		filteredNotifications = result;
	});

	$effect(() => {
		if (!selectedNotificationId) {
			selectedNotification = null;
		} else {
			selectedNotification = $currentUserNotifications.find(n => n.id === selectedNotificationId) || null;
		}
	});

	function getTypeClass(type: NotificationType) {
		const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
		switch (type) {
			case '告警通知': return `${base} bg-red-100 text-red-800`;
			case '升级通知': return `${base} bg-orange-100 text-orange-800`;
			case '催办通知': return `${base} bg-amber-100 text-amber-800`;
			case '系统通知': return `${base} bg-blue-100 text-blue-800`;
			case '任务通知': return `${base} bg-green-100 text-green-800`;
			default: return `${base} bg-gray-100 text-gray-800`;
		}
	}

	function getChannelClass(channel: NotificationChannel) {
		const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
		switch (channel) {
			case '站内': return `${base} bg-amber-100 text-amber-800`;
			case '短信': return `${base} bg-purple-100 text-purple-800`;
			case '邮件': return `${base} bg-cyan-100 text-cyan-800`;
			default: return `${base} bg-gray-100 text-gray-800`;
		}
	}

	function getStatusClass(status: NotificationStatus) {
		const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
		switch (status) {
			case '未读': return `${base} bg-red-100 text-red-800`;
			case '已读': return `${base} bg-gray-100 text-gray-600`;
			case '已处理': return `${base} bg-green-100 text-green-800`;
			default: return `${base} bg-gray-100 text-gray-800`;
		}
	}

	function handleSelectNotification(notification: Notification) {
		selectedNotificationId = notification.id;
		if (notification.status === '未读') {
			markNotificationRead(notification.id);
		}
	}

	function handleMarkAllRead() {
		if ($currentUser) {
			markAllNotificationsRead($currentUser.id);
		}
	}

	function getTypeIcon(type: NotificationType) {
		switch (type) {
			case '告警通知':
				return `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
				</svg>`;
			case '升级通知':
				return `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
				</svg>`;
			case '催办通知':
				return `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 01-9 9m9 0a9 9 0 00-9 9m9-9a9 9 0 009 9m-9 0a9 9 0 009-9m-9 0v0" />
				</svg>`;
			case '系统通知':
				return `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 000-2-2H5a2 2 000-2 2v10a2 2 0 002 2z" />
				</svg>`;
			case '任务通知':
				return `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
				</svg>`;
			default:
				return `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
				</svg>`;
		}
	}

	function getTypeIconColor(type: NotificationType) {
		switch (type) {
			case '告警通知': return 'text-red-500 bg-red-50';
			case '升级通知': return 'text-orange-500 bg-orange-50';
			case '催办通知': return 'text-amber-500 bg-amber-50';
			case '系统通知': return 'text-blue-500 bg-blue-50';
			case '任务通知': return 'text-green-500 bg-green-50';
			default: return 'text-gray-500 bg-gray-50';
		}
	}
</script>

<div class="space-y-6">
	<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
		<div>
			<h2 class="text-2xl font-bold text-amber-900">通知中心</h2>
			<p class="text-gray-600 mt-1">管理和查看所有系统通知消息</p>
		</div>
		<div class="flex gap-2">
			<button
				on:click={handleMarkAllRead}
				disabled={$unreadNotificationCount === 0}
				class="inline-flex items-center gap-2 px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
				</svg>
				全部标记已读
			</button>
		</div>
	</div>

	<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
		<div class="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-5 shadow-sm">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm text-red-600 font-medium">未读通知</p>
					<p class="text-3xl font-bold text-red-700 mt-1">{$unreadNotificationCount}</p>
				</div>
				<div class="w-12 h-12 bg-red-200 rounded-full flex items-center justify-center">
					<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
					</svg>
				</div>
			</div>
		</div>
		<div class="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-5 shadow-sm">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm text-amber-600 font-medium">全部通知</p>
					<p class="text-3xl font-bold text-amber-700 mt-1">{$currentUserNotifications.length}</p>
				</div>
				<div class="w-12 h-12 bg-amber-200 rounded-full flex items-center justify-center">
					<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
					</svg>
				</div>
			</div>
		</div>
		<div class="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 shadow-sm">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm text-green-600 font-medium">已读通知</p>
					<p class="text-3xl font-bold text-green-700 mt-1">{$currentUserNotifications.length - $unreadNotificationCount}</p>
				</div>
				<div class="w-12 h-12 bg-green-200 rounded-full flex items-center justify-center">
					<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 01-18 0 9 9 0 0118 0z" />
					</svg>
				</div>
			</div>
		</div>
		<div class="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 shadow-sm">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm text-purple-600 font-medium">告警通知</p>
					<p class="text-3xl font-bold text-purple-700 mt-1">{$currentUserNotifications.filter(n => n.type === '告警通知').length}</p>
				</div>
				<div class="w-12 h-12 bg-purple-200 rounded-full flex items-center justify-center">
					<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
					</svg>
				</div>
			</div>
		</div>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<div class="lg:col-span-1">
			<div class="bg-white rounded-xl shadow-md overflow-hidden">
				<div class="p-4 border-b border-gray-200 space-y-3">
					<div class="relative">
						<input
							type="text"
							placeholder="搜索通知..."
							bind:value={searchKeyword}
							class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
						/>
						<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 01-14 0 7 7 0 0114 0z" />
						</svg>
					</div>
					<div class="grid grid-cols-3 gap-2">
						<select
							bind:value={typeFilter}
							class="px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
						>
							<option value="">全部类型</option>
							{#each NOTIFICATION_TYPE_OPTIONS as type}
								<option value={type}>{type}</option>
							{/each}
						</select>
						<select
							bind:value={channelFilter}
							class="px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
						>
							<option value="">全部渠道</option>
							{#each NOTIFICATION_CHANNEL_OPTIONS as channel}
								<option value={channel}>{channel}</option>
							{/each}
						</select>
						<select
							bind:value={statusFilter}
							class="px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
						>
							<option value="">全部状态</option>
							{#each NOTIFICATION_STATUS_OPTIONS as status}
								<option value={status}>{status}</option>
							{/each}
						</select>
					</div>
				</div>

				<div class="max-h-[calc(100vh-320px)] overflow-y-auto">
					{#if filteredNotifications.length > 0}
						<div class="divide-y divide-gray-100">
							{#each filteredNotifications as notification}
								<div
									class="p-4 cursor-pointer transition-colors {
										selectedNotificationId === notification.id
											? 'bg-amber-50 border-l-4 border-amber-500'
											: 'hover:bg-gray-50 border-l-4 border-transparent'
									} {notification.status === '未读' ? 'bg-amber-50/30' : ''}"
									on:click={() => handleSelectNotification(notification)}
								>
									<div class="flex items-start gap-3">
										<div class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 {getTypeIconColor(notification.type)}">
											{@html getTypeIcon(notification.type)}
										</div>
										<div class="flex-1 min-w-0">
											<div class="flex items-center gap-2 mb-1">
												{#if notification.status === '未读'}
													<span class="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></span>
												{/if}
												<span class={getTypeClass(notification.type)}>{notification.type}</span>
												<span class={getChannelClass(notification.channel)}>{notification.channel}</span>
											</div>
											<h4 class="font-medium text-gray-800 text-sm truncate {notification.status === '未读' ? 'font-semibold' : ''}">
												{notification.title}
											</h4>
											<p class="text-xs text-gray-500 mt-1 line-clamp-2">
												{notification.content}
											</p>
											<div class="flex items-center justify-between mt-2">
												<span class={getStatusClass(notification.status)}>{notification.status}</span>
												<span class="text-xs text-gray-400">{notification.createdAt.slice(5, 16)}</span>
											</div>
										</div>
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<div class="p-12 text-center text-gray-500">
							<svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
							</svg>
							<p>暂无通知</p>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<div class="lg:col-span-2">
			<div class="bg-white rounded-xl shadow-md h-[calc(100vh-280px)] overflow-hidden">
				{#if selectedNotification}
					<div class="h-full flex flex-col">
						<div class="p-6 border-b border-gray-200">
							<div class="flex items-start justify-between">
								<div class="flex items-start gap-4">
									<div class="w-12 h-12 rounded-full flex items-center justify-center {getTypeIconColor(selectedNotification.type)}">
										{@html getTypeIcon(selectedNotification.type)}
									</div>
									<div>
										<h3 class="text-lg font-semibold text-gray-800">{selectedNotification.title}</h3>
										<div class="flex items-center gap-2 mt-2">
											<span class={getTypeClass(selectedNotification.type)}>{selectedNotification.type}</span>
											<span class={getChannelClass(selectedNotification.channel)}>{selectedNotification.channel}</span>
											<span class={getStatusClass(selectedNotification.status)}>{selectedNotification.status}</span>
										</div>
									</div>
								</div>
							</div>
						</div>

						<div class="flex-1 overflow-y-auto p-6">
							<div class="space-y-6">
								<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
									<div class="bg-gray-50 rounded-lg p-4">
										<p class="text-xs text-gray-500 mb-1">通知编号</p>
										<p class="font-mono text-sm text-gray-800">{selectedNotification.id}</p>
									</div>
									<div class="bg-gray-50 rounded-lg p-4">
										<p class="text-xs text-gray-500 mb-1">接收人</p>
										<p class="text-sm text-gray-800 font-medium">{selectedNotification.userName || '--'}</p>
									</div>
									<div class="bg-gray-50 rounded-lg p-4">
										<p class="text-xs text-gray-500 mb-1">创建时间</p>
										<p class="text-sm text-gray-800">{selectedNotification.createdAt}</p>
									</div>
									<div class="bg-gray-50 rounded-lg p-4">
										<p class="text-xs text-gray-500 mb-1">阅读时间</p>
										<p class="text-sm text-gray-800">{selectedNotification.readAt || '--'}</p>
									</div>
								</div>

								<div>
									<h4 class="font-semibold text-gray-800 mb-3">通知内容</h4>
									<div class="bg-amber-50 border border-amber-200 rounded-lg p-5">
										<p class="text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedNotification.content}</p>
									</div>
								</div>

								{#if selectedNotification.museumName}
									<div>
										<h4 class="font-semibold text-gray-800 mb-3">所属馆区</h4>
										<div class="bg-gray-50 rounded-lg p-4">
											<p class="text-gray-700">{selectedNotification.museumName}</p>
										</div>
									</div>
								{/if}

								<div class="pt-4 border-t border-gray-200">
									<div class="flex gap-3">
										{#if selectedNotification?.status === '未读'}
											<button
												on:click={() => {
													if (selectedNotification) {
														markNotificationRead(selectedNotification.id);
													}
												}}
												class="inline-flex items-center gap-2 px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors text-sm font-medium"
											>
												<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
												</svg>
												标记已读
											</button>
										{/if}
									</div>
								</div>
							</div>
						</div>
					</div>
				{:else}
					<div class="h-full flex items-center justify-center">
						<div class="text-center text-gray-500">
							<svg xmlns="http://www.w3.org/2000/svg" class="w-20 h-20 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 01-6 0v-1m6 0H9" />
							</svg>
							<p class="text-lg font-medium">请选择一条通知查看详情</p>
							<p class="text-sm mt-1">点击左侧列表中的通知</p>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
