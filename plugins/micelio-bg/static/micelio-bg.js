// micelio-bg.js
(function() {
  // =========================================================
  // Micelio Background — configurable animated mycelium-like background
  // Default options are overridden by `window.MICELIO_BG_CONFIG` (injected by the plugin).
  // =========================================================
  const DEFAULT_CONFIG = {
    // Visual appearance
    scalePixels: 5, // pixelation level (lower = higher resolution)
    opacity: 0.1, // canvas opacity (0.1 to 1.0)
    threadThickness: 3, // thickness of the dithered aura
    nodeSize: 2, // size of the bright node when splitting

    // Growth behavior
    initialRoots: 12, // how many branches spawn on page load
    maxBranches: 25, // maximum concurrent live branches
    branchProbability: 0.02, // probability to split into 2
    curvature: 0.3, // organic zigzag amount (0.1 straight -> 1.0 very chaotic)
    speed: 0.6, // tip advance speed

    // Lifespan
    baseLife: 300, // base steps a branch lives
    extraRandomLife: 200, // random extra life

    // Special modes
    infiniteRebirth: false, // true = when all die, spawn new; false = stop
    stepsPerFrame: 1, // raise for faster initial growth
  };

  const CONFIG = (typeof window !== 'undefined' && window.MICELIO_BG_CONFIG)
    ? { ...DEFAULT_CONFIG, ...window.MICELIO_BG_CONFIG }
    : DEFAULT_CONFIG

  // Inject dynamic CSS using the configured opacity
  const style = document.createElement('style');
  style.innerHTML = `
    #micelio-bg {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: -1;
      pointer-events: none;
      image-rendering: pixelated;
      opacity: ${CONFIG.opacity};
    }
  `;
  document.head.appendChild(style);

  // Globals
  let animationId;
  let canvas, ctx;
  let width, height;
  let hyphae = [];
  let palette = {};
  const SCALE = CONFIG.scalePixels;

  const bayerMatrix = [
    [ 0, 48, 12, 60,  3, 51, 15, 63],
    [32, 16, 44, 28, 35, 19, 47, 31],
    [ 8, 56,  4, 52, 11, 59,  7, 55],
    [40, 24, 36, 20, 43, 27, 39, 23],
    [ 2, 50, 14, 62,  1, 49, 13, 61],
    [34, 18, 46, 30, 33, 17, 45, 29],
    [10, 58,  6, 54,  9, 57,  5, 53],
    [42, 26, 38, 22, 41, 25, 37, 21]
  ];

  function getDither(brightness, x, y) {
    const px = Math.floor(Math.abs(x) % 8);
    const py = Math.floor(Math.abs(y) % 8);
    return (bayerMatrix[py][px] / 64) < brightness;
  }

  function updateColors() {
    const root = getComputedStyle(document.documentElement);
    palette = {
      aura: root.getPropertyValue('--lightgray').trim(),
      body: root.getPropertyValue('--tertiary').trim(),
      core: root.getPropertyValue('--secondary').trim()
    };
  }

  function drawNodeLink(cx, cy) {
    const nodeRadius = CONFIG.nodeSize;
    for (let dx = -nodeRadius; dx <= nodeRadius; dx++) {
      for (let dy = -nodeRadius; dy <= nodeRadius; dy++) {
        const px = Math.round(cx + dx);
        const py = Math.round(cy + dy);
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 1.5) {
          ctx.fillStyle = palette.core;
          ctx.fillRect(px, py, 1, 1);
        } else if (dist < 3 && getDither(0.7, px, py)) {
          ctx.fillStyle = palette.body;
          ctx.fillRect(px, py, 1, 1);
        } else if (getDither(0.3, px, py)) {
          ctx.fillStyle = palette.aura;
          ctx.fillRect(px, py, 1, 1);
        }
      }
    }
  }

  function init() {
    if (animationId) cancelAnimationFrame(animationId);

    canvas = document.getElementById('micelio-bg');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'micelio-bg';
      document.body.prepend(canvas);
    }

    ctx = canvas.getContext('2d');
    width = Math.floor(window.innerWidth / SCALE);
    height = Math.floor(window.innerHeight / SCALE);
    canvas.width = width;
    canvas.height = height;

    updateColors();
    ctx.clearRect(0, 0, width, height);

    hyphae = [];
    for (let i = 0; i < CONFIG.initialRoots; i++) {
      // Spawn from left (0) or right (width)
      let startX = Math.random() < 0.5 ? 0 : width;
      let startY = Math.random() * height;

      hyphae.push({
        x: startX,
        y: startY,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        life: CONFIG.baseLife + Math.random() * CONFIG.extraRandomLife,
      });
      drawNodeLink(startX, startY);
    }
    loop();
  }

  function loop() {
    for (let step = 0; step < CONFIG.stepsPerFrame; step++) {
      let newHyphae = [];

      for (let i = hyphae.length - 1; i >= 0; i--) {
        let h = hyphae[i];

        h.vx += (Math.random() - 0.5) * CONFIG.curvature;
        h.vy += (Math.random() - 0.5) * CONFIG.curvature;

        let mag = Math.sqrt(h.vx * h.vx + h.vy * h.vy) || 1;
        h.vx = (h.vx / mag) * CONFIG.speed;
        h.vy = (h.vy / mag) * CONFIG.speed;

        h.x += h.vx;
        h.y += h.vy;
        h.life -= 1;

        const auraRadius = CONFIG.threadThickness;
        const cx = Math.round(h.x);
        const cy = Math.round(h.y);

        for (let mx = -auraRadius; mx <= auraRadius; mx++) {
          for (let my = -auraRadius; my <= auraRadius; my++) {
            const px = cx + mx;
            const py = cy + my;
            if (px < 0 || px >= width || py < 0 || py >= height) continue;

            const distPixel = Math.sqrt(mx * mx + my * my);
            const baseBright = 1 - distPixel / auraRadius;

            if (distPixel < 0.5) {
              ctx.fillStyle = palette.body;
              ctx.fillRect(px, py, 1, 1);
            } else if (getDither(baseBright * 0.6, px + 2, py + 2)) {
              ctx.fillStyle = palette.aura;
              ctx.fillRect(px, py, 1, 1);
            }
          }
        }

        if (Math.random() < CONFIG.branchProbability && hyphae.length + newHyphae.length < CONFIG.maxBranches) {
          newHyphae.push({
            x: h.x,
            y: h.y,
            vx: h.vx + (Math.random() - 0.5),
            vy: h.vy + (Math.random() - 0.5),
            life: h.life * 0.7,
          });
          drawNodeLink(h.x, h.y);
        }

        if (h.x < -10 || h.x > width + 10 || h.y < -10 || h.y > height + 10 || h.life <= 0) {
          hyphae.splice(i, 1);
        }
      }

      hyphae = hyphae.concat(newHyphae);
    }

    if (hyphae.length === 0 && CONFIG.infiniteRebirth) {
      let nX = Math.random() < 0.5 ? 0 : width;
      let nY = Math.random() * height;
      hyphae.push({
        x: nX,
        y: nY,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        life: CONFIG.baseLife + 100,
      });
      drawNodeLink(nX, nY);
    }

    if (hyphae.length > 0 || CONFIG.infiniteRebirth) {
      animationId = requestAnimationFrame(loop);
    }
  }

  // Initialize and events
  document.addEventListener('DOMContentLoaded', init);

  document.addEventListener('nav', () => {
    if (!document.getElementById('micelio-bg') && canvas) {
      document.body.prepend(canvas);
    }
    if (hyphae.length === 0) init();
  });

  new MutationObserver(updateColors).observe(document.documentElement, { attributes: true, attributeFilter: ['saved-theme', 'theme'] });
  window.addEventListener('resize', init);

})();
