export const withBasePath = (html: string, base: string) =>
	base ? html.replaceAll(/(src|href)="\/(?!\/)/g, `$1="${base}/`) : html;
