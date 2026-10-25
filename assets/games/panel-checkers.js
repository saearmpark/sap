  (function () {
    const SIZE = 8;
    const RED = 1, BLACK = 2;
    const boardEl = document.getElementById("checkers-board");
    const statusEl = document.getElementById("checkers-status");
    const scoreEl = document.getElementById("checkers-score");
    let board = [];
    let current = RED;
    let selected = null;
    let legal = [];
    let forcedFrom = null;
    let finished = false;
    let active = false;
    let computerMoving = false;
    let computerTimer = null;
    let computerSteps = null;
    let computerStepIndex = 0;

    function movesFrom(row, col, state = board) {
      const piece = state[row][col];
      if (!piece) return [];
      const forward = piece.player === RED ? -1 : 1;
      const rowSteps = piece.king ? [-1, 1] : [forward];
      const moves = [];
      for (const dr of rowSteps) {
        for (const dc of [-1, 1]) {
          const nextRow = row + dr, nextCol = col + dc;
          if (nextRow < 0 || nextRow >= SIZE || nextCol < 0 || nextCol >= SIZE) continue;
          if (!state[nextRow][nextCol]) {
            moves.push({ row: nextRow, col: nextCol, capture: null });
            continue;
          }
          if (state[nextRow][nextCol].player === piece.player) continue;
          const jumpRow = row + dr * 2, jumpCol = col + dc * 2;
          if (jumpRow >= 0 && jumpRow < SIZE && jumpCol >= 0 && jumpCol < SIZE && !state[jumpRow][jumpCol]) {
            moves.push({ row: jumpRow, col: jumpCol, capture: { row: nextRow, col: nextCol } });
          }
        }
      }
      return moves;
    }

    function movesFor(player, state = board) {
      const moves = [];
      for (let row = 0; row < SIZE; row++) {
        for (let col = 0; col < SIZE; col++) {
          if (state[row][col]?.player === player) {
            for (const move of movesFrom(row, col, state)) moves.push({ fromRow: row, fromCol: col, ...move });
          }
        }
      }
      const captures = moves.filter(move => move.capture);
      return captures.length ? captures : moves;
    }

    function cloneBoard(state) {
      return state.map(row => row.map(piece => piece ? { ...piece } : null));
    }

    function applyMove(state, move) {
      const next = cloneBoard(state);
      const piece = next[move.fromRow][move.fromCol];
      next[move.fromRow][move.fromCol] = null;
      next[move.row][move.col] = piece;
      if (move.capture) next[move.capture.row][move.capture.col] = null;
      const promoted = !piece.king && ((piece.player === RED && move.row === 0)
        || (piece.player === BLACK && move.row === SIZE - 1));
      if (promoted) piece.king = true;
      return { board: next, promoted };
    }

    function turnOptions(state, player) {
      const options = [];
      function extend(currentBoard, move, steps) {
        const { board: nextBoard, promoted } = applyMove(currentBoard, move);
        const step = { ...move, promoted };
        const nextSteps = [...steps, step];
        const continuations = move.capture && !promoted
          ? movesFrom(move.row, move.col, nextBoard)
            .filter(candidate => candidate.capture)
            .map(candidate => ({ fromRow: move.row, fromCol: move.col, ...candidate }))
          : [];
        if (continuations.length) {
          continuations.forEach(next => extend(nextBoard, next, nextSteps));
        } else {
          options.push({ board: nextBoard, steps: nextSteps });
        }
      }
      movesFor(player, state).forEach(move => extend(state, move, []));
      return options;
    }

    function evaluate(state) {
      let score = 0;
      for (let row = 0; row < SIZE; row++) {
        for (let col = 0; col < SIZE; col++) {
          const piece = state[row][col];
          if (!piece) continue;
          const sign = piece.player === BLACK ? 1 : -1;
          score += sign * (piece.king ? 175 : 100);
          if (!piece.king) score += sign * (piece.player === BLACK ? row : SIZE - 1 - row) * 4;
          if (col > 1 && col < SIZE - 2) score += sign * 4;
        }
      }
      score += (movesFor(BLACK, state).length - movesFor(RED, state).length) * 3;
      return score;
    }

    function search(state, player, depth, alpha, beta) {
      const options = turnOptions(state, player);
      if (!options.length) {
        return { score: player === BLACK ? -10000 - depth : 10000 + depth, option: null };
      }
      if (depth === 0) return { score: evaluate(state), option: null };

      const maximizing = player === BLACK;
      let best = { score: maximizing ? -Infinity : Infinity, option: null };
      for (const option of options) {
        const result = search(option.board, player === BLACK ? RED : BLACK, depth - 1, alpha, beta);
        if ((maximizing && result.score > best.score) || (!maximizing && result.score < best.score)) {
          best = { score: result.score, option };
        }
        if (maximizing) alpha = Math.max(alpha, best.score);
        else beta = Math.min(beta, best.score);
        if (beta <= alpha) break;
      }
      return best;
    }

    function scheduleComputerMove(delay = 350) {
      if (!active || current !== BLACK || finished || computerTimer !== null) return;
      computerMoving = true;
      render();
      computerTimer = setTimeout(() => {
        computerTimer = null;
        if (!active || current !== BLACK || finished) return;
        if (!computerSteps) {
          const result = search(board, BLACK, 3, -Infinity, Infinity);
          if (!result.option) {
            finish(RED);
            return;
          }
          computerSteps = result.option.steps;
          computerStepIndex = 0;
        }
        const move = computerSteps[computerStepIndex++];
        board = applyMove(board, move).board;
        render();
        if (computerStepIndex < computerSteps.length) {
          statusEl.textContent = move.capture ? "컴퓨터가 연속으로 말을 잡습니다..." : "컴퓨터가 두었습니다...";
          scheduleComputerMove(260);
          return;
        }
        computerSteps = null;
        computerStepIndex = 0;
        computerMoving = false;
        endTurn();
      }, delay);
    }

    function render() {
      const legalTargets = new Set((current === RED && !computerMoving ? legal : [])
        .map(move => `${move.row},${move.col}`));
      boardEl.replaceChildren();
      for (let row = 0; row < SIZE; row++) {
        for (let col = 0; col < SIZE; col++) {
          const cell = document.createElement("button");
          cell.type = "button";
          cell.className = "checkers-cell";
          cell.setAttribute("role", "gridcell");
          cell.setAttribute("aria-label", `행 ${row + 1}, 열 ${col + 1}`);
          if ((row + col) % 2) cell.classList.add("is-dark");
          if (selected?.row === row && selected?.col === col) cell.classList.add("is-legal");
          if (legalTargets.has(`${row},${col}`)) cell.classList.add("is-legal");
          const piece = board[row][col];
          if (piece) {
            const stone = document.createElement("span");
            stone.className = `checkers-stone ${piece.player === RED ? "is-red" : "is-black"}${piece.king ? " is-king" : ""}`;
            cell.appendChild(stone);
          }
          cell.disabled = finished || current !== RED || computerMoving;
          cell.addEventListener("click", () => choose(row, col));
          boardEl.appendChild(cell);
        }
      }
      let red = 0, black = 0;
      for (const row of board) for (const piece of row) {
        if (piece?.player === RED) red++;
        if (piece?.player === BLACK) black++;
      }
      scoreEl.textContent = `빨강 ${red}개 · 검정 ${black}개`;
    }

    function finish(winner) {
      finished = true;
      computerMoving = false;
      statusEl.textContent = `${winner === RED ? "빨강" : "검정"} 승리! 상대가 움직일 수 없습니다.`;
      render();
    }

    function endTurn() {
      current = current === RED ? BLACK : RED;
      selected = null;
      forcedFrom = null;
      computerMoving = false;
      legal = movesFor(current);
      if (!legal.length) {
        finish(current === RED ? BLACK : RED);
      } else {
        if (current === BLACK) {
          statusEl.textContent = "컴퓨터가 생각 중입니다...";
        } else {
          statusEl.textContent = `내 차례입니다.${legal.some(move => move.capture) ? " 잡을 수 있는 말을 반드시 잡으세요." : ""}`;
        }
      }
      render();
      if (current === BLACK && !finished) scheduleComputerMove();
    }

    function choose(row, col) {
      if (finished || !active || current !== RED || computerMoving) return;
      if (selected && legal.some(move => move.row === row && move.col === col)) {
        const move = legal.find(candidate => candidate.row === row && candidate.col === col);
        const result = applyMove(board, move);
        const promoted = result.promoted;
        board = result.board;

        if (move.capture && !promoted) {
          const followUps = movesFrom(row, col)
            .filter(next => next.capture)
            .map(next => ({ fromRow: row, fromCol: col, ...next }));
          if (followUps.length) {
            selected = { row, col };
            forcedFrom = selected;
            legal = followUps;
            statusEl.textContent = `${current === RED ? "빨강" : "검정"} 차례 — 연속으로 잡으세요.`;
            render();
            return;
          }
        }
        endTurn();
        return;
      }

      if (board[row][col]?.player === current
          && (!forcedFrom || (forcedFrom.row === row && forcedFrom.col === col))) {
        selected = { row, col };
        legal = movesFor(current).filter(move => move.fromRow === row && move.fromCol === col);
      } else if (!forcedFrom) {
        selected = null;
        legal = movesFor(current);
      }
      render();
    }

    function reset() {
      board = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < SIZE; col++) if ((row + col) % 2) board[row][col] = { player: BLACK, king: false };
      }
      for (let row = SIZE - 3; row < SIZE; row++) {
        for (let col = 0; col < SIZE; col++) if ((row + col) % 2) board[row][col] = { player: RED, king: false };
      }
      current = RED;
      selected = null;
      forcedFrom = null;
      finished = false;
      active = true;
      computerMoving = false;
      computerSteps = null;
      computerStepIndex = 0;
      clearTimeout(computerTimer);
      computerTimer = null;
      legal = movesFor(current);
      statusEl.textContent = "내 차례입니다. 빨강 말을 선택한 뒤 표시된 칸으로 이동하세요.";
      render();
    }

    document.getElementById("checkers-reset").addEventListener("click", reset);
    registerGame("panel-checkers", {
      init() {
        if (!board.length) reset();
        else {
          active = true;
          if (current === BLACK && !finished) scheduleComputerMove(0);
          else render();
        }
      },
      stop() {
        active = false;
        clearTimeout(computerTimer);
        computerTimer = null;
      },
    });
  })();
