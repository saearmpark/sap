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
    const allowed = ["index.html", "board.html", "files.html", "calendar.html", "learn.html", "game.html", "admin.html", "chat.html", "mypage.html", "search.html", "quiz.html"];
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

    if (link && !document.querySelector("[data-search-link]")) {
      const nav = link.closest(".nav-group") || document.querySelector(".nav-group");
      const homeLink = nav?.querySelector('a[href="index.html"]');
      if (homeLink) {
        const searchLink = document.createElement("a");
        searchLink.href = "search.html";
        searchLink.dataset.searchLink = "";
        searchLink.textContent = "통합 검색";
        homeLink.insertAdjacentElement("afterend", searchLink);
      }
    }

    const toolsNav = document.querySelector(".nav-group");
    if (toolsNav && !toolsNav.querySelector("[data-apps-link]")) {
      const filesLink = toolsNav.querySelector('a[href="files.html"]');
      const appsLink = document.createElement("a");
      appsLink.href = "apps.html";
      appsLink.dataset.appsLink = "";
      appsLink.textContent = "데스크톱 도구";
      if (filesLink) filesLink.insertAdjacentElement("afterend", appsLink);
      else toolsNav.appendChild(appsLink);
    }

    const submenu = document.querySelector(".nav-submenu");
    if (submenu && !submenu.querySelector("[data-quiz-link]")) {
      const quizLink = document.createElement("a");
      quizLink.href = "quiz.html";
      quizLink.dataset.quizLink = "";
      quizLink.textContent = "퀴즈";
      const conceptsLink = submenu.querySelector('a[href="concepts.html"]');
      if (conceptsLink) conceptsLink.insertAdjacentElement("afterend", quizLink);
      else submenu.appendChild(quizLink);
    }
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

    let mypageLink = document.querySelector("[data-mypage-link]");
    if (getToken() && user && !mypageLink) {
      mypageLink = document.createElement("a");
      mypageLink.href = "mypage.html";
      mypageLink.dataset.mypageLink = "";
      mypageLink.textContent = "마이페이지";
      link?.insertAdjacentElement("afterend", mypageLink);
    } else if (mypageLink) {
      mypageLink.hidden = !(getToken() && user);
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
