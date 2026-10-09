export const escapeXml = (value: string) =>
	value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;');

export const createXmlResponse = (body: string, contentType: string) =>
	new Response(body, {
		headers: {
			'Cache-Control': 'max-age=0, s-maxage=3600',
			'Content-Type': `${contentType}; charset=utf-8`
		}
	});
