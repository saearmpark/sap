/* 의존성 없이 Chrome DevTools Protocol로 핵심 페이지를 확인하는 스모크 테스트. */
import { createServer } from "node:http";
import { createReadStream, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join, normalize, resolve } from "node:path";
import { spawn } from "node:child_process";

const root = resolve(process.cwd());
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml"
};
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const failures = [];
let pageErrors = [];

function check(condition, message, detail = "") {
  if (condition) {
    console.log(`  ok - ${message}`);
  } else {
    failures.push(message);
    console.log(`  fail - ${message}${detail ? ` (${detail})` : ""}`);
  }
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser"
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate));
}

const server = createServer((request, response) => {
  const urlPath = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
  const relative = urlPath === "/" ? "index.html" : urlPath.replace(/^\/+/, "");
  const file = normalize(join(root, relative));
  const missing = !file.startsWith(root) || !existsSync(file) || !extname(file);
  if (missing) {
    const fallback = join(root, "404.html");
    if (!existsSync(fallback)) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }
    response.writeHead(404, { "Content-Type": types[".html"], "Cache-Control": "no-store" });
    createReadStream(fallback).pipe(response);
    return;
  }
  response.writeHead(200, {
    "Content-Type": types[extname(file)] || "application/octet-stream",
    "Cache-Control": "no-store",
    "Service-Worker-Allowed": "/"
  });
  createReadStream(file).pipe(response);
});

const chromePath = findChrome();
if (!chromePath) {
  console.error("Chrome/Chromium을 찾지 못했습니다. CHROME_PATH 환경변수를 지정하세요.");
  process.exit(1);
}

await new Promise((done) => server.listen(0, "127.0.0.1", done));
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;
const profile = mkdtempSync(join(tmpdir(), "sap-smoke-"));
let socket;
let chrome;

