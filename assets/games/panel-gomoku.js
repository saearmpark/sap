  (function () {
    const SIZE = 15, TARGET = 5;
    const boardEl = document.getElementById("gomoku-board");
    const statusEl = document.getElementById("gomoku-status");
    let board = [];
    let moves = 0;
    let finished = false;
    let computerThinking = false;
    let computerTimer = null;
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];

    function isWinner(row, col, player) {
      return directions.some(([dr, dc]) => {
        let count = 1;
        for (const direction of [-1, 1]) {
          let r = row + dr * direction, c = col + dc * direction;
          while (r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[r][c] === player) {
            count++;
            r += dr * direction;
            c += dc * direction;
          }
        }
        return count >= TARGET;
      });
    }

    function moveScore(row, col, player) {
      board[row][col] = player;
      if (isWinner(row, col, player)) {
        board[row][col] = 0;
        return 10000000;
      }
      let score = 0;
      for (const [dr, dc] of directions) {
        let count = 1;
        let openEnds = 0;
        for (const direction of [-1, 1]) {
          let r = row + dr * direction, c = col + dc * direction;
          while (r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[r][c] === player) {
            count++;
            r += dr * direction;
            c += dc * direction;
          }
          if (r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[r][c] === 0) openEnds++;
        }
        if (count >= 4) score += openEnds === 2 ? 100000 : 10000;
        else if (count === 3) score += openEnds === 2 ? 3000 : openEnds === 1 ? 400 : 0;
        else if (count === 2) score += openEnds === 2 ? 150 : openEnds === 1 ? 30 : 0;
      }
      board[row][col] = 0;
      return score;
    }

    function chooseComputerMove() {
      let bestMove = null;
      let bestScore = -Infinity;
      const hasStones = moves > 0;
      for (let row = 0; row < SIZE; row++) {
        for (let col = 0; col < SIZE; col++) {
          if (board[row][col]) continue;
          let nearStone = !hasStones;
          for (let rowOffset = -1; rowOffset <= 1 && !nearStone; rowOffset++) {
            for (let colOffset = -1; colOffset <= 1; colOffset++) {
              const neighborRow = row + rowOffset, neighborCol = col + colOffset;
              if ((rowOffset || colOffset) && neighborRow >= 0 && neighborRow < SIZE &&
                  neighborCol >= 0 && neighborCol < SIZE && board[neighborRow][neighborCol]) {
                nearStone = true;
                break;
              }
            }
          }
          if (!nearStone) continue;
          const offense = moveScore(row, col, 2);
          const defense = moveScore(row, col, 1);
          const score = offense + defense * 0.9 + Math.random();
          if (score > bestScore) {
            bestScore = score;
            bestMove = [row, col];
          }
        }
      }
      return bestMove;
    }

    function render() {
      boardEl.replaceChildren();
      for (let row = 0; row < SIZE; row++) {
        for (let col = 0; col < SIZE; col++) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "gomoku-cell";
          const stone = board[row][col];
          button.setAttribute("aria-label", `행 ${row + 1}, 열 ${col + 1}${stone ? stone === 1 ? " 검은 돌" : " 흰 돌" : " 빈칸"}`);
          button.disabled = finished || computerThinking || Boolean(stone);
          if (stone) {
            const stoneEl = document.createElement("span");
            stoneEl.className = `gomoku-stone ${stone === 1 ? "gomoku-stone-black" : "gomoku-stone-white"}`;
            button.appendChild(stoneEl);
          }
          button.addEventListener("click", () => place(row, col, 1));
          boardEl.appendChild(button);
        }
      }
    }

    function place(row, col, player) {
      if (finished || (player === 1 && computerThinking) || board[row][col]) return;
      board[row][col] = player;
      moves++;
      if (isWinner(row, col, player)) {
        finished = true;
        statusEl.textContent = player === 1 ? "내가 이겼습니다!" : "컴퓨터가 이겼습니다.";
      } else if (moves === SIZE * SIZE) {
        finished = true;
        statusEl.textContent = "무승부입니다.";
      } else {
        if (player === 1) {
          computerThinking = true;
          statusEl.textContent = "컴퓨터가 생각 중입니다...";
        } else {
          computerThinking = false;
          statusEl.textContent = "내 차례 (검은 돌)";
        }
      }
      render();
      if (player === 1 && !finished) {
        computerTimer = setTimeout(() => {
          computerTimer = null;
          const move = chooseComputerMove();
          if (move) place(move[0], move[1], 2);
        }, 350);
      }
    }

    function reset() {
      clearTimeout(computerTimer);
      computerTimer = null;
      board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
      moves = 0;
      finished = false;
      computerThinking = false;
      statusEl.textContent = "내 차례 (검은 돌)";
      render();
    }

    document.getElementById("gomoku-reset").addEventListener("click", reset);
    registerGame("panel-gomoku", {
      init: reset,
      stop() {
        clearTimeout(computerTimer);
        computerTimer = null;
        computerThinking = false;
      },
    });
  })();
