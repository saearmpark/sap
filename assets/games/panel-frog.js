  // ── STEP 45: 개구리 건너기 ─────────────────────────────
  (function () {
    const canvas = document.getElementById("frog-canvas");
    const ctx = canvas.getContext("2d");
    const panelEl = document.getElementById("panel-frog");
    const statusEl = document.getElementById("frog-status");
    const scoreEl = document.getElementById("frog-score");
    const livesEl = document.getElementById("frog-lives");
    const levelEl = document.getElementById("frog-level");
    const timeEl = document.getElementById("frog-time");
    const startBtn = document.getElementById("frog-start");

    const TILE = 30;
    const COLS = canvas.width / TILE;
    const ROWS = canvas.height / TILE;
    const GOAL_ROW = 0;
    const START_ROW = ROWS - 1;
    const WATER_ROWS = [1, 2, 3, 4, 5];
    const MEDIAN_ROW = 6;
    const ROAD_ROWS = [7, 8, 9, 10, 11];
    const GOAL_COLS = [0, 3, 6, 9, 12];
    const LIVES_PER_GAME = 4;
    const LIFE_SECONDS = 60;
    const WATER_CONFIG = [
      { count: 2, w: 150, speed: 52, dir: 1, turtle: false },
      { count: 3, w: 84, speed: 60, dir: -1, turtle: true },
      { count: 2, w: 130, speed: 46, dir: 1, turtle: false },
      { count: 3, w: 80, speed: 66, dir: -1, turtle: true },
      { count: 2, w: 140, speed: 58, dir: 1, turtle: false },
    ];
    const ROAD_CONFIG = [
      { count: 2, w: 72, speed: 88, dir: -1, color: "#f59e0b" },
      { count: 3, w: 54, speed: 68, dir: 1, color: "#ef4444" },
      { count: 2, w: 92, speed: 108, dir: -1, color: "#e5e7eb" },
      { count: 3, w: 60, speed: 78, dir: 1, color: "#22c55e" },
      { count: 2, w: 82, speed: 98, dir: -1, color: "#a855f7" },
    ];

    let platforms = [];
    let cars = [];
    let goals = {};
    let frog = null;
    let score = 0;
    let lives = LIVES_PER_GAME;
    let level = 1;
    let speedScale = 1;
    let timeLeft = LIFE_SECONDS;
    let furthestRow = START_ROW;
    let freeze = 0;
    let running = false;
    let animationId = null;
    let lastTime = 0;

    function colCenter(col) { return col * TILE + TILE / 2; }
    function rowCenter(row) { return row * TILE + TILE / 2; }
    function currentCol() {
      return Math.max(0, Math.min(COLS - 1, Math.round((frog.x - TILE / 2) / TILE)));
    }
    function buildLanes() {
      platforms = WATER_ROWS.map((row, index) => {
        const config = WATER_CONFIG[index];
        const gap = canvas.width / config.count;
        const items = [];
        for (let k = 0; k < config.count; k++) {
          items.push({ x: k * gap + (gap - config.w) / 2, w: config.w, turtle: config.turtle });
        }
        return { row, dir: config.dir, speed: config.speed * speedScale, items };
      });
      cars = ROAD_ROWS.map((row, index) => {
        const config = ROAD_CONFIG[index];
        const gap = canvas.width / config.count;
        const items = [];
        for (let k = 0; k < config.count; k++) {
          items.push({ x: k * gap + (gap - config.w) / 2, w: config.w });
        }
        return { row, dir: config.dir, speed: config.speed * speedScale, color: config.color, items };
      });
    }
    function moveItems(lane, dt) {
      for (const item of lane.items) {
        item.x += lane.dir * lane.speed * dt;
        if (lane.dir > 0 && item.x > canvas.width) item.x = -item.w;
        if (lane.dir < 0 && item.x + item.w < 0) item.x = canvas.width;
      }
    }
    function resetGoals() {
      goals = {};
      GOAL_COLS.forEach(col => { goals[col] = false; });
    }
    function resetFrog() {
      frog = { col: Math.floor(COLS / 2), row: START_ROW, x: colCenter(Math.floor(COLS / 2)), hop: 0 };
      timeLeft = LIFE_SECONDS;
      furthestRow = START_ROW;
    }
    function updateHud() {
      scoreEl.textContent = score;
      livesEl.textContent = Math.max(0, lives);
      levelEl.textContent = level;
      timeEl.textContent = Math.max(0, Math.ceil(timeLeft));
    }
    function newGame() {
      score = 0;
      lives = LIVES_PER_GAME;
      level = 1;
      speedScale = 1;
      freeze = 0;
      resetGoals();
      buildLanes();
      resetFrog();
      updateHud();
    }
    function frogRide(dt) {
      if (!WATER_ROWS.includes(frog.row)) return;
      const lane = platforms.find(item => item.row === frog.row);
      if (!lane) return;
      const carrier = lane.items.find(item => frog.x >= item.x && frog.x <= item.x + item.w);
      if (!carrier) { die("물에 빠졌습니다!"); return; }
      frog.x += lane.dir * lane.speed * dt;
      if (frog.x < -TILE * 0.5 || frog.x > canvas.width + TILE * 0.5) die("물에 빠졌습니다!");
    }
    function carHit() {
      if (!ROAD_ROWS.includes(frog.row)) return false;
      const lane = cars.find(item => item.row === frog.row);
      if (!lane) return false;
      const half = TILE * 0.34;
      return lane.items.some(item => frog.x + half > item.x && frog.x - half < item.x + item.w);
    }
    function fillGoal(col) {
      goals[col] = true;
      score += 50;
      if (GOAL_COLS.every(item => goals[item])) {
        levelComplete();
        return;
      }
      resetFrog();
      updateHud();
      statusEl.textContent = "골인! 다음 목표 지점으로 이동하세요.";
    }
    function levelComplete() {
      level++;
      score += 200;
      speedScale = 1 + (level - 1) * 0.18;
      resetGoals();
      buildLanes();
      resetFrog();
      updateHud();
      statusEl.textContent = `${level}단계 시작! 속도가 빨라집니다.`;
    }
    function die(message) {
      if (freeze > 0) return;
      lives--;
      updateHud();
      if (lives <= 0) { finish(false); return; }
      freeze = 1;
      resetFrog();
      statusEl.textContent = `${message} 남은 목숨 ${lives}개.`;
    }
    function finish(win) {
      running = false;
      cancelAnimationFrame(animationId);
      animationId = null;
      startBtn.disabled = false;
      startBtn.textContent = "다시 시작";
      statusEl.textContent = win
        ? `승리! 점수 ${score}점.`
        : `게임 오버! 점수 ${score}점. 다시 도전해 보세요.`;
      window.reportScore?.("panel-frog", score);
      updateHud();
    }
    function tryMove(dx, dy) {
      if (!running || freeze > 0 || !frog) return;
      if (dx !== 0) {
        const col = currentCol() + dx;
        if (col < 0 || col >= COLS) return;
        frog.col = col;
        frog.x = colCenter(col);
        frog.hop = 1;
        return;
      }
      const row = frog.row + dy;
      const col = currentCol();
      if (row < 0 || row >= ROWS) return;
      if (row === GOAL_ROW) {
        if (!GOAL_COLS.includes(col) || goals[col]) return;
        frog.row = row;
        frog.col = col;
        frog.x = colCenter(col);
        frog.hop = 1;
        fillGoal(col);
        return;
      }
      frog.row = row;
      frog.col = col;
      frog.hop = 1;
      if (row < furthestRow) {
        furthestRow = row;
        score += 10;
        updateHud();
      }
    }
    function frame(time) {
      if (!running) return;
      const dt = Math.min((time - lastTime) / 1000 || 0, 0.05);
      lastTime = time;
      if (freeze > 0) {
        freeze -= dt;
      } else {
        for (const lane of platforms) moveItems(lane, dt);
        for (const lane of cars) moveItems(lane, dt);
        frogRide(dt);
        if (running && carHit()) die("자동차에 치였습니다!");
        if (running && freeze <= 0) {
          timeLeft -= dt;
          if (timeLeft <= 0) die("시간 초과!");
        }
        if (frog.hop > 0) frog.hop = Math.max(0, frog.hop - dt * 8);
        updateHud();
      }
      draw();
      if (running) animationId = requestAnimationFrame(frame);
    }
    function draw() {
      ctx.fillStyle = "#0b1020";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#14532d";
      ctx.fillRect(0, GOAL_ROW * TILE, canvas.width, TILE);
      for (const col of GOAL_COLS) {
        ctx.fillStyle = goals[col] ? "#facc15" : "#0369a1";
        ctx.beginPath();
        ctx.roundRect(col * TILE + 3, 3, TILE - 6, TILE - 6, 6);
        ctx.fill();
        if (goals[col]) {
          ctx.fillStyle = "#22c55e";
          ctx.beginPath();
          ctx.arc(colCenter(col), TILE / 2, TILE * 0.24, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.fillStyle = "#0369a1";
      ctx.fillRect(0, WATER_ROWS[0] * TILE, canvas.width, WATER_ROWS.length * TILE);
      ctx.fillStyle = "#475569";
      ctx.fillRect(0, MEDIAN_ROW * TILE, canvas.width, TILE);
      ctx.fillStyle = "#111827";
      ctx.fillRect(0, ROAD_ROWS[0] * TILE, canvas.width, ROAD_ROWS.length * TILE);
      ctx.fillStyle = "#14532d";
      ctx.fillRect(0, START_ROW * TILE, canvas.width, TILE);
      ctx.strokeStyle = "#f8fafc88";
      ctx.lineWidth = 2;
      for (let index = 1; index < ROAD_ROWS.length; index++) {
        const y = (ROAD_ROWS[0] + index) * TILE;
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      for (const lane of platforms) {
        const y = rowCenter(lane.row);
        for (const item of lane.items) {
          if (item.turtle) {
            ctx.fillStyle = "#15803d";
            const shells = Math.max(2, Math.round(item.w / 22));
            for (let s = 0; s < shells; s++) {
              ctx.beginPath();
              ctx.arc(item.x + (s + 0.5) * (item.w / shells), y, TILE * 0.28, 0, Math.PI * 2);
              ctx.fill();
            }
          } else {
            ctx.fillStyle = "#92400e";
            ctx.beginPath();
            ctx.roundRect(item.x, y - TILE * 0.28, item.w, TILE * 0.56, 8);
            ctx.fill();
          }
        }
      }
      for (const lane of cars) {
        const y = rowCenter(lane.row);
        for (const item of lane.items) {
          ctx.fillStyle = lane.color;
          ctx.beginPath();
          ctx.roundRect(item.x, y - TILE * 0.3, item.w, TILE * 0.6, 6);
          ctx.fill();
          ctx.fillStyle = "#0f172a";
          ctx.beginPath();
          ctx.roundRect(item.x + item.w * 0.28, y - TILE * 0.22, item.w * 0.34, TILE * 0.44, 4);
          ctx.fill();
        }
      }
      const radius = TILE * 0.34 * (1 + frog.hop * 0.3);
      const fx = frog.x;
      const fy = rowCenter(frog.row);
      ctx.fillStyle = "#22c55e";
      ctx.beginPath();
      ctx.ellipse(fx, fy, radius, radius * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(fx - radius * 0.35, fy - radius * 0.4, radius * 0.28, 0, Math.PI * 2);
      ctx.arc(fx + radius * 0.35, fy - radius * 0.4, radius * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#111827";
      ctx.beginPath();
      ctx.arc(fx - radius * 0.35, fy - radius * 0.45, radius * 0.13, 0, Math.PI * 2);
      ctx.arc(fx + radius * 0.35, fy - radius * 0.45, radius * 0.13, 0, Math.PI * 2);
      ctx.fill();
    }
    function start() {
      newGame();
      running = true;
      freeze = 0;
      lastTime = performance.now();
      startBtn.disabled = true;
      startBtn.textContent = "다시 시작";
      statusEl.textContent = "방향키나 W/A/S/D로 이동해 목표 지점에 골인하세요!";
      cancelAnimationFrame(animationId);
      animationId = requestAnimationFrame(frame);
    }
    const KEY_DIRS = {
      arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1],
      arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0],
    };
    document.addEventListener("keydown", event => {
      if (panelEl.hidden) return;
      const dir = KEY_DIRS[event.key.toLowerCase()];
      if (!dir) return;
      event.preventDefault();
      tryMove(dir[0], dir[1]);
    });
    document.getElementById("frog-up").addEventListener("pointerdown", () => tryMove(0, -1));
    document.getElementById("frog-down").addEventListener("pointerdown", () => tryMove(0, 1));
    document.getElementById("frog-left").addEventListener("pointerdown", () => tryMove(-1, 0));
    document.getElementById("frog-right").addEventListener("pointerdown", () => tryMove(1, 0));
    startBtn.addEventListener("click", start);

    registerGame("panel-frog", {
      init() {
        running = false;
        cancelAnimationFrame(animationId);
        animationId = null;
        newGame();
        startBtn.disabled = false;
        startBtn.textContent = "시작";
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
