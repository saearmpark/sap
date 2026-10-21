(() => {
  // stocks.html(투자정보)의 경제 소식 목록을 렌더링합니다.
  function mount(options) {
    const { listEl, statusEl, cacheKey, noun, countLabel = noun, category = "", intervalMs = 5 * 60 * 1000 } = options;
    if (!listEl || !statusEl) return;
    const API = window.SAPCommon.API_ROOT;
    let items = [];

    function timestamp(item) {
      const parsed = Date.parse(item.publishedAt || item.fetchedAt || "");
      return Number.isNaN(parsed) ? 0 : parsed;
    }

    function newestFirst(list) {
      return [...list].sort((a, b) => timestamp(b) - timestamp(a) || (b.id || 0) - (a.id || 0));
    }

    function card(item) {
      const link = document.createElement("a");
      link.className = "news-card";
      link.href = item.link;
      link.target = "_blank";
      link.rel = "noopener noreferrer";

      if (item.imageUrl) {
        const thumb = document.createElement("img");
        thumb.className = "news-thumb";
        thumb.src = item.imageUrl;
        thumb.alt = "";
        thumb.loading = "lazy";
        thumb.referrerPolicy = "no-referrer";
        thumb.addEventListener("error", () => thumb.remove());
        link.appendChild(thumb);
      }

      const body = document.createElement("div");
      body.className = "news-body";

      const title = document.createElement("h3");
      title.textContent = item.title;
      body.appendChild(title);

      const meta = document.createElement("div");
      meta.className = "news-meta";
      if (item.source) {
        const source = document.createElement("span");
        source.textContent = item.source;
        meta.appendChild(source);
      }
      const time = document.createElement("span");
      time.textContent = window.SAPCommon.relTime(item.publishedAt || item.fetchedAt);
      meta.appendChild(time);
      body.appendChild(meta);

      if (item.summary) {
        const summary = document.createElement("p");
        summary.className = "news-summary";
        summary.textContent = item.summary;
        body.appendChild(summary);
      }

      link.appendChild(body);
      return link;
    }

    function render() {
      if (!items.length) {
        const empty = document.createElement("p");
        empty.className = "news-empty";
        empty.textContent = `표시할 ${noun}이 없습니다.`;
        listEl.replaceChildren(empty);
        return;
      }
      listEl.replaceChildren(...items.map(card));
    }

    async function load() {
      const cached = window.SAPCommon.readCache(cacheKey);
      if (cached) {
        items = newestFirst(cached.items);
        render();
        statusEl.textContent = `저장된 ${noun} ${items.length}건을 먼저 표시합니다...`;
      } else {
        statusEl.textContent = `${noun}을 불러오는 중입니다...`;
      }
      try {
        const query = category ? `?category=${encodeURIComponent(category)}` : "";
        const response = await fetch(`${API}/news${query}`, { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        items = newestFirst(await response.json());
        render();
        if (items.length) {
          window.SAPCommon.writeCache(cacheKey, items);
          const updated = items[0]?.fetchedAt || items[0]?.publishedAt;
          statusEl.textContent = `${countLabel} ${items.length}건 · ${window.SAPCommon.relTime(updated)} 갱신`;
        } else {
          statusEl.textContent = `아직 수집된 ${noun}이 없습니다. 잠시 후 다시 확인해주세요.`;
        }
      } catch (error) {
        statusEl.textContent = window.SAPCommon.readCache(cacheKey)
          ? `서버 연결이 느립니다. 저장된 ${noun} ${items.length}건을 표시합니다.`
          : `${noun}을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.`;
      }
    }

    load();
    setInterval(load, intervalMs);
  }

  window.SAPFeed = { mount };
})();
