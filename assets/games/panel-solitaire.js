  // ── STEP 55: 솔리테어 · 클론다이크 ─────────────────────────────
  (function () {
    const boardEl = document.getElementById("solitaire-board");
    const statusEl = document.getElementById("solitaire-status");
    const newBtn = document.getElementById("solitaire-new");
    const undoBtn = document.getElementById("solitaire-undo");

    const SUITS = ["♠", "♥", "♦", "♣"];
    const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
    const isRed = (c) => c.suit === 1 || c.suit === 2;

    let stock, waste, foundations, tableau, selection, moves, history;

    function shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
    }

    function newGame() {
      const deck = [];
      for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) deck.push({ suit: s, rank: r, faceUp: false });
      shuffle(deck);
      tableau = [[], [], [], [], [], [], []];
      for (let i = 0; i < 7; i++) {
        for (let j = 0; j <= i; j++) {
          const card = deck.pop();
          card.faceUp = j === i;
          tableau[i].push(card);
        }
      }
      stock = deck;
      waste = [];
      foundations = [[], [], [], []];
      selection = null;
      moves = 0;
      history = [];
      render();
      statusEl.textContent = "새 게임 · 카드를 골라 옮기고, 덱을 눌러 뒤집으세요.";
    }

    function clonePiles() {
      return {
        stock: stock.map((c) => ({ ...c })),
        waste: waste.map((c) => ({ ...c })),
        foundations: foundations.map((p) => p.map((c) => ({ ...c }))),
        tableau: tableau.map((p) => p.map((c) => ({ ...c }))),
        moves,
      };
    }

    function pushHistory() {
      history.push(clonePiles());
    }

    function undo() {
      const s = history.pop();
      if (!s) return;
      stock = s.stock;
      waste = s.waste;
      foundations = s.foundations;
      tableau = s.tableau;
      moves = s.moves;
      selection = null;
      render();
      statusEl.textContent = `이동 ${moves}수`;
    }

    function isValidRun(pile, index) {
      const t = tableau[pile];
      for (let k = index; k < t.length; k++) {
        if (!t[k].faceUp) return false;
        if (k > index) {
          if (t[k].rank !== t[k - 1].rank - 1) return false;
          if (isRed(t[k]) === isRed(t[k - 1])) return false;
        }
      }
      return true;
    }

    function canMoveToFoundation(card, pile) {
      const f = foundations[pile];
      if (f.length === 13) return false;
      if (f.length === 0) return card.rank === 1;
      return f[0].suit === card.suit && f[f.length - 1].rank === card.rank - 1;
    }

    function canMoveToTableau(card, pile) {
      const t = tableau[pile];
      if (!t.length) return card.rank === 13;
      const top = t[t.length - 1];
      return top.faceUp && top.rank === card.rank + 1 && isRed(top) !== isRed(card);
    }

    function peekSelection() {
      if (!selection) return null;
      if (selection.type === "waste") {
        const c = waste[waste.length - 1];
        return c ? { card: c, cards: [c] } : null;
      }
      if (selection.type === "foundation") {
        const p = foundations[selection.pile];
        const c = p[p.length - 1];
        return c ? { card: c, cards: [c] } : null;
      }
      const t = tableau[selection.pile];
      const cards = t.slice(selection.index);
      return cards.length ? { card: cards[0], cards } : null;
    }

    function removeSelected() {
      if (selection.type === "waste") return [waste.pop()];
      if (selection.type === "foundation") return [foundations[selection.pile].pop()];
      return tableau[selection.pile].splice(selection.index);
    }

    function flipExposed() {
      if (selection.type === "tableau") {
        const t = tableau[selection.pile];
        if (t.length && !t[t.length - 1].faceUp) t[t.length - 1].faceUp = true;
      }
    }

    function commit(destType, destPile) {
      pushHistory();
      const cards = removeSelected();
      if (destType === "foundation") foundations[destPile].push(cards[0]);
      else tableau[destPile].push(...cards);
      flipExposed();
      moves++;
      selection = null;
      render();
      if (foundations.every((f) => f.length === 13)) {
        window.reportScore?.("panel-solitaire", moves);
        statusEl.textContent = `축하합니다! ${moves}수 만에 완성했습니다.`;
      } else {
        statusEl.textContent = `이동 ${moves}수`;
      }
    }

    function drawStock() {
      if (!stock.length && !waste.length) return;
      pushHistory();
      if (stock.length) {
        const c = stock.pop();
        c.faceUp = true;
        waste.push(c);
      } else {
        while (waste.length) {
          const c = waste.pop();
          c.faceUp = false;
          stock.push(c);
        }
      }
      moves++;
      selection = null;
      render();
      statusEl.textContent = `이동 ${moves}수`;
    }

    function selectTableau(pile, index) {
      const t = tableau[pile];
      if (!t[index] || !t[index].faceUp) { selection = null; render(); return; }
      selection = { type: "tableau", pile, index };
      render();
    }

    function selectWaste() {
      selection = waste.length ? { type: "waste" } : null;
      render();
    }

    function selectFoundation(pile) {
      selection = foundations[pile].length ? { type: "foundation", pile } : null;
      render();
    }

    function tryMoveToFoundation(pile) {
      const info = peekSelection();
      if (!info || info.cards.length !== 1) return false;
      if (!canMoveToFoundation(info.card, pile)) return false;
      commit("foundation", pile);
      return true;
    }

    function tryMoveToTableau(pile) {
      const info = peekSelection();
      if (!info) return false;
      if (selection.type === "tableau" && !isValidRun(selection.pile, selection.index)) return false;
      if (!canMoveToTableau(info.card, pile)) return false;
      commit("tableau", pile);
      return true;
    }

    function handleClick(pile, pileIndex, cardIndex) {
      if (pile === "stock") { drawStock(); return; }
      if (pile === "waste") {
        selectWaste();
        return;
      }
      if (pile === "foundation") {
        if (selection && tryMoveToFoundation(pileIndex)) return;
        selectFoundation(pileIndex);
        return;
      }
      if (selection) {
        if (selection.type === "tableau" && selection.pile === pileIndex && selection.index === cardIndex) {
          selection = null; render(); return;
        }
        if (tryMoveToTableau(pileIndex)) return;
      }
      selectTableau(pileIndex, cardIndex);
    }

    function autoMoveCard(pile, pileIndex, cardIndex) {
      let card;
      if (pile === "waste") {
        if (!waste.length) return false;
        card = waste[waste.length - 1];
        selection = { type: "waste" };
      } else if (pile === "foundation") {
        const f = foundations[pileIndex];
        if (!f.length) return false;
        card = f[f.length - 1];
        selection = { type: "foundation", pile: pileIndex };
      } else if (pile === "tableau") {
        const t = tableau[pileIndex];
        if (!t[cardIndex] || !t[cardIndex].faceUp || !isValidRun(pileIndex, cardIndex)) return false;
        card = t[cardIndex];
        selection = { type: "tableau", pile: pileIndex, index: cardIndex };
      } else {
        return false;
      }

      const isRun = pile === "tableau" && tableau[pileIndex].length - cardIndex > 1;
      if (!isRun) {
        for (let i = 0; i < 4; i++) {
          if (canMoveToFoundation(card, i)) { commit("foundation", i); return true; }
        }
      }
      for (let i = 0; i < 7; i++) {
        if (pile === "tableau" && i === pileIndex) continue;
        if (!tableau[i].length) continue;
        if (canMoveToTableau(card, i)) { commit("tableau", i); return true; }
      }
      selection = null;
      render();
      return false;
    }

    function cardEl(card, pileType, pileIndex, cardIndex, stackIndex) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "solitaire-card";
      btn.dataset.pile = pileType;
      if (pileIndex !== undefined) btn.dataset.pileindex = pileIndex;
      if (cardIndex !== undefined) btn.dataset.cardindex = cardIndex;
      if (stackIndex) btn.style.top = `calc(${stackIndex} * var(--cw) * 0.42)`;
      if (card.faceUp) {
        if (isRed(card)) btn.classList.add("is-red");
        btn.textContent = RANKS[card.rank - 1] + SUITS[card.suit];
      } else {
        btn.classList.add("is-back");
      }
      if (selection && selection.type === "tableau" && selection.pile === pileIndex && cardIndex >= selection.index) {
        btn.classList.add("is-selected");
      }
      if (selection && selection.type === "waste" && pileType === "waste") btn.classList.add("is-selected");
      if (selection && selection.type === "foundation" && pileType === "foundation" && selection.pile === pileIndex) btn.classList.add("is-selected");
      return btn;
    }

    function emptyEl(pileType, pileIndex) {
      const div = document.createElement("div");
      div.className = "solitaire-card is-empty";
      div.dataset.pile = pileType;
      if (pileIndex !== undefined) div.dataset.pileindex = pileIndex;
      return div;
    }

    function render() {
      boardEl.replaceChildren();

      const top = document.createElement("div");
      top.className = "solitaire-row";

      const stockPile = document.createElement("div");
      stockPile.className = "solitaire-pile is-short";
      if (stock.length) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "solitaire-card is-back";
        b.dataset.pile = "stock";
        b.style.top = "0";
        stockPile.appendChild(b);
      } else {
        const e = emptyEl("stock");
        e.style.top = "0";
        stockPile.appendChild(e);
      }
      top.appendChild(stockPile);

      const wastePile = document.createElement("div");
      wastePile.className = "solitaire-pile is-short";
      if (waste.length) {
        const c = cardEl(waste[waste.length - 1], "waste", undefined, undefined, 0);
        c.style.top = "0";
        wastePile.appendChild(c);
      } else {
        const e = emptyEl("waste");
        e.style.top = "0";
        wastePile.appendChild(e);
      }
      top.appendChild(wastePile);

      const spacer = document.createElement("div");
      spacer.style.flex = "1 1 auto";
      top.appendChild(spacer);

      for (let i = 0; i < 4; i++) {
        const fp = document.createElement("div");
        fp.className = "solitaire-pile is-short";
        if (foundations[i].length) {
          const c = cardEl(foundations[i][foundations[i].length - 1], "foundation", i, undefined, 0);
          c.style.top = "0";
          fp.appendChild(c);
        } else {
          const e = emptyEl("foundation", i);
          e.style.top = "0";
          fp.appendChild(e);
        }
        top.appendChild(fp);
      }
      boardEl.appendChild(top);

      const trow = document.createElement("div");
      trow.className = "solitaire-row";
      for (let i = 0; i < 7; i++) {
        const tp = document.createElement("div");
        tp.className = "solitaire-pile";
        if (tableau[i].length) {
          tableau[i].forEach((card, j) => tp.appendChild(cardEl(card, "tableau", i, j, j)));
        } else {
          tp.appendChild(emptyEl("tableau", i));
        }
        trow.appendChild(tp);
      }
      boardEl.appendChild(trow);
    }

    boardEl.addEventListener("click", (e) => {
      const el = e.target.closest("[data-pile]");
      if (!el) { selection = null; render(); return; }
      const pile = el.dataset.pile;
      const pileIndex = el.dataset.pileindex !== undefined ? Number(el.dataset.pileindex) : undefined;
      const cardIndex = el.dataset.cardindex !== undefined ? Number(el.dataset.cardindex) : undefined;
      handleClick(pile, pileIndex, cardIndex);
    });

    boardEl.addEventListener("dblclick", (e) => {
      const el = e.target.closest("[data-pile]");
      if (!el) return;
      const pile = el.dataset.pile;
      const pileIndex = el.dataset.pileindex !== undefined ? Number(el.dataset.pileindex) : undefined;
      const cardIndex = el.dataset.cardindex !== undefined ? Number(el.dataset.cardindex) : undefined;
      autoMoveCard(pile, pileIndex, cardIndex);
    });

    newBtn.addEventListener("click", newGame);
    undoBtn.addEventListener("click", undo);

    newGame();
    registerGame("panel-solitaire", {
      init() { newGame(); },
      stop() {},
    });
  })();
