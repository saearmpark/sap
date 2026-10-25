  (function () {
    const pad = document.getElementById("reaction-pad");
    const startBtn = document.getElementById("reaction-start");
    const statusEl = document.getElementById("reaction-status");
    let phase = "idle";
    let waitTimer = null;
    let readyAt = 0;
    let bestMs = null;

    function resetRound() {
      clearTimeout(waitTimer);
      waitTimer = null;
      phase = "idle";
      pad.disabled = true;
      pad.classList.remove("is-ready", "is-early");
      pad.textContent = "초록색이 되면 누르세요!";
    }
    function start() {
      resetRound();
      phase = "waiting";
      pad.textContent = "기다리세요...";
      statusEl.textContent = `최고 기록: ${bestMs === null ? "-" : `${bestMs}ms`}`;
      waitTimer = setTimeout(() => {
        phase = "ready";
        readyAt = performance.now();
        pad.disabled = false;
        pad.classList.add("is-ready");
        pad.textContent = "지금 누르세요!";
      }, 1500 + Math.random() * 2500);
    }
    pad.addEventListener("click", () => {
      if (phase === "waiting") {
        clearTimeout(waitTimer);
        waitTimer = null;
        phase = "early";
        pad.disabled = true;
        pad.classList.add("is-early");
        pad.textContent = "너무 빨라요!";
        statusEl.textContent = "초록색으로 바뀐 뒤에 눌러주세요. 다시 시작할 수 있습니다.";
      } else if (phase === "ready") {
        const elapsed = Math.round(performance.now() - readyAt);
        bestMs = bestMs === null ? elapsed : Math.min(bestMs, elapsed);
        window.reportScore?.("panel-reaction", elapsed);
        resetRound();
        pad.textContent = `${elapsed}ms`;
        statusEl.textContent = `반응 시간 ${elapsed}ms · 최고 기록 ${bestMs}ms`;
      }
    });
    startBtn.addEventListener("click", start);
    registerGame("panel-reaction", { init: resetRound, stop: resetRound });
  })();
