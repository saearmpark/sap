  (function () {
    const ROWS = 4, COLS = 3;
    const LABELS = { lion: "사", giraffe: "기", elephant: "코", chick: "병", hen: "닭" };
    const DIRECTIONS = {
      lion: [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]],
      giraffe: [[-1, 0], [0, -1], [0, 1], [1, 0]],
      elephant: [[-1, -1], [-1, 1], [1, -1], [1, 1]],
      chick: [[-1, 0]],
      hen: [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0]],
    };
    const boardEl = document.getElementById("animal-shogi-board");
    const handEls = {
      1: document.getElementById("animal-hand-one"),
      2: document.getElementById("animal-hand-two"),
    };
    const statusEl = document.getElementById("animal-shogi-status");
    let board = [];
    let hands = {};
    let current = 1;
    let selected = null;
    let legalTargets = [];
    let finished = false;
    let computerTimer = null;

    function inBounds(row, col) {
      return row >= 0 && row < ROWS && col >= 0 && col < COLS;
    }

    function pieceMoves(piece, row, col, state = board) {
      const forward = piece.owner === 1 ? 1 : -1;
      return DIRECTIONS[piece.promoted ? "hen" : piece.type]
        .map(([dr, dc]) => [row + dr * forward, col + dc])
        .filter(([r, c]) => inBounds(r, c) && state[r][c]?.owner !== piece.owner);
    }

    function findLion(owner, state = board) {
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          if (state[row][col]?.owner === owner && state[row][col].type === "lion") return [row, col];
        }
      }
      return null;
    }

    function isAttacked(row, col, byOwner, state = board) {
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const piece = state[r][c];
          if (piece?.owner === byOwner && pieceMoves(piece, r, c, state).some(([toRow, toCol]) => toRow === row && toCol === col)) return true;
        }
      }
      return false;
    }

    function inCheck(owner, state = board) {
      const lion = findLion(owner, state);
      return !lion || isAttacked(lion[0], lion[1], 3 - owner, state);
    }

    function legalPieceMoves(row, col) {
      const piece = board[row][col];
      if (!piece || piece.owner !== current) return [];
      return pieceMoves(piece, row, col).filter(([toRow, toCol]) => {
        const next = board.map(line => line.slice());
        next[toRow][toCol] = next[row][col];
        next[row][col] = null;
        return !inCheck(current, next);
      });
    }

    function legalDrops(type, owner = current) {
      const targets = [];
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          if (board[row][col]) continue;
          if (type === "chick" && ((owner === 1 && row === 0) || (owner === 2 && row === ROWS - 1))) continue;
          if (type === "chick" && board.some(line => line[col]?.owner === owner && line[col].type === "chick" && !line[col].promoted)) continue;
          const next = board.map(line => line.slice());
          next[row][col] = { type, owner, promoted: false };
          if (!inCheck(owner, next)) targets.push([row, col]);
        }
      }
      return targets;
    }

    function hasLegalMove(owner) {
      const savedCurrent = current;
      current = owner;
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          if (legalPieceMoves(row, col).length) {
            current = savedCurrent;
            return true;
          }
        }
      }
      for (const type of Object.keys(LABELS)) {
        if (type !== "hen" && hands[owner][type] > 0 && legalDrops(type, owner).length) {
          current = savedCurrent;
          return true;
        }
      }
      current = savedCurrent;
      return false;
    }

    function render() {
      boardEl.replaceChildren();
      const selectedTargets = legalTargets.map(([row, col]) => `${row},${col}`);
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const piece = board[row][col];
          const cell = document.createElement("button");
          cell.type = "button";
          cell.className = `animal-square${selected?.kind === "board" && selected.row === row && selected.col === col ? " is-selected" : ""}${selectedTargets.includes(`${row},${col}`) ? " is-legal" : ""}`;
          cell.disabled = finished || current !== 1;
          cell.setAttribute("aria-label", `${row + 1}행 ${col + 1}열${piece ? ` ${piece.owner}번 ${piece.promoted ? "승격 " : ""}${LABELS[piece.type]}` : " 빈칸"}`);
          if (piece) {
            const marker = document.createElement("span");
            marker.className = `animal-piece${piece.owner === 2 ? " player-two" : ""}${piece.promoted ? " is-promoted" : ""}`;
            marker.textContent = LABELS[piece.type];
            cell.appendChild(marker);
          }
          cell.addEventListener("click", () => clickSquare(row, col));
          boardEl.appendChild(cell);
        }
      }
      for (const owner of [2, 1]) {
        const hand = handEls[owner];
        hand.replaceChildren();
        const label = document.createElement("span");
        label.className = "animal-hand-label";
        label.textContent = `${owner === 1 ? "내" : "컴퓨터"} 손패${owner === current && !finished ? " · 차례" : ""}`;
        hand.appendChild(label);
        for (const type of ["giraffe", "elephant", "chick"]) {
          const count = hands[owner][type];
          if (!count) continue;
          const button = document.createElement("button");
          button.type = "button";
          button.textContent = `${LABELS[type]} ${count}`;
          button.disabled = finished || current !== 1 || owner !== current;
          button.className = selected?.kind === "hand" && selected.type === type ? "is-selected" : "";
          button.setAttribute("aria-label", `${owner}번 선수 손패 ${LABELS[type]} ${count}개`);
          button.addEventListener("click", () => selectHand(type));
          hand.appendChild(button);
        }
      }
    }

    function finishTurn(movedPiece, row, col, captured) {
      const movedOwner = current;
      if (captured?.type === "lion") {
        finished = true;
        statusEl.textContent = `${movedOwner === 1 ? "내가" : "컴퓨터가"} 이겼습니다! 사자를 잡았습니다.`;
        return;
      }
      const farRank = current === 1 ? 0 : ROWS - 1;
      if (movedPiece.type === "lion" && row === farRank && !inCheck(current)) {
        finished = true;
        statusEl.textContent = `${movedOwner === 1 ? "내가" : "컴퓨터가"} 이겼습니다! 사자가 상대 진영에 도착했습니다.`;
        return;
      }
      current = 3 - current;
      selected = null;
      legalTargets = [];
      if (!hasLegalMove(current)) {
        finished = true;
        statusEl.textContent = `${movedOwner === 1 ? "내가" : "컴퓨터가"} 이겼습니다! 상대가 움직일 수 없습니다.`;
        return;
      }
      if (current === 2) {
        statusEl.textContent = "컴퓨터가 생각 중입니다...";
        computerTimer = setTimeout(playComputerTurn, 450);
      } else {
        statusEl.textContent = "내 차례";
      }
    }

    function movePiece(fromRow, fromCol, toRow, toCol) {
      const piece = board[fromRow][fromCol];
      const captured = board[toRow][toCol];
      if (captured) {
        if (captured.type !== "lion") {
          const handType = captured.promoted ? "chick" : captured.type;
          hands[current][handType]++;
        }
      }
      board[toRow][toCol] = piece;
      board[fromRow][fromCol] = null;
      if (piece.type === "chick" && ((piece.owner === 1 && toRow === 0) || (piece.owner === 2 && toRow === ROWS - 1))) {
        piece.promoted = true;
      }
      finishTurn(piece, toRow, toCol, captured);
    }

    function dropPiece(type, row, col) {
      hands[current][type]--;
      board[row][col] = { type, owner: current, promoted: false };
      finishTurn(board[row][col], row, col, null);
    }

    function clickSquare(row, col) {
      if (finished || current !== 1) return;
      if (selected?.kind === "board" && legalTargets.some(([r, c]) => r === row && c === col)) {
        movePiece(selected.row, selected.col, row, col);
      } else if (selected?.kind === "hand" && legalTargets.some(([r, c]) => r === row && c === col)) {
        dropPiece(selected.type, row, col);
      } else if (board[row][col]?.owner === current) {
        selected = { kind: "board", row, col };
        legalTargets = legalPieceMoves(row, col);
      } else {
        selected = null;
        legalTargets = [];
      }
      render();
    }

    function selectHand(type) {
      if (finished || current !== 1 || hands[current][type] === 0) return;
      selected = selected?.kind === "hand" && selected.type === type ? null : { kind: "hand", type };
      legalTargets = selected ? legalDrops(type) : [];
      render();
    }

    function legalActions(owner) {
      const previous = current;
      current = owner;
      const actions = [];
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          for (const [toRow, toCol] of legalPieceMoves(row, col)) {
            actions.push({ kind: "move", row, col, toRow, toCol });
          }
        }
      }
      for (const type of ["giraffe", "elephant", "chick"]) {
        if (hands[owner][type] > 0) {
          for (const [toRow, toCol] of legalDrops(type, owner)) {
            actions.push({ kind: "drop", type, toRow, toCol });
          }
        }
      }
      current = previous;
      return actions;
    }

    function evaluate(state, handState) {
      const values = { lion: 1000, giraffe: 7, elephant: 7, chick: 2, hen: 5 };
      let score = 0;
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const piece = state[row][col];
          if (!piece) continue;
          const value = piece.promoted ? values.hen : values[piece.type];
          const progress = piece.owner === 2 ? row : ROWS - 1 - row;
          const position = (piece.type === "lion" ? 0 : progress * 0.35) + (col === 1 ? 0.25 : 0);
          score += (piece.owner === 2 ? 1 : -1) * (value + position);
        }
      }
      for (const owner of [1, 2]) {
        for (const type of ["giraffe", "elephant", "chick"]) {
          score += (owner === 2 ? 1 : -1) * handState[owner][type] * values[type] * 0.8;
        }
      }
      const humanLion = findLion(1, state);
      if (humanLion && isAttacked(humanLion[0], humanLion[1], 2, state)) score += 8;
      return score;
    }

    function chooseComputerAction() {
      const actions = legalActions(2);
      let bestAction = null;
      let bestScore = -Infinity;
      for (const action of actions) {
        const nextBoard = board.map(line => line.map(piece => piece ? { ...piece } : null));
        const nextHands = {
          1: { ...hands[1] },
          2: { ...hands[2] },
        };
        if (action.kind === "move") {
          const moved = nextBoard[action.row][action.col];
          const captured = nextBoard[action.toRow][action.toCol];
          nextBoard[action.toRow][action.toCol] = moved;
          nextBoard[action.row][action.col] = null;
          if (captured && captured.type !== "lion") {
            nextHands[2][captured.promoted ? "chick" : captured.type]++;
          }
          if (moved.type === "chick" && action.toRow === ROWS - 1) moved.promoted = true;
        } else {
          nextBoard[action.toRow][action.toCol] = { type: action.type, owner: 2, promoted: false };
          nextHands[2][action.type]--;
        }
        const score = evaluate(nextBoard, nextHands) + Math.random() * 0.01;
        if (score > bestScore) {
          bestScore = score;
          bestAction = action;
        }
      }
      return bestAction;
    }

    function playComputerTurn() {
      computerTimer = null;
      if (finished || current !== 2) return;
      const action = chooseComputerAction();
      if (!action) {
        finished = true;
        statusEl.textContent = "내가 이겼습니다! 컴퓨터가 움직일 수 없습니다.";
        render();
        return;
      }
      if (action.kind === "move") movePiece(action.row, action.col, action.toRow, action.toCol);
      else dropPiece(action.type, action.toRow, action.toCol);
      render();
    }

    function reset() {
      clearTimeout(computerTimer);
      computerTimer = null;
      board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
      board[0] = [
        { type: "giraffe", owner: 2, promoted: false },
        { type: "lion", owner: 2, promoted: false },
        { type: "elephant", owner: 2, promoted: false },
      ];
      board[1][1] = { type: "chick", owner: 2, promoted: false };
      board[2][1] = { type: "chick", owner: 1, promoted: false };
      board[3] = [
        { type: "elephant", owner: 1, promoted: false },
        { type: "lion", owner: 1, promoted: false },
        { type: "giraffe", owner: 1, promoted: false },
      ];
      hands = {
        1: { giraffe: 0, elephant: 0, chick: 0 },
        2: { giraffe: 0, elephant: 0, chick: 0 },
      };
      current = 1;
      selected = null;
      legalTargets = [];
      finished = false;
      statusEl.textContent = "내 차례";
      render();
    }

    document.getElementById("animal-shogi-reset").addEventListener("click", reset);
    registerGame("panel-animal-shogi", {
      init: reset,
      stop() {
        if (computerTimer !== null) playComputerTurn();
      },
    });
  })();
