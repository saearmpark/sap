(() => {
  const API = window.SAPCommon.API_ROOT;
  const withTimeout = window.SAPCommon.withTimeout;
  const CACHE_KEY = "sap-notifications-cache";
  const SEEN_KEY = "sap-notifications-seen-v1";
  const listEl = document.getElementById("notification-list");
  const statusEl = document.getElementById("notification-summary");
  const readAllEl = document.getElementById("notification-read-all");
  let items = [];
  const seen = new Set(readSeen());

  function readSeen() {
    try {
      const parsed = JSON.parse(localStorage.getItem(SEEN_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.filter(id => typeof id === "string") : [];
    } catch {
      return [];
    }
  }

  function writeSeen() {
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify([...seen].slice(-500)));
    } catch {}
    window.SAPCommon.updateNotificationBadge();
  }

  function readCache() {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
      return cached && Array.isArray(cached.items) ? cached.items : [];
    } catch {
      return [];
    }
  }

  function writeCache() {
    if (items.length) {
      window.SAPCommon.writeCache(CACHE_KEY, items);
    } else {
      try { localStorage.removeItem(CACHE_KEY); } catch {}
    }
  }

  async function fetchJson(path) {
    const response = await withTimeout(
      window.SAPAuth.apiFetch(`${API}${path}`, { cache: "no-store", suppressAuthRedirect: true }),
      12000
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  function summaryText(extra = "") {
    const unread = items.filter(item => !seen.has(item.id)).length;
    if (!items.length) return extra || "새 알림이 없습니다.";
    const base = `알림 ${items.length}개 · 읽지 않음 ${unread}개`;
    return extra ? `${base} · ${extra}` : base;
  }

  function showMessage(message) {
    if (!listEl) return;
    const empty = document.createElement("p");
    empty.className = "notification-empty";
    empty.textContent = message;
    listEl.replaceChildren(empty);
  }

  function render() {
    if (!listEl) return;
    if (!items.length) {
      showMessage("새 알림이 없습니다. 새 공지나 일정이 생기면 여기에 표시됩니다.");
    } else {
      const nodes = items.map(item => {
        const link = document.createElement("a");
        link.className = `notification-item ${seen.has(item.id) ? "is-read" : "is-unread"}`;
        link.href = item.link;
        link.dataset.notificationId = item.id;
        link.addEventListener("click", () => {
          if (seen.has(item.id)) return;
          seen.add(item.id);
          writeSeen();
          link.classList.remove("is-unread");
          link.classList.add("is-read");
          if (statusEl) statusEl.textContent = summaryText();
          if (readAllEl) readAllEl.disabled = !items.some(entry => !seen.has(entry.id));
        });

        const kind = document.createElement("span");
        kind.className = "notification-kind";
        kind.dataset.kind = item.kindKey;
        kind.textContent = item.kind;

        const title = document.createElement("h2");
        title.className = "notification-title";
        title.textContent = item.title;

        const body = document.createElement("p");
        body.className = "notification-body";
        body.textContent = item.body;

        const when = document.createElement("span");
        when.className = "notification-when";
        when.textContent = item.when;

        link.append(kind, title, body, when);
        return link;
      });
      listEl.replaceChildren(...nodes);
    }
    if (statusEl) statusEl.textContent = summaryText();
    if (readAllEl) readAllEl.disabled = !items.some(item => !seen.has(item.id));
    window.SAPCommon.updateNotificationBadge();
  }

  async function load() {
    const previous = items;
    const [events, posts, files] = await Promise.allSettled([
      fetchJson("/events"),
      fetchJson("/posts"),
      fetchJson("/files")
    ]);
    const failed = [events, posts, files].filter(result => result.status === "rejected").length;
    const fresh = window.SAPCommon.buildNotificationItems(
      events.status === "fulfilled" ? events.value : [],
      posts.status === "fulfilled" ? posts.value : [],
      files.status === "fulfilled" ? files.value : []
    );

    if (failed && !fresh.length && previous.length) {
      items = previous;
      render();
      if (statusEl) statusEl.textContent = summaryText("서버 연결이 느립니다. 저장된 알림을 표시합니다.");
      return;
    }

    items = fresh;
    writeCache();
    if (!failed) window.SAPCommon.markNotificationSynced();
    render();
    if (failed === 3 && !items.length) {
      showMessage("알림을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      if (statusEl) statusEl.textContent = "알림을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
    } else if (failed) {
      if (statusEl) statusEl.textContent = summaryText("일부 알림을 불러오지 못했습니다.");
    }
  }

  if (readAllEl) {
    readAllEl.addEventListener("click", () => {
      items.forEach(item => seen.add(item.id));
      writeSeen();
      render();
    });
  }

  const cached = window.SAPAuth.getToken() ? readCache() : [];
  if (cached.length) {
    items = window.SAPCommon.sortNotificationItems(cached);
    render();
    if (statusEl) statusEl.textContent = summaryText("저장된 알림을 먼저 표시합니다.");
  }

  window.SAPAuth.requireSession().then(user => {
    if (!user) return;
    if (user.unavailable) {
      if (statusEl) statusEl.textContent = items.length
        ? summaryText("로그인 확인이 지연되고 있습니다.")
        : "로그인 확인이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.";
      return;
    }
    load().catch(() => {
      if (statusEl) statusEl.textContent = items.length
        ? summaryText("서버 연결이 느립니다. 저장된 알림을 표시합니다.")
        : "알림을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
    });
  });
})();
