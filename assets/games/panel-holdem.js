  (function () {
    const suits = ["♠", "♥", "♦", "♣"];
    const playerEl = document.getElementById("holdem-player-cards");
    const computerEl = document.getElementById("holdem-computer-cards");
    const communityEl = document.getElementById("holdem-community-cards");
    const statusEl = document.getElementById("holdem-status");
    const potEl = document.getElementById("holdem-pot");
    const streetEl = document.getElementById("holdem-street");
    const playerStackEl = document.getElementById("holdem-player-stack");
    const computerStackEl = document.getElementById("holdem-computer-stack");
    const playerBetEl = document.getElementById("holdem-player-bet");
    const computerBetEl = document.getElementById("holdem-computer-bet");
    const potChipsEl = document.getElementById("holdem-pot-chips");
    const playerBetChipsEl = document.getElementById("holdem-player-bet-chips");
    const computerBetChipsEl = document.getElementById("holdem-computer-bet-chips");
    const checkCallBtn = document.getElementById("holdem-check-call");
    const raiseBtn = document.getElementById("holdem-raise");
    const raiseInput = document.getElementById("holdem-raise-to");
    const allInBtn = document.getElementById("holdem-all-in");
    const foldBtn = document.getElementById("holdem-fold");
    const nextHandBtn = document.getElementById("holdem-next-hand");
    const BIG_BLIND = 20;
    const SMALL_BLIND = 10;
    const STARTING_STACK = 1000;
    const streets = ["프리플랍", "플랍", "턴", "리버"];
    let deck = [];
    let player = [];
    let computer = [];
    let community = [];
    let stacks = [0, STARTING_STACK, STARTING_STACK];
    let streetBets = [0, 0, 0];
    let acted = [false, false, false];
    let pot = 0;
    let currentBet = 0;
    let minRaise = BIG_BLIND;
    let street = 0;
    let button = 1;
    let current = 1;
    let finished = false;
    let revealComputer = false;
    let computerTimer = null;

    function shuffle() {
      deck = [];
      for (let suit = 0; suit < 4; suit++) {
        for (let rank = 2; rank <= 14; rank++) deck.push({ rank, suit });
      }
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
    }

    function draw() { return deck.pop(); }

    function commitChips(playerNumber, amount) {
      const committed = Math.min(Math.max(0, amount), stacks[playerNumber]);
      stacks[playerNumber] -= committed;
      streetBets[playerNumber] += committed;
      pot += committed;
    }

    function label(card) {
      const rank = card.rank === 14 ? "A" : card.rank === 13 ? "K" : card.rank === 12 ? "Q" : card.rank === 11 ? "J" : String(card.rank);
      return `${rank}${suits[card.suit]}`;
    }

    function renderCards(container, cards, hidden = false, placeholders = 0) {
      container.replaceChildren();
      cards.forEach(card => {
        const item = document.createElement("span");
        item.className = "blackjack-card";
        item.textContent = hidden ? "?" : label(card);
        if (!hidden && (card.suit === 1 || card.suit === 2)) item.style.color = "#dc2626";
        container.appendChild(item);
      });
      for (let i = cards.length; i < placeholders; i++) {
        const item = document.createElement("span");
        item.className = "blackjack-card";
        item.textContent = "·";
        container.appendChild(item);
      }
    }

    function renderChips(container, amount) {
      container.replaceChildren();
      const denominations = [500, 100, 50, 20, 10];
      const colors = { 500: "black", 100: "purple", 50: "blue", 20: "green", 10: "red" };
      let remaining = amount;
      denominations.forEach(value => {
        const count = Math.floor(remaining / value);
        remaining %= value;
        if (!count) return;
        const chip = document.createElement("span");
        chip.className = `holdem-chip ${colors[value]}`;
        chip.textContent = count > 1 ? `${value} ×${count}` : String(value);
        chip.setAttribute("aria-label", `${value} 칩 ${count}개`);
        container.appendChild(chip);
      });
      if (remaining > 0) {
        const chip = document.createElement("span");
        chip.className = "holdem-chip";
        chip.textContent = String(remaining);
        container.appendChild(chip);
      }
    }

    function render() {
      renderCards(playerEl, player);
      renderCards(computerEl, computer, !revealComputer);
      renderCards(communityEl, community, false, 5);
      potEl.textContent = pot.toLocaleString("ko-KR");
      streetEl.textContent = streets[street] || "-";
      playerStackEl.textContent = stacks[1].toLocaleString("ko-KR");
      computerStackEl.textContent = stacks[2].toLocaleString("ko-KR");
      playerBetEl.textContent = streetBets[1].toLocaleString("ko-KR");
      computerBetEl.textContent = streetBets[2].toLocaleString("ko-KR");
      renderChips(potChipsEl, pot);
      renderChips(playerBetChipsEl, streetBets[1]);
      renderChips(computerBetChipsEl, streetBets[2]);
      const playerTurn = !finished && current === 1;
      const toCall = Math.max(0, currentBet - streetBets[1]);
      const maximumRaiseTo = streetBets[1] + stacks[1];
      const minimumRaiseTo = currentBet + minRaise;
      checkCallBtn.textContent = toCall ? `콜 ${toCall.toLocaleString("ko-KR")}` : "체크";
      checkCallBtn.disabled = !playerTurn;
      foldBtn.disabled = !playerTurn;
      allInBtn.disabled = !playerTurn || stacks[1] === 0;
      raiseInput.min = String(minimumRaiseTo);
      raiseInput.max = String(maximumRaiseTo);
      if (Number(raiseInput.value) < minimumRaiseTo || Number(raiseInput.value) > maximumRaiseTo) {
        raiseInput.value = String(Math.min(maximumRaiseTo, minimumRaiseTo));
      }
      raiseInput.disabled = !playerTurn || maximumRaiseTo < minimumRaiseTo;
      raiseBtn.disabled = !playerTurn || maximumRaiseTo < minimumRaiseTo;
      nextHandBtn.hidden = !finished || stacks[1] === 0 || stacks[2] === 0;
    }

    function evaluateFive(cards) {
      const ranks = cards.map(card => card.rank).sort((a, b) => b - a);
      const counts = new Map();
      ranks.forEach(rank => counts.set(rank, (counts.get(rank) || 0) + 1));
      const groups = [...counts].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
      const flush = cards.every(card => card.suit === cards[0].suit);
      const unique = [...new Set(ranks)].sort((a, b) => b - a);
      let straightHigh = 0;
      if (unique.length === 5 && unique[0] - unique[4] === 4) straightHigh = unique[0];
      else if (unique.join(",") === "14,5,4,3,2") straightHigh = 5;
      if (flush && straightHigh) return [8, straightHigh];
      if (groups[0][1] === 4) return [7, groups[0][0], groups[1][0]];
      if (groups[0][1] === 3 && groups[1][1] === 2) return [6, groups[0][0], groups[1][0]];
      if (flush) return [5, ...ranks];
      if (straightHigh) return [4, straightHigh];
      if (groups[0][1] === 3) return [3, groups[0][0], ...groups.slice(1).map(group => group[0]).sort((a, b) => b - a)];
      if (groups[0][1] === 2 && groups[1][1] === 2) return [2, Math.max(groups[0][0], groups[1][0]), Math.min(groups[0][0], groups[1][0]), groups[2][0]];
      if (groups[0][1] === 2) return [1, groups[0][0], ...groups.slice(1).map(group => group[0]).sort((a, b) => b - a)];
      return [0, ...ranks];
    }

    function bestHand(cards) {
      let best = null;
      for (let a = 0; a < cards.length - 4; a++) {
        for (let b = a + 1; b < cards.length - 3; b++) {
          for (let c = b + 1; c < cards.length - 2; c++) {
            for (let d = c + 1; d < cards.length - 1; d++) {
              for (let e = d + 1; e < cards.length; e++) {
                const score = evaluateFive([cards[a], cards[b], cards[c], cards[d], cards[e]]);
                if (!best || compare(score, best) > 0) best = score;
              }
            }
          }
        }
      }
      return best;
    }

    function compare(left, right) {
      for (let i = 0; i < Math.max(left.length, right.length); i++) {
        const difference = (left[i] || 0) - (right[i] || 0);
        if (difference) return difference;
      }
      return 0;
    }

    const handNames = ["하이 카드", "원 페어", "투 페어", "트리플", "스트레이트", "플러시", "풀 하우스", "포 카드", "스트레이트 플러시"];

    function awardPot(winner) {
      stacks[winner] += pot;
      pot = 0;
    }

    function showdown() {
      finished = true;
      current = 0;
      revealComputer = true;
      const playerScore = bestHand(player.concat(community));
      const computerScore = bestHand(computer.concat(community));
      const result = compare(playerScore, computerScore);
      if (result === 0) {
        const playerShare = Math.ceil(pot / 2);
        stacks[1] += playerShare;
        stacks[2] += pot - playerShare;
        pot = 0;
        statusEl.textContent = `무승부 · 팟을 나눴습니다 · 나: ${handNames[playerScore[0]]} / 컴퓨터: ${handNames[computerScore[0]]}`;
      } else {
        const winner = result > 0 ? 1 : 2;
        const winningHand = handNames[winner === 1 ? playerScore[0] : computerScore[0]];
        awardPot(winner);
        statusEl.textContent = `${winner === 1 ? "승리!" : "컴퓨터 승리"} · ${winner === 1 ? "나" : "컴퓨터"}의 ${winningHand}`;
      }
      if (stacks[1] === 0 || stacks[2] === 0) {
        statusEl.textContent += stacks[1] === 0 ? " · 칩이 모두 소진되어 새 게임이 필요합니다." : " · 컴퓨터가 칩을 모두 잃었습니다!";
      }
      render();
    }

    function revealNextStreet() {
      street++;
      if (street === 1) {
        draw();
        community.push(draw(), draw(), draw());
      } else if (street === 2 || street === 3) {
        draw();
        community.push(draw());
      }
      streetBets = [0, 0, 0];
      currentBet = 0;
      minRaise = BIG_BLIND;
      acted = [false, stacks[1] === 0, stacks[2] === 0];
      if (stacks[1] === 0 || stacks[2] === 0) {
        while (community.length < 5) {
          draw();
          community.push(draw());
        }
        showdown();
        return;
      }
      current = button === 1 ? 2 : 1;
      statusEl.textContent = `${streets[street]} · 베팅을 시작하세요.`;
      render();
      scheduleComputer();
    }

    function closeBettingRound() {
      const difference = streetBets[1] - streetBets[2];
      if (difference !== 0) {
        const overbettor = difference > 0 ? 1 : 2;
        const refund = Math.abs(difference);
        stacks[overbettor] += refund;
        streetBets[overbettor] -= refund;
        pot -= refund;
      }
      if (street === 3) {
        showdown();
        return;
      }
      revealNextStreet();
    }

    function maybeCloseBettingRound() {
      if ([1, 2].every(playerNumber => stacks[playerNumber] === 0 || acted[playerNumber])) {
        closeBettingRound();
      } else {
        current = current === 1 ? 2 : 1;
        render();
        scheduleComputer();
      }
    }

    function applyAction(playerNumber, action, raiseTo = 0) {
      if (finished || current !== playerNumber) return;
      if (action === "fold") {
        finished = true;
        current = 0;
        revealComputer = false;
        awardPot(playerNumber === 1 ? 2 : 1);
        statusEl.textContent = playerNumber === 1 ? "폴드했습니다. 컴퓨터가 팟을 가져갑니다." : "컴퓨터가 폴드했습니다. 팟을 가져왔습니다.";
        render();
        return;
      }
      if (action === "call") {
        const toCall = Math.max(0, currentBet - streetBets[playerNumber]);
        commitChips(playerNumber, toCall);
        acted[playerNumber] = true;
      } else if (action === "raise" || action === "all-in") {
        const target = action === "all-in" ? streetBets[playerNumber] + stacks[playerNumber] : raiseTo;
        const maximumTarget = streetBets[playerNumber] + stacks[playerNumber];
        const increase = target - currentBet;
        if (target > maximumTarget) return;
        if (target > currentBet && increase < minRaise && target !== maximumTarget) return;
        if (target <= currentBet && action !== "all-in") return;
        commitChips(playerNumber, target - streetBets[playerNumber]);
        if (target > currentBet) {
          if (increase >= minRaise) minRaise = increase;
          currentBet = target;
          acted[playerNumber === 1 ? 2 : 1] = false;
        }
        acted[playerNumber] = true;
      }
      statusEl.textContent = playerNumber === 1 ? "내 액션을 완료했습니다." : "컴퓨터가 액션했습니다.";
      render();
      maybeCloseBettingRound();
    }

    function estimateStrength(cards) {
      if (cards.length === 2) {
        const [first, second] = cards;
        const high = Math.max(first.rank, second.rank);
        const low = Math.min(first.rank, second.rank);
        let strength = high / 14 * 0.45 + low / 14 * 0.2;
        if (first.rank === second.rank) strength += 0.32;
        if (first.suit === second.suit) strength += 0.06;
        if (high - low <= 2) strength += 0.04;
        return Math.min(0.95, strength);
      }
      const score = bestHand(cards);
      const categoryStrength = [0.22, 0.42, 0.58, 0.7, 0.78, 0.84, 0.92, 0.97, 0.995];
      return categoryStrength[score[0]] + (score[1] || 0) / 1000;
    }

    function playComputer() {
      computerTimer = null;
      if (finished || current !== 2) return;
      const toCall = Math.max(0, currentBet - streetBets[2]);
      const strength = estimateStrength(computer.concat(community));
      const callCost = toCall / Math.max(1, pot + toCall);
      if (toCall > 0 && strength < 0.27 + callCost * 0.55 && Math.random() < 0.72) {
        applyAction(2, "fold");
        return;
      }
      const maximumRaiseTo = streetBets[2] + stacks[2];
      const minimumRaiseTo = currentBet + minRaise;
      const shouldRaise = maximumRaiseTo >= minimumRaiseTo && strength > 0.72 && Math.random() < (toCall ? 0.28 : 0.35);
      if (shouldRaise) {
        const raiseBy = Math.max(minRaise, Math.min(pot + toCall, maximumRaiseTo - currentBet));
        applyAction(2, "raise", Math.min(maximumRaiseTo, currentBet + raiseBy));
      } else {
        applyAction(2, "call");
      }
    }

    function scheduleComputer() {
      clearTimeout(computerTimer);
      computerTimer = current === 2 && !finished ? setTimeout(playComputer, 500) : null;
    }

    function startHand() {
      if (stacks[1] === 0 || stacks[2] === 0) {
        statusEl.textContent = "칩을 모두 잃었습니다. 새 게임을 눌러 다시 시작하세요.";
        finished = true;
        render();
        return;
      }
      clearTimeout(computerTimer);
      computerTimer = null;
      shuffle();
      player = [draw(), draw()];
      computer = [draw(), draw()];
      community = [];
      street = 0;
      finished = false;
      revealComputer = false;
      pot = 0;
      streetBets = [0, 0, 0];
      acted = [false, false, false];
      currentBet = 0;
      minRaise = BIG_BLIND;
      const smallBlindPlayer = button;
      const bigBlindPlayer = button === 1 ? 2 : 1;
      commitChips(smallBlindPlayer, SMALL_BLIND);
      commitChips(bigBlindPlayer, BIG_BLIND);
      currentBet = Math.max(streetBets[1], streetBets[2]);
      current = smallBlindPlayer;
      if (stacks[current] === 0) current = current === 1 ? 2 : 1;
      statusEl.textContent = `프리플랍 · ${button === 1 ? "내가" : "컴퓨터가"} 버튼·스몰 블라인드 · 빅 블라인드 ${BIG_BLIND}`;
      render();
      scheduleComputer();
    }

    function newGame() {
      clearTimeout(computerTimer);
      computerTimer = null;
      stacks = [0, STARTING_STACK, STARTING_STACK];
      button = 1;
      startHand();
    }

    checkCallBtn.addEventListener("click", () => applyAction(1, "call"));
    raiseBtn.addEventListener("click", () => {
      const target = Number(raiseInput.value);
      if (!Number.isInteger(target)) {
        statusEl.textContent = "레이즈 총액은 정수 칩으로 입력하세요.";
        return;
      }
      applyAction(1, "raise", target);
    });
    allInBtn.addEventListener("click", () => applyAction(1, "all-in"));
    foldBtn.addEventListener("click", () => applyAction(1, "fold"));
    nextHandBtn.addEventListener("click", () => {
      button = button === 1 ? 2 : 1;
      startHand();
    });
    document.getElementById("holdem-reset").addEventListener("click", newGame);
    registerGame("panel-holdem", {
      init: newGame,
      stop() {
        clearTimeout(computerTimer);
        computerTimer = null;
      },
    });
  })();