try {
  chrome = spawn(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--no-first-run",
    "--no-default-browser-check",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "about:blank"
  ], { stdio: "ignore" });

  const devtoolsFile = join(profile, "DevToolsActivePort");
  let devtoolsPort = 0;
  for (let i = 0; i < 100; i++) {
    if (existsSync(devtoolsFile)) {
      try {
        const firstLine = readFileSync(devtoolsFile, "utf8").split(/\r?\n/)[0];
        devtoolsPort = Number(firstLine);
      } catch {
        devtoolsPort = 0;
      }
      if (devtoolsPort) break;
    }
    await sleep(100);
  }
  if (!devtoolsPort) throw new Error("Chrome DevTools 포트를 찾지 못했습니다.");

  const targets = await (await fetch(`http://127.0.0.1:${devtoolsPort}/json/list`)).json();
  const target = targets.find((item) => item.type === "page");
  if (!target) throw new Error("브라우저 페이지 대상을 찾지 못했습니다.");

  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((done, fail) => {
    socket.addEventListener("open", done);
    socket.addEventListener("error", fail);
  });

  let nextId = 1;
  const pending = new Map();
  const listeners = new Map();
  function send(method, params = {}) {
    const id = nextId++;
    return new Promise((resolvePromise, rejectPromise) => {
      pending.set(id, { resolve: resolvePromise, reject: rejectPromise });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }
  function on(event, callback) {
    if (!listeners.has(event)) listeners.set(event, []);
    listeners.get(event).push(callback);
  }
  function waitForEvent(event, timeout = 20000) {
    return new Promise((resolvePromise, rejectPromise) => {
      const timer = setTimeout(() => rejectPromise(new Error(`${event} 대기 시간 초과`)), timeout);
      on(event, (params) => {
        clearTimeout(timer);
        resolvePromise(params);
      });
    });
  }
  function evaluate(expression) {
    return send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })
      .then((result) => {
        if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
        return result.result.value;
      });
  }
  async function navigate(path, wait = 500) {
    pageErrors = [];
    const loaded = waitForEvent("Page.loadEventFired");
    await send("Page.navigate", { url: `${base}/${path}` });
    await loaded;
    await sleep(wait);
  }

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const entry = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) entry.reject(new Error(message.error.message));
      else entry.resolve(message.result);
    } else if (message.method) {
      for (const callback of listeners.get(message.method) || []) callback(message.params);
    }
  });

  await send("Page.enable");
  await send("Runtime.enable");
  on("Runtime.exceptionThrown", (params) => {
    const text = params.exceptionDetails?.exception?.description || params.exceptionDetails?.text || "unknown";
    pageErrors.push(text);
  });

  console.log("데스크톱 화면");
  await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await navigate("index.html", 800);
  const home = await evaluate(`({
    title: document.title,
    navLinks: document.querySelectorAll(".nav-submenu a").length,
    skipLink: Boolean(document.querySelector(".skip-link")),
    mainId: document.querySelector("main")?.id || "",
    description: document.querySelector('meta[name="description"]')?.content || "",
    overflow: document.documentElement.scrollWidth - window.innerWidth
  })`);
  check(home.navLinks >= 10, "홈 사이드바가 렌더링됩니다", String(home.navLinks));
  check(home.skipLink && home.mainId === "main-content", "본문 바로가기 링크와 main id가 있습니다");
  check(home.description.length > 20, "홈에 검색 설명 메타데이터가 있습니다");
  check(home.overflow <= 1, "홈에 가로 스크롤이 없습니다", String(home.overflow));
  check(pageErrors.length === 0, "홈에서 처리되지 않은 스크립트 오류가 없습니다", pageErrors.join(" | "));

  await navigate("game.html", 800);
  const gameMenu = await evaluate(`({
    menuVisible: !document.getElementById("game-menu").hidden,
    games: document.querySelectorAll(".game-list-item").length,
    canvases: [...document.querySelectorAll("canvas")].filter((canvas) => !canvas.getAttribute("aria-label")).length
  })`);
  check(gameMenu.menuVisible, "게임 목록이 기본으로 보입니다");
  check(gameMenu.games === 45, "게임 45개가 렌더링됩니다", String(gameMenu.games));
  check(gameMenu.canvases === 0, "모든 캔버스에 aria-label이 있습니다", String(gameMenu.canvases));
  check(pageErrors.length === 0, "게임 목록에서 스크립트 오류가 없습니다", pageErrors.join(" | "));

  await navigate("game.html?smoke=1#panel-2048", 1200);
  const deepLink = await evaluate(`({
    hash: location.hash,
    panelHidden: document.getElementById("panel-2048").hidden,
    menuHidden: document.getElementById("game-menu").hidden
  })`);
  check(deepLink.hash === "#panel-2048" && !deepLink.panelHidden && deepLink.menuHidden,
    "게임 해시 링크가 해당 게임을 바로 엽니다", JSON.stringify(deepLink));
  check(pageErrors.length === 0, "게임 딥링크에서 스크립트 오류가 없습니다", pageErrors.join(" | "));

  await navigate("game.html?smoke=2#panel-rhythm", 1200);
  const rhythm = await evaluate(`({
    visible: !document.getElementById("panel-rhythm").hidden,
    keys: document.querySelectorAll(".rhythm-key").length,
    labeled: Boolean(document.getElementById("rhythm-canvas").getAttribute("aria-label"))
  })`);
  check(rhythm.visible && rhythm.keys === 4 && rhythm.labeled,
    "리듬 게임 화면과 판정 버튼이 준비됩니다", JSON.stringify(rhythm));
  await evaluate(`document.getElementById("rhythm-start").click()`);
  await sleep(350);
  const rhythmRunning = await evaluate(`({
    status: document.getElementById("rhythm-status").textContent,
    enabled: [...document.querySelectorAll(".rhythm-key")].filter((key) => !key.disabled).length
  })`);
  check(rhythmRunning.status.includes("D F J K") && rhythmRunning.enabled === 4,
    "리듬 게임을 시작하면 판정 버튼이 활성화됩니다", JSON.stringify(rhythmRunning));
  await sleep(1100);
  const rhythmPlay = await evaluate(`(() => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "d" }));
    return {
      time: Number(document.getElementById("rhythm-time").textContent),
      flash: document.querySelector('.rhythm-key[data-lane="0"]').classList.contains("is-active")
    };
  })()`);
  check(rhythmPlay.time <= 47 && rhythmPlay.flash,
    "리듬 게임 타이머와 키 입력이 동작합니다", JSON.stringify(rhythmPlay));
  check(pageErrors.length === 0, "리듬 게임에서 스크립트 오류가 없습니다", pageErrors.join(" | "));

  await navigate("game.html?smoke=games", 900);
  const gameIds = await evaluate(`[...document.querySelectorAll(".game-list-item")].map((button) => button.dataset.target)`);
  const brokenGames = [];
  for (const gameId of gameIds) {
    const before = pageErrors.length;
    await evaluate(`document.querySelector('.game-list-item[data-target="${gameId}"]').click()`);
    await sleep(200);
    const state = await evaluate(`({
      visible: !document.getElementById("${gameId}").hidden,
      registered: Boolean(window.gamePanels?.["${gameId}"])
    })`);
    if (!state.visible || !state.registered || pageErrors.length > before) brokenGames.push(gameId);
    await evaluate(`document.querySelector(".game-panel:not([hidden]) .game-back")?.click()`);
    await sleep(120);
  }
  check(brokenGames.length === 0, "45개 게임이 모두 열립니다", brokenGames.join(", "));

  await navigate("search.html", 1200);
  const search = await evaluate(`({
    form: Boolean(document.querySelector('input[type="search"], #search-input')),
    navLinks: document.querySelectorAll(".nav-submenu a").length
  })`);
  check(search.form, "검색 입력창이 있습니다");
  check(search.navLinks >= 10, "검색 페이지 사이드바가 렌더링됩니다");
  check(pageErrors.length === 0, "검색 페이지에서 스크립트 오류가 없습니다", pageErrors.join(" | "));

  for (const page of ["manual.html", "english.html", "calendar.html"]) {
    await navigate(page, 600);
    const info = await evaluate(`({
      nav: document.querySelectorAll(".nav-submenu a").length,
      h1: document.querySelector("h1")?.textContent || ""
    })`);
    check(info.nav >= 10 && info.h1.length > 0, `${page} 기본 구조가 렌더링됩니다`);
    check(pageErrors.length === 0, `${page}에서 스크립트 오류가 없습니다`, pageErrors.join(" | "));
  }

  const notFoundResponse = await fetch(`${base}/no-such-page`, { redirect: "manual" });
  const notFoundHtml = await notFoundResponse.text();
  check(notFoundResponse.status === 404, "없는 주소가 404 상태를 반환합니다", String(notFoundResponse.status));
  check(notFoundHtml.includes("페이지를 찾을 수 없습니다"), "404 페이지 내용이 표시됩니다");

  await navigate("no-such-page", 800);
  const notFoundPage = await evaluate(`({
    title: document.title,
    nav: document.querySelectorAll(".nav-submenu a").length,
    styled: [...document.styleSheets].some((sheet) => (sheet.href || "").includes("style.css"))
  })`);
  check(notFoundPage.title.includes("페이지를 찾을 수 없습니다"), "404 페이지 제목이 표시됩니다");
  check(notFoundPage.nav >= 10, "404 페이지에서 공용 내비게이션이 렌더링됩니다", String(notFoundPage.nav));
  check(notFoundPage.styled, "404 페이지에서 공용 CSS를 불러옵니다");
  check(pageErrors.length === 0, "404 페이지에서 스크립트 오류가 없습니다", pageErrors.join(" | "));

  console.log("모바일 화면");
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await navigate("index.html", 600);
  const mobile = await evaluate(`({
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    skipLink: Boolean(document.querySelector(".skip-link")),
    sidebar: Boolean(document.querySelector(".sidebar"))
  })`);
  check(mobile.overflow <= 1, "모바일에 가로 스크롤이 없습니다", String(mobile.overflow));
  check(mobile.skipLink && mobile.sidebar, "모바일에서도 사이드바와 바로가기가 유지됩니다");
  check(pageErrors.length === 0, "모바일 홈에서 스크립트 오류가 없습니다", pageErrors.join(" | "));
} catch (error) {
  console.error(error);
  failures.push(error.message);
} finally {
  try {
    await Promise.race([send("Browser.close"), sleep(1500)]);
  } catch {}
  try { socket?.close(); } catch {}
  chrome?.kill();
  try {
    server.closeAllConnections?.();
    server.close();
  } catch {}
  await sleep(300);
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}

if (failures.length) {
  console.error(`\n${failures.length}개 스모크 검사가 실패했습니다.`);
  process.exit(1);
}
console.log("\n브라우저 스모크 검사를 모두 통과했습니다.");
