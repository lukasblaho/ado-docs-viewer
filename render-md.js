const ICONS = {
  'check': '<path d="M20 6 9 17l-5-5"/>',
  'circle-check': '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  'trash-2': '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>',
  'send': '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  'link': '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  'message-square': '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  'message-square-plus': '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M12 7v6"/><path d="M9 10h6"/>',
  'message-square-text': '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M13 8H7"/><path d="M17 12H7"/>',
  'git-pull-request': '<circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" x2="6" y1="9" y2="21"/>',
};
const AVATAR_GRADIENTS = [['#6A5CFF', '#B05CFF'], ['#FF9A5C', '#FF5C8A'], ['#2BB0A0', '#4C8DFF'], ['#F0B429', '#FF7A45'], ['#3FB871', '#2B8CBE']];
let tocItems = [];

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
  const chipEl = document.getElementById('chip');
  if (label) { chipEl.innerHTML = (prId ? icon('git-pull-request') : '') + escapeHtml(label); chipEl.hidden = false; }
  document.getElementById('logo').innerHTML = icon('message-square-text');
  const segs = filePath.replace(/^\/+/, '').split('/');
  filepathEl.innerHTML = segs.slice(0, -1).map(escapeHtml).join(' / ') + (segs.length > 1 ? ' / ' : '') + `<b>${escapeHtml(segs[segs.length - 1])}</b>`;
  filepathEl.title = filePath;
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
  document.getElementById('source').textContent = markdown;
  initViewToggle();
  initLineToggle();
  initThemeToggle();
  initToc(contentEl);

  // Commenting is only possible on PR views
  if (prId) initComments({ org, project, repo, prId, filePath, pat, contentEl, markdown });
})();

// ---- UI helpers ----------------------------------------------------------

