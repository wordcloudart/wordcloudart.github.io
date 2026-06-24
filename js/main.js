/* ===========================================================
   MAIN — scroll reveal observer + FAQ accordion
   =========================================================== */
(function () {
  "use strict";

  let observer;

  function setupObserver() {
    if (observer) observer.disconnect();
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
  }

  // Exposed so more-apps.js can re-trigger after injecting cards
  window.observeReveals = setupObserver;

  function setupFAQ() {
    document.querySelectorAll(".faq-item").forEach((item) => {
      const btn = item.querySelector(".faq-question");
      if (!btn) return;
      btn.addEventListener("click", () => {
        const wasOpen = item.classList.contains("open");
        item.closest(".faq-list").querySelectorAll(".faq-item").forEach((i) => i.classList.remove("open"));
        if (!wasOpen) item.classList.add("open");
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    setupObserver();
    setupFAQ();
  });
})();
