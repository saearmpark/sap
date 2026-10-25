  (function () {
    const playerCards = document.getElementById("blackjack-player-cards");
    const dealerCards = document.getElementById("blackjack-dealer-cards");
    const playerScoreEl = document.getElementById("blackjack-player-score");
    const dealerScoreEl = document.getElementById("blackjack-dealer-score");
    const statusEl = document.getElementById("blackjack-status");
    const hitBtn = document.getElementById("blackjack-hit");
    const stayBtn = document.getElementById("blackjack-stay");
    let deck = [];
    let player = [];
    let dealer = [];
    let finished = false;

    function shuffleDeck() {
      deck = [];
      for (let suit = 0; suit < 4; suit++) {
        for (let rank = 2; rank <= 14; rank++) deck.push({ rank, suit });
      }
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
    }
    function draw(hand) { hand.push(deck.pop()); }
    function score(hand) {
      let total = 0, aces = 0;
      hand.forEach(card => {
        if (card.rank === 14) { total += 11; aces++; }
        else total += Math.min(card.rank, 10);
      });
      while (total > 21 && aces) { total -= 10; aces--; }
      return total;
    }
    function cardLabel(card) {
      const rank = card.rank === 11 ? "J" : card.rank === 12 ? "Q" : card.rank === 13 ? "K" : card.rank === 14 ? "A" : String(card.rank);
      return `${rank}${["♠", "♥", "♦", "♣"][card.suit]}`;
    }
    function render(revealDealer = finished) {
      playerCards.replaceChildren();
      dealerCards.replaceChildren();
      player.forEach(card => {
        const item = document.createElement("span");
        item.className = "blackjack-card";
        item.textContent = cardLabel(card);
        playerCards.appendChild(item);
      });
      dealer.forEach((card, index) => {
        const item = document.createElement("span");
        item.className = "blackjack-card";
        item.textContent = index === 1 && !revealDealer ? "?" : cardLabel(card);
        dealerCards.appendChild(item);
      });
      playerScoreEl.textContent = String(score(player));
      dealerScoreEl.textContent = revealDealer ? String(score(dealer)) : "?";
      hitBtn.disabled = finished;
      stayBtn.disabled = finished;
    }
    function finish() {
      finished = true;
      while (score(dealer) < 17) draw(dealer);
      const mine = score(player), theirs = score(dealer);
      statusEl.textContent = mine > 21 ? "버스트! 딜러가 이겼습니다." : theirs > 21 ? "딜러 버스트! 내가 이겼습니다." : mine > theirs ? "내가 이겼습니다!" : mine < theirs ? "딜러가 이겼습니다." : "무승부입니다.";
      render(true);
    }
    function reset() {
      shuffleDeck();
      player = [];
      dealer = [];
      finished = false;
      draw(player); draw(dealer); draw(player); draw(dealer);
      statusEl.textContent = "카드를 더 받거나 멈추세요.";
      if (score(player) === 21 || score(dealer) === 21) finish();
      else render(false);
    }
    hitBtn.addEventListener("click", () => {
      if (finished) return;
      draw(player);
      if (score(player) >= 21) finish();
      else render(false);
    });
    stayBtn.addEventListener("click", () => { if (!finished) finish(); });
    document.getElementById("blackjack-reset").addEventListener("click", reset);
    registerGame("panel-blackjack", { init: reset, stop() {} });
  })();
