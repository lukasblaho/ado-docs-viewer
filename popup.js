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
    .map(normalizeDomainEntry)
    .filter(Boolean);
  chrome.storage.sync.set({ graphqlAllowedDomains: domains }, () => {
    domainsInput.value = domains.join('\n'); // reflect normalized form back to the user
    domainsStatus.textContent = '✓ Saved';
    setTimeout(() => { domainsStatus.textContent = ''; }, 2000);
  });
});

// Accepts either a bare hostname ("example.com") or a full URL
// ("https://example.com/some/path") and returns just the hostname, so users
// pasting a full URL (a very likely mistake) don't end up with a stored
// entry that never matches any page's location.hostname.
function normalizeDomainEntry(raw) {
  let value = raw.trim().toLowerCase();
  if (!value) return '';
  if (!/^[a-z]+:\/\//.test(value)) {
    value = `https://${value}`; // give URL() a scheme to parse against
  }
  try {
    return new URL(value).hostname;
  } catch {
    return raw.trim().toLowerCase(); // fall back to the raw input if unparsable
  }
}
