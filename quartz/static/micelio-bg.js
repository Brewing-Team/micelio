// micelio-bg.js
(function() {
  // =========================================================
  // 🎛️ PANEL DE CONTROL: MODIFICA ESTOS VALORES A TU GUSTO
  // =========================================================
  const CONFIG = {
    // Apariencia general
    escalaPixels: 5,          // Nivel de pixelado (menor = más HD, mayor = más retro)
    opacidad: 0.4,            // Transparencia del fondo (0.1 a 1.0)
    grosorHilo: 3,            // Grosor del aura dithered (las líneas)
    tamanoNodo: 2,            // Tamaño del punto brillante al dividirse
    
    // Comportamiento de crecimiento
    raicesIniciales: 12,       // Cuántas ramas nacen al cargar la página
    maxRamasSimultaneas: 25,  // Límite de ramas vivas para no saturar la pantalla
    probabilidadRama: 0.02,   // Probabilidad de dividirse en 2 (0.01 a 0.05 es ideal)
    curvatura: 0.3,           // Cuánto zigzaguea orgánicamente (0.1 recto -> 1.0 muy caótico)
    velocidad: 0.6,           // Velocidad de avance de las puntas
    
    // Duración y ciclo de vida
    vidaBase: 300,            // Pasos base que vive una rama antes de detenerse
    vidaExtraAleatoria: 200,  // Pasos extra aleatorios que puede vivir una rama
    
    // Modos especiales
    renacerInfinito: false,    // true = al morir todas, nace una nueva. false = se para para siempre.
    pasosPorFrame: 1          // Ponlo en 4 o 5 si quieres un crecimiento súbito (cámara rápida) al inicio.
  };
  // =========================================================


  // 1. Inyectar el CSS dinámicamente usando la config
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
      opacity: ${CONFIG.opacidad};
    }
  `;
  document.head.appendChild(style);

  // 2. Variables globales
  let animationId;
  let canvas, ctx;
  let width, height;
  let hifas = [];
  let paleta = {};
  const SCALE = CONFIG.escalaPixels;

  const matrizBayer = [
    [ 0, 48, 12, 60,  3, 51, 15, 63],
    [32, 16, 44, 28, 35, 19, 47, 31],
    [ 8, 56,  4, 52, 11, 59,  7, 55],
    [40, 24, 36, 20, 43, 27, 39, 23],
    [ 2, 50, 14, 62,  1, 49, 13, 61],
    [34, 18, 46, 30, 33, 17, 45, 29],
    [10, 58,  6, 54,  9, 57,  5, 53],
    [42, 26, 38, 22, 41, 25, 37, 21]
  ];

  function getDither(brillo, x, y) {
    const px = Math.floor(Math.abs(x) % 8);
    const py = Math.floor(Math.abs(y) % 8);
    return (matrizBayer[py][px] / 64) < brillo;
  }

  function updateColors() {
    const root = getComputedStyle(document.documentElement);
    paleta = {
      aura: root.getPropertyValue('--lightgray').trim(),
      cuerpo: root.getPropertyValue('--tertiary').trim(),
      nucleo: root.getPropertyValue('--secondary').trim()
    };
  }

  function dibujarNodoEnlace(cx, cy) {
    const radioNodo = CONFIG.tamanoNodo;
    for (let dx = -radioNodo; dx <= radioNodo; dx++) {
      for (let dy = -radioNodo; dy <= radioNodo; dy++) {
        const px = Math.round(cx + dx);
        const py = Math.round(cy + dy);
        const distancia = Math.sqrt(dx * dx + dy * dy);
        
        if (distancia < 1.5) {
          ctx.fillStyle = paleta.nucleo;
          ctx.fillRect(px, py, 1, 1);
        } else if (distancia < 3 && getDither(0.7, px, py)) {
          ctx.fillStyle = paleta.cuerpo;
          ctx.fillRect(px, py, 1, 1);
        } else if (getDither(0.3, px, py)) {
          ctx.fillStyle = paleta.aura;
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
    
    hifas = [];
    for(let i = 0; i < CONFIG.raicesIniciales; i++) {
       // Nacen solo en el borde izquierdo (0) o derecho (width)
       let startX = Math.random() < 0.5 ? 0 : width;
       let startY = Math.random() * height;
       
       hifas.push({
         x: startX,
         y: startY,
         vx: (Math.random() - 0.5) * 1.5,
         vy: (Math.random() - 0.5) * 1.5,
         vida: CONFIG.vidaBase + Math.random() * CONFIG.vidaExtraAleatoria
       });
       dibujarNodoEnlace(startX, startY);
    }
    loop();
  }

  function loop() {
    // Permite "cámara rápida" si se cambia pasosPorFrame en la config
    for (let step = 0; step < CONFIG.pasosPorFrame; step++) {
      let nuevasHifas = [];

      for (let i = hifas.length - 1; i >= 0; i--) {
        let h = hifas[i];

        h.vx += (Math.random() - 0.5) * CONFIG.curvatura;
        h.vy += (Math.random() - 0.5) * CONFIG.curvatura;
        
        let mag = Math.sqrt(h.vx * h.vx + h.vy * h.vy);
        h.vx = (h.vx / mag) * CONFIG.velocidad;
        h.vy = (h.vy / mag) * CONFIG.velocidad;

        h.x += h.vx;
        h.y += h.vy;
        h.vida -= 1;

        const radioAura = CONFIG.grosorHilo;
        const cx = Math.round(h.x);
        const cy = Math.round(h.y);

        for (let mx = -radioAura; mx <= radioAura; mx++) {
          for (let my = -radioAura; my <= radioAura; my++) {
            const px = cx + mx;
            const py = cy + my;
            if (px < 0 || px >= width || py < 0 || py >= height) continue;

            const distPixel = Math.sqrt(mx * mx + my * my);
            const brilloBase = 1 - (distPixel / radioAura);
            
            if (distPixel < 0.5) {
              ctx.fillStyle = paleta.cuerpo;
              ctx.fillRect(px, py, 1, 1);
            } else if (getDither(brilloBase * 0.6, px + 2, py + 2)) {
              ctx.fillStyle = paleta.aura;
              ctx.fillRect(px, py, 1, 1);
            }
          }
        }

        if (Math.random() < CONFIG.probabilidadRama && hifas.length + nuevasHifas.length < CONFIG.maxRamasSimultaneas) {
          nuevasHifas.push({ 
            x: h.x, 
            y: h.y, 
            vx: h.vx + (Math.random() - 0.5), 
            vy: h.vy + (Math.random() - 0.5), 
            vida: h.vida * 0.7 
          });
          dibujarNodoEnlace(h.x, h.y);
        }

        if (h.x < -10 || h.x > width + 10 || h.y < -10 || h.y > height + 10 || h.vida <= 0) {
          hifas.splice(i, 1);
        }
      }

      hifas = hifas.concat(nuevasHifas);
    }

    if (hifas.length === 0 && CONFIG.renacerInfinito) {
        let nX = Math.random() < 0.5 ? 0 : width;
        let nY = Math.random() * height;
        hifas.push({ 
          x: nX, 
          y: nY, 
          vx: (Math.random() - 0.5) * 2, 
          vy: (Math.random() - 0.5) * 2, 
          vida: CONFIG.vidaBase + 100 
        });
        dibujarNodoEnlace(nX, nY);
    }

    // Detener la animación por completo si no hay ramas y renacerInfinito es false
    if (hifas.length > 0 || CONFIG.renacerInfinito) {
      animationId = requestAnimationFrame(loop);
    }
  }

  // 4. Inicializar y eventos
  document.addEventListener('DOMContentLoaded', init);
  
  document.addEventListener('nav', () => {
    if (!document.getElementById('micelio-bg') && canvas) {
      document.body.prepend(canvas);
    }
    // Si tienes el renacerInfinito desactivado, asegúrate de reactivarlo al cambiar de página
    if (hifas.length === 0) init();
  });

  new MutationObserver(updateColors).observe(document.documentElement, { attributes: true, attributeFilter: ['saved-theme', 'theme'] });
  window.addEventListener('resize', init);

})();