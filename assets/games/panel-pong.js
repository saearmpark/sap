  // ── STEP 9: 퐁 / 탁구 ─────────────────────────────
  (function () {
    const canvas = document.getElementById("pong-canvas");
    const ctx = canvas.getContext("2d");
    const statusEl = document.getElementById("pong-status");
    const startBtn = document.getElementById("pong-start");
    const timerEl = document.getElementById("pong-timer");

    const W = canvas.width, H = canvas.height;
    const PADDLE_W = 10, PADDLE_H = 70, PADDLE_SPEED = 6;
    const css = getComputedStyle(document.documentElement);
    const INK = css.getPropertyValue("--ink").trim() || "#1b1f1d";

    const BASE_SPEED = 4;
    const MAX_SPEED = 11; // 너무 빨라져서 못 쫓아가는 지경까지 가지 않도록 상한을 둔다

    let ball, p1, p2, running = false, animId = null, timerHandle = null, elapsedSec = 0;
    const keys = {};

    function newGame() {
      ball = { x: W / 2, y: H / 2, dx: BASE_SPEED, dy: BASE_SPEED, r: 6 };
      p1 = { y: H / 2 - PADDLE_H / 2 };
      p2 = { y: H / 2 - PADDLE_H / 2 };
      elapsedSec = 0;
    }

    // 패들에 맞을 때마다 속도를 조금씩 올려서(최대 MAX_SPEED까지) 랠리가 길어질수록 어려워지게 한다
    function speedUp() {
      const mag = Math.hypot(ball.dx, ball.dy);
      const newMag = Math.min(MAX_SPEED, mag * 1.08);
      const factor = newMag / mag;
      ball.dx *= factor;
      ball.dy *= factor;
    }

    function updateStatus(text) {
      statusEl.textContent = text || "게임 진행 중...";
    }

    function formatTime(sec) {
      const m = Math.floor(sec / 60).toString().padStart(2, "0");
      const s = (sec % 60).toString().padStart(2, "0");
      return `${m}:${s}`;
    }

    function update() {
      if (keys.ArrowUp) p1.y -= PADDLE_SPEED;
      if (keys.ArrowDown) p1.y += PADDLE_SPEED;
      p1.y = Math.max(0, Math.min(H - PADDLE_H, p1.y));

      // AI: 플레이어와 같은 최대 속도로 공을 따라간다 (공이 자기 쪽으로 올 때만 반응해서
      // 너무 완벽하지는 않지만, 속도 자체는 플레이어와 동일하게 맞춘다)
      if (ball.dx > 0) {
        const target = ball.y - PADDLE_H / 2;
        const diff = target - p2.y;
        if (Math.abs(diff) < PADDLE_SPEED) p2.y = target;
        else p2.y += Math.sign(diff) * PADDLE_SPEED;
      }
      p2.y = Math.max(0, Math.min(H - PADDLE_H, p2.y));

      ball.x += ball.dx;
      ball.y += ball.dy;

      if (ball.y - ball.r < 0 || ball.y + ball.r > H) ball.dy *= -1;

      if (ball.dx < 0 && ball.x - ball.r <= PADDLE_W && ball.y >= p1.y && ball.y <= p1.y + PADDLE_H) {
        ball.dx = Math.abs(ball.dx);
        speedUp();
      }
      if (ball.dx > 0 && ball.x + ball.r >= W - PADDLE_W && ball.y >= p2.y && ball.y <= p2.y + PADDLE_H) {
        ball.dx = -Math.abs(ball.dx);
        speedUp();
      }

      if (ball.x < 0) {
        running = false;
        updateStatus("AI 승리! (다시 시작하려면 시작 버튼)");
        return;
      }
      if (ball.x > W) {
        running = false;
        updateStatus("플레이어 승리! (다시 시작하려면 시작 버튼)");
        return;
      }
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = INK;
      ctx.fillRect(0, p1.y, PADDLE_W, PADDLE_H);
      ctx.fillRect(W - PADDLE_W, p2.y, PADDLE_W, PADDLE_H);
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fill();
    }

    function loop() {
      if (running) update();
      draw();
      if (running) animId = requestAnimationFrame(loop);
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        keys[e.key] = true;
        if (running) e.preventDefault();
      }
    });
    document.addEventListener("keyup", (e) => { keys[e.key] = false; });

    // 모바일: ▲▼ 버튼을 누르고 있는 동안 이동한다
    function bindHold(id, key) {
      const btn = document.getElementById(id);
      const press = (e) => { e.preventDefault(); keys[key] = true; };
      const release = () => { keys[key] = false; };
      btn.addEventListener("touchstart", press, { passive: false });
      btn.addEventListener("touchend", release);
      btn.addEventListener("touchcancel", release);
      btn.addEventListener("mousedown", press);
      btn.addEventListener("mouseup", release);
      btn.addEventListener("mouseleave", release);
    }
    bindHold("pong-up", "ArrowUp");
    bindHold("pong-down", "ArrowDown");

    startBtn.addEventListener("click", () => {
      cancelAnimationFrame(animId);
      newGame();
      running = true;
      updateStatus();
      clearInterval(timerHandle);
      timerEl.textContent = "00:00";
      timerHandle = setInterval(() => {
        elapsedSec++;
        timerEl.textContent = formatTime(elapsedSec);
      }, 1000);
      draw();
      animId = requestAnimationFrame(loop);
    });

    registerGame("panel-pong", {
      init() {
        newGame();
        running = false;
        cancelAnimationFrame(animId);
        clearInterval(timerHandle);
        timerEl.textContent = "00:00";
        updateStatus("시작 버튼을 눌러주세요");
        draw();
      },
      stop() {
        running = false;
        cancelAnimationFrame(animId);
        clearInterval(timerHandle);
      },
    });
  })();
