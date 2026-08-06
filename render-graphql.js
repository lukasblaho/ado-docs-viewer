(async function () {
  const params = new URLSearchParams(location.search);
  const src = params.get('src'); // generic raw-file mode (non-Azure DevOps)
  const filePath = params.get('path'); // ADO mode

  const statusEl = document.getElementById('status');
  const filepathEl = document.getElementById('filepath');
  const sourceLinkEl = document.getElementById('sourceLink');
  const frameEl = document.getElementById('voyagerFrame');

  let sourceUrl;
  let displayName;

  if (src) {
    // Generic raw-file mode: `src` is the absolute URL of the raw schema file.
    sourceUrl = src;
    displayName = decodeURIComponent(src);
  } else {
    // Azure DevOps mode: same org/project/repo/path/[prId]/[branch] contract
    // used by the other render-*.js pages.
    const org = params.get('org');
    const project = params.get('project');
    const repo = params.get('repo');
    const prId = params.get('prId');
    const branch = params.get('branch');
    const branchParam = branch ? `&version=GB${encodeURIComponent(branch)}` : '';
    sourceUrl =
      `https://dev.azure.com/${encodeURIComponent(org)}/${encodeURIComponent(project)}` +
      `/_git/${encodeURIComponent(repo)}?path=${encodeURIComponent(filePath)}${branchParam}`;
    const label = prId ? `PR #${prId}` : branch ? `Branch: ${branch}` : null;
    displayName = (label ? `${label} — ` : '') + filePath;
  }

  filepathEl.textContent = displayName;
  document.title = (filePath || src || 'schema').split('/').pop().split('?')[0];
  sourceLinkEl.href = sourceUrl;

  let sdlText;
  try {
    if (src) {
      const resp = await fetch(src, { credentials: 'include' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
      sdlText = await resp.text();
    } else {
      const { pat = '' } = await chrome.storage.sync.get(['pat']);
      const result = await fetchAzureFile(params, pat);
      sdlText = result.text;
    }
  } catch (err) {
    statusEl.className = 'error';
    statusEl.textContent = `Failed to fetch schema: ${err.message}`;
    return;
  }

  let introspection;
  try {
    const { buildSchema, introspectionFromSchema } = await import(chrome.runtime.getURL('lib/graphql.esm.js'));
    const schema = buildSchema(sdlText);
    introspection = introspectionFromSchema(schema); // => { __schema: {...} }
  } catch (err) {
    statusEl.className = 'error';
    statusEl.textContent = `Failed to parse GraphQL schema: ${err.message}`;
    return;
  }

  // Wait for the sandboxed iframe to signal it has loaded Voyager and is
  // ready to receive the introspection payload, then hand it off.
  function sendToFrame() {
    frameEl.contentWindow.postMessage({ type: 'render', introspection }, '*');
  }

  window.addEventListener('message', (event) => {
    if (event.source !== frameEl.contentWindow) return;
    if (event.data && event.data.type === 'ready') {
      statusEl.style.display = 'none';
      sendToFrame();
    } else if (event.data && event.data.type === 'error') {
      statusEl.className = 'error';
      statusEl.textContent = `Failed to render diagram: ${event.data.message}`;
    }
  });
})();
