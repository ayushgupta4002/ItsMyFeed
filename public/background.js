// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  // Initialize storage with default settings
  chrome.storage.sync.set({
    keywords: [],
    enabled: true
  });
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_SETTINGS') {
    chrome.storage.sync.get(['keywords', 'enabled'], (result) => {
      sendResponse(result);
    });
    return true; // Required for async sendResponse
  }
}); 