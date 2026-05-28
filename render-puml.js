// PlantUML encoding: deflate + custom base64
// See: https://plantuml.com/text-encoding
function encodePlantUml(source) {
  const PLANTUML_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';

  function encode6bit(b) {
    return PLANTUML_CHARS[b & 0x3F];
  }

  function append3bytes(b1, b2, b3) {
    const c1 = b1 >> 2;
    const c2 = ((b1 & 0x3) << 4) | (b2 >> 4);
    const c3 = ((b2 & 0xF) << 2) | (b3 >> 6);
    const c4 = b3 & 0x3F;
    return encode6bit(c1) + encode6bit(c2) + encode6bit(c3) + encode6bit(c4);
  }

  // UTF-8 encode
  const utf8 = new TextEncoder().encode(source);

  // Deflate (raw) using pako
  const compressed = pako.deflateRaw(utf8, { level: 9 });

  // Encode to PlantUML base64
  let result = '';
  for (let i = 0; i < compressed.length; i += 3) {
    const b1 = compressed[i];
    const b2 = i + 1 < compressed.length ? compressed[i + 1] : 0;
    const b3 = i + 2 < compressed.length ? compressed[i + 2] : 0;
    result += append3bytes(b1, b2, b3);
  }
  return result;
}

(async function () {
  const params = new URLSearchParams(location.search);
  const filePath = params.get('path');
  const prId = params.get('prId');

  const statusEl = document.getElementById('status');
  const diagramWrap = document.getElementById('diagram-wrap');
  const diagramImg = document.getElementById('diagram');
  const filepathEl = document.getElementById('filepath');
  const sourceLinkEl = document.getElementById('sourceLink');
  const svgLinkEl = document.getElementById('svgLink');

  const org = params.get('org');
  const project = params.get('project');
  const repo = params.get('repo');
  const sourceUrl = `https://dev.azure.com/${encodeURIComponent(org)}/${encodeURIComponent(project)}/_git/${encodeURIComponent(repo)}?path=${encodeURIComponent(filePath)}`;
  filepathEl.textContent = (prId ? `PR #${prId} — ` : '') + filePath;
  document.title = filePath.split('/').pop();
  sourceLinkEl.href = sourceUrl;

  const { pat = '' } = await chrome.storage.sync.get(['pat']);

  let pumlSource;
  try {
    const result = await fetchAzureFile(params, pat);
    pumlSource = result.text;
  } catch (err) {
    statusEl.className = 'error';
    statusEl.textContent = `Failed to fetch diagram: ${err.message}`;
    return;
  }

  let encoded;
  try {
    encoded = encodePlantUml(pumlSource);
  } catch (err) {
    statusEl.className = 'error';
    statusEl.textContent = `Failed to encode diagram: ${err.message}`;
    return;
  }

  const svgUrl = `https://www.plantuml.com/plantuml/svg/${encoded}`;
  svgLinkEl.href = svgUrl;
  svgLinkEl.style.display = '';

  diagramImg.src = svgUrl;
  diagramImg.onerror = () => {
    statusEl.className = 'error';
    statusEl.textContent = 'Failed to render diagram from plantuml.com. Check that your PlantUML source is valid.';
    statusEl.style.display = '';
    diagramWrap.style.display = 'none';
  };

  let naturalWidth = 0;
  diagramImg.onload = () => {
    statusEl.style.display = 'none';
    diagramWrap.style.display = '';
    // Capture natural size after load; use it as the 100% baseline
    naturalWidth = diagramImg.naturalWidth || diagramImg.offsetWidth || 800;
    diagramImg.style.width = naturalWidth + 'px';
  };

  // Zoom controls — change actual image width so container scrolls correctly
  const zoomLevelEl = document.getElementById('zoom-level');
  let scale = 1;
  const STEP = 0.2;
  const MIN = 0.2;
  const MAX = 5;

  function applyZoom() {
    if (naturalWidth) diagramImg.style.width = Math.round(naturalWidth * scale) + 'px';
    zoomLevelEl.textContent = Math.round(scale * 100) + '%';
  }

  document.getElementById('zoomIn').addEventListener('click', () => {
    scale = Math.min(MAX, parseFloat((scale + STEP).toFixed(2)));
    applyZoom();
  });
  document.getElementById('zoomOut').addEventListener('click', () => {
    scale = Math.max(MIN, parseFloat((scale - STEP).toFixed(2)));
    applyZoom();
  });
  document.getElementById('zoomReset').addEventListener('click', () => {
    scale = 1;
    applyZoom();
  });

  // Ctrl/Cmd + scroll wheel zoom
  diagramWrap.addEventListener('wheel', (e) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? STEP : -STEP;
    scale = Math.min(MAX, Math.max(MIN, parseFloat((scale + delta).toFixed(2))));
    applyZoom();
  }, { passive: false });
})();
