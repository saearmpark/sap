  // ── STEP 46: 봄버맨 ─────────────────────────────
  (function () {
    const canvas = document.getElementById("bomber-canvas");
    const ctx = canvas.getContext("2d");
    const panelEl = document.getElementById("panel-bomber");
    const statusEl = document.getElementById("bomber-status");
    const scoreEl = document.getElementById("bomber-score");
    const livesEl = document.getElementById("bomber-lives");
    const enemiesEl = document.getElementById("bomber-enemies");
    const levelEl = document.getElementById("bomber-level");
    const startBtn = document.getElementById("bomber-start");

    const COLS = 13, ROWS = 11, TILE = 34;
    const EMPTY = 0, WALL = 1, BRICK = 2;
    const UP = { x: 0, y: -1 }, DOWN = { x: 0, y: 1 }, LEFT = { x: -1, y: 0 }, RIGHT = { x: 1, y: 0 };
    const DIRS = [UP, DOWN, LEFT, RIGHT];
    const KEY_DIRS = {
      arrowup: UP, w: UP, arrowdown: DOWN, s: DOWN,
      arrowleft: LEFT, a: LEFT, arrowright: RIGHT, d: RIGHT,
    };
    const ENEMY_COLORS = ["#ff6b6b", "#ffd166", "#8bd450", "#c084fc"];
    const BOMB_TIME = 2.0, FLAME_TIME = 0.5, INVULN_TIME = 1.6;
    const SPAWN = { col: 1, row: 1 };

    let map, bombs, flames, items, enemies, player;
    let score, lives, level, bombsMax, power, baseSpeed;
    let invuln, levelPause;
    let running = false;
    let animationId = null, lastTime = 0;
    let held = [];

    function tileCenter(index) { return index * TILE + TILE / 2; }
    function tileOf(entity) {
      return { col: Math.round((entity.xpx - TILE / 2) / TILE), row: Math.round((entity.ypx - TILE / 2) / TILE) };
    }
    function inBounds(col, row) { return col >= 0 && row >= 0 && col < COLS && row < ROWS; }
    function bombAt(col, row) { return bombs.some(b => b.col === col && b.row === row); }
    function flameAt(col, row) { return flames.some(f => f.col === col && f.row === row); }
    function canMove(col, row) { return inBounds(col, row) && map[row][col] === EMPTY && !bombAt(col, row); }
    function tileDist(ax, ay, bx, by) { return (ax - bx) ** 2 + (ay - by) ** 2; }

    function makeEntity(col, row, stepTime) {
      return {
        col, row, xpx: tileCenter(col), ypx: tileCenter(row),
        dir: null, nextDir: null, moving: false, progress: 0,
        fromX: 0, fromY: 0, toX: 0, toY: 0, stepTime,
      };
    }

    function generateMap() {
      map = Array.from({ length: ROWS }, (_, r) => Array.from({ length: COLS }, (_, c) => {
        if (r === 0 || c === 0 || r === ROWS - 1 || c === COLS - 1) return WALL;
        if (r % 2 === 0 && c % 2 === 0) return WALL;
        return Math.random() < 0.78 ? BRICK : EMPTY;
      }));
      // 시작 지점과 그 주변은 항상 비워 둔다
      [[1, 1], [2, 1], [1, 2]].forEach(([c, r]) => { map[r][c] = EMPTY; });
    }

    function openCellsAwayFromSpawn(minDist) {
      const cells = [];
      for (let r = 1; r < ROWS - 1; r++) {
        for (let c = 1; c < COLS - 1; c++) {
          if (map[r][c] !== EMPTY) continue;
          if (Math.abs(c - SPAWN.col) + Math.abs(r - SPAWN.row) < minDist) continue;
          cells.push({ col: c, row: r });
        }
      }
      return cells;
    }

    function buildLevel() {
      generateMap();
      bombs = [];
      flames = [];
      items = [];
      enemies = [];
      player = makeEntity(SPAWN.col, SPAWN.row, baseSpeed);
      player.isPlayer = true;
      invuln = INVULN_TIME;
      const spots = openCellsAwayFromSpawn(5);
      const count = Math.min(2 + level, spots.length);
      for (let i = 0; i < count; i++) {
        const spot = spots.splice(Math.floor(Math.random() * spots.length), 1)[0];
        const enemy = makeEntity(spot.col, spot.row, Math.max(0.16, 0.3 - level * 0.015));
        enemy.color = ENEMY_COLORS[i % ENEMY_COLORS.length];
        enemies.push(enemy);
      }
      updateHud();
    }

    function newGame() {
      score = 0;
      lives = 3;
      level = 1;
      bombsMax = 1;
      power = 2;
      baseSpeed = 0.16;
      levelPause = 0;
      held = [];
      buildLevel();
    }

    function updateHud() {
      scoreEl.textContent = score;
      livesEl.textContent = Math.max(0, lives);
      enemiesEl.textContent = enemies.length;
      levelEl.textContent = level;
    }

    function beginStep(entity, dir) {
      entity.fromX = tileCenter(entity.col);
      entity.fromY = tileCenter(entity.row);
      entity.toX = tileCenter(entity.col + dir.x);
      entity.toY = tileCenter(entity.row + dir.y);
      entity.progress = 0;
      entity.moving = true;
    }

    function advance(entity, dt, chooser) {
      if (!entity.moving) {
        const dir = chooser(entity);
        if (dir && canMove(entity.col + dir.x, entity.row + dir.y)) {
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
        if (entity.isPlayer) pickUpItem(entity.col, entity.row);
      } else {
        entity.xpx = entity.fromX + (entity.toX - entity.fromX) * entity.progress;
        entity.ypx = entity.fromY + (entity.toY - entity.fromY) * entity.progress;
      }
    }

    function playerChooser(entity) {
      // 눌려 있는 방향키가 있을 때만 이동한다. 키를 떼면 다음 칸에서 멈춘다.
      for (let i = held.length - 1; i >= 0; i--) {
        const dir = held[i];
        if (canMove(entity.col + dir.x, entity.row + dir.y)) return dir;
      }
      return null;
    }

    function enemyChooser(enemy) {
      const reverse = enemy.dir ? { x: -enemy.dir.x, y: -enemy.dir.y } : null;
      let options = DIRS.filter(dir => {
        if (reverse && dir.x === reverse.x && dir.y === reverse.y) return false;
        return canMove(enemy.col + dir.x, enemy.row + dir.y);
      });
      if (!options.length && reverse && canMove(enemy.col + reverse.x, enemy.row + reverse.y)) {
        options = [reverse];
      }
      if (!options.length) return null;
      const safe = options.filter(dir => !flameAt(enemy.col + dir.x, enemy.row + dir.y));
      const pool = safe.length ? safe : options;
      if (Math.random() < 0.35) {
        pool.sort((a, b) => tileDist(enemy.col + a.x, enemy.row + a.y, player.col, player.row)
          - tileDist(enemy.col + b.x, enemy.row + b.y, player.col, player.row));
        return pool[0];
      }
      return pool[Math.floor(Math.random() * pool.length)];
    }

    function pickUpItem(col, row) {
      const index = items.findIndex(item => item.col === col && item.row === row);
      if (index < 0) return;
      const type = items[index].type;
      items.splice(index, 1);
      if (type === "bomb") bombsMax += 1;
      else if (type === "power") power += 1;
      else { baseSpeed = Math.max(0.08, baseSpeed - 0.02); player.stepTime = baseSpeed; }
      score += 50;
      updateHud();
    }

    function maybeDropItem(col, row) {
      if (Math.random() > 0.3) return;
      const roll = Math.random();
      const type = roll < 0.4 ? "bomb" : roll < 0.75 ? "power" : "speed";
      items.push({ col, row, type });
    }

    function placeBomb() {
      if (!running || levelPause > 0 || !player) return;
      const { col, row } = tileOf(player);
      if (!inBounds(col, row) || bombs.length >= bombsMax || bombAt(col, row)) return;
      bombs.push({ col, row, timer: BOMB_TIME, power });
    }

    function addFlame(col, row) { flames.push({ col, row, timer: FLAME_TIME }); }

    function detonate(start) {
      const queue = [start];
      const done = new Set();
      while (queue.length) {
        const bomb = queue.shift();
        if (done.has(bomb)) continue;
        done.add(bomb);
        const index = bombs.indexOf(bomb);
        if (index >= 0) bombs.splice(index, 1);
        addFlame(bomb.col, bomb.row);
        for (const dir of DIRS) {
          for (let i = 1; i <= bomb.power; i++) {
            const col = bomb.col + dir.x * i, row = bomb.row + dir.y * i;
            if (!inBounds(col, row) || map[row][col] === WALL) break;
            addFlame(col, row);
            if (map[row][col] === BRICK) {
              map[row][col] = EMPTY;
              maybeDropItem(col, row);
              score += 10;
              break;
            }
            const next = bombs.find(b => b.col === col && b.row === row);
            if (next && !done.has(next)) queue.push(next);
          }
        }
      }
      updateHud();
    }

    function updateBombs(dt) {
      bombs.filter(bomb => (bomb.timer -= dt) <= 0).forEach(detonate);
    }

    function updateFlames(dt) {
      flames = flames.filter(flame => (flame.timer -= dt) > 0);
    }

    function resolveHazards() {
      const remaining = [];
      for (const enemy of enemies) {
        const { col, row } = tileOf(enemy);
        if (flameAt(col, row)) { score += 100; continue; }
        remaining.push(enemy);
      }
      enemies = remaining;
      if (invuln <= 0) {
        const { col, row } = tileOf(player);
        if (flameAt(col, row)) damagePlayer();
      }
    }

    function checkEnemyCollision() {
      if (invuln > 0) return;
      for (const enemy of enemies) {
        if (Math.hypot(enemy.xpx - player.xpx, enemy.ypx - player.ypx) < TILE * 0.7) { damagePlayer(); return; }
      }
    }

    function damagePlayer() {
      lives -= 1;
      updateHud();
      if (lives <= 0) { finish(); return; }
      player = makeEntity(SPAWN.col, SPAWN.row, baseSpeed);
      player.isPlayer = true;
      invuln = INVULN_TIME;
      statusEl.textContent = `당했습니다! 남은 목숨 ${lives}개.`;
    }

    function clearLevel() {
      score += 200;
      level += 1;
      levelPause = 1.2;
      statusEl.textContent = `단계 클리어! ${score}점 · 다음 단계 준비 중...`;
      updateHud();
    }

    function finish() {
      running = false;
      cancelAnimationFrame(animationId);
      animationId = null;
      startBtn.disabled = false;
      startBtn.textContent = "다시 시작";
      statusEl.textContent = `게임 오버! 점수 ${score}점. 다시 도전해 보세요.`;
      window.reportScore?.("panel-bomber", score);
    }

    function frame(time) {
      if (!running) return;
      const dt = Math.min((time - lastTime) / 1000 || 0, 0.05);
      lastTime = time;
      if (levelPause > 0) {
        levelPause -= dt;
        if (levelPause <= 0) buildLevel();
        draw();
        animationId = requestAnimationFrame(frame);
        return;
      }
      if (invuln > 0) invuln = Math.max(0, invuln - dt);
      advance(player, dt, playerChooser);
      enemies.forEach(enemy => advance(enemy, dt, enemyChooser));
      updateBombs(dt);
      updateFlames(dt);
      resolveHazards();
      if (running) checkEnemyCollision();
      if (running && enemies.length === 0) clearLevel();
      updateHud();
      draw();
      animationId = requestAnimationFrame(frame);
    }

    function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

    function draw() {
      ctx.fillStyle = "#0b1020";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const x = c * TILE, y = r * TILE;
          if (map[r][c] === WALL) {
            ctx.fillStyle = "#475569";
            roundRect(x + 1, y + 1, TILE - 2, TILE - 2, 5);
            ctx.fill();
            ctx.fillStyle = "#64748b";
            roundRect(x + 6, y + 6, TILE - 12, TILE - 12, 4);
            ctx.fill();
          } else if (map[r][c] === BRICK) {
            ctx.fillStyle = "#9a3412";
            roundRect(x + 2, y + 2, TILE - 4, TILE - 4, 3);
            ctx.fill();
            ctx.strokeStyle = "#7c2d12";
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 6, y + 6, TILE - 12, TILE / 2 - 6);
            ctx.strokeRect(x + 6, y + TILE / 2, TILE - 12, TILE / 2 - 6);
          } else {
            ctx.fillStyle = (r + c) % 2 ? "#111a2e" : "#0e1626";
            ctx.fillRect(x, y, TILE, TILE);
          }
        }
      }
      items.forEach(drawItem);
      bombs.forEach(drawBomb);
      flames.forEach(drawFlame);
      enemies.forEach(drawEnemy);
      drawPlayer();
    }

    function drawItem(item) {
      const x = tileCenter(item.col), y = tileCenter(item.row);
      const colors = { bomb: "#38bdf8", power: "#fb923c", speed: "#4ade80" };
      const labels = { bomb: "B", power: "F", speed: "S" };
      const size = TILE * 0.6;
      ctx.fillStyle = colors[item.type];
      roundRect(x - size / 2, y - size / 2, size, size, 6);
      ctx.fill();
      ctx.fillStyle = "#0b1020";
      ctx.font = `700 ${Math.round(TILE * 0.42)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(labels[item.type], x, y + 1);
    }

    function drawBomb(bomb) {
      const x = tileCenter(bomb.col), y = tileCenter(bomb.row);
      const scale = 0.72 + Math.sin(performance.now() / 120) * 0.08;
      ctx.fillStyle = "#111827";
      ctx.beginPath();
      ctx.arc(x, y, TILE * 0.34 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#374151";
      ctx.beginPath();
      ctx.arc(x - 3, y - 3, TILE * 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 4, y - TILE * 0.28);
      ctx.lineTo(x + 10, y - TILE * 0.44);
      ctx.stroke();
    }

    function drawFlame(flame) {
      const x = flame.col * TILE, y = flame.row * TILE;
      const t = flame.timer / FLAME_TIME;
      const pad = 3 + (1 - t) * 6;
      const alpha = 0.55 + 0.45 * t;
      ctx.fillStyle = `rgba(251, 146, 60, ${alpha})`;
      roundRect(x + pad, y + pad, TILE - pad * 2, TILE - pad * 2, 6);
      ctx.fill();
      ctx.fillStyle = `rgba(254, 240, 138, ${alpha})`;
      roundRect(x + TILE * 0.28, y + TILE * 0.28, TILE * 0.44, TILE * 0.44, 5);
      ctx.fill();
    }

    function drawEnemy(enemy) {
      const x = enemy.xpx, y = enemy.ypx, r = TILE * 0.34;
      ctx.fillStyle = enemy.color;
      ctx.beginPath();
      ctx.arc(x, y - r * 0.1, r, Math.PI, 0);
      ctx.lineTo(x + r, y + r * 0.6);
      ctx.lineTo(x + r * 0.4, y + r * 0.95);
      ctx.lineTo(x, y + r * 0.6);
      ctx.lineTo(x - r * 0.4, y + r * 0.95);
      ctx.lineTo(x - r, y + r * 0.6);
      ctx.closePath();
      ctx.fill();
      for (const side of [-1, 1]) {
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(x + side * r * 0.36, y - r * 0.15, r * 0.26, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#111827";
        ctx.beginPath();
        ctx.arc(x + side * r * 0.36, y - r * 0.1, r * 0.12, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function drawPlayer() {
      if (!player) return;
      if (invuln > 0 && Math.floor(performance.now() / 90) % 2 === 0) return;
      const x = player.xpx, y = player.ypx, r = TILE * 0.36;
      ctx.fillStyle = "#e0f2fe";
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#0ea5e9";
      ctx.beginPath();
      ctx.arc(x, y - r * 0.15, r * 0.85, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.arc(x, y + r * 0.12, r * 0.34, 0, Math.PI);
      ctx.fill();
    }

    function pressDir(dir) {
      held = held.filter(d => d !== dir);
      held.push(dir);
    }
    function releaseDir(dir) {
      held = held.filter(d => d !== dir);
    }

    function start() {
      newGame();
      running = true;
      startBtn.disabled = true;
      startBtn.textContent = "다시 시작";
      statusEl.textContent = "방향키/WASD 이동 · 스페이스 폭탄 · 모든 적을 물리치세요!";
      lastTime = performance.now();
      cancelAnimationFrame(animationId);
      animationId = requestAnimationFrame(frame);
    }

    function bindHold(id, dir) {
      const el = document.getElementById(id);
      el.addEventListener("pointerdown", event => { event.preventDefault(); pressDir(dir); });
      el.addEventListener("pointerup", () => releaseDir(dir));
      el.addEventListener("pointerleave", () => releaseDir(dir));
      el.addEventListener("pointercancel", () => releaseDir(dir));
    }
    bindHold("bomber-up", UP);
    bindHold("bomber-down", DOWN);
    bindHold("bomber-left", LEFT);
    bindHold("bomber-right", RIGHT);
    document.getElementById("bomber-bomb").addEventListener("pointerdown", event => {
      event.preventDefault();
      placeBomb();
    });
    startBtn.addEventListener("click", start);

    document.addEventListener("keydown", event => {
      if (panelEl.hidden) return;
      if (event.key === " ") {
        event.preventDefault();
        placeBomb();
        return;
      }
      const dir = KEY_DIRS[event.key.toLowerCase()];
      if (!dir) return;
      event.preventDefault();
      pressDir(dir);
    });
    document.addEventListener("keyup", event => {
      const dir = KEY_DIRS[event.key.toLowerCase()];
      if (dir) releaseDir(dir);
    });
    window.addEventListener("blur", () => { held = []; });

    registerGame("panel-bomber", {
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
