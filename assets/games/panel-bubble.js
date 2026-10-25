  // ── STEP 49: 버블 슈터 ─────────────────────────────
  (function () {
    const panel = document.getElementById("panel-bubble");
    const canvas = document.getElementById("bubble-canvas");
    const ctx = canvas.getContext("2d");
    const statusEl = document.getElementById("bubble-status");
    const startBtn = document.getElementById("bubble-start");
    const W = canvas.width, H = canvas.height;
    const R = 16, D = 2 * R, COLS = 12, ROW_H = Math.round(Math.sqrt(3) * R);
    const COLORS = ["#e74c3c", "#3498db", "#2ecc71", "#f1c40f", "#9b59b6"];
    const SHOOTER = { x: W / 2, y: H - 26 };
    const DEATH_ROW = 15;
    const SPEED = 9;

    let grid, current, next, ball, score, shots, running, gameOver, rafId, aim;

    const cellX = (row, col) => R + col * D + (row % 2) * R;
    const cellY = (row) => R + row * ROW_H;

    function reset() {
      grid = [];
      for (let r = 0; r < 6; r++) {
        const row = [];
        for (let c = 0; c < COLS; c++) row.push(Math.floor(Math.random() * COLORS.length));
        grid.push(row);
      }
      current = pick();
      next = pick();
      ball = null;
      score = 0;
      shots = 0;
      running = false;
      gameOver = false;
      aim = 0;
    }

    function pick() { return Math.floor(Math.random() * COLORS.length); }

    function occupied(row, col) {
      return row >= 0 && row < grid.length && col >= 0 && col < COLS && grid[row][col] !== null && grid[row][col] !== undefined;
    }

    function neighbors(row, col) {
      const out = [[row, col - 1], [row, col + 1]];
      const cols = (row % 2 === 0) ? [col - 1, col] : [col, col + 1];
      for (const c of cols) { out.push([row - 1, c]); out.push([row + 1, c]); }
      return out.filter(([r, c]) => r >= 0 && r < grid.length && c >= 0 && c < COLS);
    }

    function shoot() {
      if (!running || gameOver || ball) return;
      ball = { x: SHOOTER.x, y: SHOOTER.y, vx: Math.sin(aim) * SPEED, vy: -Math.cos(aim) * SPEED, color: current };
      current = next;
      next = pick();
    }

    function snap(hitRow, hitCol) {
      let best = null, bestD = Infinity;
      const candidates = hitRow === null ? [] : neighbors(hitRow, hitCol);
      if (hitRow === null) for (let c = 0; c < COLS; c++) candidates.push([0, c]);
      for (const [r, c] of candidates) {
        if (occupied(r, c)) continue;
        const dx = cellX(r, c) - ball.x, dy = cellY(r) - ball.y;
        const d = dx * dx + dy * dy;
        if (d < bestD) { bestD = d; best = [r, c]; }
      }
      if (!best) {
        const maxRow = Math.max(grid.length, (hitRow ?? 0) + 1);
        for (let r = 0; r <= maxRow; r++) {
          for (let c = 0; c < COLS; c++) {
            if (occupied(r, c)) continue;
            const dx = cellX(r, c) - ball.x, dy = cellY(r) - ball.y;
            const d = dx * dx + dy * dy;
            if (d < bestD) { bestD = d; best = [r, c]; }
          }
        }
      }
      if (!best) { ball = null; return; }
      while (grid.length <= best[0]) grid.push(new Array(COLS).fill(null));
      grid[best[0]][best[1]] = ball.color;
      ball = null;
      resolve(best[0], best[1]);
    }

    function resolve(row, col) {
      const color = grid[row][col];
      const cluster = [];
      const seen = new Set();
      const stack = [[row, col]];
      while (stack.length) {
        const [r, c] = stack.pop();
        const key = r + "," + c;
        if (seen.has(key)) continue;
        seen.add(key);
        if (!occupied(r, c) || grid[r][c] !== color) continue;
        cluster.push([r, c]);
        for (const n of neighbors(r, c)) stack.push(n);
      }

      if (cluster.length >= 3) {
        for (const [r, c] of cluster) grid[r][c] = null;
        score += cluster.length * 10;
        dropFloating();
        statusEl.textContent = `점수 ${score}`;
      }

      shots++;
      if (shots % 8 === 0) grid.unshift(new Array(COLS).fill(null).map(() => pick()));

      for (let r = grid.length - 1; r >= 0; r--) {
        if (grid[r].some((v) => v !== null && v !== undefined)) {
          if (r >= DEATH_ROW) { endGame(); return; }
          break;
        }
      }
    }

    function dropFloating() {
      const keep = new Set();
      const stack = [];
      for (let c = 0; c < COLS; c++) if (occupied(0, c)) { stack.push([0, c]); }
      while (stack.length) {
        const [r, c] = stack.pop();
        const key = r + "," + c;
        if (keep.has(key) || !occupied(r, c)) continue;
        keep.add(key);
        for (const n of neighbors(r, c)) stack.push(n);
      }
      let removed = 0;
      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < COLS; c++) {
          if (occupied(r, c) && !keep.has(r + "," + c)) { grid[r][c] = null; removed++; }
        }
      }
      if (removed) score += removed * 20;
    }

    function step() {
      if (ball) {
        ball.x += ball.vx;
        ball.y += ball.vy;
        if (ball.x < R) { ball.x = R; ball.vx = -ball.vx; }
        if (ball.x > W - R) { ball.x = W - R; ball.vx = -ball.vx; }
        let hit = null;
        for (let r = 0; r < grid.length && !hit; r++) {
          for (let c = 0; c < COLS; c++) {
            if (!occupied(r, c)) continue;
            const dx = ball.x - cellX(r, c), dy = ball.y - cellY(r);
            if (dx * dx + dy * dy < (D - 2) * (D - 2)) { hit = [r, c]; break; }
          }
        }
        if (ball.y - R <= 0) snap(null, null);
        else if (hit) snap(hit[0], hit[1]);
        else if (ball.y > H + R) snap(null, null);
      }
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < COLS; c++) {
          if (!occupied(r, c)) continue;
          circle(cellX(r, c), cellY(r), grid[r][c]);
        }
      }
      // 조준선
      ctx.save();
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = "rgba(120,120,120,0.7)";
      ctx.beginPath();
      ctx.moveTo(SHOOTER.x, SHOOTER.y);
      ctx.lineTo(SHOOTER.x + Math.sin(aim) * 90, SHOOTER.y - Math.cos(aim) * 90);
      ctx.stroke();
      ctx.restore();
      if (ball) circle(ball.x, ball.y, ball.color);
      circle(SHOOTER.x, SHOOTER.y, current);
      ctx.beginPath();
      ctx.arc(SHOOTER.x + 22, SHOOTER.y + 6, 10, 0, Math.PI * 2);
      ctx.fillStyle = COLORS[next];
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.stroke();
    }

    function circle(x, y, colorIdx) {
      ctx.beginPath();
      ctx.arc(x, y, R - 1, 0, Math.PI * 2);
      ctx.fillStyle = COLORS[colorIdx];
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x - 4, y - 4, 4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fill();
    }

    function loop() {
      if (!running) return;
      step();
      draw();
      rafId = requestAnimationFrame(loop);
    }

    function endGame() {
      running = false;
      gameOver = true;
      if (rafId) cancelAnimationFrame(rafId);
      window.reportScore?.("panel-bubble", score);
      statusEl.textContent = `게임 오버 · 점수 ${score} — 시작 버튼으로 다시`;
    }

    function startGame() {
      reset();
      running = true;
      statusEl.textContent = "점수 0";
      if (rafId) cancelAnimationFrame(rafId);
      loop();
    }

    function aimAt(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      const x = (clientX - rect.left) * (W / rect.width);
      const y = (clientY - rect.top) * (H / rect.height);
      const a = Math.atan2(x - SHOOTER.x, SHOOTER.y - y);
      aim = Math.max(-1.3, Math.min(1.3, a));
    }

    startBtn.addEventListener("click", startGame);
    canvas.addEventListener("mousemove", (e) => aimAt(e.clientX, e.clientY));
    canvas.addEventListener("mousedown", (e) => { aimAt(e.clientX, e.clientY); shoot(); });
    canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      const t = e.touches[0];
      aimAt(t.clientX, t.clientY);
      shoot();
    }, { passive: false });
    document.addEventListener("keydown", (e) => {
      if (panel.hidden || e.code !== "Space") return;
      e.preventDefault();
      shoot();
    });

    reset();
    registerGame("panel-bubble", {
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
