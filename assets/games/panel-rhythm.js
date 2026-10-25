  // ── STEP 60: 리듬 게임 ─────────────────────────
  (function () {
    const canvas = document.getElementById("rhythm-canvas");
    const ctx = canvas.getContext("2d");
    const scoreEl = document.getElementById("rhythm-score");
    const comboEl = document.getElementById("rhythm-combo");
    const accuracyEl = document.getElementById("rhythm-accuracy");
    const timeEl = document.getElementById("rhythm-time");
    const statusEl = document.getElementById("rhythm-status");
    const startBtn = document.getElementById("rhythm-start");
    const muteBtn = document.getElementById("rhythm-mute");
    const seedEl = document.getElementById("rhythm-seed");
    const multEl = document.getElementById("rhythm-mult");
    const replayBtn = document.getElementById("rhythm-replay");
    const levelSelect = document.getElementById("rhythm-level");
    const levelNameEl = document.getElementById("rhythm-level-name");
    const keyButtons = Array.from(document.querySelectorAll(".rhythm-key"));
    const KEYS = ["d", "f", "j", "k"];
    const LANE_COLORS = ["#48dbfb", "#1dd1a1", "#feca57", "#ff9ff3"];
    const W = canvas.width, H = canvas.height;
    const LANE_W = W / 4;
    const HIT_Y = H - 64;
    const TOP_Y = 34;
    let travel = 1500;
    const DURATION = 48000;
    const BAR_MS = 2000;
    const STEP_MS = BAR_MS / 16;
    // Level 1~6. 숫자가 높을수록 노트가 촘촘하고 빨리 떨어지며 판정이 엄격합니다.
    const LEVELS = {
      level1: {
        label: "Level 1",
        density: 2,
        travel: 1750,
        doubles: 0,
        triples: 0,
        offbeat: 0,
        windows: [
          { label: "PERFECT", ms: 65, score: 100 },
          { label: "GREAT", ms: 115, score: 70 },
          { label: "GOOD", ms: 170, score: 40 },
        ],
      },
      level2: {
        label: "Level 2",
        density: 3,
        travel: 1500,
        doubles: 0.06,
        triples: 0,
        offbeat: 1,
        windows: [
          { label: "PERFECT", ms: 55, score: 100 },
          { label: "GREAT", ms: 100, score: 70 },
          { label: "GOOD", ms: 150, score: 40 },
        ],
      },
      level3: {
        label: "Level 3",
        density: 4,
        travel: 1250,
        doubles: 0.12,
        triples: 0,
        offbeat: 2,
        windows: [
          { label: "PERFECT", ms: 45, score: 100 },
          { label: "GREAT", ms: 85, score: 70 },
          { label: "GOOD", ms: 130, score: 40 },
        ],
      },
      level4: {
        label: "Level 4",
        density: 5,
        travel: 1050,
        doubles: 0.2,
        triples: 0,
        offbeat: 3,
        windows: [
          { label: "PERFECT", ms: 38, score: 100 },
          { label: "GREAT", ms: 72, score: 70 },
          { label: "GOOD", ms: 110, score: 40 },
        ],
      },
      level5: {
        label: "Level 5",
        density: 6,
        travel: 950,
        doubles: 0.3,
        triples: 0.04,
        offbeat: 3,
        windows: [
          { label: "PERFECT", ms: 33, score: 100 },
          { label: "GREAT", ms: 62, score: 70 },
          { label: "GOOD", ms: 96, score: 40 },
        ],
      },
      level6: {
        label: "Level 6",
        density: 7,
        travel: 850,
        doubles: 0.4,
        triples: 0.1,
        offbeat: 3,
        windows: [
          { label: "PERFECT", ms: 28, score: 100 },
          { label: "GREAT", ms: 54, score: 70 },
          { label: "GOOD", ms: 84, score: 40 },
        ],
      },
    };
    const LEVEL_KEY = "sap-rhythm-level";
    // 예전 이름으로 저장된 값도 새 레벨로 이어 줍니다.
    const LEVEL_ALIASES = { easy: "level1", normal: "level2", hard: "level3", expert: "level4" };
    let level = "level2";
    let windows = LEVELS.level2.windows;
    let maxWindow = windows[windows.length - 1].ms;
    const SOUND_KEY = "sap-rhythm-sound";
    // 12초마다 한 단계씩 어려워지고, 배율도 함께 올라갑니다.
    const PHASE_MULT = [1, 1.5, 2, 3];
    const PHASE_BARS = [5, 6, 6, 5];
    const SCALES = {
      major: [0, 2, 4, 5, 7, 9, 11],
      minor: [0, 2, 3, 5, 7, 8, 10],
    };
    // I–V–vi–IV 같은 진행 중 하나를 골라 씁니다. 4마디가 한 바퀴입니다.
    const PROGRESSIONS = [
      [0, 7, 9, 5],
      [9, 5, 0, 7],
      [0, 5, 9, 7],
      [0, 9, 5, 7],
      [5, 0, 9, 7],
    ];
    const MINOR_DEGREES = [2, 4, 9];

    let notes, running, finished, rafId, startedAt;
    let score, combo, bestCombo, judged, quality, hitCount, totalNotes;
    let judgeLabel, judgeUntil, flashUntil, hitPulse, rings, keyTimers;
    let song, nextEvent = 0, audioCtx, audioOrigin = 0, masterGain, musicGain, noiseBuffer;
    let soundOn = readSound();
    let pendingSeed = seedFromHash();
    const scheduled = [];
    applyLevel(readLevel());

    function makeSeed() {
      return Math.floor((Date.now() + Math.random() * 100000) % 100000);
    }

    // 같은 시드를 넣으면 같은 곡이 나오는 작은 난수기입니다.
    function makeRng(seed) {
      let state = (seed >>> 0) + 0x9e3779b9;
      return function random() {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    function pick(rng, list) {
      return list[Math.floor(rng() * list.length)];
    }

    // 강박(1·2·3·4박)을 자주, 뒤로 갈수록 약박과 16분음을 섞습니다.
    function pickStep(rng, phase, aggression) {
      const strong = [0, 4, 8, 12];
      const weak = [2, 6, 10, 14];
      const pool = [...strong, ...strong, ...weak];
      if (phase >= 1 || aggression >= 1) pool.push(...weak);
      if (phase >= 2 || aggression >= 2) pool.push(1, 3, 5, 7, 9, 11, 13, 15);
      if (phase >= 3 || aggression >= 3) pool.push(...strong);
      return pick(rng, pool);
    }

    // 1번 마디부터 5·6·6·5마디씩 네 단계로 나눕니다.
    function phaseOfBar(bar) {
      let edge = 1;
      for (let phase = 0; phase < PHASE_BARS.length; phase++) {
        edge += PHASE_BARS[phase];
        if (bar < edge) return phase;
      }
      return PHASE_BARS.length - 1;
    }

    function phaseAt(time) {
      return phaseOfBar(Math.floor(time / BAR_MS));
    }

    // 시드로 곡을 만들고, 같은 이벤트에서 노트 차트까지 뽑습니다.
    function composeSong(seed, config) {
      const rng = makeRng(seed);
      const settings = config || LEVELS[level];
      const key = Math.floor(rng() * 12);
      const scale = rng() < 0.35 ? SCALES.minor : SCALES.major;
      const progression = pick(rng, PROGRESSIONS);
      const events = [];
      const chart = [];
      const add = (time, type, midi = 0, value = 0.3) => events.push({ time, type, midi, value });
      const addLead = (time, midi, lane) => {
        add(time, "lead", midi, 0.32);
        chart.push({ lane, time, midi, state: "pending" });
      };

      // 0마디는 카운트인입니다. 노트가 떨어지는 동안 박자를 잡아 줍니다.
      add(0, "kick");
      add(0, "bass", 36 + key, 0.55);
      add(BAR_MS / 2, "snare");
      add(BAR_MS / 2, "bass", 43 + key, 0.55);
      for (let step = 0; step < 16; step += 2) {
        add(step * STEP_MS, "hat", 0, step % 4 === 0 ? 0.09 : 0.055);
      }

      const outroBar = Math.floor(DURATION / BAR_MS) - 1;
      let previousPitch = 72 + key;
      let previousLane = -1;

      for (let bar = 1; bar < outroBar; bar++) {
        const start = bar * BAR_MS;
        const phase = phaseOfBar(bar);
        const degree = progression[(bar - 1) % progression.length];
        const root = 48 + key + degree;
        const third = root + (MINOR_DEGREES.includes(degree) ? 3 : 4);
        const chordTones = [root, third, root + 7, root + 12, third + 12];

        const bassSteps = phase >= 3 ? [0, 2, 4, 6, 8, 10, 12, 14]
          : phase >= 2 ? [0, 4, 6, 8, 12, 14]
          : [0, 4, 8, 12];
        bassSteps.forEach(step => add(start + step * STEP_MS, "bass", root - 12, 0.34));
        add(start, "pad", root + 12, 1.1);

        [0, 8].forEach(step => add(start + step * STEP_MS, "kick"));
        if (phase >= 2) add(start + 10 * STEP_MS, "kick");
        [4, 12].forEach(step => add(start + step * STEP_MS, "snare"));
        if (phase >= 3) add(start + 15 * STEP_MS, "snare");
        for (let step = 0; step < 16; step += 2) {
          add(start + step * STEP_MS, "hat", 0, step % 4 === 0 ? 0.06 : 0.04);
        }
        if (phase >= 3) {
          [1, 3, 5, 7, 9, 11, 13].forEach(step => add(start + step * STEP_MS, "hat", 0, 0.025));
        }

        const density = settings.density + phase + (rng() < 0.45 ? 1 : 0);
        const steps = [];
        for (let index = 0; index < density; index++) {
          const step = pickStep(rng, phase, settings.offbeat);
          if (!steps.includes(step)) steps.push(step);
        }
        steps.sort((a, b) => a - b);

        for (const step of steps) {
          const time = start + step * STEP_MS;
          const candidates = [];
          for (const tone of chordTones) {
            if (tone >= 60 && tone <= 86 && !candidates.includes(tone)) candidates.push(tone);
          }
          for (const interval of scale) {
            const midi = 60 + key + interval;
            if (midi >= 60 && midi <= 86 && !candidates.includes(midi)) candidates.push(midi);
          }
          candidates.sort((a, b) => Math.abs(a - previousPitch) - Math.abs(b - previousPitch));
          const target = pick(rng, candidates.slice(0, 3));
          previousPitch = target;

          let lane = Math.floor(rng() * 4);
          if (lane === previousLane) lane = (lane + 1 + Math.floor(rng() * 3)) % 4;
          previousLane = lane;
          addLead(time, target, lane);

          // 높은 레벨에서는 두 줄, 아주 높은 레벨에서는 세 줄 동시 노트도 나옵니다.
          if (phase >= 2 && rng() < settings.doubles) {
            const extraLane = (lane + 1 + Math.floor(rng() * 3)) % 4;
            addLead(time, target + (rng() < 0.5 ? 0 : 7), extraLane);
            if (phase >= 3 && rng() < (settings.triples || 0)) {
              const rest = [0, 1, 2, 3].filter(candidate => candidate !== lane && candidate !== extraLane);
              addLead(time, target + 12, rest[Math.floor(rng() * rest.length)]);
            }
          }
        }
      }

      const outro = outroBar * BAR_MS;
      add(outro, "kick");
      add(outro, "bass", 36 + key, 1.5);
      add(outro, "pad", 60 + key, 1.7);
      [0, 4, 7].forEach((interval, index) => addLead(outro + index * STEP_MS * 2, 60 + key + interval, [0, 2, 3][index]));

      events.sort((a, b) => a.time - b.time);
      chart.sort((a, b) => a.time - b.time);
      return { events, chart, seed };
    }

    function readLevel() {
      try {
        const saved = localStorage.getItem(LEVEL_KEY);
        if (saved && LEVELS[saved]) return saved;
        if (saved && LEVEL_ALIASES[saved]) return LEVEL_ALIASES[saved];
      } catch { /* 저장소를 못 읽어도 기본 난이도로 진행합니다. */ }
      return "level2";
    }

    function saveLevel(value) {
      try { localStorage.setItem(LEVEL_KEY, value); } catch { /* 저장할 수 없어도 재생은 계속합니다. */ }
    }

    function applyLevel(value) {
      level = LEVELS[value] ? value : "level2";
      const config = LEVELS[level];
      travel = config.travel;
      windows = config.windows;
      maxWindow = windows[windows.length - 1].ms;
      if (levelSelect) levelSelect.value = level;
      if (levelNameEl) levelNameEl.textContent = config.label;
    }

    // #panel-rhythm?seed=12345 처럼 공유 링크의 시드를 읽습니다.
    function seedFromHash() {
      const match = /(?:^|[?&])seed=(\d{1,6})/.exec(location.hash);
      return match ? Number(match[1]) : null;
    }

    function readSound() {
      try { return localStorage.getItem(SOUND_KEY) !== "off"; } catch { return true; }
    }

    function saveSound() {
      try { localStorage.setItem(SOUND_KEY, soundOn ? "on" : "off"); } catch { /* 저장할 수 없어도 재생은 계속합니다. */ }
    }

    function continueAudio() {
      if (!audioCtx) return false;
      if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
      return true;
    }

    function ensureAudio() {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return false;
      if (!audioCtx) {
        try {
          audioCtx = new AudioCtor();
          masterGain = audioCtx.createGain();
          masterGain.connect(audioCtx.destination);
          musicGain = audioCtx.createGain();
          musicGain.gain.value = 0.5;
          musicGain.connect(masterGain);
          applySound();
        } catch {
          audioCtx = null;
          return false;
        }
      }
      return continueAudio();
    }

    function applySound() {
      if (!audioCtx || !masterGain) return;
      const now = audioCtx.currentTime;
      masterGain.gain.cancelScheduledValues(now);
      masterGain.gain.setTargetAtTime(soundOn ? 0.8 : 0.0001, now, 0.04);
    }

    function refreshSoundButton() {
      muteBtn.textContent = soundOn ? "🔊 소리 켜짐" : "🔇 소리 꺼짐";
      muteBtn.setAttribute("aria-pressed", String(soundOn));
    }

    function midiToFreq(midi) {
      return 440 * Math.pow(2, (midi - 69) / 12);
    }

    function track(node) {
      scheduled.push(node);
      node.addEventListener("ended", () => {
        const index = scheduled.indexOf(node);
        if (index >= 0) scheduled.splice(index, 1);
      });
    }

    function tone(when, midi, length, type, level) {
      const hold = Math.max(0.08, length);
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(midiToFreq(midi), when);
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.exponentialRampToValueAtTime(level, when + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + hold);
      osc.connect(gain).connect(musicGain);
      osc.start(when);
      osc.stop(when + hold + 0.03);
      track(osc);
    }

    function noiseBurst(when, length, level, frequency, type) {
      if (!noiseBuffer) {
        const samples = Math.floor(audioCtx.sampleRate * 0.4);
        noiseBuffer = audioCtx.createBuffer(1, samples, audioCtx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < samples; i++) data[i] = Math.random() * 2 - 1;
      }
      const source = audioCtx.createBufferSource();
      const filter = audioCtx.createBiquadFilter();
      const gain = audioCtx.createGain();
      source.buffer = noiseBuffer;
      filter.type = type;
      filter.frequency.value = frequency;
      gain.gain.setValueAtTime(level, when);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + length);
      source.connect(filter).connect(gain).connect(musicGain);
      source.start(when);
      source.stop(when + length + 0.02);
      track(source);
    }

    function kick(when) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(160, when);
      osc.frequency.exponentialRampToValueAtTime(48, when + 0.14);
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.exponentialRampToValueAtTime(0.6, when + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.24);
      osc.connect(gain).connect(musicGain);
      osc.start(when);
      osc.stop(when + 0.26);
      track(osc);
    }

    function playEvent(event, when) {
      switch (event.type) {
        case "lead":
          tone(when, event.midi, event.value, "triangle", 0.18);
          tone(when, event.midi + 12, event.value * 0.5, "sine", 0.05);
          break;
        case "bass":
          tone(when, event.midi, event.value, "triangle", 0.2);
          tone(when, event.midi - 12, event.value, "sine", 0.08);
          break;
        case "pad":
          tone(when, event.midi, event.value, "sine", 0.05);
          tone(when, event.midi + 7, event.value, "sine", 0.04);
          break;
        case "kick":
          kick(when);
          break;
        case "snare":
          noiseBurst(when, 0.16, 0.16, 1800, "bandpass");
          break;
        case "hat":
          noiseBurst(when, 0.05, event.value, 7000, "highpass");
          break;
      }
    }

    function scheduleAudio(now) {
      if (!audioCtx || !song || audioCtx.state !== "running") return;
      const horizon = now + 450;
      while (nextEvent < song.events.length && song.events[nextEvent].time <= horizon) {
        const event = song.events[nextEvent++];
        if (!soundOn) continue;
        const when = audioOrigin + event.time / 1000;
        if (when < audioCtx.currentTime - 0.2) continue;
        playEvent(event, Math.max(when, audioCtx.currentTime + 0.005));
      }
    }

    function playHit(midi, level) {
      if (!audioCtx || !soundOn) return;
      tone(audioCtx.currentTime + 0.01, midi, 0.12, "sine", level);
    }

    function stopMusic() {
      nextEvent = song ? song.events.length : 0;
      const nodes = scheduled.splice(0);
      if (!nodes.length) return;
      // 소리를 바로 끊으면 딱딱 끊기는 소리가 나므로 아주 짧게 줄인 뒤 정지합니다.
      const at = audioCtx ? audioCtx.currentTime : 0;
      if (audioCtx && musicGain) {
        musicGain.gain.cancelScheduledValues(at);
        musicGain.gain.setTargetAtTime(0.0001, at, 0.02);
      }
      setTimeout(() => {
        nodes.forEach(node => { try { node.stop(); } catch { /* 이미 끝난 소리는 무시합니다. */ } });
        if (audioCtx && musicGain) {
          const now = audioCtx.currentTime;
          musicGain.gain.cancelScheduledValues(now);
          musicGain.gain.setTargetAtTime(0.5, now, 0.02);
        }
      }, 70);
    }

    function accuracy() {
      return judged ? Math.round((quality / judged) * 100) : 100;
    }

    function updateHud() {
      scoreEl.textContent = String(score);
      comboEl.textContent = String(combo);
      accuracyEl.textContent = `${accuracy()}%`;
    }

    function reset() {
      stopMusic();
      if (!song) song = composeSong(pendingSeed ?? makeSeed(), LEVELS[level]);
      notes = song.chart.map(note => ({ lane: note.lane, time: note.time, midi: note.midi, state: "pending" }));
      running = false;
      finished = false;
      score = 0;
      combo = 0;
      bestCombo = 0;
      judged = 0;
      quality = 0;
      hitCount = 0;
      totalNotes = notes.length;
      judgeLabel = "";
      judgeUntil = 0;
      flashUntil = [0, 0, 0, 0];
      hitPulse = [0, 0, 0, 0];
      rings = [];
      keyTimers = [0, 0, 0, 0];
      keyButtons.forEach(button => button.classList.remove("is-active"));
      keyButtons.forEach(button => { button.disabled = true; });
      timeEl.textContent = String(DURATION / 1000);
      seedEl.textContent = String(song.seed).padStart(5, "0");
      multEl.textContent = "x1";
      replayBtn.disabled = true;
      levelSelect.disabled = false;
      updateHud();
      draw(0);
    }

    function press(lane) {
      if (!running) return;
      const now = performance.now();
      const button = keyButtons[lane];
      if (button) {
        button.classList.add("is-active");
        clearTimeout(keyTimers[lane]);
        keyTimers[lane] = setTimeout(() => button.classList.remove("is-active"), 200);
      }
      flashUntil[lane] = now + 260;
      rings.push({ lane, at: now, hit: false });
      if (rings.length > 40) rings.shift();

      const chartTime = now - startedAt;
      let best = null;
      for (const note of notes) {
        if (note.lane !== lane || note.state !== "pending") continue;
        const delta = Math.abs(chartTime - note.time);
        if (delta > maxWindow) continue;
        if (!best || delta < best.delta) best = { note, delta };
      }
      if (!best) return;

      const judge = windows.find(entry => best.delta <= entry.ms);
      best.note.state = "hit";
      hitCount++;
      judged++;
      quality += judge.score / 100;
      const phase = phaseAt(best.note.time);
      score += Math.round((judge.score + Math.min(combo, 20) * 2) * PHASE_MULT[phase]);
      combo++;
      bestCombo = Math.max(bestCombo, combo);
      judgeLabel = judge.label;
      judgeUntil = now + 450;
      hitPulse[lane] = now + 300;
      rings.push({ lane, at: now, hit: true });
      playHit(best.note.midi ?? 72, judge.label === "PERFECT" ? 0.13 : 0.09);
      updateHud();
    }

    function missCheck(now) {
      for (const note of notes) {
        if (note.state !== "pending" || now <= note.time + maxWindow) continue;
        note.state = "miss";
        judged++;
        combo = 0;
        updateHud();
      }
    }

    function laneX(lane) {
      return lane * LANE_W;
    }

    function withAlpha(hex, alpha) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
    }

    function drawNote(lane, y, state) {
      const x = laneX(lane) + 10;
      const width = LANE_W - 20;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y - 9, width, 18, 8);
      else ctx.rect(x, y - 9, width, 18);
      ctx.fillStyle = state === "miss" ? "#4b5563" : LANE_COLORS[lane];
      ctx.fill();
      if (state !== "miss") {
        ctx.fillStyle = "rgba(255,255,255,.72)";
        ctx.fillRect(x + 6, y - 2, width - 12, 3);
      }
    }

    function draw(now) {
      const time = performance.now();
      const background = ctx.createLinearGradient(0, 0, 0, H);
      background.addColorStop(0, "#111827");
      background.addColorStop(1, "#0b1020");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, W, H);

      for (let lane = 0; lane < 4; lane++) {
        ctx.fillStyle = lane % 2 ? "rgba(255,255,255,.045)" : "rgba(255,255,255,.025)";
        ctx.fillRect(laneX(lane), 0, LANE_W, H);
        ctx.strokeStyle = "rgba(255,255,255,.12)";
        ctx.beginPath();
        ctx.moveTo(laneX(lane), 0);
        ctx.lineTo(laneX(lane), H);
        ctx.stroke();
      }

      // 누른 줄은 판정선까지 빛기둥이 올라와 입력이 한눈에 보입니다.
      for (let lane = 0; lane < 4; lane++) {
        const flash = Math.max(0, flashUntil[lane] - time) / 260;
        const pulse = Math.max(0, hitPulse[lane] - time) / 300;
        if (flash <= 0 && pulse <= 0) continue;
        const beam = ctx.createLinearGradient(0, HIT_Y - 200, 0, HIT_Y);
        beam.addColorStop(0, withAlpha(LANE_COLORS[lane], 0));
        beam.addColorStop(0.6, withAlpha(LANE_COLORS[lane], 0.14 * flash + 0.16 * pulse));
        beam.addColorStop(1, withAlpha(LANE_COLORS[lane], 0.4 * flash + 0.4 * pulse));
        ctx.fillStyle = beam;
        ctx.fillRect(laneX(lane) + 2, HIT_Y - 200, LANE_W - 4, 200);
      }

      // 마디마다 옅은 선을 그려 음악의 흐름을 읽기 쉽게 합니다.
      ctx.strokeStyle = "rgba(255,255,255,.10)";
      ctx.lineWidth = 1;
      for (let bar = BAR_MS; bar < DURATION; bar += BAR_MS) {
        const y = HIT_Y - ((bar - now) / travel) * (HIT_Y - TOP_Y);
        if (y < TOP_Y || y > HIT_Y) continue;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      ctx.strokeStyle = "rgba(255,255,255,.22)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, HIT_Y);
      ctx.lineTo(W, HIT_Y);
      ctx.stroke();

      for (const note of notes) {
        if (note.state === "hit") continue;
        const y = HIT_Y - ((note.time - now) / travel) * (HIT_Y - TOP_Y);
        if (y < TOP_Y - 30 || y > HIT_Y + 34) continue;
        drawNote(note.lane, y, note.state);
      }

      // 입력할 때 판정선에서 퍼지는 링입니다.
      for (const ring of rings) {
        const age = (time - ring.at) / 340;
        if (age < 0 || age > 1) continue;
        const radius = 10 + age * 46;
        ctx.beginPath();
        ctx.arc(laneX(ring.lane) + LANE_W / 2, HIT_Y, radius, 0, Math.PI * 2);
        if (ring.hit) {
          ctx.fillStyle = withAlpha(LANE_COLORS[ring.lane], (1 - age) * 0.2);
          ctx.fill();
        }
        ctx.strokeStyle = withAlpha(ring.hit ? "#ffffff" : LANE_COLORS[ring.lane], (1 - age) * (ring.hit ? 0.95 : 0.7));
        ctx.lineWidth = Math.max(1, 5 * (1 - age));
        ctx.stroke();
      }
      rings = rings.filter(ring => time - ring.at < 360);

      ctx.textAlign = "center";
      for (let lane = 0; lane < 4; lane++) {
        const flash = Math.max(0, flashUntil[lane] - time) / 260;
        const pulse = Math.max(0, hitPulse[lane] - time) / 300;
        const glow = Math.max(flash, pulse);
        ctx.save();
        if (glow > 0) {
          ctx.shadowColor = LANE_COLORS[lane];
          ctx.shadowBlur = 20 * glow;
        }
        ctx.fillStyle = glow > 0 ? withAlpha(LANE_COLORS[lane], 0.45 + 0.55 * glow) : "rgba(255,255,255,.16)";
        ctx.fillRect(laneX(lane) + 8, HIT_Y + 4, LANE_W - 16, 8);
        ctx.restore();
        ctx.fillStyle = glow > 0 ? "#ffffff" : LANE_COLORS[lane];
        ctx.font = `700 ${glow > 0 ? 18 : 16}px ui-monospace, monospace`;
        ctx.fillText(KEYS[lane].toUpperCase(), laneX(lane) + LANE_W / 2, HIT_Y + 36);
      }

      if (judgeUntil > time && judgeLabel) {
        ctx.fillStyle = judgeLabel === "PERFECT" ? "#7dd3fc" : judgeLabel === "GREAT" ? "#86efac" : "#fde68a";
        ctx.font = "800 26px ui-monospace, monospace";
        ctx.fillText(judgeLabel, W / 2, HIT_Y - 52);
      }

      // 첫 마디는 카운트인입니다. 남은 박자를 큰 숫자로 보여 줍니다.
      if (running && now < BAR_MS) {
        const count = Math.min(4, Math.max(1, Math.ceil((BAR_MS - now) / (BAR_MS / 4))));
        ctx.save();
        ctx.textAlign = "center";
        ctx.fillStyle = "#e2e8f0";
        ctx.font = "800 64px ui-monospace, monospace";
        ctx.fillText(String(count), W / 2, H / 2 - 6);
        ctx.fillStyle = "rgba(226,232,240,.7)";
        ctx.font = "600 15px sans-serif";
        ctx.fillText("곧 시작합니다", W / 2, H / 2 + 30);
        ctx.restore();
      }

      if (!running) {
        ctx.fillStyle = "rgba(226,232,240,.86)";
        ctx.font = "600 17px sans-serif";
        ctx.fillText(finished ? "결과가 아래에 표시됩니다" : "시작 버튼을 눌러주세요", W / 2, H / 2);
      }
      ctx.textAlign = "left";
    }

    function finish() {
      running = false;
      cancelAnimationFrame(rafId);
      keyButtons.forEach(button => { button.disabled = true; });
      finished = true;
      timeEl.textContent = "0";
      draw(DURATION);
      statusEl.textContent = `점수 ${score} · 최고 콤보 ${bestCombo} · 정확도 ${accuracy()}% · 맞힘 ${hitCount}/${totalNotes} · 시드 ${String(song.seed).padStart(5, "0")}`;
      replayBtn.disabled = false;
      levelSelect.disabled = false;
      if (score > 0) window.reportScore?.("panel-rhythm", score);
    }

    function loop() {
      if (!running) return;
      const now = performance.now() - startedAt;
      scheduleAudio(now);
      missCheck(now);
      const left = Math.ceil((DURATION - now) / 1000);
      multEl.textContent = "x" + PHASE_MULT[phaseAt(Math.max(0, now))];
      timeEl.textContent = String(Math.max(0, Math.min(DURATION / 1000, left)));
      updateHud();
      draw(now);
      if (now >= DURATION) {
        finish();
        return;
      }
      rafId = requestAnimationFrame(loop);
    }

    function stop() {
      running = false;
      cancelAnimationFrame(rafId);
      stopMusic();
      keyButtons.forEach(button => { button.classList.remove("is-active"); });
      keyButtons.forEach(button => { button.disabled = true; });
      if (!finished) {
        reset();
        statusEl.textContent = "시작 버튼을 눌러주세요.";
      }
    }

    function start(seed) {
      const chosen = seed ?? pendingSeed ?? makeSeed();
      pendingSeed = null;
      song = composeSong(chosen, LEVELS[level]);
      reset();
      history.replaceState(null, "", `#panel-rhythm?seed=${song.seed}`);
      const ready = ensureAudio();
      if (ready) {
        const offset = 0.12;
        startedAt = performance.now() + offset * 1000;
        audioOrigin = audioCtx.currentTime + offset;
        nextEvent = 0;
      } else {
        startedAt = performance.now();
        audioOrigin = 0;
      }
      running = true;
      levelSelect.disabled = true;
      keyButtons.forEach(button => { button.disabled = false; });
      const label = String(song.seed).padStart(5, "0");
      statusEl.textContent = ready && soundOn
        ? `시드 ${label} · ${LEVELS[level].label} · D F J K 키로 노트를 맞추세요. 음악에 맞춰 누르면 좋습니다.`
        : `시드 ${label} · ${LEVELS[level].label} · D F J K 키로 노트를 맞추세요.`;
      rafId = requestAnimationFrame(loop);
    }

    function toggleSound() {
      soundOn = !soundOn;
      saveSound();
      refreshSoundButton();
      if (soundOn) ensureAudio();
      applySound();
      if (running) statusEl.textContent = soundOn ? "소리를 켰습니다." : "소리를 껐습니다.";
    }

    startBtn.addEventListener("click", () => start());
    replayBtn.addEventListener("click", () => start(song ? song.seed : undefined));
    muteBtn.addEventListener("click", toggleSound);
    levelSelect.addEventListener("change", () => {
      if (running) {
        levelSelect.value = level;
        return;
      }
      applyLevel(levelSelect.value);
      saveLevel(level);
      song = composeSong(pendingSeed ?? makeSeed(), LEVELS[level]);
      reset();
      statusEl.textContent = `${LEVELS[level].label} 난이도로 준비했습니다. 시작 버튼을 눌러주세요.`;
      window.refreshGameLeaderboard?.("panel-rhythm");
    });
    refreshSoundButton();
    document.addEventListener("keydown", event => {
      if (!running || event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      const lane = KEYS.indexOf(event.key.toLowerCase());
      if (lane < 0) return;
      event.preventDefault();
      press(lane);
    });
    keyButtons.forEach((button, lane) => {
      button.addEventListener("pointerdown", event => {
        event.preventDefault();
        press(lane);
      });
      button.addEventListener("click", event => {
        if (event.detail === 0) press(lane);
      });
    });

    // 같은 탭에서 공유 링크(#panel-rhythm?seed=...)로 이동해도 곡을 다시 불러옵니다.
    window.addEventListener("hashchange", () => {
      const seed = seedFromHash();
      if (running || seed === null) return;
      pendingSeed = seed;
      song = composeSong(seed, LEVELS[level]);
      reset();
      statusEl.textContent = `시드 ${String(seed).padStart(5, "0")} 곡을 불러왔습니다. 시작 버튼을 눌러주세요.`;
    });

    registerGame("panel-rhythm", { init: reset, stop });
  })();
