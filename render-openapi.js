(async function () {
  const params = new URLSearchParams(location.search);
  const filePath = params.get('path');
  const prId = params.get('prId');
  const branch = params.get('branch');

  const statusEl = document.getElementById('status');
  const warningEl = document.getElementById('warning');
  const swaggerEl = document.getElementById('swagger-ui');
  const filepathEl = document.getElementById('filepath');
  const sourceLinkEl = document.getElementById('sourceLink');

  const org = params.get('org');
  const project = params.get('project');
  const repo = params.get('repo');
  const branchParam = branch ? `&version=GB${encodeURIComponent(branch)}` : '';
  const sourceUrl =
    `https://dev.azure.com/${encodeURIComponent(org)}/${encodeURIComponent(project)}` +
    `/_git/${encodeURIComponent(repo)}?path=${encodeURIComponent(filePath)}${branchParam}`;

  const label = prId ? `PR #${prId}` : branch ? `Branch: ${branch}` : null;
  filepathEl.textContent = (label ? `${label} — ` : '') + filePath;
  document.title = filePath.split('/').pop();
  sourceLinkEl.href = sourceUrl;

  const { pat = '' } = await chrome.storage.sync.get(['pat']);

  let rawText;
  try {
    const result = await fetchAzureFile(params, pat);
    rawText = result.text;
  } catch (err) {
    statusEl.className = 'error';
    statusEl.textContent = `Failed to fetch file: ${err.message}`;
    return;
  }

  // Parse YAML or JSON into a spec object
  let spec;
  try {
    spec = jsyaml.load(rawText);
  } catch (err) {
    statusEl.className = 'error';
    statusEl.textContent = `Failed to parse file: ${err.message}`;
    return;
  }

  // Validate it looks like an OpenAPI spec
  const isOpenApi =
    spec !== null &&
    typeof spec === 'object' &&
    (typeof spec.openapi === 'string' || typeof spec.swagger === 'string') &&
    typeof spec.info === 'object';

  if (!isOpenApi) {
    warningEl.textContent =
      '⚠️ This file does not appear to be a valid OpenAPI/Swagger spec (missing "openapi"/"swagger" and "info" fields). ' +
      'Attempting to render anyway.';
    warningEl.style.display = 'block';
  }

  statusEl.style.display = 'none';
  swaggerEl.style.display = '';

  SwaggerUIBundle({
    spec,
    domNode: swaggerEl,
    presets: [
      SwaggerUIBundle.presets.apis,
      SwaggerUIBundle.SwaggerUIStandalonePreset,
    ],
    layout: 'BaseLayout',
    deepLinking: true,
    displayRequestDuration: true,
    tryItOutEnabled: false,
  });
})();
