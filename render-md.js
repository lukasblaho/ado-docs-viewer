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
  renderBlocks(contentEl, markdown);

  rewriteLinks(contentEl, org, project, repo, filePath, prId, branch);
  await renderMermaidBlocks(contentEl);
  renderPlantUMLBlocks(contentEl);

  // Commenting is only possible on PR views
  if (prId) initComments({ org, project, repo, prId, filePath, pat, contentEl });
})();

// Renders markdown block by block, wrapping each top-level block with its
// source line range (1-based, inclusive) so comments can anchor to raw lines.
function renderBlocks(container, markdown) {
  const src = markdown.replace(/\r\n?/g, '\n');
  const tokens = marked.lexer(src);
  let line = 1;
  const frag = document.createDocumentFragment();
  for (const tok of tokens) {
    const raw = tok.raw || '';
    const startLine = line;
    const trimmed = raw.replace(/\n+$/, '');
    const endLine = startLine + (trimmed.match(/\n/g) || []).length;
    line += (raw.match(/\n/g) || []).length;
    if (tok.type === 'space' || tok.type === 'def') continue;
    const html = marked.parser([tok]);
    if (!html.trim()) continue;
    const div = document.createElement('div');
    div.className = 'md-block';
    div.dataset.lineStart = startLine;
    div.dataset.lineEnd = endLine;
    const body = document.createElement('div');
    body.className = 'md-body';
    body.innerHTML = html;
    div.appendChild(body);
    frag.appendChild(div);
  }
  container.replaceChildren(frag);
}

// ---- PR comments --------------------------------------------------------

