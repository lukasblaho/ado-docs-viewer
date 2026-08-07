const patInput = document.getElementById('patInput');
const saveBtn = document.getElementById('saveBtn');
const statusEl = document.getElementById('status');
const showPat = document.getElementById('showPat');
const domainsInput = document.getElementById('domainsInput');
const saveDomainsBtn = document.getElementById('saveDomainsBtn');
const domainsStatus = document.getElementById('domainsStatus');

// Load saved settings
chrome.storage.sync.get(['pat', 'graphqlAllowedDomains'], ({ pat = '', graphqlAllowedDomains = [] }) => {
  patInput.value = pat;
  domainsInput.value = graphqlAllowedDomains.join('\n');
});

showPat.addEventListener('click', () => {
  if (patInput.type === 'password') {
    patInput.type = 'text';
    showPat.textContent = 'Hide';
  } else {
    patInput.type = 'password';
    showPat.textContent = 'Show';
  }
});

saveBtn.addEventListener('click', () => {
  chrome.storage.sync.set({ pat: patInput.value.trim() }, () => {
    statusEl.textContent = '✓ Saved';
    setTimeout(() => { statusEl.textContent = ''; }, 2000);
  });
});

saveDomainsBtn.addEventListener('click', () => {
  const domains = domainsInput.value
    .split('\n')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  chrome.storage.sync.set({ graphqlAllowedDomains: domains }, () => {
    domainsStatus.textContent = '✓ Saved';
    setTimeout(() => { domainsStatus.textContent = ''; }, 2000);
  });
});
