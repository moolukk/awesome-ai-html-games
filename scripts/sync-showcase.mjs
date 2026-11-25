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
	const match = markdown.match(
		/^## AI page showcase \(\d+\)\n([\s\S]*?)(?=\n## |\s*$)/m,
	);
	if (!match) {
		return { models: [], categories: [], entries: [] };
	}

	const lines = match[1]
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.startsWith("- "));

	const models = [];
	const categories = [];
	const entries = [];

	for (const line of lines) {
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

		const parenMatch = rawTitle.match(/^(.+?)\s+\(([^()]+)\)$/);
		if (parenMatch) {
			title = parenMatch[1].trim();
			const tokens = parenMatch[2]
				.split("·")
				.map((token) => token.trim())
				.filter(Boolean);

			const remaining = [];
			for (const token of tokens) {
				if (token.startsWith("by ")) {
					authorName = token.slice(3).trim();
				} else if (/^\d+(?:\.\d+)?\s*(?:B|KB|MB)$/i.test(token)) {
					sizeLabel = token;
				} else if (
					/^(?:MIT|Apache|GPL|BSD|ISC|CC0|CC-BY|MPL|Unlicense)/i.test(token)
				) {
					license = token;
				} else {
					remaining.push(token);
				}
			}
			if (remaining.length >= 2) {
				category = remaining[0];
				modelLabel = remaining[1];
			} else if (remaining.length === 1) {
				modelLabel = remaining[0];
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

	const catalog = {
		source: SOURCE_URL,
		showcaseUrl: SHOWCASE_URL,
		updatedAt: new Date().toISOString(),
		models: parsed.models,
		categories: parsed.categories,
		entries: parsed.entries,
	};
	await writeFile(CATALOG_PATH, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");

	const readme = await readFile(README_PATH, "utf8");
	const startIdx = readme.indexOf(START_MARKER);
	const endIdx = readme.indexOf(END_MARKER);
	if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
		throw new Error("README.md is missing SHOWCASE_CATALOG markers.");
	}

	const rendered = renderCatalogMarkdown(parsed);
	const nextReadme = `${readme.slice(0, startIdx + START_MARKER.length)}\n${rendered}\n${readme.slice(endIdx)}`;
	await writeFile(README_PATH, nextReadme, "utf8");

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
