/* ===========================================================
   HEADER COMPONENT — injects site header into #site-header-root
   =========================================================== */
(function () {
  const headerHTML = `
    <header class="site-header">
      <div class="container">
        <a href="/" class="brand" aria-label="Word Cloud Art home">
          <span class="brand-mark">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <text x="3" y="10" font-family="Georgia, serif" font-size="9" fill="#FF6B5E" font-weight="700">W</text>
              <text x="11" y="18" font-family="Georgia, serif" font-size="7" fill="#4ECDC4" font-weight="700">c</text>
              <text x="2" y="19" font-family="Georgia, serif" font-size="6" fill="#F7F3E9" font-weight="600">art</text>
            </svg>
          </span>
          <span>Word Cloud Art</span>
        </a>

        <nav class="nav-links" aria-label="Primary">
          <a href="/#app">Generator</a>
          <a href="/#features">Features</a>
          <a href="/#how-it-works">How It Works</a>
          <a href="/#use-cases">Use Cases</a>
          <a href="/#faq">FAQ</a>
        </nav>

        <div class="header-actions">
          <a href="/#app" class="btn btn-primary btn-sm">Create Cloud</a>
          <button class="nav-toggle" id="nav-toggle" aria-label="Toggle menu" aria-expanded="false" aria-controls="mobile-nav">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      <nav class="mobile-nav" id="mobile-nav" aria-label="Mobile">
        <a href="/#app">Generator</a>
        <a href="/#features">Features</a>
        <a href="/#how-it-works">How It Works</a>
        <a href="/#use-cases">Use Cases</a>
        <a href="/#faq">FAQ</a>
      </nav>
    </header>
  `;

  const root = document.getElementById("site-header-root");
  if (root) {
    root.innerHTML = headerHTML;

    const toggle = document.getElementById("nav-toggle");
    const mobileNav = document.getElementById("mobile-nav");

    if (toggle && mobileNav) {
      toggle.addEventListener("click", () => {
        const isOpen = mobileNav.classList.toggle("open");
        toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      });

      mobileNav.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => {
          mobileNav.classList.remove("open");
          toggle.setAttribute("aria-expanded", "false");
        });
      });
    }
  }
})();
