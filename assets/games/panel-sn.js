  // ── STEP 5: 스네이크 ─────────────────────────────
  (function () {
    const canvas = document.getElementById("sn-canvas");
    const ctx = canvas.getContext("2d");
    const statusEl = document.getElementById("sn-status");
    const startBtn = document.getElementById("sn-start");

    const CELL = 20;
    const COLS = 20, ROWS = 20;
    const css = getComputedStyle(document.documentElement);
    const ACCENT = css.getPropertyValue("--accent").trim() || "#3f6650";
    const INK = css.getPropertyValue("--ink").trim() || "#1b1f1d";

    let snake, dir, nextDir, food, score, running, tickHandle;

    function randomFood() {
      let pos;
      do {
        pos = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
      } while (snake.some(s => s.x === pos.x && s.y === pos.y));
      return pos;
    }

    function newGame() {
      snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
      dir = { x: 1, y: 0 };
      nextDir = { x: 1, y: 0 };
      score = 0;
      food = randomFood();
    }

    function updateStatus(text) {
      statusEl.textContent = text || `점수 ${score}`;
    }

    function gameOver() {
      running = false;
      clearInterval(tickHandle);
      window.reportScore?.("panel-sn", score);
      updateStatus(`게임 오버 · 최종 점수 ${score} (시작 버튼으로 재시작)`);
    }

    function update() {
      dir = nextDir;
      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

      // 벽 충돌
      if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
        gameOver();
        return;
      }
      // 자기 몸 충돌
      if (snake.some(s => s.x === head.x && s.y === head.y)) {
        gameOver();
        return;
      }

      snake.unshift(head);

      // 사과를 먹으면 꼬리를 그대로 두어(=안 자르기) 몸이 길어지고, 아니면 꼬리를 잘라 길이를 유지한다
      if (head.x === food.x && head.y === food.y) {
        score += 10;
        food = randomFood();
      } else {
        snake.pop();
      }

      updateStatus();
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = ACCENT;
      ctx.fillRect(food.x * CELL, food.y * CELL, CELL - 1, CELL - 1);

      ctx.fillStyle = INK;
      snake.forEach(s => ctx.fillRect(s.x * CELL, s.y * CELL, CELL - 1, CELL - 1));
    }

    function loop() {
      update();
      draw();
    }

    document.addEventListener("keydown", (e) => {
      if (!running) return;
      const map = {
        ArrowUp: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
      };
      const d = map[e.key];
      if (!d) return;
      e.preventDefault();
      // 반대 방향으로 즉시 꺾어서 자기 몸으로 바로 들어가는 것을 막는다
      if (d.x === -dir.x && d.y === -dir.y) return;
      nextDir = d;
    });

    // 모바일: 방향 버튼도 키보드와 같은 로직(반대 방향 무시)을 그대로 쓴다
    function trySetDir(d) {
      if (!running) return;
      if (d.x === -dir.x && d.y === -dir.y) return;
      nextDir = d;
    }
    function bindDirButton(id, d) {
      const btn = document.getElementById(id);
      const press = (e) => { e.preventDefault(); trySetDir(d); };
      btn.addEventListener("touchstart", press, { passive: false });
      btn.addEventListener("mousedown", press);
    }
    bindDirButton("sn-up", { x: 0, y: -1 });
    bindDirButton("sn-down", { x: 0, y: 1 });
    bindDirButton("sn-left", { x: -1, y: 0 });
    bindDirButton("sn-right", { x: 1, y: 0 });

    startBtn.addEventListener("click", () => {
      clearInterval(tickHandle);
      newGame();
      running = true;
      updateStatus();
      draw();
      tickHandle = setInterval(loop, 120);
    });

    registerGame("panel-sn", {
      init() {
        newGame();
        running = false;
        clearInterval(tickHandle);
        updateStatus("시작 버튼을 눌러주세요");
        draw();
      },
      stop() {
        running = false;
        clearInterval(tickHandle);
      },
    });
  })();
