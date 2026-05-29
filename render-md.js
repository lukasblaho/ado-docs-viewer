(async function () {
  const params = new URLSearchParams(location.search);
  const filePath = params.get('path');
  const prId = params.get('prId');
  const branch = params.get('branch');

  const statusEl = document.getElementById('status');
  const contentEl = document.getElementById('content');
  const filepathEl = document.getElementById('filepath');
  const sourceLinkEl = document.getElementById('sourceLink');

  const org = params.get('org');
  const project = params.get('project');
  const repo = params.get('repo');
  const branchParam = branch ? `&version=GB${encodeURIComponent(branch)}` : '';
  const sourceUrl = `https://dev.azure.com/${encodeURIComponent(org)}/${encodeURIComponent(project)}/_git/${encodeURIComponent(repo)}?path=${encodeURIComponent(filePath)}${branchParam}`;
  const label = prId ? `PR #${prId}` : branch ? `Branch: ${branch}` : null;
  filepathEl.textContent = (label ? `${label} — ` : '') + filePath;
  document.title = filePath.split('/').pop();
  sourceLinkEl.href = sourceUrl;

  const { pat = '' } = await chrome.storage.sync.get(['pat']);

  let markdown;
  try {
    const result = await fetchAzureFile(params, pat);
    markdown = result.text;
  } catch (err) {
    statusEl.className = 'error';
    statusEl.textContent = `Failed to fetch file: ${err.message}`;
    return;
  }

  marked.setOptions({ gfm: true, breaks: false });

  statusEl.style.display = 'none';
  contentEl.style.display = '';
  contentEl.innerHTML = marked.parse(markdown);

  rewriteLinks(contentEl, org, project, repo, filePath, prId, branch);
})();

// Resolve a relative href against the current file's directory in the repo.
function resolveRepoPath(currentFilePath, href) {
  if (href.startsWith('/')) return href; // already absolute within repo

  const dir = currentFilePath.substring(0, currentFilePath.lastIndexOf('/') + 1);
  const parts = (dir + href).split('/');
  const resolved = [];
  for (const part of parts) {
    if (part === '..') resolved.pop();
    else if (part !== '.') resolved.push(part);
  }
  return resolved.join('/');
}

function rewriteLinks(container, org, project, repo, filePath, prId, branch) {
  const RENDER_EXTS = new Set(['md', 'puml', 'plantuml']);

  container.querySelectorAll('a[href]').forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;

    // Leave absolute URLs, anchors, and mailto as-is
    if (/^(https?:|mailto:|#)/.test(href)) return;

    // Split off any fragment (#section)
    const hashIdx = href.indexOf('#');
    const pathPart = hashIdx === -1 ? href : href.slice(0, hashIdx);
    const fragment = hashIdx === -1 ? '' : href.slice(hashIdx); // includes '#'

    const resolvedPath = resolveRepoPath(filePath, pathPart);
    const ext = resolvedPath.split('.').pop().toLowerCase();

    const prParam = prId ? `&prId=${encodeURIComponent(prId)}` : '';
    const branchParam = (!prId && branch) ? `&branch=${encodeURIComponent(branch)}` : '';

    if (RENDER_EXTS.has(ext)) {
      // Link to another renderable file → open in same tab (back button works)
      const renderPage = ext === 'md' ? 'render-md.html' : 'render-puml.html';
      link.href =
        chrome.runtime.getURL(renderPage) +
        `?org=${encodeURIComponent(org)}&project=${encodeURIComponent(project)}` +
        `&repo=${encodeURIComponent(repo)}&path=${encodeURIComponent(resolvedPath)}${prParam}${branchParam}` +
        fragment;
      link.target = '_self';
    } else {
      // Any other relative link → point to Azure DevOps file view in same tab
      const adoBranchParam = (!prId && branch) ? `&version=GB${encodeURIComponent(branch)}` : '';
      link.href =
        `https://dev.azure.com/${encodeURIComponent(org)}/${encodeURIComponent(project)}` +
        `/_git/${encodeURIComponent(repo)}?path=${encodeURIComponent(resolvedPath)}${adoBranchParam}` +
        fragment;
      link.target = '_self';
    }
  });
}
