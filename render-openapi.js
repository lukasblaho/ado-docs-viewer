const ICONS = {
  'file-json': '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 12a1 1 0 0 0-1 1v1a1 1 0 0 1-1 1 1 1 0 0 1 1 1v1a1 1 0 0 0 1 1"/><path d="M14 18a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1 1 1 0 0 1-1-1v-1a1 1 0 0 0-1-1"/>',
  'git-pull-request': '<circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" x2="6" y1="9" y2="21"/>',
  'git-branch': '<line x1="6" x2="6" y1="3" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>',
  'download': '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  'external-link': '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  'lock': '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  'book': '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
};
const icon = (name, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];

function sanitize(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script,iframe,object,embed,style,link,meta,form').forEach(e => e.remove());
  doc.body.querySelectorAll('*').forEach(el => {
    for (const a of [...el.attributes]) {
      if (/^on/i.test(a.name) || (/^(href|src|xlink:href)$/i.test(a.name) && /^\s*(javascript|data):/i.test(a.value))) el.removeAttribute(a.name);
    }
    if (el.tagName === 'A') { el.target = '_blank'; el.rel = 'noopener'; }
  });
  return doc.body.innerHTML;
}
const md = s => (s ? sanitize(marked.parse(String(s), { gfm: true, breaks: false })) : '');

