(() => {
  const API_ROOT = "https://board-backend-nngx.onrender.com/api";

  const NAV = [
    { href: "index.html", label: "홈" },
    { label: "소식", items: [
      { href: "news.html", label: "날씨" },
      { href: "stocks.html", label: "투자" },
      { href: "ai-usage.html", label: "AI 사용량" }
    ] },
    { label: "학습", items: [
      {
        href: "manual.html",
        label: "웹",
        pages: [
          "manual-plan.html",
          "manual-vscode.html",
          "manual-html.html",
          "manual-css.html",
          "manual-javascript.html",
          "manual-python.html",
          "manual-connect.html",
          "manual-server.html",
          "manual-ai-cli.html",
          "manual-finish.html"
        ]
      },
      { href: "english.html", label: "영어" }
    ] },
    { label: "제작", items: [
      { href: "learn.html", label: "앱" },
      { href: "game.html", label: "게임" }
    ] },
    { label: "소통", items: [
      { href: "board.html", label: "게시판" },
      { href: "notice.html", label: "공지" },
      { href: "chat.html", label: "대화" }
    ] },
    { label: "자료", items: [
      { href: "files.html", label: "자료실" },
      { href: "apps.html", label: "공용 도구" }
    ] },
    { label: "계정", items: [
      { href: "calendar.html", label: "일정" },
      { href: "notifications.html", label: "알림" },
      { href: "login.html", label: "로그인 / 회원가입", authLink: true }
    ] }
  ];

  const ACCOUNT_PAGES = ["admin.html", "mypage.html"];
  const NOTIFICATION_CACHE_KEY = "sap-notifications-cache";
  const NOTIFICATION_SEEN_KEY = "sap-notifications-seen-v1";
  const NOTIFICATION_SYNC_KEY = "sap-notifications-synced-at";
  const NOTIFICATION_SYNC_INTERVAL = 5 * 60 * 1000;
  let notificationRefreshPromise = null;

  function currentFile() {
    const name = location.pathname.split("/").pop();
    return (name || "index.html").toLowerCase();
  }

  function navSearch() {
    const form = document.createElement("form");
    form.className = "nav-search";
    form.action = "search.html";
    form.method = "get";
    form.setAttribute("role", "search");
    const input = document.createElement("input");
    input.type = "search";
    input.name = "q";
    input.placeholder = "검색";
    input.setAttribute("aria-label", "사이트 검색");
    const button = document.createElement("button");
    button.type = "submit";
    button.textContent = "검색";
    form.append(input, button);
    return form;
  }

  function navLink(entry, file) {
    const link = document.createElement("a");
    link.href = entry.href;
    link.textContent = entry.label;
    if (entry.authLink) link.dataset.authLink = "";
    if (entry.href === "notifications.html") {
      const badge = document.createElement("span");
      badge.className = "nav-badge";
      badge.dataset.notificationBadge = "";
      badge.hidden = true;
      link.appendChild(badge);
    }
    const pages = entry.pages || [];
    if (entry.href.toLowerCase() === file) {
      link.classList.add("active");
      link.setAttribute("aria-current", "page");
    } else if (pages.includes(file)) {
      link.classList.add("active");
    }
    return link;
  }

  function themeToggle() {
    const button = document.createElement("button");
    button.className = "theme-toggle nav-theme-toggle";
    button.type = "button";
    button.dataset.themeToggle = "";
    button.textContent = "◐ 블랙모드";
    return button;
  }

  function ensureSkipLink() {
    if (document.querySelector(".skip-link")) return;
    const main = document.querySelector("main");
    if (!main) return;
    if (!main.id) main.id = "main-content";
    main.setAttribute("tabindex", "-1");
    const link = document.createElement("a");
    link.className = "skip-link";
    link.href = `#${main.id}`;
    link.textContent = "본문 바로가기";
    link.addEventListener("click", (event) => {
      event.preventDefault();
      main.focus();
      main.scrollIntoView({ block: "start" });
    });
    document.body.prepend(link);
  }

  // 각 페이지에 반복되던 사이드바를 한 곳에서 만들어, 현재 페이지만 active/open 처리합니다.
  function renderSidebar() {
    const nav = document.querySelector("nav.nav-group[data-nav]");
    if (!nav) return;
    const file = currentFile();
    const fragment = document.createDocumentFragment();
    fragment.appendChild(themeToggle());
    for (const entry of NAV) {
      if (entry.href) {
        fragment.appendChild(navLink(entry, file));
        continue;
      }
      const details = document.createElement("details");
      details.className = "nav-menu";
      const summary = document.createElement("summary");
      summary.textContent = entry.label;
      const submenu = document.createElement("div");
      submenu.className = "nav-submenu";
      let hasActive = false;
      for (const item of entry.items) {
        const link = navLink(item, file);
        if (link.classList.contains("active")) hasActive = true;
        submenu.appendChild(link);
      }
      if (hasActive || (entry.label === "계정" && ACCOUNT_PAGES.includes(file))) details.open = true;
      details.append(summary, submenu);
      fragment.appendChild(details);
    }
    fragment.appendChild(navSearch());
    nav.replaceChildren(fragment);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]
    ));
  }

  function readCache(key) {
    try {
      const raw = JSON.parse(localStorage.getItem(key) || "null");
      return raw && Array.isArray(raw.items) && raw.items.length ? raw : null;
    } catch { return null; }
  }

  function writeCache(key, items) {
    try { localStorage.setItem(key, JSON.stringify({ items, savedAt: Date.now() })); } catch {}
  }

  function relTime(iso) {
    if (!iso) return "";
    const time = new Date(iso).getTime();
    if (Number.isNaN(time)) return "";
    const seconds = Math.round((Date.now() - time) / 1000);
    if (seconds < 10) return "방금 전";
    if (seconds < 60) return `${seconds}초 전`;
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes}분 전`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}시간 전`;
    return `${Math.round(hours / 24)}일 전`;
  }

  function localDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function addDays(dateKey, days) {
    const date = new Date(`${dateKey}T00:00:00`);
    date.setDate(date.getDate() + days);
    return localDate(date);
  }

  function addMonths(dateKey, months) {
    const date = new Date(`${dateKey}T00:00:00`);
    const day = date.getDate();
    date.setDate(1);
    date.setMonth(date.getMonth() + months);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    date.setDate(Math.min(day, lastDay));
    return localDate(date);
  }

  function dayDiff(fromKey, toKey) {
    return Math.round((new Date(`${toKey}T00:00:00`) - new Date(`${fromKey}T00:00:00`)) / 86400000);
  }

  function monthDiff(fromKey, toKey) {
    const from = new Date(`${fromKey}T00:00:00`);
    const to = new Date(`${toKey}T00:00:00`);
    return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  }

  function advanceToRange(start, end, rule, rangeStart) {
    let guard = 0;
    while (start < rangeStart && guard < 120) {
      const steps = rule === "daily"
        ? Math.max(1, dayDiff(start, rangeStart))
        : rule === "weekly"
          ? Math.max(1, Math.floor(dayDiff(start, rangeStart) / 7))
          : Math.max(1, monthDiff(start, rangeStart));
      if (rule === "daily") {
        start = addDays(start, steps);
        end = addDays(end, steps);
      } else if (rule === "weekly") {
        start = addDays(start, steps * 7);
        end = addDays(end, steps * 7);
      } else {
        start = addMonths(start, steps);
        end = addMonths(end, steps);
      }
      guard++;
    }
    return { start, end };
  }

  function expandOccurrences(events, rangeStart, rangeEnd) {
    const occurrences = [];
    events.forEach(event => {
      const rule = event.repeat_rule || "none";
      if (rule === "none") {
        if (event.end_date >= rangeStart && event.start_date <= rangeEnd) occurrences.push(event);
        return;
      }
      const shifted = advanceToRange(event.start_date, event.end_date, rule, rangeStart);
      let start = shifted.start;
      let end = shifted.end;
      let guard = 0;
      while (start <= rangeEnd && guard < 60) {
        if (end >= rangeStart) occurrences.push({ ...event, start_date: start, end_date: end });
        if (rule === "daily") {
          start = addDays(start, 1);
          end = addDays(end, 1);
        } else if (rule === "weekly") {
          start = addDays(start, 7);
          end = addDays(end, 7);
        } else {
          start = addMonths(start, 1);
          end = addMonths(end, 1);
        }
        guard++;
      }
    });
    return occurrences;
  }

  function kstTimestamp(value) {
    if (!value) return 0;
    const match = String(value).match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(?::(\d{2}))?$/);
    if (match) {
      return new Date(`${match[1]}T${match[2]}:${match[3] || "00"}+09:00`).getTime();
    }
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  function relativeTimestamp(timestamp) {
    if (!timestamp) return "";
    return relTime(new Date(timestamp).toISOString());
  }

  function eventWhen(dateKey) {
    const today = localDate(new Date());
    const days = Math.round((new Date(`${dateKey}T00:00:00`) - new Date(`${today}T00:00:00`)) / 86400000);
    if (days <= 0) return "오늘";
    if (days === 1) return "내일";
    return `D-${days}`;
  }

  function eventItems(events) {
    if (!Array.isArray(events)) return [];
    const today = localDate(new Date());
    const horizon = addDays(today, 7);
    const nextOccurrences = new Map();
    expandOccurrences(events, today, horizon)
      .sort((a, b) => a.start_date.localeCompare(b.start_date) || a.id - b.id)
      .forEach(event => {
        if (!nextOccurrences.has(event.id)) nextOccurrences.set(event.id, event);
      });
    return [...nextOccurrences.values()]
      .slice(0, 12)
      .map(event => ({
        id: `event-${event.id}-${event.start_date}`,
        kind: "일정",
        kindKey: "calendar",
        title: event.title,
        body: `${event.public_event ? "공개 일정" : "내 일정"}${event.owner_display_name && !event.mine ? ` · ${event.owner_display_name}` : ""}`,
        link: "calendar.html",
        timestamp: new Date(`${event.start_date}T00:00:00+09:00`).getTime(),
        when: eventWhen(event.start_date)
      }));
  }

  function postItems(posts) {
    if (!Array.isArray(posts)) return [];
    return [...posts]
      .sort((a, b) => kstTimestamp(b.created_at) - kstTimestamp(a.created_at) || b.id - a.id)
      .slice(0, 12)
      .map(post => {
        const isNotice = post.category === "공지";
        return {
          id: `post-${post.id}`,
          kind: isNotice ? "공지" : "게시판",
          kindKey: isNotice ? "notice" : "board",
          title: post.title,
          body: `${post.category || "게시판"} · ${post.author_name || "작성자"}`,
          link: isNotice ? "notice.html" : "board.html",
          timestamp: kstTimestamp(post.created_at),
          when: relativeTimestamp(kstTimestamp(post.created_at))
        };
      });
  }

  function fileItems(files) {
    if (!Array.isArray(files)) return [];
    return [...files]
      .sort((a, b) => kstTimestamp(b.uploaded_at) - kstTimestamp(a.uploaded_at) || b.id - a.id)
      .slice(0, 8)
      .map(file => ({
        id: `file-${file.id}`,
        kind: "자료",
        kindKey: "file",
        title: file.original_name,
        body: `자료실 · ${file.author_name || "작성자"}`,
        link: "files.html",
        timestamp: kstTimestamp(file.uploaded_at),
        when: relativeTimestamp(kstTimestamp(file.uploaded_at))
      }));
  }

  function sortNotificationItems(list) {
    return [...list].sort((a, b) => {
      const aEvent = a.kindKey === "calendar";
      const bEvent = b.kindKey === "calendar";
      if (aEvent && bEvent) return a.timestamp - b.timestamp;
      if (aEvent) return -1;
      if (bEvent) return 1;
      return b.timestamp - a.timestamp;
    });
  }

  function buildNotificationItems(events, posts, files) {
    const combined = [...eventItems(events), ...postItems(posts), ...fileItems(files)];
    return sortNotificationItems(combined.filter(item => item.id && item.title)).slice(0, 30);
  }

  function notificationUnreadCount() {
    try {
      if (!localStorage.getItem("sap-access-token")) return 0;
      const cache = JSON.parse(localStorage.getItem(NOTIFICATION_CACHE_KEY) || "null");
      if (!cache || !Array.isArray(cache.items)) return 0;
      const seen = new Set(JSON.parse(localStorage.getItem(NOTIFICATION_SEEN_KEY) || "[]"));
      return cache.items.filter(item => item && item.id && !seen.has(item.id)).length;
    } catch {
      return 0;
    }
  }

  function updateNotificationBadge() {
    const count = notificationUnreadCount();
    document.querySelectorAll("[data-notification-badge]").forEach(badge => {
      badge.textContent = count > 99 ? "99+" : String(count);
      badge.hidden = count === 0;
    });
  }

  function markNotificationSynced() {
    try { localStorage.setItem(NOTIFICATION_SYNC_KEY, String(Date.now())); } catch {}
  }

  function clearNotificationState() {
    try {
      localStorage.removeItem(NOTIFICATION_CACHE_KEY);
      localStorage.removeItem(NOTIFICATION_SEEN_KEY);
      localStorage.removeItem(NOTIFICATION_SYNC_KEY);
    } catch {}
    updateNotificationBadge();
  }

  function withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))
    ]);
  }

  async function fetchNotificationSource(path) {
    const response = await withTimeout(
      window.SAPAuth.apiFetch(`${API_ROOT}${path}`, { cache: "no-store", suppressAuthRedirect: true }),
      12000
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async function refreshNotificationCache({ force = false } = {}) {
    if (!window.SAPAuth || !localStorage.getItem("sap-access-token")) return null;
    if (!force) {
      const syncedAt = Number(localStorage.getItem(NOTIFICATION_SYNC_KEY) || 0);
      if (Date.now() - syncedAt < NOTIFICATION_SYNC_INTERVAL) return null;
    }
    if (notificationRefreshPromise) return notificationRefreshPromise;

    notificationRefreshPromise = (async () => {
      const [events, posts, files] = await Promise.allSettled([
        fetchNotificationSource("/events"),
        fetchNotificationSource("/posts"),
        fetchNotificationSource("/files")
      ]);
      if ([events, posts, files].some(result => result.status === "rejected")) return null;
      const items = buildNotificationItems(events.value, posts.value, files.value);
      if (items.length) {
        writeCache(NOTIFICATION_CACHE_KEY, items);
      } else {
        try { localStorage.removeItem(NOTIFICATION_CACHE_KEY); } catch {}
      }
      markNotificationSynced();
      updateNotificationBadge();
      return items;
    })();

    try {
      return await notificationRefreshPromise;
    } finally {
      notificationRefreshPromise = null;
    }
  }

  function scheduleNotificationRefresh() {
    if (currentFile() === "notifications.html") return;
    if (!localStorage.getItem("sap-access-token")) return;
    const syncedAt = Number(localStorage.getItem(NOTIFICATION_SYNC_KEY) || 0);
    if (Date.now() - syncedAt < NOTIFICATION_SYNC_INTERVAL) return;
    const run = () => { refreshNotificationCache().catch(() => {}); };
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(run, { timeout: 3000 });
    } else {
      setTimeout(run, 1500);
    }
  }

  window.addEventListener("storage", event => {
    if (event.key === NOTIFICATION_CACHE_KEY || event.key === NOTIFICATION_SEEN_KEY) {
      updateNotificationBadge();
    }
  });
  window.addEventListener("load", scheduleNotificationRefresh);
  window.addEventListener("pageshow", event => {
    if (!event.persisted) return;
    updateNotificationBadge();
    scheduleNotificationRefresh();
  });

  window.SAPCommon = {
    API_ROOT, addDays, addMonths, buildNotificationItems, clearNotificationState, escapeHtml,
    expandOccurrences, localDate, markNotificationSynced, notificationUnreadCount, readCache,
    refreshNotificationCache, relTime, renderSidebar, sortNotificationItems, updateNotificationBadge,
    withTimeout, writeCache
  };
  ensureSkipLink();
  renderSidebar();
  updateNotificationBadge();
})();
