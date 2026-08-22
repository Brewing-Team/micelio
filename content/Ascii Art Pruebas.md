---
title: Ascii Art Pruebas
date: 2026-08-22
modified: 2026-08-22
description: Probando movidas
enableToc: false
tags:
---
Hola que tal!

<div id="kepos-container" style="text-align: center; margin: 2rem 0;">
  <!-- El estilo usa una fuente monoespaciada para que el ASCII no se deforme -->
  <pre id="kepos-ascii" style="font-family: 'Courier New', Courier, monospace; font-size: 16px; font-weight: bold; color: #4ade80; background: transparent; border: none; overflow: hidden; line-height: 1.2;">
  </pre>
</div>

<script>
// Array con los "fotogramas" de la animación
const keposFrames = [
`



  
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░`,
`



      |           |
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░`,
`


     \\|/         \\|/
      |           |
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░`,
`

     _|_         _|_
     \\|/   _|_   \\|/
      |    \\|/    |
░░░░░░░░░░░░|░░░░░░░░░░░░░░░░`,
`
      ✿           ✿
     _|_    ✿    _|_
     \\|/   _|_   \\|/
      |    \\|/    |
░░░░░░░░░░░░|░░░░░░░░░░░░░░░░
       Bienvenido al Kêpos`
];

let frame = 0;

function growGarden() {
  const display = document.getElementById('kepos-ascii');
  if (!display) return; // Seguridad en caso de que el elemento no cargue
  
  // Actualizar el texto con el frame actual
  display.textContent = keposFrames[frame];
  frame++;
  
  // Si no hemos llegado al final, programamos el siguiente frame
  if (frame < keposFrames.length) {
    setTimeout(growGarden, 600); // 600 milisegundos entre cada fase
  }
}

// Iniciar la animación
// setTimeout le da un pequeño respiro de medio segundo al abrir la página antes de crecer
setTimeout(growGarden, 500);
</script>




<div style="text-align: center; margin: 2rem 0; cursor: pointer;" title="Haz clic para generar una nueva red">
  <canvas id="micelio-dither-pixel" width="128" height="128" style="width: 300px; height: 300px; background-color: #09090b; border-radius: 8px; image-rendering: pixelated; box-shadow: 0 4px 12px rgba(168, 85, 247, 0.2); border: 4px solid #27272a;" onclick="initMicelioDither()"></canvas>
  <div style="color: #c084fc; font-family: 'Courier New', Courier, monospace; font-size: 1.2rem; margin-top: 1rem; font-weight: bold; letter-spacing: 3px;">RED MICELIAL</div>
</div>

<script>
let micelioDitherTimer;
let puntasActivas = [];

// Paleta retro de alto contraste
const micelioPalette = [
  '#09090b', // 0: Fondo profundo (Negro)
  '#18181b', // 1: Tierra oscura
  '#27272a', // 2: Tierra clara
  '#581c87', // 3: Halo exterior (Morado oscuro)
  '#9333ea', // 4: Halo interior (Morado vibrante)
  '#d8b4fe', // 5: Cuerpo del micelio (Lila claro)
  '#faf5ff'  // 6: Núcleo puro (Blanco rosado)
];

// Matriz de Bayer 8x8 para el tramado clásico
function obtenerTramado(valor, x, y) {
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
  const px = Math.floor(Math.abs(x) % 8);
  const py = Math.floor(Math.abs(y) % 8);
  return matrizBayer[py][px] < (valor * 64);
}

function initMicelioDither() {
  const canvas = document.getElementById('micelio-dither-pixel');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (micelioDitherTimer) clearTimeout(micelioDitherTimer);
  
  // Generar el sustrato de fondo con tramado
  for (let y = 0; y < 128; y++) {
    for (let x = 0; x < 128; x++) {
      // Viñeteado: más oscuro en los bordes, más claro en el centro
      const distancia = Math.hypot(x - 64, y - 64) / 64;
      const ruido = Math.random() * 0.3;
      const intensidad = (1 - distancia) * 0.7 + ruido;
      
      if (obtenerTramado(intensidad, x, y)) {
         ctx.fillStyle = micelioPalette[2];
      } else if (obtenerTramado(intensidad * 2, x, y)) {
         ctx.fillStyle = micelioPalette[1];
      } else {
         ctx.fillStyle = micelioPalette[0];
      }
      ctx.fillRect(x, y, 1, 1);
    }
  }

  // Iniciar la red con varias puntas desde el centro
  puntasActivas = [];
  for (let i = 0; i < 4; i++) {
    puntasActivas.push({
      x: 64,
      y: 64,
      angulo: (Math.PI * 2 / 4) * i + Math.random(),
      vida: 80 + Math.random() * 40
    });
  }

  crecerMicelioDither(ctx);
}

