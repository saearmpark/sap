(() => {
  const root = document.documentElement;
  const button = document.querySelector("[data-theme-toggle]");
  let savedTheme = "light";
  try {
    savedTheme = localStorage.getItem("sap-theme") || "light";
  } catch {
    // Keep the page usable when browser storage is unavailable.
  }

  function applyTheme(theme) {
    root.dataset.theme = theme;
    if (button) {
      const nextTheme = theme === "dark" ? "light" : "dark";
      button.textContent = nextTheme === "dark" ? "◐ 블랙모드" : "☼ 화이트모드";
      button.setAttribute("aria-label", `${nextTheme === "dark" ? "블랙" : "화이트"}모드로 전환`);
    }
  }

  applyTheme(savedTheme === "dark" ? "dark" : "light");
  button?.addEventListener("click", () => {
    const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
    try {
      localStorage.setItem("sap-theme", nextTheme);
    } catch {
      // The current page still changes even if the preference cannot be saved.
    }
    applyTheme(nextTheme);
  });
})();
