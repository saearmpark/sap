  (function () {
    const form = document.getElementById("baseball-form");
    const input = document.getElementById("baseball-input");
    const status = document.getElementById("baseball-status");
    const history = document.getElementById("baseball-history");
    let answer = "";
    let attempts = 0;
    let finished = false;

    function reset() {
      const digits = [..."0123456789"];
      for (let index = digits.length - 1; index > 0; index--) {
        const other = Math.floor(Math.random() * (index + 1));
        [digits[index], digits[other]] = [digits[other], digits[index]];
      }
      answer = digits.slice(0, 3).join("");
      attempts = 0;
      finished = false;
      input.disabled = false;
      input.value = "";
      history.replaceChildren();
      status.textContent = "서로 다른 숫자 3개를 입력하세요. 최대 10번 도전할 수 있습니다.";
      input.focus({ preventScroll: true });
    }

    form.addEventListener("submit", event => {
      event.preventDefault();
      const guess = input.value.trim();
      if (!/^\d{3}$/.test(guess) || new Set(guess).size !== 3) {
        status.textContent = "서로 다른 숫자 3개를 입력하세요.";
        input.select();
        return;
      }
      if (finished) return;

      attempts++;
      let strikes = 0, balls = 0;
      for (let index = 0; index < 3; index++) {
        if (guess[index] === answer[index]) strikes++;
        else if (answer.includes(guess[index])) balls++;
      }
      const item = document.createElement("li");
      item.textContent = `${guess} — ${strikes} 스트라이크, ${balls} 볼`;
      history.prepend(item);
      if (strikes === 3) {
        finished = true;
        status.textContent = `${attempts}번 만에 정답을 맞혔습니다!`;
        input.disabled = true;
      } else if (attempts >= 10) {
        finished = true;
        status.textContent = `도전 종료! 정답은 ${answer}였습니다.`;
        input.disabled = true;
      } else {
        status.textContent = `${10 - attempts}번 남았습니다.`;
      }
      input.value = "";
    });
    document.getElementById("baseball-reset").addEventListener("click", reset);
    registerGame("panel-baseball", { init: reset, stop() {} });
  })();
