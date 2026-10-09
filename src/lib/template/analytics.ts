export type AnalyticsConfig = {
	enabled?: string;
	hubEnabled?: string;
	hubUrl?: string;
	repository?: string;
	siteUrl: string;
};
const disabled = (value: string | undefined) =>
	['false', '0', 'off', 'no'].includes(value?.trim().toLowerCase() ?? '');
export function analyticsRequest(
	config: AnalyticsConfig,
	pageUrl: string,
	referrer = '',
	privacy = false
) {
	if (privacy || disabled(config.enabled) || disabled(config.hubEnabled)) return null;
	if (!/^[a-zA-Z0-9-]{1,39}\/[a-zA-Z0-9_.-]{1,100}$/.test(config.repository ?? '')) return null;
	try {
		const hub = new URL(config.hubUrl || 'https://gitblog.app');
		const site = new URL(config.siteUrl),
			page = new URL(pageUrl);
		const root = site.pathname.replace(/\/+$/, '');
		if (
			hub.protocol !== 'https:' ||
			hub.username ||
			hub.password ||
			hub.search ||
			hub.hash ||
			hub.pathname !== '/'
		)
			return null;
		if (
			page.protocol !== 'https:' ||
			page.origin !== site.origin ||
			(page.pathname !== root && !page.pathname.startsWith(`${root}/`))
		)
			return null;
		let referrerOrigin = '';
		try {
			const ref = new URL(referrer);
			if (ref.protocol === 'https:') referrerOrigin = ref.origin;
		} catch {
			/* No referrer. */
		}
		return {
			endpoint: `${hub.origin}/v1/analytics/${config.repository}`,
			body: { url: `${page.origin}${page.pathname}`, referrer: referrerOrigin }
		};
	} catch {
		return null;
	}
}
