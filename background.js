async function injectContentScript(tabId) {
  try {
    // Inject CSS
    await chrome.scripting.insertCSS({
      target: { tabId: tabId },
      files: ["styles.css"],
    });

    // Inject JS
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["content.js"],
    });

    // Send message after injection
    chrome.tabs.sendMessage(tabId, { action: "toggleNote" });
  } catch (err) {
    console.error("Script injection failed:", err);
  }
}

chrome.action.onClicked.addListener(async (tab) => {
  try {
    // Check if we can inject scripts into this tab
    const url = new URL(tab.url);
    if (
      url.protocol === "chrome:" ||
      url.protocol === "edge:" ||
      url.protocol === "about:"
    ) {
      console.log("Cannot inject scripts into this page");
      return;
    }

    // Try sending a message first to check if content script is already injected
    try {
      await chrome.tabs.sendMessage(tab.id, { action: "ping" });
      // If successful, content script exists, just toggle the note
      chrome.tabs.sendMessage(tab.id, { action: "toggleNote" });
    } catch (err) {
      // If failed, content script doesn't exist, inject it
      await injectContentScript(tab.id);
    }
  } catch (err) {
    console.error("Error:", err);
  }
});

chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "saveNote") {
    return new Promise((resolve, reject) => {
      chrome.downloads
        .download({
          url: request.blobUrl,
          filename: request.filename,
          saveAs: true,
        })
        .then(() => {
          resolve();
        })
        .catch((error) => {
          reject(error);
        });
    });
  }
});
