// Shared toolbar behaviour: logo icon + light/dark switcher (shares the
// 'mdTheme' preference with the markdown viewer).
(function () {
  const ICONS = {
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2m-7.07-2.93 1.41-1.41m11.32-11.32 1.41-1.41M2 12h2m16 0h2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    workflow: '<rect width="8" height="8" x="3" y="3" rx="2"/><path d="M7 11v4a2 2 0 0 0 2 2h4"/><rect width="8" height="8" x="13" y="13" rx="2"/>',
    api: '<path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/>',
    graph: '<circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><circle cx="18" cy="6" r="3"/><path d="M9 6h6M6 9v3a3 3 0 0 0 3 3h6"/>',
  };
  const svg = n => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;
  window.shellIcon = svg;

  const logo = document.getElementById('logo');
  if (logo) logo.innerHTML = svg(logo.dataset.icon || 'workflow');

  const slot = document.getElementById('themeToggle');
  if (!slot) return;
  slot.className = 'theme-sw';
  slot.setAttribute('role', 'group');
  slot.innerHTML = `<button data-theme="light" title="Light theme">${svg('sun')}</button><button data-theme="dark" title="Dark theme">${svg('moon')}</button>`;
  const btns = slot.querySelectorAll('button');
  const sync = () => btns.forEach(b => b.classList.toggle('on', b.dataset.theme === document.documentElement.dataset.theme));
  btns.forEach(b => b.addEventListener('click', () => {
    document.documentElement.dataset.theme = b.dataset.theme;
    try { localStorage.setItem('mdTheme', b.dataset.theme); } catch {}
    sync();
  }));
  sync();
})();
