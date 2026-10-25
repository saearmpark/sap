  // ── STEP 58: 탱크 대전 ─────────────────────────────
  (function () {
    const panel = document.getElementById("panel-tanks");
    const canvas = document.getElementById("tanks-canvas");
    const ctx = canvas.getContext("2d");
    const statusEl = document.getElementById("tanks-status");
    const startBtn = document.getElementById("tanks-start");
    const W = canvas.width, H = canvas.height;
    const SIZE = 24, HALF = SIZE / 2, BASE_ENEMIES = 3;

    let player, enemies, bullets, running, over, rafId, invuln, expTimer, stage, score;

    function enemyCount() { return Math.min(8, BASE_ENEMIES + (stage - 1)); }

    function spawnEnemies() {
      enemies = [];
      const n = enemyCount();
      const colW = (W - 120) / 3;
      for (let i = 0; i < n; i++) {
        const hp = 1 + Math.floor((stage - 1) / 3);
        enemies.push({
          x: 60 + (i % 4) * colW,
          y: 40 + Math.floor(i / 4) * 44,
          face: Math.PI / 2,
          hp,
          cd: 50 + i * 15,
        });
      }
    }

    function reset() {
      player = { x: W / 2, y: H - 40, face: -Math.PI / 2, hp: 3, cd: 0 };
      bullets = [];
      stage = 1;
      score = 0;
      spawnEnemies();
      running = false;
      over = false;
      invuln = 0;
      expTimer = 0;
    }

    function keys() { return window.__tankKeys || {}; }

    function clampTank(t) {
      t.x = Math.max(HALF + 4, Math.min(W - HALF - 4, t.x));
      t.y = Math.max(HALF + 4, Math.min(H - HALF - 4, t.y));
    }

    function fire(tank, targetX, targetY, speed, owner) {
      let dx = targetX - tank.x, dy = targetY - tank.y;
      const len = Math.hypot(dx, dy) || 1;
      dx /= len; dy /= len;
      tank.face = Math.atan2(dy, dx);
      bullets.push({ x: tank.x + dx * HALF, y: tank.y + dy * HALF, vx: dx * speed, vy: dy * speed, owner });
    }

    function update() {
      const k = keys();
      const speed = 2.4;
      let dx = (k.right ? 1 : 0) - (k.left ? 1 : 0);
      let dy = (k.down ? 1 : 0) - (k.up ? 1 : 0);
      if (dx || dy) {
        const len = Math.hypot(dx, dy);
        player.x += (dx / len) * speed;
        player.y += (dy / len) * speed;
        player.face = Math.atan2(dy, dx);
        clampTank(player);
      }
      if (player.cd > 0) player.cd--;
      if (k.fire && player.cd <= 0 && running) { fire(player, player.x + Math.cos(player.face), player.y + Math.sin(player.face), 6, "player"); player.cd = 16; }
      if (invuln > 0) invuln--;
      if (expTimer > 0) expTimer--;

      const enemySpeed = Math.min(2.4, 1.1 + (stage - 1) * 0.15);
      const enemyBulletSpeed = Math.min(7, 4 + (stage - 1) * 0.3);
      for (const e of enemies) {
        const ex = player.x - e.x, ey = player.y - e.y;
        const len = Math.hypot(ex, ey) || 1;
        e.x += (ex / len) * enemySpeed;
        e.y += (ey / len) * enemySpeed;
        clampTank(e);
        e.cd--;
        if (e.cd <= 0) { fire(e, player.x, player.y, enemyBulletSpeed, "enemy"); e.cd = Math.max(24, (80 + Math.random() * 60) / (1 + (stage - 1) * 0.15)); }
      }
      for (let i = 0; i < enemies.length; i++) {
        for (let j = i + 1; j < enemies.length; j++) {
          const a = enemies[i], b = enemies[j];
          const ax = b.x - a.x, ay = b.y - a.y;
          const d = Math.hypot(ax, ay) || 1;
          if (d < SIZE) { a.x -= (ax / d) * 0.6; a.y -= (ay / d) * 0.6; b.x += (ax / d) * 0.6; b.y += (ay / d) * 0.6; clampTank(a); clampTank(b); }
        }
      }

      for (const b of bullets) { b.x += b.vx; b.y += b.vy; }
      bullets = bullets.filter((b) => b.x > -10 && b.x < W + 10 && b.y > -10 && b.y < H + 10);

      for (const b of bullets) {
        if (b.dead) continue;
        if (b.owner === "player") {
          for (const e of enemies) {
            if (!e.dead && Math.hypot(b.x - e.x, b.y - e.y) < HALF + 4) {
              b.dead = true;
              e.hp--;
              if (e.hp <= 0) { e.dead = true; score += 10; }
              expTimer = 8;
              break;
            }
          }
        } else if (Math.hypot(b.x - player.x, b.y - player.y) < HALF + 2 && invuln <= 0) {
          b.dead = true;
          player.hp--;
          invuln = 70;
          statusEl.textContent = `스테이지 ${stage} · 점수 ${score} · 목숨 ${player.hp} · 남은 적 ${enemies.filter((e) => !e.dead).length}`;
          if (player.hp <= 0) { endGame(false); return; }
        }
      }
      enemies = enemies.filter((e) => !e.dead);
      bullets = bullets.filter((b) => !b.dead);

      if (!enemies.length) {
        score += 100 * stage;
        stage++;
        player.hp = Math.min(5, player.hp + 1);
        spawnEnemies();
        statusEl.textContent = `스테이지 ${stage} · 점수 ${score} · 목숨 ${player.hp} · 남은 적 ${enemies.length}`;
      }
    }

    function drawTank(t, color) {
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.rotate(t.face);
      ctx.fillStyle = color;
      ctx.fillRect(-HALF, -HALF, SIZE, SIZE);
      ctx.fillStyle = "#17181a";
      ctx.fillRect(HALF - 4, -3, 12, 6);
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fill();
      ctx.restore();
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = expTimer > 0 ? "#ffe08a" : "#2ecc71";
      if (!(invuln > 0 && Math.floor(invuln / 6) % 2 === 0)) drawTank(player, "#3498db");
      for (const e of enemies) drawTank(e, "#e74c3c");
      for (const b of bullets) {
        ctx.fillStyle = b.owner === "player"
          ? (document.documentElement.dataset.theme === "dark" ? "#fff" : "#17181a")
          : "#ffb3a7";
        ctx.beginPath();
        ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function loop() {
      if (!running) return;
      update();
      draw();
      if (running) rafId = requestAnimationFrame(loop);
    }

    function endGame(won) {
      running = false;
      over = true;
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      window.__tankKeys = { left: false, right: false, up: false, down: false, fire: false };
      window.reportScore?.("panel-tanks", score);
      statusEl.textContent = won ? `승리! 점수 ${score}` : `패배... 점수 ${score} · 시작 버튼으로 다시`;
    }

    function startGame() {
      if (rafId) cancelAnimationFrame(rafId);
      reset();
      running = true;
      window.__tankKeys = { left: false, right: false, up: false, down: false, fire: false };
      statusEl.textContent = `스테이지 1 · 점수 0 · 목숨 3 · 남은 적 ${enemies.length}`;
      loop();
    }

    function hold(id, key) {
      const btn = document.getElementById(id);
      const on = (e) => { e.preventDefault(); window.__tankKeys[key] = true; };
      const off = (e) => { e.preventDefault(); window.__tankKeys[key] = false; };
      btn.addEventListener("mousedown", on);
      btn.addEventListener("touchstart", on, { passive: false });
      btn.addEventListener("mouseup", off);
      btn.addEventListener("mouseleave", off);
      btn.addEventListener("touchend", off, { passive: false });
    }
    hold("tanks-left", "left");
    hold("tanks-right", "right");
    hold("tanks-up", "up");
    hold("tanks-down", "down");
    const fireBtn = document.getElementById("tanks-fire");
    fireBtn.addEventListener("mousedown", (e) => { e.preventDefault(); window.__tankKeys.fire = true; });
    fireBtn.addEventListener("touchstart", (e) => { e.preventDefault(); window.__tankKeys.fire = true; }, { passive: false });
    fireBtn.addEventListener("mouseup", () => { window.__tankKeys.fire = false; });
    fireBtn.addEventListener("mouseleave", () => { window.__tankKeys.fire = false; });
    fireBtn.addEventListener("touchend", () => { window.__tankKeys.fire = false; }, { passive: false });

    startBtn.addEventListener("click", startGame);
    document.addEventListener("keydown", (e) => {
      if (panel.hidden) return;
      window.__tankKeys = window.__tankKeys || {};
      const map = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" };
      if (map[e.key]) { window.__tankKeys[map[e.key]] = true; e.preventDefault(); }
      if (e.code === "Space") { window.__tankKeys.fire = true; e.preventDefault(); }
    });
    document.addEventListener("keyup", (e) => {
      window.__tankKeys = window.__tankKeys || {};
      const map = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" };
      if (map[e.key]) window.__tankKeys[map[e.key]] = false;
      if (e.code === "Space") window.__tankKeys.fire = false;
    });

    reset();
    draw();
    registerGame("panel-tanks", {
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
