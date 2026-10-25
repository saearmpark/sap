  (function () {
    const words = [
      "사과", "과자", "자동차", "차표", "표범", "범인", "인형", "형광등", "등산", "산책",
      "책상", "상자", "자전거", "거미", "미술", "술잔", "잔디", "디지털", "털실", "실내",
      "내일", "일기", "기차", "차례", "예절", "절구", "구름", "나무", "무지개", "개나리",
      "리본", "본부", "부엌", "억울", "울타리", "리듬", "음악", "악기", "기린", "린스",
      "스키", "기름", "차도", "도서관", "관광", "광장", "장미", "미소", "소나무",
      "무지", "지구", "구두", "두부", "부자", "자연", "연필", "필통", "통장", "장갑",
      "갑옷", "옷장", "장난감", "감자", "자석", "석탄", "탄산", "산소", "소금", "금요일",
      "일요일", "돈가스", "스마트폰", "폰트", "트럭", "럭비", "비누", "누나",
      "나비", "비행기", "기차역", "역사", "사람", "보석", "석류", "유리", "리모컨",
    ];
    const form = document.getElementById("word-chain-form");
    const input = document.getElementById("word-chain-input");
    const historyEl = document.getElementById("word-chain-history");
    const statusEl = document.getElementById("word-chain-status");
    const dictionaryLink = document.getElementById("word-chain-dictionary-link");
    let used = new Set();
    let current = "";
    let finished = false;

    function normalizeWord(value) {
      return value.trim().replace(/\s+/g, "");
    }
    function firstLetter(word) {
      return [...word].find(character => /\p{L}/u.test(character)) || "";
    }
    function lastLetter(word) {
      return [...word].reverse().find(character => /\p{L}/u.test(character)) || "";
    }
    function addWord(word, speaker) {
      const item = document.createElement("li");
      item.textContent = `${speaker}: ${word}`;
      historyEl.appendChild(item);
      used.add(word);
      current = word;
    }
    function reset() {
      used = new Set();
      current = "";
      finished = false;
      input.disabled = false;
      form.querySelector("button").disabled = false;
      input.value = "";
      historyEl.replaceChildren();
      statusEl.textContent = "차례의 첫 글자에 맞는 단어를 입력하세요. 잘못된 단어(형식 오류·중복·첫 글자 불일치·이어가기 불가)를 말하면 패배합니다.";
      dictionaryLink.href = "https://dict.naver.com/";
      input.focus();
    }
    function lose(message) {
      finished = true;
      statusEl.textContent = `${message} 내가 졌습니다. 다시 하려면 새 게임을 누르세요.`;
      input.disabled = true;
      form.querySelector("button").disabled = true;
    }
    input.addEventListener("input", () => {
      const word = normalizeWord(input.value);
      dictionaryLink.href = word
        ? `https://dict.naver.com/dict.search?query=${encodeURIComponent(word)}&target=dic&ie=utf8`
        : "https://dict.naver.com/";
    });
    form.addEventListener("submit", event => {
      event.preventDefault();
      if (finished) return;
      const word = normalizeWord(input.value);
      if (!word) {
        statusEl.textContent = "단어를 입력하세요.";
        input.select();
        return;
      }
      if (!/^[\p{L}\p{M}\p{N}·'’\-]+$/u.test(word) || !/\p{L}/u.test(word)) {
        lose(`“${input.value.trim()}”는 올바른 단어가 아닙니다.`);
        return;
      }
      if (used.has(word)) {
        lose(`이미 나온 단어 “${word}”를 말했습니다.`);
        return;
      }
      const requiredLetter = lastLetter(current);
      if (current && !word.startsWith(requiredLetter)) {
        lose(`“${requiredLetter}”로 시작하는 단어를 말해야 합니다(“${word}”).`);
        return;
      }
      addWord(word, "나");
      const endingLetter = lastLetter(word);
      const replies = words.filter(candidate => !used.has(candidate) && firstLetter(candidate) === endingLetter);
      if (!replies.length) {
        lose(`“${word}”는 “${endingLetter}”로 이어갈 단어가 없어 이어가기가 불가능합니다.`);
        return;
      }
      const reply = replies[Math.floor(Math.random() * replies.length)];
      addWord(reply, "컴퓨터");
      statusEl.textContent = `컴퓨터가 “${reply}”라고 했어요. “${lastLetter(reply)}”로 시작하는 단어를 입력하세요.`;
      input.value = "";
      input.focus();
    });
    document.getElementById("word-chain-reset").addEventListener("click", reset);
    registerGame("panel-word-chain", { init: reset, stop() {} });
  })();
