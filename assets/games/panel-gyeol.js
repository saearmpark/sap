  // ── STEP 10: 결합 게임 (속성이 모두 같거나 모두 다른 3장 찾기) ─────────────
  (function () {
    const boardEl = document.getElementById("gyeol-board");
    const statusEl = document.getElementById("gyeol-status");
    const timerEl = document.getElementById("gyeol-timer");
    const scoreEl = document.getElementById("gyeol-score");
    const startBtn = document.getElementById("gyeol-start");
    const gyeolBtn = document.getElementById("gyeol-action");

    const SHAPES = ["●", "▲", "■"];
    const COLORS = ["#e74c3c", "#2ecc71", "#3498db"];
    const BG_COLORS = ["#1b1f1d", "#95a5a6", "#ffffff"];

    let cards = [], selected = [], foundSets = [], running = false;
    let timerHandle = null, elapsedSec = 0;

    function generateCards() {
      const deck = [];
      for (let s = 0; s < 3; s++) {
        for (let c = 0; c < 3; c++) {
          for (let b = 0; b < 3; b++) {
            deck.push({ shape: s, color: c, bg: b });
          }
        }
      }
      deck.sort(() => Math.random() - 0.5);
      cards = deck.slice(0, 9);
    }

    // 세 장의 도형/색상/바탕색이 각각 "모두 같거나 모두 다르면" '합'이다
    function isHap(c1, c2, c3) {
      const sameOrAllDiff = (a, b, c) => (a === b && b === c) || (a !== b && b !== c && a !== c);
      return sameOrAllDiff(c1.shape, c2.shape, c3.shape)
        && sameOrAllDiff(c1.color, c2.color, c3.color)
        && sameOrAllDiff(c1.bg, c2.bg, c3.bg);
    }

    function getAllPossibleHaps() {
      const haps = [];
      for (let i = 0; i < 9; i++) {
        for (let j = i + 1; j < 9; j++) {
          for (let k = j + 1; k < 9; k++) {
            if (isHap(cards[i], cards[j], cards[k])) haps.push([i, j, k].sort().toString());
          }
        }
      }
      return [...new Set(haps)];
    }

    function formatTime(sec) {
      const m = Math.floor(sec / 60).toString().padStart(2, "0");
      const s = (sec % 60).toString().padStart(2, "0");
      return `${m}:${s}`;
    }

    function renderBoard() {
      boardEl.innerHTML = "";
      cards.forEach((card, idx) => {
        const cell = document.createElement("div");
        cell.style.cssText = `aspect-ratio:1; background:${BG_COLORS[card.bg]}; border:2px solid ${selected.includes(idx) ? "var(--accent)" : "var(--border)"}; border-radius:6px; display:flex; align-items:center; justify-content:center; cursor:pointer; -webkit-tap-highlight-color:transparent;`;

        const span = document.createElement("span");
        span.style.cssText = `font-size:96px; color:${COLORS[card.color]}; font-weight:bold; line-height:1;`;
        span.textContent = SHAPES[card.shape];
        cell.appendChild(span);

        cell.addEventListener("click", () => {
          if (!running) return;
          const pos = selected.indexOf(idx);
          if (pos > -1) selected.splice(pos, 1);
          else if (selected.length < 3) selected.push(idx);
          renderBoard();
          if (selected.length === 3) checkHap();
        });
        boardEl.appendChild(cell);
      });
    }

    function checkHap() {
      const sortedSel = [...selected].sort().toString();
      const allHaps = getAllPossibleHaps();

      if (allHaps.includes(sortedSel) && !foundSets.includes(sortedSel)) {
        foundSets.push(sortedSel);
        scoreEl.textContent = foundSets.length;
        statusEl.textContent = "정답! '합'을 찾았습니다.";
        selected = [];
        renderBoard();
        if (foundSets.length === allHaps.length) {
          statusEl.textContent = "모든 합을 찾았습니다! '결합!' 버튼을 누르세요.";
        }
      } else {
        statusEl.textContent = "틀렸거나 이미 찾은 조합입니다.";
        setTimeout(() => { selected = []; renderBoard(); }, 800);
      }
    }

    gyeolBtn.addEventListener("click", () => {
      if (!running) return;
      const allHaps = getAllPossibleHaps();
      if (allHaps.length > 0 && foundSets.length === allHaps.length) {
        running = false;
        clearInterval(timerHandle);
        statusEl.textContent = `결합 성공! 소요 시간 ${timerEl.textContent}`;
        window.reportScore?.("panel-gyeol", Math.max(1, 3000 - elapsedSec));
      } else {
        statusEl.textContent = "아직 찾지 못한 '합'이 남아있습니다.";
      }
    });

    startBtn.addEventListener("click", () => {
      generateCards();
      while (getAllPossibleHaps().length === 0) generateCards(); // 합이 하나도 없는 판은 다시 뽑는다
      selected = [];
      foundSets = [];
      scoreEl.textContent = "0";
      running = true;
      statusEl.textContent = "합(3장의 카드)을 찾아보세요!";
      elapsedSec = 0;
      clearInterval(timerHandle);
      timerEl.textContent = "00:00";
      timerHandle = setInterval(() => {
        elapsedSec++;
        timerEl.textContent = formatTime(elapsedSec);
      }, 1000);
      renderBoard();
    });

    registerGame("panel-gyeol", {
      init() {
        running = false;
        clearInterval(timerHandle);
        timerEl.textContent = "00:00";
        scoreEl.textContent = "0";
        statusEl.textContent = "시작 버튼을 눌러주세요";
        boardEl.innerHTML = "";
      },
      stop() {
        running = false;
        clearInterval(timerHandle);
      },
    });
  })();
