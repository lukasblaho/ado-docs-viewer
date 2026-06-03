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
  await renderMermaidBlocks(contentEl);
  renderPlantUMLBlocks(contentEl);
})();

// Finds all ```mermaid code blocks in the rendered HTML and replaces them with SVG.
async function renderMermaidBlocks(container) {
  const blocks = container.querySelectorAll('pre > code.language-mermaid');
  if (!blocks.length) return;

  mermaid.initialize({ startOnLoad: false, theme: 'default' });

  let idx = 0;
  for (const codeEl of blocks) {
    const source = codeEl.textContent;
    const preEl = codeEl.parentElement;
    const id = `mermaid-block-${idx++}`;
    try {
      const { svg } = await mermaid.render(id, source);
      const wrapper = document.createElement('div');
      wrapper.className = 'mermaid-diagram';
      wrapper.innerHTML = svg;
      preEl.replaceWith(wrapper);
    } catch {
      // Leave the original code block intact on render failure
    }
  }
}

// Finds all ```plantuml / ```puml code blocks and replaces them with plantuml.com SVG images.
function renderPlantUMLBlocks(container) {
  const blocks = container.querySelectorAll(
    'pre > code.language-plantuml, pre > code.language-puml'
  );
  for (const codeEl of blocks) {
    const source = codeEl.textContent;
    const preEl = codeEl.parentElement;
    let encoded;
    try {
      encoded = encodePlantUml(source);
    } catch {
      continue; // leave code block intact on encode failure
    }
    const img = document.createElement('img');
    img.src = `https://www.plantuml.com/plantuml/svg/${encoded}`;
    img.alt = 'PlantUML diagram';
    img.onerror = () => {
      img.style.display = 'none';
      const err = document.createElement('p');
      err.style.cssText = 'color:#721c24;background:#f8d7da;padding:8px 12px;border-radius:4px;font-size:13px;';
      err.textContent = '⚠️ Failed to render PlantUML diagram. Check that the source is valid.';
      wrapper.appendChild(err);
    };
    const wrapper = document.createElement('div');
    wrapper.className = 'plantuml-diagram';
    wrapper.appendChild(img);
    preEl.replaceWith(wrapper);
  }
}

// PlantUML encoding: deflate (pako) + custom base64.
// See: https://plantuml.com/text-encoding
function encodePlantUml(source) {
  const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';
  const encode6bit = b => CHARS[b & 0x3F];
  function append3bytes(b1, b2, b3) {
    return encode6bit(b1 >> 2) +
      encode6bit(((b1 & 0x3) << 4) | (b2 >> 4)) +
      encode6bit(((b2 & 0xF) << 2) | (b3 >> 6)) +
      encode6bit(b3 & 0x3F);
  }
  const compressed = pako.deflateRaw(new TextEncoder().encode(source), { level: 9 });
  let result = '';
  for (let i = 0; i < compressed.length; i += 3) {
    result += append3bytes(
      compressed[i],
      i + 1 < compressed.length ? compressed[i + 1] : 0,
      i + 2 < compressed.length ? compressed[i + 2] : 0
    );
  }
  return result;
}

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
  const RENDER_EXTS = new Set(['md', 'puml', 'plantuml', 'yaml', 'yml', 'json', 'mmd', 'mermaid']);

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
      const renderPage = ext === 'md' ? 'render-md.html'
        : (ext === 'puml' || ext === 'plantuml') ? 'render-puml.html'
        : (ext === 'mmd' || ext === 'mermaid') ? 'render-mermaid.html'
        : 'render-openapi.html';
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
