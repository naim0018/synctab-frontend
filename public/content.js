console.log("SyncTab Extension Bridge: Content script loaded");

// Listen for messages from the webpage
window.addEventListener('message', (event) => {
  // Only accept messages from ourselves
  if (event.source !== window) return;

  if (event.data && event.data.type === 'SYNCTAB_QUERY_TABS') {
    // Forward request to background script
    chrome.runtime.sendMessage({ action: 'GET_OPEN_TABS' }, (response) => {
      if (response && response.tabs) {
        // Send response back to webpage
        window.postMessage({ type: 'SYNCTAB_TABS_RESPONSE', tabs: response.tabs }, '*');
      }
    });
  }

  if (event.data && event.data.type === 'SYNCTAB_QUERY_BOOKMARKS') {
    chrome.runtime.sendMessage({ action: 'GET_BROWSER_BOOKMARKS' }, (response) => {
      if (response && response.tree) {
        window.postMessage({ type: 'SYNCTAB_BOOKMARKS_RESPONSE', tree: response.tree }, '*');
      }
    });
  }
});

// Listen for tab updates from background and notify webpage
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'TABS_UPDATED') {
    window.postMessage({ type: 'SYNCTAB_TABS_UPDATED' }, '*');
  }
});
