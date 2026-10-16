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

  function loginUrl(sessionExpired = false) {
    const next = location.pathname.split("/").pop();
    const allowed = ["index.html", "board.html", "files.html", "calendar.html", "learn.html", "game.html", "admin.html", "chat.html", "mypage.html", "search.html"];
    const params = new URLSearchParams();
    if (allowed.includes(next)) params.set("next", next);
    if (sessionExpired) params.set("expired", "1");
    const query = params.toString();
    return `login.html${query ? `?${query}` : ""}`;
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
    const { suppressAuthRedirect = false, ...fetchOptions } = options;
    const headers = new Headers(fetchOptions.headers || {});
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    let response;
    try {
      response = await fetch(url, { ...fetchOptions, headers });
    } catch (error) {
      if (error instanceof TypeError) {
        throw new TypeError("인증 서버에 연결할 수 없습니다. 인터넷 연결을 확인한 뒤 다시 시도해주세요.", { cause: error });
      }
      throw error;
    }
    if (response.status === 401 && token && !suppressAuthRedirect && url.includes("/api/auth/me")) {
      if (getToken() === token) {
        clearSession();
        location.replace(loginUrl(true));
      }
    }
    return response;
  }

  async function requireSession() {
    const token = getToken();
    if (!token) {
      location.replace(loginUrl());
      return null;
    }
    try {
      const response = await apiFetch(`${API_ROOT}/auth/me`);
      if (!response.ok) {
        if (getToken() === token) {
          clearSession();
          location.replace(loginUrl(true));
        }
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
    const authed = Boolean(getToken() && user);

    if (link) {
      if (link.dataset.logoutHandler !== "attached") {
        link.addEventListener("click", handleAuthLinkClick);
        link.dataset.logoutHandler = "attached";
      }
      if (authed) {
        link.textContent = `${user.displayName || user.username} · 로그아웃`;
        link.href = "#logout";
      } else {
        link.textContent = "로그인 / 회원가입";
        link.href = "login.html";
      }
    }

    const accountMenu = link?.closest(".nav-submenu");

    let mypageLink = accountMenu?.querySelector("[data-mypage-link]");
    if (authed && accountMenu && !mypageLink) {
      mypageLink = document.createElement("a");
      mypageLink.href = "mypage.html";
      mypageLink.dataset.mypageLink = "";
      mypageLink.textContent = "나의정보";
      accountMenu.appendChild(mypageLink);
    } else if (mypageLink) {
      mypageLink.hidden = !authed;
    }

    let passwordLink = accountMenu?.querySelector("[data-password-link]");
    if (authed && accountMenu && !passwordLink) {
      passwordLink = document.createElement("a");
      passwordLink.href = "login.html?mode=password-change#password-change";
      passwordLink.dataset.passwordLink = "";
      passwordLink.textContent = "비밀번호 변경";
      accountMenu.appendChild(passwordLink);
    } else if (passwordLink) {
      passwordLink.hidden = !authed;
    }

    let adminLink = accountMenu?.querySelector("[data-admin-link]");
    if (user?.isAdmin && accountMenu && !adminLink) {
      adminLink = document.createElement("a");
      adminLink.href = "admin.html";
      adminLink.dataset.adminLink = "";
      adminLink.textContent = "회원가입 승인";
      accountMenu.appendChild(adminLink);
    } else if (adminLink) {
      adminLink.hidden = !user?.isAdmin;
    }
  }

  window.SAPAuth = { API_ROOT, apiFetch, clearSession, getToken, getUser, loginUrl, requireSession, saveSession };
  updateAuthLink();
})();
