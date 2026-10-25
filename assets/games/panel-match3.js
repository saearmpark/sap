  // ── STEP 47: 보석 맞추기 (매치 3) ─────────────────
  // 격자에서 "가로나 세로로 같은 보석이 3개 이상 연속"인 곳을 찾아 지우고,
  // 위에서 새 보석이 떨어져 다시 채워지는 연쇄를 반복하는 게임입니다.
  // 핵심은 ① 연속 찾기(findMatches) ② 지우고 아래로 내리기(collapse)
  // ③ 빈 칸 위에서 채우기 ④ 연쇄가 끝날 때까지 반복(resolve)입니다.
  (function () {
    const SIZE = 8;
    const START_MOVES = 25;
    const GEMS = ["🍎", "🍇", "🍋", "🍊", "🥝", "🫐"];

    const boardEl = document.getElementById("match3-board");
    const scoreEl = document.getElementById("match3-score");
    const movesEl = document.getElementById("match3-moves");
    const statusEl = document.getElementById("match3-status");
    const resetBtn = document.getElementById("match3-reset");

    let grid = [];
    let selected = null;
    let score = 0;
    let movesLeft = START_MOVES;
    let busy = false;
    let runId = 0;

    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

    function newGrid() {
      // 처음부터 3개가 연속되지 않도록 칸을 하나씩 채웁니다.
      const g = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          let choices = GEMS.map((_, i) => i);
          if (c >= 2 && g[r][c - 1] === g[r][c - 2]) choices = choices.filter(t => t !== g[r][c - 1]);
          if (r >= 2 && g[r - 1][c] === g[r - 2][c]) choices = choices.filter(t => t !== g[r - 1][c]);
          g[r][c] = choices[Math.floor(Math.random() * choices.length)];
        }
      }
      return g;
    }

    function findMatches(g) {
      const marks = new Set();
      for (let r = 0; r < SIZE; r++) {
        let run = 1;
        for (let c = 1; c <= SIZE; c++) {
          if (c < SIZE && g[r][c] !== null && g[r][c] === g[r][c - 1]) run++;
          else {
            if (run >= 3) for (let k = c - run; k < c; k++) marks.add(r * SIZE + k);
            run = 1;
          }
        }
      }
      for (let c = 0; c < SIZE; c++) {
        let run = 1;
        for (let r = 1; r <= SIZE; r++) {
          if (r < SIZE && g[r][c] !== null && g[r][c] === g[r - 1][c]) run++;
          else {
            if (run >= 3) for (let k = r - run; k < r; k++) marks.add(k * SIZE + c);
            run = 1;
          }
        }
      }
      return marks;
    }

    function hasMove(g) {
      // 아무 이웃한 두 칸을 바꿔봤을 때 3개가 만들어지는 조합이 하나라도 있는지 검사합니다.
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          if (c + 1 < SIZE) {
            [g[r][c], g[r][c + 1]] = [g[r][c + 1], g[r][c]];
            const ok = findMatches(g).size > 0;
            [g[r][c], g[r][c + 1]] = [g[r][c + 1], g[r][c]];
            if (ok) return true;
          }
          if (r + 1 < SIZE) {
            [g[r][c], g[r + 1][c]] = [g[r + 1][c], g[r][c]];
            const ok = findMatches(g).size > 0;
            [g[r][c], g[r + 1][c]] = [g[r + 1][c], g[r][c]];
            if (ok) return true;
          }
        }
      }
      return false;
    }

    function collapse() {
      // 각 열에서 살아남은 보석을 아래로 내리고, 남은 위쪽 칸을 새 보석으로 채웁니다.
      for (let c = 0; c < SIZE; c++) {
        let write = SIZE - 1;
        for (let r = SIZE - 1; r >= 0; r--) {
          if (grid[r][c] !== null) {
            if (write !== r) grid[write][c] = grid[r][c];
            write--;
          }
        }
        for (let r = write; r >= 0; r--) grid[r][c] = Math.floor(Math.random() * GEMS.length);
      }
    }

    function renderHud() {
      scoreEl.textContent = score;
      movesEl.textContent = movesLeft;
    }

    function render(clearing) {
      boardEl.replaceChildren();
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          const cell = document.createElement("button");
          cell.type = "button";
          cell.className = "match3-cell";
          if (selected && selected.r === r && selected.c === c) cell.classList.add("is-selected");
          if (clearing && clearing.has(r * SIZE + c)) cell.classList.add("is-clearing");
          const value = grid[r][c];
          if (value !== null) {
            const gem = document.createElement("span");
            gem.className = "match3-gem";
            gem.textContent = GEMS[value];
            cell.appendChild(gem);
          }
          cell.setAttribute("aria-label", `${r + 1}행 ${c + 1}열 보석`);
          cell.addEventListener("click", () => handleClick(r, c));
          boardEl.appendChild(cell);
        }
      }
    }

    async function resolve() {
      const myRun = runId;
      let combo = 0;
      let reshuffled = false;
      while (true) {
        const marks = findMatches(grid);
        if (marks.size === 0) break;
        combo++;
        score += marks.size * 10 * combo;
        marks.forEach(key => { grid[Math.floor(key / SIZE)][key % SIZE] = null; });
        renderHud();
        render(marks);
        await sleep(150);
        if (myRun !== runId) return null; // 새 게임이 시작되면 진행 중이던 연쇄를 중단합니다.
        collapse();
        render();
        await sleep(150);
        if (myRun !== runId) return null;
      }
      if (!hasMove(grid)) {
        do { grid = newGrid(); } while (!hasMove(grid));
        reshuffled = true;
        render();
      }
      return { combo, reshuffled };
    }

    async function handleClick(r, c) {
      if (busy || movesLeft <= 0) return;
      if (!selected) {
        selected = { r, c };
        render();
        return;
      }
      if (selected.r === r && selected.c === c) {
        selected = null;
        render();
        return;
      }
      if (Math.abs(selected.r - r) + Math.abs(selected.c - c) !== 1) {
        selected = { r, c };
        render();
        return;
      }

      const a = selected;
      const b = { r, c };
      selected = null;
      [grid[a.r][a.c], grid[b.r][b.c]] = [grid[b.r][b.c], grid[a.r][a.c]];
      if (findMatches(grid).size === 0) {
        [grid[a.r][a.c], grid[b.r][b.c]] = [grid[b.r][b.c], grid[a.r][a.c]];
        statusEl.textContent = "그 방향으로는 세 개를 맞출 수 없어요.";
        render();
        return;
      }

      movesLeft--;
      busy = true;
      renderHud();
      render();

      const result = await resolve();
      if (result === null) return;
      busy = false;

      if (movesLeft <= 0) {
        window.reportScore?.("panel-match3", score);
        statusEl.textContent = `이동을 모두 사용했습니다. 최종 점수 ${score}점!`;
      } else {
        const comboText = result.combo >= 2 ? `연쇄 ${result.combo}콤보! ` : "";
        const shuffleText = result.reshuffled ? "새로 섞었습니다. " : "";
        statusEl.textContent = `${comboText}${shuffleText}남은 이동 ${movesLeft}회 · ${score}점`;
      }
      render();
    }

    function newGame() {
      runId++;
      do { grid = newGrid(); } while (!hasMove(grid));
      selected = null;
      score = 0;
      movesLeft = START_MOVES;
      busy = false;
      renderHud();
      statusEl.textContent = "보석을 눌러 이웃한 보석과 바꾸세요. 세 개 이상을 맞추면 사라집니다.";
      render();
    }

    resetBtn.addEventListener("click", newGame);
    registerGame("panel-match3", {
      init: newGame,
      stop() {
        runId++; // 진행 중인 연쇄 애니메이션을 취소합니다.
        busy = false;
      },
    });
  })();
