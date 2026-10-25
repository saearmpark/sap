  (function () {
    const SIZE = 3;
    const boardEl = document.getElementById("dots-box-board");
    const statusEl = document.getElementById("dots-box-status");
    let horizontal = new Map();
    let vertical = new Map();
    let boxes = [];
    let current = 1;
    let scores = [0, 0, 0];
    let moves = 0;
    let finished = false;
    let computerTimer = null;
    const key = (row, col) => `${row},${col}`;

    function isBoxComplete(row, col) {
      return horizontal.has(key(row, col)) && horizontal.has(key(row + 1, col)) &&
        vertical.has(key(row, col)) && vertical.has(key(row, col + 1));
    }
    function render() {
      boardEl.replaceChildren();
      for (let row = 0; row <= SIZE * 2; row++) {
        for (let col = 0; col <= SIZE * 2; col++) {
          const isDot = row % 2 === 0 && col % 2 === 0;
          const isEdge = row % 2 !== col % 2;
          const cell = isDot || !isEdge ? document.createElement("span") : document.createElement("button");
          if (isDot) {
            cell.className = "dots-dot";
            cell.setAttribute("aria-hidden", "true");
          } else if (!isEdge) {
            const owner = boxes[(row - 1) / 2][(col - 1) / 2];
            cell.className = "dots-box";
            cell.textContent = owner ? (owner === 1 ? "●" : "■") : "";
            if (owner) cell.style.color = owner === 1 ? "#2563eb" : "#ef4444";
          } else {
            const isHorizontal = row % 2 === 0;
            const edgeRow = isHorizontal ? row / 2 : (row - 1) / 2;
            const edgeCol = isHorizontal ? (col - 1) / 2 : col / 2;
            const edges = isHorizontal ? horizontal : vertical;
            const edgeKey = key(edgeRow, edgeCol);
            const owner = edges.has(edgeKey) ? edges.get(edgeKey) : 0;
            cell.type = "button";
            cell.className = `dots-edge${isHorizontal ? "" : " vertical"}${owner ? ` is-${owner === 1 ? "one" : "two"}` : ""}`;
            cell.disabled = finished || current !== 1 || Boolean(owner);
            cell.setAttribute("aria-label", `${isHorizontal ? "가로" : "세로"} 선 ${edgeRow + 1}, ${edgeCol + 1}${owner ? " 선택됨" : " 놓기"}`);
            cell.addEventListener("click", () => takeEdge(isHorizontal, edgeRow, edgeCol));
          }
          boardEl.appendChild(cell);
        }
      }
      statusEl.textContent = finished
        ? `게임 종료 · 나 ${scores[1]} : 컴퓨터 ${scores[2]} · ${scores[1] === scores[2] ? "무승부" : scores[1] > scores[2] ? "내 승리" : "컴퓨터 승리"}`
        : `${current === 1 ? "내" : "컴퓨터"} 차례 · 나 ${scores[1]} : 컴퓨터 ${scores[2]}`;
    }
    function adjacentBoxes(isHorizontal, row, col) {
      return (isHorizontal
        ? [[row - 1, col], [row, col]]
        : [[row, col - 1], [row, col]]
      ).filter(([r, c]) => r >= 0 && r < SIZE && c >= 0 && c < SIZE);
    }

    function sideCount(row, col) {
      return Number(horizontal.has(key(row, col))) + Number(horizontal.has(key(row + 1, col))) +
        Number(vertical.has(key(row, col))) + Number(vertical.has(key(row, col + 1)));
    }

    function availableEdges() {
      const edges = [];
      for (let row = 0; row <= SIZE; row++) {
        for (let col = 0; col < SIZE; col++) if (!horizontal.has(key(row, col))) edges.push({ isHorizontal: true, row, col });
      }
      for (let row = 0; row < SIZE; row++) {
        for (let col = 0; col <= SIZE; col++) if (!vertical.has(key(row, col))) edges.push({ isHorizontal: false, row, col });
      }
      return edges;
    }

    function chooseComputerEdge() {
      const edges = availableEdges();
      const scoringEdges = edges.filter(({ isHorizontal, row, col }) =>
        adjacentBoxes(isHorizontal, row, col).some(([r, c]) => sideCount(r, c) === 3)
      );
      if (scoringEdges.length) return scoringEdges[Math.floor(Math.random() * scoringEdges.length)];
      const safeEdges = edges.filter(({ isHorizontal, row, col }) =>
        adjacentBoxes(isHorizontal, row, col).every(([r, c]) => sideCount(r, c) < 2)
      );
      const choices = safeEdges.length ? safeEdges : edges;
      return choices[Math.floor(Math.random() * choices.length)];
    }

    function takeEdge(isHorizontal, row, col, player = current) {
      const edges = isHorizontal ? horizontal : vertical;
      const edgeKey = key(row, col);
      if (finished || player !== current || (player === 1 && current !== 1) || edges.has(edgeKey)) return;
      edges.set(edgeKey, player);
      moves++;
      const adjacent = adjacentBoxes(isHorizontal, row, col);
      let claimed = 0;
      adjacent.forEach(([r, c]) => {
        if (!boxes[r][c] && isBoxComplete(r, c)) {
          boxes[r][c] = player;
          scores[player]++;
          claimed++;
        }
      });
      if (!claimed) current = player === 1 ? 2 : 1;
      if (moves === 24) finished = true;
      render();
      if (!finished && current === 2) computerTimer = setTimeout(playComputer, 300);
    }

    function playComputer() {
      computerTimer = null;
      if (finished || current !== 2) return;
      const edge = chooseComputerEdge();
      if (edge) takeEdge(edge.isHorizontal, edge.row, edge.col, 2);
    }

    function reset() {
      clearTimeout(computerTimer);
      computerTimer = null;
      horizontal = new Map();
      vertical = new Map();
      boxes = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
      current = 1;
      scores = [0, 0, 0];
      moves = 0;
      finished = false;
      render();
    }
    document.getElementById("dots-box-reset").addEventListener("click", reset);
    registerGame("panel-dots-boxes", {
      init: reset,
      stop() {
        clearTimeout(computerTimer);
        computerTimer = null;
        while (!finished && current === 2) {
          const edge = chooseComputerEdge();
          if (!edge) break;
          takeEdge(edge.isHorizontal, edge.row, edge.col, 2);
          clearTimeout(computerTimer);
          computerTimer = null;
        }
      },
    });
  })();
