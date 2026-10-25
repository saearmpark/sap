  (function () {
    const form = document.getElementById("guess-form");
    const input = document.getElementById("guess-input");
    const statusEl = document.getElementById("guess-status");
    let answer = 1;
    let attempts = 0;
    let finished = false;

    function newGame() {
      answer = Math.floor(Math.random() * 100) + 1;
      attempts = 0;
      finished = false;
      input.disabled = false;
      form.querySelector("button").disabled = false;
      statusEl.textContent = "1부터 100 사이 숫자를 입력하세요.";
      input.value = "";
    }
    form.addEventListener("submit", event => {
      event.preventDefault();
      if (finished) return;
      const guess = Number(input.value);
      if (!Number.isInteger(guess) || guess < 1 || guess > 100) {
        statusEl.textContent = "1부터 100 사이의 정수를 입력하세요.";
        return;
      }
      attempts++;
      if (guess === answer) {
        finished = true;
        statusEl.textContent = `정답입니다! ${attempts}번 만에 맞혔습니다.`;
        window.reportScore?.("panel-guess", attempts);
        input.disabled = true;
        form.querySelector("button").disabled = true;
      } else {
        statusEl.textContent = `${guess < answer ? "더 큰" : "더 작은"} 숫자입니다. 시도 횟수: ${attempts}`;
        input.select();
      }
    });
    document.getElementById("guess-reset").addEventListener("click", newGame);
    registerGame("panel-guess", { init: newGame, stop() {} });
  })();
