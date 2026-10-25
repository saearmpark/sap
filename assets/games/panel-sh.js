  // ── STEP 3: 슈팅게임 ─────────────────────────────
  (function () {
    const canvas = document.getElementById("sh-canvas");
    const ctx = canvas.getContext("2d");
    const statusEl = document.getElementById("sh-status");
    const startBtn = document.getElementById("sh-start");

    const W = canvas.width, H = canvas.height;
    const css = getComputedStyle(document.documentElement);
    const ACCENT = css.getPropertyValue("--accent").trim() || "#3f6650";
    const INK = css.getPropertyValue("--ink").trim() || "#1b1f1d";
    const SOFT = css.getPropertyValue("--ink-soft").trim() || "#565e58";

    const player = { w: 26, h: 16, x: W / 2 - 13, y: H - 40, speed: 8 };
    let bullets, enemies, score, lives, running = false, elapsed, spawnTimer;
    const keys = {};

    function newGame() {
      bullets = [];
      enemies = [];
      score = 0;
      lives = 3;
      elapsed = 0;
      spawnTimer = 0;
      player.x = W / 2 - player.w / 2;
    }

    function spawnInterval() {
      // 시간이 지날수록(elapsed) 적이 더 자주 등장한다 — 최소 25프레임 간격
      return Math.max(25, 70 - Math.floor(elapsed / 300));
    }

    function enemySpeed() {
      // 시간이 지날수록 적이 더 빨리 내려온다
      return 1.5 + elapsed / 1800;
    }

    function update() {
      elapsed++;

      if (keys.ArrowLeft) player.x -= player.speed;
      if (keys.ArrowRight) player.x += player.speed;
      player.x = Math.max(0, Math.min(W - player.w, player.x));

      // 총알 이동
      bullets.forEach(b => (b.y -= 6));
      bullets = bullets.filter(b => b.y > -10);

      // 적 생성
      spawnTimer++;
      if (spawnTimer >= spawnInterval()) {
        spawnTimer = 0;
        enemies.push({ x: Math.random() * (W - 24), y: -20, w: 24, h: 18, speed: enemySpeed() });
      }

      // 적 이동
      enemies.forEach(e => (e.y += e.speed));

      // 총알-적 충돌
      for (const e of enemies) {
        for (const b of bullets) {
          if (b.hit) continue;
          if (b.x > e.x && b.x < e.x + e.w && b.y > e.y && b.y < e.y + e.h) {
            b.hit = true;
            e.dead = true;
            score += 10;
          }
        }
      }
      bullets = bullets.filter(b => !b.hit);

      // 화면을 벗어나거나 플레이어와 부딪힌 적 처리
      const playerBox = { x: player.x, y: player.y, w: player.w, h: player.h };
      for (const e of enemies) {
        if (e.dead) continue;
        const hitPlayer =
          e.x < playerBox.x + playerBox.w && e.x + e.w > playerBox.x &&
          e.y < playerBox.y + playerBox.h && e.y + e.h > playerBox.y;
        if (hitPlayer || e.y > H) {
          e.dead = true;
          lives--;
        }
      }
      enemies = enemies.filter(e => !e.dead);

      if (lives <= 0) {
        running = false;
        window.reportScore?.("panel-sh", score);
        updateStatus(`게임 오버 · 최종 점수 ${score}`);
        return;
      }
      updateStatus();
    }

    function updateStatus(text) {
      statusEl.textContent = text || `점수 ${score} · 목숨 ${lives}`;
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);

      ctx.fillStyle = INK;
      ctx.fillRect(player.x, player.y, player.w, player.h);

      ctx.fillStyle = SOFT;
      bullets.forEach(b => ctx.fillRect(b.x - 2, b.y - 6, 4, 10));

      ctx.fillStyle = ACCENT;
      enemies.forEach(e => ctx.fillRect(e.x, e.y, e.w, e.h));
    }

    function loop() {
      if (running) update();
      draw();
      if (running) requestAnimationFrame(loop);
    }

    document.addEventListener("keydown", (e) => {
      if (["ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        if (running) e.preventDefault();
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") keys[e.key] = true;
      if (e.key === " " && running && !e.repeat) {
        bullets.push({ x: player.x + player.w / 2, y: player.y });
      }
    });
    document.addEventListener("keyup", (e) => { keys[e.key] = false; });

    // 모바일: ◀ ▶ 버튼은 누르고 있는 동안만 이동시키고(keys 재사용), 발사 버튼은 누를 때마다 한 발씩 쏜다
    const leftBtn = document.getElementById("sh-left");
    const rightBtn = document.getElementById("sh-right");
    const fireBtn = document.getElementById("sh-fire");

    function bindHold(btn, key) {
      const press = (e) => { e.preventDefault(); keys[key] = true; };
      const release = () => { keys[key] = false; };
      btn.addEventListener("touchstart", press, { passive: false });
      btn.addEventListener("touchend", release);
      btn.addEventListener("touchcancel", release);
      btn.addEventListener("mousedown", press);
      btn.addEventListener("mouseup", release);
      btn.addEventListener("mouseleave", release);
    }
    bindHold(leftBtn, "ArrowLeft");
    bindHold(rightBtn, "ArrowRight");

    function fire(e) {
      e.preventDefault();
      if (running) bullets.push({ x: player.x + player.w / 2, y: player.y });
    }
    fireBtn.addEventListener("touchstart", fire, { passive: false });
    fireBtn.addEventListener("mousedown", fire);

    startBtn.addEventListener("click", () => {
      const wasRunning = running;
      newGame();
      running = true;
      updateStatus();
      if (!wasRunning) loop();
    });

    registerGame("panel-sh", {
      init() {
        newGame();
        draw();
      },
      stop() {
        running = false;
      },
    });
  })();
