<script lang="ts">
	import { dev } from '$app/environment';
	import { afterNavigate } from '$app/navigation';
	import { env } from '$env/dynamic/public';
	import { onDestroy } from 'svelte';
	import { analyticsRequest } from './analytics';
	let { siteUrl }: { siteUrl: string } = $props();
	let timer: ReturnType<typeof setTimeout> | undefined;
	let visibility: (() => void) | undefined;
	function clear() {
		if (timer) clearTimeout(timer);
		if (visibility) document.removeEventListener('visibilitychange', visibility);
		visibility = undefined;
	}
	afterNavigate(({ from, to }) => {
		clear();
		if (dev || !to || to.route.id === null) return;
		const request = analyticsRequest(
			{
				enabled: env.PUBLIC_ANALYTICS_ENABLED,
				hubEnabled: env.PUBLIC_HUB_ENABLED,
				hubUrl: env.PUBLIC_HUB_URL,
				repository: env.PUBLIC_SITE_REPOSITORY,
				siteUrl
			},
			to.url.href,
			from?.url.href ?? document.referrer,
			navigator.doNotTrack === '1' ||
				(navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true
		);
		if (!request) return;
		const send = () => {
			timer = setTimeout(() => {
				if (document.visibilityState !== 'visible') return;
				void fetch(request.endpoint, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(request.body),
					credentials: 'omit',
					keepalive: true
				}).catch(() => {
					/* Analytics must never interrupt reading. */
				});
			}, 800);
		};
		if (document.visibilityState === 'visible') send();
		else {
			visibility = () => {
				if (document.visibilityState === 'visible') {
					if (visibility) document.removeEventListener('visibilitychange', visibility);
					visibility = undefined;
					send();
				}
			};
			document.addEventListener('visibilitychange', visibility);
		}
	});
	onDestroy(() => {
		if (typeof document !== 'undefined') clear();
	});
</script>
