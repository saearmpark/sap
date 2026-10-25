  // ── STEP 6: 테트리스 ─────────────────────────────
  (function () {
    const canvas = document.getElementById("tt-canvas");
    const ctx = canvas.getContext("2d");
    const nextCanvas = document.getElementById("tt-next-canvas");
    const nextCtx = nextCanvas.getContext("2d");
    const holdCanvas = document.getElementById("tt-hold-canvas");
    const holdCtx = holdCanvas.getContext("2d");
    const statusEl = document.getElementById("tt-status");
    const startBtn = document.getElementById("tt-start");

    const COLS = 10, ROWS = 20, CELL = 24;

    // 블록 모양은 0/1로 채운 2차원 배열로 표현합니다. (1 = 칸이 채워짐)
    const SHAPES = {
      I: [[1, 1, 1, 1]],
      O: [[1, 1], [1, 1]],
      T: [[0, 1, 0], [1, 1, 1]],
      S: [[0, 1, 1], [1, 1, 0]],
      Z: [[1, 1, 0], [0, 1, 1]],
      J: [[1, 0, 0], [1, 1, 1]],
      L: [[0, 0, 1], [1, 1, 1]],
    };
    const TYPES = Object.keys(SHAPES);
    const COLORS = {
      I: "#3f6650", O: "#1b1f1d", T: "#8aa89a", S: "#c7d9cb",
      Z: "#565e58", J: "#2f4a3a", L: "#9fb8a8",
    };
    const css = getComputedStyle(document.documentElement);
    const INK = css.getPropertyValue("--ink").trim() || "#1b1f1d";

    const DAS_DELAY = 170; // 방향키를 누른 뒤 "연속 이동"이 시작되기까지 기다리는 시간(ms)
    const DAS_SPEED = 40;  // 연속 이동 중 한 칸씩 움직이는 간격(ms)

    let grid, piece, score, running, tickHandle;
    let nextType, holdType, holdUsed;
    let dasDir = 0, dasTimer = null, dasInterval = null;

    function emptyGrid() {
      return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    }

    function randomType() {
      return TYPES[Math.floor(Math.random() * TYPES.length)];
    }

    function makePiece(type) {
      const matrix = SHAPES[type];
      const col = Math.floor((COLS - matrix[0].length) / 2);
      return { type, matrix, row: 0, col };
    }

    // 2차원 배열을 시계 방향으로 90도 돌립니다: 열을 행으로 바꾸고 각 행의 순서를 뒤집습니다.
    function rotate(matrix) {
      return matrix[0].map((_, c) => matrix.map(row => row[c]).reverse());
    }

    function collide(matrix, row, col) {
      for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
          if (!matrix[r][c]) continue;
          const gr = row + r, gc = col + c;
          if (gc < 0 || gc >= COLS || gr >= ROWS) return true;
          if (gr >= 0 && grid[gr][gc]) return true;
        }
      }
      return false;
    }

    // ── 보완사항 1: 다음 블록 미리보기 ──────────────────
    // "다음 블록"을 nextType에 미리 하나 준비해두고, spawn()은 그걸 꺼내 쓰면서 또 다음 것을 새로 뽑습니다.
    function spawn() {
      const type = nextType !== null ? nextType : randomType();
      nextType = randomType();
      piece = makePiece(type);
      holdUsed = false; // 새 블록이 나왔으니 이번 블록에서는 다시 홀드를 쓸 수 있다
      if (collide(piece.matrix, piece.row, piece.col)) {
        gameOver();
      }
      drawNext();
    }

    function mergePiece() {
      piece.matrix.forEach((row, r) => {
        row.forEach((v, c) => {
          if (v) {
            const gr = piece.row + r, gc = piece.col + c;
            if (gr >= 0) grid[gr][gc] = piece.type;
          }
        });
      });
    }

    function clearLines() {
      let cleared = 0;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (grid[r].every(cell => cell)) {
          grid.splice(r, 1);
          grid.unshift(Array(COLS).fill(null));
          cleared++;
          r++; // 위 줄이 한 칸 내려왔으므로 같은 자리를 다시 검사한다
        }
      }
      const bonus = [0, 100, 300, 500, 800]; // 한 번에 여러 줄을 지우면 더 큰 보너스
      score += cleared <= 4 ? bonus[cleared] : cleared * 200;
    }

    function lockPiece() {
      mergePiece();
      clearLines();
      spawn();
    }

    function newGame() {
      grid = emptyGrid();
      score = 0;
      holdType = null;
      holdUsed = false;
      nextType = randomType();
      spawn();
      drawHold();
    }

    function gameOver() {
      running = false;
      clearInterval(tickHandle);
      stopDAS();
      clearInterval(softDropHandle);
      softDropHandle = null;
      window.reportScore?.("panel-tt", score);
      updateStatus(`게임 오버 · 최종 점수 ${score} (시작 버튼으로 재시작)`);
    }

    function updateStatus(text) {
      statusEl.textContent = text || `점수 ${score}`;
    }

    function softDrop() {
      if (!running) return;
      if (!collide(piece.matrix, piece.row + 1, piece.col)) {
        piece.row++;
      } else {
        lockPiece();
      }
      updateStatus();
      draw();
    }

    function hardDrop() {
      if (!running) return;
      piece.row = getGhostRow();
      lockPiece();
      updateStatus();
      draw();
    }

    function moveHorizontal(dir) {
      if (!running) return;
      if (!collide(piece.matrix, piece.row, piece.col + dir)) {
        piece.col += dir;
        draw();
      }
    }

    function rotatePiece() {
      if (!running) return;
      const rotated = rotate(piece.matrix);

      // 회전하면 가로/세로 칸 수가 바뀌므로(예: I블록 4x1 → 1x4), 그냥 왼쪽위 기준으로 두면
      // 블록이 옆으로 훅 튀어서 "반대로 도는 것처럼" 보인다. 가운데 지점이 그대로 유지되도록
      // 새 가로폭/세로높이 차이의 절반만큼 위치를 보정해준다.
      const oldW = piece.matrix[0].length, oldH = piece.matrix.length;
      const newW = rotated[0].length, newH = rotated.length;
      const baseRow = piece.row + Math.floor((oldH - newH) / 2);
      const baseCol = piece.col + Math.floor((oldW - newW) / 2);

      // 그래도 벽이나 다른 블록에 부딪히면 좌우로 살짝 밀어서(wall kick) 다시 시도해본다
      for (const offset of [0, -1, 1, -2, 2]) {
        if (!collide(rotated, baseRow, baseCol + offset)) {
          piece.matrix = rotated;
          piece.row = baseRow;
          piece.col = baseCol + offset;
          draw();
          return;
        }
      }
    }

    // ── 보완사항 2: 홀드 ────────────────────────────
    function holdPiece() {
      if (!running || holdUsed) return; // 한 블록당 한 번만 홀드할 수 있다 (표준 테트리스 규칙)

      const currentType = piece.type;
      if (holdType === null) {
        // 홀드 칸이 비어있으면: 지금 블록을 넣어두고, 예정돼 있던 다음 블록을 바로 가져온다
        holdType = currentType;
        piece = makePiece(nextType);
        nextType = randomType();
      } else {
        // 홀드 칸에 있던 블록과 지금 블록을 서로 바꾼다
        const swapType = holdType;
        holdType = currentType;
        piece = makePiece(swapType);
      }
      holdUsed = true;

      if (collide(piece.matrix, piece.row, piece.col)) {
        gameOver();
        return;
      }
      draw();
      drawNext();
      drawHold();
    }

    // ── 보완사항 3: 떨어질 위치(그림자) 계산 ─────────────
    function getGhostRow() {
      let r = piece.row;
      while (!collide(piece.matrix, r + 1, piece.col)) r++;
      return r;
    }

    function drawMatrix(targetCtx, matrix, type, cell) {
      targetCtx.fillStyle = COLORS[type];
      matrix.forEach((row, r) => {
        row.forEach((v, c) => {
          if (v) targetCtx.fillRect(c * cell, r * cell, cell - 1, cell - 1);
        });
      });
    }

    // NEXT/HOLD의 작은 미리보기 캔버스 한가운데에 블록 모양을 그린다
    function drawPreview(targetCtx, targetCanvas, type) {
      targetCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
      if (!type) return;
      const matrix = SHAPES[type];
      // 캔버스 크기에 맞춰 칸 크기를 계산한다 (가로로 가장 긴 I블록이 4칸이므로 1/4을 기준으로 삼는다)
      const cell = Math.floor(targetCanvas.width / 4);
      const w = matrix[0].length * cell, h = matrix.length * cell;
      targetCtx.save();
      targetCtx.translate((targetCanvas.width - w) / 2, (targetCanvas.height - h) / 2);
      drawMatrix(targetCtx, matrix, type, cell);
      targetCtx.restore();
    }

    function drawNext() {
      drawPreview(nextCtx, nextCanvas, nextType);
    }

    function drawHold() {
      drawPreview(holdCtx, holdCanvas, holdType);
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (grid[r][c]) {
            ctx.fillStyle = COLORS[grid[r][c]];
            ctx.fillRect(c * CELL, r * CELL, CELL - 1, CELL - 1);
          }
        }
      }

      if (piece) {
        // 그림자(떨어질 위치)를 먼저 그리고, 그 위에 실제 블록을 그린다.
        // 밝은 색 블록(S 등)은 옅은 배경 위에서 반투명으로 칠하면 거의 안 보이므로,
        // 블록 색 대신 항상 눈에 띄는 잉크색 테두리+옅은 채움으로 그린다.
        const ghostRow = getGhostRow();
        ctx.fillStyle = INK;
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2;
        piece.matrix.forEach((row, r) => {
          row.forEach((v, c) => {
            if (v) {
              const gr = ghostRow + r, gc = piece.col + c;
              if (gr >= 0) {
                ctx.globalAlpha = 0.12;
                ctx.fillRect(gc * CELL, gr * CELL, CELL - 1, CELL - 1);
                ctx.globalAlpha = 0.5;
                ctx.strokeRect(gc * CELL + 1, gr * CELL + 1, CELL - 3, CELL - 3);
              }
            }
          });
        });
        ctx.globalAlpha = 1;

        ctx.fillStyle = COLORS[piece.type];
        piece.matrix.forEach((row, r) => {
          row.forEach((v, c) => {
            if (v) {
              const gr = piece.row + r, gc = piece.col + c;
              if (gr >= 0) ctx.fillRect(gc * CELL, gr * CELL, CELL - 1, CELL - 1);
            }
          });
        });
      }
    }

    // ── 보완사항 4: 방향키를 누르고 있으면 빠르게 연속 이동(DAS) ───
    function startDAS(dir) {
      stopDAS();
      dasDir = dir;
      moveHorizontal(dir);
      dasTimer = setTimeout(() => {
        dasInterval = setInterval(() => moveHorizontal(dasDir), DAS_SPEED);
      }, DAS_DELAY);
    }

    function stopDAS() {
      clearTimeout(dasTimer);
      clearInterval(dasInterval);
      dasTimer = null;
      dasInterval = null;
      dasDir = 0;
    }

    document.addEventListener("keydown", (e) => {
      if (!running) return;
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " ", "Shift"].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === "ArrowLeft") {
        if (!e.repeat && dasDir !== -1) startDAS(-1);
        return;
      }
      if (e.key === "ArrowRight") {
        if (!e.repeat && dasDir !== 1) startDAS(1);
        return;
      }

      // 회전/하드드롭/홀드는 키를 계속 누르고 있어도 한 번만 반응한다 (아래 방향키는 빨리 내리기이므로 예외)
      if (e.repeat && e.key !== "ArrowDown") return;

      if (e.key === "ArrowUp") rotatePiece();
      else if (e.key === "ArrowDown") softDrop();
      else if (e.key === " ") hardDrop();
      else if (e.key === "Shift") holdPiece();
    });

    document.addEventListener("keyup", (e) => {
      if (e.key === "ArrowLeft" && dasDir === -1) stopDAS();
      else if (e.key === "ArrowRight" && dasDir === 1) stopDAS();
    });

    // 모바일 버튼: 좌우는 키보드와 같은 DAS(연속 이동)를 쓰고, 아래는 누르고 있는 동안 계속 소프트드롭한다.
    // 회전·하드드롭·홀드는 누를 때마다 한 번만 반응한다.
    const btnLeft = document.getElementById("tt-btn-left");
    const btnRight = document.getElementById("tt-btn-right");
    const btnRotate = document.getElementById("tt-btn-rotate");
    const btnDown = document.getElementById("tt-btn-down");
    const btnDrop = document.getElementById("tt-btn-drop");
    const btnHold = document.getElementById("tt-btn-hold");
    let softDropHandle = null;

    function bindHoldButton(btn, start, stop) {
      const press = (e) => { e.preventDefault(); start(); };
      const release = () => stop();
      btn.addEventListener("touchstart", press, { passive: false });
      btn.addEventListener("touchend", release);
      btn.addEventListener("touchcancel", release);
      btn.addEventListener("mousedown", press);
      btn.addEventListener("mouseup", release);
      btn.addEventListener("mouseleave", release);
    }
    function bindTapButton(btn, action) {
      const press = (e) => { e.preventDefault(); action(); };
      btn.addEventListener("touchstart", press, { passive: false });
      btn.addEventListener("mousedown", press);
    }

    bindHoldButton(btnLeft,
      () => { if (running && dasDir !== -1) startDAS(-1); },
      () => { if (dasDir === -1) stopDAS(); });
    bindHoldButton(btnRight,
      () => { if (running && dasDir !== 1) startDAS(1); },
      () => { if (dasDir === 1) stopDAS(); });
    bindHoldButton(btnDown,
      () => {
        if (!running || softDropHandle) return;
        softDrop();
        softDropHandle = setInterval(softDrop, 60);
      },
      () => { clearInterval(softDropHandle); softDropHandle = null; });

    bindTapButton(btnRotate, rotatePiece);
    bindTapButton(btnDrop, hardDrop);
    bindTapButton(btnHold, holdPiece);

    startBtn.addEventListener("click", () => {
      clearInterval(tickHandle);
      stopDAS();
      newGame();
      running = true;
      updateStatus();
      draw();
      tickHandle = setInterval(softDrop, 500); // 0.5초마다 한 칸씩 자동으로 내려온다
    });

    registerGame("panel-tt", {
      init() {
        grid = emptyGrid();
        piece = null;
        score = 0;
        nextType = null;
        holdType = null;
        holdUsed = false;
        running = false;
        clearInterval(tickHandle);
        stopDAS();
        updateStatus("시작 버튼을 눌러주세요");
        draw();
        drawNext();
        drawHold();
      },
      stop() {
        running = false;
        clearInterval(tickHandle);
        stopDAS();
        clearInterval(softDropHandle);
        softDropHandle = null;
      },
    });
  })();
