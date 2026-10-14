(() => {
  const API_ROOT = "https://board-backend-nngx.onrender.com/api";
  const tokenKey = "sap-access-token";
  const userKey = "sap-user";

  function getToken() {
    try { return localStorage.getItem(tokenKey) || ""; } catch { return ""; }
  }

  function getUser() {
    try { return JSON.parse(localStorage.getItem(userKey) || "null"); } catch { return null; }
  }

  function saveSession(data) {
    localStorage.setItem(tokenKey, data.accessToken);
    localStorage.setItem(userKey, JSON.stringify({
      id: data.id,
      username: data.username,
      displayName: data.displayName,
      isAdmin: data.isAdmin === true
    }));
    updateAuthLink();
  }

  function clearSession() {
    try {
      localStorage.removeItem(tokenKey);
      localStorage.removeItem(userKey);
    } catch {}
    updateAuthLink();
  }

  function loginUrl() {
    const next = location.pathname.split("/").pop();
    const allowed = ["index.html", "board.html", "files.html", "calendar.html", "learn.html", "game.html", "admin.html", "chat.html"];
    return `login.html${allowed.includes(next) ? `?next=${encodeURIComponent(next)}` : ""}`;
  }

  function handleAuthLinkClick(event) {
    const token = getToken();
    if (!token || !getUser()) return;

    event.preventDefault();
    clearSession();
    fetch(`${API_ROOT}/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      keepalive: true
    }).catch(error => console.warn("Could not revoke the server session during logout.", error));
    location.replace("login.html");
  }

  async function apiFetch(url, options = {}) {
    const headers = new Headers(options.headers || {});
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const response = await fetch(url, { ...options, headers });
    if (response.status === 401 && token && !url.includes("/api/auth/login")) {
      clearSession();
      location.replace(loginUrl());
    }
    return response;
  }

  async function requireSession() {
    if (!getToken()) {
      location.replace(loginUrl());
      return null;
    }
    try {
      const response = await apiFetch(`${API_ROOT}/auth/me`);
      if (!response.ok) {
        clearSession();
        location.replace(loginUrl());
        return null;
      }
      return response.json();
    } catch {
      return { unavailable: true };
    }
  }

  function updateAuthLink() {
    const link = document.querySelector("[data-auth-link]");
    const user = getUser();
    if (link && link.dataset.logoutHandler !== "attached") {
      link.addEventListener("click", handleAuthLinkClick);
      link.dataset.logoutHandler = "attached";
    }
    if (link && getToken() && user) {
      link.textContent = `${user.displayName || user.username} · 로그아웃`;
      link.href = "#logout";
    } else if (link) {
      link.textContent = "로그인 / 회원가입";
      link.href = "login.html";
    }

    let chatLink = document.querySelector("[data-chat-link]");
    if (getToken() && !chatLink) {
      chatLink = document.createElement("a");
      chatLink.href = "chat.html";
      chatLink.dataset.chatLink = "";
      chatLink.textContent = "실시간 대화";
      link?.insertAdjacentElement("afterend", chatLink);
    } else if (chatLink) {
      chatLink.hidden = !getToken();
    }

    let passwordLink = document.querySelector("[data-password-link]");
    if (user && getToken() && !passwordLink) {
      passwordLink = document.createElement("a");
      passwordLink.href = "login.html?mode=password-change#password-change";
      passwordLink.dataset.passwordLink = "";
      passwordLink.textContent = "비밀번호 변경";
      link?.insertAdjacentElement("afterend", passwordLink);
    } else if (passwordLink) {
      passwordLink.hidden = !(user && getToken());
    }

    let adminLink = document.querySelector("[data-admin-link]");
    if (user?.isAdmin && !adminLink) {
      adminLink = document.createElement("a");
      adminLink.href = "admin.html";
      adminLink.dataset.adminLink = "";
      adminLink.textContent = "회원가입 승인";
      link?.insertAdjacentElement("afterend", adminLink);
    } else if (adminLink) {
      adminLink.hidden = !user?.isAdmin;
    }
  }

  window.SAPAuth = { API_ROOT, apiFetch, clearSession, getToken, getUser, loginUrl, requireSession, saveSession };
  updateAuthLink();
})();
