// Content script: detects .md, .puml, .yaml/.yml/.json, and .mmd file views
// on dev.azure.com and shows a floating icon in the bottom-right corner.
// The icon's color/glyph reflects the doc type, and for diagrams
// (Mermaid/PlantUML) the file content is sniffed to further show the
// specific diagram kind (sequence, class, component, ...). Clicking the
// icon opens a rendered version of the file in a new tab.
// Handles both regular file views and PR file views.

let lastUrl = null;
let currentRenderUrl = null;
let detectToken = 0; // guards against stale async subtype-detection results

// --- Doc "kind" definitions: color + glyph per file type ---
const KIND_STYLES = {
  markdown: { color: '#0078d4', label: 'Markdown', svg:
    '<rect x="4" y="2" width="16" height="20" rx="2"/><line x1="7" y1="7" x2="17" y2="7"/><line x1="7" y1="11" x2="17" y2="11"/><line x1="7" y1="15" x2="13" y2="15"/>' },
  openapi: { color: '#2da44e', label: 'OpenAPI', svg:
    '<path d="M9 3v3M15 3v3M9 21v-3M15 21v-3M6 9h12a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2z"/>' },
  plantuml: { color: '#8250df', label: 'PlantUML', svg:
    '<rect x="3" y="3" width="9" height="6"/><rect x="12" y="15" width="9" height="6"/><path d="M7.5 9v3.5h9V15"/>' },
  mermaid: { color: '#0e9594', label: 'Mermaid', svg:
    '<circle cx="5" cy="12" r="2.2"/><circle cx="19" cy="5" r="2.2"/><circle cx="19" cy="19" r="2.2"/><path d="M7 12h3.5M11.5 11l6-4.5M11.5 13l6 4.5"/>' },
  graphql: { color: '#e10098', label: 'GraphQL', svg:
    '<circle cx="12" cy="4.5" r="1.8"/><circle cx="20" cy="8.5" r="1.8"/><circle cx="20" cy="16.5" r="1.8"/><circle cx="12" cy="20.5" r="1.8"/><circle cx="4" cy="16.5" r="1.8"/><circle cx="4" cy="8.5" r="1.8"/><path d="M12 6.3v12.4M6 9.7l6-3.4M6 15.3l6 3.4M18 9.7l-6-3.4M18 15.3l-6 3.4M6 9.7v5.6M18 9.7v5.6"/>' },
};

// Mermaid diagram-type keyword → friendly subtype label.
const MERMAID_SUBTYPES = [
  [/^sequencediagram/, 'Sequence'],
  [/^classdiagram/, 'Class'],
  [/^statediagram/, 'State'],
  [/^erdiagram/, 'Entity-Relationship'],
  [/^gantt/, 'Gantt'],
  [/^pie/, 'Pie'],
  [/^journey/, 'User Journey'],
  [/^gitgraph/, 'Git Graph'],
  [/^mindmap/, 'Mindmap'],
  [/^timeline/, 'Timeline'],
  [/^quadrantchart/, 'Quadrant'],
  [/^requirementdiagram/, 'Requirement'],
  [/^c4(context|container|component|dynamic|deployment)/, 'C4'],
  [/^(flowchart|graph)/, 'Flowchart'],
];

// Best-effort PlantUML subtype detection via common keyword heuristics.
const PLANTUML_SUBTYPES = [
  [/^\s*(class|interface|abstract|enum)\s/mi, 'Class'],
  [/^\s*(component|package|node|folder|database|cloud|frame|artifact)\b/mi, 'Component'],
  [/^\s*state\s|-->\s*\[\*\]|\[\*\]\s*-->/mi, 'State'],
  [/^\s*usecase\b|\(.*\)\s+as\s+/mi, 'Use Case'],
  [/^\s*(participant|actor)\b.*\n[\s\S]*(->|-->)/mi, 'Sequence'],
  [/(->|-->)/m, 'Sequence'],
];

function detectMermaidSubtype(text) {
  const firstLine = text.split(/\r?\n/).map(l => l.trim())
    .find(l => l && !l.startsWith('%%'));
  if (!firstLine) return null;
  const normalized = firstLine.toLowerCase();
  for (const [re, label] of MERMAID_SUBTYPES) {
    if (re.test(normalized)) return label;
  }
  return null;
}

