const toggleEnabled = document.getElementById('toggleEnabled');
const patInput = document.getElementById('patInput');
const saveBtn = document.getElementById('saveBtn');
const statusEl = document.getElementById('status');
const showPat = document.getElementById('showPat');

// Load saved settings
chrome.storage.sync.get(['enabled', 'pat'], ({ enabled = true, pat = '' }) => {
  toggleEnabled.checked = enabled;
  patInput.value = pat;
});

toggleEnabled.addEventListener('change', () => {
  chrome.storage.sync.set({ enabled: toggleEnabled.checked });
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
