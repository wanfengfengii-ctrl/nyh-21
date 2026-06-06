<script lang="ts">
	let { status, type }: { status: string; type: 'lampshade' | 'lightSource' | 'exhibition' } = $props();

	const getStatusClasses = () => {
		const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
		switch (type) {
			case 'lampshade':
				switch (status) {
					case '完好': return `${base} bg-green-100 text-green-800`;
					case '轻微划痕': return `${base} bg-blue-100 text-blue-800`;
					case '裂纹': return `${base} bg-yellow-100 text-yellow-800`;
					case '破损': return `${base} bg-red-100 text-red-800`;
					default: return `${base} bg-gray-100 text-gray-800`;
				}
			case 'lightSource':
				switch (status) {
					case '正常': return `${base} bg-green-100 text-green-800`;
					case '亮度不足': return `${base} bg-yellow-100 text-yellow-800`;
					case '故障': return `${base} bg-red-100 text-red-800`;
					case '已更换': return `${base} bg-blue-100 text-blue-800`;
					default: return `${base} bg-gray-100 text-gray-800`;
				}
			case 'exhibition':
				switch (status) {
					case '展出中': return `${base} bg-emerald-100 text-emerald-800`;
					case '可展出': return `${base} bg-blue-100 text-blue-800`;
					case '维护中': return `${base} bg-amber-100 text-amber-800`;
					case '库房存储': return `${base} bg-gray-100 text-gray-800`;
					case '不可展出': return `${base} bg-red-100 text-red-800`;
					default: return `${base} bg-gray-100 text-gray-800`;
				}
			default:
				return base;
		}
	};
</script>

<span class={getStatusClasses()}>
	{status}
</span>