function detectPlantUMLSubtype(text) {
  for (const [re, label] of PLANTUML_SUBTYPES) {
    if (re.test(text)) return label;
  }
  return null;
}

// --- Floating icon (isolated via Shadow DOM so ADO page styles can't clash) ---
let iconHost = null;
let iconShadow = null;

function ensureIcon() {
  if (iconHost) return;

  iconHost = document.createElement('div');
  iconHost.id = 'aparecium-icon-host';
  iconShadow = iconHost.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `
    .btn {
      position: fixed;
      bottom: 16px;
      right: 16px;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #0078d4;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.35);
      cursor: pointer;
      border: 2px solid #ffffff;
      z-index: 2147483647;
      transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
    }
    .btn:hover {
      transform: scale(1.08);
      box-shadow: 0 4px 12px rgba(0,0,0,0.45);
    }
    .btn svg {
      width: 22px;
      height: 22px;
      pointer-events: none;
      fill: none;
      stroke: #ffffff;
      stroke-width: 1.6;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .badge {
      position: absolute;
      bottom: -4px;
      right: -4px;
      max-width: 46px;
      padding: 1px 4px;
      border-radius: 6px;
      background: #1e1e1e;
      color: #fff;
      font: 600 8px/12px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      box-shadow: 0 0 0 1.5px #ffffff;
    }
  `;

  const btn = document.createElement('div');
  btn.className = 'btn';
  btn.title = 'View rendered document';

  btn.addEventListener('click', () => {
    if (!currentRenderUrl) return;
    try {
      chrome.runtime.sendMessage({ action: 'openTab', url: currentRenderUrl });
    } catch {
      // Extension context invalidated — nothing to do
    }
  });

  iconShadow.appendChild(style);
  iconShadow.appendChild(btn);
  document.documentElement.appendChild(iconHost);
}

// Updates the icon's color, glyph, optional subtype badge, and tooltip.
function paintIcon(kind, subtypeLabel) {
  ensureIcon();
  const btn = iconShadow.querySelector('.btn');
  const style = KIND_STYLES[kind] || KIND_STYLES.markdown;

  btn.style.background = style.color;
  btn.querySelectorAll('svg, .badge').forEach(el => el.remove());

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.innerHTML = style.svg;
  btn.appendChild(svg);

  let tooltip = `View rendered ${style.label}`;
  if (subtypeLabel) {
    const badge = document.createElement('div');
    badge.className = 'badge';
    badge.textContent = subtypeLabel;
    btn.appendChild(badge);
    tooltip += ` (${subtypeLabel} diagram)`;
  }
  tooltip += ' — click to open';
  btn.title = tooltip;
}

function showIcon(renderUrl, kind, subtypeLabel) {
  currentRenderUrl = renderUrl;
  paintIcon(kind, subtypeLabel);
  iconHost.style.display = '';
}

function hideIcon() {
  currentRenderUrl = null;
  detectToken++; // invalidate any in-flight subtype detection
  if (iconHost) iconHost.style.display = 'none';
}

