let activePopups = new Set();
let recentlyPopped = new Set(); // Acts as our Debounce timer

// Catch TRUE Server Errors (HTTP 500-599)
chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    if (details.tabId === -1 || details.type !== "main_frame") return;
    
    if (details.statusCode >= 500 && details.statusCode < 600) {
      triggerPopup(details.url, details.statusCode.toString());
    }
  },
  { urls: ["<all_urls>"] }
);

// Catch Network Crashes (DNS failures, connection refused)
chrome.webRequest.onErrorOccurred.addListener(
  (details) => {
    if (details.tabId === -1 || details.type !== "main_frame") return;

    // The Ultimate Noise Filter
    const ignoredErrors = [
      "net::ERR_ABORTED", 
      "net::ERR_BLOCKED_BY_CLIENT", 
      "net::ERR_QUIC_PROTOCOL_ERROR", // This fixes the Google Search bug
      "net::ERR_CONNECTION_RESET",
      "net::ERR_CONNECTION_CLOSED",
      "net::ERR_CACHE_MISS"
    ];

    if (ignoredErrors.includes(details.error)) return;

    triggerPopup(details.url, "Network Error");
  },
  { urls: ["<all_urls>"] }
);

// Centralized logic to prevent double-popping
function triggerPopup(url, code) {
  // If we already have a popup open, OR we popped this within the last 5 seconds, ignore it.
  if (activePopups.has(url) || recentlyPopped.has(url)) return;

  activePopups.add(url);
  recentlyPopped.add(url);

  // Debounce: Allow it to pop again after 5 seconds if it's still crashing
  setTimeout(() => recentlyPopped.delete(url), 5000);

  chrome.windows.create({
    url: chrome.runtime.getURL(`monitor.html?target=${encodeURIComponent(url)}&code=${code}`),
    type: "popup", 
    width: 450, 
    height: 550,
    focused: true
  }, (win) => {
    chrome.windows.onRemoved.addListener(function handler(id) {
      if (id === win.id) {
        activePopups.delete(url); // Free the lock when user closes the window
        chrome.windows.onRemoved.removeListener(handler);
      }
    });
  });
}