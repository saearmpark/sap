(() => {
  const root = document.documentElement;
  const buttons = Array.from(document.querySelectorAll("[data-theme-toggle]"));
  let savedTheme = "light";
  try {
    savedTheme = localStorage.getItem("sap-theme") || "light";
  } catch {
    // Keep the page usable when browser storage is unavailable.
  }

  function applyTheme(theme) {
    root.dataset.theme = theme;
    const nextTheme = theme === "dark" ? "light" : "dark";
    const label = nextTheme === "dark" ? "◐ 블랙모드" : "☼ 화이트모드";
    for (const button of buttons) {
      button.textContent = label;
      button.setAttribute("aria-label", `${nextTheme === "dark" ? "블랙" : "화이트"}모드로 전환`);
    }
  }

  applyTheme(savedTheme === "dark" ? "dark" : "light");
  for (const button of buttons) {
    button.addEventListener("click", () => {
      const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
      try {
        localStorage.setItem("sap-theme", nextTheme);
      } catch {
        // The current page still changes even if the preference cannot be saved.
      }
      applyTheme(nextTheme);
    });
  }

  const nav = document.querySelector("nav.nav-group[data-nav]");
  const themeButton = nav?.querySelector(".nav-theme-toggle");
  let installPrompt = null;
  const installButton = document.createElement("button");
  installButton.type = "button";
  installButton.className = "theme-toggle nav-install-toggle";
  installButton.textContent = "앱으로 설치";
  installButton.setAttribute("aria-label", "사피엔스 앱 설치");
  installButton.hidden = true;
  installButton.addEventListener("click", async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    try {
      await installPrompt.userChoice;
    } catch {
      // The install prompt can be dismissed or expire before userChoice settles.
    }
    installPrompt = null;
    installButton.hidden = true;
  });
  if (themeButton?.parentNode) themeButton.after(installButton);
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    installButton.hidden = false;
  });
  window.addEventListener("appinstalled", () => {
    installPrompt = null;
    installButton.hidden = true;
  });

  if ("serviceWorker" in navigator
      && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }
})();
