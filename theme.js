(() => {
  const root = document.documentElement;
  const button = document.querySelector("[data-theme-toggle]");
  const savedTheme = localStorage.getItem("sap-theme");

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
    localStorage.setItem("sap-theme", nextTheme);
    applyTheme(nextTheme);
  });
})();
