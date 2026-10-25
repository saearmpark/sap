  (function () {
    const choices = [
      { id: "rock", label: "바위", emoji: "✊" },
      { id: "paper", label: "보", emoji: "✋" },
      { id: "scissors", label: "가위", emoji: "✌️" },
    ];
    const scoreEl = document.getElementById("rps-score");
    const statusEl = document.getElementById("rps-status");
    const choiceButtons = Array.from(document.querySelectorAll("[data-rps-choice]"));
    let playerWins = 0;
    let computerWins = 0;
    let finished = false;

    function renderScore() {
      scoreEl.textContent = `나 ${playerWins}승 · 컴퓨터 ${computerWins}승`;
      choiceButtons.forEach(button => { button.disabled = finished; });
    }
    function play(playerChoice) {
      if (finished) return;
      const computerChoice = choices[Math.floor(Math.random() * choices.length)];
      const playerIndex = choices.findIndex(choice => choice.id === playerChoice);
      const computerIndex = choices.indexOf(computerChoice);
      let result = "비겼습니다.";
      if ((playerIndex - computerIndex + choices.length) % choices.length === 1) {
        playerWins++;
        result = "이번 판은 내가 이겼습니다!";
      } else if (playerIndex !== computerIndex) {
        computerWins++;
        result = "이번 판은 컴퓨터가 이겼습니다.";
      }
      statusEl.textContent = `나 ${choices[playerIndex].emoji} · 컴퓨터 ${computerChoice.emoji} — ${result}`;
      if (playerWins === 3 || computerWins === 3) {
        finished = true;
        statusEl.textContent += playerWins === 3 ? " 최종 승리!" : " 컴퓨터의 최종 승리!";
      }
      renderScore();
    }
    function reset() {
      playerWins = 0;
      computerWins = 0;
      finished = false;
      statusEl.textContent = "무엇을 낼까요?";
      renderScore();
    }

    choiceButtons.forEach(button => button.addEventListener("click", () => play(button.dataset.rpsChoice)));
    document.getElementById("rps-reset").addEventListener("click", reset);
    registerGame("panel-rps", { init: reset, stop() {} });
  })();
