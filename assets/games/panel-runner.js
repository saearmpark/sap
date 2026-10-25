  (function () {
    const canvas = document.getElementById("runner-canvas");
    const ctx = canvas.getContext("2d");
    const statusEl = document.getElementById("runner-status");
    const startBtn = document.getElementById("runner-start");
    const ground = 150;
    let playerY = ground - 28;
    let velocityY = 0;
    let obstacles = [];
    let score = 0;
    let speed = 4;
    let running = false;
    let animationId = null;
    let lastTime = 0;
    let spawnIn = 0;

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#7c6f64";
      ctx.fillRect(0, ground, canvas.width, 2);
      ctx.fillStyle = "#2563eb";
      ctx.fillRect(48, playerY, 26, 28);
      ctx.fillStyle = "#b42318";
      obstacles.forEach(obstacle => ctx.fillRect(obstacle.x, ground - obstacle.height, obstacle.width, obstacle.height));
      ctx.fillStyle = "#1b1f1d";
      ctx.font = "16px sans-serif";
      ctx.fillText(`점수 ${score}`, 12, 24);
    }

    function jump() {
      if (running && playerY >= ground - 28) velocityY = -360;
    }
    function endGame() {
      running = false;
      cancelAnimationFrame(animationId);
      animationId = null;
      statusEl.textContent = `게임 종료 · 점수 ${score} · 시작을 눌러 다시 도전하세요.`;
      window.reportScore?.("panel-runner", score);
      startBtn.disabled = false;
      draw();
    }
    function frame(time) {
      if (!running) return;
      const delta = Math.min(32, time - lastTime || 16);
      lastTime = time;
      velocityY += 1100 * delta / 1000;
      playerY = Math.min(ground - 28, playerY + velocityY * delta / 1000);
      spawnIn -= delta;
      if (spawnIn <= 0) {
        const height = 22 + Math.random() * 20;
        obstacles.push({ x: canvas.width, width: 18 + Math.random() * 14, height });
        spawnIn = 850 + Math.random() * 750;
      }
      obstacles.forEach(obstacle => { obstacle.x -= speed * delta / 16; });
      obstacles = obstacles.filter(obstacle => obstacle.x + obstacle.width > 0);
      for (const obstacle of obstacles) {
        if (obstacle.x < 74 && obstacle.x + obstacle.width > 48 && playerY + 28 > ground - obstacle.height) {
          endGame();
          return;
        }
      }
      score += delta / 100;
      speed = Math.min(8, 4 + score / 120);
      statusEl.textContent = `달리는 중 · 점수 ${Math.floor(score)}`;
      draw();
      animationId = requestAnimationFrame(frame);
    }
    function start() {
      cancelAnimationFrame(animationId);
      playerY = ground - 28;
      velocityY = 0;
      obstacles = [];
      score = 0;
      speed = 4;
      spawnIn = 650;
      running = true;
      lastTime = 0;
      startBtn.disabled = true;
      statusEl.textContent = "달리는 중 · 화면을 눌러 점프하세요.";
      animationId = requestAnimationFrame(frame);
    }
    function onKeyDown(event) {
      if (document.getElementById("panel-runner").hidden || document.getElementById("game-code-dialog").open) return;
      if (event.code === "Space" || event.key === "ArrowUp") {
        event.preventDefault();
        jump();
      }
    }
    canvas.addEventListener("pointerdown", jump);
    startBtn.addEventListener("click", start);
    document.addEventListener("keydown", onKeyDown);
    registerGame("panel-runner", {
      init() {
        cancelAnimationFrame(animationId);
        animationId = null;
        running = false;
        startBtn.disabled = false;
        statusEl.textContent = "시작을 눌러 게임을 시작하세요.";
        draw();
      },
      stop() {
        running = false;
        cancelAnimationFrame(animationId);
        animationId = null;
        startBtn.disabled = false;
      },
    });
  })();
