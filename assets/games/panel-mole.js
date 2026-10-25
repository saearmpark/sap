  // ── STEP 8: 두더지 잡기 ─────────────────────────────
  // 지금까지의 게임은 전부 키보드(방향키/스페이스/Shift)로 조작했지만,
  // 이 게임은 화면을 탭(클릭)하는 것만으로 플레이합니다. 그래서 키보드가 없는
  // 휴대폰에서도 그대로 즐길 수 있습니다.
  (function () {
    const gridEl = document.getElementById("mole-grid");
    const statusEl = document.getElementById("mole-status");
    const startBtn = document.getElementById("mole-start");

    const HOLE_COUNT = 9; // 3×3
    const GAME_DURATION_MS = 30000; // 제한 시간 30초

    let holeEls = [];
    let holeTimers = []; // 각 구멍마다: 두더지가 자동으로 내려가는 setTimeout
    let score, running, spawnTimer, countdownTimer, startedAt;

    // 구멍 9개를 한 번만 만들어서 재사용한다 (탭할 때마다 새로 만들지 않는다)
    function buildHoles() {
      gridEl.innerHTML = "";
      holeEls = [];
      for (let i = 0; i < HOLE_COUNT; i++) {
        const hole = document.createElement("div");
        hole.className = "mole-hole";
        const mole = document.createElement("div");
        mole.className = "mole";
        hole.appendChild(mole);
        hole.addEventListener("click", () => hitHole(i));
        gridEl.appendChild(hole);
        holeEls.push(hole);
      }
    }

    function elapsedMs() {
      return Date.now() - startedAt;
    }

    // 시간이 지날수록 두더지가 더 짧게 나타난다 (900ms → 최소 350ms)
    function moleVisibleMs() {
      const progress = Math.min(1, elapsedMs() / GAME_DURATION_MS);
      return Math.round(900 - progress * 550);
    }

    // 시간이 지날수록 두더지가 더 자주 나타난다 (900ms 간격 → 최소 450ms)
    function spawnIntervalMs() {
      const progress = Math.min(1, elapsedMs() / GAME_DURATION_MS);
      return Math.round(900 - progress * 450);
    }

    function spawnMole() {
      if (!running) return;
      const emptyIndexes = holeEls
        .map((el, i) => (el.classList.contains("mole-up") ? -1 : i))
        .filter(i => i !== -1);
      if (emptyIndexes.length === 0) return; // 모든 구멍에 이미 두더지가 있으면 이번엔 건너뛴다

      const i = emptyIndexes[Math.floor(Math.random() * emptyIndexes.length)];
      showMole(i);
    }

    function showMole(i) {
      const hole = holeEls[i];
      hole.classList.remove("mole-hit");
      hole.classList.add("mole-up");

      clearTimeout(holeTimers[i]);
      holeTimers[i] = setTimeout(() => {
        hole.classList.remove("mole-up"); // 못 잡고 시간이 지나면 그냥 내려간다 (감점 없음)
      }, moleVisibleMs());
    }

    function hitHole(i) {
      if (!running) return;
      const hole = holeEls[i];
      if (!hole.classList.contains("mole-up")) return; // 빈 구멍을 눌러도 아무 일도 없다

      clearTimeout(holeTimers[i]);
      hole.classList.remove("mole-up");
      hole.classList.add("mole-hit");
      score++;
      updateStatus();
    }

    function updateStatus(text) {
      if (text) {
        statusEl.textContent = text;
        return;
      }
      const remaining = Math.max(0, Math.ceil((GAME_DURATION_MS - elapsedMs()) / 1000));
      statusEl.textContent = `남은 시간 ${remaining}초 · 점수 ${score}`;
    }

    function endGame() {
      running = false;
      clearInterval(spawnTimer);
      clearInterval(countdownTimer);
      holeTimers.forEach(t => clearTimeout(t));
      holeEls.forEach(el => el.classList.remove("mole-up", "mole-hit"));
      window.reportScore?.("panel-mole", score);
      updateStatus(`게임 종료 · 최종 점수 ${score} (시작 버튼으로 재시작)`);
    }

    // 다음 두더지를 "일정한 간격"이 아니라 스스로 다시 예약하는 방식으로 띄운다.
    // 이러면 spawnIntervalMs()가 시간이 지나며 점점 짧아지는 것을 바로바로 반영할 수 있다.
    function scheduleNextSpawn() {
      if (!running) return;
      spawnTimer = setTimeout(() => {
        spawnMole();
        scheduleNextSpawn();
      }, spawnIntervalMs());
    }

    function newGame() {
      score = 0;
      running = true;
      startedAt = Date.now();
      holeEls.forEach(el => el.classList.remove("mole-up", "mole-hit"));
    }

    startBtn.addEventListener("click", () => {
      clearTimeout(spawnTimer);
      clearInterval(countdownTimer);
      holeTimers.forEach(t => clearTimeout(t));

      newGame();
      updateStatus();
      scheduleNextSpawn();
      countdownTimer = setInterval(() => {
        if (elapsedMs() >= GAME_DURATION_MS) {
          endGame();
        } else {
          updateStatus();
        }
      }, 250);
    });

    registerGame("panel-mole", {
      init() {
        buildHoles();
        score = 0;
        running = false;
        holeTimers = new Array(HOLE_COUNT).fill(null);
        updateStatus("시작 버튼을 눌러주세요");
      },
      stop() {
        running = false;
        clearTimeout(spawnTimer);
        clearInterval(countdownTimer);
        holeTimers.forEach(t => clearTimeout(t));
      },
    });
  })();
