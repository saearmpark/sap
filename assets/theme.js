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
})();
