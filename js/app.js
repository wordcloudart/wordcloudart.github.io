/* ===========================================================
   APP CONTROLLER
   Wires the control panel UI to the WordCloudEngine, manages
   state (word list, weights, palette, shape, font, etc.),
   handles export and persistence.
   =========================================================== */
(function () {
  "use strict";

  const STORAGE_KEY = "wordcloudart_session_v1";

  const els = {};
  let cloud = null;
  let wordList = []; // [{text, weight}]
  let mode = "auto"; // 'auto' (frequency from text) | 'manual' (weighted word list)
  let isDirty = false;

  /* ---------- Init ---------- */
  function init() {
    cacheEls();
    if (!els.canvas) return; // app not on this page

    cloud = new window.WordCloudEngine.WordCloud(els.canvas);
    bindEvents();
    restoreSession();
    if (!els.input.value) {
      els.input.value = DEFAULT_TEXT;
    }
    renderShapeGrid();
    renderSwatches();
    syncControlsFromOptions();
    regenerate();
  }

  const DEFAULT_TEXT = `word cloud word cloud generator maker free online tool word cloud design text visualization design creative typography art shape shape custom color color palette export png svg weight weight frequency keyword highlight cloud presentation classroom brainstorm poster idea simple fast browser privacy free design generator cloud art shape free maker text custom color export weight`;

  function cacheEls() {
    els.canvas = document.getElementById("wordcloud-canvas");
    els.input = document.getElementById("word-input");
    els.modeAuto = document.getElementById("mode-auto");
    els.modeManual = document.getElementById("mode-manual");
    els.manualPanel = document.getElementById("manual-weight-panel");
    els.weightList = document.getElementById("weight-list");
    els.addWordBtn = document.getElementById("add-word-btn");
    els.shapeGrid = document.getElementById("shape-grid");
    els.swatchRow = document.getElementById("swatch-row");
    els.fontSelect = document.getElementById("font-select");
    els.maxFontSlider = document.getElementById("max-font-slider");
    els.maxFontValue = document.getElementById("max-font-value");
    els.minFontSlider = document.getElementById("min-font-slider");
    els.minFontValue = document.getElementById("min-font-value");
    els.spacingSlider = document.getElementById("spacing-slider");
    els.spacingValue = document.getElementById("spacing-value");
    els.rotateToggle = document.getElementById("rotate-toggle");
    els.stopwordsToggle = document.getElementById("stopwords-toggle");
    els.caseToggle = document.getElementById("case-toggle");
    els.bgInput = document.getElementById("bg-color-input");
    els.generateBtn = document.getElementById("generate-btn");
    els.downloadPngBtn = document.getElementById("download-png-btn");
    els.downloadSvgBtn = document.getElementById("download-svg-btn");
    els.clearBtn = document.getElementById("clear-btn");
    els.shuffleColorsBtn = document.getElementById("shuffle-colors-btn");
    els.statWordCount = document.getElementById("stat-word-count");
    els.statUniqueCount = document.getElementById("stat-unique-count");
    els.emptyState = document.getElementById("stage-empty-state");
    els.loadingState = document.getElementById("stage-loading-state");
    els.zoomIn = document.getElementById("zoom-in-btn");
    els.zoomOut = document.getElementById("zoom-out-btn");
    els.zoomReset = document.getElementById("zoom-reset-btn");
    els.canvasWrap = document.getElementById("cloud-canvas-wrap");
    els.toast = document.getElementById("toast");
  }

  /* ---------- Event bindings ---------- */
  function bindEvents() {
    els.modeAuto.addEventListener("change", () => setMode("auto"));
    els.modeManual.addEventListener("change", () => setMode("manual"));

    els.input.addEventListener("input", () => {
      isDirty = true;
      if (mode === "manual") syncManualFromText();
    });

    els.addWordBtn.addEventListener("click", () => {
      wordList.push({ text: "new word", weight: 5 });
      renderWeightList();
    });

    els.fontSelect.addEventListener("change", () => {
      cloud.setOption("font", els.fontSelect.value);
      regenerate();
    });

    els.maxFontSlider.addEventListener("input", () => {
      els.maxFontValue.textContent = els.maxFontSlider.value + "px";
      cloud.setOption("maxFontSize", Number(els.maxFontSlider.value));
    });
    els.maxFontSlider.addEventListener("change", regenerate);

    els.minFontSlider.addEventListener("input", () => {
      els.minFontValue.textContent = els.minFontSlider.value + "px";
      cloud.setOption("minFontSize", Number(els.minFontSlider.value));
    });
    els.minFontSlider.addEventListener("change", regenerate);

    els.spacingSlider.addEventListener("input", () => {
      els.spacingValue.textContent = els.spacingSlider.value + "px";
      cloud.setOption("spacing", Number(els.spacingSlider.value));
    });
    els.spacingSlider.addEventListener("change", regenerate);

    els.rotateToggle.addEventListener("change", () => {
      cloud.setOption("rotateChance", els.rotateToggle.checked ? 0.3 : 0);
      regenerate();
    });

    els.stopwordsToggle.addEventListener("change", () => {
      if (mode === "auto") regenerate();
    });
    els.caseToggle.addEventListener("change", () => {
      if (mode === "auto") regenerate();
    });

    els.bgInput.addEventListener("input", () => {
      cloud.setOption("background", els.bgInput.value);
      regenerate();
    });

    els.generateBtn.addEventListener("click", () => {
      regenerate(true);
    });

    els.downloadPngBtn.addEventListener("click", downloadPNG);
    els.downloadSvgBtn.addEventListener("click", downloadSVG);

    els.clearBtn.addEventListener("click", () => {
      els.input.value = "";
      wordList = [];
      renderWeightList();
      isDirty = true;
      regenerate();
    });

    els.shuffleColorsBtn.addEventListener("click", () => {
      const palettes = Object.keys(window.WordCloudEngine.PALETTES);
      const current = cloud.options.palette;
      let next = current;
      while (next === current) {
        next = palettes[Math.floor(Math.random() * palettes.length)];
      }
      cloud.setOption("palette", next);
      renderSwatches();
      regenerate();
    });

    els.zoomIn.addEventListener("click", () => zoom(1.15));
    els.zoomOut.addEventListener("click", () => zoom(0.87));
    els.zoomReset.addEventListener("click", () => {
      els.canvas.style.transform = "scale(1)";
    });

    window.addEventListener("beforeunload", saveSession);
  }

  let currentZoom = 1;
  function zoom(factor) {
    currentZoom = Math.min(2.2, Math.max(0.5, currentZoom * factor));
    els.canvas.style.transform = `scale(${currentZoom})`;
  }

  /* ---------- Mode switching ---------- */
  function setMode(newMode) {
    mode = newMode;
    els.manualPanel.style.display = mode === "manual" ? "block" : "none";
    els.input.parentElement.style.display = mode === "auto" ? "block" : "none";
    if (mode === "manual" && wordList.length === 0) {
      syncManualFromText();
    }
    regenerate();
  }

  function syncManualFromText() {
    const freqs = window.WordCloudEngine.extractWordFrequencies(els.input.value, {
      ignoreStopwords: els.stopwordsToggle.checked,
      caseSensitive: els.caseToggle.checked,
    });
    wordList = freqs.slice(0, 40);
    renderWeightList();
  }

  /* ---------- Render shape picker ---------- */
  const SHAPE_ICONS = {
    rectangle: `<rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.6" fill="none"/>`,
    circle: `<circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.6" fill="none"/>`,
    heart: `<path d="M12 19s-7-4.6-7-10A4 4 0 0112 6a4 4 0 017 3c0 5.4-7 10-7 10z" stroke="currentColor" stroke-width="1.6" fill="none"/>`,
    star: `<path d="M12 3l2.6 6.2 6.4.5-4.9 4.2 1.6 6.3L12 16.9 6.3 20.2l1.6-6.3-4.9-4.2 6.4-.5z" stroke="currentColor" stroke-width="1.4" fill="none"/>`,
    cloud: `<path d="M7 17a4 4 0 01-1-7.9A4.5 4.5 0 0114.5 7a3.5 3.5 0 014.4 4.4A3.5 3.5 0 0118 17H7z" stroke="currentColor" stroke-width="1.6" fill="none"/>`,
    diamond: `<path d="M12 3l9 9-9 9-9-9z" stroke="currentColor" stroke-width="1.6" fill="none"/>`,
    triangle: `<path d="M12 4l8 16H4z" stroke="currentColor" stroke-width="1.6" fill="none"/>`,
  };

  function renderShapeGrid() {
    const shapes = Object.keys(window.WordCloudEngine.SHAPES);
    els.shapeGrid.innerHTML = shapes
      .map(
        (shape) => `
        <button class="shape-btn ${shape === cloud.options.shape ? "active" : ""}" data-shape="${shape}" aria-label="${shape} shape" title="${capitalize(shape)}">
          <svg viewBox="0 0 24 24" fill="none">${SHAPE_ICONS[shape]}</svg>
        </button>`
      )
      .join("");

    els.shapeGrid.querySelectorAll(".shape-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        els.shapeGrid.querySelectorAll(".shape-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        cloud.setOption("shape", btn.dataset.shape);
        regenerate();
      });
    });
  }

  function renderSwatches() {
    const palettes = window.WordCloudEngine.PALETTES;
    els.swatchRow.innerHTML = Object.keys(palettes)
      .map((name) => {
        const colors = palettes[name];
        const gradient = `conic-gradient(${colors.join(",")})`;
        return `<button class="swatch ${name === cloud.options.palette ? "active" : ""}" data-palette="${name}" style="background:${gradient}" aria-label="${name} palette" title="${capitalize(name)}"></button>`;
      })
      .join("");

    els.swatchRow.querySelectorAll(".swatch").forEach((btn) => {
      btn.addEventListener("click", () => {
        els.swatchRow.querySelectorAll(".swatch").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        cloud.setOption("palette", btn.dataset.palette);
        regenerate();
      });
    });
  }

  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  /* ---------- Manual weight list rendering ---------- */
  function renderWeightList() {
    els.weightList.innerHTML = wordList
      .map(
        (w, i) => `
        <div class="weight-row" data-index="${i}">
          <input type="text" class="word-text-input" value="${escapeAttr(w.text)}" aria-label="Word text">
          <input type="number" class="word-weight-input" value="${w.weight}" min="1" max="100" aria-label="Word weight">
          <button class="remove-word" aria-label="Remove word" title="Remove">&times;</button>
        </div>`
      )
      .join("");

    els.weightList.querySelectorAll(".weight-row").forEach((row) => {
      const idx = Number(row.dataset.index);
      row.querySelector(".word-text-input").addEventListener("input", (e) => {
        wordList[idx].text = e.target.value;
      });
      row.querySelector(".word-weight-input").addEventListener("input", (e) => {
        wordList[idx].weight = Number(e.target.value) || 1;
      });
      row.querySelector(".remove-word").addEventListener("click", () => {
        wordList.splice(idx, 1);
        renderWeightList();
        regenerate();
      });
    });
  }

  function escapeAttr(str) {
    return String(str).replace(/"/g, "&quot;");
  }

  /* ---------- Sync sliders/selects from current cloud options ---------- */
  function syncControlsFromOptions() {
    const o = cloud.options;
    els.fontSelect.value = o.font;
    els.maxFontSlider.value = o.maxFontSize;
    els.maxFontValue.textContent = o.maxFontSize + "px";
    els.minFontSlider.value = o.minFontSize;
    els.minFontValue.textContent = o.minFontSize + "px";
    els.spacingSlider.value = o.spacing;
    els.spacingValue.textContent = o.spacing + "px";
    els.bgInput.value = o.background;
    els.rotateToggle.checked = o.rotateChance > 0;
  }

  /* ---------- Core regenerate ---------- */
  function regenerate(showToast) {
    if (!cloud) return;

    let words;
    if (mode === "auto") {
      words = window.WordCloudEngine.extractWordFrequencies(els.input.value, {
        ignoreStopwords: els.stopwordsToggle.checked,
        caseSensitive: els.caseToggle.checked,
      }).slice(0, 60);
    } else {
      words = wordList.filter((w) => w.text.trim().length > 0);
    }

    if (!words.length) {
      els.emptyState.style.display = "flex";
      els.canvas.style.display = "none";
      updateStats(0, 0);
      return;
    }

    els.loadingState.classList.add("active");

    requestAnimationFrame(() => {
      cloud.setWords(words);
      const placed = cloud.generate();

      els.emptyState.style.display = "none";
      els.canvas.style.display = "block";
      els.loadingState.classList.remove("active");

      const totalCount = words.reduce((sum, w) => sum + w.weight, 0);
      updateStats(totalCount, words.length, placed.length);

      saveSession();

      if (showToast) showToastMsg("Word cloud generated");
    });
  }

  function updateStats(total, unique, placedCount) {
    if (els.statWordCount) els.statWordCount.textContent = unique;
    if (els.statUniqueCount) {
      els.statUniqueCount.textContent =
        placedCount !== undefined ? `${placedCount}/${unique} placed` : unique;
    }
  }

  /* ---------- Export ---------- */
  function downloadPNG() {
    if (!cloud || !cloud.placed.length) {
      showToastMsg("Generate a cloud first");
      return;
    }
    const url = cloud.exportPNG();
    const a = document.createElement("a");
    a.href = url;
    a.download = "word-cloud.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToastMsg("PNG downloaded");
  }

  function downloadSVG() {
    if (!cloud || !cloud.placed.length) {
      showToastMsg("Generate a cloud first");
      return;
    }
    const svg = cloud.exportSVG();
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "word-cloud.svg";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToastMsg("SVG downloaded");
  }

  /* ---------- Toast ---------- */
  let toastTimer;
  function showToastMsg(msg) {
    if (!els.toast) return;
    els.toast.textContent = msg;
    els.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove("show"), 2200);
  }

  /* ---------- Session persistence (localStorage) ---------- */
  function saveSession() {
    try {
      const data = {
        text: els.input.value,
        mode,
        wordList,
        options: cloud.options,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      /* storage unavailable, ignore */
    }
  }

  function restoreSession() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.text) els.input.value = data.text;
      if (data.wordList) wordList = data.wordList;
      if (data.options) Object.assign(cloud.options, data.options);
      if (data.mode) {
        mode = data.mode;
        els.modeManual.checked = mode === "manual";
        els.modeAuto.checked = mode === "auto";
        els.manualPanel.style.display = mode === "manual" ? "block" : "none";
      }
    } catch (e) {
      /* corrupted data, ignore */
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
