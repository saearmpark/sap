(() => {
  const API_ROOT = "https://board-backend-nngx.onrender.com/api";

  const NAV = [
    { href: "index.html", label: "홈" },
    { href: "search.html", label: "검색" },
    { label: "소식", items: [
      { href: "news.html", label: "이슈" },
      { href: "stocks.html", label: "투자" }
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
      { href: "files.html", label: "개인" },
      { href: "apps.html", label: "공용" }
    ] },
    { label: "계정", items: [
      { href: "calendar.html", label: "일정" },
      { href: "login.html", label: "로그인 / 회원가입", authLink: true }
    ] }
  ];

  const ACCOUNT_PAGES = ["admin.html", "mypage.html"];

  function currentFile() {
    const name = location.pathname.split("/").pop();
    return (name || "index.html").toLowerCase();
  }

  function navLink(entry, file) {
    const link = document.createElement("a");
    link.href = entry.href;
    link.textContent = entry.label;
    if (entry.authLink) link.dataset.authLink = "";
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

  window.SAPCommon = { API_ROOT, escapeHtml, readCache, relTime, renderSidebar, writeCache };
  renderSidebar();
})();
