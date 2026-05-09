import Handlebars from "handlebars";

export function renderTemplate(
	source: string,
	data: Record<string, unknown>,
): string {
	const template = Handlebars.compile(source, { noEscape: false });
	return template(data);
}