(async function () {
  const params = new URLSearchParams(location.search);
  const filePath = params.get('path') || '';
  const prId = params.get('prId');
  const branch = params.get('branch');
  const $ = id => document.getElementById(id);

  const statusEl = $('status'), appEl = $('app'), sourceEl = $('source'), mainEl = $('main');

  $('logo').innerHTML = icon('file-json');
  const label = prId ? `PR #${prId}` : branch ? `Branch: ${branch}` : null;
  if (label) { $('chip').innerHTML = icon(prId ? 'git-pull-request' : 'git-branch') + esc(label); $('chip').hidden = false; }
  const segs = filePath.replace(/^\/+/, '').split('/');
  $('filepath').innerHTML = segs.slice(0, -1).map(esc).join(' / ') + (segs.length > 1 ? ' / ' : '') + `<b>${esc(segs[segs.length - 1])}</b>`;
  $('filepath').title = filePath;
  document.title = segs[segs.length - 1];

  const themeBtns = document.querySelectorAll('#themeToggle button');
  const currentTheme = () => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  const syncTheme = () => themeBtns.forEach(b => b.classList.toggle('on', b.dataset.theme === currentTheme()));
  syncTheme();
  themeBtns.forEach(b => b.addEventListener('click', () => {
    document.documentElement.dataset.theme = b.dataset.theme;
    try { localStorage.setItem('mdTheme', b.dataset.theme); } catch {}
    syncTheme();
  }));

  const viewBtns = document.querySelectorAll('#viewToggle button');
  const setView = v => {
    document.body.classList.toggle('view-source', v === 'source');
    viewBtns.forEach(b => b.classList.toggle('on', b.dataset.view === v));
  };
  viewBtns.forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));

  const { pat = '' } = await chrome.storage.sync.get(['pat']);

  let rawText;
  try {
    rawText = (await fetchAzureFile(params, pat)).text;
  } catch (err) {
    statusEl.className = 'error';
    statusEl.textContent = `Failed to fetch file: ${err.message}`;
    return;
  }

  sourceEl.innerHTML = rawText.split('\n').map((l, i) => `<div class="ln"><span class="n">${i + 1}</span><span class="c">${esc(l.replace(/\r$/, '')) || ' '}</span></div>`).join('');

  let spec;
  try {
    spec = jsyaml.load(rawText);
  } catch (err) {
    statusEl.className = 'error';
    statusEl.textContent = `Failed to parse file: ${err.message}`;
    return;
  }

  const isOpenApi = spec !== null && typeof spec === 'object' &&
    (typeof spec.openapi === 'string' || typeof spec.swagger === 'string') && typeof spec.info === 'object';
  if (!isOpenApi) {
    $('warning').textContent = '⚠️ This file does not appear to be a valid OpenAPI/Swagger spec (missing "openapi"/"swagger" and "info" fields). Attempting to render anyway.';
    $('warning').hidden = false;
  }
  spec = spec && typeof spec === 'object' ? spec : {};
  const info = spec.info || {};

  /* ---- operations model ---- */
  const tagMeta = new Map();
  (spec.tags || []).forEach(t => t && t.name && tagMeta.set(t.name, []));
  let opCount = 0;
  for (const [path, item] of Object.entries(spec.paths || {})) {
    if (!item || typeof item !== 'object') continue;
    for (const m of METHODS) {
      const op = item[m];
      if (!op || typeof op !== 'object') continue;
      opCount++;
      const tags = op.tags && op.tags.length ? op.tags : ['default'];
      tags.forEach(t => { if (!tagMeta.has(t)) tagMeta.set(t, []); tagMeta.get(t).push({ method: m, path }); });
    }
  }
  const tagGroups = [...tagMeta].filter(([, ops]) => ops.length);

  /* ---- header ---- */
  const isV2 = typeof spec.swagger === 'string';
  const specVer = String(spec.openapi || spec.swagger || '');
  const badges = [];
  if (specVer) badges.push(`<span class="badge green">${isV2 ? 'Swagger' : 'OAS'} ${esc(specVer.replace(/^(\d+\.\d+)\.\d+$/, '$1'))}</span>`);
  if (info.version) badges.push(`<span class="badge accent">v${esc(String(info.version).replace(/^v/i, ''))}</span>`);
  if (info.license && info.license.name) badges.push(`<span class="badge">${esc(info.license.name)}</span>`);
  $('badges').innerHTML = badges.join('');
  $('title').textContent = info.title || segs[segs.length - 1];
  $('desc').innerHTML = md(info.description);
  const descEl = $('desc');
  if (!descEl.children.length) descEl.remove();

  const ext = [];
  const safeUrl = u => /^https?:\/\//i.test(u || '') ? u : null;
  if (spec.externalDocs && safeUrl(spec.externalDocs.url)) ext.push(`<a href="${esc(spec.externalDocs.url)}" target="_blank" rel="noopener">${icon('book')}${esc(spec.externalDocs.description || 'External docs')}</a>`);
  if (safeUrl(info.termsOfService)) ext.push(`<a href="${esc(info.termsOfService)}" target="_blank" rel="noopener">${icon('external-link')}Terms of service</a>`);
  if (info.contact) {
    const c = info.contact, href = safeUrl(c.url) || (c.email ? `mailto:${c.email}` : null);
    if (href) ext.push(`<a href="${esc(href)}" target="_blank" rel="noopener">${icon('external-link')}${esc(c.name || c.email || 'Contact')}</a>`);
  }
  $('ext').innerHTML = ext.join('');

  /* ---- aside ---- */
  let servers = (spec.servers || []).filter(s => s && s.url).map(s => ({ url: s.url, desc: s.description || '' }));
  if (!servers.length && spec.host) {
    const schemes = spec.schemes && spec.schemes.length ? spec.schemes : ['https'];
    servers = schemes.map(s => ({ url: `${s}://${spec.host}${spec.basePath || ''}`, desc: '' }));
  }
  const schemaCount = Object.keys((spec.components && spec.components.schemas) || spec.definitions || {}).length;
  const kv = (k, v) => `<div class="kv"><span>${k}</span><b>${esc(v)}</b></div>`;
  $('aside').innerHTML =
    (servers.length ? `<div class="blk" id="servers"><div class="sec-title">Servers</div>${servers.map(s => `<div class="srv"><b>${esc(s.url)}</b>${s.desc ? `<span>${esc(s.desc)}</span>` : ''}</div>`).join('')}</div>` : '') +
    `<div class="blk"><div class="sec-title">Specification</div>` +
    kv('Version', info.version || '—') + kv(isV2 ? 'Swagger' : 'OpenAPI', specVer || '—') +
    kv('Tags', tagGroups.length) + kv('Operations', opCount) + (schemaCount ? kv('Schemas', schemaCount) : '') + `</div>` +
    `<button id="download">${icon('download')}<span>Download ${/\.json$/i.test(filePath) ? 'JSON' : 'YAML'}</span></button>`;
  $('download').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([rawText], { type: 'text/plain' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: segs[segs.length - 1] || 'openapi.yaml' });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  /* ---- rail ---- */
  const rail = $('rail');
  const railRows = [];
  const addRow = (html, cls, onClick) => {
    const b = document.createElement('button');
    b.className = 'rrow ' + cls; b.innerHTML = html; b.addEventListener('click', onClick);
    rail.appendChild(b); railRows.push(b); return b;
  };
  const scrollInMain = el => {
    const top = el.getBoundingClientRect().top - mainEl.getBoundingClientRect().top + mainEl.scrollTop - 16;
    mainEl.scrollTo({ top, behavior: 'smooth' });
  };

  rail.insertAdjacentHTML('beforeend', '<div class="sec-title">On this page</div>');
  const sections = [{ label: 'Overview', el: () => $('header') }];
  descEl.querySelectorAll && [...descEl.querySelectorAll('h1,h2')].forEach((h, i) => { h.id = `sec-${i}`; sections.push({ label: h.textContent, el: () => h }); });
  sections.forEach(s => { const r = addRow(`<span class="t">${esc(s.label)}</span>`, 'sec', () => scrollInMain(s.el())); r._el = s.el; });

  rail.insertAdjacentHTML('beforeend', '<div class="sec-title gap">Operations</div>');
  const opRows = new Map();
  tagGroups.forEach(([tag, ops]) => {
    rail.insertAdjacentHTML('beforeend', `<div class="rrow group"><span class="t">${esc(tag)}</span><span class="n">${ops.length}</span></div>`);
    ops.forEach(o => {
      const r = addRow(`<span class="m">${esc(o.method)}</span><span class="t" title="${esc(o.path)}">${esc(o.path)}</span>`, `op m-${o.method}`, () => openOp(o.method, o.path));
      opRows.set(`${o.method} ${o.path}`, r);
    });
  });
  if (!tagGroups.length) rail.lastElementChild.remove();

  const findBlocks = () => [...document.querySelectorAll('#swagger-ui .opblock')].map(el => {
    const m = [...el.classList].find(c => c.startsWith('opblock-') && METHODS.includes(c.slice(8)));
    const p = el.querySelector('.opblock-summary-path');
    return { el, key: m && p ? `${m.slice(8)} ${p.dataset.path || p.textContent}` : null };
  });
  function openOp(method, path) {
    const b = findBlocks().find(x => x.key === `${method} ${path}`);
    if (!b) return;
    if (!b.el.classList.contains('is-open')) b.el.querySelector('.opblock-summary-control, .opblock-summary')?.click();
    scrollInMain(b.el);
  }

  /* ---- scroll spy ---- */
  let ticking = false;
  const setActive = row => railRows.forEach(r => r.classList.toggle('active', r === row));
  function spy() {
    ticking = false;
    const top = mainEl.getBoundingClientRect().top + 90;
    let cur = null;
    for (const b of findBlocks()) if (b.key && b.el.getBoundingClientRect().top <= top) cur = opRows.get(b.key) || cur;
    if (!cur || mainEl.scrollTop < 40) {
      const secs = railRows.filter(r => r._el);
      cur = secs[0];
      for (const r of secs) { const e = r._el(); if (e && e.getBoundingClientRect().top <= top) cur = r; }
    }
    setActive(cur);
    cur && cur.scrollIntoView({ block: 'nearest' });
  }
  mainEl.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(spy); } });

  statusEl.hidden = true;
  appEl.hidden = false;

  SwaggerUIBundle({
    spec,
    domNode: $('swagger-ui'),
    presets: [SwaggerUIBundle.presets.apis],
    layout: 'BaseLayout',
    deepLinking: false,
    docExpansion: 'list',
    defaultModelsExpandDepth: 0,
    displayRequestDuration: true,
    supportedSubmitMethods: [],
    tryItOutEnabled: false,
    onComplete: spy,
  });
  setTimeout(spy, 300);
})();
