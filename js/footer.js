/* ===========================================================
   FOOTER COMPONENT — injects site footer into #site-footer-root
   =========================================================== */
(function () {
  const year = new Date().getFullYear();

  const footerHTML = `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-col footer-brand">
            <a href="/" class="brand">
              <span class="brand-mark">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <text x="3" y="10" font-family="Georgia, serif" font-size="9" fill="#FF6B5E" font-weight="700">W</text>
                  <text x="11" y="18" font-family="Georgia, serif" font-size="7" fill="#4ECDC4" font-weight="700">c</text>
                  <text x="2" y="19" font-family="Georgia, serif" font-size="6" fill="#F7F3E9" font-weight="600">art</text>
                </svg>
              </span>
              <span>Word Cloud Art</span>
            </a>
            <p>A free, browser-based word cloud generator. Paste your text, shape it, and export it — nothing ever leaves your device.</p>
          </div>

          <div class="footer-col">
            <h5>Tool</h5>
            <ul>
              <li><a href="#app">Word Cloud Generator</a></li>
              <li><a href="#features">Features</a></li>
              <li><a href="#how-it-works">How It Works</a></li>
              <li><a href="#use-cases">Use Cases</a></li>
            </ul>
          </div>

          <div class="footer-col">
            <h5>Learn</h5>
            <ul>
              <li><a href="#guide">Guide &amp; Tips</a></li>
              <li><a href="#faq">FAQ</a></li>
              <li><a href="#glossary">Glossary</a></li>
              <li><a href="#why">Why Word Clouds</a></li>
            </ul>
          </div>

          <div class="footer-col">
            <h5>More Apps</h5>
            <ul id="footer-more-apps-list">
              <!-- populated by more-apps.js if present, otherwise static fallback -->
              <li><a href="#more-apps">Browse all free tools</a></li>
            </ul>
          </div>
        </div>

        <div class="footer-bottom">
          <span>© ${year} Word Cloud Art. All rights reserved.</span>
          <div class="footer-bottom-links">
            <a href="#app">Generator</a>
            <a href="#faq">FAQ</a>
          </div>
        </div>
      </div>
    </footer>
  `;

  const root = document.getElementById("site-footer-root");
  if (root) {
    root.innerHTML = footerHTML;
  }
})();
