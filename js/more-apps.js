/* ===========================================================
   MORE APPS COMPONENT
   Fetches featured-apps.txt, parses "N. Title — Description."
   entries, and renders cards with title / description / link.
   =========================================================== */
(function () {
  const DATA_URL = "featured-apps.txt";

  // Manual slug overrides for apps whose natural slug wouldn't match
  // a real hosted domain pattern. Falls back to auto-slug otherwise.
  const LINK_OVERRIDES = {
    "Password / Secure Note Vault": "https://securenotevault.github.io",
    "Text Transformer": "https://texttransformer.github.io",
    "Random Text Generator": "https://randomtextgenerator.github.io",
    "Habit Tracker": "https://habittrackerapp.github.io",
    "Plain Text Notepad with Tabs": "https://notepadwithtabs.github.io",
  };

  function slugify(title) {
    return (
      title
        .toLowerCase()
        .replace(/[\/&]/g, " ")
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "") + ".github.io"
    );
  }

  function parseApps(raw) {
    // Normalize line endings, split on blank lines / numbered markers
    const text = raw.replace(/\r\n/g, "\n").trim();
    const entries = text.split(/\n+/).filter(Boolean);

    return entries.map((line) => {
      // Strip leading "N. " marker
      const stripped = line.replace(/^\s*\d+\.\s*/, "");
      // Split on em-dash (—) or double hyphen separating title from description
      const parts = stripped.split(/\s*—\s*/);
      const title = (parts[0] || "").trim();
      const description = (parts.slice(1).join(" — ") || "").trim();
      const link = LINK_OVERRIDES[title] || `https://${slugify(title)}`;
      return { title, description, link };
    });
  }

  function initials(title) {
    const words = title.split(/[\s/]+/).filter(Boolean);
    return (words[0]?.[0] || "?").toUpperCase();
  }

  function renderCards(apps) {
    const grid = document.getElementById("more-apps-grid");
    if (grid) {
      grid.innerHTML = apps
        .map(
          (app) => `
        <a class="app-card reveal" href="${app.link}" target="_blank" rel="noopener noreferrer">
          <span class="app-card-icon">${initials(app.title)}</span>
          <h3>${app.title}</h3>
          <p>${app.description}</p>
          <span class="app-card-link">
            Open app
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="7" y1="17" x2="17" y2="7"></line>
              <polyline points="7 7 17 7 17 17"></polyline>
            </svg>
          </span>
        </a>
      `
        )
        .join("");

      // Re-trigger reveal observer for newly injected cards
      if (window.observeReveals) window.observeReveals();
    }

    const footerList = document.getElementById("footer-more-apps-list");
    if (footerList) {
      footerList.innerHTML = apps
        .slice(0, 5)
        .map(
          (app) =>
            `<li><a href="${app.link}" target="_blank" rel="noopener noreferrer">${app.title}</a></li>`
        )
        .join("");
    }
  }

  function renderFallback() {
    const grid = document.getElementById("more-apps-grid");
    if (grid) {
      grid.innerHTML = `<p style="color: var(--muted-on-paper); font-family: var(--font-mono); font-size: 0.85rem;">More apps will appear here shortly.</p>`;
    }
  }

  fetch(DATA_URL)
    .then((res) => {
      if (!res.ok) throw new Error("Failed to load featured-apps.txt");
      return res.text();
    })
    .then((raw) => {
      const apps = parseApps(raw);
      if (apps.length) renderCards(apps);
      else renderFallback();
    })
    .catch(() => {
      renderFallback();
    });
})();
