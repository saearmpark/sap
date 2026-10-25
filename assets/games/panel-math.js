  (function () {
    const form = document.getElementById("math-form");
    const answerInput = document.getElementById("math-answer");
    const submitBtn = document.getElementById("math-submit");
    const problemEl = document.getElementById("math-problem");
    const timerEl = document.getElementById("math-timer");
    const statusEl = document.getElementById("math-status");
    const startBtn = document.getElementById("math-start");
    let answer = 0;
    let score = 0;
    let timeLeft = 60;
    let timer = null;
    let running = false;

    function nextProblem() {
      const operation = Math.floor(Math.random() * 3);
      let first = Math.floor(Math.random() * 20) + 1;
      let second = Math.floor(Math.random() * 20) + 1;
      if (operation === 0) {
        answer = first + second;
        problemEl.textContent = `${first} + ${second} = ?`;
      } else if (operation === 1) {
        if (second > first) [first, second] = [second, first];
        answer = first - second;
        problemEl.textContent = `${first} − ${second} = ?`;
      } else {
        first = Math.floor(Math.random() * 10) + 1;
        second = Math.floor(Math.random() * 10) + 1;
        answer = first * second;
        problemEl.textContent = `${first} × ${second} = ?`;
      }
      answerInput.value = "";
      answerInput.focus({ preventScroll: true });
    }

    function finish() {
      clearInterval(timer);
      timer = null;
      running = false;
      answerInput.disabled = true;
      submitBtn.disabled = true;
      startBtn.textContent = "다시 시작";
      problemEl.textContent = "시간 종료!";
      window.reportScore?.("panel-math", score);
      statusEl.textContent = `최종 점수 ${score}점`;
    }

    function start() {
      clearInterval(timer);
      score = 0;
      timeLeft = 60;
      running = true;
      answerInput.disabled = false;
      submitBtn.disabled = false;
      startBtn.textContent = "다시 시작";
      timerEl.textContent = `남은 시간 ${timeLeft}초`;
      statusEl.textContent = `점수 ${score}점`;
      nextProblem();
      timer = setInterval(() => {
        timeLeft--;
        timerEl.textContent = `남은 시간 ${timeLeft}초`;
        if (timeLeft <= 0) finish();
      }, 1000);
    }

    form.addEventListener("submit", event => {
      event.preventDefault();
      if (!running) return;
      if (Number(answerInput.value) === answer) {
        score++;
        statusEl.textContent = `정답! 점수 ${score}점`;
      } else {
        statusEl.textContent = `다시 생각해보세요. 점수 ${score}점`;
        answerInput.select();
        return;
      }
      nextProblem();
    });
    startBtn.addEventListener("click", start);
    registerGame("panel-math", {
      init() {
        clearInterval(timer);
        timer = null;
        running = false;
        timeLeft = 60;
        score = 0;
        answerInput.disabled = true;
        submitBtn.disabled = true;
        timerEl.textContent = "남은 시간 60초";
        problemEl.textContent = "시작을 눌러주세요";
        statusEl.textContent = "점수 0점";
        startBtn.textContent = "시작";
      },
      stop() {
        if (running) finish();
      },
    });
  })();
