  (function () {
    const ROWS = 10, COLS = 9;
    const RED = "r", BLUE = "b";
    const LABELS = { general: "將", guard: "士", elephant: "象", horse: "馬", chariot: "車", cannon: "包", soldier: "卒" };
    const VALUES = { general: 10000, guard: 80, elephant: 150, horse: 180, chariot: 300, cannon: 250, soldier: 70 };
    const boardEl = document.getElementById("janggi-board");
    const statusEl = document.getElementById("janggi-status");
    const scoreEl = document.getElementById("janggi-score");
    const redFormationEl = document.getElementById("janggi-red-formation");
    const blueFormationEl = document.getElementById("janggi-blue-formation");
    const passButton = document.getElementById("janggi-pass");
    let board = [];
    let turn = RED;
    let selected = null;
    let legal = [];
    let finished = false;
    let active = false;
    let aiTimer = null;
    let lastMove = null;

    function palace(row, col, color) {
      return col >= 3 && col <= 5 && (color === BLUE ? row <= 2 : row >= 7);
    }
    function palacePoint(row, col, color) {
      const localRow = color === BLUE ? row : row - 7;
      const localCol = col - 3;
      return localRow === localCol || localRow + localCol === 2;
    }
    function palaceColorAt(row, col) {
      if (col < 3 || col > 5) return null;
      if (row <= 2) return BLUE;
      if (row >= 7) return RED;
      return null;
    }
    function onPalaceDiagonal(row, col) {
      const color = palaceColorAt(row, col);
      return color !== null && palacePoint(row, col, color);
    }
    function samePalaceDiagonal(fromRow, fromCol, toRow, toCol) {
      const color = palaceColorAt(fromRow, fromCol);
      return color !== null && palaceColorAt(toRow, toCol) === color
        && palacePoint(fromRow, fromCol, color) && palacePoint(toRow, toCol, color);
    }
    function onBoard(row, col) {
      return row >= 0 && row < ROWS && col >= 0 && col < COLS;
    }
    function clone(state) {
      return state.map(row => row.map(piece => piece ? { ...piece } : null));
    }
    function generalPosition(state, color) {
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          if (state[row][col]?.color === color && state[row][col].type === "general") return { row, col };
        }
      }
      return null;
    }

    function pseudoMoves(state, row, col) {
      const piece = state[row][col];
      if (!piece) return [];
      const moves = [];
      const add = (toRow, toCol) => {
        if (!onBoard(toRow, toCol) || state[toRow][toCol]?.color === piece.color) return false;
        moves.push({ fromRow: row, fromCol: col, row: toRow, col: toCol });
        return !state[toRow][toCol];
      };
      const addRay = (dr, dc, allowPalaceDiagonal = false) => {
        let toRow = row + dr, toCol = col + dc;
        while (onBoard(toRow, toCol)) {
          if (dr && dc && !(allowPalaceDiagonal && samePalaceDiagonal(row, col, toRow, toCol))) break;
          if (!add(toRow, toCol)) break;
          toRow += dr;
          toCol += dc;
        }
      };

      if (piece.type === "general" || piece.type === "guard") {
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]]) {
          const toRow = row + dr, toCol = col + dc;
          if (!palace(toRow, toCol, piece.color)) continue;
          if (dr && dc && (!palacePoint(row, col, piece.color) || !palacePoint(toRow, toCol, piece.color))) continue;
          add(toRow, toCol);
        }
      } else if (piece.type === "chariot") {
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]]) {
          addRay(dr, dc, true);
        }
      } else if (piece.type === "cannon") {
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]]) {
          const diagonal = Boolean(dr && dc);
          if (diagonal && !onPalaceDiagonal(row, col)) continue;
          let toRow = row + dr, toCol = col + dc, screenFound = false;
          while (onBoard(toRow, toCol)) {
            if (diagonal && !samePalaceDiagonal(row, col, toRow, toCol)) break;
            const target = state[toRow][toCol];
            if (!screenFound) {
              if (target) {
                if (target.type === "cannon") break;
                screenFound = true;
              }
            } else {
              if (target) {
                if (target.color !== piece.color && target.type !== "cannon") {
                  moves.push({ fromRow: row, fromCol: col, row: toRow, col: toCol });
                }
                break;
              }
              moves.push({ fromRow: row, fromCol: col, row: toRow, col: toCol });
            }
            toRow += dr;
            toCol += dc;
          }
        }
      } else if (piece.type === "horse") {
        const patterns = [
          [-2, -1, -1, 0], [-2, 1, -1, 0], [2, -1, 1, 0], [2, 1, 1, 0],
          [-1, -2, 0, -1], [1, -2, 0, -1], [-1, 2, 0, 1], [1, 2, 0, 1],
        ];
        for (const [dr, dc, br, bc] of patterns) {
          const blockRow = row + br, blockCol = col + bc;
          if (onBoard(blockRow, blockCol) && !state[blockRow][blockCol]) add(row + dr, col + dc);
        }
      } else if (piece.type === "elephant") {
        for (const sr of [-1, 1]) for (const sc of [-1, 1]) {
          const paths = [
            { end: [row + sr * 3, col + sc * 2], blocks: [[row + sr, col], [row + sr * 2, col + sc]] },
            { end: [row + sr * 2, col + sc * 3], blocks: [[row, col + sc], [row + sr, col + sc * 2]] },
          ];
          for (const path of paths) {
            const [toRow, toCol] = path.end;
            if (!onBoard(toRow, toCol)) continue;
            if (path.blocks.some(([r, c]) => !onBoard(r, c) || state[r][c])) continue;
            add(toRow, toCol);
          }
        }
      } else if (piece.type === "soldier") {
        const forward = piece.color === RED ? -1 : 1;
        add(row + forward, col);
        add(row, col - 1);
        add(row, col + 1);
        const enemyColor = piece.color === RED ? BLUE : RED;
        for (const dc of [-1, 1]) {
          const toRow = row + forward, toCol = col + dc;
          if (palace(toRow, toCol, enemyColor) && palacePoint(toRow, toCol, enemyColor)
              && palacePoint(row, col, enemyColor)) add(toRow, toCol);
        }
      }
      return moves;
    }

    function allPseudo(state, color) {
      const moves = [];
      for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) {
        if (state[row][col]?.color === color) moves.push(...pseudoMoves(state, row, col));
      }
      const general = generalPosition(state, color === RED ? BLUE : RED);
      if (general) {
        const ownGeneral = generalPosition(state, color);
        if (ownGeneral && ownGeneral.col === general.col) {
          let clear = true;
          for (let row = Math.min(ownGeneral.row, general.row) + 1; row < Math.max(ownGeneral.row, general.row); row++) {
            if (state[row][general.col]) clear = false;
          }
          if (clear) moves.push({ fromRow: ownGeneral.row, fromCol: ownGeneral.col, row: general.row, col: general.col });
        }
      }
      return moves;
    }

    function inCheck(state, color) {
      const general = generalPosition(state, color);
      if (!general) return true;
      const enemy = color === RED ? BLUE : RED;
      return allPseudo(state, enemy).some(move => move.row === general.row && move.col === general.col);
    }
    function applyMove(state, move) {
      const next = clone(state);
      next[move.row][move.col] = next[move.fromRow][move.fromCol];
      next[move.fromRow][move.fromCol] = null;
      return next;
    }
    function legalMoves(color, state = board) {
      return allPseudo(state, color).filter(move => {
        if (state[move.row][move.col]?.type === "general") return false;
        return !inCheck(applyMove(state, move), color);
      });
    }
    function material(state, color) {
      let score = 0;
      for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) {
        const piece = state[row][col];
        if (!piece) continue;
        const sign = piece.color === BLUE ? 1 : -1;
        score += sign * VALUES[piece.type];
        if (piece.type === "soldier") score += sign * (piece.color === BLUE ? row : ROWS - 1 - row) * 4;
        if (piece.type === "horse" || piece.type === "elephant") score += sign * (4 - Math.abs(4 - col)) * 3;
      }
      return color === BLUE ? score : -score;
    }
    function chooseComputerMove(moves) {
      let bestScore = -Infinity, choices = [];
      for (const move of moves) {
        const captured = board[move.row][move.col];
        const next = applyMove(board, move);
        const score = (captured ? VALUES[captured.type] * 1.3 : 0)
          + material(next, BLUE) * 0.12
          + (move.row - move.fromRow) * 3
          + Math.random() * 5;
        if (score > bestScore) {
          bestScore = score;
          choices = [move];
        } else if (score === bestScore) choices.push(move);
      }
      return choices[Math.floor(Math.random() * choices.length)];
    }

    function render() {
      const targets = new Set(legal.map(move => `${move.row},${move.col}`));
      boardEl.replaceChildren();
      const palaceLines = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      palaceLines.setAttribute("viewBox", "0 0 9 10");
      palaceLines.setAttribute("class", "janggi-palace-lines");
      for (const [x1, y1, x2, y2] of [
        [3.5, 0.5, 5.5, 2.5], [5.5, 0.5, 3.5, 2.5],
        [3.5, 7.5, 5.5, 9.5], [5.5, 7.5, 3.5, 9.5],
      ]) {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", x1);
        line.setAttribute("y1", y1);
        line.setAttribute("x2", x2);
        line.setAttribute("y2", y2);
        line.setAttribute("stroke", "#9a7046");
        line.setAttribute("stroke-width", "0.045");
        palaceLines.appendChild(line);
      }
      boardEl.appendChild(palaceLines);
      for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) {
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "janggi-cell";
        cell.setAttribute("role", "gridcell");
        cell.setAttribute("aria-label", `행 ${row + 1}, 열 ${col + 1}`);
        if (selected?.row === row && selected?.col === col) cell.classList.add("is-selected");
        if (targets.has(`${row},${col}`)) cell.classList.add("is-legal");
        if (lastMove && lastMove.fromRow === row && lastMove.fromCol === col) cell.classList.add("is-last-from");
        if (lastMove && lastMove.row === row && lastMove.col === col) cell.classList.add("is-last-move");
        const piece = board[row][col];
        if (piece) {
          const label = document.createElement("span");
          label.className = `janggi-piece ${piece.color === RED ? "is-red" : "is-blue"}`;
          label.textContent = LABELS[piece.type];
          cell.appendChild(label);
        }
        cell.disabled = !active || finished || turn !== RED;
        cell.addEventListener("click", () => choose(row, col));
        boardEl.appendChild(cell);
      }
      let red = 0, blue = 0;
      for (const row of board) for (const piece of row) {
        if (piece?.color === RED) red++;
        if (piece?.color === BLUE) blue++;
      }
      scoreEl.textContent = `빨강 ${red}개 · 파랑 ${blue}개`;
      passButton.disabled = !active || finished || turn !== RED || inCheck(board, RED);
    }
    function completeTurn() {
      selected = null;
      turn = turn === RED ? BLUE : RED;
      legal = legalMoves(turn);
      if (!legal.length) {
        if (inCheck(board, turn)) {
          finished = true;
          statusEl.textContent = `${turn === RED ? "파랑" : "빨강"} 승리! 장군입니다.`;
        } else if (turn === BLUE) {
          turn = RED;
          legal = legalMoves(RED);
          statusEl.textContent = "컴퓨터가 둘 수 없어 한 수 쉽니다. 내 차례입니다.";
        } else {
          statusEl.textContent = "둘 수 있는 말이 없습니다. 한 수 쉬세요.";
        }
        render();
        return;
      }
      if (turn === BLUE) {
        statusEl.textContent = "컴퓨터가 생각 중입니다...";
        render();
        aiTimer = setTimeout(playComputer, 400);
      } else {
        statusEl.textContent = inCheck(board, RED) ? "장군입니다! 장군을 피하세요." : "내 차례입니다. 말을 선택하세요.";
        render();
      }
    }
    function playComputer() {
      aiTimer = null;
      if (!active || finished || turn !== BLUE) return;
      legal = legalMoves(BLUE);
      if (!legal.length) {
        if (inCheck(board, BLUE)) {
          finished = true;
          statusEl.textContent = "빨강 승리! 컴퓨터가 장군입니다.";
        } else {
          turn = RED;
          legal = legalMoves(RED);
          statusEl.textContent = "컴퓨터가 둘 수 없어 한 수 쉽니다. 내 차례입니다.";
        }
        render();
        return;
      }
      const move = chooseComputerMove(legal);
      lastMove = { fromRow: move.fromRow, fromCol: move.fromCol, row: move.row, col: move.col };
      board = applyMove(board, move);
      completeTurn();
    }
    function choose(row, col) {
      if (!active || finished || turn !== RED) return;
      const move = selected && legal.find(candidate => candidate.row === row && candidate.col === col);
      if (move) {
        lastMove = { fromRow: move.fromRow, fromCol: move.fromCol, row: move.row, col: move.col };
        board = applyMove(board, move);
        completeTurn();
      } else if (board[row][col]?.color === RED) {
        selected = { row, col };
        legal = legalMoves(RED).filter(candidate => candidate.fromRow === row && candidate.fromCol === col);
        render();
      } else {
        selected = null;
        legal = legalMoves(RED);
        render();
      }
    }
    function reset() {
      clearTimeout(aiTimer);
      aiTimer = null;
      board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
      for (const [color, backRow, soldierRow, cannonRow, formation] of [
        [BLUE, 0, 3, 2, blueFormationEl.value],
        [RED, 9, 6, 7, redFormationEl.value],
      ]) {
        board[backRow][0] = { type: "chariot", color };
        board[backRow][3] = { type: "guard", color };
        board[backRow][5] = { type: "guard", color };
        board[backRow][8] = { type: "chariot", color };
        board[color === BLUE ? 1 : 8][4] = { type: "general", color };
        for (const [index, col] of [1, 2, 6, 7].entries()) {
          board[backRow][col] = { type: formation[index] === "H" ? "horse" : "elephant", color };
        }
        for (let col = 0; col < COLS; col++) {
          if (col % 2 === 0) board[soldierRow][col] = { type: "soldier", color };
        }
        board[cannonRow][1] = { type: "cannon", color };
        board[cannonRow][7] = { type: "cannon", color };
      }
      turn = RED;
      selected = null;
      lastMove = null;
      finished = false;
      active = true;
      legal = legalMoves(RED);
      statusEl.textContent = "내 차례입니다. 빨강 말을 선택하세요.";
      render();
    }
    passButton.addEventListener("click", () => {
      if (!active || finished || turn !== RED || inCheck(board, RED)) return;
      completeTurn();
    });
    document.getElementById("janggi-reset").addEventListener("click", reset);
    registerGame("panel-janggi", {
      init() { if (!board.length) reset(); else { active = true; render(); if (turn === BLUE && !finished) aiTimer = setTimeout(playComputer, 0); } },
      stop() { active = false; clearTimeout(aiTimer); aiTimer = null; },
    });
  })();
