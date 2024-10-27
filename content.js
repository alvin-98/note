let noteWidget = null;
let isDarkMode = false;

// Respond to ping to check if content script is loaded
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "ping") {
    sendResponse({ status: "ok" });
    return;
  }

  if (request.action === "toggleNote") {
    if (!noteWidget) {
      noteWidget = createNoteWidget();
      document.body.appendChild(noteWidget);
    } else {
      noteWidget.remove();
      noteWidget = null;
    }
  }
});

// Load saved preferences
chrome.storage.local.get(["darkMode"], (result) => {
  isDarkMode = result.darkMode || false;
});

function createNoteWidget() {
  const widget = document.createElement("div");
  widget.className = "note-widget light-mode"; // Default to light mode
  widget.innerHTML = `
    <div class="note-header">
      <span class="drag-handle">↔</span>
      <button class="theme-toggle">🌓</button>
      <button class="close">×</button>
    </div>
    <textarea class="note-content" placeholder="Take your notes here..."></textarea>
    <div class="note-footer">
      <button class="save-note">Save Note</button>
    </div>
  `;

  makeWidgetDraggable(widget);
  setupEventListeners(widget);
  if (isDarkMode) {
    updateTheme(widget);
  }

  return widget;
}

function makeWidgetDraggable(widget) {
  const dragHandle = widget.querySelector(".drag-handle");
  let isDragging = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;
  let xOffset = 0;
  let yOffset = 0;

  dragHandle.addEventListener("mousedown", dragStart);
  document.addEventListener("mousemove", drag);
  document.addEventListener("mouseup", dragEnd);

  function dragStart(e) {
    initialX = e.clientX - xOffset;
    initialY = e.clientY - yOffset;

    if (e.target === dragHandle) {
      isDragging = true;
    }
  }

  function drag(e) {
    if (isDragging) {
      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;
      xOffset = currentX;
      yOffset = currentY;

      setTranslate(currentX, currentY, widget);
    }
  }

  function setTranslate(xPos, yPos, el) {
    el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
  }

  function dragEnd(e) {
    initialX = currentX;
    initialY = currentY;
    isDragging = false;
  }
}

function saveNote(content) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `note_${timestamp}.md`;

  // Create blob URL in content script
  const blob = new Blob([content], { type: "text/markdown" });
  const blobUrl = URL.createObjectURL(blob);

  // Send message to background script with the blob URL
  chrome.runtime
    .sendMessage({
      action: "saveNote",
      blobUrl: blobUrl,
      filename: filename,
    })
    .then(() => {
      // Clean up blob URL after successful download
      URL.revokeObjectURL(blobUrl);
    })
    .catch((error) => {
      console.error("Error saving note:", error);
      alert("Failed to save note. Please try again.");
      URL.revokeObjectURL(blobUrl);
    });
}

function setupEventListeners(widget) {
  const themeToggle = widget.querySelector(".theme-toggle");
  const closeBtn = widget.querySelector(".close");
  const saveNoteBtn = widget.querySelector(".save-note");
  const textarea = widget.querySelector(".note-content");

  themeToggle.addEventListener("click", () => {
    isDarkMode = !isDarkMode;
    updateTheme(widget);
    chrome.storage.local.set({ darkMode: isDarkMode });
  });

  closeBtn.addEventListener("click", () => {
    widget.remove();
    noteWidget = null;
  });

  saveNoteBtn.addEventListener("click", () => {
    const content = textarea.value.trim();
    if (content) {
      saveNote(content);
    } else {
      alert("Please enter some text before saving");
    }
  });

  // Auto-save functionality
  let autoSaveTimeout;
  textarea.addEventListener("input", () => {
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(() => {
      chrome.storage.local.set({
        draftNote: textarea.value,
      });
    }, 1000); // Auto-save after 1 second of no typing
  });

  // Load draft note if exists
  chrome.storage.local.get(["draftNote"], (result) => {
    if (result.draftNote) {
      textarea.value = result.draftNote;
    }
  });

  // Handle keyboard shortcuts
  textarea.addEventListener("keydown", (e) => {
    // Ctrl/Cmd + S to save
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      const content = textarea.value.trim();
      if (content) {
        saveNote(content);
      }
    }
  });
}

function updateTheme(widget) {
  if (isDarkMode) {
    widget.classList.add("dark-mode");
    widget.classList.remove("light-mode");
  } else {
    widget.classList.add("light-mode");
    widget.classList.remove("dark-mode");
  }
}

// Initialize by loading preferences
window.addEventListener("load", () => {
  chrome.storage.local.get(["darkMode"], (result) => {
    isDarkMode = result.darkMode || false;
  });
});
