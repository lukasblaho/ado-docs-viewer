// Service worker: opens new tabs on request from content scripts
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'openTab') {
    chrome.tabs.create({ url: message.url });
  }
});
