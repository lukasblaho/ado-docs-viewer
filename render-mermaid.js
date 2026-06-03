(async function () {
  const params = new URLSearchParams(location.search);
  const filePath = params.get('path');
  const prId = params.get('prId');
  const branch = params.get('branch');

  const statusEl = document.getElementById('status');
  const diagramWrapEl = document.getElementById('diagram-wrap');
  const diagramEl = document.getElementById('diagram');
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

  let source;
  try {
    const result = await fetchAzureFile(params, pat);
    source = result.text;
  } catch (err) {
    statusEl.className = 'error';
    statusEl.textContent = `Failed to fetch file: ${err.message}`;
    return;
  }

  mermaid.initialize({ startOnLoad: false, theme: 'default' });

  let svg;
  try {
    ({ svg } = await mermaid.render('mermaid-diagram', source));
  } catch (err) {
    statusEl.className = 'error';
    statusEl.textContent = `Failed to render diagram: ${err.message}`;
    return;
  }

  statusEl.style.display = 'none';
  diagramWrapEl.style.display = '';
  diagramEl.innerHTML = svg;

  // Zoom controls
  let scale = 1;
  const svgEl = diagramEl.querySelector('svg');
  const zoomLevelEl = document.getElementById('zoom-level');

  function applyZoom() {
    svgEl.style.transform = `scale(${scale})`;
    svgEl.style.transformOrigin = 'top left';
    zoomLevelEl.textContent = `${Math.round(scale * 100)}%`;
  }

  document.getElementById('zoomIn').addEventListener('click', () => { scale = Math.min(scale + 0.25, 5); applyZoom(); });
  document.getElementById('zoomOut').addEventListener('click', () => { scale = Math.max(scale - 0.25, 0.25); applyZoom(); });
  document.getElementById('zoomReset').addEventListener('click', () => { scale = 1; applyZoom(); });

  diagramWrapEl.addEventListener('wheel', e => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    scale = Math.min(Math.max(scale + (e.deltaY < 0 ? 0.1 : -0.1), 0.25), 5);
    applyZoom();
  }, { passive: false });
})();
