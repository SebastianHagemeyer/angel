(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  const els = {
    score: document.getElementById("score"),
    best: document.getElementById("best"),
    overlay: document.getElementById("overlay"),
    start: document.getElementById("start"),
    overGame: document.getElementById("overGame"),
    finalScore: document.getElementById("finalScore"),
    finalBest: document.getElementById("finalBest"),
    overTitle: document.getElementById("overTitle"),
    again: document.getElementById("again"),
  };

  // --- Sound (Web Audio, no assets) ---
  let audioCtx;
  function beep(freq, dur = 0.08, type = "square", gain = 0.12) {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.value = gain;
      o.connect(g).connect(audioCtx.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
      o.stop(audioCtx.currentTime + dur);
    } catch (_) {}
  }
  const sfx = {
    flap: () => beep(520, 0.06, "square", 0.1),
    score: () => { beep(660, 0.06); setTimeout(() => beep(880, 0.08), 60); },
    hit: () => { beep(120, 0.25, "sawtooth", 0.18); setTimeout(() => beep(60, 0.3, "sawtooth", 0.18), 120); },
  };

  // --- State ---
  const state = {
    running: false,
    score: 0,
    best: Number(localStorage.getItem("flapSteveBest") || 0),
    t: 0,
  };
  els.best.textContent = state.best;

  // Player
  const player = {
    x: W * 0.3,
    y: H * 0.45,
    w: 46,
    h: 46,
    vy: 0,
    flapT: 0,
  };
  const GRAVITY = 1400;
  const FLAP_V = -480;

  // Pillars
  const PILLAR_W = 72;
  const GAP = 200;
  const PILLAR_SPACING = 260;
  const PILLAR_SPEED = 200;
  let pillars = [];

  // Parallax clouds
  const clouds = [];
  function spawnCloud(x) {
    clouds.push({
      x: x ?? W + Math.random() * 200,
      y: 40 + Math.random() * 280,
      w: 80 + Math.random() * 80,
      speed: 20 + Math.random() * 30,
    });
  }
  for (let i = 0; i < 6; i++) spawnCloud(Math.random() * W);

  // Reset + spawn
  function reset() {
    player.x = W * 0.3;
    player.y = H * 0.45;
    player.vy = 0;
    pillars = [];
    state.score = 0;
    state.t = 0;
    els.score.textContent = 0;
    for (let i = 0; i < 3; i++) addPillar(W + 200 + i * PILLAR_SPACING);
  }
  function addPillar(x) {
    const top = 80 + Math.random() * (H - 80 - 140 - GAP);
    pillars.push({ x, top, passed: false });
  }

  // Input
  function flap() {
    if (!state.running) return;
    player.vy = FLAP_V;
    player.flapT = 0.15;
    sfx.flap();
  }
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.code === "ArrowUp") {
      e.preventDefault();
      flap();
    }
  });
  canvas.addEventListener("pointerdown", flap);

  els.start.addEventListener("click", () => {
    els.overlay.classList.add("hidden");
    reset();
    state.running = true;
    lastT = performance.now();
    requestAnimationFrame(loop);
  });
  els.again.addEventListener("click", () => {
    els.overGame.classList.add("hidden");
    reset();
    state.running = true;
    lastT = performance.now();
    requestAnimationFrame(loop);
  });

  // --- Draw helpers ---
  function pixelRect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
  }

  function drawSky() {
    // Minecraft-ish sky with soft gradient
    const grd = ctx.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, "#6cb8ff");
    grd.addColorStop(0.6, "#b5e0ff");
    grd.addColorStop(1, "#dff1ff");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);
  }

  function drawClouds(dt) {
    for (const c of clouds) {
      c.x -= c.speed * dt;
      if (c.x + c.w < -20) {
        c.x = W + Math.random() * 120;
        c.y = 40 + Math.random() * 280;
        c.w = 80 + Math.random() * 80;
      }
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      // chunky pixel cloud: 3 stacked rounded rects
      pixelRect(c.x, c.y, c.w, 16, "#fff");
      pixelRect(c.x + 8, c.y - 8, c.w - 16, 16, "#fff");
      pixelRect(c.x + 16, c.y + 16, c.w - 32, 10, "rgba(200,215,230,0.9)");
    }
  }

  function drawGround() {
    // dirt band
    pixelRect(0, H - 100, W, 100, "#8b5a3c");
    // grass top
    pixelRect(0, H - 100, W, 14, "#3e8a3a");
    pixelRect(0, H - 100, W, 5, "#5ab552");
    // pixel specks
    for (let x = 0; x < W; x += 24) {
      pixelRect(x + ((state.t * 80) % 24), H - 92, 4, 4, "#2b5e28");
    }
  }

  function drawPillar(p) {
    const topH = p.top;
    const botY = p.top + GAP;
    const botH = H - 100 - botY;
    // Top
    drawCobble(p.x, 0, PILLAR_W, topH);
    // Cap
    pixelRect(p.x - 4, topH - 18, PILLAR_W + 8, 18, "#6a6a6a");
    pixelRect(p.x - 4, topH - 18, PILLAR_W + 8, 4, "#8a8a8a");
    // Bottom
    drawCobble(p.x, botY, PILLAR_W, botH);
    pixelRect(p.x - 4, botY, PILLAR_W + 8, 18, "#6a6a6a");
    pixelRect(p.x - 4, botY, PILLAR_W + 8, 4, "#8a8a8a");
  }

  function drawCobble(x, y, w, h) {
    // cobblestone pattern
    pixelRect(x, y, w, h, "#7a7a7a");
    for (let yy = y; yy < y + h; yy += 18) {
      for (let xx = x; xx < x + w; xx += 18) {
        const shade = (xx * 13 + yy * 7) % 4;
        const c = ["#8a8a8a", "#6a6a6a", "#909090", "#5e5e5e"][shade];
        pixelRect(xx + 2, yy + 2, 14, 14, c);
      }
    }
    // subtle outline
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  }

  function drawSteve() {
    // tilt based on velocity
    const tilt = Math.max(-0.5, Math.min(1.1, player.vy / 700));
    ctx.save();
    ctx.translate(player.x + player.w / 2, player.y + player.h / 2);
    ctx.rotate(tilt);
    const s = 1; // scale
    const x = -player.w / 2;
    const y = -player.h / 2;
    // hair/hat
    pixelRect(x + 6, y, 34 * s, 10, "#3a2a18");
    // face/skin
    pixelRect(x + 6, y + 10, 34 * s, 26, "#d9a47a");
    // eyes
    pixelRect(x + 14, y + 18, 5, 7, "#fff");
    pixelRect(x + 26, y + 18, 5, 7, "#fff");
    pixelRect(x + 17, y + 20, 3, 4, "#3a5a8a");
    pixelRect(x + 29, y + 20, 3, 4, "#3a5a8a");
    // mouth
    pixelRect(x + 18, y + 30, 12, 3, "#5a3a2a");
    // shirt
    pixelRect(x + 4, y + 36, 38, 10, "#2e7ab5");
    // arm flap
    const flap = player.flapT > 0 ? -6 : 2;
    pixelRect(x - 4, y + 30 + flap, 10, 12, "#d9a47a");
    pixelRect(x + 40, y + 30 + flap, 10, 12, "#d9a47a");
    ctx.restore();
  }

  function collides() {
    if (player.y + player.h > H - 100) return true;
    if (player.y < 0) return true;
    for (const p of pillars) {
      if (player.x + player.w > p.x && player.x < p.x + PILLAR_W) {
        if (player.y < p.top || player.y + player.h > p.top + GAP) return true;
      }
    }
    return false;
  }

  function gameOver() {
    state.running = false;
    sfx.hit();
    if (state.score > state.best) {
      state.best = state.score;
      localStorage.setItem("flapSteveBest", state.best);
      els.overTitle.textContent = "New Best!";
    } else {
      els.overTitle.textContent = "Ouch.";
    }
    els.finalScore.textContent = state.score;
    els.finalBest.textContent = state.best;
    els.best.textContent = state.best;
    els.overGame.classList.remove("hidden");
  }

  // --- Loop ---
  let lastT = 0;
  function loop(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    state.t += dt;

    // update
    player.vy += GRAVITY * dt;
    player.y += player.vy * dt;
    player.flapT = Math.max(0, player.flapT - dt);

    for (const p of pillars) p.x -= PILLAR_SPEED * dt;
    while (pillars.length && pillars[0].x + PILLAR_W < 0) pillars.shift();
    const last = pillars[pillars.length - 1];
    if (!last || last.x < W - PILLAR_SPACING) addPillar((last ? last.x : W) + PILLAR_SPACING);

    // scoring
    for (const p of pillars) {
      if (!p.passed && p.x + PILLAR_W < player.x) {
        p.passed = true;
        state.score++;
        els.score.textContent = state.score;
        sfx.score();
      }
    }

    // draw
    drawSky();
    drawClouds(dt);
    for (const p of pillars) drawPillar(p);
    drawGround();
    drawSteve();

    if (collides()) {
      gameOver();
      return;
    }
    if (state.running) requestAnimationFrame(loop);
  }

  // Initial static frame
  drawSky();
  drawClouds(0);
  drawGround();
  drawSteve();
})();
