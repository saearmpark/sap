  (function () {
    const pads = Array.from(document.querySelectorAll("#sequence-pads [data-tone]"));
    const startBtn = document.getElementById("sequence-start");
    const statusEl = document.getElementById("sequence-status");
    let sequence = [];
    let inputIndex = 0;
    let state = "ready";
    let timer = null;

    function light(tone) {
      pads.forEach(pad => pad.classList.toggle("is-active", Number(pad.dataset.tone) === tone));
    }

    function showSequence(index = 0) {
      if (index >= sequence.length) {
        state = "input";
        inputIndex = 0;
        statusEl.textContent = `순서를 따라 누르세요. 현재 ${sequence.length}개입니다.`;
        return;
      }
      light(sequence[index]);
      timer = setTimeout(() => {
        light(-1);
        timer = setTimeout(() => showSequence(index + 1), 220);
      }, 480);
    }

    function startRound() {
      clearTimeout(timer);
      sequence.push(Math.floor(Math.random() * pads.length));
      state = "showing";
      startBtn.disabled = true;
      statusEl.textContent = `${sequence.length}번째 라운드`;
      timer = setTimeout(() => showSequence(), 400);
    }

    pads.forEach(pad => pad.addEventListener("click", () => {
      if (state !== "input") return;
      const tone = Number(pad.dataset.tone);
      if (tone !== sequence[inputIndex]) {
        state = "ready";
        startBtn.disabled = false;
        startBtn.textContent = "다시 시작";
        statusEl.textContent = `틀렸습니다. ${sequence.length - 1}단계까지 성공했습니다. 시작을 눌러 다시 도전하세요.`;
        window.reportScore?.("panel-sequence", sequence.length - 1);
        sequence = [];
        return;
      }
      light(tone);
      clearTimeout(timer);
      timer = setTimeout(() => { light(-1); timer = null; }, 150);
      inputIndex++;
      if (inputIndex === sequence.length) {
        state = "ready";
        startBtn.disabled = false;
        statusEl.textContent = "정확합니다! 다음 단계로 진행하세요.";
        startBtn.textContent = "다음 단계";
      }
    }));

    function reset() {
      clearTimeout(timer);
      timer = null;
      sequence = [];
      inputIndex = 0;
      state = "ready";
      light(-1);
      startBtn.disabled = false;
      startBtn.textContent = "시작";
      statusEl.textContent = "시작을 눌러 순서를 확인하세요.";
    }

    startBtn.addEventListener("click", startRound);
    registerGame("panel-sequence", {
      init: reset,
      stop() {
        clearTimeout(timer);
        timer = null;
        state = "ready";
        sequence = [];
        light(-1);
        startBtn.disabled = false;
        startBtn.textContent = "시작";
      },
    });
  })();
