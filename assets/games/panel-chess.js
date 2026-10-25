  (function () {
    const SIZE = 8;
    const WHITE = "w", BLACK = "b";
    const VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
    const SYMBOLS = {
      w: { k: "♔", q: "♕", r: "♖", b: "♗", n: "♘", p: "♙" },
      b: { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" },
    };
    const boardEl = document.getElementById("chess-board");
    const statusEl = document.getElementById("chess-status");
    const scoreEl = document.getElementById("chess-score");
    let state;
    let selected = null;
    let legal = [];
    let active = false;
    let finished = false;
    let computerTimer = null;
    let lastMove = null;

    function initialState() {
      const board = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
      const backRank = ["r", "n", "b", "q", "k", "b", "n", "r"];
      for (let col = 0; col < SIZE; col++) {
        board[0][col] = { type: backRank[col], color: BLACK };
        board[1][col] = { type: "p", color: BLACK };
        board[6][col] = { type: "p", color: WHITE };
        board[7][col] = { type: backRank[col], color: WHITE };
      }
      return {
        board,
        turn: WHITE,
        castling: { wK: true, wQ: true, bK: true, bQ: true },
        enPassant: null,
      };
    }

    function inside(row, col) {
      return row >= 0 && row < SIZE && col >= 0 && col < SIZE;
    }

    function cloneState(position) {
      return {
        board: position.board.map(row => row.map(piece => piece ? { ...piece } : null)),
        turn: position.turn,
        castling: { ...position.castling },
        enPassant: position.enPassant ? { ...position.enPassant } : null,
      };
    }

    function isAttacked(position, row, col, byColor) {
      const board = position.board;
      const pawnRow = row + (byColor === WHITE ? 1 : -1);
      for (const pawnCol of [col - 1, col + 1]) {
        if (inside(pawnRow, pawnCol) && board[pawnRow][pawnCol]?.color === byColor
            && board[pawnRow][pawnCol].type === "p") return true;
      }
      for (const [dr, dc] of [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]) {
        const r = row + dr, c = col + dc;
        if (inside(r, c) && board[r][c]?.color === byColor && board[r][c].type === "n") return true;
      }
      for (const [dr, dc] of [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]) {
        let r = row + dr, c = col + dc, distance = 1;
        while (inside(r, c)) {
          const piece = board[r][c];
          if (piece) {
            if (piece.color === byColor
                && (piece.type === "q" || (distance === 1 && piece.type === "k")
                  || (Math.abs(dr) === Math.abs(dc) && piece.type === "b")
                  || ((dr === 0 || dc === 0) && piece.type === "r"))) return true;
            break;
          }
          r += dr;
          c += dc;
          distance++;
        }
      }
      return false;
    }

    function kingPosition(position, color) {
      for (let row = 0; row < SIZE; row++) {
        for (let col = 0; col < SIZE; col++) {
          if (position.board[row][col]?.color === color && position.board[row][col].type === "k") return { row, col };
        }
      }
      return null;
    }

    function inCheck(position, color) {
      const king = kingPosition(position, color);
      return !king || isAttacked(position, king.row, king.col, color === WHITE ? BLACK : WHITE);
    }

    function pseudoMoves(position, color) {
      const board = position.board;
      const moves = [];
      const add = (fromRow, fromCol, row, col, extra = {}) => {
        if (!inside(row, col) || board[row][col]?.color === color) return false;
        moves.push({ fromRow, fromCol, row, col, ...extra });
        return !board[row][col];
      };

      for (let row = 0; row < SIZE; row++) {
        for (let col = 0; col < SIZE; col++) {
          const piece = board[row][col];
          if (!piece || piece.color !== color) continue;
          if (piece.type === "p") {
            const direction = color === WHITE ? -1 : 1;
            const startRow = color === WHITE ? 6 : 1;
            const nextRow = row + direction;
            if (inside(nextRow, col) && !board[nextRow][col]) {
              moves.push({ fromRow: row, fromCol: col, row: nextRow, col, promotion: nextRow === 0 || nextRow === 7 ? "q" : null });
              const doubleRow = row + direction * 2;
              if (row === startRow && !board[doubleRow][col]) {
                moves.push({ fromRow: row, fromCol: col, row: doubleRow, col });
              }
            }
            for (const targetCol of [col - 1, col + 1]) {
              if (!inside(nextRow, targetCol)) continue;
              if (board[nextRow][targetCol]?.color && board[nextRow][targetCol].color !== color) {
                moves.push({ fromRow: row, fromCol: col, row: nextRow, col: targetCol,
                  promotion: nextRow === 0 || nextRow === 7 ? "q" : null });
              } else if (position.enPassant?.row === nextRow && position.enPassant?.col === targetCol) {
                moves.push({ fromRow: row, fromCol: col, row: nextRow, col: targetCol, enPassant: true });
              }
            }
          } else if (piece.type === "n") {
            for (const [dr, dc] of [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]) {
              add(row, col, row + dr, col + dc);
            }
          } else if (piece.type === "k") {
            for (const [dr, dc] of [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]) {
              add(row, col, row + dr, col + dc);
            }
            const homeRow = color === WHITE ? 7 : 0;
            const enemy = color === WHITE ? BLACK : WHITE;
            if (row === homeRow && col === 4 && !isAttacked(position, row, col, enemy)) {
              const kingSide = position.castling[`${color}K`];
              if (kingSide && !board[homeRow][5] && !board[homeRow][6]
                  && board[homeRow][7]?.type === "r" && board[homeRow][7]?.color === color
                  && !isAttacked(position, homeRow, 5, enemy) && !isAttacked(position, homeRow, 6, enemy)) {
                moves.push({ fromRow: row, fromCol: col, row: homeRow, col: 6, castle: "K" });
              }
              const queenSide = position.castling[`${color}Q`];
              if (queenSide && !board[homeRow][1] && !board[homeRow][2] && !board[homeRow][3]
                  && board[homeRow][0]?.type === "r" && board[homeRow][0]?.color === color
                  && !isAttacked(position, homeRow, 3, enemy) && !isAttacked(position, homeRow, 2, enemy)) {
                moves.push({ fromRow: row, fromCol: col, row: homeRow, col: 2, castle: "Q" });
              }
            }
          } else {
            const directions = piece.type === "b" ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
              : piece.type === "r" ? [[-1, 0], [1, 0], [0, -1], [0, 1]]
                : [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
            for (const [dr, dc] of directions) {
              let targetRow = row + dr, targetCol = col + dc;
              while (add(row, col, targetRow, targetCol)) {
                targetRow += dr;
                targetCol += dc;
              }
            }
          }
        }
      }
      return moves;
    }

    function applyMove(position, move) {
      const next = cloneState(position);
      const piece = next.board[move.fromRow][move.fromCol];
      const captured = move.enPassant ? next.board[move.fromRow][move.col] : next.board[move.row][move.col];
      next.board[move.fromRow][move.fromCol] = null;
      if (move.enPassant) next.board[move.fromRow][move.col] = null;
      next.board[move.row][move.col] = move.promotion ? { ...piece, type: move.promotion } : piece;

      if (move.castle) {
        const row = move.fromRow;
        const rookFrom = move.castle === "K" ? 7 : 0;
        const rookTo = move.castle === "K" ? 5 : 3;
        next.board[row][rookTo] = next.board[row][rookFrom];
        next.board[row][rookFrom] = null;
      }

      if (piece.type === "k") {
        next.castling[`${piece.color}K`] = false;
        next.castling[`${piece.color}Q`] = false;
      }
      if (piece.type === "r") {
        if (move.fromRow === 7 && move.fromCol === 0) next.castling.wQ = false;
        if (move.fromRow === 7 && move.fromCol === 7) next.castling.wK = false;
        if (move.fromRow === 0 && move.fromCol === 0) next.castling.bQ = false;
        if (move.fromRow === 0 && move.fromCol === 7) next.castling.bK = false;
      }
      if (captured?.type === "r") {
        if (move.row === 7 && move.col === 0) next.castling.wQ = false;
        if (move.row === 7 && move.col === 7) next.castling.wK = false;
        if (move.row === 0 && move.col === 0) next.castling.bQ = false;
        if (move.row === 0 && move.col === 7) next.castling.bK = false;
      }
      next.enPassant = piece.type === "p" && Math.abs(move.row - move.fromRow) === 2
        ? { row: (move.row + move.fromRow) / 2, col: move.col }
        : null;
      next.turn = piece.color === WHITE ? BLACK : WHITE;
      return next;
    }

    function legalMoves(position, color = position.turn) {
      return pseudoMoves(position, color).filter(move => !inCheck(applyMove(position, move), color));
    }

    function evaluate(position) {
      let score = 0;
      for (let row = 0; row < SIZE; row++) {
        for (let col = 0; col < SIZE; col++) {
          const piece = position.board[row][col];
          if (!piece) continue;
          const sign = piece.color === BLACK ? 1 : -1;
          const center = 7 - (Math.abs(3.5 - row) + Math.abs(3.5 - col));
          score += sign * (VALUES[piece.type] + (piece.type === "n" || piece.type === "b" ? center * 5 : 0));
          if (piece.type === "p") score += sign * (piece.color === BLACK ? row : 7 - row) * 5;
        }
      }
      return score;
    }

    function search(position, depth, alpha, beta) {
      const moves = legalMoves(position);
      if (!moves.length) {
        if (!inCheck(position, position.turn)) return { score: 0, move: null };
        return { score: position.turn === BLACK ? -100000 - depth : 100000 + depth, move: null };
      }
      if (!depth) return { score: evaluate(position), move: null };

      const maximizing = position.turn === BLACK;
      let best = { score: maximizing ? -Infinity : Infinity, move: null };
      moves.sort((a, b) => {
        const captureA = position.board[a.row][a.col] ? VALUES[position.board[a.row][a.col].type] : 0;
        const captureB = position.board[b.row][b.col] ? VALUES[position.board[b.row][b.col].type] : 0;
        return captureB - captureA;
      });
      for (const move of moves) {
        const result = search(applyMove(position, move), depth - 1, alpha, beta);
        if ((maximizing && result.score > best.score) || (!maximizing && result.score < best.score)) {
          best = { score: result.score, move };
        }
        if (maximizing) alpha = Math.max(alpha, best.score);
        else beta = Math.min(beta, best.score);
        if (beta <= alpha) break;
      }
      return best;
    }

    function describeTurn() {
      const checked = inCheck(state, state.turn);
      if (state.turn === BLACK) return checked ? "컴퓨터가 체크를 막는 수를 찾고 있습니다..." : "컴퓨터가 생각 중입니다...";
      return checked ? "체크입니다! 킹을 안전하게 옮기세요." : "내 차례입니다. 말을 선택하세요.";
    }

    function render() {
      const targets = new Set(legal.map(move => `${move.row},${move.col}`));
      const checkedKing = inCheck(state, state.turn) ? kingPosition(state, state.turn) : null;
      boardEl.replaceChildren();
      for (let row = 0; row < SIZE; row++) {
        for (let col = 0; col < SIZE; col++) {
          const cell = document.createElement("button");
          cell.type = "button";
          cell.className = `chess-cell ${(row + col) % 2 ? "is-dark" : "is-light"}`;
          cell.setAttribute("role", "gridcell");
          cell.setAttribute("aria-label", `행 ${row + 1}, 열 ${col + 1}`);
          if (selected?.row === row && selected?.col === col) cell.classList.add("is-selected");
          if (targets.has(`${row},${col}`)) cell.classList.add("is-legal");
          if (checkedKing?.row === row && checkedKing?.col === col) cell.classList.add("is-selected");
          if (lastMove && lastMove.fromRow === row && lastMove.fromCol === col) cell.classList.add("is-last-from");
          if (lastMove && lastMove.row === row && lastMove.col === col) cell.classList.add("is-last-move");
          const piece = state.board[row][col];
          if (piece) {
            const glyph = document.createElement("span");
            glyph.className = `chess-piece ${piece.color === WHITE ? "is-white" : "is-black"}`;
            glyph.textContent = SYMBOLS[piece.color][piece.type];
            cell.appendChild(glyph);
          }
          cell.disabled = !active || finished || state.turn !== WHITE;
          cell.addEventListener("click", () => choose(row, col));
          boardEl.appendChild(cell);
        }
      }
      let white = 0, black = 0;
      for (const row of state.board) for (const piece of row) {
        if (piece?.color === WHITE) white++;
        if (piece?.color === BLACK) black++;
      }
      scoreEl.textContent = `흰색 말 ${white}개 · 검은색 말 ${black}개`;
    }

    function endPosition(moves) {
      if (moves.length) return false;
      finished = true;
      if (inCheck(state, state.turn)) {
        statusEl.textContent = state.turn === WHITE ? "체크메이트! 컴퓨터가 이겼습니다." : "체크메이트! 당신이 이겼습니다.";
      } else {
        statusEl.textContent = "스테일메이트입니다. 무승부!";
      }
      render();
      return true;
    }

    function finishMove() {
      selected = null;
      legal = legalMoves(state);
      if (endPosition(legal)) return;
      statusEl.textContent = describeTurn();
      render();
      if (state.turn === BLACK && active) {
        clearTimeout(computerTimer);
        computerTimer = setTimeout(playComputer, 320);
      }
    }

    function makeMove(move) {
      lastMove = { fromRow: move.fromRow, fromCol: move.fromCol, row: move.row, col: move.col };
      state = applyMove(state, move);
      finishMove();
    }

    function playComputer() {
      computerTimer = null;
      if (!active || finished || state.turn !== BLACK) return;
      const choice = search(state, 2, -Infinity, Infinity).move;
      if (choice) makeMove(choice);
      else endPosition([]);
    }

    function choose(row, col) {
      if (!active || finished || state.turn !== WHITE) return;
      const destination = legal.find(move => move.row === row && move.col === col);
      if (selected && destination) {
        makeMove(destination);
        return;
      }
      if (state.board[row][col]?.color === WHITE) {
        selected = { row, col };
        legal = legalMoves(state).filter(move => move.fromRow === row && move.fromCol === col);
      } else {
        selected = null;
        legal = legalMoves(state);
      }
      render();
    }

    function reset() {
      clearTimeout(computerTimer);
      computerTimer = null;
      state = initialState();
      selected = null;
      lastMove = null;
      legal = legalMoves(state);
      finished = false;
      active = true;
      statusEl.textContent = "당신은 흰색입니다. 흰색이 먼저 둡니다.";
      render();
    }

    document.getElementById("chess-reset").addEventListener("click", reset);
    registerGame("panel-chess", {
      init() {
        if (!state) reset();
        else {
          active = true;
          render();
          if (state.turn === BLACK && !finished) computerTimer = setTimeout(playComputer, 0);
        }
      },
      stop() {
        active = false;
        clearTimeout(computerTimer);
        computerTimer = null;
      },
    });
  })();
