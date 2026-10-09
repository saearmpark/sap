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
      username: data.username,
      displayName: data.displayName
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
    const allowed = ["index.html", "board.html", "files.html", "calendar.html", "learn.html", "game.html"];
    return `login.html${allowed.includes(next) ? `?next=${encodeURIComponent(next)}` : ""}`;
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
    if (!link) return;
    const user = getUser();
    if (getToken() && user) {
      link.textContent = `${user.displayName || user.username} · 로그아웃`;
      link.href = "#logout";
      link.onclick = async event => {
        event.preventDefault();
        try { await apiFetch(`${API_ROOT}/auth/logout`, { method: "POST" }); } catch {}
        clearSession();
        location.href = "login.html";
      };
    } else {
      link.textContent = "로그인 / 회원가입";
      link.href = "login.html";
      link.onclick = null;
    }
  }

  window.SAPAuth = { API_ROOT, apiFetch, clearSession, getToken, getUser, loginUrl, requireSession, saveSession };
  updateAuthLink();
})();
