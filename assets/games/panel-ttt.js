  // ── STEP 1: 틱택토 ─────────────────────────────
  (function () {
    const boardEl = document.getElementById("ttt-board");
    const statusEl = document.getElementById("ttt-status");
    const resetBtn = document.getElementById("ttt-reset");

    const WIN_LINES = [
      [0,1,2],[3,4,5],[6,7,8],
      [0,3,6],[1,4,7],[2,5,8],
      [0,4,8],[2,4,6],
    ];

    let cells = Array(9).fill(null);
    let current = "O";
    let gameOver = false;
    let computerTimer = null;

    function render() {
      boardEl.innerHTML = "";
      cells.forEach((value, i) => {
        const cell = document.createElement("div");
        cell.className = "ttt-cell";
        cell.textContent = value || "";
        cell.setAttribute("role", "button");
        cell.setAttribute("aria-label", `칸 ${i + 1}${value ? ` ${value}` : " 비어 있음"}`);
        cell.setAttribute("aria-disabled", String(gameOver || current === "X" || Boolean(value)));
        cell.addEventListener("click", () => handleClick(i));
        boardEl.appendChild(cell);
      });
    }

    function checkWinner() {
      for (const [a, b, c] of WIN_LINES) {
        if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) {
          return cells[a];
        }
      }
      if (cells.every(v => v !== null)) return "draw";
      return null;
    }

    function minimax(turn, depth) {
      const winner = checkWinner();
      if (winner === "X") return 10 - depth;
      if (winner === "O") return depth - 10;
      if (winner === "draw") return 0;
      const scores = [];
      for (let i = 0; i < cells.length; i++) {
        if (cells[i]) continue;
        cells[i] = turn;
        scores.push(minimax(turn === "X" ? "O" : "X", depth + 1));
        cells[i] = null;
      }
      return turn === "X" ? Math.max(...scores) : Math.min(...scores);
    }

    function place(mark, index) {
      if (gameOver || cells[index]) return;
      cells[index] = mark;
      const winner = checkWinner();
      if (winner === "draw") {
        statusEl.textContent = "무승부입니다.";
        gameOver = true;
      } else if (winner) {
        statusEl.textContent = winner === "O" ? "내가 이겼습니다!" : "컴퓨터가 이겼습니다.";
        gameOver = true;
      } else if (mark === "O") {
        current = "X";
        statusEl.textContent = "컴퓨터가 생각 중입니다...";
        computerTimer = setTimeout(playComputer, 300);
      } else {
        current = "O";
        statusEl.textContent = "내 차례입니다.";
      }
      render();
    }

    function playComputer() {
      computerTimer = null;
      if (gameOver || current !== "X") return;
      let bestScore = -Infinity;
      let choices = [];
      for (let i = 0; i < cells.length; i++) {
        if (cells[i]) continue;
        cells[i] = "X";
        const score = minimax("O", 0);
        cells[i] = null;
        if (score > bestScore) {
          bestScore = score;
          choices = [i];
        } else if (score === bestScore) choices.push(i);
      }
      if (choices.length) place("X", choices[Math.floor(Math.random() * choices.length)]);
    }

    function reset() {
      clearTimeout(computerTimer);
      computerTimer = null;
      cells = Array(9).fill(null);
      current = "O";
      gameOver = false;
      statusEl.textContent = "내 차례입니다.";
      render();
    }

    function handleClick(index) {
      if (gameOver || current !== "O" || cells[index]) return;
      place("O", index);
    }

    const onlineBoardEl = document.getElementById("ttt-online-board");
    const onlineStatusEl = document.getElementById("ttt-online-status");
    const onlineRoomEl = document.getElementById("ttt-online-room");
    const onlineRoomCodeEl = document.getElementById("ttt-room-code");
    const onlineCreateBtn = document.getElementById("ttt-online-create");
    const onlineJoinBtn = document.getElementById("ttt-online-join");
    const onlineLeaveBtn = document.getElementById("ttt-online-leave");
    const onlineRematchBtn = document.getElementById("ttt-online-rematch");
    const onlineCopyBtn = document.getElementById("ttt-online-copy");
    const onlineLoginLink = document.getElementById("ttt-online-login");
    let onlineSocket = null;
    let onlineAuthenticated = false;
    let onlineReadyPromise = null;
    let onlineState = null;
    let onlineConnected = false;
    let onlinePanelActive = false;
    let onlineShouldReconnect = false;
    let onlineRetryTimer = null;
    let onlineRetryCount = 0;
    let onlineReconnectDeadline = 0;
    const onlineResumeKey = "sap-online-ttt-room";

    function savedRoomCode() {
      try { return sessionStorage.getItem(onlineResumeKey) || ""; } catch { return ""; }
    }

    function saveRoomCode(code) {
      try {
        if (code) sessionStorage.setItem(onlineResumeKey, code);
        else sessionStorage.removeItem(onlineResumeKey);
      } catch {}
    }

    function renderOnlineState() {
      const hasSession = Boolean(window.SAPAuth?.getToken());
      onlineLoginLink.hidden = hasSession;
      onlineBoardEl.replaceChildren();
      if (!onlineState) {
        onlineRoomEl.textContent = "대전방에 입장하지 않았습니다.";
        onlineStatusEl.textContent = hasSession
          ? "방을 만들거나 상대의 방 코드로 입장하세요."
          : "온라인 대전을 시작하려면 로그인하세요.";
        onlineLeaveBtn.hidden = true;
        onlineRematchBtn.hidden = true;
        onlineCopyBtn.hidden = true;
        return;
      }

      const { cells: onlineCells, yourMark, currentMark, status, winner } = onlineState;
      const opponentConnected = yourMark === "X" ? onlineState.oConnected : onlineState.xConnected;
      onlineRoomCodeEl.value = onlineState.roomCode;
      onlineRoomEl.textContent = `방 코드: ${onlineState.roomCode} · 내 기호 ${yourMark} · X ${onlineState.xName}`
        + (onlineState.oName ? ` · O ${onlineState.oName}` : " · 상대 대기 중");
      onlineCopyBtn.hidden = false;
      onlineLeaveBtn.hidden = false;
      onlineRematchBtn.hidden = status !== "finished";
      onlineRematchBtn.textContent = onlineState.youRequestedRematch
        ? "재대결 요청 완료"
        : "재대결 요청";
      onlineRematchBtn.disabled = onlineState.youRequestedRematch;

      if (!onlineConnected) {
        onlineStatusEl.textContent = "서버 연결이 끊겼습니다. 자동으로 다시 연결하고 있습니다...";
      } else if (status !== "waiting" && !opponentConnected) {
        onlineStatusEl.textContent = "상대 연결이 끊겼습니다. 60초 동안 재접속을 기다립니다.";
      } else if (status === "waiting") {
        onlineStatusEl.textContent = "상대가 방 코드로 입장하기를 기다리는 중입니다.";
      } else if (status === "finished") {
        onlineStatusEl.textContent = winner === "draw"
          ? "무승부입니다."
          : winner === yourMark ? "이겼습니다!" : "상대가 이겼습니다.";
        if (onlineState.opponentRequestedRematch) {
          onlineStatusEl.textContent += " 상대가 재대결을 요청했습니다.";
        } else if (onlineState.youRequestedRematch) {
          onlineStatusEl.textContent += " 상대의 응답을 기다리는 중입니다.";
        }
      } else {
        onlineStatusEl.textContent = currentMark === yourMark
          ? `내 차례입니다 (${yourMark}).`
          : `상대 차례입니다 (${currentMark}).`;
      }

      onlineCells.forEach((value, index) => {
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "ttt-cell";
        cell.textContent = value || "";
        cell.setAttribute("aria-label", `칸 ${index + 1}${value ? ` ${value}` : " 비어 있음"}`);
        cell.disabled = !onlineConnected || !opponentConnected
          || status !== "playing" || currentMark !== yourMark || Boolean(value);
        cell.addEventListener("click", () => sendOnline({ type: "move", index }));
        onlineBoardEl.appendChild(cell);
      });
    }

    function showOnlineError(message) {
      onlineStatusEl.textContent = message;
    }

    function handleOnlinePacket(packet) {
      if (packet.type === "state") {
        onlineState = packet;
        onlineConnected = true;
        onlineShouldReconnect = true;
        onlineRetryCount = 0;
        onlineReconnectDeadline = 0;
        saveRoomCode(packet.roomCode);
        renderOnlineState();
      } else if (packet.type === "error") {
        showOnlineError(packet.message || "온라인 대전 요청을 처리하지 못했습니다.");
      } else if (packet.type === "opponent-disconnected") {
        if (onlineState) {
          const disconnectedMark = onlineState.yourMark === "X" ? "O" : "X";
          onlineState[disconnectedMark === "X" ? "xConnected" : "oConnected"] = false;
        }
        renderOnlineState();
      } else if (packet.type === "opponent-reconnected") {
        if (onlineState) {
          const reconnectedMark = onlineState.yourMark === "X" ? "O" : "X";
          onlineState[reconnectedMark === "X" ? "xConnected" : "oConnected"] = true;
        }
        renderOnlineState();
      } else if (packet.type === "opponent-left") {
        onlineState = null;
        onlineShouldReconnect = false;
        saveRoomCode("");
        renderOnlineState();
        showOnlineError("상대가 대전방을 나갔습니다. 새 방을 만들거나 다시 입장해주세요.");
      } else if (packet.type === "left") {
        onlineState = null;
        onlineShouldReconnect = false;
        saveRoomCode("");
        renderOnlineState();
      }
    }

    function scheduleOnlineReconnect() {
      if (!onlinePanelActive || !onlineShouldReconnect || !window.SAPAuth?.getToken()) return;
      if (onlineRetryTimer !== null) clearTimeout(onlineRetryTimer);
      if (!onlineReconnectDeadline) onlineReconnectDeadline = Date.now() + 55_000;
      if (Date.now() >= onlineReconnectDeadline) {
        onlineShouldReconnect = false;
        showOnlineError("재접속 시간이 만료되었습니다. 방 코드로 다시 입장해주세요.");
        return;
      }
      const delays = [1000, 2000, 4000, 8000, 10000];
      const delay = Math.min(delays[Math.min(onlineRetryCount++, delays.length - 1)],
        onlineReconnectDeadline - Date.now());
      onlineRetryTimer = setTimeout(async () => {
        onlineRetryTimer = null;
        try {
          await connectOnline();
        } catch {
          scheduleOnlineReconnect();
        }
      }, delay);
    }

    function connectOnline() {
      if (onlineSocket?.readyState === WebSocket.OPEN && onlineAuthenticated) {
        return Promise.resolve();
      }
      if (onlineReadyPromise) return onlineReadyPromise;
      const token = window.SAPAuth?.getToken();
      if (!token) {
        return Promise.reject(new Error("온라인 대전을 이용하려면 먼저 로그인해주세요."));
      }

      onlineReadyPromise = new Promise((resolve, reject) => {
        const apiUrl = new URL(window.SAPAuth.API_ROOT);
        apiUrl.protocol = apiUrl.protocol === "https:" ? "wss:" : "ws:";
        apiUrl.pathname = "/ws/game";
        apiUrl.search = "";
        const socket = new WebSocket(apiUrl);
        onlineSocket = socket;
        let settled = false;
        const timeout = setTimeout(() => {
          if (!settled) {
            settled = true;
            socket.close();
            reject(new Error("온라인 게임 서버의 응답이 없습니다. 잠시 후 다시 시도해주세요."));
          }
        }, 12000);

        socket.addEventListener("open", () => {
          socket.send(JSON.stringify({ type: "auth", token }));
        });
        socket.addEventListener("message", event => {
          let packet;
          try {
            packet = JSON.parse(event.data);
          } catch {
            showOnlineError("서버 응답을 읽을 수 없습니다.");
            return;
          }
          if (packet.type === "ready" && !settled) {
            settled = true;
            clearTimeout(timeout);
            onlineAuthenticated = true;
            onlineConnected = true;
            if (!packet.resumed && savedRoomCode()) {
              saveRoomCode("");
              onlineShouldReconnect = false;
              showOnlineError("이전에 진행하던 대전방이 만료되었습니다. 새 방을 만들거나 코드를 입력해주세요.");
            }
            resolve();
          } else {
            handleOnlinePacket(packet);
          }
        });
        socket.addEventListener("error", () => {
          if (!settled) {
            settled = true;
            clearTimeout(timeout);
            reject(new Error("온라인 게임 서버에 연결할 수 없습니다."));
          }
        });
        socket.addEventListener("close", event => {
          clearTimeout(timeout);
          if (!settled) {
            settled = true;
            reject(new Error("로그인 또는 온라인 서버 연결을 확인해주세요."));
          }
          if (onlineSocket === socket) {
            onlineSocket = null;
            onlineAuthenticated = false;
            onlineConnected = false;
            if (onlineState) {
              if (event.code === 1008) {
                onlineShouldReconnect = false;
                onlineState = null;
                saveRoomCode("");
                renderOnlineState();
                showOnlineError("로그인 세션이 만료되었습니다. 다시 로그인한 뒤 방 코드로 입장해주세요.");
                return;
              }
              renderOnlineState();
              scheduleOnlineReconnect();
            }
          }
        });
      }).finally(() => {
        onlineReadyPromise = null;
      });
      return onlineReadyPromise;
    }

    function sendOnline(packet) {
      if (onlineSocket?.readyState !== WebSocket.OPEN || !onlineAuthenticated) {
        showOnlineError("온라인 서버에 연결되지 않았습니다. 방에 다시 입장해주세요.");
        return;
      }
      onlineSocket.send(JSON.stringify(packet));
    }

    async function runOnlineAction(packet) {
      showOnlineError("온라인 게임 서버에 연결 중입니다...");
      try {
        await connectOnline();
        sendOnline(packet);
      } catch (error) {
        showOnlineError(error.message);
      }
    }

    function resumeOnlineRoom() {
      onlinePanelActive = true;
      if (!savedRoomCode() && !onlineState) {
        renderOnlineState();
        return;
      }
      if (!window.SAPAuth?.getToken()) {
        renderOnlineState();
        showOnlineError("이전 대전방에 다시 연결하려면 로그인해주세요.");
        return;
      }
      onlineShouldReconnect = true;
      onlineStatusEl.textContent = "이전 대전방에 다시 연결하는 중...";
      connectOnline().catch(error => {
        showOnlineError(error.message);
        scheduleOnlineReconnect();
      });
    }

    onlineCreateBtn.addEventListener("click", () => runOnlineAction({ type: "create" }));
    onlineJoinBtn.addEventListener("click", () => {
      runOnlineAction({ type: "join", roomCode: onlineRoomCodeEl.value });
    });
    onlineRoomCodeEl.addEventListener("input", () => {
      onlineRoomCodeEl.value = onlineRoomCodeEl.value.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, "").slice(0, 6);
    });
    onlineLeaveBtn.addEventListener("click", () => {
      onlineShouldReconnect = false;
      if (onlineRetryTimer !== null) clearTimeout(onlineRetryTimer);
      onlineRetryTimer = null;
      onlineState = null;
      saveRoomCode("");
      renderOnlineState();
      sendOnline({ type: "leave" });
    });
    onlineRematchBtn.addEventListener("click", () => sendOnline({ type: "rematch" }));
    onlineCopyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(onlineState.roomCode);
        showOnlineError("방 코드를 복사했습니다.");
      } catch {
        onlineRoomCodeEl.focus();
        onlineRoomCodeEl.select();
        showOnlineError("방 코드를 선택했습니다. 복사해서 상대에게 공유해주세요.");
      }
    });
    renderOnlineState();

    resetBtn.addEventListener("click", reset);
    registerGame("panel-ttt", {
      init() {
        reset();
        resumeOnlineRoom();
      },
      resume: resumeOnlineRoom,
      stop() {
        onlinePanelActive = false;
        if (onlineRetryTimer !== null) clearTimeout(onlineRetryTimer);
        onlineRetryTimer = null;
        if (computerTimer !== null) {
          clearTimeout(computerTimer);
          playComputer();
        }
        if (onlineSocket) {
          onlineSocket.close();
          onlineSocket = null;
          onlineAuthenticated = false;
          onlineConnected = false;
        }
      },
    });
  })();
