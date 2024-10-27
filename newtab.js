// newtab.js
let isDarkMode = false;

document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;
  const notepad = document.getElementById("notepad");
  const themeToggle = document.getElementById("themeToggle");
  const saveButton = document.getElementById("saveNote");

  // Load saved theme and notes
  chrome.storage.local.get(["darkMode", "newtabNotes"], (result) => {
    isDarkMode = result.darkMode || false;
    updateTheme();

    if (result.newtabNotes) {
      notepad.value = result.newtabNotes;
    }
  });

  // Theme toggle
  themeToggle.addEventListener("click", () => {
    isDarkMode = !isDarkMode;
    updateTheme();
    chrome.storage.local.set({ darkMode: isDarkMode });
  });

  // Auto-save notes as user types
  let autoSaveTimeout;
  notepad.addEventListener("input", () => {
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(() => {
      chrome.storage.local.set({ newtabNotes: notepad.value });
    }, 1000);
  });

  // Save note to file
  saveButton.addEventListener("click", () => {
    const content = notepad.value.trim();
    if (content) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `note_${timestamp}.md`;

      const blob = new Blob([content], { type: "text/markdown" });
      const blobUrl = URL.createObjectURL(blob);

      chrome.runtime
        .sendMessage({
          action: "saveNote",
          blobUrl: blobUrl,
          filename: filename,
        })
        .then(() => {
          URL.revokeObjectURL(blobUrl);
        })
        .catch((error) => {
          console.error("Error saving note:", error);
          alert("Failed to save note. Please try again.");
          URL.revokeObjectURL(blobUrl);
        });
    } else {
      alert("Please enter some text before saving");
    }
  });

  function updateTheme() {
    if (isDarkMode) {
      body.classList.remove("light-mode");
      body.classList.add("dark-mode");
    } else {
      body.classList.remove("dark-mode");
      body.classList.add("light-mode");
    }
  }
});
