/* ===========================================================
   WORD CLOUD ENGINE
   Canvas-based word cloud generator with Archimedean-spiral
   placement, collision detection (via offscreen pixel masks),
   shape masking, weighting, palettes, and PNG/SVG export.
   =========================================================== */

(function () {
  "use strict";

  /* ---------- Stopword list for auto-frequency mode ---------- */
  const STOPWORDS = new Set([
    "the","a","an","and","or","but","if","of","to","in","on","at","for","with",
    "is","are","was","were","be","been","being","it","its","this","that","these",
    "those","as","by","from","up","down","out","about","into","over","after",
    "i","you","he","she","we","they","them","his","her","our","your","their",
    "not","no","so","than","then","too","very","just","can","will","would",
    "should","could","do","does","did","have","has","had","there","here",
    "what","which","who","whom","when","where","why","how","all","each",
    "more","most","other","some","such","only","own","same","also","s","t",
    "us","am","my","me","myself","because","while","again","further","once"
  ]);

  /* ---------- Palettes ---------- */
  const PALETTES = {
    sunset: ["#FF6B5E", "#E5483C", "#FFD23F", "#FF9F5E", "#C73E3A"],
    lagoon: ["#4ECDC4", "#2FA39A", "#1B6E73", "#7FE0D6", "#3D8C8C"],
    ink: ["#1B1B2F", "#34345A", "#5C5A72", "#272741", "#0F0F1A"],
    meadow: ["#4ECDC4", "#FFD23F", "#7CB342", "#2FA39A", "#A8D154"],
    candy: ["#FF6B5E", "#4ECDC4", "#FFD23F", "#B57EDC", "#FF9ECF"],
    monochrome: ["#1B1B2F", "#3A3A5C", "#5C5A72", "#8482A0", "#B9B8D4"],
  };

  /* ---------- Shapes: return true if (x,y) normalized [-1,1] is inside ---------- */
  const SHAPES = {
    rectangle: () => true,
    circle: (x, y) => x * x + y * y <= 1,
    heart: (x, y) => {
      // classic heart implicit curve, scaled
      const xx = x * 1.2;
      const yy = -y * 1.2 + 0.3;
      const a = xx * xx + yy * yy - 0.4;
      return a * a * a - xx * xx * yy * yy * yy <= 0.02;
    },
    star: (x, y) => {
      const angle = Math.atan2(y, x);
      const radius = Math.sqrt(x * x + y * y);
      const points = 5;
      const innerRatio = 0.5;
      const a = ((angle + Math.PI / 2) / (2 * Math.PI)) * points;
      const frac = a - Math.floor(a);
      const r =
        innerRatio +
        (1 - innerRatio) *
          (1 - Math.abs(frac - 0.5) * 2);
      return radius <= r * 0.95;
    },
    cloud: (x, y) => {
      // union of a few circles approximating a cloud puff shape
      const circles = [
        [0, 0.05, 0.62],
        [-0.45, 0.15, 0.42],
        [0.45, 0.15, 0.42],
        [-0.2, -0.25, 0.4],
        [0.2, -0.25, 0.4],
      ];
      return circles.some(([cx, cy, r]) => {
        const dx = x - cx, dy = y - cy;
        return dx * dx + dy * dy <= r * r;
      });
    },
    diamond: (x, y) => Math.abs(x) + Math.abs(y) <= 1,
    triangle: (x, y) => {
      // pointing up, normalized [-1,1]
      const yy = y; // -1 bottom, 1 top in our coord (we flip below)
      const top = 1;
      const baseY = -0.8;
      if (yy < baseY || yy > top) return false;
      const t = (top - yy) / (top - baseY); // 0 at top, 1 at base
      const halfWidth = t * 0.95;
      return Math.abs(x) <= halfWidth;
    },
  };

  /* ---------- Font stacks for variety ---------- */
  const FONT_OPTIONS = {
    fraunces: '"Fraunces", serif',
    inter: '"Inter", sans-serif',
    mono: '"JetBrains Mono", monospace',
    impact: '"Arial Black", Impact, sans-serif',
    georgia: 'Georgia, serif',
  };

  /* =========================================================
     WordCloud class
     ========================================================= */
  class WordCloud {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.words = []; // [{text, weight}]
      this.placed = []; // resulting placed word boxes for export/interaction
      this.options = {
        shape: "circle",
        palette: "sunset",
        font: "fraunces",
        maxFontSize: 90,
        minFontSize: 12,
        spacing: 2,
        rotateChance: 0.3,
        background: "#F7F3E9",
        canvasSize: 800,
      };
    }

    setWords(words) {
      this.words = words;
    }

    setOption(key, value) {
      this.options[key] = value;
    }

    /* ---- Build a mask function for current shape ---- */
    getMaskFn() {
      return SHAPES[this.options.shape] || SHAPES.rectangle;
    }

    /* ---- Main layout + render routine ---- */
    generate() {
      const { canvasSize, maxFontSize, minFontSize, spacing, palette, font, rotateChance, background } =
        this.options;

      const W = canvasSize;
      const H = canvasSize;
      this.canvas.width = W;
      this.canvas.height = H;

      const ctx = this.ctx;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, W, H);

      if (!this.words.length) return [];

      // Sort descending by weight
      const sorted = [...this.words].sort((a, b) => b.weight - a.weight);
      const maxW = sorted[0].weight;
      const minW = sorted[sorted.length - 1].weight;
      const range = Math.max(maxW - minW, 1);

      const colors = PALETTES[palette] || PALETTES.sunset;
      const fontFamily = FONT_OPTIONS[font] || FONT_OPTIONS.fraunces;
      const maskFn = this.getMaskFn();

      // Offscreen occupancy grid for collision detection
      const gridCell = 4;
      const gridW = Math.ceil(W / gridCell);
      const gridH = Math.ceil(H / gridCell);
      const occupied = new Uint8Array(gridW * gridH);

      const cx = W / 2;
      const cy = H / 2;
      const maxRadius = Math.min(W, H) / 2 - 6;

      const placedWords = [];

      sorted.forEach((wordObj, idx) => {
        const t = (wordObj.weight - minW) / range; // 0..1
        const fontSize = Math.round(minFontSize + t * (maxFontSize - minFontSize));
        const rotate = Math.random() < rotateChance ? (Math.random() < 0.5 ? -90 : 90) : 0;
        const color = colors[idx % colors.length];

        ctx.font = `${idx === 0 ? 700 : 600} ${fontSize}px ${fontFamily}`;
        const metrics = ctx.measureText(wordObj.text);
        let boxW = metrics.width + spacing * 2;
        let boxH = fontSize * 1.15 + spacing * 2;
        if (rotate !== 0) {
          const tmp = boxW;
          boxW = boxH;
          boxH = tmp;
        }

        const placement = this._spiralPlace(
          occupied, gridW, gridH, gridCell,
          cx, cy, maxRadius, boxW, boxH, maskFn, W, H
        );

        if (placement) {
          const { x, y } = placement;
          ctx.save();
          ctx.translate(x + boxW / 2, y + boxH / 2);
          if (rotate !== 0) ctx.rotate((rotate * Math.PI) / 180);
          ctx.font = `${idx === 0 ? 700 : 600} ${fontSize}px ${fontFamily}`;
          ctx.fillStyle = color;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(wordObj.text, 0, 0);
          ctx.restore();

          this._markOccupied(occupied, gridW, gridH, gridCell, x, y, boxW, boxH);

          placedWords.push({
            text: wordObj.text,
            weight: wordObj.weight,
            fontSize,
            color,
            x, y, w: boxW, h: boxH,
            rotate,
          });
        }
      });

      this.placed = placedWords;
      return placedWords;
    }

    /* ---- Archimedean spiral placement with grid collision check ----
       Radius grows steadily with each step regardless of angle, so the
       spiral sweeps outward at a consistent, controllable rate instead
       of winding tightly near the center. */
    _spiralPlace(occupied, gridW, gridH, gridCell, cx, cy, maxRadius, boxW, boxH, maskFn, W, H) {
      const angleStep = 0.22;
      const radiusStep = 2.4;
      let angle = Math.random() * Math.PI * 2;
      let radius = 0;
      const searchLimit = maxRadius * 1.6;

      while (radius <= searchLimit) {
        const x = cx + radius * Math.cos(angle) - boxW / 2;
        const y = cy + radius * Math.sin(angle) * 0.78 - boxH / 2; // slight vertical compression for natural cloud feel

        // Normalized coords for mask check, sampling box corners + center
        const points = [
          [x, y], [x + boxW, y], [x, y + boxH], [x + boxW, y + boxH],
          [x + boxW / 2, y + boxH / 2],
        ];
        const insideShape = points.every(([px, py]) => {
          const nx = (px - cx) / (Math.min(W, H) / 2);
          const ny = -(py - cy) / (Math.min(W, H) / 2);
          return maskFn(nx, ny);
        });

        if (
          insideShape &&
          x >= 0 && y >= 0 && x + boxW <= W && y + boxH <= H &&
          !this._checkCollision(occupied, gridW, gridH, gridCell, x, y, boxW, boxH)
        ) {
          return { x, y };
        }

        angle += angleStep;
        radius += radiusStep * (angleStep / (Math.PI * 2));
      }
      return null;
    }

    _checkCollision(occupied, gridW, gridH, gridCell, x, y, w, h) {
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

    _markOccupied(occupied, gridW, gridH, gridCell, x, y, w, h) {
      const x0 = Math.max(0, Math.floor(x / gridCell));
      const y0 = Math.max(0, Math.floor(y / gridCell));
      const x1 = Math.min(gridW - 1, Math.floor((x + w) / gridCell));
      const y1 = Math.min(gridH - 1, Math.floor((y + h) / gridCell));

      for (let gy = y0; gy <= y1; gy++) {
        for (let gx = x0; gx <= x1; gx++) {
          occupied[gy * gridW + gx] = 1;
        }
      }
    }

    /* ---- Export as PNG data URL ---- */
    exportPNG() {
      return this.canvas.toDataURL("image/png");
    }

    /* ---- Export as SVG string ---- */
    exportSVG() {
      const { canvasSize, background } = this.options;
      const fontFamily = FONT_OPTIONS[this.options.font] || FONT_OPTIONS.fraunces;
      let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasSize}" height="${canvasSize}" viewBox="0 0 ${canvasSize} ${canvasSize}">`;
      svg += `<rect width="100%" height="100%" fill="${background}"/>`;
      this.placed.forEach((w) => {
        const tx = w.x + w.w / 2;
        const ty = w.y + w.h / 2;
        const rotate = w.rotate || 0;
        svg += `<text x="0" y="0" font-family='${fontFamily}' font-size="${w.fontSize}" font-weight="600" fill="${w.color}" text-anchor="middle" dominant-baseline="middle" transform="translate(${tx},${ty}) rotate(${rotate})">${this._escapeXML(w.text)}</text>`;
      });
      svg += `</svg>`;
      return svg;
    }

    _escapeXML(str) {
      return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    }
  }

  /* =========================================================
     Text-to-word-frequency parser (for "auto" mode)
     ========================================================= */
  function extractWordFrequencies(text, options = {}) {
    const { ignoreStopwords = true, minLength = 2, caseSensitive = false } = options;
    const cleaned = caseSensitive ? text : text.toLowerCase();
    const tokens = cleaned.match(/[a-zA-Z][a-zA-Z'-]*[a-zA-Z]|[a-zA-Z]/g) || [];

    const freq = new Map();
    tokens.forEach((tok) => {
      const word = tok.replace(/^['-]+|['-]+$/g, "");
      if (word.length < minLength) return;
      if (ignoreStopwords && STOPWORDS.has(word.toLowerCase())) return;
      freq.set(word, (freq.get(word) || 0) + 1);
    });

    return Array.from(freq.entries())
      .map(([text, weight]) => ({ text, weight }))
      .sort((a, b) => b.weight - a.weight);
  }

  // Expose to global scope for app.js
  window.WordCloudEngine = {
    WordCloud,
    extractWordFrequencies,
    PALETTES,
    SHAPES,
    FONT_OPTIONS,
  };
})();
