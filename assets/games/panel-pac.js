  // ── STEP 44: 팩맨 ─────────────────────────────
  (function () {
    const canvas = document.getElementById("pac-canvas");
    const ctx = canvas.getContext("2d");
    const panelEl = document.getElementById("panel-pac");
    const statusEl = document.getElementById("pac-status");
    const scoreEl = document.getElementById("pac-score");
    const livesEl = document.getElementById("pac-lives");
    const dotsEl = document.getElementById("pac-dots");
    const startBtn = document.getElementById("pac-start");

    const TILE = 28;
    const GRID = canvas.width / TILE;
    const DIRS = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
    const KEY_DIRS = {
      arrowup: DIRS[0], w: DIRS[0], arrowdown: DIRS[1], s: DIRS[1],
      arrowleft: DIRS[2], a: DIRS[2], arrowright: DIRS[3], d: DIRS[3],
    };
    const GHOST_COLORS = ["#ff4d6d", "#ff8fab", "#4cc9f0"];

    let maze = [];
    let dots = [];
    let totalDots = 0;
    let eaten = 0;
    let score = 0;
    let lives = 3;
    let level = 1;
    let frightened = 0;
    let scatterMode = false;
    let scatterTimer = 0;
    let freeze = 0;
    let pac = null;
    let ghosts = [];
    let pacHome = { col: 1, row: 1 };
    let ghostHome = { col: 1, row: 1 };
    let cornerTargets = [];
    let running = false;
    let animationId = null;
    let lastTime = 0;

    function tileCenter(index) { return index * TILE + TILE / 2; }
    function isOpen(col, row) {
      return col >= 0 && row >= 0 && col < GRID && row < GRID && maze[row][col] === 0;
    }
    function tileDist(colA, rowA, colB, rowB) {
      return (colA - colB) ** 2 + (rowA - rowB) ** 2;
    }
    function generateMaze() {
      const grid = Array.from({ length: GRID }, () => Array(GRID).fill(1));
      const stack = [[1, 1]];
      grid[1][1] = 0;
      const step = [[0, -2], [0, 2], [-2, 0], [2, 0]];
      while (stack.length) {
        const [x, y] = stack[stack.length - 1];
        const options = [];
        for (const [dx, dy] of step) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx > 0 && ny > 0 && nx < GRID - 1 && ny < GRID - 1 && grid[ny][nx] === 1) {
            options.push([nx, ny, dx, dy]);
          }
        }
        if (!options.length) { stack.pop(); continue; }
        const [nx, ny, dx, dy] = options[Math.floor(Math.random() * options.length)];
        grid[ny][nx] = 0;
        grid[y + dy / 2][x + dx / 2] = 0;
        stack.push([nx, ny]);
      }
      for (let y = 1; y < GRID - 1; y++) {
        for (let x = 1; x < GRID - 1; x++) {
          if (grid[y][x] !== 1) continue;
          const horizontal = grid[y][x - 1] === 0 && grid[y][x + 1] === 0;
          const vertical = grid[y - 1][x] === 0 && grid[y + 1][x] === 0;
          if (horizontal !== vertical && Math.random() < 0.2) grid[y][x] = 0;
        }
      }
      return grid;
    }
    function nearestOpen(col, row) {
      let best = { col: 1, row: 1 };
      let bestDist = Infinity;
      for (let r = 0; r < GRID; r++) {
        for (let c = 0; c < GRID; c++) {
          if (maze[r][c] !== 0) continue;
          const dist = tileDist(c, r, col, row);
          if (dist < bestDist) { bestDist = dist; best = { col: c, row: r }; }
        }
      }
      return best;
    }
    function makeEntity(home, stepTime, color) {
      return {
        col: home.col, row: home.row,
        xpx: tileCenter(home.col), ypx: tileCenter(home.row),
        dir: null, nextDir: null, moving: false, progress: 0,
        stepFromX: 0, stepFromY: 0, stepToX: 0, stepToY: 0,
        stepTime, color,
      };
    }
    function countDots() {
      let total = 0;
      for (let r = 0; r < GRID; r++) {
        for (let c = 0; c < GRID; c++) if (dots[r][c]) total++;
      }
      return total;
    }
    function ghostSpeed() { return Math.max(0.12, 0.24 - (level - 1) * 0.018); }
    function ghostCount() { return Math.min(6, 2 + level); }
    function resetEntities() {
      pac = makeEntity(pacHome, 0.17, "#ffd60a");
      pac.isPac = true;
      ghosts = Array.from({ length: ghostCount() }, (_, index) => {
        const ghost = makeEntity(ghostHome, ghostSpeed(), GHOST_COLORS[index % GHOST_COLORS.length]);
        ghost.scatter = cornerTargets[index % cornerTargets.length];
        return ghost;
      });
    }
    function buildLevel() {
      maze = generateMaze();
      dots = maze.map(row => row.map(value => (value === 0 ? 1 : 0)));
      cornerTargets = [
        nearestOpen(1, 1), nearestOpen(GRID - 2, 1),
        nearestOpen(1, GRID - 2), nearestOpen(GRID - 2, GRID - 2),
      ];
      cornerTargets.forEach(pos => { dots[pos.row][pos.col] = 2; });
      totalDots = countDots();
      eaten = 0;
      frightened = 0; scatterMode = false; scatterTimer = 0;
      pacHome = nearestOpen(Math.floor(GRID / 2), GRID - 2);
      ghostHome = nearestOpen(Math.floor(GRID / 2), Math.floor(GRID / 2));
      resetEntities();
      updateHud();
    }
    function newGame() {
      level = 1;
      score = 0; lives = 3; freeze = 0;
      buildLevel();
    }
    function nextLevel() {
      level++;
      buildLevel();
      freeze = 1.2;
      statusEl.textContent = `레벨 ${level}! 점수 ${score}점 · 유령 ${ghosts.length}마리`;
    }
    function updateHud() {
      scoreEl.textContent = score;
      livesEl.textContent = Math.max(0, lives);
      dotsEl.textContent = Math.max(0, totalDots - eaten);
    }
    function beginStep(entity, dir) {
      entity.stepFromX = tileCenter(entity.col);
      entity.stepFromY = tileCenter(entity.row);
      entity.stepToX = tileCenter(entity.col + dir.x);
      entity.stepToY = tileCenter(entity.row + dir.y);
      entity.progress = 0;
      entity.moving = true;
    }
    function advance(entity, dt, chooser) {
      if (!entity.moving) {
        const dir = chooser(entity);
        if (dir && isOpen(entity.col + dir.x, entity.row + dir.y)) {
          entity.dir = dir;
          beginStep(entity, dir);
        } else {
          entity.xpx = tileCenter(entity.col);
          entity.ypx = tileCenter(entity.row);
          return;
        }
      }
      entity.progress += dt / entity.stepTime;
      if (entity.progress >= 1) {
        entity.col += entity.dir.x;
        entity.row += entity.dir.y;
        entity.progress = 0;
        entity.moving = false;
        entity.xpx = tileCenter(entity.col);
        entity.ypx = tileCenter(entity.row);
        if (entity.isPac) eatAt(entity.col, entity.row);
      } else {
        entity.xpx = entity.stepFromX + (entity.stepToX - entity.stepFromX) * entity.progress;
        entity.ypx = entity.stepFromY + (entity.stepToY - entity.stepFromY) * entity.progress;
      }
    }
    function pacChooser(entity) {
      if (entity.nextDir && isOpen(entity.col + entity.nextDir.x, entity.row + entity.nextDir.y)) {
        const dir = entity.nextDir;
        entity.nextDir = null;
        return dir;
      }
      if (entity.dir && isOpen(entity.col + entity.dir.x, entity.row + entity.dir.y)) return entity.dir;
      return null;
    }
    function ghostChooser(ghost) {
      const reverse = ghost.dir ? { x: -ghost.dir.x, y: -ghost.dir.y } : null;
      const options = DIRS.filter(dir => {
        if (reverse && dir.x === reverse.x && dir.y === reverse.y) return false;
        return isOpen(ghost.col + dir.x, ghost.row + dir.y);
      });
      if (!options.length) return reverse;
      if (frightened > 0) {
        options.sort((a, b) => tileDist(ghost.col + b.x, ghost.row + b.y, pac.col, pac.row)
          - tileDist(ghost.col + a.x, ghost.row + a.y, pac.col, pac.row));
        return options[0];
      }
      if (Math.random() < 0.2) return options[Math.floor(Math.random() * options.length)];
      const target = scatterMode ? ghost.scatter : pac;
      options.sort((a, b) => tileDist(ghost.col + a.x, ghost.row + a.y, target.col, target.row)
        - tileDist(ghost.col + b.x, ghost.row + b.y, target.col, target.row));
      return options[0];
    }
    function eatAt(col, row) {
      const value = dots[row][col];
      if (value === 1) {
        dots[row][col] = 0;
        score += 10;
        eaten++;
      } else if (value === 2) {
        dots[row][col] = 0;
        score += 50;
        eaten++;
        frightened = 7;
      } else {
        return;
      }
      updateHud();
      if (eaten >= totalDots) nextLevel();
    }
    function loseLife() {
      lives--;
      updateHud();
      if (lives <= 0) { finish(false); return; }
      frightened = 0;
      freeze = 1;
      resetEntities();
      statusEl.textContent = `유령에게 잡혔습니다! 남은 목숨 ${lives}개.`;
    }
    function checkCollision() {
      for (const ghost of ghosts) {
        if (Math.hypot(ghost.xpx - pac.xpx, ghost.ypx - pac.ypx) >= TILE * 0.6) continue;
        if (frightened > 0) {
          score += 200;
          ghost.col = ghostHome.col;
          ghost.row = ghostHome.row;
          ghost.dir = null;
          ghost.moving = false;
          ghost.progress = 0;
          ghost.xpx = tileCenter(ghost.col);
          ghost.ypx = tileCenter(ghost.row);
          updateHud();
        } else {
          loseLife();
          return;
        }
      }
    }
    function finish(win) {
      running = false;
      cancelAnimationFrame(animationId);
      animationId = null;
      startBtn.disabled = false;
      startBtn.textContent = "다시 시작";
      statusEl.textContent = win
        ? `승리! 점수 ${score}점으로 미로를 탈출했습니다.`
        : `게임 오버! 점수 ${score}점. 다시 도전해 보세요.`;
      window.reportScore?.("panel-pac", score);
      updateHud();
    }
    function frame(time) {
      if (!running) return;
      const dt = Math.min((time - lastTime) / 1000 || 0, 0.05);
      lastTime = time;
      if (freeze > 0) {
        freeze -= dt;
      } else {
        if (frightened > 0) frightened = Math.max(0, frightened - dt);
        scatterTimer += dt;
        if (scatterTimer > 8) { scatterTimer = 0; scatterMode = !scatterMode; }
        advance(pac, dt, pacChooser);
        if (!running) { draw(); return; }
        ghosts.forEach(ghost => advance(ghost, dt, ghostChooser));
        updateHud();
        checkCollision();
        if (!running) { draw(); return; }
      }
      draw();
      animationId = requestAnimationFrame(frame);
    }
    function draw() {
      ctx.fillStyle = "#0b1020";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#2a3fb8";
      for (let r = 0; r < GRID; r++) {
        for (let c = 0; c < GRID; c++) {
          if (maze[r][c] !== 1) continue;
          ctx.beginPath();
          ctx.roundRect(c * TILE + 2, r * TILE + 2, TILE - 4, TILE - 4, 6);
          ctx.fill();
        }
      }
      const pulse = 3 + Math.sin(performance.now() / 220) * 1.5;
      ctx.fillStyle = "#ffd166";
      for (let r = 0; r < GRID; r++) {
        for (let c = 0; c < GRID; c++) {
          const value = dots[r]?.[c];
          if (!value) continue;
          ctx.beginPath();
          ctx.arc(tileCenter(c), tileCenter(r), value === 2 ? 5 + pulse : 2.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      drawPac();
      ghosts.forEach(drawGhost);
    }
    function pacAngle() {
      if (!pac.dir || pac.dir.x > 0) return 0;
      if (pac.dir.x < 0) return Math.PI;
      return pac.dir.y < 0 ? -Math.PI / 2 : Math.PI / 2;
    }
    function drawPac() {
      const mouth = 0.18 + 0.18 * (1 + Math.sin(performance.now() / 90));
      const angle = pacAngle();
      ctx.fillStyle = "#ffd60a";
      ctx.beginPath();
      ctx.moveTo(pac.xpx, pac.ypx);
      ctx.arc(pac.xpx, pac.ypx, TILE * 0.42, angle + mouth, angle - mouth + Math.PI * 2);
      ctx.closePath();
      ctx.fill();
    }
    function drawGhost(ghost) {
      const x = ghost.xpx;
      const y = ghost.ypx;
      const radius = TILE * 0.4;
      const scared = frightened > 0;
      const flashing = scared && frightened < 2 && Math.floor(frightened * 8) % 2 === 0;
      ctx.fillStyle = scared ? (flashing ? "#f8f9fa" : "#4dabf7") : ghost.color;
      ctx.beginPath();
      ctx.arc(x, y - radius * 0.1, radius, Math.PI, 0, false);
      ctx.lineTo(x + radius, y + radius * 0.7);
      ctx.lineTo(x + radius * 0.65, y + radius * 0.35);
      ctx.lineTo(x + radius * 0.3, y + radius * 0.7);
      ctx.lineTo(x - radius * 0.3, y + radius * 0.35);
      ctx.lineTo(x - radius * 0.65, y + radius * 0.7);
      ctx.lineTo(x - radius, y + radius * 0.35);
      ctx.closePath();
      ctx.fill();
      if (scared) {
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(x - radius * 0.32, y - radius * 0.15, radius * 0.16, 0, Math.PI * 2);
        ctx.arc(x + radius * 0.32, y - radius * 0.15, radius * 0.16, 0, Math.PI * 2);
        ctx.fill();
        return;
      }
      const lookX = Math.sign(pac.xpx - x) * radius * 0.14;
      const lookY = Math.sign(pac.ypx - y) * radius * 0.14;
      for (const side of [-1, 1]) {
        const eyeX = x + side * radius * 0.34;
        const eyeY = y - radius * 0.15;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, radius * 0.26, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#1a1d29";
        ctx.beginPath();
        ctx.arc(eyeX + lookX, eyeY + lookY, radius * 0.13, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    function setDirection(dir) {
      if (!running || !pac) return;
      pac.nextDir = dir;
    }
    function start() {
      newGame();
      running = true;
      freeze = 0;
      lastTime = performance.now();
      startBtn.disabled = true;
      startBtn.textContent = "다시 시작";
      statusEl.textContent = "방향키나 W/A/S/D로 이동하세요. 점을 모두 먹으면 다음 레벨이 시작됩니다!";
      cancelAnimationFrame(animationId);
      animationId = requestAnimationFrame(frame);
    }
    document.addEventListener("keydown", event => {
      if (panelEl.hidden) return;
      const dir = KEY_DIRS[event.key.toLowerCase()];
      if (!dir) return;
      event.preventDefault();
      setDirection(dir);
    });
    document.getElementById("pac-up").addEventListener("pointerdown", () => setDirection(DIRS[0]));
    document.getElementById("pac-down").addEventListener("pointerdown", () => setDirection(DIRS[1]));
    document.getElementById("pac-left").addEventListener("pointerdown", () => setDirection(DIRS[2]));
    document.getElementById("pac-right").addEventListener("pointerdown", () => setDirection(DIRS[3]));
    startBtn.addEventListener("click", start);

    registerGame("panel-pac", {
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