function icon(name) {
  return `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function avatarEl(name) {
  const el = document.createElement('span');
  el.className = 'md-avatar';
  const parts = String(name || '?').trim().split(/\s+/);
  el.textContent = ((parts[0][0] || '?') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  let h = 0;
  for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const [a, b] = AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length];
  el.style.background = `linear-gradient(135deg, ${a}, ${b})`;
  return el;
}
function relTime(d) {
  const t = new Date(d).getTime();
  if (!t) return '';
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  try { return new Date(t).toLocaleDateString(); } catch { return ''; }
}

function initViewToggle() {
  const btns = document.querySelectorAll('#viewToggle button');
  btns.forEach(b => b.addEventListener('click', () => {
    document.body.classList.toggle('view-source', b.dataset.view === 'source');
    btns.forEach(x => x.classList.toggle('on', x === b));
  }));
}

function initThemeToggle() {
  const btns = document.querySelectorAll('#themeToggle button');
  const sync = () => btns.forEach(b => b.classList.toggle('on', b.dataset.theme === document.documentElement.dataset.theme));
  btns.forEach(b => b.addEventListener('click', () => {
    document.documentElement.dataset.theme = b.dataset.theme;
    try { localStorage.setItem('mdTheme', b.dataset.theme); } catch {}
    sync();
  }));
  sync();
}

function initLineToggle() {
  const btn = document.getElementById('lineToggle');
  const set = on => {
    document.body.classList.toggle('show-lines', on);
    btn.classList.toggle('on', on);
    try { localStorage.setItem('mdShowLines', on ? '1' : '0'); } catch {}
  };
  let saved = false;
  try { saved = localStorage.getItem('mdShowLines') === '1'; } catch {}
  set(saved);
  btn.addEventListener('click', () => set(!document.body.classList.contains('show-lines')));
}

// "On this page" sidebar built from the rendered headings
function initToc(contentEl) {
  const toc = document.getElementById('toc');
  const heads = [...contentEl.querySelectorAll('.md-block')]
    .map(block => ({ block, h: block.querySelector('.md-body > h1, .md-body > h2, .md-body > h3, .md-body > h4') }))
    .filter(x => x.h);
  if (heads.length < 2) return;
  toc.innerHTML = '';
  const title = document.createElement('div');
  title.className = 'toc-title';
  title.innerHTML = '<span>ON THIS PAGE</span>' +
    '<span class="toc-ctl"><button data-act="less" title="Collapse one level">−</button><button data-act="more" title="Expand one more level">+</button></span>';
  toc.appendChild(title);

  // Build the heading tree (parent = nearest previous heading with a smaller level)
  const stack = [];
  tocItems = heads.map(({ block, h }) => {
    const level = Number(h.tagName[1]);
    while (stack.length && stack[stack.length - 1].level >= level) stack.pop();
    const it = { block, level, text: h.textContent, parent: stack[stack.length - 1] || null, children: [], expanded: false };
    it.depth = it.parent ? it.parent.depth + 1 : 0;
    if (it.parent) it.parent.children.push(it);
    stack.push(it);
    return it;
  });

  for (const it of tocItems) {
    const a = document.createElement('a');
    a.href = '#';
    a.style.paddingLeft = `${12 + it.depth * 14}px`;
    const chev = document.createElement('button');
    chev.className = 'chev';
    if (it.children.length) {
      chev.innerHTML = '<svg class="ic" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>';
      chev.title = 'Expand / collapse';
      chev.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); it.expanded = !it.expanded; layoutToc(); });
    } else chev.disabled = true;
    const t = document.createElement('span');
    t.className = 't';
    t.textContent = it.text;
    a.append(chev, t);
    a.addEventListener('click', e => { e.preventDefault(); it.block.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    it.a = a;
    toc.appendChild(a);
  }

  // Header controls: collapse everything / reveal one more level at a time
  const maxDepth = Math.max(...tocItems.map(i => i.depth));
  const shownDepth = () => {
    let d = 0;
    for (const it of tocItems) if (isTocVisible(it)) d = Math.max(d, it.depth);
    return d;
  };
  title.addEventListener('click', e => {
    const act = e.target.closest('button')?.dataset.act;
    if (act === 'more') {
      const d = Math.min(maxDepth, shownDepth());
      tocItems.forEach(it => { if (it.depth <= d && it.children.length) it.expanded = true; });
    } else if (act === 'less') {
      const d = shownDepth();
      tocItems.forEach(it => { if (it.depth >= d - 1) it.expanded = false; });
    }
    layoutToc();
  });

  toc.style.display = '';
  const onScroll = () => {
    let cur = tocItems[0];
    for (const it of tocItems) { if (it.block.getBoundingClientRect().top <= 120) cur = it; else break; }
    while (cur.parent && !isTocVisible(cur)) cur = cur.parent; // highlight nearest visible ancestor
    tocItems.forEach(it => it.a.classList.toggle('active', it === cur));
  };
  tocOnScroll = onScroll;
  window.addEventListener('scroll', onScroll, { passive: true });
  layoutToc();
}

let tocOnScroll = null;
function isTocVisible(it) {
  for (let p = it.parent; p; p = p.parent) if (!p.expanded) return false;
  return true;
}
function layoutToc() {
  for (const it of tocItems) {
    it.a.style.display = isTocVisible(it) ? '' : 'none';
    it.a.classList.toggle('has-kids', it.children.length > 0);
    it.a.classList.toggle('expanded', it.expanded);
  }
  refreshTocCounts();
  tocOnScroll && tocOnScroll();
}

// Open-thread counts per heading; a collapsed heading also counts its sub-sections
let tocOwnCounts = new Map();
function refreshTocCounts() {
  for (const it of tocItems) {
    let n = tocOwnCounts.get(it) || 0;
    if (it.children.length && !it.expanded) {
      const sum = x => x.children.reduce((acc, c) => acc + (tocOwnCounts.get(c) || 0) + sum(c), 0);
      n += sum(it);
    }
    let c = it.a.querySelector('.count');
    if (!n) { c && c.remove(); continue; }
    if (!c) { c = document.createElement('span'); c.className = 'count'; it.a.appendChild(c); }
    c.textContent = n;
  }
}

// Refreshes the open/resolved pills and per-section counts in the sidebar
function updateSummary(contentEl) {
  const threads = [...contentEl.querySelectorAll('.md-thread')];
  const open = threads.filter(t => !t.classList.contains('resolved')).length;
  const done = threads.length - open;
  const openEl = document.getElementById('openCount'), doneEl = document.getElementById('doneCount');
  openEl.hidden = !open; openEl.lastElementChild.textContent = `${open} open`;
  doneEl.hidden = !done; doneEl.innerHTML = `${icon('check')}<span>${done} resolved</span>`;
  if (!tocItems.length) return;
  const blocks = [...contentEl.querySelectorAll('.md-block')];
  const own = new Map(tocItems.map(it => [it, 0]));
  let cur = null;
  for (const b of blocks) {
    const it = tocItems.find(x => x.block === b);
    if (it) cur = it;
    if (cur) own.set(cur, own.get(cur) + b.querySelectorAll('.md-thread:not(.resolved)').length);
  }
  tocOwnCounts = own;
  refreshTocCounts();
}

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
    div.dataset.raw = trimmed;
    const body = document.createElement('div');
    body.className = 'md-body';
    body.innerHTML = html;
    const ln = document.createElement('div');
    ln.className = 'md-ln';
    ln.textContent = startLine;
    div.append(ln, body);
    frag.appendChild(div);
  }
  container.replaceChildren(frag);
}


// ---- text <-> source mapping helpers -------------------------------------

// Collapses whitespace (and optionally drops inline markdown emphasis chars),
// returning the normalised string and, per output char, its index in `str`.
function normMap(str, dropMd) {
  let s = '', map = [], lastSpace = false;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (dropMd && '*_`~'.includes(ch)) continue;
    if (/\s/.test(ch)) {
      if (!lastSpace && s.length) { s += ' '; map.push(i); }
      lastSpace = true;
      continue;
    }
    lastSpace = false; s += ch; map.push(i);
  }
  return { s, map };
}

