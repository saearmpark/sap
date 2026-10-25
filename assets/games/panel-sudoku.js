  // ── STEP 12: 스도쿠 ─────────────────────────────
  (function () {
    const boardEl = document.getElementById("sudoku-board");
    const statusEl = document.getElementById("sudoku-status");
    const difficultyEl = document.getElementById("sudoku-difficulty");
    const newBtn = document.getElementById("sudoku-new");
    const checkBtn = document.getElementById("sudoku-check");
    const clearBtn = document.getElementById("sudoku-clear");
    const notesToggleBtn = document.getElementById("sudoku-notes-toggle");
    const numberPadEl = document.getElementById("sudoku-number-pad");
    const progressListEl = document.getElementById("sudoku-progress-list");
    const timerEl = document.getElementById("sudoku-timer");
    const FULL_MASK = 1022; // 비트 1~9를 사용합니다.
    let solution = [];
    let puzzle = [];
    let inputs = [];
    let noteLayers = [];
    let notes = [];
    let progressMarkers = [];
    let selectedIndex = 40;
    let incorrect = new Set();
    let notesMode = false;
    let startedAt = Date.now();
    let completedSeconds = null;
    let scoreReported = false;
    let timerHandle = 0;
    let pausedAt = 0;

    function elapsedSeconds() {
      return completedSeconds ?? Math.floor((Date.now() - startedAt) / 1000);
    }

    function formatTime(totalSeconds) {
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      const mmss = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
      return hours ? `${String(hours).padStart(2, "0")}:${mmss}` : mmss;
    }

    function updateTimer() {
      timerEl.textContent = `경과 시간: ${formatTime(elapsedSeconds())}${completedSeconds !== null ? " · 완료" : ""}`;
    }

    function startTimer() {
      clearInterval(timerHandle);
      timerHandle = setInterval(updateTimer, 1000);
    }

    function stopTimer() {
      clearInterval(timerHandle);
      timerHandle = 0;
    }

    function shuffle(items) {
      for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
      }
      return items;
    }

    function createSolution() {
      const bands = shuffle([0, 1, 2]);
      const stacks = shuffle([0, 1, 2]);
      const rows = bands.flatMap(band => shuffle([0, 1, 2]).map(row => band * 3 + row));
      const cols = stacks.flatMap(stack => shuffle([0, 1, 2]).map(col => stack * 3 + col));
      const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      const pattern = (row, col) => (row * 3 + Math.floor(row / 3) + col) % 9;
      return rows.map(row => cols.map(col => digits[pattern(row, col)]));
    }

    function countSolutions(cells, limit = 2) {
      const rows = Array(9).fill(0);
      const cols = Array(9).fill(0);
      const boxes = Array(9).fill(0);

      for (let index = 0; index < 81; index++) {
        const value = cells[index];
        if (!value) continue;
        const row = Math.floor(index / 9), col = index % 9;
        const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);
        const bit = 1 << value;
        if ((rows[row] & bit) || (cols[col] & bit) || (boxes[box] & bit)) return 0;
        rows[row] |= bit;
        cols[col] |= bit;
        boxes[box] |= bit;
      }

      let solutions = 0;
      function search() {
        if (solutions >= limit) return;
        let bestIndex = -1, bestOptions = 0, bestCount = 10;
        for (let index = 0; index < 81; index++) {
          if (cells[index]) continue;
          const row = Math.floor(index / 9), col = index % 9;
          const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);
          const options = FULL_MASK & ~(rows[row] | cols[col] | boxes[box]);
          let count = 0;
          for (let bits = options; bits; bits &= bits - 1) count++;
          if (count === 0) return;
          if (count < bestCount) {
            bestIndex = index;
            bestOptions = options;
            bestCount = count;
            if (count === 1) break;
          }
        }
        if (bestIndex === -1) {
          solutions++;
          return;
        }

        const row = Math.floor(bestIndex / 9), col = bestIndex % 9;
        const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);
        for (let bits = bestOptions; bits && solutions < limit; bits &= bits - 1) {
          const bit = bits & -bits;
          let value = 1;
          while ((1 << value) !== bit) value++;
          cells[bestIndex] = value;
          rows[row] |= bit;
          cols[col] |= bit;
          boxes[box] |= bit;
          search();
          cells[bestIndex] = 0;
          rows[row] &= ~bit;
          cols[col] &= ~bit;
          boxes[box] &= ~bit;
        }
      }

      search();
      return solutions;
    }

    function findConflicts(values = inputs.map(input => Number(input.value) || 0)) {
      const conflicts = new Set();
      for (let a = 0; a < 81; a++) {
        if (!values[a]) continue;
        const rowA = Math.floor(a / 9), colA = a % 9;
        for (let b = a + 1; b < 81; b++) {
          if (values[a] !== values[b]) continue;
          const rowB = Math.floor(b / 9), colB = b % 9;
          const sameBox = Math.floor(rowA / 3) === Math.floor(rowB / 3)
            && Math.floor(colA / 3) === Math.floor(colB / 3);
          if (rowA === rowB || colA === colB || sameBox) {
            conflicts.add(a);
            conflicts.add(b);
          }
        }
      }
      return conflicts;
    }

    function refreshHighlights() {
      const values = inputs.map(input => Number(input.value) || 0);
      const conflicts = findConflicts(values);
      const selectedRow = Math.floor(selectedIndex / 9), selectedCol = selectedIndex % 9;
      const selectedValue = inputs[selectedIndex]?.value;
      progressMarkers.forEach((marker, index) => {
        const digit = index + 1;
        const positions = [];
        values.forEach((value, cellIndex) => { if (value === digit) positions.push(cellIndex); });
        const complete = positions.length === 9 && positions.every(cellIndex => !conflicts.has(cellIndex));
        marker.classList.toggle("is-complete", complete);
        marker.textContent = complete ? `✓ ${digit}` : String(digit);
        marker.setAttribute("aria-label", `숫자 ${digit} ${complete ? "완료" : "미완료"}`);
      });
      inputs.forEach((input, index) => {
        const row = Math.floor(index / 9), col = index % 9;
        const sameBox = Math.floor(row / 3) === Math.floor(selectedRow / 3)
          && Math.floor(col / 3) === Math.floor(selectedCol / 3);
        input.classList.toggle("is-selected", index === selectedIndex);
        input.classList.toggle("is-peer", row === selectedRow || col === selectedCol || sameBox);
        input.classList.toggle("is-same", Boolean(selectedValue) && input.value === selectedValue);
        input.classList.toggle("is-error", conflicts.has(index));
        input.classList.toggle("is-incorrect", incorrect.has(index));
        const noteLayer = noteLayers[index];
        if (noteLayer) {
          noteLayer.hidden = Boolean(input.value) || input.readOnly;
          Array.from(noteLayer.children).forEach((slot, slotIndex) => {
            slot.textContent = notes[index]?.has(slotIndex + 1) ? String(slotIndex + 1) : "";
          });
          const cellLabel = `${Math.floor(index / 9) + 1}행 ${index % 9 + 1}열`;
          const noteLabel = notes[index]?.size ? `, 가상 숫자 ${Array.from(notes[index]).join(", ")}` : "";
          input.setAttribute("aria-label", input.readOnly
            ? `${cellLabel}, 고정 숫자 ${input.value}`
            : `${cellLabel}${noteLabel}`);
        }
      });
    }

    function renderBoard() {
      boardEl.replaceChildren();
      inputs = [];
      noteLayers = [];
      for (let index = 0; index < 81; index++) {
        const row = Math.floor(index / 9), col = index % 9;
        const cell = document.createElement("div");
        cell.className = "sudoku-cell-wrap";
        cell.dataset.row = row;
        cell.dataset.col = col;
        if (col === 8) cell.style.borderRight = "0";
        if (row === 8) cell.style.borderBottom = "0";
        const input = document.createElement("input");
        input.type = "text";
        input.inputMode = "numeric";
        input.maxLength = 1;
        input.autocomplete = "off";
        input.className = "sudoku-cell";
        input.dataset.row = row;
        input.dataset.col = col;
        input.setAttribute("role", "gridcell");
        input.setAttribute("aria-label", `${row + 1}행 ${col + 1}열`);
        if (puzzle[index]) {
          input.value = puzzle[index];
          input.readOnly = true;
          input.classList.add("is-given");
          input.setAttribute("aria-label", `${row + 1}행 ${col + 1}열, 고정 숫자 ${puzzle[index]}`);
        }
        input.addEventListener("focus", () => {
          selectedIndex = index;
          refreshHighlights();
        });
        input.addEventListener("input", () => {
          const digit = input.value.replace(/[^1-9]/g, "").slice(-1);
          if (notesMode) {
            input.value = "";
            if (digit) toggleNote(index, Number(digit));
            return;
          }
          input.value = digit;
          notes[index].clear();
          incorrect.clear();
          statusEl.textContent = "입력했습니다. 정답 확인을 눌러보세요.";
          refreshHighlights();
          finishIfSolved();
        });
        input.addEventListener("keydown", event => {
          if (notesMode && /^[1-9]$/.test(event.key)) {
            event.preventDefault();
            toggleNote(index, Number(event.key));
            return;
          }
          const moves = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 };
          if (!(event.key in moves)) return;
          event.preventDefault();
          const next = Math.max(0, Math.min(80, index + moves[event.key]));
          inputs[next]?.focus();
        });
        const noteLayer = document.createElement("span");
        noteLayer.className = "sudoku-notes";
        noteLayer.setAttribute("aria-hidden", "true");
        for (let digit = 1; digit <= 9; digit++) noteLayer.appendChild(document.createElement("span"));
        inputs.push(input);
        noteLayers.push(noteLayer);
        cell.append(input, noteLayer);
        boardEl.appendChild(cell);
      }
      refreshHighlights();
    }

    function toggleNote(index, digit) {
      const input = inputs[index];
      if (!input || input.readOnly || input.value) {
        statusEl.textContent = "가상 숫자는 비어 있는 칸에만 기록할 수 있습니다.";
        return;
      }
      if (notes[index].has(digit)) notes[index].delete(digit);
      else notes[index].add(digit);
      incorrect.clear();
      statusEl.textContent = `선택한 칸의 가상 숫자 ${digit}을 ${notes[index].has(digit) ? "추가" : "삭제"}했습니다.`;
      refreshHighlights();
    }

    function enterDigit(digit) {
      if (!inputs.length) {
        statusEl.textContent = "새 게임을 먼저 시작하세요.";
        return;
      }
      if (notesMode) {
        toggleNote(selectedIndex, digit);
        return;
      }
      const input = inputs[selectedIndex];
      if (!input || input.readOnly) {
        statusEl.textContent = "숫자를 입력할 빈칸을 선택해주세요.";
        return;
      }
      input.value = String(digit);
      notes[selectedIndex].clear();
      incorrect.clear();
      statusEl.textContent = "입력했습니다. 정답 확인을 눌러보세요.";
      refreshHighlights();
      finishIfSolved();
    }

    function newPuzzle() {
      startedAt = Date.now();
      completedSeconds = null;
      scoreReported = false;
      pausedAt = 0;
      updateTimer();
      startTimer();
      solution = createSolution().flat();
      puzzle = solution.flat();
      notes = Array.from({ length: 81 }, () => new Set());
      const targets = { easy: 34, medium: 45, hard: 52 };
      const targetBlanks = targets[difficultyEl.value] || targets.medium;
      let blanks = 0;
      for (const index of shuffle(Array.from({ length: 81 }, (_, i) => i))) {
        if (blanks >= targetBlanks) break;
        const candidate = puzzle.slice();
        candidate[index] = 0;
        if (countSolutions(candidate, 2) === 1) {
          puzzle = candidate;
          blanks++;
        }
      }
      selectedIndex = puzzle.findIndex(value => value === 0);
      if (selectedIndex < 0) selectedIndex = 40;
      incorrect.clear();
      notesMode = false;
      notesToggleBtn.setAttribute("aria-pressed", "false");
      notesToggleBtn.textContent = "가상 숫자 모드: 끔";
      renderBoard();
      statusEl.textContent = `새 스도쿠를 시작합니다. 빈칸 ${blanks}개 · 난이도 ${difficultyEl.options[difficultyEl.selectedIndex].text}`;
    }

    function checkPuzzle() {
      const conflicts = findConflicts();
      if (conflicts.size) {
        incorrect.clear();
        statusEl.textContent = "같은 행·열·3×3 상자에 중복된 숫자가 있습니다.";
        refreshHighlights();
        return;
      }
      incorrect = new Set(inputs.reduce((found, input, index) => {
        if (input.value && Number(input.value) !== solution[index]) found.push(index);
        return found;
      }, []));
      const emptyCount = inputs.filter(input => !input.value).length;
      if (incorrect.size) {
        statusEl.textContent = `정답과 다른 숫자가 ${incorrect.size}개 있습니다. 표시된 칸을 확인하세요.`;
      } else if (emptyCount) {
        statusEl.textContent = `좋습니다! 빈칸 ${emptyCount}개가 남았습니다.`;
      } else {
        completedSeconds = elapsedSeconds();
        statusEl.textContent = `축하합니다! ${formatTime(completedSeconds)} 만에 스도쿠를 완성했습니다.`;
        updateTimer();
        reportSudoku();
      }
      refreshHighlights();
    }

    function finishIfSolved() {
      if (completedSeconds !== null || inputs.some(input => !input.value)) return;
      if (!inputs.every((input, index) => Number(input.value) === solution[index])) return;
      completedSeconds = elapsedSeconds();
      statusEl.textContent = `축하합니다! ${formatTime(completedSeconds)} 만에 스도쿠를 완성했습니다.`;
      updateTimer();
      reportSudoku();
    }

    function reportSudoku() {
      if (scoreReported) return;
      scoreReported = true;
      const factor = { easy: 1, medium: 1.5, hard: 2 }[difficultyEl.value] || 1;
      window.reportScore?.("panel-sudoku", Math.max(1, Math.round((3000 - completedSeconds) * factor)));
    }

    newBtn.addEventListener("click", newPuzzle);
    checkBtn.addEventListener("click", checkPuzzle);
    clearBtn.addEventListener("click", () => {
      const input = inputs[selectedIndex];
      if (!input || input.readOnly) {
        statusEl.textContent = "숫자가 입력된 빈칸을 선택해주세요.";
        return;
      }
      input.value = "";
      notes[selectedIndex].clear();
      incorrect.clear();
      statusEl.textContent = "선택한 칸을 비웠습니다.";
      refreshHighlights();
      input.focus({ preventScroll: true });
    });

    notesToggleBtn.addEventListener("click", () => {
      notesMode = !notesMode;
      notesToggleBtn.setAttribute("aria-pressed", String(notesMode));
      notesToggleBtn.textContent = `가상 숫자 모드: ${notesMode ? "켬" : "끔"}`;
      statusEl.textContent = notesMode
        ? "가상 숫자 모드입니다. 빈 칸을 선택한 뒤 숫자를 입력해 후보를 기록하세요."
        : "일반 입력 모드입니다. 숫자를 입력해 답을 채우세요.";
    });

    for (let digit = 1; digit <= 9; digit++) {
      const marker = document.createElement("span");
      marker.className = "sudoku-progress-digit";
      marker.textContent = String(digit);
      progressMarkers.push(marker);
      progressListEl.appendChild(marker);

      const key = document.createElement("button");
      key.className = "sudoku-button";
      key.type = "button";
      key.textContent = String(digit);
      key.setAttribute("aria-label", `숫자 ${digit} 입력`);
      key.addEventListener("click", () => enterDigit(digit));
      numberPadEl.appendChild(key);
    }

    registerGame("panel-sudoku", {
      init: newPuzzle,
      resume() {
        if (pausedAt) {
          startedAt += Date.now() - pausedAt;
          pausedAt = 0;
        }
        if (completedSeconds === null) startTimer();
        else updateTimer();
      },
      stop() {
        stopTimer();
        if (completedSeconds === null) pausedAt = Date.now();
      },
    });
  })();
