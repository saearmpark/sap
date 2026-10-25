  (function () {
    const SIZE = 8;
    const EMPTY = 0, BLACK = 1, WHITE = 2;
    const DIRECTIONS = [
      [-1, -1], [-1, 0], [-1, 1], [0, -1],
      [0, 1], [1, -1], [1, 0], [1, 1],
    ];
    const POSITION = [
      [100, -20, 10, 5, 5, 10, -20, 100],
      [-20, -50, -2, -2, -2, -2, -50, -20],
      [10, -2, 5, 1, 1, 5, -2, 10],
      [5, -2, 1, 0, 0, 1, -2, 5],
      [5, -2, 1, 0, 0, 1, -2, 5],
      [10, -2, 5, 1, 1, 5, -2, 10],
      [-20, -50, -2, -2, -2, -2, -50, -20],
      [100, -20, 10, 5, 5, 10, -20, 100],
    ];
    const boardEl = document.getElementById("othello-board");
    const statusEl = document.getElementById("othello-status");
    const scoreEl = document.getElementById("othello-score");
    let board = [];
    let current = BLACK;
    let finished = false;
    let active = false;
    let computerTimer = null;

    function flipsFor(row, col, player, state = board) {
      if (state[row][col] !== EMPTY) return [];
      const opponent = player === BLACK ? WHITE : BLACK;
      const flips = [];
      for (const [dr, dc] of DIRECTIONS) {
        let r = row + dr, c = col + dc;
        const line = [];
        while (r >= 0 && r < SIZE && c >= 0 && c < SIZE && state[r][c] === opponent) {
          line.push([r, c]);
          r += dr;
          c += dc;
        }
        if (line.length && r >= 0 && r < SIZE && c >= 0 && c < SIZE && state[r][c] === player) {
          flips.push(...line);
        }
      }
      return flips;
    }

    function legalMoves(player, state = board) {
      const moves = [];
      for (let row = 0; row < SIZE; row++) {
        for (let col = 0; col < SIZE; col++) {
          if (flipsFor(row, col, player, state).length) moves.push({ row, col });
        }
      }
      return moves;
    }

    function counts() {
      let black = 0, white = 0;
      for (const row of board) {
        for (const cell of row) {
          if (cell === BLACK) black++;
          if (cell === WHITE) white++;
        }
      }
      return { black, white };
    }

    function render() {
      const moves = current === BLACK && !finished ? legalMoves(BLACK) : [];
      boardEl.replaceChildren();
      for (let row = 0; row < SIZE; row++) {
        for (let col = 0; col < SIZE; col++) {
          const cell = document.createElement("button");
          cell.type = "button";
          cell.className = "othello-cell";
          cell.setAttribute("role", "gridcell");
          cell.setAttribute("aria-label", `행 ${row + 1}, 열 ${col + 1}`);
          const isLegal = moves.some(move => move.row === row && move.col === col);
          if (isLegal) cell.classList.add("is-legal");
          if (board[row][col] !== EMPTY) {
            const stone = document.createElement("span");
            stone.className = `othello-stone ${board[row][col] === BLACK ? "is-black" : "is-white"}`;
            cell.appendChild(stone);
          }
          cell.disabled = !active || finished || current !== BLACK || !isLegal;
          cell.addEventListener("click", () => playMove(row, col, BLACK));
          boardEl.appendChild(cell);
        }
      }

      const { black, white } = counts();
      scoreEl.textContent = `검은 돌 ${black}개 · 흰 돌 ${white}개`;
    }

    function finish() {
      finished = true;
      const { black, white } = counts();
      if (black === white) statusEl.textContent = `무승부입니다! 검은 돌 ${black}개, 흰 돌 ${white}개`;
      else statusEl.textContent = black > white
        ? `승리했습니다! 검은 돌 ${black}개, 흰 돌 ${white}개`
        : `컴퓨터가 이겼습니다. 검은 돌 ${black}개, 흰 돌 ${white}개`;
      render();
    }

    function advanceTurn(nextPlayer) {
      const other = nextPlayer === BLACK ? WHITE : BLACK;
      if (!legalMoves(nextPlayer).length) {
        if (!legalMoves(other).length) {
          finish();
          return;
        }
        current = other;
        statusEl.textContent = `${nextPlayer === BLACK ? "내가" : "컴퓨터가"} 둘 곳이 없어 차례를 넘깁니다.`;
      } else {
        current = nextPlayer;
        statusEl.textContent = current === BLACK ? "내 차례입니다. 둘 곳을 선택하세요." : "컴퓨터가 생각 중입니다...";
      }
      render();
      if (active && current === WHITE && !finished) {
        clearTimeout(computerTimer);
        computerTimer = setTimeout(playComputer, 420);
      }
    }

    function playMove(row, col, player) {
      if (!active || finished || current !== player) return;
      const flips = flipsFor(row, col, player);
      if (!flips.length) return;
      board[row][col] = player;
      for (const [r, c] of flips) board[r][c] = player;
      advanceTurn(player === BLACK ? WHITE : BLACK);
    }

    function chooseComputerMove(moves) {
      const opponent = BLACK;
      return moves.reduce((best, move) => {
        const next = board.map(row => row.slice());
        const flips = flipsFor(move.row, move.col, WHITE, next);
        next[move.row][move.col] = WHITE;
        for (const [row, col] of flips) next[row][col] = WHITE;
        const mobility = legalMoves(WHITE, next).length - legalMoves(opponent, next).length;
        const score = POSITION[move.row][move.col] * 5 + flips.length + mobility * 3;
        return !best || score > best.score ? { ...move, score } : best;
      }, null);
    }

    function playComputer() {
      computerTimer = null;
      if (!active || finished || current !== WHITE) return;
      const moves = legalMoves(WHITE);
      if (!moves.length) {
        advanceTurn(BLACK);
        return;
      }
      const move = chooseComputerMove(moves);
      playMove(move.row, move.col, WHITE);
    }

    function reset() {
      clearTimeout(computerTimer);
      computerTimer = null;
      board = Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY));
      board[3][3] = board[4][4] = WHITE;
      board[3][4] = board[4][3] = BLACK;
      current = BLACK;
      finished = false;
      active = true;
      statusEl.textContent = "내 차례입니다. 표시된 칸에 검은 돌을 놓으세요.";
      render();
    }

    document.getElementById("othello-reset").addEventListener("click", reset);
    registerGame("panel-othello", {
      init() {
        if (!board.length) reset();
        else {
          active = true;
          render();
          if (current === WHITE && !finished) {
            computerTimer = setTimeout(playComputer, 420);
          }
        }
      },
      stop() {
        active = false;
        clearTimeout(computerTimer);
        computerTimer = null;
      },
    });
  })();