function initComments(ctx) {
  const { contentEl } = ctx;
  const blocks = [...contentEl.querySelectorAll('.md-block')];

  const toast = msg => {
    const t = document.createElement('div');
    t.className = 'md-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 5000);
  };

  // "+" button per block
  for (const block of blocks) {
    const btn = document.createElement('button');
    btn.className = 'md-add-comment';
    btn.title = `Comment on lines ${block.dataset.lineStart}–${block.dataset.lineEnd}`;
    btn.textContent = '+';
    btn.addEventListener('click', () => openComposer(block));
    block.appendChild(btn);
  }

  function threadsHost(block) {
    let host = block.querySelector(':scope > .md-threads');
    if (!host) {
      host = document.createElement('div');
      host.className = 'md-threads';
      block.appendChild(host);
    }
    return host;
  }

  // Margin badge showing the thread count; click toggles the threads under the paragraph
  function updateBadge(block) {
    const host = threadsHost(block);
    const n = host.querySelectorAll('.md-thread').length;
    let badge = block.querySelector(':scope > .md-badge');
    if (!badge) {
      badge = document.createElement('button');
      badge.className = 'md-badge';
      badge.addEventListener('click', () => { host.hidden = !host.hidden; });
      block.appendChild(badge);
    }
    badge.textContent = `💬 ${n}`;
    badge.title = `${n} comment thread${n === 1 ? '' : 's'} — click to show/hide`;
  }

  function blockForLine(line) {
    let found = null;
    for (const b of blocks) {
      if (Number(b.dataset.lineStart) <= line) found = b; else break;
    }
    return found || blocks[0];
  }

  function formatDate(d) {
    try { return new Date(d).toLocaleString(); } catch { return ''; }
  }

  function commentEl(c) {
    const el = document.createElement('div');
    el.className = 'md-comment';
    const head = document.createElement('div');
    head.className = 'md-comment-head';
    head.textContent = `${c.author}  ·  ${formatDate(c.date)}`;
    const body = document.createElement('div');
    body.className = 'md-comment-body';
    body.textContent = c.content; // plain text: never inject server-provided HTML
    el.append(head, body);
    return el;
  }

  function composer({ placeholder, submitLabel, onSubmit, onCancel }) {
    const form = document.createElement('div');
    form.className = 'md-composer';
    const ta = document.createElement('textarea');
    ta.placeholder = placeholder;
    ta.rows = 3;
    const row = document.createElement('div');
    row.className = 'md-composer-row';
    const ok = document.createElement('button');
    ok.className = 'md-btn primary';
    ok.textContent = submitLabel;
    const cancel = document.createElement('button');
    cancel.className = 'md-btn';
    cancel.textContent = 'Cancel';
    row.append(ok, cancel);
    form.append(ta, row);
    const submit = async () => {
      const text = ta.value.trim();
      if (!text) return;
      ok.disabled = true;
      try { await onSubmit(text); form.remove(); }
      catch (err) { toast(`Failed to post comment: ${err.message}`); ok.disabled = false; }
    };
    ok.addEventListener('click', submit);
    cancel.addEventListener('click', () => { form.remove(); onCancel && onCancel(); });
    ta.addEventListener('keydown', e => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); }
    });
    setTimeout(() => ta.focus(), 0);
    return form;
  }

  function renderThread(thread) {
    const block = blockForLine(thread.lineStart);
    if (!block) return;
    const host = threadsHost(block);
    let card = host.querySelector(`[data-thread-id="${thread.id}"]`);
    if (!card) {
      card = document.createElement('div');
      card.className = 'md-thread';
      card.dataset.threadId = thread.id;
      host.appendChild(card);
    }
    card.replaceChildren();
    block.classList.add('has-comments');
    updateBadge(block);
    const resolved = thread.status !== 1 && thread.status !== 5 && thread.status !== undefined;
    card.classList.toggle('resolved', resolved);

    const head = document.createElement('div');
    head.className = 'md-thread-head';
    const label = document.createElement('span');
    label.textContent = `${ThreadStatus[thread.status] || 'Active'} · lines ${thread.lineStart}–${thread.lineEnd}`;
    const toggle = document.createElement('button');
    toggle.className = 'md-btn';
    toggle.textContent = resolved ? 'Reactivate' : 'Resolve';
    toggle.addEventListener('click', async () => {
      toggle.disabled = true;
      try {
        const next = resolved ? 1 : 2;
        await setThreadStatus(ctx.org, ctx.project, ctx.repo, ctx.prId, thread.id, next, ctx.pat);
        thread.status = next;
        renderThread(thread);
      } catch (err) { toast(`Failed to update thread: ${err.message}`); toggle.disabled = false; }
    });
    head.append(label, toggle);
    card.appendChild(head);
    thread.comments.forEach(c => card.appendChild(commentEl(c)));

    const reply = document.createElement('button');
    reply.className = 'md-btn';
    reply.textContent = 'Reply';
    reply.addEventListener('click', () => {
      reply.style.display = 'none';
      card.appendChild(composer({
        placeholder: 'Reply…', submitLabel: 'Reply',
        onCancel: () => { reply.style.display = ''; },
        onSubmit: async text => {
          const c = await replyToThread(ctx.org, ctx.project, ctx.repo, ctx.prId, thread.id, text, ctx.pat);
          thread.comments.push(c);
          renderThread(thread);
        },
      }));
    });
    card.appendChild(reply);
  }

  function openComposer(block) {
    const host = threadsHost(block);
    if (host.querySelector('.md-composer.new')) return;
    const lineStart = Number(block.dataset.lineStart);
    const lineEnd = Number(block.dataset.lineEnd);
    const form = composer({
      placeholder: `Comment on lines ${lineStart}–${lineEnd}…`, submitLabel: 'Comment',
      onSubmit: async text => {
        const thread = await createFileThread(ctx.org, ctx.project, ctx.repo, ctx.prId, ctx.filePath, lineStart, lineEnd, text, ctx.pat);
        // The API response may omit line info; fall back to what we posted
        thread.lineStart = thread.lineStart || lineStart;
        thread.lineEnd = thread.lineEnd || lineEnd;
        renderThread(thread);
      },
    });
    form.classList.add('new');
    host.appendChild(form);
  }

  // Load existing threads
  listFileThreads(ctx.org, ctx.project, ctx.repo, ctx.prId, ctx.filePath, ctx.pat)
    .then(threads => threads.forEach(renderThread))
    .catch(err => toast(`Could not load existing comments: ${err.message}`));
}

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
