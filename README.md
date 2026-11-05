# Azure DevOps Docs Viewer

A Chrome extension that renders **Markdown**, **PlantUML**, **OpenAPI**, and **GraphQL schema** files directly in the browser when viewing them in Azure DevOps (dev.azure.com) — and, for GraphQL schemas, also on raw files served by any site.

## Features

- 📄 Renders `.md` files with GitHub-style formatting
- 📊 Renders `.puml` / `.plantuml` diagrams via [plantuml.com](https://plantuml.com)
- 🧜 Renders `.mmd` / `.mermaid` files and ` ```mermaid ` code blocks in Markdown with [Mermaid](https://mermaid.js.org/) (locally, no external server)
- 📑 Renders `.yaml` / `.yml` / `.json` OpenAPI (Swagger) specs with [Swagger UI](https://swagger.io/tools/swagger-ui/)
- 🕸️ Renders `.graphql` / `.gql` GraphQL SDL schema files with [GraphQL Voyager](https://github.com/APIs-guru/graphql-voyager) — an interactive, explorable graph of types and their relationships. Works both in Azure DevOps and on raw schema files served directly by any site (e.g. `https://api.example.com/graphql/schema.graphql`)
- 🔗 Relative links in Markdown work and the back button navigates history
- 🔍 Zoom in/out on diagrams (buttons or `Ctrl/Cmd + scroll`)
- 💬 On Pull Request views, hover a block of rendered Markdown and click **+** to comment on the matching source lines. Existing PR threads on the file are shown inline, with reply and resolve (block-level anchoring; needs a PAT with Code read & write)
- 🔀 Works on regular file views **and** Pull Request file views
- 🔒 Supports private repositories via a Personal Access Token (PAT)
- 🔵 Shows a small floating icon over recognized documents — click it to open the rendered view in a new tab (nothing opens automatically)
- 🎨 The icon's color/glyph reflects the doc type (Markdown, PlantUML, Mermaid, OpenAPI, GraphQL), and for diagrams it shows the detected kind (Sequence, Class, Component, State, ...) when it can be determined from the file content

## Installation

> Chrome does not allow installing extensions from arbitrary URLs, so you need to load it manually as an **unpacked extension**. This takes about 2 minutes.

### 1. Get the code

**Option A — Clone with Git:**
```bash
git clone https://github.com/lukasblaho/ado-docs-viewer.git
```

**Option B — Download ZIP:**
1. Go to the repository on GitHub
2. Click **Code → Download ZIP**
3. Unzip the downloaded file

### 2. Load in Chrome

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `ado-docs-viewer` folder (the one containing `manifest.json`)

The extension icon (blue square) will appear in your toolbar.

### 3. Configure your PAT (for private repositories)

1. Click the extension icon in the toolbar
2. Paste your Azure DevOps **Personal Access Token**
3. Click **Save**

To create a PAT in Azure DevOps:
- Go to `dev.azure.com` → User Settings → Personal access tokens
- Create a token with **Code (read)** scope (use **Code (read & write)** to post PR comments)

### 4. (Optional) Restrict which domains can trigger raw GraphQL detection

Since raw `.graphql`/`.gql` file detection works on **any** site (not just
Azure DevOps), you can restrict it to specific domains via the extension
popup: enter one hostname per line under **Allowed domains for raw GraphQL
schema files** (e.g. `api-ppe.wag-test.local`). Subdomains of an allowed
domain are matched automatically. Leave the list empty to allow detection on
any site (the default). Azure DevOps is always allowed regardless of this
list.

## Usage

1. Browse to any `.md`, `.puml`, `.yaml`/`.yml`, `.json`, `.mmd`/`.mermaid`, or `.graphql`/`.gql` file in Azure DevOps — or a raw `.graphql`/`.gql` schema file served by any site
2. A small floating icon appears in the bottom-right corner of the page, colored/shaped according to the doc type, indicating the file was recognized
3. Click the icon to open the rendered content in a new tab

For Mermaid and PlantUML files, the extension briefly inspects the file content to detect the specific diagram kind (e.g. Sequence, Class, Component, State) and shows it as a small badge on the icon and in its tooltip.

OpenAPI files (`.yaml`, `.yml`, `.json`) are rendered with Swagger UI. If a file cannot be recognised as a valid OpenAPI/Swagger spec a warning is shown but rendering is still attempted.

Mermaid diagrams in `.mmd`/`.mermaid` files are rendered with zoom controls. Mermaid ` ```mermaid ` fenced code blocks inside `.md` files are also rendered inline.

GraphQL schema files (`.graphql`/`.gql`) are rendered with [GraphQL Voyager](https://github.com/APIs-guru/graphql-voyager), showing an interactive, explorable diagram of all types and how they relate to each other. On non-Azure-DevOps sites, the extension only shows the icon after sniffing the page content for actual SDL keywords (`type`, `schema`, `interface`, `enum`, ...) — a URL merely containing "graphql" is not enough to trigger it.

### How GraphQL rendering works under the hood

GraphQL Voyager needs to spin up a Web Worker (for its graph-layout engine) using a `blob:` URL, which Chrome's regular extension-page CSP forbids outright. To work around this, the Voyager UI is rendered inside a Chrome **sandboxed page** (`voyager-sandbox.html`), which is allowed a more permissive CSP for exactly this use case. The outer render tab (`render-graphql.html`) fetches the raw schema text, converts it to introspection JSON using a vendored copy of `graphql-js`, and hands it off to the sandboxed iframe via `postMessage`. Everything — Voyager's UI bundle and the GraphQL parser — is vendored locally in `lib/`; no schema content or introspection data is sent to any external server.

## Keeping it up to date

Since this is loaded as an unpacked extension, updates are not automatic.

```bash
cd ado-docs-viewer
git pull
```

Then go to `chrome://extensions` and click the **refresh icon** on the extension card.

## Privacy note

PlantUML diagram source is sent to the public [plantuml.com](https://plantuml.com) server for rendering. If your diagrams contain sensitive information, consider running a [local PlantUML server](https://plantuml.com/starting) instead.

OpenAPI specs are rendered entirely **locally** using the bundled Swagger UI library — no data is sent to any external server.

Mermaid diagrams are also rendered entirely **locally** using the bundled Mermaid library.

GraphQL schema diagrams are also rendered entirely **locally** using the bundled GraphQL Voyager and `graphql-js` libraries — no schema content leaves your browser. Note that the extension requests broad host permissions (`<all_urls>`) so it can detect and fetch raw `.graphql`/`.gql` files served on any site; it only activates its icon after positively sniffing GraphQL SDL content.
