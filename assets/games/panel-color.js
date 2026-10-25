(function () {
  const target = document.getElementById("color-target");
  const choices = document.getElementById("color-choices");
  const startBtn = document.getElementById("color-start");
  const status = document.getElementById("color-status");
  const colors = [
    { name: "빨강", value: "#e05a5a" },
    { name: "파랑", value: "#4c83d1" },
    { name: "초록", value: "#4b9c67" },
    { name: "노랑", value: "#e4b543" },
    { name: "보라", value: "#8b68c9" }
  ];
  let round = 0;
  let targetIndex = 0;
  let startedAt = 0;
  let bestMs = null;
  let playing = false;

  colors.forEach((color, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = color.name;
    button.dataset.colorIndex = String(index);
    button.style.background = color.value;
    button.style.color = "#fff";
    button.addEventListener("click", () => choose(index));
    choices.append(button);
  });

  function setChoicesDisabled(disabled) {
    choices.querySelectorAll("button").forEach(button => { button.disabled = disabled; });
  }

  function nextRound() {
    targetIndex = Math.floor(Math.random() * colors.length);
    target.textContent = `${round + 1}/10 · ${colors[targetIndex].name}을(를) 선택하세요`;
    target.style.color = colors[targetIndex].value;
  }

  function reset() {
    playing = false;
    round = 0;
    setChoicesDisabled(true);
    target.textContent = "시작을 눌러 준비하세요.";
    target.style.color = "";
    startBtn.disabled = false;
  }

  function start() {
    round = 0;
    playing = true;
    startedAt = performance.now();
    startBtn.disabled = true;
    setChoicesDisabled(false);
    status.textContent = `최고 기록: ${bestMs === null ? "-" : `${bestMs}ms`}`;
    nextRound();
  }

  function choose(index) {
    if (!playing) return;
    if (index !== targetIndex) {
      status.textContent = "색상이 다릅니다. 제시된 색을 선택하세요.";
      return;
    }
    round += 1;
    if (round < 10) {
      nextRound();
      return;
    }
    const elapsed = Math.round(performance.now() - startedAt);
    bestMs = bestMs === null ? elapsed : Math.min(bestMs, elapsed);
    window.reportScore?.("panel-color", elapsed);
    status.textContent = `완료! ${elapsed}ms · 최고 기록 ${bestMs}ms`;
    target.textContent = "성공했습니다. 다시 도전해 보세요.";
    target.style.color = "";
    playing = false;
    setChoicesDisabled(true);
    startBtn.disabled = false;
  }

  startBtn.addEventListener("click", start);
  registerGame("panel-color", { init: reset, stop: reset });
})();
