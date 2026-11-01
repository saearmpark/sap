  (function () {
    const SUITS = ["♠", "♥", "♦", "♣"];
    const DECKS = 6;
    const START_CHIPS = 1000;
    const BANKER_COMMISSION = 0.95;
    const LABELS = { player: "플레이어", banker: "뱅커", tie: "타이" };
    const PAYOUTS = { player: "1:1", banker: "0.95:1", tie: "8:1" };

    const playerCardsEl = document.getElementById("baccarat-player-cards");
    const bankerCardsEl = document.getElementById("baccarat-banker-cards");
    const playerScoreEl = document.getElementById("baccarat-player-score");
    const bankerScoreEl = document.getElementById("baccarat-banker-score");
    const statusEl = document.getElementById("baccarat-status");
    const chipsEl = document.getElementById("baccarat-chips");
    const betEl = document.getElementById("baccarat-bet");
    const dealBtn = document.getElementById("baccarat-deal");
    const clearBtn = document.getElementById("baccarat-clear");
    const chipButtons = [...document.querySelectorAll("#baccarat-chip-buttons [data-chip]")];
    const sideButtons = [...document.querySelectorAll("#baccarat-bets [data-bet]")];

    let shoe = [];
    let player = [];
    let banker = [];
    let chips = START_CHIPS;
    let bet = 0;
    let side = "player";
    let phase = "betting";

    function buildShoe() {
      shoe = [];
      for (let deck = 0; deck < DECKS; deck++) {
        for (let suit = 0; suit < SUITS.length; suit++) {
          for (let rank = 1; rank <= 13; rank++) shoe.push({ rank, suit });
        }
      }
      for (let i = shoe.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shoe[i], shoe[j]] = [shoe[j], shoe[i]];
      }
    }

    function drawCard() {
      if (shoe.length < 20) buildShoe();
      return shoe.pop();
    }

    function cardValue(card) {
      return card.rank >= 10 ? 0 : card.rank;
    }

    function handTotal(hand) {
      return hand.reduce((sum, card) => sum + cardValue(card), 0) % 10;
    }

    function rankLabel(rank) {
      return rank === 1 ? "A" : rank === 11 ? "J" : rank === 12 ? "Q" : rank === 13 ? "K" : String(rank);
    }

    function renderHand(container, hand) {
      container.replaceChildren(...hand.map(card => {
        const item = document.createElement("span");
        item.className = "blackjack-card";
        item.textContent = `${rankLabel(card.rank)}${SUITS[card.suit]}`;
        if (card.suit === 1 || card.suit === 2) item.classList.add("baccarat-card-red");
        return item;
      }));
    }

    function render() {
      renderHand(playerCardsEl, player);
      renderHand(bankerCardsEl, banker);
      playerScoreEl.textContent = player.length ? String(handTotal(player)) : "0";
      bankerScoreEl.textContent = banker.length ? String(handTotal(banker)) : "0";
      chipsEl.textContent = chips.toLocaleString("ko-KR");
      betEl.textContent = bet.toLocaleString("ko-KR");
      sideButtons.forEach(button => {
        button.setAttribute("aria-pressed", String(button.dataset.bet === side));
      });
      chipButtons.forEach(button => {
        button.disabled = phase !== "betting" || chips <= 0;
      });
      dealBtn.disabled = phase !== "betting" || bet <= 0;
      clearBtn.disabled = phase !== "betting" || bet <= 0;
    }

    function selectSide(nextSide) {
      if (!LABELS[nextSide]) return;
      side = nextSide;
      if (phase === "betting") {
        statusEl.textContent = `${LABELS[side]}에 베팅하세요. ${PAYOUTS[side]} 배당입니다.`;
      }
      render();
    }

    function placeBet(value) {
      if (phase !== "betting") {
        statusEl.textContent = "결과를 확인한 뒤 새 판을 시작하세요.";
        return;
      }
      if (chips <= 0) {
        statusEl.textContent = "보유 칩이 없습니다. 새 게임으로 초기화하세요.";
        return;
      }
      if (bet + value > chips) {
        statusEl.textContent = `보유 칩보다 많이 베팅할 수 없습니다. (보유 ${chips.toLocaleString("ko-KR")}칩)`;
        return;
      }
      bet += value;
      statusEl.textContent = `${LABELS[side]}에 ${bet.toLocaleString("ko-KR")}칩을 베팅했습니다. 카드 돌리기를 누르세요.`;
      render();
    }

    function clearBet() {
      if (phase !== "betting" || bet <= 0) return;
      bet = 0;
      statusEl.textContent = `${LABELS[side]}에 베팅할 칩을 골라주세요.`;
      render();
    }

    // 세 번째 카드 규칙에 따라 플레이어와 뱅커의 패를 완성합니다.
    function playHands() {
      player = [drawCard(), drawCard()];
      banker = [drawCard(), drawCard()];
      let playerTotal = handTotal(player);
      let bankerTotal = handTotal(banker);
      const natural = playerTotal >= 8 || bankerTotal >= 8;
      if (natural) return;

      let playerThird = null;
      if (playerTotal <= 5) {
        const card = drawCard();
        player.push(card);
        playerThird = cardValue(card);
        playerTotal = handTotal(player);
      }

      if (playerThird === null) {
        if (bankerTotal <= 5) banker.push(drawCard());
        return;
      }

      const bankerDraws =
        bankerTotal <= 2 ? true :
        bankerTotal === 3 ? playerThird !== 8 :
        bankerTotal === 4 ? playerThird >= 2 && playerThird <= 7 :
        bankerTotal === 5 ? playerThird >= 4 && playerThird <= 7 :
        bankerTotal === 6 ? playerThird === 6 || playerThird === 7 :
        false;
      if (bankerDraws) banker.push(drawCard());
    }

    function settle() {
      const playerTotal = handTotal(player);
      const bankerTotal = handTotal(banker);
      const outcome = playerTotal > bankerTotal ? "player" : bankerTotal > playerTotal ? "banker" : "tie";
      const wager = bet;
      let profit = 0;
      let message = "";

      if (outcome === side) {
        if (side === "player") {
          profit = wager;
          chips += wager + profit;
        } else if (side === "banker") {
          profit = Math.floor(wager * BANKER_COMMISSION);
          chips += wager + profit;
        } else {
          profit = wager * 8;
          chips += wager + profit;
        }
        message = `${LABELS[outcome]} 승리! 내가 이겼습니다. +${profit.toLocaleString("ko-KR")}칩`;
      } else if (outcome === "tie") {
        chips += wager;
        message = `타이입니다. 베팅한 ${wager.toLocaleString("ko-KR")}칩을 돌려받았습니다.`;
      } else {
        message = `${LABELS[outcome]} 승리. 이번 판은 ${wager.toLocaleString("ko-KR")}칩을 잃었습니다.`;
      }

      bet = 0;
      phase = "betting";
      statusEl.textContent = `플레이어 ${playerTotal} : 뱅커 ${bankerTotal} · ${message}`;
      render();
    }

    function deal() {
      if (phase !== "betting") return;
      if (bet <= 0) {
        statusEl.textContent = "먼저 베팅할 곳을 고르고 칩을 걸어주세요.";
        return;
      }
      if (bet > chips) {
        statusEl.textContent = "보유 칩보다 많이 베팅할 수 없습니다.";
        return;
      }
      chips -= bet;
      phase = "dealing";
      statusEl.textContent = "카드를 나누는 중...";
      render();
      playHands();
      settle();
    }

    function reset() {
      buildShoe();
      player = [];
      banker = [];
      chips = START_CHIPS;
      bet = 0;
      side = "player";
      phase = "betting";
      statusEl.textContent = "베팅할 곳을 고르고 칩을 걸어주세요.";
      render();
    }

    sideButtons.forEach(button => {
      button.addEventListener("click", () => selectSide(button.dataset.bet));
    });
    chipButtons.forEach(button => {
      button.addEventListener("click", () => placeBet(Number(button.dataset.chip)));
    });
    dealBtn.addEventListener("click", deal);
    clearBtn.addEventListener("click", clearBet);
    document.getElementById("baccarat-reset").addEventListener("click", reset);

    registerGame("panel-baccarat", { init: reset, stop() {} });
  })();
