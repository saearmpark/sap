  (function () {
    const boardEl = document.getElementById("memory-board");
    const statusEl = document.getElementById("memory-status");
    const resetBtn = document.getElementById("memory-reset");
    const symbols = ["🍎", "🚀", "🐳", "🌈", "🎸", "⭐", "🍀", "⚽"];
    let cards = [];
    let opened = [];
    let matchedPairs = 0;
    let moves = 0;
    let locked = false;
    let mismatchTimer = null;

    function shuffle(items) {
      for (let index = items.length - 1; index > 0; index--) {
        const other = Math.floor(Math.random() * (index + 1));
        [items[index], items[other]] = [items[other], items[index]];
      }
      return items;
    }

    function render() {
      boardEl.replaceChildren();
      cards.forEach((card, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "memory-card";
        button.textContent = card.open || card.matched ? card.symbol : "?";
        button.disabled = card.open || card.matched;
        button.setAttribute("aria-label", card.open || card.matched ? card.symbol : `카드 ${index + 1} 열기`);
        if (card.open) button.classList.add("is-open");
        if (card.matched) button.classList.add("is-matched");
        button.addEventListener("click", () => openCard(index));
        boardEl.appendChild(button);
      });
      statusEl.textContent = matchedPairs === symbols.length
        ? `모든 짝을 찾았습니다! 총 ${moves}번 시도했습니다.`
        : `찾은 짝 ${matchedPairs} / ${symbols.length} · 시도 ${moves}번`;
    }

    function openCard(index) {
      if (locked || cards[index].open || cards[index].matched) return;
      cards[index].open = true;
      opened.push(index);
      if (opened.length === 2) {
        moves++;
        const [first, second] = opened;
        if (cards[first].symbol === cards[second].symbol) {
          cards[first].matched = true;
          cards[second].matched = true;
          matchedPairs++;
          opened = [];
          render();
          if (matchedPairs === symbols.length) {
            window.reportScore?.("panel-memory", moves);
          }
        } else {
          locked = true;
          render();
          mismatchTimer = setTimeout(() => {
            cards[first].open = false;
            cards[second].open = false;
            opened = [];
            locked = false;
            mismatchTimer = null;
            render();
          }, 700);
        }
      } else {
        render();
      }
    }

    function newGame() {
      clearTimeout(mismatchTimer);
      mismatchTimer = null;
      cards = shuffle([...symbols, ...symbols]).map(symbol => ({ symbol, open: false, matched: false }));
      opened = [];
      matchedPairs = 0;
      moves = 0;
      locked = false;
      render();
    }

    resetBtn.addEventListener("click", newGame);
    registerGame("panel-memory", {
      init: newGame,
      stop() {
        clearTimeout(mismatchTimer);
        mismatchTimer = null;
        if (locked) {
          opened.forEach(index => { cards[index].open = false; });
          opened = [];
          locked = false;
          render();
        }
      },
    });
  })();
