# Awesome AI HTML Games & Interactive Demos

[![Live Showcase](https://img.shields.io/badge/Live%20Showcase-ahanow.ai%2Fshowcase-111111)](https://ahanow.ai/showcase)
[![Submit a Creation](https://img.shields.io/badge/Submit-Single--File%20HTML-0a7ea4)](https://ahanow.ai/showcase?submit=1)
[![License: CC0-1.0](https://img.shields.io/badge/License-CC0%201.0-lightgrey.svg)](LICENSE)

A curated, machine-readable directory of **playable single-file HTML games and interactive web demos** created with frontier AI models (such as Claude Opus 5.5, Gemini 4, GPT-5, and open-weights coding models).

Every listed creation runs directly in the browser with **zero installation** inside an isolated CSP sandbox at **[AhaNow AI Page Showcase](https://ahanow.ai/showcase)**, with explicit author attribution, source links, model labels, and technical specifications.

---

## Why Single-File AI HTML Games?

- **Instant playable proof of model capability**: Static screenshots and benchmarks rarely show how well an LLM handles physics, WebGL shaders, procedural audio, and game loops.
- **Zero-install sandboxed execution**: Every entry on [ahanow.ai/showcase](https://ahanow.ai/showcase) runs in an isolated browser sandbox (no downloads, no sign-in required to play).
- **Transparent attribution**: Each detail page credits the original creator, links back to their X / GitHub / website, and notes the open-source license and detected browser APIs (Canvas 2D, WebGL, WebAudio, Pointer Lock, etc.).

---

## Live Catalog

<!-- SHOWCASE_CATALOG:START -->
> Catalog syncs automatically from [`https://ahanow.ai/llms-full.txt`](https://ahanow.ai/llms-full.txt) via [`.github/workflows/sync-showcase.yml`](.github/workflows/sync-showcase.yml).
>
> Browse the live playable directory at **[https://ahanow.ai/showcase](https://ahanow.ai/showcase)**.

| Title | Model | Category | Size | Author | License | Playable Page |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| _Awaiting first synced entries from `ahanow.ai/showcase`_ | — | — | — | — | — | [Browse Showcase](https://ahanow.ai/showcase) |
<!-- SHOWCASE_CATALOG:END -->

---

## How to Submit a Creation

You can add a single-file `.html` game or interactive demo in either of two ways:

1. **Direct online submission (fastest)**: Upload your self-contained `.html` file (up to 32 MB) with title, model label, summary, and author link at **[ahanow.ai/showcase?submit=1](https://ahanow.ai/showcase?submit=1)**. Once approved, it receives a permanent playable detail page and syncs here automatically.
2. **GitHub Pull Request**: See [CONTRIBUTING.md](CONTRIBUTING.md) to propose a new entry or metadata fix directly via PR.

---

## Automation

This repository includes a zero-dependency sync script ([`scripts/sync-showcase.mjs`](scripts/sync-showcase.mjs)) that reads the published showcase inventory from [`https://ahanow.ai/llms-full.txt`](https://ahanow.ai/llms-full.txt), updates [`data/catalog.json`](data/catalog.json), and refreshes the Markdown tables in `README.md` daily via GitHub Actions.

```bash
node scripts/sync-showcase.mjs
```

---

## License

To the extent possible under law, this curated list is dedicated to the public domain under [CC0 1.0 Universal](LICENSE). Individual HTML games and demos linked from this directory remain under their respective authors' licenses.
