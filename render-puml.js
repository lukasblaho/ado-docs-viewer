// PlantUML encoding: deflate + custom base64
// See: https://plantuml.com/text-encoding
function encodePlantUml(source) {
  const CH = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';
  const e = b => CH[b & 0x3F];
  const utf8 = new TextEncoder().encode(source);
  const z = pako.deflateRaw(utf8, { level: 9 });
  let out = '';
  for (let i = 0; i < z.length; i += 3) {
    const b1 = z[i], b2 = i + 1 < z.length ? z[i + 1] : 0, b3 = i + 2 < z.length ? z[i + 2] : 0;
    out += e(b1 >> 2) + e(((b1 & 3) << 4) | (b2 >> 4)) + e(((b2 & 15) << 2) | (b3 >> 6)) + e(b3);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Icons (lucide)                                                      */
/* ------------------------------------------------------------------ */
const ICONS = {
  'message-square-text': '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M13 8H7"/><path d="M17 12H7"/>',
  'git-pull-request': '<circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" x2="6" y1="9" y2="21"/>',
  'git-branch': '<line x1="6" x2="6" y1="3" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>',
  'chevron-right': '<path d="m9 18 6-6-6-6"/>',
  'minus': '<path d="M5 12h14"/>',
  'plus': '<path d="M5 12h14"/><path d="M12 5v14"/>',
  'code': '<path d="m16 18 6-6-6-6"/><path d="M8 6l-6 6 6 6"/>',
  'external-link': '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  'link': '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  'x': '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  'arrow-down-left': '<path d="M17 7 7 17"/><path d="M17 17H7V7"/>',
  'arrow-up-right': '<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',
  'user': '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  'component': '<path d="M15.536 11.293a1 1 0 0 0 0 1.414l2.376 2.377a1 1 0 0 0 1.414 0l2.377-2.377a1 1 0 0 0 0-1.414l-2.377-2.377a1 1 0 0 0-1.414 0z"/><path d="M2.297 11.293a1 1 0 0 0 0 1.414l2.377 2.377a1 1 0 0 0 1.414 0l2.377-2.377a1 1 0 0 0 0-1.414L6.088 8.916a1 1 0 0 0-1.414 0z"/><path d="M8.916 17.912a1 1 0 0 0 0 1.415l2.377 2.376a1 1 0 0 0 1.414 0l2.377-2.376a1 1 0 0 0 0-1.415l-2.377-2.376a1 1 0 0 0-1.414 0z"/><path d="M8.916 4.674a1 1 0 0 0 0 1.414l2.377 2.376a1 1 0 0 0 1.414 0l2.377-2.376a1 1 0 0 0 0-1.414l-2.377-2.377a1 1 0 0 0-1.414 0z"/>',
  'database': '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>',
  'package': '<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><path d="m3.3 7 8.7 5 8.7-5"/>',
  'server': '<rect width="20" height="8" x="2" y="2" rx="2"/><rect width="20" height="8" x="2" y="14" rx="2"/><path d="M6 6h.01M6 18h.01"/>',
  'cloud': '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
  'box': '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/>',
  'square-dashed': '<path d="M5 3a2 2 0 0 0-2 2"/><path d="M19 3a2 2 0 0 1 2 2"/><path d="M21 19a2 2 0 0 1-2 2"/><path d="M5 21a2 2 0 0 1-2-2"/><path d="M9 3h1M9 21h1M14 3h1M14 21h1M3 9v1M21 9v1M3 14v1M21 14v1"/>',
  'circle-dot': '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="1"/>',
  'ellipse': '<ellipse cx="12" cy="12" rx="10" ry="7"/>',
  'sticky-note': '<path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z"/><path d="M15 3v6h6"/>',
  'shapes': '<rect x="3" y="3" width="8" height="8" rx="1"/><circle cx="17.5" cy="6.5" r="3.5"/><path d="m3 21 4-8 4 8z"/>',
};
const icon = (name, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ------------------------------------------------------------------ */
/* Diagram themes (skinparam injected after @startuml; the diagram's   */
/* own skinparams come later and therefore still win)                  */
/* ------------------------------------------------------------------ */
const PUML_SKIN = {
  // Generated from the docs-viewer.pen tokens (pu-* / mdr-* variables), Inter font
  light: `
skinparam defaultFontName Inter
skinparam defaultFontSize 13
skinparam defaultFontColor #1B1B22
skinparam roundCorner 12
skinparam shadowing false
skinparam ArrowThickness 1.2
skinparam BackgroundColor #FFFFFF
skinparam ArrowColor #8A8A98
skinparam ArrowFontColor #5B5B68
skinparam ArrowFontSize 11
skinparam TitleFontColor #1B1B22
skinparam ActorBackgroundColor #26255E
skinparam ActorBorderColor #26255E
skinparam ActorFontColor #1B1B22
skinparam ComponentBackgroundColor #FFFFFF
skinparam ComponentBorderColor #DAD6CC
skinparam ComponentFontColor #1B1B22
skinparam DatabaseBackgroundColor #FFFFFF
skinparam DatabaseBorderColor #DAD6CC
skinparam DatabaseFontColor #1B1B22
skinparam ClassBackgroundColor #FFFFFF
skinparam ClassBorderColor #DAD6CC
skinparam ClassFontColor #1B1B22
skinparam ParticipantBackgroundColor #FFFFFF
skinparam ParticipantBorderColor #DAD6CC
skinparam ParticipantFontColor #1B1B22
skinparam ActivityBackgroundColor #FFFFFF
skinparam ActivityBorderColor #DAD6CC
skinparam ActivityFontColor #1B1B22
skinparam StateBackgroundColor #FFFFFF
skinparam StateBorderColor #DAD6CC
skinparam StateFontColor #1B1B22
skinparam UsecaseBackgroundColor #FFFFFF
skinparam UsecaseBorderColor #DAD6CC
skinparam UsecaseFontColor #1B1B22
skinparam ObjectBackgroundColor #FFFFFF
skinparam ObjectBorderColor #DAD6CC
skinparam ObjectFontColor #1B1B22
skinparam ArtifactBackgroundColor #FFFFFF
skinparam ArtifactBorderColor #DAD6CC
skinparam ArtifactFontColor #1B1B22
skinparam QueueBackgroundColor #FFFFFF
skinparam QueueBorderColor #DAD6CC
skinparam QueueFontColor #1B1B22
skinparam CollectionsBackgroundColor #FFFFFF
skinparam CollectionsBorderColor #DAD6CC
skinparam CollectionsFontColor #1B1B22
skinparam EntityBackgroundColor #FFFFFF
skinparam EntityBorderColor #DAD6CC
skinparam EntityFontColor #1B1B22
skinparam CardBackgroundColor #FFFFFF
skinparam CardBorderColor #DAD6CC
skinparam CardFontColor #1B1B22
skinparam AgentBackgroundColor #FFFFFF
skinparam AgentBorderColor #DAD6CC
skinparam AgentFontColor #1B1B22
skinparam StorageBackgroundColor #FFFFFF
skinparam StorageBorderColor #DAD6CC
skinparam StorageFontColor #1B1B22
skinparam InterfaceBackgroundColor #EEECFF
skinparam InterfaceBorderColor #5B4BFF
skinparam NodeBackgroundColor #F5F2EB
skinparam NodeBorderColor #DCD7CC
skinparam NodeFontColor #5B5B68
skinparam PackageBackgroundColor #F5F2EB
skinparam PackageBorderColor #DCD7CC
skinparam PackageFontColor #5B5B68
skinparam RectangleBackgroundColor #F5F2EB
skinparam RectangleBorderColor #DCD7CC
skinparam RectangleFontColor #5B5B68
skinparam CloudBackgroundColor #F5F2EB
skinparam CloudBorderColor #DCD7CC
skinparam CloudFontColor #5B5B68
skinparam FrameBackgroundColor #F5F2EB
skinparam FrameBorderColor #DCD7CC
skinparam FrameFontColor #5B5B68
skinparam FolderBackgroundColor #F5F2EB
skinparam FolderBorderColor #DCD7CC
skinparam FolderFontColor #5B5B68
skinparam SequenceLifeLineBorderColor #DCD7CC
skinparam SequenceGroupBackgroundColor #F5F2EB
skinparam SequenceBoxBackgroundColor #F5F2EB
skinparam SequenceBoxBorderColor #DCD7CC
skinparam SequenceDividerBackgroundColor #EFECE5
skinparam NoteBackgroundColor #FFF8DD
skinparam NoteBorderColor #F0B429
skinparam NoteFontColor #7A5200
skinparam LegendBackgroundColor #EFECE5
skinparam LegendBorderColor #DAD6CC
`,
  dark: `
skinparam defaultFontName Inter
skinparam defaultFontSize 13
skinparam defaultFontColor #D6DEEB
skinparam roundCorner 12
skinparam shadowing false
skinparam ArrowThickness 1.2
skinparam BackgroundColor #11161D
skinparam ArrowColor #6B778A
skinparam ArrowFontColor #8E9BAE
skinparam ArrowFontSize 11
skinparam TitleFontColor #D6DEEB
skinparam ActorBackgroundColor #24387A
skinparam ActorBorderColor #7AA2FF
skinparam ActorFontColor #D6DEEB
skinparam ComponentBackgroundColor #11161D
skinparam ComponentBorderColor #283241
skinparam ComponentFontColor #D6DEEB
skinparam DatabaseBackgroundColor #11161D
skinparam DatabaseBorderColor #283241
skinparam DatabaseFontColor #D6DEEB
skinparam ClassBackgroundColor #11161D
skinparam ClassBorderColor #283241
skinparam ClassFontColor #D6DEEB
skinparam ParticipantBackgroundColor #11161D
skinparam ParticipantBorderColor #283241
skinparam ParticipantFontColor #D6DEEB
skinparam ActivityBackgroundColor #11161D
skinparam ActivityBorderColor #283241
skinparam ActivityFontColor #D6DEEB
skinparam StateBackgroundColor #11161D
skinparam StateBorderColor #283241
skinparam StateFontColor #D6DEEB
skinparam UsecaseBackgroundColor #11161D
skinparam UsecaseBorderColor #283241
skinparam UsecaseFontColor #D6DEEB
skinparam ObjectBackgroundColor #11161D
skinparam ObjectBorderColor #283241
skinparam ObjectFontColor #D6DEEB
skinparam ArtifactBackgroundColor #11161D
skinparam ArtifactBorderColor #283241
skinparam ArtifactFontColor #D6DEEB
skinparam QueueBackgroundColor #11161D
skinparam QueueBorderColor #283241
skinparam QueueFontColor #D6DEEB
skinparam CollectionsBackgroundColor #11161D
skinparam CollectionsBorderColor #283241
skinparam CollectionsFontColor #D6DEEB
skinparam EntityBackgroundColor #11161D
skinparam EntityBorderColor #283241
skinparam EntityFontColor #D6DEEB
skinparam CardBackgroundColor #11161D
skinparam CardBorderColor #283241
skinparam CardFontColor #D6DEEB
skinparam AgentBackgroundColor #11161D
skinparam AgentBorderColor #283241
skinparam AgentFontColor #D6DEEB
skinparam StorageBackgroundColor #11161D
skinparam StorageBorderColor #283241
skinparam StorageFontColor #D6DEEB
skinparam InterfaceBackgroundColor #15203A
skinparam InterfaceBorderColor #7AA2FF
skinparam NodeBackgroundColor #0E141C
skinparam NodeBorderColor #2A3544
skinparam NodeFontColor #8E9BAE
skinparam PackageBackgroundColor #0E141C
skinparam PackageBorderColor #2A3544
skinparam PackageFontColor #8E9BAE
skinparam RectangleBackgroundColor #0E141C
skinparam RectangleBorderColor #2A3544
skinparam RectangleFontColor #8E9BAE
skinparam CloudBackgroundColor #0E141C
skinparam CloudBorderColor #2A3544
skinparam CloudFontColor #8E9BAE
skinparam FrameBackgroundColor #0E141C
skinparam FrameBorderColor #2A3544
skinparam FrameFontColor #8E9BAE
skinparam FolderBackgroundColor #0E141C
skinparam FolderBorderColor #2A3544
skinparam FolderFontColor #8E9BAE
skinparam SequenceLifeLineBorderColor #2A3544
skinparam SequenceGroupBackgroundColor #0E141C
skinparam SequenceBoxBackgroundColor #0E141C
skinparam SequenceBoxBorderColor #2A3544
skinparam SequenceDividerBackgroundColor #151B24
skinparam NoteBackgroundColor #2E2810
skinparam NoteBorderColor #E3B341
skinparam NoteFontColor #F0C75E
skinparam LegendBackgroundColor #151B24
skinparam LegendBorderColor #283241
`,
};

// Returns the styled source and how to map line numbers in the rendered SVG back to the original.
function styleSource(source, theme) {
  const css = (PUML_SKIN[theme] || '').trim();
  const m = source.match(/^[ \t]*@start\w+[^\n]*\n/m);
  if (!css || !m) return { text: source, startLine: 0, injected: 0 };
  const at = m.index + m[0].length;
  const startLine = source.slice(0, at).split('\n').length - 1;
  const injected = css.split('\n').length;
  return { text: source.slice(0, at) + css + '\n' + source.slice(at), startLine, injected };
}

/* ------------------------------------------------------------------ */
/* Recolor: diagrams often hard-code colors (C4 includes, inline #colors,  */
/* skinparams after the fact), so the rendered SVG is painted by role.     */
/* Tokens come from docs-viewer.pen (pu-* / mdr-* variables).              */
/* ------------------------------------------------------------------ */
const TOKENS = {
  light: { bg: '#FFFFFF', surface: '#FFFFFF', ink: '#1B1B22', ink2: '#5B5B68', ink3: '#8A8A98', node: '#DAD6CC', boundary: '#F5F2EB', bline: '#DCD7CC', person: '#26255E', personStroke: '#26255E', accent: '#5B4BFF', soft: '#EEECFF', code: '#EFECE5', note: '#FFF8DD', nline: '#F0B429', nink: '#7A5200' },
  dark:  { bg: '#11161D', surface: '#151B24', ink: '#D6DEEB', ink2: '#8E9BAE', ink3: '#6B778A', node: '#283241', boundary: '#0E141C', bline: '#2A3544', person: '#24387A', personStroke: '#7AA2FF', accent: '#7AA2FF', soft: '#15203A', code: '#151B24', note: '#2E2810', nline: '#E3B341', nink: '#F0C75E' },
};
const C4_PERSON_FILLS = /#(08427b|073b6f)/i;
const SHAPES = 'rect, path, ellipse, polygon, circle, line, polyline';
const visible = v => v && v !== 'none' && v !== 'transparent';
const NAMED = { black: '#000000', white: '#ffffff', gray: '#808080', grey: '#808080', red: '#ff0000', blue: '#0000ff', green: '#008000', yellow: '#ffff00', orange: '#ffa500' };
function toRgb(v) {
  if (!v) return null;
  v = String(v).trim().toLowerCase();
  if (NAMED[v]) v = NAMED[v];
  let m = v.match(/^#([0-9a-f]{3})$/);
  if (m) return m[1].split('').map(h => parseInt(h + h, 16));
  m = v.match(/^#([0-9a-f]{6})/);
  if (m) return [0, 2, 4].map(k => parseInt(m[1].substr(k, 2), 16));
  m = v.match(/rgb\((\d+)[ ,]+(\d+)[ ,]+(\d+)/);
  return m ? [+m[1], +m[2], +m[3]] : null;
}
const luma = ([r, g, b]) => (0.299 * r + 0.587 * g + 0.114 * b) / 255;
const isNoteish = ([r, g, b]) => r > 225 && g > 225 && b < 235 && r - b > 25;
const fillOf = n => n.style.fill || n.getAttribute('fill');
const strokeOf = n => n.style.stroke || n.getAttribute('stroke');
const opacityOf = n => parseFloat(n.getAttribute('fill-opacity') ?? '1');
const dashed = n => /dasharray/.test((n.getAttribute('style') || '') + (n.getAttribute('stroke-dasharray') || ''));


// Typographic hierarchy inside an element (docs-viewer.pen): bold title, small muted
// stereotype / [tech] tags, smaller secondary description.
function typeset(g, c, mode) {
  const texts = [...g.querySelectorAll('text')];
  if (!texts.length) return;
  const lines = [];
  texts.forEach(t => {
    const y = Math.round(parseFloat(t.getAttribute('y')) * 2) / 2;
    let l = lines.find(x => Math.abs(x.y - y) < 0.6);
    if (!l) lines.push(l = { y, items: [] });
    l.items.push(t);
  });
  lines.sort((a, b) => a.y - b.y);
  const label = l => l.items.map(t => t.textContent).join('').trim();
  const isStereo = l => /^[«<]/.test(label(l));
  const isTech = l => /^\[.*\]$/.test(label(l));
  const boldLine = l => l.items.some(t => t.getAttribute('font-weight') === '700');
  let nameLine = mode === 'cluster' ? lines.find(l => !isStereo(l) && !isTech(l)) : (lines.find(l => boldLine(l) && !isStereo(l) && !isTech(l)) || lines.find(l => !isStereo(l) && !isTech(l)));
  const onPerson = mode === 'person';
  const muted = onPerson ? '#FFFFFF99' : c.ink3;
  const body = onPerson ? '#FFFFFFC4' : c.ink2;
  const title = onPerson ? '#FFFFFF' : (mode === 'cluster' ? c.ink2 : c.ink);
  const restyle = (l, { size, weight, fill }) => {
    const first = l.items.find(t => t.getAttribute('font-size'));
    const old = first ? parseFloat(first.getAttribute('font-size')) : size;
    const k = size && old ? size / old : 1;
    const words = l.items.filter(t => t.getAttribute('textLength'));
    const xs = words.flatMap(t => [parseFloat(t.getAttribute('x')), parseFloat(t.getAttribute('x')) + parseFloat(t.getAttribute('textLength'))]);
    const mid = xs.length ? (Math.min(...xs) + Math.max(...xs)) / 2 : 0;
    l.items.forEach(t => {
      t.style.setProperty('fill', fill);
      if (weight) t.setAttribute('font-weight', weight);
      if (k !== 1) {
        t.setAttribute('font-size', Math.round(old * k * 100) / 100);
        const x = parseFloat(t.getAttribute('x')); t.setAttribute('x', mid + (x - mid) * k);
        const tl = parseFloat(t.getAttribute('textLength')); if (tl) t.setAttribute('textLength', tl * k);
      }
    });
  };
  lines.forEach(l => {
    if (l === nameLine) restyle(l, { size: mode === 'cluster' ? 0 : 15, weight: '700', fill: title });
    else if (isStereo(l) || isTech(l)) restyle(l, { size: 10.5, weight: isTech(l) ? '500' : null, fill: muted });
    else if (mode !== 'cluster') restyle(l, { size: 11.5, weight: '400', fill: body });
  });
}

function recolor(model, theme, svg) {
  const c = TOKENS[theme] || TOKENS.light;
  const done = new WeakSet();
  const set = (n, prop, val) => n.style.setProperty(prop, val);

  const round = (n, r) => {
    if (n.localName !== 'rect' || !r) return;
    const w = parseFloat(n.getAttribute('width')), h = parseFloat(n.getAttribute('height'));
    if (!(w >= 24 && h >= 20)) return; // skip icons, bars, hit areas
    const v = Math.min(r, h / 2, w / 2);
    n.setAttribute('rx', v); n.setAttribute('ry', v);
  };
  const paintGroup = (g, { fill, stroke, text, radius }) => {
    g.querySelectorAll(SHAPES).forEach(n => {
      done.add(n);
      round(n, radius);
      if (fill && visible(fillOf(n)) && opacityOf(n) > 0) set(n, 'fill', fill);
      if (stroke && visible(strokeOf(n))) set(n, 'stroke', stroke);
    });
    g.querySelectorAll('text').forEach(n => { done.add(n); if (text) set(n, 'fill', text); });
  };

  model.all.forEach(e => {
    const g = e.g;
    const classifier = (KINDS[e.kind] || {}).group === 'Classifiers';
    const radius = classifier ? 6 : 12;
    if (e.kind === 'note') return paintGroup(g, { fill: c.note, stroke: c.nline, text: c.nink });
    if (e.isCluster) { paintGroup(g, { fill: c.boundary, stroke: c.bline, text: c.ink2, radius: 16 }); return typeset(g, c, 'cluster'); }
    if (e.c4person) { paintGroup(g, { fill: c.person, stroke: c.personStroke, text: '#FFFFFF', radius }); return typeset(g, c, 'person'); }
    if (e.kind === 'actor' || e.kind === 'person') return paintGroup(g, { fill: c.person, stroke: c.personStroke, text: c.ink });
    if (e.kind === 'interface' || e.kind === 'port') return paintGroup(g, { fill: c.soft, stroke: c.accent, text: c.ink });
    paintGroup(g, { fill: c.surface, stroke: c.node, text: c.ink, radius });
    if (!classifier) typeset(g, c, 'node');
  });
  model.links.forEach(l => {
    l.g.querySelectorAll(SHAPES).forEach(n => {
      done.add(n);
      if (visible(strokeOf(n))) set(n, 'stroke', c.ink3);
      if (visible(fillOf(n)) && n.localName === 'polygon') set(n, 'fill', c.ink3);
    });
    l.g.querySelectorAll('text').forEach(n => { done.add(n); set(n, 'fill', c.ink2); });
  });

  // Everything PlantUML did not tag as entity / cluster / link: sequence participants, lifelines,
  // messages, titles, notes, legends, activity and state shapes, background…
  const vb = (svg.getAttribute('viewBox') || '').split(/[ ,]+/).map(Number);
  const W = vb[2] || parseFloat(svg.getAttribute('width')) || 0, H = vb[3] || parseFloat(svg.getAttribute('height')) || 0;
  svg.querySelectorAll(SHAPES).forEach(n => {
    if (done.has(n)) return;
    const f = fillOf(n), st = strokeOf(n), hasFill = visible(f) && opacityOf(n) > 0, rgbF = hasFill ? toRgb(f) : null;
    if (n.localName === 'rect' && hasFill && W && parseFloat(n.getAttribute('width')) >= W * 0.98 && parseFloat(n.getAttribute('height')) >= H * 0.98) {
      set(n, 'fill', c.bg); if (visible(st)) set(n, 'stroke', 'none'); return;
    }
    if (n.localName === 'polygon' && hasFill && rgbF && luma(rgbF) < 0.5) { set(n, 'fill', c.ink3); if (visible(st)) set(n, 'stroke', c.ink3); return; }
    if (hasFill) round(n, 8);
    if (hasFill) {
      const sat = rgbF ? Math.max(...rgbF) - Math.min(...rgbF) : 0;
      const darkNote = rgbF && rgbF[0] > rgbF[2] + 15 && rgbF[0] >= rgbF[1] && luma(rgbF) < 0.3;
      if (rgbF && (isNoteish(rgbF) || darkNote)) { set(n, 'fill', c.note); if (visible(st)) set(n, 'stroke', c.nline); }
      else if (rgbF && luma(rgbF) < 0.3 && sat >= 30) { set(n, 'fill', c.person); if (visible(st)) set(n, 'stroke', c.personStroke); }
      else if (rgbF && luma(rgbF) < 0.3 && sat < 10) { set(n, 'fill', c.ink2); if (visible(st)) set(n, 'stroke', c.ink2); }
      else { set(n, 'fill', c.surface); if (visible(st)) set(n, 'stroke', c.node); }
    } else if (visible(st)) {
      set(n, 'stroke', dashed(n) ? c.bline : c.ink3);
    }
  });
  svg.querySelectorAll('text').forEach(n => { if (!done.has(n)) set(n, 'fill', c.ink); });
}

/* ------------------------------------------------------------------ */
/* UML element model                                                   */
/* ------------------------------------------------------------------ */
const FONT_STACK = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const KINDS = {
  actor:       { label: 'Actor',          group: 'Actors',       icon: 'user' },
  person:      { label: 'Actor',          group: 'Actors',       icon: 'user' },
  component:   { label: 'Component',      group: 'Components',   icon: 'component' },
  agent:       { label: 'Component',      group: 'Components',   icon: 'component' },
  container:   { label: 'Component',      group: 'Components',   icon: 'component' },
  system:      { label: 'Component',      group: 'Components',   icon: 'component' },
  artifact:    { label: 'Artifact',       group: 'Components',   icon: 'component' },
  file:        { label: 'Artifact',       group: 'Components',   icon: 'component' },
  card:        { label: 'Element',        group: 'Elements',     icon: 'shapes' },
  interface:   { label: 'Interface',      group: 'Interfaces',   icon: 'circle-dot' },
  port:        { label: 'Port',           group: 'Interfaces',   icon: 'circle-dot' },
  database:    { label: 'Data store',     group: 'Data stores',  icon: 'database' },
  storage:     { label: 'Data store',     group: 'Data stores',  icon: 'database' },
  queue:       { label: 'Queue',          group: 'Data stores',  icon: 'database' },
  collections: { label: 'Collection',     group: 'Data stores',  icon: 'database' },
  class:       { label: 'Class',          group: 'Classifiers',  icon: 'box' },
  abstract:    { label: 'Abstract class', group: 'Classifiers',  icon: 'box' },
  enum:        { label: 'Enumeration',    group: 'Classifiers',  icon: 'box' },
  annotation:  { label: 'Annotation',     group: 'Classifiers',  icon: 'box' },
  entity:      { label: 'Entity',         group: 'Classifiers',  icon: 'box' },
  object:      { label: 'Object',         group: 'Classifiers',  icon: 'box' },
  map:         { label: 'Object',         group: 'Classifiers',  icon: 'box' },
  usecase:     { label: 'Use case',       group: 'Use cases',    icon: 'ellipse' },
  participant: { label: 'Participant',    group: 'Participants', icon: 'user' },
  boundary:    { label: 'Boundary',       group: 'Participants', icon: 'user' },
  control:     { label: 'Control',        group: 'Participants', icon: 'user' },
  state:       { label: 'State',          group: 'States',       icon: 'circle-dot' },
  node:        { label: 'Node',           group: 'Containers',   icon: 'server' },
  cloud:       { label: 'Cloud',          group: 'Containers',   icon: 'cloud' },
  package:     { label: 'Package',        group: 'Containers',   icon: 'package' },
  folder:      { label: 'Package',        group: 'Containers',   icon: 'package' },
  frame:       { label: 'Frame',          group: 'Containers',   icon: 'square-dashed' },
  rectangle:   { label: 'Rectangle',      group: 'Containers',   icon: 'square-dashed' },
  element:     { label: 'Element',        group: 'Elements',     icon: 'shapes' },
  note:        { label: 'Note',           group: 'Notes',        icon: 'sticky-note' },
};
const KIND_RE = /^(abstract class|abstract|annotation|class|interface|enum|entity|actor|participant|boundary|control|database|collections|queue|component|node|artifact|cloud|frame|folder|package|rectangle|usecase|storage|card|agent|person|system|container|state|object|map|file|port)\b\s*(.*)$/i;

function parseDecl(line) {
  const t = line.trim();
  if (/^(floating\s+)?note\b/i.test(t)) return { kind: 'note' };
  let kind, rest, m;
  if ((m = t.match(KIND_RE))) { kind = m[1].toLowerCase().replace(/^abstract class$/, 'abstract'); rest = m[2]; }
  else if ((m = t.match(/^\[([^\]]+)\]/))) return { kind: 'component', name: m[1] };
  else if ((m = t.match(/^:([^:]+):/))) return { kind: 'actor', name: m[1] };
  else if ((m = t.match(/^\(([^)]+)\)/))) return { kind: 'usecase', name: m[1] };
  else if ((m = t.match(/^\(\)\s*"?([^"\s]+)/))) return { kind: 'interface', name: m[1] };
  else return null;
  let name;
  if ((m = rest.match(/^"([^"]+)"/))) name = m[1];
  else if ((m = rest.match(/^\[([^\]]+)\]/))) name = m[1];
  else if ((m = rest.match(/^([^\s{<]+)/))) name = m[1];
  const alias = rest.match(/\bas\s+"([^"]+)"/);
  if (alias) name = alias[1];
  const stereo = rest.match(/<<\s*([^>]+?)\s*>>/);
  return { kind, name: name && name.replace(/\\n/g, ' '), stereo: stereo && stereo[1] };
}

/* ------------------------------------------------------------------ */
/* UML legend glyphs (28x16) — notation per UML 2.x                    */
/* ------------------------------------------------------------------ */
const GLYPH = {
  actor:      '<circle cx="14" cy="3.2" r="2.2"/><path d="M14 5.4v5M9.5 7.4h9M14 10.4l-3.2 4.6M14 10.4l3.2 4.6"/>',
  component:  '<rect class="bg" x="6" y="2" width="17" height="12" rx="1"/><rect class="bg" x="3" y="4.5" width="6" height="2.6"/><rect class="bg" x="3" y="9" width="6" height="2.6"/>',
  interface:  '<circle class="bg" cx="18" cy="8" r="4"/><path d="M3 8h11"/>',
  package:    '<path class="bg" d="M4 14.5V2h8.5v3H24v9.5z"/><path d="M4 5h8.5"/>',
  node:       '<path class="bg" d="M3 5l3-3h18v9l-3 3H3z"/><path d="M3 5h18v9M21 5l3-3"/>',
  database:   '<path class="bg" d="M6 4v8a8 2.6 0 0 0 16 0V4"/><ellipse class="bg" cx="14" cy="4" rx="8" ry="2.6"/>',
  class:      '<rect class="bg" x="5" y="1.5" width="18" height="13"/><path d="M5 6h18M5 10.5h18"/>',
  note:       '<path class="bg" d="M5 2h13l5 5v7H5z"/><path d="M18 2v5h5"/>',
  usecase:    '<ellipse class="bg" cx="14" cy="8" rx="10" ry="6"/>',
  rectangle:  '<rect class="bg" x="3" y="2" width="22" height="12" rx="1"/>',
  cloud:      '<path class="bg" d="M8 13.5a3.6 3.6 0 0 1-.7-7.1 5 5 0 0 1 9.6-1 4.2 4.2 0 0 1 3.1 8.1z"/>',
  participant:'<rect class="bg" x="7" y="1" width="14" height="6" rx="1"/><path d="M14 7v8" stroke-dasharray="2 2"/>',
  state:      '<rect class="bg" x="3" y="2" width="22" height="12" rx="5"/>',
  association:    '<path d="M3 8h22"/>',
  directed:       '<path d="M3 8h21M20 4.2 24.5 8 20 11.8"/>',
  dependency:     '<path d="M3 8h21" stroke-dasharray="3 2.5"/><path d="M20 4.2 24.5 8 20 11.8"/>',
  generalization: '<path d="M3 8h14"/><path class="bg" d="M17 3.5 25 8l-8 4.5z"/>',
  realization:    '<path d="M3 8h14" stroke-dasharray="3 2.5"/><path class="bg" d="M17 3.5 25 8l-8 4.5z"/>',
  aggregation:    '<path class="bg" d="M3 8l4.2-3.2L11.4 8l-4.2 3.2z"/><path d="M11.4 8H25"/>',
  composition:    '<path class="fg" d="M3 8l4.2-3.2L11.4 8l-4.2 3.2z"/><path d="M11.4 8H25"/>',
  message:        '<path d="M3 8h21"/><path class="fg" d="M19 4.5 25 8l-6 3.5z"/>',
  reply:          '<path d="M25 8H4" stroke-dasharray="3 2.5"/><path d="M8.5 4.2 4 8l4.5 3.8"/>',
};
const LEGEND_ELEMENTS = [
  ['actor', 'Actor', ['actor', 'person']],
  ['component', 'Component', ['component', 'agent', 'container', 'system', 'artifact', 'file']],
  ['interface', 'Interface', ['interface', 'port']],
  ['class', 'Class', ['class', 'abstract', 'enum', 'annotation', 'entity', 'object', 'map']],
  ['usecase', 'Use case', ['usecase']],
  ['database', 'Data store', ['database', 'storage', 'queue', 'collections']],
  ['node', 'Node', ['node']],
  ['package', 'Package', ['package', 'folder']],
  ['rectangle', 'Subsystem / boundary', ['rectangle', 'frame']],
  ['cloud', 'Cloud', ['cloud']],
  ['participant', 'Lifeline (participant)', ['participant', 'boundary', 'control']],
  ['state', 'State', ['state']],
  ['note', 'Note', ['note']],
];
const LEGEND_RELATIONS = {
  association: 'Association',
  directed: 'Directed association',
  dependency: 'Dependency',
  generalization: 'Generalization',
  realization: 'Realization',
  aggregation: 'Aggregation',
  composition: 'Composition',
  message: 'Message',
  reply: 'Reply (return)',
};
const glyph = key => `<svg viewBox="0 0 28 16" aria-hidden="true">${GLYPH[key]}</svg>`;
const DIAGRAM_KIND = {
  SEQUENCE: 'Sequence', CLASS: 'Class', DESCRIPTION: 'Component / Deployment', COMPONENT: 'Component',
  USECASE: 'Use case', ACTIVITY: 'Activity', STATE: 'State', OBJECT: 'Object', DEPLOYMENT: 'Deployment',
  TIMING: 'Timing', GANTT: 'Gantt', MINDMAP: 'Mind map', WBS: 'WBS', ER: 'Entity relationship',
};

/* ------------------------------------------------------------------ */
(async function () {
  const params = new URLSearchParams(location.search);
  const filePath = params.get('path');
  const prId = params.get('prId');
  const branch = params.get('branch');
  const $ = id => document.getElementById(id);

  const statusEl = $('status'), appEl = $('app'), viewport = $('viewport'), stage = $('stage');
  const outlineEl = $('outline'), legendEl = $('legend'), sourceEl = $('source');

  /* ---- chrome ---- */
  $('logo').innerHTML = icon('message-square-text');
  const label = prId ? `PR #${prId}` : branch ? `Branch: ${branch}` : null;
  if (label) { $('chip').innerHTML = icon(prId ? 'git-pull-request' : 'git-branch') + esc(label); $('chip').hidden = false; }
  const segs = (filePath || '').replace(/^\/+/, '').split('/');
  $('filepath').innerHTML = segs.slice(0, -1).map(esc).join(' / ') + (segs.length > 1 ? ' / ' : '') + `<b>${esc(segs[segs.length - 1])}</b>`;
  $('filepath').title = filePath;
  document.title = segs[segs.length - 1];
  $('zoomOut').innerHTML = icon('minus');
  $('zoomIn').innerHTML = icon('plus');
  $('viewSource').innerHTML = `<span>View source</span>${icon('code', 'small')}`;
  $('svgLink').innerHTML = `<span>Open SVG</span>${icon('external-link', 'small')}`;
  $('inspClose').innerHTML = icon('x');
  $('inspSource').innerHTML = `${icon('code')}<span>Show in source</span>`;
  $('inspCopy').innerHTML = `${icon('link')}<span>Copy link</span>`;

  const themeBtns = document.querySelectorAll('#themeToggle button');
  const currentTheme = () => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  const syncTheme = () => themeBtns.forEach(b => b.classList.toggle('on', b.dataset.theme === currentTheme()));
  syncTheme();

  /* ---- fetch source ---- */
  const { pat = '' } = await chrome.storage.sync.get(['pat']);
  let pumlSource;
  try {
    pumlSource = (await fetchAzureFile(params, pat)).text;
  } catch (err) {
    statusEl.className = 'error';
    statusEl.textContent = `Failed to fetch diagram: ${err.message}`;
    return;
  }
  const srcLines = pumlSource.split('\n');

  sourceEl.innerHTML = srcLines.map((l, i) => `<div class="ln" data-l="${i + 1}"><span class="n">${i + 1}</span><span class="c">${esc(l.replace(/\r$/, '')) || ' '}</span></div>`).join('');
  const viewBtns = document.querySelectorAll('#viewToggle button');
  function setView(v) {
    document.body.classList.toggle('view-source', v === 'source');
    viewBtns.forEach(b => b.classList.toggle('on', b.dataset.view === v));
  }
  viewBtns.forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));
  $('viewSource').addEventListener('click', () => setView('source'));
  function showSourceLine(n) {
    setView('source');
    sourceEl.querySelectorAll('.ln.hl').forEach(e => e.classList.remove('hl'));
    const el = sourceEl.querySelector(`.ln[data-l="${n}"]`);
    if (el) { el.classList.add('hl'); el.scrollIntoView({ block: 'center' }); }
  }

  /* ---- diagram state ---- */
  const svgCache = {};
  let model = null;
  let selected = null;
  let scale = 1, tx = 0, ty = 0, imgW = 0, imgH = 0;
  let firstLoad = true;

  async function loadSvg(theme) {
    if (svgCache[theme]) return svgCache[theme];
    const styled = styleSource(pumlSource, theme);
    const url = `https://www.plantuml.com/plantuml/svg/${encodePlantUml(styled.text)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`plantuml.com responded with HTTP ${res.status}`);
    const text = await res.text();
    return (svgCache[theme] = { text, url, styled });
  }

  function buildModel(svg, styled) {
    const srcLine = el => {
      let idx = parseInt(el.getAttribute('data-source-line'), 10); // 0-based, in the styled text
      if (isNaN(idx)) return 0;
      if (styled.injected && idx >= styled.startLine) idx -= styled.injected;
      return Math.max(1, idx + 1);
    };
    const all = [], byId = {}, links = [];
    svg.querySelectorAll('g.entity, g.cluster').forEach(g => {
      const qn = g.getAttribute('data-qualified-name') || g.id;
      const isCluster = g.classList.contains('cluster');
      const last = qn.split('.').pop();
      let line = srcLine(g);
      // C4 / !include macros report lines from the included file: only trust lines that mention the element
      if (line && !(srcLines[line - 1] || '').toLowerCase().includes(last.toLowerCase())) line = 0;
      const decl = line ? parseDecl(srcLines[line - 1] || '') : null;
      const tn = [...g.querySelectorAll('text')].filter(t => t.textContent.trim() && !/^[«\[<]/.test(t.textContent.trim()));
      const texts = tn.length ? [tn.filter(t => t.getAttribute('y') === tn[0].getAttribute('y')).map(t => t.textContent.trim()).join(' ')] : [];
      const c4person = !decl && [...g.querySelectorAll('rect, path')].some(n => C4_PERSON_FILLS.test(n.getAttribute('fill') || n.getAttribute('style') || ''));
      const e = {
        id: g.id, g, qn, line, isCluster,
        c4person,
        kind: (decl && decl.kind) || (/^GM[A-Z]*\d+$/.test(last) ? 'note' : c4person ? 'person' : isCluster ? 'package' : 'component'),
        name: (decl && decl.name) || texts[0] || last,
        stereo: decl && decl.stereo,
        parent: null, kids: [], inn: 0, out: 0,
      };
      all.push(e); byId[g.id] = e;
    });
    const byQn = Object.fromEntries(all.map(e => [e.qn, e]));
    all.forEach(e => {
      const i = e.qn.lastIndexOf('.');
      const p = i > 0 ? byQn[e.qn.slice(0, i)] : null;
      if (p && p.isCluster) { e.parent = p; p.kids.push(e); }
    });
    svg.querySelectorAll('g.link').forEach(g => {
      const a = byId[g.getAttribute('data-entity-1')], b = byId[g.getAttribute('data-entity-2')];
      const dashed = /stroke-dasharray/.test(g.innerHTML);
      const arrow = !!g.querySelector('polygon');
      links.push({ g, a, b, type: g.getAttribute('data-link-type') || '', dashed, arrow });
      if (a) a.out++;
      if (b) b.inn++;
    });
    return { els: all.filter(e => e.kind !== 'note'), all, byQn, links };
  }

  /* ---- outline ---- */
  function rowFor(e, leafIndent) {
    const row = document.createElement('button');
    const kids = e.kids.filter(c => c.kind !== 'note');
    row.className = 'row' + (kids.length ? ' open' : '') + (leafIndent && !kids.length ? ' leaf' : '');
    row.dataset.qn = e.qn;
    const k = KINDS[e.kind] || KINDS.element;
    row.innerHTML = (kids.length ? `<span class="chev">${icon('chevron-right')}</span>` : '') + icon(k.icon) + `<span class="t">${esc(e.name)}</span>`;
    row.addEventListener('click', ev => {
      if (ev.target.closest('.chev')) {
        const wrap = row.nextElementSibling, open = wrap.hidden;
        wrap.hidden = !open; row.classList.toggle('open', open);
        return;
      }
      select(e.qn, { reveal: true });
    });
    return row;
  }
  function renderTree(parent, e, depth) {
    parent.appendChild(rowFor(e, depth > 0));
    const kids = e.kids.filter(c => c.kind !== 'note');
    if (kids.length) {
      const wrap = document.createElement('div');
      wrap.className = 'kids';
      kids.forEach(c => renderTree(wrap, c, depth + 1));
      parent.appendChild(wrap);
    }
  }
  function renderOutline(m) {
    outlineEl.innerHTML = '';
    const title = t => { const d = document.createElement('div'); d.className = 'sec-title'; d.textContent = t; outlineEl.appendChild(d); };
    const top = m.els.filter(e => !e.parent);
    const clusters = top.filter(e => e.isCluster || e.kids.length);
    if (clusters.length) { title('Containers'); clusters.forEach(e => renderTree(outlineEl, e, 0)); }
    const groups = new Map();
    top.filter(e => !clusters.includes(e)).forEach(e => {
      const g = (KINDS[e.kind] || KINDS.element).group;
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(e);
    });
    groups.forEach((list, g) => { title(g); list.forEach(e => outlineEl.appendChild(rowFor(e, false))); });
    if (!m.els.length) title('No selectable elements');
  }

  /* ---- legend: UML notation, only shapes that occur in this diagram ---- */
  function renderLegend(m, svg) {
    const kinds = new Set(m.all.map(e => e.kind));
    srcLines.forEach(l => { const d = parseDecl(l); if (d) kinds.add(d.kind); });
    const diagType = (svg.getAttribute('data-diagram-type') || '').toUpperCase();
    const els = LEGEND_ELEMENTS.filter(([, , ks]) => ks.some(k => kinds.has(k)));
    const rels = new Set();
    if (m.links.length) {
      m.links.forEach(l => {
        switch (l.type) {
          case 'dependency': rels.add(l.dashed ? 'dependency' : 'directed'); break;
          case 'extension': rels.add(l.dashed ? 'realization' : 'generalization'); break;
          case 'aggregation': rels.add('aggregation'); break;
          case 'composition': rels.add('composition'); break;
          case 'association': rels.add(l.arrow ? 'directed' : 'association'); break;
          default: rels.add(l.dashed ? 'dependency' : (l.arrow ? 'directed' : 'association'));
        }
      });
    } else if (diagType === 'SEQUENCE') {
      if (srcLines.some(l => /(^|[^-])->|<-([^-]|$)/.test(l))) rels.add('message');
      if (srcLines.some(l => /-->|<--/.test(l))) rels.add('reply');
    }
    const relOrder = Object.keys(LEGEND_RELATIONS).filter(k => rels.has(k));
    if (!els.length && !relOrder.length) { legendEl.hidden = true; return; }
    legendEl.innerHTML = '<h4>LEGEND · UML</h4>'
      + (els.length ? '<div class="sub">Elements</div>' + els.map(([g, l]) => `<div class="lg">${glyph(g)}<span>${l}</span></div>`).join('') : '')
      + (relOrder.length ? '<div class="sub">Relationships</div>' + relOrder.map(k => `<div class="lg">${glyph(k)}<span>${LEGEND_RELATIONS[k]}</span></div>`).join('') : '');
    legendEl.hidden = false;
  }

  function renderMeta(m, svg) {
    const t = pumlSource.match(/^\s*title\s+(.+)$/mi);
    $('diagTitle').textContent = t ? t[1].replace(/\\n/g, ' ').trim() : segs[segs.length - 1].replace(/\.(puml|plantuml|pu|wsd|iuml)$/i, '');
    const dt = (svg.getAttribute('data-diagram-type') || '').toUpperCase();
    $('kindChip').textContent = 'UML · ' + (DIAGRAM_KIND[dt] || (dt ? dt[0] + dt.slice(1).toLowerCase() : 'Diagram'));
    $('counts').textContent = m.els.length ? `${m.els.length} element${m.els.length === 1 ? '' : 's'} · ${m.links.length} relationship${m.links.length === 1 ? '' : 's'}` : '';
  }

  /* ---- selection / inspector ---- */
  function select(qn, opts = {}) {
    const e = qn && model && model.byQn[qn];
    stage.querySelectorAll('.sel-ring, .sel-halo').forEach(n => n.remove());
    stage.querySelectorAll('.sel, .rel, .rel-link, .anc').forEach(n => n.classList.remove('sel', 'rel', 'rel-link', 'anc'));
    outlineEl.querySelectorAll('.row.active').forEach(r => r.classList.remove('active'));
    if (!e || e.kind === 'note') {
      selected = null;
      stage.classList.remove('has-sel');
      $('inspector').hidden = true;
      history.replaceState(null, '', location.pathname + location.search);
      return;
    }
    selected = qn;
    stage.classList.add('has-sel');
    e.g.classList.add('sel');
    for (let p = e.parent; p; p = p.parent) p.g.classList.add('anc');
    model.links.forEach(l => {
      if (l.a === e || l.b === e) {
        l.g.classList.add('rel-link');
        const o = l.a === e ? l.b : l.a;
        if (o) { o.g.classList.add('rel'); for (let p = o.parent; p; p = p.parent) p.g.classList.add('anc'); }
      }
    });
    const svg = stage.querySelector('svg');
    const bb = e.g.getBBox(), pad = 5;
    ['sel-halo', 'sel-ring'].forEach(cls => {
      const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      r.setAttribute('class', cls);
      r.setAttribute('x', bb.x - pad); r.setAttribute('y', bb.y - pad);
      r.setAttribute('width', bb.width + pad * 2); r.setAttribute('height', bb.height + pad * 2);
      r.setAttribute('rx', 10);
      svg.appendChild(r);
    });
    const row = outlineEl.querySelector(`.row[data-qn="${CSS.escape(qn)}"]`);
    if (row) {
      row.classList.add('active');
      for (let w = row.parentElement; w && w !== outlineEl; w = w.parentElement) {
        if (w.classList.contains('kids')) { w.hidden = false; w.previousElementSibling.classList.add('open'); }
      }
      row.scrollIntoView({ block: 'nearest' });
    }
    const k = KINDS[e.kind] || KINDS.element;
    $('inspector').hidden = false;
    $('inspIcon').innerHTML = icon(k.icon);
    $('inspName').textContent = e.name;
    $('inspKind').textContent = k.label.toLowerCase() + (e.stereo ? ` · «${e.stereo}»` : '') + (e.line ? ` · line ${e.line}` : '');
    $('inspIn').innerHTML = `${icon('arrow-down-left')}${e.inn} incoming`;
    $('inspOut').innerHTML = `${icon('arrow-up-right')}${e.out} outgoing`;
    $('inspSource').disabled = !e.line;
    $('inspSource').onclick = () => showSourceLine(e.line);
    history.replaceState(null, '', `${location.pathname}${location.search}#el=${encodeURIComponent(qn)}`);
    if (opts.reveal) panToElement(e.g);
  }
  $('inspClose').addEventListener('click', () => select(null));
  $('inspCopy').addEventListener('click', async () => {
    const s = $('inspCopy').querySelector('span');
    try { await navigator.clipboard.writeText(location.href); s.textContent = 'Copied'; }
    catch { s.textContent = 'Copy failed'; }
    setTimeout(() => { s.textContent = 'Copy link'; }, 1400);
  });

  /* ---- pan & zoom (transform based) ---- */
  const MIN = 0.05, MAX = 10;
  const render = () => {
    stage.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    $('zoomLevel').textContent = Math.round(scale * 100) + '%';
  };
  const animated = fn => {
    viewport.classList.add('animate'); fn();
    clearTimeout(animated.t); animated.t = setTimeout(() => viewport.classList.remove('animate'), 260);
  };
  const setFitOn = on => $('zoomFit').classList.toggle('on', on);
  function zoomAt(cx, cy, s) {
    s = Math.min(MAX, Math.max(MIN, s));
    const k = s / scale;
    tx = cx - (cx - tx) * k; ty = cy - (cy - ty) * k; scale = s;
    render(); setFitOn(false);
  }
  const vpSize = () => { const r = viewport.getBoundingClientRect(); return { x: r.width / 2, y: r.height / 2, w: r.width, h: r.height }; };
  function fit() {
    const v = vpSize(), padX = 40, top = 92, bottom = 84;
    const s = Math.max(MIN, Math.min((v.w - padX * 2) / imgW, (v.h - top - bottom) / imgH, 1));
    scale = s; tx = (v.w - imgW * s) / 2; ty = top + (v.h - top - bottom - imgH * s) / 2;
    render(); setFitOn(true);
  }
  function actualSize() {
    const v = vpSize();
    scale = 1; tx = (v.w - imgW) / 2; ty = Math.max(92, (v.h - imgH) / 2);
    render(); setFitOn(false);
  }
  function panToElement(g) {
    const r = g.getBoundingClientRect(), v = viewport.getBoundingClientRect();
    animated(() => { tx += v.left + v.width / 2 - (r.left + r.width / 2); ty += v.top + v.height / 2 - (r.top + r.height / 2); render(); setFitOn(false); });
  }
  $('zoomIn').addEventListener('click', () => { const c = vpSize(); animated(() => zoomAt(c.x, c.y, scale * 1.25)); });
  $('zoomOut').addEventListener('click', () => { const c = vpSize(); animated(() => zoomAt(c.x, c.y, scale / 1.25)); });
  $('zoomReset').addEventListener('click', () => animated(actualSize));
  $('zoomFit').addEventListener('click', () => animated(fit));
  viewport.addEventListener('dblclick', e => {
    if (e.target.closest('g.entity')) return;
    const r = viewport.getBoundingClientRect();
    animated(() => zoomAt(e.clientX - r.left, e.clientY - r.top, scale * 2));
  });
  viewport.addEventListener('wheel', e => {
    e.preventDefault();
    viewport.classList.remove('animate');
    const r = viewport.getBoundingClientRect();
    if (e.ctrlKey || e.metaKey) {
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      zoomAt(e.clientX - r.left, e.clientY - r.top, scale * Math.exp(-dy * 0.01));
    } else {
      const f = e.deltaMode === 1 ? 16 : 1;
      tx -= e.deltaX * f; ty -= e.deltaY * f; render(); setFitOn(false);
    }
  }, { passive: false });

  const pointers = new Map();
  let pinchDist = 0, downTarget = null, downPos = null, moved = false;
  viewport.addEventListener('pointerdown', e => {
    downTarget = e.target; downPos = { x: e.clientX, y: e.clientY }; moved = false;
    viewport.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    viewport.classList.remove('animate');
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinchDist = Math.hypot(a.x - b.x, a.y - b.y); }
  });
  viewport.addEventListener('pointermove', e => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    if (!moved && downPos && Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > 4) { moved = true; viewport.classList.add('dragging'); }
    if (pointers.size === 1) {
      if (moved) { tx += e.clientX - p.x; ty += e.clientY - p.y; render(); setFitOn(false); }
      p.x = e.clientX; p.y = e.clientY;
    } else if (pointers.size === 2) {
      const before = [...pointers.values()];
      const mx0 = (before[0].x + before[1].x) / 2, my0 = (before[0].y + before[1].y) / 2;
      p.x = e.clientX; p.y = e.clientY;
      const [a, b] = [...pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const r = viewport.getBoundingClientRect();
      tx += mx - mx0; ty += my - my0;
      if (pinchDist) zoomAt(mx - r.left, my - r.top, scale * dist / pinchDist);
      pinchDist = dist; moved = true;
    }
  });
  const endPointer = e => {
    const wasClick = pointers.size === 1 && !moved && e.type === 'pointerup';
    pointers.delete(e.pointerId); pinchDist = 0;
    if (!pointers.size) viewport.classList.remove('dragging');
    if (wasClick && model) {
      const g = downTarget && downTarget.closest && downTarget.closest('g.entity');
      const ent = g && model.all.find(x => x.g === g);
      select(ent ? ent.qn : null);
    }
  };
  viewport.addEventListener('pointerup', endPointer);
  viewport.addEventListener('pointercancel', endPointer);

  window.addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey || document.body.classList.contains('view-source')) return;
    const c = vpSize();
    switch (e.key) {
      case '+': case '=': animated(() => zoomAt(c.x, c.y, scale * 1.25)); break;
      case '-': case '_': animated(() => zoomAt(c.x, c.y, scale / 1.25)); break;
      case '0': animated(actualSize); break;
      case 'f': case 'F': animated(fit); break;
      case 'Escape': select(null); break;
      case 'ArrowLeft': animated(() => { tx += 80; render(); }); break;
      case 'ArrowRight': animated(() => { tx -= 80; render(); }); break;
      case 'ArrowUp': animated(() => { ty += 80; render(); }); break;
      case 'ArrowDown': animated(() => { ty -= 80; render(); }); break;
      default: return;
    }
    e.preventDefault();
  });
  window.addEventListener('resize', () => { if (imgW && $('zoomFit').classList.contains('on')) fit(); });

  /* ---- load / reload on theme change ---- */
  const fail = msg => {
    statusEl.className = 'error'; statusEl.textContent = msg;
    statusEl.style.display = ''; appEl.hidden = true;
  };
  async function show() {
    let data;
    try { data = await loadSvg(currentTheme()); }
    catch (err) { return fail(`Failed to render diagram: ${err.message}. Check that your PlantUML source is valid.`); }
    const doc = new DOMParser().parseFromString(data.text, 'image/svg+xml');
    if (doc.querySelector('parsererror') || doc.documentElement.nodeName !== 'svg') {
      return fail('plantuml.com returned an unreadable diagram. Check that your PlantUML source is valid.');
    }
    const prevSel = selected;
    stage.innerHTML = '';
    const svg = document.importNode(doc.documentElement, true);
    stage.style.background = TOKENS[currentTheme()].bg;
    svg.removeAttribute('preserveAspectRatio');
    svg.querySelectorAll('[font-family]').forEach(n => n.setAttribute('font-family', FONT_STACK));
    stage.appendChild(svg);
    statusEl.style.display = 'none';
    appEl.hidden = false;
    $('svgLink').href = data.url;

    imgW = stage.offsetWidth; imgH = stage.offsetHeight;
    model = buildModel(svg, data.styled);
    recolor(model, currentTheme(), svg);
    renderOutline(model); renderLegend(model, svg); renderMeta(model, svg);
    selected = null;
    if (firstLoad) {
      fit(); firstLoad = false;
      const m = location.hash.match(/^#el=(.+)$/);
      if (m) { try { select(decodeURIComponent(m[1]), { reveal: true }); } catch {} }
    } else {
      render();
      if (prevSel) select(prevSel);
    }
  }

  themeBtns.forEach(b => b.addEventListener('click', () => {
    document.documentElement.dataset.theme = b.dataset.theme;
    try { localStorage.setItem('mdTheme', b.dataset.theme); } catch {}
    syncTheme();
    show();
  }));

  await show();
})();
