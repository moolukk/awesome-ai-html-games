#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CATALOG_PATH = path.join(ROOT, "data", "catalog.json");
const README_PATH = path.join(ROOT, "README.md");

const SOURCE_URL =
	process.env.SHOWCASE_SOURCE_URL || "https://ahanow.ai/llms-full.txt";
const SHOWCASE_URL =
	process.env.SHOWCASE_BASE_URL || "https://ahanow.ai/showcase";

const START_MARKER = "<!-- SHOWCASE_CATALOG:START -->";
const END_MARKER = "<!-- SHOWCASE_CATALOG:END -->";

function escapePipe(value) {
	return String(value ?? "—").replace(/\|/g, "\\|").trim() || "—";
}

/**
 * Parse the `## AI page showcase (...)` section emitted by `ahanow.ai/llms-full.txt`.
 */
export function parseLlmsShowcaseSection(markdown) {
	const sections = markdown.replace(/\r\n/g, "\n").split(/^## /m).slice(1);
	const section = sections.find((value) =>
		/^AI page showcase \(\d+\)[ \t]*(?:\n|$)/.test(value),
	);
	if (!section) return { models: [], categories: [], entries: [] };

	const [heading, ...lines] = section.split("\n");
	const expectedCount = Number(heading.match(/\d+/)[0]);
	const models = [];
	const categories = [];
	const entries = [];

	for (const rawLine of lines) {
		const line = rawLine.trim();
		const modelMatch = line.match(
			/^- Model collection: \[(.+?) \((\d+)\)\]\((https?:\/\/[^)]+)\)$/,
		);
		if (modelMatch) {
			models.push({
				label: modelMatch[1],
				count: Number(modelMatch[2]),
				url: modelMatch[3],
			});
			continue;
		}

		const categoryMatch = line.match(
			/^- Category collection: \[(.+?) \((\d+)\)\]\((https?:\/\/[^)]+)\)$/,
		);
		if (categoryMatch) {
			categories.push({
				label: categoryMatch[1],
				count: Number(categoryMatch[2]),
				url: categoryMatch[3],
			});
			continue;
		}

		const entryMatch = line.match(
			/^- \[(.+?)\]\((https?:\/\/[^)]+)\)(?::\s*(.+))?$/,
		);
		if (!entryMatch) continue;

		const rawTitle = entryMatch[1];
		const url = entryMatch[2];
		const summary = entryMatch[3]?.trim() || null;

		let title = rawTitle;
		let category = null;
		let modelLabel = null;
		let authorName = null;
		let license = null;
		let sizeLabel = null;

		// The feed publishes its category and model collections before the works.
		// Recognize tags by those labels so either optional field can be omitted.
		const taggedTitle = rawTitle.match(/^(.+) \(((?:[^()]|\([^()]*\))*)\)$/);
		if (taggedTitle) {
			const tokens = taggedTitle[2].split(" · ");
			if (categories.some(({ label }) => label === tokens[0])) category = tokens.shift();
			if (models.some(({ label }) => label === tokens[0])) modelLabel = tokens.shift();
			if (tokens[0]?.startsWith("by ")) authorName = tokens.shift().slice(3);
			if (/^\d+(?:\.\d+)?\s*(?:B|KB|MB)$/i.test(tokens.at(-1))) {
				sizeLabel = tokens.pop();
			}
			// When only the title has parentheses, preserve them as part of the title.
			const hasLicense = /^(?:MIT|Apache|GPL|BSD|ISC|CC0|CC-BY|MPL|Unlicense)/i.test(tokens[0]);
			if (category || modelLabel || authorName || sizeLabel || hasLicense) {
				title = taggedTitle[1];
				license = tokens.join(" · ") || null;
			}
		}

		entries.push({
			title,
			url,
			summary,
			category,
			modelLabel,
			authorName,
			license,
			sizeLabel,
		});
	}

	if (entries.length !== expectedCount) {
		throw new Error(`Showcase advertises ${expectedCount} entries, parsed ${entries.length}.`);
	}
	return { models, categories, entries };
}

export function renderCatalogMarkdown({ models, categories, entries }) {
	const blocks = [
		`> Synced from [\`${SOURCE_URL}\`](${SOURCE_URL}). Browse and play all entries live at **[${SHOWCASE_URL.replace(/^https?:\/\//, "")}](${SHOWCASE_URL})**.`,
	];

	if (models.length > 0) {
		blocks.push(
			`### Browse by Model\n\n${models
				.map((m) => `- [${m.label} (${m.count})](${m.url})`)
				.join("\n")}`,
		);
	}

	if (categories.length > 0) {
		blocks.push(
			`### Browse by Category\n\n${categories
				.map((c) => `- [${c.label} (${c.count})](${c.url})`)
				.join("\n")}`,
		);
	}

	const header = [
		"### All Playable Creations",
		"",
		"| Title | Model | Category | Size | Author | License | Summary |",
		"| :--- | :--- | :--- | :--- | :--- | :--- | :--- |",
	];

	if (entries.length === 0) {
		header.push(
			`| _Awaiting first synced entries from \`ahanow.ai/showcase\`_ | — | — | — | — | — | [Browse Showcase](${SHOWCASE_URL}) |`,
		);
	} else {
		for (const entry of entries) {
			header.push(
				`| [${escapePipe(entry.title)}](${entry.url}) | ${escapePipe(entry.modelLabel)} | ${escapePipe(entry.category)} | ${escapePipe(entry.sizeLabel)} | ${escapePipe(entry.authorName)} | ${escapePipe(entry.license)} | ${escapePipe(entry.summary)} |`,
			);
		}
	}

	blocks.push(header.join("\n"));
	return blocks.join("\n\n");
}

async function main() {
	const response = await fetch(SOURCE_URL, {
		headers: { "User-Agent": "awesome-ai-html-games-sync/1.0" },
		signal: AbortSignal.timeout(15000),
	});
	if (!response.ok) {
		throw new Error(`Failed to fetch ${SOURCE_URL}: HTTP ${response.status}`);
	}

	const text = await response.text();
	const parsed = parseLlmsShowcaseSection(text);

	if (parsed.entries.length === 0) {
		console.log(
			`No showcase entries published yet at ${SOURCE_URL}; keeping existing catalog untouched.`,
		);
		return;
	}

	const previous = JSON.parse(await readFile(CATALOG_PATH, "utf8"));
	const catalog = {
		source: SOURCE_URL,
		showcaseUrl: SHOWCASE_URL,
		updatedAt: previous.updatedAt,
		models: parsed.models,
		categories: parsed.categories,
		entries: parsed.entries,
	};

	const readme = await readFile(README_PATH, "utf8");
	const startIdx = readme.indexOf(START_MARKER);
	const endIdx = readme.indexOf(END_MARKER);
	if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
		throw new Error("README.md is missing SHOWCASE_CATALOG markers.");
	}

	const rendered = renderCatalogMarkdown(parsed);
	const nextReadme = `${readme.slice(0, startIdx + START_MARKER.length)}\n${rendered}\n${readme.slice(endIdx)}`;
	if (JSON.stringify(previous) !== JSON.stringify(catalog)) {
		catalog.updatedAt = new Date().toISOString();
		await writeFile(CATALOG_PATH, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
	}
	if (readme !== nextReadme) await writeFile(README_PATH, nextReadme, "utf8");

	console.log(
		`Synced ${parsed.entries.length} entries (${parsed.models.length} models, ${parsed.categories.length} categories).`,
	);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	main().catch((error) => {
		console.error(error);
		process.exitCode = 1;
	});
}
