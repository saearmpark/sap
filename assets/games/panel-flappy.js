  // ── STEP 48: 플래피 버드 ─────────────────────────────
  (function () {
    const panel = document.getElementById("panel-flappy");
    const canvas = document.getElementById("flappy-canvas");
    const ctx = canvas.getContext("2d");
    const statusEl = document.getElementById("flappy-status");
    const startBtn = document.getElementById("flappy-start");
    const W = canvas.width, H = canvas.height;
    const css = getComputedStyle(document.documentElement);
    const INK = css.getPropertyValue("--ink").trim() || "#1b1f1d";
    const ACCENT = css.getPropertyValue("--accent").trim() || "#3f6650";

    const GRAVITY = 0.42, FLAP = -6.9, PIPE_W = 58, GAP = 150;
    let bird, pipes, score, spawnTimer, speed, running, rafId;

    function reset() {
      bird = { x: 92, y: H / 2, vy: 0, r: 13 };
      pipes = [];
      score = 0;
      spawnTimer = 40;
      speed = 2.4;
      running = false;
    }

    function spawnPipe() {
      const margin = 64;
      const top = margin + Math.random() * (H - GAP - margin * 2);
      pipes.push({ x: W, top, scored: false });
    }

    function flap() {
      if (running) bird.vy = FLAP;
    }

    function update() {
      bird.vy += GRAVITY;
      bird.y += bird.vy;
      if (bird.y < bird.r) { bird.y = bird.r; bird.vy = 0; }

      spawnTimer--;
      if (spawnTimer <= 0) { spawnPipe(); spawnTimer = 96; }
      for (const p of pipes) p.x -= speed;
      while (pipes.length && pipes[0].x + PIPE_W < 0) pipes.shift();

      const first = pipes[0];
      if (first && !first.scored && first.x + PIPE_W < bird.x) {
        first.scored = true;
        score++;
        speed = Math.min(4.4, 2.4 + score * 0.05);
        statusEl.textContent = `점수 ${score}`;
      }

      if (bird.y + bird.r > H) return gameOver();
      for (const p of pipes) {
        if (bird.x + bird.r > p.x && bird.x - bird.r < p.x + PIPE_W) {
          if (bird.y - bird.r < p.top || bird.y + bird.r > p.top + GAP) return gameOver();
        }
      }
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = ACCENT;
      for (const p of pipes) {
        ctx.fillRect(p.x, 0, PIPE_W, p.top);
        ctx.fillRect(p.x, p.top + GAP, PIPE_W, H - (p.top + GAP));
      }
      ctx.beginPath();
      ctx.arc(bird.x, bird.y, bird.r, 0, Math.PI * 2);
      ctx.fillStyle = "#e4b543";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = INK;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(bird.x + 4, bird.y - 4, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = INK;
      ctx.fill();
    }

    function loop() {
      if (!running) return;
      update();
      draw();
      if (running) rafId = requestAnimationFrame(loop);
    }

    function stopLoop() {
      running = false;
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    }

    function gameOver() {
      const finalScore = score;
      stopLoop();
      window.reportScore?.("panel-flappy", finalScore);
      statusEl.textContent = `게임 오버 · 점수 ${finalScore} — 시작 버튼으로 다시`;
    }

    function startGame() {
      reset();
      running = true;
      statusEl.textContent = "점수 0";
      if (rafId) cancelAnimationFrame(rafId);
      loop();
    }

    startBtn.addEventListener("click", startGame);
    canvas.addEventListener("mousedown", (e) => { e.preventDefault(); flap(); });
    canvas.addEventListener("touchstart", (e) => { e.preventDefault(); flap(); }, { passive: false });
    document.addEventListener("keydown", (e) => {
      if (e.code !== "Space" || panel.hidden) return;
      e.preventDefault();
      if (running) flap();
      else startGame();
    });

    reset();
    draw();
    registerGame("panel-flappy", {
      init() {
        stopLoop();
        reset();
        draw();
        statusEl.textContent = "시작 버튼을 눌러주세요.";
      },
      stop: stopLoop,
    });
  })();