// Best-effort fetch of the raw file content (same-origin, relies on the
// user's existing ADO session cookies) purely to sniff the diagram subtype.
// Failures are swallowed — the icon still works without a subtype badge.
async function fetchFileTextForSniffing(org, project, repo, filePath, prId, branch) {
  const base = `https://dev.azure.com/${encodeURIComponent(org)}/${encodeURIComponent(project)}`;
  try {
    let versionParam = '';
    if (prId) {
      const prResp = await fetch(`${base}/_apis/git/pullrequests/${prId}?api-version=7.1`, { credentials: 'same-origin' });
      if (prResp.ok) {
        const prData = await prResp.json();
        const refName = prData.sourceRefName?.replace(/^refs\/heads\//, '') ?? '';
        if (refName) {
          versionParam = `&versionDescriptor.version=${encodeURIComponent(refName)}&versionDescriptor.versionType=branch`;
        }
      }
    } else if (branch) {
      versionParam = `&versionDescriptor.version=${encodeURIComponent(branch)}&versionDescriptor.versionType=branch`;
    }

    const apiUrl =
      `${base}/_apis/git/repositories/${encodeURIComponent(repo)}/items` +
      `?path=${encodeURIComponent(filePath)}&$format=text&api-version=7.1${versionParam}`;
    const resp = await fetch(apiUrl, { credentials: 'same-origin' });
    if (!resp.ok) return null;
    return await resp.text();
  } catch {
    return null;
  }
}

// True while the extension context is still alive. Once the extension is
// reloaded/updated, `chrome.runtime` (and its APIs) become undefined for any
// already-injected content script, even though the page keeps running.
function isExtensionContextValid() {
  return typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id;
}

// GraphQL SDL keyword sniff used on generic (non-ADO) pages to avoid false
// positives on unrelated pages whose URL merely contains "graphql".
function looksLikeGraphQLSDLText(text) {
  if (!text) return false;
  return /(^|\n)\s*(type|interface|input|enum|union|scalar|schema)\s+[\w{]/.test(text) ||
    /(^|\n)\s*schema\s*\{/.test(text);
}

async function handleFileViewInner() {
  if (!isExtensionContextValid()) return;

  const url = window.location.href;
  if (url === lastUrl) return;
  lastUrl = url;

  if (window.location.hostname !== 'dev.azure.com') {
    await handleGenericGraphQLPage();
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const filePath = urlParams.get('path');
  if (!filePath) {
    hideIcon();
    return;
  }

  const ext = filePath.split('.').pop().toLowerCase();
  if (ext !== 'md' && ext !== 'puml' && ext !== 'plantuml' &&
      ext !== 'yaml' && ext !== 'yml' && ext !== 'json' &&
      ext !== 'mmd' && ext !== 'mermaid' &&
      ext !== 'graphql' && ext !== 'gql') {
    hideIcon();
    return;
  }

  // Match both regular file view and PR file view URLs:
  //   Regular: https://dev.azure.com/{org}/{project}/_git/{repo}?path=...
  //   PR:      https://dev.azure.com/{org}/{project}/_git/{repo}/pullrequest/{prId}?_a=files&path=...
  const match = url.match(
    /https:\/\/dev\.azure\.com\/([^/]+)\/([^/?#]+)\/_git\/([^/?#]+?)(?:\/pullrequest\/(\d+))?(?:\/|\?|$)/
  );
  if (!match) {
    hideIcon();
    return;
  }

  // Decode captured groups — the regex captures the raw URL-encoded form.
  const org = decodeURIComponent(match[1]);
  const project = decodeURIComponent(match[2]);
  const repo = decodeURIComponent(match[3]);
  const prId = match[4] || null; // present only on PR pages

  const kind = ext === 'md' ? 'markdown'
    : (ext === 'puml' || ext === 'plantuml') ? 'plantuml'
    : (ext === 'mmd' || ext === 'mermaid') ? 'mermaid'
    : (ext === 'graphql' || ext === 'gql') ? 'graphql'
    : 'openapi';
  const renderPage = kind === 'markdown' ? 'render-md.html'
    : kind === 'plantuml' ? 'render-puml.html'
    : kind === 'mermaid' ? 'render-mermaid.html'
    : kind === 'graphql' ? 'render-graphql.html'
    : 'render-openapi.html';
  let renderUrl =
    chrome.runtime.getURL(renderPage) +
    `?org=${encodeURIComponent(org)}&project=${encodeURIComponent(project)}` +
    `&repo=${encodeURIComponent(repo)}&path=${encodeURIComponent(filePath)}`;

  if (prId) {
    renderUrl += `&prId=${encodeURIComponent(prId)}`;
  }

  // Azure DevOps encodes the branch as "GB<branchname>" in the `version` param
  // e.g. version=GBfeature/my-branch
  const versionParam = urlParams.get('version');
  let branch = null;
  if (!prId && versionParam && versionParam.startsWith('GB')) {
    branch = versionParam.slice(2); // strip "GB" prefix
    renderUrl += `&branch=${encodeURIComponent(branch)}`;
  }

  // Show the base icon immediately; diagram subtype (if any) is added once sniffed.
  showIcon(renderUrl, kind, null);

  if (kind === 'mermaid' || kind === 'plantuml') {
    const myToken = ++detectToken;
    const text = await fetchFileTextForSniffing(org, project, repo, filePath, prId, branch);
    if (myToken !== detectToken || !text) return; // stale or unavailable
    const subtype = kind === 'mermaid' ? detectMermaidSubtype(text) : detectPlantUMLSubtype(text);
    if (subtype) paintIcon(kind, subtype);
  }
}

// Normalizes a stored/user-entered domain string down to a bare hostname,
// tolerating accidental full-URL pastes (e.g. "https://example.com/path")
// so a mismatched match. This mirrors popup.js's normalizeDomainEntry so
// old already-saved bad entries (before this normalization existed) still
// work without requiring the user to re-save.
function normalizeDomainForMatch(raw) {
  let value = (raw || '').trim().toLowerCase();
  if (!value) return '';
  if (!/^[a-z]+:\/\//.test(value)) {
    value = `https://${value}`;
  }
  try {
    return new URL(value).hostname;
  } catch {
    return (raw || '').trim().toLowerCase();
  }
}

// Checks whether `hostname` is allowed to have its raw .graphql/.gql files
// detected, based on the user-configured domain allowlist (chrome.storage.sync
// key `graphqlAllowedDomains`, one hostname per line). Matches exact hostname
// or subdomains (e.g. an allowlist entry of "example.com" also matches
// "api.example.com"). An empty/unset list means "allow any site" (the
// original broad-detection behavior).
async function isGraphQLDomainAllowed(hostname) {
  const { graphqlAllowedDomains = [] } = await chrome.storage.sync.get(['graphqlAllowedDomains']);
  if (!graphqlAllowedDomains.length) return true; // no allowlist configured -> allow all
  const host = hostname.toLowerCase();
  return graphqlAllowedDomains.some((domain) => {
    const d = normalizeDomainForMatch(domain);
    return d && (host === d || host.endsWith(`.${d}`));
  });
}

// Detects raw GraphQL SDL files served directly by any site (outside Azure
// DevOps), e.g. https://api.example.com/graphql/schema.graphql. Guards
// against false positives (pages whose URL merely contains "graphql") by
// sniffing the already-loaded page content for SDL keywords before showing
// the icon, and only activates on domains the user has explicitly allowed
// (if an allowlist is configured).
async function handleGenericGraphQLPage() {
  const pathname = window.location.pathname.toLowerCase();
  if (!pathname.endsWith('.graphql') && !pathname.endsWith('.gql')) {
    hideIcon();
    return;
  }

  if (!isExtensionContextValid()) return;
  const allowed = await isGraphQLDomainAllowed(window.location.hostname);
  if (!allowed) {
    hideIcon();
    return;
  }

  // Chrome's built-in plain-text viewer wraps raw file content in a single
  // <pre> element; fall back to the full body text for other renderings.
  const text = document.querySelector('pre')?.innerText || document.body?.innerText || '';
  if (!looksLikeGraphQLSDLText(text)) {
    hideIcon();
    return;
  }

  const renderUrl =
    chrome.runtime.getURL('render-graphql.html') +
    `?src=${encodeURIComponent(window.location.href)}`;
  showIcon(renderUrl, 'graphql', null);
}

// Wrapper: swallows any error (e.g. extension context invalidated mid-flight)
// so navigation-triggered calls never surface as unhandled promise rejections.
async function handleFileView() {
  try {
    await handleFileViewInner();
  } catch {
    // Extension context invalidated or a transient DOM/API error — ignore.
  }
}

// Initial check on page load
handleFileView();

// Debounced trigger: Azure DevOps SPA sometimes sets the URL in two steps —
// first ?path=... then adds &version=GBbranch via replaceState.  A small delay
// ensures we always read the fully-settled URL.
let debounceTimer = null;
function scheduleHandleFileView() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(handleFileView, 300);
}

// Patch history API to catch pushState / replaceState URL changes directly,
// which is more reliable than waiting for DOM mutations.
const _pushState = history.pushState.bind(history);
const _replaceState = history.replaceState.bind(history);
history.pushState = function (...args) { _pushState(...args); scheduleHandleFileView(); };
history.replaceState = function (...args) { _replaceState(...args); scheduleHandleFileView(); };

// MutationObserver as a fallback for navigations that bypass history API.
const navObserver = new MutationObserver(() => {
  if (location.href !== (navObserver._lastUrl ?? '')) {
    navObserver._lastUrl = location.href;
    scheduleHandleFileView();
  }
});
navObserver.observe(document.documentElement, { subtree: true, childList: true });