// Finds rendered selection text inside a block's raw markdown; returns
// { start, end } raw indices (end exclusive) or null.
function findInRaw(raw, selText) {
  const sel = normMap(selText, false).s.trim();
  if (!sel) return null;
  const { s, map } = normMap(raw, true);
  let a = s.indexOf(sel), b;
  if (a >= 0) {
    b = a + sel.length - 1;
  } else {
    // Selection spans markup (e.g. a link URL): anchor on its head and tail
    const n = Math.min(20, sel.length);
    a = s.indexOf(sel.slice(0, n));
    if (a < 0) return null;
    const tb = s.indexOf(sel.slice(-n), a);
    if (tb < 0) return null;
    b = tb + n - 1;
  }
  return { start: map[a], end: map[b] + 1 };
}

function rawPos(raw, idx) {
  const before = raw.slice(0, idx);
  return { line: before.split('\n').length - 1, col: idx - (before.lastIndexOf('\n') + 1) };
}

// ---- PR comments --------------------------------------------------------

function initComments(ctx) {
  const { contentEl } = ctx;
  const blocks = [...contentEl.querySelectorAll('.md-block')];
  const srcLines = ctx.markdown.replace(/\r\n?/g, '\n').split('\n');
  const hasHl = window.CSS && CSS.highlights && typeof Highlight !== 'undefined';
  const anchored = hasHl ? new Highlight() : null;          // active threads (blue)
  const anchoredResolved = hasHl ? new Highlight() : null;  // resolved threads (green)
  if (hasHl) { CSS.highlights.set('md-anchored', anchored); CSS.highlights.set('md-resolved', anchoredResolved); }

  // Highlights `text` (rendered, or raw markdown when fromRaw) inside a block
  function highlightText(block, text, fromRaw) {
    if (!anchored || !text) return null;
    const body = block.querySelector('.md-body');
    const nodes = [];
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    let concat = '';
    for (let n = walker.nextNode(); n; n = walker.nextNode()) { nodes.push({ n, off: concat.length }); concat += n.nodeValue; }
    const hay = normMap(concat, false);
    const needle = normMap(text, !!fromRaw).s.trim();
    if (!needle) return null;
    const a = hay.s.indexOf(needle);
    if (a < 0) return null;
    const locate = i => {
      const c = hay.map[i];
      let cur = nodes[0];
      for (const x of nodes) { if (x.off <= c) cur = x; else break; }
      return { node: cur.n, offset: c - cur.off };
    };
    const s0 = locate(a), e0 = locate(a + needle.length - 1);
    const r = new Range();
    r.setStart(s0.node, s0.offset);
    r.setEnd(e0.node, e0.offset + 1);
    return r;
  }

  // Text of the source the thread is anchored to, when it is a partial-line range
  function quoteFor(t) {
    if (!t.startOffset || !t.endOffset) return null;
    const ls = srcLines[t.lineStart - 1], le = srcLines[t.lineEnd - 1];
    if (ls === undefined || le === undefined) return null;
    const so = t.startOffset - 1, eo = t.endOffset - 1;
    if (t.lineStart === t.lineEnd) {
      if (so <= 0 && eo >= ls.length) return null;
      return ls.slice(so, eo).trim() || null;
    }
    if (so <= 0 && eo >= le.length) return null;
    return [ls.slice(so), ...srcLines.slice(t.lineStart, t.lineEnd - 1), le.slice(0, eo)].join('\n').trim() || null;
  }

  function wholeBlockInfo(first, last) {
    const lineEnd = Number(last.dataset.lineEnd);
    return {
      block: first, lineStart: Number(first.dataset.lineStart), lineEnd,
      startOffset: 1, endOffset: (srcLines[lineEnd - 1] || '').length + 1,
    };
  }

  // Maps the user's text selection to a source line/column range
  function infoFromSelection(sel) {
    if (!sel.rangeCount || sel.isCollapsed) return null;
    const range = sel.getRangeAt(0);
    const blockOf = node => {
      const el = node.nodeType === 1 ? node : node.parentElement;
      if (!el || el.closest('.md-threads, .md-composer')) return null;
      return el.closest('.md-block');
    };
    const a = blockOf(range.startContainer), b = blockOf(range.endContainer);
    if (!a || !b || !contentEl.contains(a) || !contentEl.contains(b)) return null;
    const text = sel.toString();
    if (a === b) {
      const loc = findInRaw(a.dataset.raw || '', text);
      if (!loc) return wholeBlockInfo(a, a);
      const base = Number(a.dataset.lineStart);
      const p1 = rawPos(a.dataset.raw, loc.start), p2 = rawPos(a.dataset.raw, loc.end);
      return {
        block: a, lineStart: base + p1.line, lineEnd: base + p2.line,
        startOffset: p1.col + 1, endOffset: p2.col + 1, highlight: text.trim(),
      };
    }
    return wholeBlockInfo(a, b);
  }

  // Floating dark toolbar next to a text selection: Comment / Copy link
  const selBar = document.createElement('div');
  selBar.className = 'md-sel-bar';
  selBar.style.display = 'none';
  selBar.innerHTML = `<button class="primary" data-act="comment">${icon('message-square-plus')}Comment</button>` +
    `<button data-act="link">${icon('link')}Copy link</button>`;
  document.body.appendChild(selBar);
  let pendingInfo = null;
  const hideSelBtn = () => { selBar.style.display = 'none'; pendingInfo = null; };
  selBar.addEventListener('mousedown', e => e.preventDefault()); // keep the selection
  selBar.addEventListener('click', e => {
    const act = e.target.closest('button')?.dataset.act;
    const info = pendingInfo;
    if (!act || !info) return;
    hideSelBtn();
    if (act === 'comment') { window.getSelection().removeAllRanges(); openComposer(info); }
    else copyLink(info.lineStart);
  });
  document.addEventListener('mouseup', e => {
    if (selBar.contains(e.target)) return;
    setTimeout(() => {
      const sel = window.getSelection();
      const info = infoFromSelection(sel);
      if (!info) { hideSelBtn(); return; }
      pendingInfo = info;
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      selBar.style.display = 'flex';
      selBar.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - selBar.offsetWidth - 8))}px`;
      selBar.style.top = `${Math.max(8, rect.top - selBar.offsetHeight - 8)}px`;
    }, 0);
  });
  document.addEventListener('selectionchange', () => { if (window.getSelection().isCollapsed) hideSelBtn(); });
  window.addEventListener('scroll', hideSelBtn, true);

  const toast = msg => {
    const t = document.createElement('div');
    t.className = 'md-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 5000);
  };

  function copyLink(line) {
    const url = location.href.split('#')[0] + `#L${line}`;
    navigator.clipboard.writeText(url).then(() => toast('Link copied'), () => toast('Could not copy link'));
  }

  // Gutter per block: hover "add comment" button + thread badge
  for (const block of blocks) {
    const gutter = document.createElement('div');
    gutter.className = 'md-gutter';
    const btn = document.createElement('button');
    btn.className = 'md-add-comment';
    btn.title = `Comment on lines ${block.dataset.lineStart}–${block.dataset.lineEnd}`;
    btn.innerHTML = icon('message-square-plus');
    btn.addEventListener('click', () => openComposer(wholeBlockInfo(block, block)));
    gutter.appendChild(btn);
    block.insertBefore(gutter, block.firstChild);
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

  // Gutter badge: amber with count while something is open, green check once all resolved.
  // Click toggles the thread rail.
  function updateBadge(block) {
    const host = threadsHost(block);
    const n = host.querySelectorAll('.md-thread').length;
    const gutter = block.querySelector(':scope > .md-gutter');
    let badge = gutter.querySelector('.md-badge');
    if (!n) { badge?.remove(); block.classList.remove('has-threads', 'all-resolved'); updateSummary(contentEl); return; }
    if (!badge) {
      badge = document.createElement('button');
      badge.className = 'md-badge';
      badge.addEventListener('click', () => { host.hidden = !host.hidden; });
      gutter.appendChild(badge);
    }
    const active = [...host.querySelectorAll('.md-thread')].filter(c => !c.classList.contains('resolved')).length;
    block.classList.add('has-threads');
    block.classList.toggle('all-resolved', active === 0);
    badge.classList.toggle('resolved', active === 0);
    badge.innerHTML = active === 0 ? icon('check') : `${icon('message-square')}${active}`;
    badge.title = `${n} comment thread${n === 1 ? '' : 's'} — click to show/hide`;
    updateSummary(contentEl);
  }

  function blockForLine(line) {
    let found = null;
    for (const b of blocks) {
      if (Number(b.dataset.lineStart) <= line) found = b; else break;
    }
    return found || blocks[0];
  }

  let ownId = null; // resolved lazily; null => offer delete on every comment (server enforces)
  getCurrentUserId(ctx.org, ctx.pat).then(id => { ownId = id; });

  function commentEl(c) {
    const el = document.createElement('div');
    el.className = 'md-comment';
    const head = document.createElement('div');
    head.className = 'md-comment-head';
    const name = document.createElement('span');
    name.className = 'md-author';
    name.textContent = c.author;
    const when = document.createElement('span');
    when.className = 'md-when';
    when.textContent = relTime(c.date);
    when.title = c.date ? new Date(c.date).toLocaleString() : '';
    head.append(avatarEl(c.author), name, when);
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
    const hint = document.createElement('span');
    hint.className = 'hint';
    hint.textContent = '⌘ ↵ to send';
    const ok = document.createElement('button');
    ok.className = 'md-btn primary';
    ok.innerHTML = icon('send');
    ok.append(submitLabel);
    const cancel = document.createElement('button');
    cancel.className = 'md-btn ghost';
    cancel.textContent = 'Cancel';
    row.append(hint, cancel, ok);
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

  // Two-step delete: trash icon -> "Delete thread? Yes / No"
  function deleteControl(thread, block) {
    const wrap = document.createElement('span');
    wrap.className = 'md-del-wrap';
    const trash = document.createElement('button');
    trash.className = 'md-btn md-icon-btn';
    trash.title = 'Delete thread';
    trash.innerHTML = icon('trash-2');
    const confirmBox = document.createElement('span');
    confirmBox.className = 'md-del-confirm';
    confirmBox.hidden = true;
    const q = document.createElement('span');
    q.textContent = 'Delete thread?';
    const yes = document.createElement('button');
    yes.className = 'md-btn small md-yes';
    yes.textContent = 'Yes';
    const no = document.createElement('button');
    no.className = 'md-btn small md-no';
    no.textContent = 'No';
    confirmBox.append(q, yes, no);
    wrap.append(trash, confirmBox);
    const ask = on => { trash.hidden = on; confirmBox.hidden = !on; };
    trash.addEventListener('click', () => ask(true));
    no.addEventListener('click', () => ask(false));
    yes.addEventListener('click', async () => {
      yes.disabled = no.disabled = true;
      yes.textContent = '…';
      const failed = [];
      for (const c of [...thread.comments]) {
        try {
          await deleteComment(ctx.org, ctx.project, ctx.repo, ctx.prId, thread.id, c.id, ctx.pat);
          thread.comments = thread.comments.filter(x => x.id !== c.id);
        } catch (err) { failed.push(err.message); }
      }
      if (failed.length) {
        toast(`Failed to delete ${failed.length} comment(s): ${failed[0]}`);
        if (thread.comments.length) { renderThread(thread); return; }
      }
      const card = block.querySelector(`[data-thread-id="${thread.id}"]`);
      if (thread._range && anchored) { anchored.delete(thread._range); anchoredResolved.delete(thread._range); }
      card?.classList.add('removing');
      setTimeout(() => { card?.remove(); updateBadge(block); }, 200);
    });
    return wrap;
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
    const resolved = thread.status !== 1 && thread.status !== 5 && thread.status !== undefined;
    card.classList.toggle('resolved', resolved);
    const canDelete = thread.comments.every(c => !ownId || !c.authorId || c.authorId === ownId);

    const head = document.createElement('div');
    head.className = 'md-thread-head';
    const statusLabel = ThreadStatus[thread.status] || 'Active';
    const where = thread.lineStart === thread.lineEnd ? `Line ${thread.lineStart}` : `Lines ${thread.lineStart}–${thread.lineEnd}`;
    const label = document.createElement('span');
    if (resolved) {
      label.innerHTML = icon('circle-check');
      label.style.cssText = 'display:inline-flex;align-items:center;gap:7px';
      label.append(`${statusLabel} · ${where}`);
      head.append(label);
    } else {
      const dot = document.createElement('span');
      dot.className = 'dot';
      label.textContent = statusLabel === 'Active' ? 'Open' : statusLabel;
      const grow = document.createElement('span');
      grow.className = 'grow';
      const chip = document.createElement('span');
      chip.className = 'md-line-chip';
      chip.textContent = where;
      head.append(dot, label, grow, chip);
    }

    const toggle = document.createElement('button');
    const doToggle = async () => {
      toggle.disabled = true;
      try {
        const next = resolved ? 1 : 2;
        await setThreadStatus(ctx.org, ctx.project, ctx.repo, ctx.prId, thread.id, next, ctx.pat);
        thread.status = next;
        renderThread(thread);
      } catch (err) { toast(`Failed to update thread: ${err.message}`); toggle.disabled = false; }
    };
    toggle.addEventListener('click', doToggle);

    if (resolved) {
      const grow = document.createElement('span');
      grow.className = 'grow';
      toggle.className = 'md-btn small';
      toggle.textContent = 'Reactivate';
      const actions = document.createElement('span');
      actions.className = 'md-actions';
      actions.appendChild(toggle);
      if (canDelete) actions.appendChild(deleteControl(thread, block));
      head.append(grow, actions);
    }
    card.appendChild(head);

    const quote = thread.highlight || quoteFor(thread);
    if (quote) {
      const q = document.createElement('div');
      q.className = 'md-quote';
      q.textContent = `“${quote}”`;
      card.appendChild(q);
      if (thread._range === undefined) thread._range = highlightText(block, quote, !thread.highlight);
      if (thread._range && anchored) {
        anchored.delete(thread._range); anchoredResolved.delete(thread._range);
        (resolved ? anchoredResolved : anchored).add(thread._range);
      }
    }
    thread.comments.forEach(c => card.appendChild(commentEl(c)));

    if (!resolved) {
      const row = document.createElement('div');
      row.className = 'md-reply-row';
      const reply = document.createElement('button');
      reply.className = 'md-btn md-reply-input';
      reply.textContent = 'Reply…';
      reply.addEventListener('click', () => {
        row.style.display = 'none';
        card.appendChild(composer({
          placeholder: 'Reply…', submitLabel: 'Reply',
          onCancel: () => { row.style.display = ''; },
          onSubmit: async text => {
            const c = await replyToThread(ctx.org, ctx.project, ctx.repo, ctx.prId, thread.id, text, ctx.pat);
            thread.comments.push(c);
            renderThread(thread);
          },
        }));
      });
      toggle.className = 'md-btn resolve';
      toggle.innerHTML = icon('check');
      toggle.append('Resolve');
      row.append(reply, toggle);
      if (canDelete) row.append(deleteControl(thread, block));
      card.appendChild(row);
    }
    updateBadge(block);
  }

  function openComposer(info) {
    const host = threadsHost(info.block);
    if (host.querySelector('.md-composer.new')) return;
    host.hidden = false;
    const { lineStart, lineEnd, startOffset, endOffset } = info;
    const where = lineStart === lineEnd ? `Line ${lineStart}` : `Lines ${lineStart}–${lineEnd}`;
    const form = composer({
      placeholder: `Comment on ${where.toLowerCase()}…`, submitLabel: 'Comment',
      onSubmit: async text => {
        const thread = await createFileThread(ctx.org, ctx.project, ctx.repo, ctx.prId, ctx.filePath, lineStart, lineEnd, text, ctx.pat, startOffset, endOffset);
        // The API response may omit position info; fall back to what we posted
        thread.lineStart = thread.lineStart || lineStart;
        thread.lineEnd = thread.lineEnd || lineEnd;
        thread.startOffset = thread.startOffset || startOffset;
        thread.endOffset = thread.endOffset || endOffset;
        thread.highlight = info.highlight;
        renderThread(thread);
      },
    });
    form.classList.add('new');
    const hd = document.createElement('div');
    hd.className = 'md-thread-head';
    hd.style.color = 'var(--ink)';
    const t = document.createElement('span');
    t.textContent = 'New comment';
    t.style.cssText = 'font-size:13.5px;font-weight:600';
    const grow = document.createElement('span');
    grow.className = 'grow';
    const chip = document.createElement('span');
    chip.className = 'md-line-chip';
    chip.textContent = where;
    hd.append(avatarEl('You'), t, grow, chip);
    form.prepend(hd);
    const quote = info.highlight || quoteFor({ lineStart, lineEnd, startOffset, endOffset });
    if (quote) {
      const q = document.createElement('div');
      q.className = 'md-quote';
      q.textContent = `“${quote}”`;
      hd.after(q);
    }
    host.prepend(form);
    form.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  // Deep link: #L<line> scrolls to the block containing that source line
  const hashLine = /^#L(\d+)/.exec(location.hash);
  if (hashLine) blockForLine(Number(hashLine[1]))?.scrollIntoView({ block: 'center' });

  // Load existing threads
  listFileThreads(ctx.org, ctx.project, ctx.repo, ctx.prId, ctx.filePath, ctx.pat)
    .then(threads => threads.forEach(renderThread))
    .catch(err => toast(`Could not load existing comments: ${err.message}`));
}

// Finds all ```mermaid code blocks in the rendered HTML and replaces them with SVG.
async function renderMermaidBlocks(container) {
  const blocks = container.querySelectorAll('pre > code.language-mermaid');
  if (!blocks.length) return;

  mermaid.initialize({ startOnLoad: false, theme: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'default' });

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
