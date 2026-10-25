  // ── STEP 4: 슬라이딩 퍼즐 ─────────────────────────
  (function () {
    const boardEl = document.getElementById("pz-board");
    const statusEl = document.getElementById("pz-status");
    const startBtn = document.getElementById("pz-start");
    const timerEl = document.getElementById("pz-timer");

    const SIZE = 4; // 4x4 = 15 퍼즐
    const SOLVED = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0]; // 0 = 빈칸

    let tiles = SOLVED.slice();
    let running = false, timerHandle = null, elapsedSec = 0;

    function formatTime(sec) {
      const m = Math.floor(sec / 60).toString().padStart(2, "0");
      const s = (sec % 60).toString().padStart(2, "0");
      return `${m}:${s}`;
    }

    function isSolved() {
      return tiles.every((v, i) => v === SOLVED[i]);
    }

    function render() {
      boardEl.innerHTML = "";
      tiles.forEach((value, i) => {
        const cell = document.createElement("div");
        cell.className = "pz-cell" + (value === 0 ? " pz-empty" : "");
        cell.textContent = value === 0 ? "" : value;
        cell.addEventListener("click", () => tryMove(i));
        boardEl.appendChild(cell);
      });
    }

    function tryMove(i) {
      if (!running) return;
      const emptyIndex = tiles.indexOf(0);
      const row = Math.floor(i / SIZE), col = i % SIZE;
      const erow = Math.floor(emptyIndex / SIZE), ecol = emptyIndex % SIZE;
      const adjacent = (Math.abs(row - erow) + Math.abs(col - ecol)) === 1;

      if (!adjacent) return;

      [tiles[i], tiles[emptyIndex]] = [tiles[emptyIndex], tiles[i]];
      render();

      if (isSolved()) {
        running = false;
        clearInterval(timerHandle);
        statusEl.textContent = `완성했습니다! 소요 시간 ${formatTime(elapsedSec)} (다시 하려면 시작 버튼)`;
        window.reportScore?.("panel-pz", Math.max(1, 3000 - elapsedSec));
      } else {
        statusEl.textContent = "빈칸 옆 숫자를 클릭해 이동하세요";
      }
    }

    function shuffle() {
      tiles = SOLVED.slice();
      // 무작위로 뒤섞되, "빈칸과 인접한 칸만 바꾸는" 방식으로 섞어야 항상 풀 수 있는 상태가 된다
      let emptyIndex = tiles.indexOf(0);
      for (let n = 0; n < 300; n++) {
        const row = Math.floor(emptyIndex / SIZE), col = emptyIndex % SIZE;
        const candidates = [];
        if (row > 0) candidates.push(emptyIndex - SIZE);
        if (row < SIZE - 1) candidates.push(emptyIndex + SIZE);
        if (col > 0) candidates.push(emptyIndex - 1);
        if (col < SIZE - 1) candidates.push(emptyIndex + 1);

        const target = candidates[Math.floor(Math.random() * candidates.length)];
        [tiles[emptyIndex], tiles[target]] = [tiles[target], tiles[emptyIndex]];
        emptyIndex = target;
      }
    }

    startBtn.addEventListener("click", () => {
      shuffle();
      render();
      running = true;
      statusEl.textContent = "빈칸 옆 숫자를 클릭해 이동하세요";
      elapsedSec = 0;
      timerEl.textContent = "00:00";
      clearInterval(timerHandle);
      timerHandle = setInterval(() => {
        elapsedSec++;
        timerEl.textContent = formatTime(elapsedSec);
      }, 1000);
    });

    registerGame("panel-pz", {
      init() {
        tiles = SOLVED.slice();
        running = false;
        clearInterval(timerHandle);
        timerEl.textContent = "00:00";
        statusEl.textContent = "시작 버튼을 눌러주세요";
        render();
      },
      stop() {
        running = false;
        clearInterval(timerHandle);
      },
    });
  })();
