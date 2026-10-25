  // ── STEP 11: 똥피하기 ─────────────────────────────
  (function () {
    const canvas = document.getElementById("dodge-canvas");
    const ctx = canvas.getContext("2d");
    const statusEl = document.getElementById("dodge-status");
    const startBtn = document.getElementById("dodge-start");

    const W = canvas.width, H = canvas.height;
    const PLAYER_SIZE = 40, PLAYER_SPEED = 8, PLAYER_Y = H - 60;

    let player, drops, elapsed, spawnTimer, score, running = false;
    const keys = {};

    function newGame() {
      player = { x: W / 2 - PLAYER_SIZE / 2 };
      drops = [];
      elapsed = 0;
      spawnTimer = 0;
      score = 0;
    }

    // 시간이 지날수록 더 자주(간격이 줄어듦), 더 빠르게 떨어진다
    function spawnInterval() {
      return Math.max(16, 55 - Math.floor(elapsed / 150));
    }
    function dropSpeed() {
      return 2.5 + elapsed / 500;
    }

    function updateStatus(text) {
      statusEl.textContent = text || `버틴 시간 ${(elapsed / 60).toFixed(1)}초 · 점수 ${score}`;
    }

    function update() {
      elapsed++;

      if (keys.ArrowLeft) player.x -= PLAYER_SPEED;
      if (keys.ArrowRight) player.x += PLAYER_SPEED;
      player.x = Math.max(0, Math.min(W - PLAYER_SIZE, player.x));

      spawnTimer++;
      if (spawnTimer >= spawnInterval()) {
        spawnTimer = 0;
        const size = 24 + Math.random() * 14;
        drops.push({ x: Math.random() * (W - size), y: -size, size, speed: dropSpeed() + Math.random() * 1.5 });
      }

      drops.forEach(d => (d.y += d.speed));
      drops = drops.filter(d => d.y < H + 40);

      // 충돌 판정: 플레이어와 각 💩의 중심 사이 거리로 원끼리 겹치는지 확인한다
      const pcx = player.x + PLAYER_SIZE / 2, pcy = PLAYER_Y + PLAYER_SIZE / 2;
      for (const d of drops) {
        const dcx = d.x + d.size / 2, dcy = d.y + d.size / 2;
        const dist = Math.hypot(pcx - dcx, pcy - dcy);
        if (dist < PLAYER_SIZE * 0.38 + d.size * 0.38) {
          running = false;
          window.reportScore?.("panel-dodge", score);
          updateStatus(`게임 오버 · 버틴 시간 ${(elapsed / 60).toFixed(1)}초 · 점수 ${score} (시작 버튼으로 재시작)`);
          return;
        }
      }

      score = Math.floor(elapsed / 6); // 대략 초당 10점
      updateStatus();
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.font = "32px serif";
      drops.forEach(d => ctx.fillText("💩", d.x + d.size / 2, d.y + d.size / 2));

      ctx.font = `${PLAYER_SIZE}px serif`;
      ctx.fillText("🙂", player.x + PLAYER_SIZE / 2, PLAYER_Y + PLAYER_SIZE / 2);
    }

    function loop() {
      if (running) update();
      draw();
      if (running) requestAnimationFrame(loop);
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        keys[e.key] = true;
        if (running) e.preventDefault();
      }
    });
    document.addEventListener("keyup", (e) => { keys[e.key] = false; });

    // 모바일: 캔버스를 손가락으로 누른 채 움직이면 그 x좌표를 그대로 플레이어 위치로 쓴다 (벽돌깨기와 같은 방식)
    function handleTouch(e) {
      e.preventDefault();
      const touch = e.touches[0];
      if (!touch) return;
      const rect = canvas.getBoundingClientRect();
      const x = (touch.clientX - rect.left) * (W / rect.width);
      player.x = Math.max(0, Math.min(W - PLAYER_SIZE, x - PLAYER_SIZE / 2));
    }
    canvas.addEventListener("touchstart", handleTouch, { passive: false });
    canvas.addEventListener("touchmove", handleTouch, { passive: false });

    startBtn.addEventListener("click", () => {
      const wasRunning = running;
      newGame();
      running = true;
      updateStatus();
      if (!wasRunning) loop();
    });

    registerGame("panel-dodge", {
      init() {
        newGame();
        updateStatus("시작 버튼을 눌러주세요");
        draw();
      },
      stop() {
        running = false;
      },
    });
  })();
