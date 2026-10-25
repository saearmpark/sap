  (function () {
    const ROWS = 6, COLS = 7, CONNECT = 4;
    const boardEl = document.getElementById("connect-board");
    const statusEl = document.getElementById("connect-status");
    let board = [];
    let current = 1;
    let gameOver = false;
    let computerTimer = null;

    function hasWon(row, col, player, state = board) {
      const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
      return directions.some(([dr, dc]) => {
        let count = 1;
        for (const sign of [-1, 1]) {
          let r = row + dr * sign, c = col + dc * sign;
          while (r >= 0 && r < ROWS && c >= 0 && c < COLS && state[r][c] === player) {
            count++;
            r += dr * sign;
            c += dc * sign;
          }
        }
        return count >= CONNECT;
      });
    }

    function render() {
      boardEl.replaceChildren();
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const slot = document.createElement("button");
          slot.type = "button";
          slot.className = "connect-slot";
          slot.setAttribute("aria-label", `행 ${row + 1}, 열 ${col + 1}${board[row][col] ? " 놓인 돌 있음" : " 빈칸"}`);
          if (board[row][col] === 1) slot.classList.add("is-red");
          if (board[row][col] === 2) slot.classList.add("is-yellow");
          slot.disabled = gameOver || current !== 1 || Boolean(board[row][col]);
          slot.addEventListener("click", () => drop(col));
          boardEl.appendChild(slot);
        }
      }
    }

    function place(col, player) {
      if (gameOver || (player === 1 && current !== 1) || (player === 2 && current !== 2)) return;
      for (let row = ROWS - 1; row >= 0; row--) {
        if (board[row][col]) continue;
        board[row][col] = player;
        if (hasWon(row, col, player)) {
          gameOver = true;
          statusEl.textContent = player === 1 ? "내가 이겼습니다!" : "컴퓨터가 이겼습니다.";
        } else if (board.every(line => line.every(Boolean))) {
          gameOver = true;
          statusEl.textContent = "무승부입니다!";
        } else {
          current = player === 1 ? 2 : 1;
          statusEl.textContent = current === 1 ? "🔴 내 차례" : "컴퓨터가 생각 중입니다...";
        }
        render();
        if (player === 1 && !gameOver) computerTimer = setTimeout(playComputer, 350);
        return;
      }
    }

    function availableRow(state, col) {
      for (let row = ROWS - 1; row >= 0; row--) if (!state[row][col]) return row;
      return -1;
    }

    function evaluate(state) {
      let score = 0;
      for (let row = 0; row < ROWS; row++) if (state[row][Math.floor(COLS / 2)] === 2) score += 4;
      const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          for (const [dr, dc] of directions) {
            const endRow = row + dr * 3, endCol = col + dc * 3;
            if (endRow < 0 || endRow >= ROWS || endCol < 0 || endCol >= COLS) continue;
            const window = [0, 1, 2, 3].map(offset => state[row + dr * offset][col + dc * offset]);
            const computer = window.filter(value => value === 2).length;
            const human = window.filter(value => value === 1).length;
            if (computer && !human) score += [0, 2, 16, 120, 100000][computer];
            if (human && !computer) score -= [0, 3, 22, 180, 100000][human];
          }
        }
      }
      return score;
    }

    function search(state, depth, alpha, beta, maximizing, lastMove) {
      if (lastMove && hasWon(lastMove.row, lastMove.col, lastMove.player, state)) return lastMove.player === 2 ? 1000000 + depth : -1000000 - depth;
      if (!depth || state.every(line => line.every(Boolean))) return evaluate(state);
      const player = maximizing ? 2 : 1;
      let best = maximizing ? -Infinity : Infinity;
      for (const col of [3, 2, 4, 1, 5, 0, 6]) {
        const row = availableRow(state, col);
        if (row < 0) continue;
        state[row][col] = player;
        const score = search(state, depth - 1, alpha, beta, !maximizing, { row, col, player });
        state[row][col] = 0;
        if (maximizing) {
          best = Math.max(best, score);
          alpha = Math.max(alpha, best);
        } else {
          best = Math.min(best, score);
          beta = Math.min(beta, best);
        }
        if (beta <= alpha) break;
      }
      return best;
    }

    function bestComputerColumn() {
      let bestScore = -Infinity, choices = [];
      for (const col of [3, 2, 4, 1, 5, 0, 6]) {
        const row = availableRow(board, col);
        if (row < 0) continue;
        board[row][col] = 2;
        const score = search(board, 4, -Infinity, Infinity, false, { row, col, player: 2 });
        board[row][col] = 0;
        if (score > bestScore) { bestScore = score; choices = [col]; }
        else if (score === bestScore) choices.push(col);
      }
      return choices[Math.floor(Math.random() * choices.length)];
    }

    function drop(col) {
      if (current === 1) place(col, 1);
    }

    function playComputer() {
      computerTimer = null;
      if (gameOver || current !== 2) return;
      const col = bestComputerColumn();
      if (col !== undefined) place(col, 2);
    }

    function reset() {
      clearTimeout(computerTimer);
      computerTimer = null;
      board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
      current = 1;
      gameOver = false;
      statusEl.textContent = "🔴 내 차례";
      render();
    }

    document.getElementById("connect-reset").addEventListener("click", reset);
    registerGame("panel-connect", {
      init: reset,
      stop() {
        if (computerTimer !== null) {
          clearTimeout(computerTimer);
          playComputer();
        }
      },
    });
  })();
