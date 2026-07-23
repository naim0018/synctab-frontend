console.log("SyncTab Extension: Background service worker active");

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'GET_OPEN_TABS') {
    chrome.tabs.query({}, (tabs) => {
      const formatted = tabs
        .filter(t => {
          if (!t || !t.url || !t.title) return false;
          const u = t.url.toLowerCase();
          return !u.startsWith('chrome://') && 
                 !u.startsWith('chrome-extension://') && 
                 !u.startsWith('about:') && 
                 !u.startsWith('edge://');
        })
        .map((t, idx) => ({
          id: t.id?.toString() || `tab_${idx}_${Date.now()}`,
          title: t.title || '',
          url: t.url || ''
        }));
      sendResponse({ tabs: formatted });
    });
    return true; // Keep sendResponse channel open for async query
  }
});

// Listen for tab events and notify all active dashboard pages
const notifyTabsChanged = () => {
  chrome.tabs.query({ url: ["*://localhost/*", "*://127.0.0.1/*"] }, (tabs) => {
    tabs.forEach(tab => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { action: 'TABS_UPDATED' }).catch(() => {});
      }
    });
  });
};

chrome.tabs.onCreated.addListener(notifyTabsChanged);
chrome.tabs.onUpdated.addListener(notifyTabsChanged);
chrome.tabs.onRemoved.addListener(notifyTabsChanged);
chrome.tabs.onMoved.addListener(notifyTabsChanged);
chrome.tabs.onActivated.addListener(notifyTabsChanged);
