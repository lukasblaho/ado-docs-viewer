// Content script: detects .md and .puml file views on dev.azure.com
// and opens a rendered version in a new tab.
// Handles both regular file views and PR file views.

let lastHandledUrl = null;

async function handleFileView() {
  const url = window.location.href;
  if (url === lastHandledUrl) return;

  const urlParams = new URLSearchParams(window.location.search);
  const filePath = urlParams.get('path');
  if (!filePath) return;

  const ext = filePath.split('.').pop().toLowerCase();
  if (ext !== 'md' && ext !== 'puml' && ext !== 'plantuml' &&
      ext !== 'yaml' && ext !== 'yml' && ext !== 'json' &&
      ext !== 'mmd' && ext !== 'mermaid') return;

  // Guard against invalidated extension context (e.g. after extension reload)
  try {
    const { enabled = true } = await chrome.storage.sync.get(['enabled']);
    if (!enabled) return;
  } catch {
    return;
  }

  // Match both regular file view and PR file view URLs:
  //   Regular: https://dev.azure.com/{org}/{project}/_git/{repo}?path=...
  //   PR:      https://dev.azure.com/{org}/{project}/_git/{repo}/pullrequest/{prId}?_a=files&path=...
  const match = url.match(
    /https:\/\/dev\.azure\.com\/([^/]+)\/([^/?#]+)\/_git\/([^/?#]+?)(?:\/pullrequest\/(\d+))?(?:\/|\?|$)/
  );
  if (!match) return;

  lastHandledUrl = url;

  // Decode captured groups — the regex captures the raw URL-encoded form.
  const org = decodeURIComponent(match[1]);
  const project = decodeURIComponent(match[2]);
  const repo = decodeURIComponent(match[3]);
  const prId = match[4] || null; // present only on PR pages

  const renderPage = ext === 'md' ? 'render-md.html'
    : (ext === 'puml' || ext === 'plantuml') ? 'render-puml.html'
    : (ext === 'mmd' || ext === 'mermaid') ? 'render-mermaid.html'
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
  if (!prId && versionParam && versionParam.startsWith('GB')) {
    const branch = versionParam.slice(2); // strip "GB" prefix
    renderUrl += `&branch=${encodeURIComponent(branch)}`;
  }

  try {
    chrome.runtime.sendMessage({ action: 'openTab', url: renderUrl });
  } catch {
    // Extension context invalidated — nothing to do
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
