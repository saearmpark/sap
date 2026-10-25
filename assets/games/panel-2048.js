  // ── STEP 7: 2048 ─────────────────────────────
  (function () {
    const canvas = document.getElementById("tw-canvas");
    const ctx = canvas.getContext("2d");
    const statusEl = document.getElementById("tw-status");
    const startBtn = document.getElementById("tw-start");

    const SIZE = 4;
    const CELL = canvas.width / SIZE; // 360 / 4 = 90

    const css = getComputedStyle(document.documentElement);
    const BG = css.getPropertyValue("--bg").trim() || "#f7f6f2";
    const BORDER = css.getPropertyValue("--border").trim() || "#e2e0d8";
    const INK = css.getPropertyValue("--ink").trim() || "#1b1f1d";

    // 타일 값이 커질수록 점점 진한 색으로 — 2는 가장 연하고, 2048에 가까울수록 진하다
    const TILE_COLORS = {
      2: "#eef1ea", 4: "#dde6dd", 8: "#c7d9cb", 16: "#aecab3",
      32: "#8aa89a", 64: "#6f9484", 128: "#3f6650", 256: "#2f4a3a",
      512: "#235038", 1024: "#17332a", 2048: "#1b1f1d",
    };

    let grid, score, running;

    function emptyGrid() {
      return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    }

    function emptyCells() {
      const cells = [];
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          if (!grid[r][c]) cells.push([r, c]);
        }
      }
      return cells;
    }

    function addRandomTile() {
      const cells = emptyCells();
      if (cells.length === 0) return;
      const [r, c] = cells[Math.floor(Math.random() * cells.length)];
      grid[r][c] = Math.random() < 0.9 ? 2 : 4; // 10%의 확률로 4가 나온다
    }

    // 한 줄(왼쪽 기준)을 압축하고, 같은 값이 연속으로 붙어 있으면 한 번만 합친다.
    // 예: [2,2,4,0] → 압축 [2,2,4] → 병합 [4,4] → 4칸으로 채움 [4,4,0,0]
    function slideRowLeft(row) {
      const filtered = row.filter(v => v !== 0);
      const merged = [];
      let gained = 0;

      for (let i = 0; i < filtered.length; i++) {
        if (i < filtered.length - 1 && filtered[i] === filtered[i + 1]) {
          const value = filtered[i] * 2;
          merged.push(value);
          gained += value;
          i++; // 합쳐진 다음 칸은 건너뛴다 (한 번에 두 개씩만 합쳐지게)
        } else {
          merged.push(filtered[i]);
        }
      }
      while (merged.length < SIZE) merged.push(0);

      const moved = merged.some((v, i) => v !== row[i]);
      return { row: merged, gained, moved };
    }

    function transpose(g) {
      return g[0].map((_, c) => g.map(row => row[c]));
    }

    function reverseRows(g) {
      return g.map(row => row.slice().reverse());
    }

    // 네 방향 전부를 "왼쪽으로 밀기" 하나로 처리한다: 방향에 맞게 격자를 돌리고(transpose/reverse)
    // slideRowLeft를 적용한 다음, 다시 원래 방향으로 돌려놓는다.
    function transformIn(g, dir) {
      if (dir === "up") return transpose(g);
      if (dir === "down") return reverseRows(transpose(g));
      if (dir === "right") return reverseRows(g);
      return g; // left
    }

    function transformOut(g, dir) {
      if (dir === "up") return transpose(g);
      if (dir === "down") return transpose(reverseRows(g));
      if (dir === "right") return reverseRows(g);
      return g; // left
    }

    function slide(g, dir) {
      const transformed = transformIn(g, dir);
      let moved = false;
      let gained = 0;
      const result = transformed.map(row => {
        const r = slideRowLeft(row);
        if (r.moved) moved = true;
        gained += r.gained;
        return r.row;
      });
      return { grid: transformOut(result, dir), moved, gained };
    }

    function hasMovesLeft() {
      return ["left", "right", "up", "down"].some(dir => slide(grid, dir).moved);
    }

    function move(dir) {
      if (!running) return;
      const result = slide(grid, dir);
      if (!result.moved) return; // 그 방향으로는 아무것도 바뀌지 않으면 타일을 새로 만들지 않는다

      grid = result.grid;
      score += result.gained;
      addRandomTile();
      draw();

      if (!hasMovesLeft()) {
        running = false;
        window.reportScore?.("panel-2048", score);
        updateStatus(`게임 오버 · 최종 점수 ${score} (시작 버튼으로 재시작)`);
      } else {
        updateStatus();
      }
    }

    function newGame() {
      grid = emptyGrid();
      score = 0;
      addRandomTile();
      addRandomTile();
    }

    function updateStatus(text) {
      statusEl.textContent = text || `점수 ${score}`;
    }

    function draw() {
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const FONT_FAMILY = "'IBM Plex Mono', 'D2Coding', ui-monospace, Menlo, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          const value = grid[r][c];
          const x = c * CELL + 4, y = r * CELL + 4, w = CELL - 8, h = CELL - 8;

          ctx.fillStyle = value ? (TILE_COLORS[value] || "#0f1210") : BORDER;
          ctx.fillRect(x, y, w, h);

          if (value) {
            // 캔버스 font는 CSS 변수(var(--mono))를 이해하지 못해서 적용이 안 되고 작은 기본
            // 글꼴로 보이는 문제가 있었다. 실제 글꼴 이름을 직접 적어주고 크기도 크게 키운다.
            // 숫자가 네 자리(1024, 2048)가 되면 칸을 넘지 않도록 글씨를 살짝 줄인다.
            const fontSize = String(value).length >= 4 ? 26 : 34;
            ctx.font = `bold ${fontSize}px ${FONT_FAMILY}`;
            ctx.fillStyle = value <= 8 ? INK : "#f7f6f2";
            ctx.fillText(String(value), x + w / 2, y + h / 2 + 1);
          }
        }
      }
    }

    document.addEventListener("keydown", (e) => {
      if (!running) return;
      const map = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" };
      const dir = map[e.key];
      if (!dir) return;
      e.preventDefault();
      move(dir);
    });

    // 모바일: 방향 버튼을 누르면 같은 move()를 그대로 호출한다
    function bindDirButton(id, dir) {
      const btn = document.getElementById(id);
      const press = (e) => { e.preventDefault(); move(dir); };
      btn.addEventListener("touchstart", press, { passive: false });
      btn.addEventListener("mousedown", press);
    }
    bindDirButton("tw-up", "up");
    bindDirButton("tw-down", "down");
    bindDirButton("tw-left", "left");
    bindDirButton("tw-right", "right");

    startBtn.addEventListener("click", () => {
      newGame();
      running = true;
      updateStatus();
      draw();
    });

    registerGame("panel-2048", {
      init() {
        grid = emptyGrid();
        score = 0;
        running = false;
        updateStatus("시작 버튼을 눌러주세요 (조작: 방향키)");
        draw();
      },
      stop() {
        running = false;
      },
    });
  })();
