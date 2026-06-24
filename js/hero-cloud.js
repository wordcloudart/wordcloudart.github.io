/* ===========================================================
   HERO WORD CLOUD ANIMATION
   The page's signature moment: the words describing the
   product itself assemble into a cloud formation on load,
   drawn from a small SVG word-cloud built with real layout math.
   =========================================================== */
(function () {
  "use strict";

  const HERO_WORDS = [
    { text: "paste", weight: 9 },
    { text: "shape", weight: 7 },
    { text: "weight", weight: 6 },
    { text: "export", weight: 8 },
    { text: "color", weight: 6 },
    { text: "cloud", weight: 10 },
    { text: "font", weight: 5 },
    { text: "free", weight: 7 },
    { text: "PNG", weight: 5 },
    { text: "create", weight: 6 },
    { text: "design", weight: 5 },
    { text: "text", weight: 6 },
  ];

  function init() {
    const svg = document.getElementById("hero-cloud-svg");
    if (!svg) return;

    const W = 560;
    const H = 360;
    const cx = W / 2;
    const cy = H / 2;

    const colors = ["#FF6B5E", "#4ECDC4", "#FFD23F", "#F7F3E9", "#FF9F5E"];
    const placed = [];
    const gridCell = 6;
    const gridW = Math.ceil(W / gridCell);
    const gridH = Math.ceil(H / gridCell);
    const occupied = new Uint8Array(gridW * gridH);

    function markOccupied(x, y, w, h) {
      const x0 = Math.max(0, Math.floor(x / gridCell));
      const y0 = Math.max(0, Math.floor(y / gridCell));
      const x1 = Math.min(gridW - 1, Math.floor((x + w) / gridCell));
      const y1 = Math.min(gridH - 1, Math.floor((y + h) / gridCell));
      for (let gy = y0; gy <= y1; gy++) {
        for (let gx = x0; gx <= x1; gx++) occupied[gy * gridW + gx] = 1;
      }
    }
    function checkCollision(x, y, w, h) {
      const x0 = Math.max(0, Math.floor(x / gridCell));
      const y0 = Math.max(0, Math.floor(y / gridCell));
      const x1 = Math.min(gridW - 1, Math.floor((x + w) / gridCell));
      const y1 = Math.min(gridH - 1, Math.floor((y + h) / gridCell));
      for (let gy = y0; gy <= y1; gy++) {
        for (let gx = x0; gx <= x1; gx++) {
          if (occupied[gy * gridW + gx]) return true;
        }
      }
      return false;
    }

    // Measure text width using a temp canvas (approx, good enough for layout)
    const measureCanvas = document.createElement("canvas");
    const mctx = measureCanvas.getContext("2d");

    const sorted = [...HERO_WORDS].sort((a, b) => b.weight - a.weight);
    const maxW = sorted[0].weight;
    const minW = sorted[sorted.length - 1].weight;

    sorted.forEach((word, idx) => {
      const t = (word.weight - minW) / Math.max(maxW - minW, 1);
      const fontSize = Math.round(20 + t * 46);
      mctx.font = `700 ${fontSize}px Fraunces, serif`;
      const textW = mctx.measureText(word.text).width;
      const boxW = textW + 10;
      const boxH = fontSize * 1.1;

      let angle = Math.random() * Math.PI * 2;
      let radius = 0;
      let found = null;

      for (let i = 0; i < 1200; i++) {
        const x = cx + radius * Math.cos(angle) - boxW / 2;
        const y = cy + radius * Math.sin(angle) * 0.75 - boxH / 2;
        if (
          x >= 0 && y >= 0 && x + boxW <= W && y + boxH <= H &&
          !checkCollision(x, y, boxW, boxH)
        ) {
          found = { x: x + boxW / 2, y: y + boxH / 2 };
          markOccupied(x, y, boxW, boxH);
          break;
        }
        radius += 1.3;
        angle += 0.27;
      }

      if (found) {
        placed.push({
          text: word.text,
          x: found.x,
          y: found.y,
          fontSize,
          color: colors[idx % colors.length],
          delay: idx * 70,
        });
      }
    });

    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.innerHTML = placed
      .map(
        (w) => `
        <text x="${w.x}" y="${w.y}"
          font-family="Fraunces, serif" font-weight="700"
          font-size="${w.fontSize}" fill="${w.color}"
          text-anchor="middle" dominant-baseline="middle"
          class="hero-word-anim" style="animation-delay:${w.delay}ms">
          ${w.text}
        </text>`
      )
      .join("");
  }

  document.addEventListener("DOMContentLoaded", init);
})();