function crecerMicelioDither(ctx) {
  let nuevasPuntas = [];

  for (let i = puntasActivas.length - 1; i >= 0; i--) {
    let punta = puntasActivas[i];
    
    // Avanzar
    punta.x += Math.cos(punta.angulo) * 0.8; // Movimiento sub-píxel suave
    punta.y += Math.sin(punta.angulo) * 0.8;
    
    // Variación orgánica del ángulo
    punta.angulo += (Math.random() - 0.5) * 0.6;
    punta.vida--;

    // Estampar el pincel pixel art con tramado
    dibujarPincelMicelio(ctx, punta.x, punta.y);

    // Ramificación
    if (Math.random() < 0.04 && punta.vida > 10) {
      nuevasPuntas.push({
        x: punta.x,
        y: punta.y,
        angulo: punta.angulo + (Math.random() > 0.5 ? 0.8 : -0.8), // Bifurcar en ángulo
        vida: punta.vida * 0.8 // Las ramas hijas viven menos
      });
    }

    // Muerte por salir de los límites o fin de vida
    if (punta.vida <= 0 || punta.x < 5 || punta.x > 123 || punta.y < 5 || punta.y > 123) {
      puntasActivas.splice(i, 1);
    }
  }

  puntasActivas = puntasActivas.concat(nuevasPuntas);

  if (puntasActivas.length > 0) {
    micelioDitherTimer = setTimeout(() => crecerMicelioDither(ctx), 40);
  }
}

function dibujarPincelMicelio(ctx, cx, cy) {
  // Dibujar un "sello" alrededor de la punta.
  // Gracias a usar coordenadas absolutas (px, py) en obtenerTramado,
  // las pasadas superpuestas no rompen el patrón de ajedrez retro.
  for (let dx = -4; dx <= 4; dx++) {
    for (let dy = -4; dy <= 4; dy++) {
      const px = Math.round(cx + dx);
      const py = Math.round(cy + dy);
      const distancia = Math.hypot(dx, dy);
      
      // Núcleo blanco/rosado sólido
      if (distancia < 0.8) {
        ctx.fillStyle = micelioPalette[6];
        ctx.fillRect(px, py, 1, 1);
      } 
      // Cuerpo del micelio sólido
      else if (distancia < 1.5) {
        ctx.fillStyle = micelioPalette[5];
        ctx.fillRect(px, py, 1, 1);
      } 
      // Halo dithered interno (vibrante)
      else if (distancia < 2.5) {
        if (obtenerTramado(0.5, px, py)) {
          ctx.fillStyle = micelioPalette[4];
          ctx.fillRect(px, py, 1, 1);
        }
      } 
      // Esporas/Halo dithered externo (oscuro)
      else if (distancia < 4) {
        // La intensidad se desvanece con la distancia
        const intensidad = 1 - (distancia / 4);
        if (obtenerTramado(intensidad * 0.7, px, py)) {
          ctx.fillStyle = micelioPalette[3];
          ctx.fillRect(px, py, 1, 1);
        }
      }
    }
  }
}

// Iniciar al cargar la página
setTimeout(initMicelioDither, 500);
</script>




<div style="text-align: center; margin: 2rem 0; cursor: pointer;" title="Click to replant">
  <!-- Small canvas, pixelated scaling -->
  <canvas id="enoki-dither-pixel" width="128" height="128" style="width: 300px; height: 300px; background-color: #111; border-radius: 8px; image-rendering: pixelated; box-shadow: 0 4px 6px rgba(0,0,0,0.3); border: 4px solid #444;" onclick="initEnokiDither()"></canvas>
  <div style="color: #fef3c7; font-family: monospace; font-size: 1.2rem; margin-top: 1rem; font-weight: bold; letter-spacing: 2px;">DITHERED ENOKI</div>
</div>

<style>
  #enoki-dither-pixel {
    cursor: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAPklEQVQYV2NkQAL/GEgA5B8D+f8ZGJ4wMDxhYAj4z8Ag8A+IYWF4wMC4iYGB4REDAwMWAZBFv0H0PwhgxAAH+B8E+e8fGAAAAABJRU5ErkJggg=='), auto;
  }
</style>

<script>
let enokiDitherTimer;
let enokiCluster;
const palette = [
  '#000000', // 0 Black
  '#111111', // 1 Dark Gray
  '#444444', // 2 Med Gray
  '#fef3c7', // 3 Enoki Cream
  '#e2d2a4', // 4 Enoki Stem Shading
  '#fff8e1', // 5 Enoki Cap Light
  '#d1a361', // 6 Substrate Light
  '#8c6e3b', // 7 Substrate Shadow
  '#3d567c', // 8 Background Blue
  '#1d2d46', // 9 Deep Bkg Blue
  '#b1d8e1', // 10 Frosty Blue (Highlights)
  '#ffeb3b', // 11 Gold (Subtle Highlight)
];

