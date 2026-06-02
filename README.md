# Azure DevOps Docs Viewer

A Chrome extension that renders **Markdown**, **PlantUML**, and **OpenAPI** files directly in the browser when viewing them in Azure DevOps (dev.azure.com).

## Features

- 📄 Renders `.md` files with GitHub-style formatting
- 📊 Renders `.puml` / `.plantuml` diagrams via [plantuml.com](https://plantuml.com)
- 📑 Renders `.yaml` / `.yml` / `.json` OpenAPI (Swagger) specs with [Swagger UI](https://swagger.io/tools/swagger-ui/)
- 🔗 Relative links in Markdown work and the back button navigates history
- 🔍 Zoom in/out on diagrams (buttons or `Ctrl/Cmd + scroll`)
- 🔀 Works on regular file views **and** Pull Request file views
- 🔒 Supports private repositories via a Personal Access Token (PAT)
- ⏸️ Toggle auto-render on/off from the extension popup

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
- Create a token with **Code (read)** scope

## Usage

1. Browse to any `.md`, `.puml`, `.yaml`/`.yml`, or `.json` file in Azure DevOps
2. A new tab opens automatically with the rendered content
3. Use the toggle in the popup to disable auto-render if needed

OpenAPI files (`.yaml`, `.yml`, `.json`) are rendered with Swagger UI. If a file cannot be recognised as a valid OpenAPI/Swagger spec a warning is shown but rendering is still attempted.

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
