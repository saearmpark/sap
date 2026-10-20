(() => {
  function legacyCopy(text) {
    return new Promise((resolve, reject) => {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.top = "-1000px";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      try {
        document.execCommand("copy") ? resolve() : reject(new Error("copy failed"));
      } catch (error) {
        reject(error);
      } finally {
        area.remove();
      }
    });
  }

  async function copyText(text) {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch {}
    }
    return legacyCopy(text);
  }

  document.querySelectorAll(".manual-code").forEach((block) => {
    const code = block.querySelector("pre code") || block.querySelector("pre");
    if (!code) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "manual-copy";
    button.textContent = "복사";
    button.addEventListener("click", async () => {
      try {
        await copyText(code.innerText.replace(/\n+$/, ""));
        button.textContent = "복사됨";
      } catch {
        button.textContent = "복사 실패";
      }
      setTimeout(() => { button.textContent = "복사"; }, 1500);
    });
    block.appendChild(button);
  });
})();
