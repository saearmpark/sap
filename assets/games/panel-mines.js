  (function () {
    const SIZE = 8, MINE_COUNT = 10;
    const boardEl = document.getElementById("mines-board");
    const statusEl = document.getElementById("mines-status");
    const flagModeBtn = document.getElementById("mines-flag-mode");
    let cells = [];
    let flags = 0;
    let revealed = 0;
    let flagMode = false;
    let started = false;
    let ended = false;
    let startedAt = 0;

    function neighbors(index) {
      const row = Math.floor(index / SIZE), col = index % SIZE, result = [];
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;
          const r = row + dr, c = col + dc;
          if (r >= 0 && r < SIZE && c >= 0 && c < SIZE) result.push(r * SIZE + c);
        }
      }
      return result;
    }

    function placeMines(safeIndex) {
      const safeArea = new Set([safeIndex, ...neighbors(safeIndex)]);
      const options = cells.map((_, index) => index).filter(index => !safeArea.has(index));
      for (let index = options.length - 1; index > 0; index--) {
        const other = Math.floor(Math.random() * (index + 1));
        [options[index], options[other]] = [options[other], options[index]];
      }
      options.slice(0, MINE_COUNT).forEach(index => { cells[index].mine = true; });
      cells.forEach((cell, index) => {
        cell.count = neighbors(index).filter(next => cells[next].mine).length;
      });
      started = true;
      startedAt = Date.now();
    }

    function reveal(index) {
      const cell = cells[index];
      if (ended || cell.open || cell.flag) return;
      if (!started) placeMines(index);
      if (cell.mine) {
        ended = true;
        cells.forEach(entry => { if (entry.mine) entry.open = true; });
        statusEl.textContent = "지뢰를 밟았습니다! 새 게임으로 다시 도전하세요.";
        return;
      }
      const pending = [index];
      while (pending.length) {
        const next = pending.pop();
        const current = cells[next];
        if (current.open || current.flag || current.mine) continue;
        current.open = true;
        revealed++;
        if (current.count === 0) pending.push(...neighbors(next));
      }
      if (revealed === SIZE * SIZE - MINE_COUNT) {
        ended = true;
        statusEl.textContent = "성공! 모든 안전한 칸을 열었습니다.";
        window.reportScore?.("panel-mines", Math.max(1, Math.round((Date.now() - startedAt) / 1000)));
      } else {
        statusEl.textContent = `지뢰 ${MINE_COUNT}개 · 깃발 ${flags}개`;
      }
    }

    function toggleFlag(index) {
      const cell = cells[index];
      if (ended || cell.open) return;
      if (!cell.flag && flags >= MINE_COUNT) {
        statusEl.textContent = `깃발은 ${MINE_COUNT}개까지만 표시할 수 있습니다.`;
        return;
      }
      cell.flag = !cell.flag;
      flags += cell.flag ? 1 : -1;
    }

    function render() {
      boardEl.replaceChildren();
      cells.forEach((cell, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "mine-cell";
        button.setAttribute("aria-label", `칸 ${index + 1}${cell.open ? (cell.mine ? " 지뢰" : ` ${cell.count}개 인접`) : cell.flag ? " 깃발" : " 닫힘"}`);
        if (cell.open) {
          button.classList.add("is-open");
          if (cell.mine) {
            button.classList.add("is-mine");
            button.textContent = "💣";
          } else if (cell.count) button.textContent = String(cell.count);
        } else if (cell.flag) button.textContent = "🚩";
        button.addEventListener("click", () => {
          if (flagMode) toggleFlag(index);
          else reveal(index);
          render();
        });
        button.addEventListener("contextmenu", event => {
          event.preventDefault();
          toggleFlag(index);
          render();
        });
        boardEl.appendChild(button);
      });
    }

    function reset() {
      cells = Array.from({ length: SIZE * SIZE }, () => ({ mine: false, count: 0, open: false, flag: false }));
      flags = 0;
      revealed = 0;
      started = false;
      ended = false;
      statusEl.textContent = `지뢰 ${MINE_COUNT}개 · 첫 칸은 안전합니다.`;
      render();
    }

    flagModeBtn.addEventListener("click", () => {
      flagMode = !flagMode;
      flagModeBtn.setAttribute("aria-pressed", String(flagMode));
      flagModeBtn.textContent = `깃발 모드: ${flagMode ? "켬" : "끔"}`;
    });
    document.getElementById("mines-reset").addEventListener("click", reset);
    registerGame("panel-mines", { init: reset, stop() {} });
  })();
