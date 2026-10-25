  (function () {
    const prompts = [
      "Practice makes progress every day.",
      "Small steps can lead to big ideas.",
      "Learning is an adventure worth taking.",
      "A curious mind discovers new things.",
      "Build something useful and share it.",
      "Keep trying when a challenge feels hard.",
      "Good games make people smile.",
      "Take a deep breath and focus.",
      "Reading opens a door to imagination.",
      "Make today a little better than yesterday.",
    ];
    const promptEl = document.getElementById("typing-prompt");
    const input = document.getElementById("typing-input");
    const timerEl = document.getElementById("typing-timer");
    const statusEl = document.getElementById("typing-status");
    const startBtn = document.getElementById("typing-start");
    let promptIndex = 0;
    let completedChars = 0;
    let mistakes = 0;
    let startedAt = 0;
    let remaining = 30;
    let timer = null;
    let running = false;
    let previousInput = "";

    function choosePrompt() {
      promptIndex = Math.floor(Math.random() * prompts.length);
      promptEl.textContent = prompts[promptIndex];
      input.value = "";
    }
    function updateStatus() {
      const elapsedMinutes = Math.max((30 - remaining) / 60, 1 / 60);
      const wpm = Math.round((completedChars + input.value.length) / 5 / elapsedMinutes);
      const typed = completedChars + input.value.length;
      const accuracy = typed ? Math.round((typed - mistakes) / typed * 100) : 100;
      statusEl.textContent = `속도 ${wpm} WPM · 정확도 ${accuracy}%`;
    }
    function finish() {
      running = false;
      clearInterval(timer);
      timer = null;
      input.disabled = true;
      const elapsedMinutes = Math.max((Date.now() - startedAt) / 60000, 1 / 60);
      const totalChars = completedChars + input.value.length;
      const wpm = Math.round(totalChars / 5 / elapsedMinutes);
      const accuracy = totalChars ? Math.round((totalChars - mistakes) / totalChars * 100) : 100;
      statusEl.textContent = `끝! ${wpm} WPM · 정확도 ${accuracy}%`;
      window.reportScore?.("panel-typing", wpm);
      startBtn.textContent = "다시 시작";
    }
    function start() {
      clearInterval(timer);
      completedChars = 0;
      mistakes = 0;
      remaining = 30;
      running = true;
      startedAt = Date.now();
      timerEl.textContent = "남은 시간 30초";
      input.disabled = false;
      startBtn.textContent = "다시 시작";
      choosePrompt();
      previousInput = "";
      statusEl.textContent = "문장을 입력하세요.";
      input.focus();
      timer = setInterval(() => {
        remaining--;
        timerEl.textContent = `남은 시간 ${remaining}초`;
        if (remaining <= 0) finish();
      }, 1000);
    }
    input.addEventListener("input", () => {
      if (!running) return;
      const prompt = promptEl.textContent;
      const typed = input.value;
      let changedAt = 0;
      while (changedAt < previousInput.length && changedAt < typed.length && previousInput[changedAt] === typed[changedAt]) changedAt++;
      if (typed.length > changedAt && typed[changedAt] !== prompt[changedAt]) mistakes++;
      previousInput = typed;
      if (typed.length > prompt.length || !prompt.startsWith(typed)) {
        const mismatchIndex = [...typed].findIndex((char, index) => char !== prompt[index]);
        if (mismatchIndex >= 0) {
          updateStatus();
          statusEl.textContent += " · 틀린 부분을 고쳐 입력하세요.";
          return;
        }
      }
      if (typed === prompt) {
        completedChars += prompt.length;
        choosePrompt();
        previousInput = "";
      }
      updateStatus();
    });
    document.getElementById("typing-form").addEventListener("submit", event => event.preventDefault());
    startBtn.addEventListener("click", start);
    registerGame("panel-typing", {
      init() {
        clearInterval(timer);
        timer = null;
        running = false;
        input.disabled = true;
        remaining = 30;
        timerEl.textContent = "남은 시간 30초";
        promptEl.textContent = "시작을 누르면 문장이 나옵니다.";
        statusEl.textContent = "시작을 눌러 준비하세요.";
        startBtn.textContent = "시작";
      },
      stop() {
        clearInterval(timer);
        timer = null;
        if (running) {
          running = false;
          input.disabled = true;
          statusEl.textContent = "게임이 일시 중지되었습니다. 다시 시작해 이어서 도전하세요.";
        }
      },
    });
  })();
