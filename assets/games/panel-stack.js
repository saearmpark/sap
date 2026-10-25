  // ── STEP 59: 스택 ─────────────────────────────
  (function () {
    const panel = document.getElementById("panel-stack");
    const canvas = document.getElementById("stack-canvas");
    const ctx = canvas.getContext("2d");
    const scoreEl = document.getElementById("stack-score");
    const comboEl = document.getElementById("stack-combo");
    const statusEl = document.getElementById("stack-status");
    const startBtn = document.getElementById("stack-start");
    const dropBtn = document.getElementById("stack-drop");
    const W = canvas.width, H = canvas.height;
    const BLOCK_H = 22, BASE_Y = H - 34, BASE_WIDTH = 190;
    const COLORS = ["#ff6b6b", "#feca57", "#48dbfb", "#1dd1a1", "#a29bfe", "#ff9ff3"];

    let blocks, active, camera, running, over, rafId, lastTime, score, combo, flash, shake, particles;

    function targetCamera() {
      return active ? Math.max(0, (active.level - 8) * BLOCK_H) : 0;
    }

    function blockTop(level) {
      return BASE_Y - level * BLOCK_H + camera - BLOCK_H;
    }

    function spawn(level) {
      const top = blocks[blocks.length - 1];
      const dir = level % 2 ? 1 : -1;
      return {
        x: dir > 0 ? 0 : W - top.w,
        w: top.w,
        level,
        dir,
        speed: Math.min(6.3, 2 + level * 0.14),
        color: COLORS[(level - 1) % COLORS.length],
      };
    }

    function reset() {
      blocks = [{ x: (W - BASE_WIDTH) / 2, w: BASE_WIDTH, level: 0, color: "#64748b" }];
      active = spawn(1);
      camera = 0;
      running = false;
      over = false;
      score = 0;
      combo = 0;
      flash = 0;
      shake = 0;
      particles = [];
      scoreEl.textContent = "0";
      comboEl.textContent = "PERFECT 0";
    }

    function roundRect(x, y, w, h, r) {
      const radius = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + w - radius, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
      ctx.lineTo(x + w, y + h - radius);
      ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
      ctx.lineTo(x + radius, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    }

    function burst(x, y, color) {
      for (let i = 0; i < 16; i++) {
        const angle = (Math.PI * 2 * i) / 16 + Math.random() * 0.3;
        const speed = 1.4 + Math.random() * 2.6;
        particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1,
          life: 1,
          color,
        });
      }
    }

    function drawBlock(block, isActive) {
      const x = block.x;
      const y = blockTop(block.level);
      if (y > H + BLOCK_H || y + BLOCK_H < -BLOCK_H) return;
      ctx.save();
      if (isActive) {
        ctx.shadowColor = block.color;
        ctx.shadowBlur = 16;
      }
      roundRect(x + 1, y + 1, Math.max(3, block.w - 2), BLOCK_H - 2, 4);
      ctx.fillStyle = block.color;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(255,255,255,0.26)";
      ctx.fillRect(x + 4, y + 3, Math.max(0, block.w - 8), 3);
      if (isActive) {
        ctx.strokeStyle = document.documentElement.dataset.theme === "dark" ? "#ffffff" : "#172033";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();
    }

    function draw() {
      const dark = document.documentElement.dataset.theme === "dark";
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      if (shake > 0) {
        ctx.translate((Math.random() - 0.5) * shake * 10, (Math.random() - 0.5) * shake * 10);
      }

      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, dark ? "#111722" : "#eef5ff");
      sky.addColorStop(1, dark ? "#1b2330" : "#dbe9ff");
      ctx.fillStyle = sky;
      ctx.fillRect(-20, -20, W + 40, H + 40);

      const gridOffset = ((BASE_Y + camera) % BLOCK_H + BLOCK_H) % BLOCK_H;
      ctx.strokeStyle = dark ? "rgba(255,255,255,0.055)" : "rgba(32,54,84,0.075)";
      ctx.lineWidth = 1;
      for (let y = gridOffset; y < H; y += BLOCK_H) {
        ctx.beginPath();
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(W, y + 0.5);
        ctx.stroke();
      }

      const floorY = BASE_Y + camera;
      if (floorY < H) {
        ctx.fillStyle = dark ? "#0c111a" : "#b8cbe6";
        ctx.fillRect(0, floorY, W, H - floorY);
        ctx.fillStyle = dark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.55)";
        ctx.fillRect(0, floorY, W, 2);
      }

      if (running && active) {
        const top = blocks[blocks.length - 1];
        ctx.save();
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = dark ? "rgba(255,255,255,0.24)" : "rgba(23,32,51,0.22)";
        ctx.lineWidth = 1;
        ctx.strokeRect(top.x + 1, blockTop(active.level) + 1, Math.max(2, top.w - 2), BLOCK_H - 2);
        ctx.restore();
      }

      blocks.forEach(block => drawBlock(block, false));
      if (active && !over) drawBlock(active, true);

      particles.forEach(particle => {
        ctx.globalAlpha = Math.max(0, particle.life);
        ctx.fillStyle = particle.color;
        ctx.fillRect(particle.x - 2, particle.y - 2, 4, 4);
      });
      ctx.globalAlpha = 1;

      if (flash > 0) {
        ctx.globalAlpha = Math.min(1, flash * 1.4);
        ctx.fillStyle = dark ? "#ffffff" : "#172033";
        ctx.font = "700 30px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
        ctx.textAlign = "center";
        ctx.fillText("PERFECT", W / 2, 86);
        ctx.globalAlpha = 1;
      }

      if (over) {
        ctx.fillStyle = "rgba(7, 12, 20, 0.68)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.font = "700 34px system-ui, -apple-system, Segoe UI, sans-serif";
        ctx.fillText("GAME OVER", W / 2, H / 2 - 14);
        ctx.font = "600 18px system-ui, -apple-system, Segoe UI, sans-serif";
        ctx.fillText(`${score}층을 쌓았습니다`, W / 2, H / 2 + 24);
      }
      ctx.restore();
    }

    function update(dt) {
      if (!running || !active) return;
      const step = Math.min(dt, 40) / 16.667;
      active.x += active.dir * active.speed * step;
      if (active.x <= 0) {
        active.x = 0;
        active.dir = 1;
      } else if (active.x + active.w >= W) {
        active.x = W - active.w;
        active.dir = -1;
      }
      const target = targetCamera();
      camera += (target - camera) * Math.min(1, 0.14 * step);
      if (flash > 0) flash = Math.max(0, flash - 0.018 * step);
      if (shake > 0) shake = Math.max(0, shake - 0.035 * step);
      particles = particles.filter(particle => {
        particle.x += particle.vx * step;
        particle.y += particle.vy * step;
        particle.vy += 0.12 * step;
        particle.life -= 0.022 * step;
        return particle.life > 0;
      });
    }

    function gameOver() {
      running = false;
      over = true;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
      shake = 1;
      dropBtn.disabled = true;
      startBtn.textContent = "다시 시작";
      statusEl.textContent = `게임 오버 · ${score}층 · 시작 버튼으로 다시 도전하세요.`;
      window.reportScore?.("panel-stack", score);
      draw();
    }

    function place() {
      if (!running || !active) return;
      const top = blocks[blocks.length - 1];
      const left = Math.max(active.x, top.x);
      const right = Math.min(active.x + active.w, top.x + top.w);
      const overlap = right - left;
      if (overlap < 4) {
        gameOver();
        return;
      }

      const perfect = Math.abs(active.x - top.x) <= 3;
      const placedX = perfect ? top.x : left;
      const placedW = perfect ? top.w : overlap;
      const placedLevel = active.level;
      blocks.push({ x: placedX, w: placedW, level: placedLevel, color: active.color });
      score = blocks.length - 1;

      if (perfect) {
        combo++;
        flash = 1;
        burst(placedX + placedW / 2, blockTop(placedLevel) + BLOCK_H / 2, active.color);
        statusEl.textContent = `PERFECT ${combo} · ${score}층`;
      } else {
        combo = 0;
        statusEl.textContent = `${score}층 · 다음 블록을 맞춰 보세요.`;
      }
      scoreEl.textContent = String(score);
      comboEl.textContent = `PERFECT ${combo}`;
      active = spawn(placedLevel + 1);
    }

    function loop(time) {
      if (!running) return;
      if (!lastTime) lastTime = time;
      const dt = time - lastTime;
      lastTime = time;
      update(dt);
      draw();
      if (running) rafId = requestAnimationFrame(loop);
    }

    function startGame() {
      if (rafId) cancelAnimationFrame(rafId);
      reset();
      running = true;
      lastTime = 0;
      dropBtn.disabled = false;
      startBtn.textContent = "다시 시작";
      statusEl.textContent = "좌우로 움직이는 블록을 탭해서 쌓으세요.";
      rafId = requestAnimationFrame(loop);
    }

    function drop() {
      if (!running) {
        startGame();
        return;
      }
      place();
    }

    canvas.addEventListener("pointerdown", event => {
      event.preventDefault();
      drop();
    });
    dropBtn.addEventListener("click", drop);
    startBtn.addEventListener("click", startGame);

    document.addEventListener("keydown", event => {
      if (panel.hidden) return;
      if (event.code !== "Space" && event.code !== "ArrowDown") return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      event.preventDefault();
      drop();
    });

    reset();
    draw();
    registerGame("panel-stack", {
      init() {
        if (rafId) cancelAnimationFrame(rafId);
        reset();
        draw();
        dropBtn.disabled = true;
        startBtn.textContent = "시작";
        statusEl.textContent = "시작 버튼을 눌러주세요.";
      },
      resume() {
        draw();
      },
      stop() {
        running = false;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = 0;
        dropBtn.disabled = true;
      },
    });
  })();
