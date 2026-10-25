  // ── STEP 2: 벽돌깨기 ─────────────────────────────
  (function () {
    const canvas = document.getElementById("bo-canvas");
    const ctx = canvas.getContext("2d");
    const statusEl = document.getElementById("bo-status");
    const startBtn = document.getElementById("bo-start");

    const W = canvas.width, H = canvas.height;
    const COLS = 8, BW = 50, BH = 16, GAP = 8, TOP = 30;
    const LEFT = (W - (COLS * BW + (COLS - 1) * GAP)) / 2;
    const css = getComputedStyle(document.documentElement);
    const ACCENT = css.getPropertyValue("--accent").trim() || "#3f6650";
    const INK = css.getPropertyValue("--ink").trim() || "#1b1f1d";

    const paddle = { w: 80, h: 10, x: W / 2 - 40, speed: 6 };
    let ball, bricks, score, lives, stage, running = false;
    const keys = {};

    // 스테이지가 올라갈수록 벽돌 줄 수가 늘고(최대 7줄), 공도 조금씩 빨라진다(최대 2배)
    function rowsForStage(s) { return Math.min(4 + (s - 1), 7); }
    function speedMultiplier(s) { return Math.min(2, 1 + (s - 1) * 0.15); }

    function resetBall() {
      const m = speedMultiplier(stage);
      ball = { x: W / 2, y: H - 40, dx: 3 * m, dy: -3 * m, r: 6 };
    }

    function createBricks() {
      bricks = [];
      const rows = rowsForStage(stage);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < COLS; c++) {
          bricks.push({ x: LEFT + c * (BW + GAP), y: TOP + r * (BH + GAP), alive: true });
        }
      }
    }

    function newGame() {
      stage = 1;
      score = 0;
      lives = 3;
      createBricks();
      paddle.x = W / 2 - paddle.w / 2;
      resetBall();
    }

    function nextStage() {
      stage++;
      createBricks();
      resetBall();
      paddle.x = W / 2 - paddle.w / 2;
    }

    function updateStatus(text) {
      statusEl.textContent = text || `스테이지 ${stage} · 점수 ${score} · 목숨 ${lives}`;
    }

    function update() {
      // 패들 이동 (키보드)
      if (keys.ArrowLeft) paddle.x -= paddle.speed;
      if (keys.ArrowRight) paddle.x += paddle.speed;
      paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));

      // 공 이동
      ball.x += ball.dx;
      ball.y += ball.dy;

      // 벽 충돌
      if (ball.x - ball.r < 0 || ball.x + ball.r > W) ball.dx *= -1;
      if (ball.y - ball.r < 0) ball.dy *= -1;

      // 패들 충돌: 맞은 위치에 따라 튕기는 각도를 바꾼다
      const py = H - 20 - paddle.h;
      if (ball.dy > 0 && ball.y + ball.r >= py && ball.y + ball.r <= py + paddle.h + 6 &&
          ball.x >= paddle.x && ball.x <= paddle.x + paddle.w) {
        const hit = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2); // -1 ~ 1
        ball.dx = hit * 4;
        ball.dy = -Math.abs(ball.dy);
      }

      // 벽돌 충돌
      for (const b of bricks) {
        if (!b.alive) continue;
        if (ball.x > b.x && ball.x < b.x + BW && ball.y - ball.r < b.y + BH && ball.y + ball.r > b.y) {
          b.alive = false;
          ball.dy *= -1;
          score += 10;
          break;
        }
      }

      // 바닥에 떨어짐
      if (ball.y - ball.r > H) {
        lives--;
        if (lives <= 0) {
          running = false;
          window.reportScore?.("panel-bo", score);
          updateStatus(`게임 오버 · 최종 점수 ${score}`);
          return;
        }
        resetBall();
      }

      // 이 스테이지의 벽돌을 모두 깨면, 멈추지 않고 더 어려운 다음 스테이지로 바로 이어간다
      if (bricks.every(b => !b.alive)) {
        nextStage();
        updateStatus(`스테이지 ${stage} 시작! 점수 ${score}`);
        return;
      }
      updateStatus();
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);

      ctx.fillStyle = ACCENT;
      for (const b of bricks) {
        if (b.alive) ctx.fillRect(b.x, b.y, BW, BH);
      }

      ctx.fillStyle = INK;
      ctx.fillRect(paddle.x, H - 20 - paddle.h, paddle.w, paddle.h);

      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 게임 루프: 갱신 → 그리기 → 다음 프레임 예약
    function loop() {
      if (running) update();
      draw();
      if (running) requestAnimationFrame(loop);
    }

    canvas.addEventListener("mousemove", (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (W / rect.width);
      paddle.x = Math.max(0, Math.min(W - paddle.w, x - paddle.w / 2));
    });

    // 모바일: 캔버스를 손가락으로 누른 채 움직이면 그 x좌표를 그대로 패들 위치로 쓴다 (mousemove와 같은 로직)
    function handleTouch(e) {
      e.preventDefault(); // 화면이 같이 스크롤되는 것을 막는다
      const touch = e.touches[0];
      if (!touch) return;
      const rect = canvas.getBoundingClientRect();
      const x = (touch.clientX - rect.left) * (W / rect.width);
      paddle.x = Math.max(0, Math.min(W - paddle.w, x - paddle.w / 2));
    }
    canvas.addEventListener("touchstart", handleTouch, { passive: false });
    canvas.addEventListener("touchmove", handleTouch, { passive: false });

    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        keys[e.key] = true;
        if (running) e.preventDefault();
      }
    });
    document.addEventListener("keyup", (e) => { keys[e.key] = false; });

    startBtn.addEventListener("click", () => {
      const wasRunning = running;  // 이미 루프가 돌고 있으면 새로 시작하지 않는다
      newGame();
      running = true;
      updateStatus();
      if (!wasRunning) loop();
    });

    registerGame("panel-bo", {
      init() {
        newGame();
        draw();
      },
      stop() {
        running = false;  // loop()가 다음 프레임에 requestAnimationFrame을 다시 걸지 않게 된다
      },
    });
  })();