function getDitherPattern(value, x, y) {
  // Ordered dithering pattern for classic pixel shading
  const dither8x8 = [
    [ 0, 48, 12, 60,  3, 51, 15, 63],
    [32, 16, 44, 28, 35, 19, 47, 31],
    [ 8, 56,  4, 52, 11, 59,  7, 55],
    [40, 24, 36, 20, 43, 27, 39, 23],
    [ 2, 50, 14, 62,  1, 49, 13, 61],
    [34, 18, 46, 30, 33, 17, 45, 29],
    [10, 58,  6, 54,  9, 57,  5, 53],
    [42, 26, 38, 22, 41, 25, 37, 21]
  ];
  const px = Math.floor(x % 8);
  const py = Math.floor(y % 8);
  return dither8x8[py][px] < (value * 64);
}

function initEnokiDither() {
  const canvas = document.getElementById('enoki-dither-pixel');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (enokiDitherTimer) clearTimeout(enokiDitherTimer);
  
  // Clear background
  ctx.fillStyle = palette[8];
  ctx.fillRect(0, 0, 128, 128);
  
  // Define growth data
  enokiCluster = {
    baseY: 100,
    mushrooms: [],
    substrate: [],
    ditheredBackground: []
  };

  for(let i=0; i<12; i++) {
    enokiCluster.mushrooms.push({
      x: 32 + (i * 7) + (Math.random()*4),
      currentHeight: 1 + (Math.random()*5),
      targetHeight: 70 + (Math.random()*25),
      speed: 0.8 + (Math.random()*1.5),
      capSize: 3 + (Math.random()*2)
    });
  }

  // Generate dithered substrate and background texture once
  for (let y = 0; y < 128; y++) {
    for (let x = 0; x < 128; x++) {
      if (y > enokiCluster.baseY) {
        // Substrate dithering
        const brightness = (y - enokiCluster.baseY) / (128 - enokiCluster.baseY);
        if (getDitherPattern(brightness + (Math.random()*0.1), x, y)) {
           ctx.fillStyle = palette[7];
        } else {
           ctx.fillStyle = palette[6];
        }
        ctx.fillRect(x, y, 1, 1);
      } else {
        // Background dithering
        const depth = y / enokiCluster.baseY;
        if (!getDitherPattern(depth + (Math.random()*0.05), x, y)) {
          ctx.fillStyle = palette[9];
        } else {
          ctx.fillStyle = palette[8];
        }
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  // Draw the initial state
  enokiCluster.mushrooms.forEach(m => drawEnokiMushroom(ctx, m));
  growEnokiDither(ctx);
}

function growEnokiDither(ctx) {
  let growing = false;
  enokiCluster.mushrooms.forEach(m => {
    if (m.currentHeight < m.targetHeight) {
      m.currentHeight += m.speed;
      growing = true;
    }
  });

  drawDitheredCluster(ctx);

  if (growing) {
    enokiDitherTimer = setTimeout(() => growEnokiDither(ctx), 100);
  }
}

function drawDitheredCluster(ctx) {
  // Redraw mushrooms on top of the static background
  enokiCluster.mushrooms.forEach(m => drawEnokiMushroom(ctx, m));
}

function drawEnokiMushroom(ctx, m) {
  const topY = enokiCluster.baseY - m.currentHeight;
  const stemWidth = 2;
  const shadowOffset = 1;

  // 1. Dithered Stem
  for (let y = enokiCluster.baseY; y > topY; y--) {
    const depth = (y - topY) / m.currentHeight;
    // Base color
    ctx.fillStyle = palette[3];
    ctx.fillRect(m.x, y, stemWidth, 1);
    
    // Shading dithering
    if(getDitherPattern(depth + 0.2, m.x + shadowOffset, y)) {
      ctx.fillStyle = palette[4];
      ctx.fillRect(m.x + shadowOffset, y, 1, 1);
    }
  }

  // 2. Dithered Cap
  if (m.currentHeight > 10) {
    drawDitheredPixelCap(ctx, m.x + (stemWidth / 2), topY, m.capSize);
  }
}

function drawDitheredPixelCap(ctx, centerX, centerY, size) {
  const roundedSize = Math.max(2, Math.round(size));
  ctx.fillStyle = palette[5];
  
  // Main Cap block
  ctx.fillRect(Math.round(centerX - roundedSize), Math.round(centerY - 1), Math.round(roundedSize * 2), 3);
  
  // Dithered cap rounded highlight
  for (let dx = -roundedSize; dx <= roundedSize; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
       const x = Math.round(centerX + dx);
       const y = Math.round(centerY + dy);
       const brightness = 1 - (Math.abs(dx) / roundedSize);
       if(getDitherPattern(brightness + 0.3, x, y)) {
         ctx.fillStyle = palette[5];
       } else {
         ctx.fillStyle = palette[3];
       }
       ctx.fillRect(x, y, 1, 1);
    }
  }
}

// Start the dithered animation upon loading
setTimeout(initEnokiDither, 500);
</script>
