  // ── STEP 54: 스페이스 인베이더 ─────────────────────────────
  (function () {
    const panel = document.getElementById("panel-invaders");
    const canvas = document.getElementById("invaders-canvas");
    const ctx = canvas.getContext("2d");
    const statusEl = document.getElementById("invaders-status");
    const startBtn = document.getElementById("invaders-start");
    const leftBtn = document.getElementById("invaders-left");
    const rightBtn = document.getElementById("invaders-right");
    const fireBtn = document.getElementById("invaders-fire");
    const W = canvas.width, H = canvas.height;

    const COLS = 8, IW = 28, IH = 18;
    let player, bullets, bombs, invaders, invDir, score, lives, cooldown, fireTimer, running, rafId, stage, waveTotal;

    function spawnWave() {
      invaders = [];
      const rows = Math.min(6, 3 + Math.ceil(stage / 2));
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < COLS; c++) {
          invaders.push({ x: 46 + c * 42, y: 46 + r * 34, alive: true, row: r });
        }
      }
      waveTotal = rows * COLS;
      invDir = 1;
    }

    function reset() {
      player = { x: W / 2, y: H - 26, w: 34, h: 14, speed: 4 };
      bullets = [];
      bombs = [];
      stage = 1;
      spawnWave();
      score = 0;
      lives = 3;
      cooldown = 0;
      fireTimer = 0;
      running = false;
    }

    function moveInvaders() {
      const alive = invaders.filter((i) => i.alive);
      if (!alive.length) return;
      const speed = Math.min(3.4, (0.55 + (waveTotal - alive.length) * 0.045) * (1 + (stage - 1) * 0.1));
      let edge = false;
      for (const i of alive) { i.x += invDir * speed; }
      for (const i of alive) {
        if (i.x < 12 || i.x + IW > W - 12) edge = true;
      }
      if (edge) {
        invDir *= -1;
        for (const i of alive) i.y += 16;
      }
    }

    function update() {
      const keys = window.__invKeys || {};
      if (keys.left) player.x -= player.speed;
      if (keys.right) player.x += player.speed;
      if (keys.fire) fire();

      player.x = Math.max(player.w / 2, Math.min(W - player.w / 2, player.x));

      moveInvaders();

      for (const b of bullets) b.y -= 9;
      bullets = bullets.filter((b) => b.y > -10);

      if (cooldown > 0) cooldown--;
      fireTimer--;
      const alive = invaders.filter((i) => i.alive);
      if (alive.length && fireTimer <= 0) {
        const shooter = alive[Math.floor(Math.random() * alive.length)];
        bombs.push({ x: shooter.x + IW / 2, y: shooter.y + IH });
        fireTimer = Math.max(12, (40 + Math.random() * 50) / (1 + (stage - 1) * 0.15));
      }
      for (const bm of bombs) bm.y += Math.min(7, 4.2 + (stage - 1) * 0.35);
      bombs = bombs.filter((bm) => bm.y < H + 10);

      for (const b of bullets) {
        for (const i of alive) {
          if (b.y > i.y && b.y < i.y + IH && b.x > i.x && b.x < i.x + IW) {
            i.alive = false;
            b.y = -99;
            score += 10;
            statusEl.textContent = `스테이지 ${stage} · 점수 ${score} · 목숨 ${lives}`;
          }
        }
      }
      for (const bm of bombs) {
        if (bm.y > player.y && bm.y < player.y + player.h && bm.x > player.x - player.w / 2 && bm.x < player.x + player.w / 2) {
          bm.y = H + 99;
          hitPlayer();
        }
      }
      if (!invaders.some((i) => i.alive)) {
        score += 100 * stage;
        stage++;
        bullets = [];
        bombs = [];
        player.x = W / 2;
        fireTimer = 30;
        spawnWave();
        statusEl.textContent = `스테이지 ${stage} · 점수 ${score} · 목숨 ${lives}`;
      }
      for (const i of invaders) {
        if (i.alive && i.y + IH > player.y) { endGame(false); return; }
      }
    }

    function fire() {
      if (cooldown > 0 || !running) return;
      bullets.push({ x: player.x, y: player.y - 8 });
      cooldown = 12;
    }

    function hitPlayer() {
      lives--;
      if (lives <= 0) endGame(false);
      else statusEl.textContent = `점수 ${score} · 목숨 ${lives}`;
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#2ecc71";
      for (const i of invaders) {
        if (!i.alive) continue;
        ctx.fillRect(i.x, i.y, IW, IH);
        ctx.fillStyle = "#17181a";
        ctx.fillRect(i.x + 5, i.y + 5, 5, 5);
        ctx.fillRect(i.x + IW - 10, i.y + 5, 5, 5);
        ctx.fillStyle = "#2ecc71";
      }
      ctx.fillStyle = "#3498db";
      ctx.fillRect(player.x - player.w / 2, player.y, player.w, player.h);
      ctx.fillStyle = document.documentElement.dataset.theme === "dark" ? "#fff" : "#17181a";
      for (const b of bullets) ctx.fillRect(b.x - 1.5, b.y, 3, 10);
      ctx.fillStyle = "#e74c3c";
      for (const bm of bombs) ctx.fillRect(bm.x - 2, bm.y, 4, 10);
    }

    function loop() {
      if (!running) return;
      update();
      draw();
      if (running) rafId = requestAnimationFrame(loop);
    }

    function endGame(won) {
      running = false;
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      window.__invKeys = { left: false, right: false, fire: false };
      window.reportScore?.("panel-invaders", score);
      statusEl.textContent = `${won ? "승리!" : "게임 오버"} · 점수 ${score} — 시작 버튼으로 다시`;
    }

    function startGame() {
      if (rafId) cancelAnimationFrame(rafId);
      reset();
      running = true;
      window.__invKeys = { left: false, right: false, fire: false };
      statusEl.textContent = "스테이지 1 · 점수 0 · 목숨 3";
      loop();
    }

    function hold(btn, key) {
      const on = (e) => { e.preventDefault(); window.__invKeys[key] = true; };
      const off = (e) => { e.preventDefault(); window.__invKeys[key] = false; };
      btn.addEventListener("mousedown", on);
      btn.addEventListener("touchstart", on, { passive: false });
      btn.addEventListener("mouseup", off);
      btn.addEventListener("mouseleave", off);
      btn.addEventListener("touchend", off, { passive: false });
    }
    hold(leftBtn, "left");
    hold(rightBtn, "right");
    fireBtn.addEventListener("click", fire);
    fireBtn.addEventListener("touchstart", (e) => { e.preventDefault(); fire(); }, { passive: false });

    startBtn.addEventListener("click", startGame);
    document.addEventListener("keydown", (e) => {
      if (panel.hidden) return;
      window.__invKeys = window.__invKeys || {};
      if (e.key === "ArrowLeft") { window.__invKeys.left = true; e.preventDefault(); }
      if (e.key === "ArrowRight") { window.__invKeys.right = true; e.preventDefault(); }
      if (e.code === "Space") { window.__invKeys.fire = true; e.preventDefault(); }
    });
    document.addEventListener("keyup", (e) => {
      window.__invKeys = window.__invKeys || {};
      if (e.key === "ArrowLeft") window.__invKeys.left = false;
      if (e.key === "ArrowRight") window.__invKeys.right = false;
      if (e.code === "Space") window.__invKeys.fire = false;
    });

    reset();
    draw();
    registerGame("panel-invaders", {
      init() {
        running = false;
        if (rafId) cancelAnimationFrame(rafId);
        reset();
        draw();
        statusEl.textContent = "시작 버튼을 눌러주세요.";
      },
      stop() {
        running = false;
        if (rafId) cancelAnimationFrame(rafId);
      },
    });
  })();
