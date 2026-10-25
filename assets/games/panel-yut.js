  (function () {
    const nodes = [
      [90, 90], [90, 74], [90, 58], [90, 42], [90, 26],
      [90, 10], [74, 10], [58, 10], [42, 10], [26, 10],
      [10, 10], [10, 26], [10, 42], [10, 58], null,
      [10, 74], [10, 90], [26, 90], [42, 90], [58, 90],
      [76, 24], [63, 37], [50, 50], [37, 63], [24, 76],
      [24, 26], [37, 37], [63, 63], [76, 76],
      [74, 90],
    ];
    const OUTER = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18, 19, 29, 0];
    const SHORTCUT_A = [5, 20, 21, 22, 23, 24, 16, 17, 18, 19, 29, 0];
    const SHORTCUT_B = [10, 25, 26, 22, 27, 28, 0];
    const PATHS = { outer: OUTER, shortcutA: SHORTCUT_A, shortcutB: SHORTCUT_B };
    const MOVE_COUNTS_BY_FLAT_STICKS = [5, 1, 2, 3, 4];
    const START_INDEX = 0;
    const YARD_POSITION = START_INDEX - 1;
    const LINKS = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,10],
      [10,11],[11,12],[12,13],[13,15],[15,16],[16,17],[17,18],[18,19],[19,29],[29,0],
      [5,20],[20,21],[21,22],[22,23],[23,24],[24,16],[10,25],[25,26],[26,22],[22,27],[27,28],[28,0]];
    const boardEl = document.getElementById("yut-board");
    const statusEl = document.getElementById("yut-status");
    const scoreEl = document.getElementById("yut-score");
    const opponentStatusEl = document.getElementById("yut-opponent-status");
    const sticksEl = document.getElementById("yut-sticks");
    const throwBtn = document.getElementById("yut-throw");
    const outerBtn = document.getElementById("yut-route-outer");
    const shortcutBtn = document.getElementById("yut-route-shortcut");
    const moveBtn = document.getElementById("yut-move");
    const finishBtn = document.getElementById("yut-finish");
    const passBtn = document.getElementById("yut-pass");
    let teams = [];
    let turn = 0;
    let result = null;
    let pendingResults = [];
    let selectedResultIndex = 0;
    let bonusRolls = 0;
    let selected = null;
    let selectedRoute = "outer";
    let routeChosen = false;
    let active = false;
    let finished = false;
    let aiTimer = null;

    function buildBoard() {
      boardEl.replaceChildren();
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 100 100");
      svg.setAttribute("class", "yut-board-svg");
      for (const [from, to] of LINKS) {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", nodes[from][0]); line.setAttribute("y1", nodes[from][1]);
        line.setAttribute("x2", nodes[to][0]); line.setAttribute("y2", nodes[to][1]);
        line.setAttribute("stroke", "#96764d"); line.setAttribute("stroke-width", "1.2");
        svg.appendChild(line);
      }
      boardEl.appendChild(svg);
      for (let index = 0; index < nodes.length; index++) {
        if (!nodes[index]) continue;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "yut-node";
        button.dataset.node = String(index);
        button.style.left = `${nodes[index][0]}%`;
        button.style.top = `${nodes[index][1]}%`;
        button.setAttribute("aria-label", `윷판 위치 ${index + 1}`);
        button.addEventListener("click", () => selectAtNode(index));
        boardEl.appendChild(button);
      }
    }

    function currentPath(token) {
      return PATHS[token.path];
    }
    function positionBeforeMove(token, route = token.path) {
      if (token.inYard) return START_INDEX;
      if (token.path === route) return token.pos;
      const node = currentPath(token)[token.pos];
      const routePosition = PATHS[route].indexOf(node);
      return routePosition >= 0 ? routePosition : token.pos;
    }
    function tokensAt(team, token) {
      if (!token || token.inYard) return [];
      const node = PATHS[token.path][token.pos];
      return teams[team].filter(other => !other.done && !other.inYard
        && PATHS[other.path][other.pos] === node);
    }
    function validTokens(team) {
      return teams[team].filter(token => !token.done
        && (result > 0 || (!token.inYard && token.pos >= 0)));
    }
    function targetPosition(token, route) {
      if (!token || result === null) return null;
      if (result < 0) return previousPosition(token)?.node ?? null;
      const moveRoute = route || selectedRoute;
      const nextPos = positionBeforeMove(token, moveRoute) + result;
      return nextPos >= START_INDEX && nextPos < PATHS[moveRoute].length ? PATHS[moveRoute][nextPos] : null;
    }
    function finishesMove(token, route = selectedRoute) {
      if (!token || result === null) return false;
      const lastTrackPosition = PATHS[route].length - 1;
      const destinationPosition = positionBeforeMove(token, route) + result;
      return result > 0 && destinationPosition > lastTrackPosition;
    }
    function previousPosition(token) {
      if (!token || token.inYard) return null;
      if (token.path === "outer") {
        const pos = token.pos === START_INDEX + 1
          ? OUTER.length - 1
          : token.pos === START_INDEX ? OUTER.length - 2 : token.pos - 1;
        return { path: "outer", pos, node: OUTER[pos] };
      }
      if (token.pos === 0) {
        const outerPos = token.path === "shortcutA" ? 4 : 9;
        return { path: "outer", pos: outerPos, node: OUTER[outerPos] };
      }
      const pos = token.pos - 1;
      return { path: token.path, pos, node: PATHS[token.path][pos] };
    }
    function renderRollQueue() {
      sticksEl.replaceChildren();
      pendingResults.forEach((roll, index) => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = `yut-roll-result${index === selectedResultIndex ? " is-selected" : ""}`;
        item.setAttribute("aria-pressed", String(index === selectedResultIndex));
        item.setAttribute("aria-label", `이동 ${index + 1} 결과`);
        item.addEventListener("click", () => {
          if (turn !== 0 || !active || finished) return;
          selectedResultIndex = index;
          result = pendingResults[index].value;
          selected = null;
          routeChosen = false;
          render();
          statusEl.textContent = `${index + 1}번째 윷 결과를 선택했습니다. 이동할 말을 선택하세요.`;
        });
        roll.faces.forEach(face => {
          const stick = document.createElement("span");
          stick.textContent = face ? "앞" : "뒤";
          item.appendChild(stick);
        });
        const label = document.createElement("span");
        const backDo = roll.value === -1;
        label.className = `yut-result-label${backDo ? " is-backdo" : roll.value === 1 ? " is-do" : ""}`;
        label.textContent = `${index + 1}. ${backDo ? "빽도 · 1칸 뒤로" : `${["", "도", "개", "걸", "윷", "모"][roll.value]} · ${roll.value}칸 앞으로`}`;
        item.appendChild(label);
        sticksEl.appendChild(item);
      });
    }
    function render() {
      renderRollQueue();
      const forkRoutes = selected && forkAvailable(selected) ? routesAtFork(selected) : [];
      const previewRoutes = forkRoutes.length && !routeChosen ? forkRoutes : [selectedRoute];
      boardEl.querySelectorAll(".yut-node").forEach(button => {
        const node = Number(button.dataset.node);
        const occupants = [];
        teams.forEach((team, teamIndex) => {
          const pile = team.filter(token => !token.done && !token.inYard && PATHS[token.path][token.pos] === node);
          if (pile.length) occupants.push({ teamIndex, count: pile.length });
        });
        button.replaceChildren();
        for (const occupant of occupants) {
          const badge = document.createElement("span");
          badge.className = `yut-token ${occupant.teamIndex === 0 ? "is-red" : "is-blue"}`;
          badge.textContent = String(occupant.count);
          button.appendChild(badge);
        }
        button.classList.toggle("is-selected", Boolean(selected && PATHS[selected.path][selected.pos] === node));
        button.classList.toggle("is-target-outer", false);
        button.classList.toggle("is-target-shortcut", false);
        for (const route of previewRoutes) {
          const destination = finishesMove(selected, route) ? null : targetPosition(selected, route);
          button.classList.toggle(
            route === "outer" ? "is-target-outer" : "is-target-shortcut",
            Boolean(selected && destination === node),
          );
        }
      });
      const yard = document.getElementById("yut-yard");
      yard.replaceChildren();
      teams[0].forEach((token, index) => {
        if (token.done || !token.inYard) return;
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = `출발 말 ${index + 1}`;
        button.disabled = turn !== 0 || result === null || finished;
        button.addEventListener("click", () => selectToken(token));
        yard.appendChild(button);
      });
      const pending = turn === 0 && result !== null && !finished;
      const canThrowBonus = pendingResults.length === 0
        || [4, 5].includes(pendingResults[pendingResults.length - 1]?.value);
      throwBtn.disabled = !active || finished || turn !== 0 || !canThrowBonus;
      throwBtn.textContent = pendingResults.length && canThrowBonus ? "이동 전 추가 투척" : "윷 던지기";
      outerBtn.hidden = !pending || !selected || !forkAvailable(selected);
      shortcutBtn.hidden = !pending || !selected || !forkAvailable(selected);
      const centerFork = Boolean(selected && currentPath(selected)[selected.pos] === 22);
      outerBtn.textContent = centerFork ? "지름길 → 좌측 하단" : "큰길 (초록 표시)";
      shortcutBtn.textContent = centerFork ? "지름길 → 우측 하단" : "지름길 (파란 표시)";
      outerBtn.classList.toggle("is-selected", routeChosen
        && selectedRoute === (centerFork ? "shortcutA" : "outer"));
      shortcutBtn.classList.toggle("is-selected", routeChosen
        && selectedRoute === (centerFork ? "shortcutB" : selected?.path === "outer" ? "shortcutA" : "shortcutB"));
      moveBtn.hidden = !pending || !selected
        || (forkRoutes.length > 0 && !routeChosen)
        || finishesMove(selected, selectedRoute);
      moveBtn.disabled = !pending || !selected;
      finishBtn.hidden = !pending || !selected
        || (forkRoutes.length > 0 && !routeChosen)
        || !finishesMove(selected, selectedRoute);
      finishBtn.disabled = !pending || !selected;
      finishBtn.textContent = selected && result === 1
        && PATHS[selectedRoute].length - positionBeforeMove(selected, selectedRoute) === 1
        ? "마지막 한 칸 이동해 골인"
        : "이번 결과로 골인";
      passBtn.hidden = !pending || validTokens(0).length > 0;
      passBtn.disabled = !active || !pending || validTokens(0).length > 0;
      const redDone = teams[0].filter(token => token.done).length;
      const blueDone = teams[1].filter(token => token.done).length;
      scoreEl.textContent = `빨강 결승 ${redDone}/4 · 파랑 결승 ${blueDone}/4`;
      const opponentTokens = teams[1].map((token, index) => {
        if (token.done) return `${index + 1}번 골인`;
        if (token.inYard) return `${index + 1}번 대기`;
        const node = currentPath(token)[token.pos];
        return `${index + 1}번 노드 ${node}`;
      });
      const opponentRemaining = teams[1].filter(token => !token.done).length;
      opponentStatusEl.textContent = `컴퓨터 남은 말 ${opponentRemaining}개 · 말 현황: ${opponentTokens.join(" · ")}`;
    }
    function forkAvailable(token) {
      if (result < 1) return false;
      const node = currentPath(token)[token.pos];
      return ((node === 5 || node === 10) && token.path === "outer")
        || (node === 22 && token.path !== "outer");
    }
    function routesAtFork(token) {
      const node = currentPath(token)[token.pos];
      if (node === 5) return ["outer", "shortcutA"];
      if (node === 10) return ["outer", "shortcutB"];
      if (node === 22 && token.path !== "outer") return ["shortcutA", "shortcutB"];
      return [];
    }
    function routeForForkChoice(choice) {
      if (!selected) return null;
      const node = currentPath(selected)[selected.pos];
      if (node === 22) return choice === "outer" ? "shortcutA" : "shortcutB";
      return choice === "outer" ? "outer" : node === 5 ? "shortcutA" : "shortcutB";
    }
    function selectAtNode(node) {
      if (!active || finished || turn !== 0 || result === null) return;
      if (selected) {
        const routes = routesAtFork(selected).length && !routeChosen
          ? routesAtFork(selected)
          : [selectedRoute];
        const matchingRoute = routes.find(route => targetPosition(selected, route) === node);
        if (matchingRoute) {
          selectedRoute = matchingRoute;
          routeChosen = true;
          commitHumanMove(matchingRoute);
          return;
        }
      }
      const token = teams[0].find(item => !item.done && !item.inYard && PATHS[item.path][item.pos] === node);
      if (token) selectToken(token);
    }
    function selectToken(token) {
      if (!active || finished || turn !== 0 || result === null || token.done) return;
      selected = token;
      selectedRoute = token.path;
      routeChosen = !forkAvailable(token);
      render();
      statusEl.textContent = forkAvailable(token)
        ? "말을 선택했습니다. 큰길 또는 지름길을 고르세요."
        : "말을 선택했습니다. 이동 버튼을 누르세요.";
    }
    function setRoute(route) {
      if (!selected || !forkAvailable(selected)) return;
      selectedRoute = route;
      routeChosen = true;
      outerBtn.classList.toggle("is-selected", route === "outer");
      shortcutBtn.classList.toggle("is-selected", route !== "outer");
      render();
    }
    function doMove(teamIndex, token, route) {
      if (result === null || token.done) return false;
      const pile = tokensAt(teamIndex, token);
      const moving = pile.length ? pile : [token];
      const path = currentPath(token);
      if (result < 0) {
        const previous = previousPosition(token);
        if (!previous) return false;
        moving.forEach(item => {
          item.pos = previous.pos;
          item.path = previous.path;
          item.inYard = false;
        });
        const opponents = teams[1 - teamIndex].filter(item =>
          !item.done && !item.inYard && PATHS[item.path][item.pos] === previous.node);
        if (opponents.length) {
          opponents.forEach(item => { item.pos = YARD_POSITION; item.path = "outer"; item.inYard = true; });
          bonusRolls++;
          return true;
        }
        return false;
      }
      const movePath = route || token.path;
      const movePathNodes = PATHS[movePath];
      const nextPos = positionBeforeMove(token, movePath) + result;
      if (finishesMove(token, movePath)) {
        moving.forEach(item => { item.done = true; item.inYard = false; });
      } else {
        const oldNode = token.inYard ? movePathNodes[START_INDEX] : path[token.pos];
        const newNode = movePathNodes[nextPos];
        moving.forEach(item => {
          item.pos = nextPos;
          item.path = movePath;
          item.inYard = false;
        });
        const opponents = teams[1 - teamIndex].filter(item =>
          !item.done && !item.inYard && PATHS[item.path][item.pos] === newNode);
        if (opponents.length) {
          opponents.forEach(item => { item.pos = YARD_POSITION; item.path = "outer"; item.inYard = true; });
          bonusRolls++;
          return true;
        }
        if (oldNode === newNode) return false;
      }
      return false;
    }
    function afterMove(extraTurn) {
      const winner = teams[turn].every(token => token.done);
      if (winner) {
        finished = true;
        statusEl.textContent = `${turn === 0 ? "승리" : "컴퓨터 승리"}! 말을 모두 결승에 보냈습니다.`;
        result = null;
        pendingResults = [];
        bonusRolls = 0;
        selected = null;
        routeChosen = false;
        render();
        return;
      }
      const continueTurn = extraTurn;
      if (!continueTurn) {
        turn = 1 - turn;
        result = null;
        bonusRolls = 0;
        selected = null;
      }
      render();
      if (turn === 0) {
        statusEl.textContent = continueTurn ? "한 번 더 던지세요." : "내 차례입니다. 윷을 던지세요.";
      } else {
        statusEl.textContent = continueTurn ? "컴퓨터가 한 번 더 던집니다..." : "컴퓨터 차례입니다...";
        aiTimer = setTimeout(computerTurn, continueTurn ? 550 : 700);
      }
    }
    function consumeSelectedResult() {
      pendingResults.splice(selectedResultIndex, 1);
      selectedResultIndex = 0;
      result = pendingResults[0]?.value ?? null;
    }
    function commitHumanMove(route = null) {
      if (!selected || result === null || turn !== 0) return;
      const captured = doMove(0, selected, route);
      consumeSelectedResult();
      selected = null;
      routeChosen = false;
      render();
      if (teams[turn].every(token => token.done)) {
        afterMove(false);
        return;
      }
      if (pendingResults.length) {
        statusEl.textContent = captured
          ? "상대 말을 잡았습니다! 다음 윷 결과로 이동할 말을 선택하세요."
          : "다음 윷 결과로 이동할 말을 선택하세요.";
        return;
      }
      afterMove(bonusRolls > 0);
      if (captured && turn === 0 && !finished) statusEl.textContent = "상대 말을 잡았습니다! 한 번 더 던지세요.";
    }
    function computerRoute(token) {
      if (token.inYard || token.path !== "outer") return token.path;
      const node = PATHS[token.path][token.pos];
      if (node === 5) return "shortcutA";
      if (node === 10) return "shortcutB";
      return "outer";
    }
    function throwYut() {
      const lastResult = pendingResults[pendingResults.length - 1]?.value;
      const canUseBonus = bonusRolls > 0
        && (pendingResults.length === 0 || [4, 5].includes(lastResult));
      const canThrowBonus = pendingResults.length === 0 || canUseBonus;
      if (!active || finished || !canThrowBonus) return;
      if (canUseBonus) bonusRolls--;
      const faces = Array.from({ length: 4 }, () => Math.random() < 0.5);
      const flat = faces.filter(Boolean).length;
      const backDo = flat === 1 && faces[3];
      const rolledResult = backDo ? -1 : MOVE_COUNTS_BY_FLAT_STICKS[flat];
      pendingResults.push({ value: rolledResult, faces });
      if ([4, 5].includes(rolledResult)) bonusRolls++;
      if (pendingResults.length === 1) selectedResultIndex = 0;
      result = pendingResults[selectedResultIndex]?.value ?? null;
      const labels = { "-1": "빽도", 1: "도", 2: "개", 3: "걸", 4: "윷", 5: "모" };
      const rolledLabel = labels[rolledResult];
      statusEl.textContent = turn === 1
        ? `컴퓨터가 ${rolledLabel}을 던졌습니다.`
        : `${rolledLabel}! ${[4, 5].includes(rolledResult) ? "추가로 던지거나" : ""} 이동할 말을 선택하세요.`;
      selected = null;
      render();
      if (turn === 1) {
        aiTimer = setTimeout(computerTurn, [4, 5].includes(rolledResult) ? 400 : 650);
      }
    }
    function computerTurn() {
      aiTimer = null;
      if (!active || finished || turn !== 1) return;
      const lastResult = pendingResults[pendingResults.length - 1]?.value;
      if (!pendingResults.length || [4, 5].includes(lastResult)) {
        throwYut();
        return;
      }
      const options = validTokens(1);
      if (!options.length) {
        consumeSelectedResult();
        if (pendingResults.length) {
          aiTimer = setTimeout(computerTurn, 400);
        } else {
          afterMove(bonusRolls > 0);
        }
        return;
      }
      const token = options.sort((a, b) => b.pos - a.pos)[0];
      const route = computerRoute(token);
      const captured = doMove(1, token, route);
      consumeSelectedResult();
      selected = null;
      routeChosen = false;
      if (teams[turn].every(item => item.done)) {
        afterMove(false);
        return;
      }
      if (pendingResults.length) {
        render();
        aiTimer = setTimeout(computerTurn, 400);
      } else {
        afterMove(bonusRolls > 0);
      }
    }
    function reset() {
      clearTimeout(aiTimer);
      aiTimer = null;
      teams = [
        Array.from({ length: 4 }, () => ({ pos: YARD_POSITION, path: "outer", done: false, inYard: true })),
        Array.from({ length: 4 }, () => ({ pos: YARD_POSITION, path: "outer", done: false, inYard: true })),
      ];
      turn = 0;
      result = null;
      pendingResults = [];
      selectedResultIndex = 0;
      bonusRolls = 0;
      selected = null;
      routeChosen = false;
      finished = false;
      active = true;
      sticksEl.replaceChildren();
      statusEl.textContent = "내 차례입니다. 윷을 던지세요.";
      render();
    }

    buildBoard();
    throwBtn.addEventListener("click", throwYut);
    outerBtn.addEventListener("click", () => setRoute(routeForForkChoice("outer")));
    shortcutBtn.addEventListener("click", () => {
      setRoute(routeForForkChoice("shortcut"));
    });
    moveBtn.addEventListener("click", () => commitHumanMove(selectedRoute));
    finishBtn.addEventListener("click", () => commitHumanMove(selectedRoute));
    passBtn.addEventListener("click", () => {
      if (turn !== 0 || result === null || validTokens(0).length) return;
      consumeSelectedResult();
      selected = null;
      if (pendingResults.length) {
        render();
        statusEl.textContent = "다음 윷 결과로 이동할 말을 선택하세요.";
      } else {
        afterMove(bonusRolls > 0);
      }
    });
    document.getElementById("yut-reset").addEventListener("click", reset);
    registerGame("panel-yut", {
      init() { if (!teams.length) reset(); else { active = true; render(); if (turn === 1) aiTimer = setTimeout(computerTurn, 0); } },
      stop() { active = false; clearTimeout(aiTimer); aiTimer = null; },
    });
  })();
