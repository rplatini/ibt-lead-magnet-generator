import { describe, expect, it } from "vitest";
import { renderTemplate } from "./handlebars-runtime";

describe("renderTemplate", () => {
	it("substitutes simple slots", () => {
		const out = renderTemplate("<p>{{title}}</p>", { title: "Hi" });
		expect(out).toContain("<p>Hi</p>");
	});

	it("renders {{#each}} loops", () => {
		const out = renderTemplate(
			"<ul>{{#each items}}<li>{{this}}</li>{{/each}}</ul>",
			{ items: ["a", "b"] },
		);
		expect(out).toContain("<li>a</li>");
		expect(out).toContain("<li>b</li>");
	});

	it("triple-stash renders raw HTML", () => {
		const out = renderTemplate("<div>{{{body}}}</div>", { body: "<b>x</b>" });
		expect(out).toContain("<b>x</b>");
	});
});
