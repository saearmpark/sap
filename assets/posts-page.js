(() => {
  // board.html(자유 게시판)과 notice.html(공지사항)이 거의 같은 스크립트를 각자 갖고 있던 것을
  // 한 곳으로 모으고, 분류(category)와 문구만 페이지별로 넘겨받습니다.
  function withParticle(word, afterBatchim, afterVowel) {
    const code = word.charCodeAt(word.length - 1);
    const hasBatchim = (code - 0xac00) % 28 !== 0;
    return word + (hasBatchim ? afterBatchim : afterVowel);
  }

  function mount({ category = null, noun, formAdminOnly = false }) {
    const API_BASE = `${window.SAPCommon.API_ROOT}/posts`;
    const escapeHtml = window.SAPCommon.escapeHtml;
    const subject = withParticle(noun, "이", "가");
    const object = withParticle(noun, "을", "를");

    let postsCache = [];
    let editingId = null;
    let currentPostId = null;

    function canModify(authorName) {
      const user = SAPAuth.getUser();
      return Boolean(user && (user.isAdmin || user.username === authorName));
    }

    async function loadPosts() {
      const listEl = document.getElementById("post-list");
      const filterStatus = document.getElementById("filter-status");
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      const keyword = document.getElementById("search").value.trim();
      if (keyword) params.set("q", keyword);
      const url = params.toString() ? `${API_BASE}?${params}` : API_BASE;
      try {
        const res = await SAPAuth.apiFetch(url);
        if (!res.ok) throw new Error("서버 응답 오류");
        const posts = await res.json();
        postsCache = posts;
        filterStatus.textContent = keyword ? `${posts.length}건을 찾았습니다.` : "";

        if (posts.length === 0) {
          listEl.innerHTML = `<tr><td colspan="5">${keyword ? `조건에 맞는 ${subject} 없습니다.` : `등록된 ${subject} 없습니다.`}</td></tr>`;
          return;
        }

        listEl.innerHTML = posts.map(p => `
          <tr>
            <td>${p.id}</td>
            <td><button type="button" class="post-title-btn" data-id="${p.id}">${escapeHtml(p.title)}</button></td>
            <td>${escapeHtml(p.author_name || "-")}</td>
            <td>${escapeHtml(p.created_at || "")}</td>
            <td><div class="row-actions">
              ${canModify(p.author_name) ? `<button data-id="${p.id}" class="edit-btn edit">수정</button>` : ""}
              ${canModify(p.author_name) ? `<button data-id="${p.id}" class="delete-btn delete">삭제</button>` : ""}
            </div></td>
          </tr>
        `).join("");

        document.querySelectorAll(".post-title-btn").forEach(btn => {
          btn.addEventListener("click", () => openPost(btn.dataset.id));
        });
        document.querySelectorAll(".delete").forEach(btn => {
          btn.addEventListener("click", () => deletePost(btn.dataset.id));
        });
        document.querySelectorAll(".edit").forEach(btn => {
          btn.addEventListener("click", () => startEdit(btn.dataset.id));
        });
      } catch (err) {
        listEl.innerHTML =
          '<tr><td colspan="5">서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요 (무료 서버는 깨어나는 데 최대 1분 정도 걸릴 수 있습니다).</td></tr>';
      }
    }

    function startEdit(id) {
      const post = postsCache.find(p => String(p.id) === String(id));
      if (!post) return;
      editingId = post.id;
      document.getElementById("title").value = post.title;
      document.getElementById("content").value = post.content;
      document.getElementById("post-form-title").textContent = `${noun} 수정 (#${post.id})`;
      document.getElementById("post-submit").textContent = "수정 저장";
      document.getElementById("post-cancel").hidden = false;
      document.getElementById("form-status").textContent = "";
      document.getElementById("post-form").scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function resetForm() {
      editingId = null;
      document.getElementById("post-form").reset();
      document.getElementById("post-form-title").textContent = `새 ${noun} 쓰기`;
      document.getElementById("post-submit").textContent = "등록";
      document.getElementById("post-cancel").hidden = true;
    }

    function openPost(id) {
      const post = postsCache.find(p => String(p.id) === String(id));
      if (!post) return;
      currentPostId = post.id;

      document.getElementById("modal-title").textContent = post.title;
      document.getElementById("modal-meta").textContent =
        `번호 ${post.id} · 작성자 ${post.author_name || "미등록"} · 작성일 ${post.created_at || ""}`;
      document.getElementById("modal-content").textContent = post.content;
      document.getElementById("comment-status").textContent = "";
      document.getElementById("comment-form").reset();
      document.getElementById("post-modal").hidden = false;
      loadComments();
    }

    function closePost() {
      document.getElementById("post-modal").hidden = true;
      currentPostId = null;
    }

    async function loadComments() {
      const listEl = document.getElementById("comment-list");
      listEl.innerHTML = "<li>불러오는 중...</li>";
      try {
        const res = await SAPAuth.apiFetch(`${API_BASE}/${currentPostId}/comments`);
        if (!res.ok) throw new Error();
        const items = await res.json();
        if (items.length === 0) {
          listEl.innerHTML = '<li class="comment-empty">아직 댓글이 없습니다.</li>';
          return;
        }
        listEl.innerHTML = items.map(c => `
          <li>
            <span class="comment-body">${escapeHtml(c.content)}<br><span class="comment-meta">${escapeHtml(c.author_name || "-")} · ${escapeHtml(c.created_at || "")}</span></span>
            ${canModify(c.author_name) ? `<button type="button" class="delete-btn" data-comment-id="${c.id}">삭제</button>` : ""}
          </li>
        `).join("");
        listEl.querySelectorAll("[data-comment-id]").forEach(btn => {
          btn.addEventListener("click", () => deleteComment(btn.dataset.commentId));
        });
      } catch {
        listEl.innerHTML = '<li class="comment-empty">댓글을 불러오지 못했습니다.</li>';
      }
    }

    async function deleteComment(commentId) {
      await SAPAuth.apiFetch(`${API_BASE}/${currentPostId}/comments/${commentId}`, { method: "DELETE" });
      loadComments();
    }

    async function deletePost(id) {
      if (!confirm(`이 ${object} 삭제할까요? 달린 댓글도 함께 삭제됩니다.`)) return;
      await SAPAuth.apiFetch(`${API_BASE}/${id}`, { method: "DELETE" });
      if (editingId === id) resetForm();
      loadPosts();
    }

    document.getElementById("post-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = document.getElementById("title").value.trim();
      const content = document.getElementById("content").value.trim();
      const statusEl = document.getElementById("form-status");
      const editing = editingId;

      try {
        const body = category ? { title, content, category } : { title, content };
        const res = await SAPAuth.apiFetch(editing ? `${API_BASE}/${editing}` : API_BASE, {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error();

        statusEl.textContent = editing ? "수정되었습니다." : "등록되었습니다.";
        resetForm();
        loadPosts();
      } catch (err) {
        statusEl.textContent = editing ? "수정 실패 — 서버 연결을 확인하세요." : "등록 실패 — 서버 연결을 확인하세요.";
      }
    });

    document.getElementById("post-cancel").addEventListener("click", () => {
      resetForm();
      document.getElementById("form-status").textContent = "";
    });

    document.getElementById("filter-form").addEventListener("submit", (e) => {
      e.preventDefault();
      loadPosts();
    });
    document.getElementById("filter-reset").addEventListener("click", () => {
      document.getElementById("search").value = "";
      document.getElementById("filter-status").textContent = "";
      loadPosts();
    });

    document.getElementById("comment-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const input = document.getElementById("comment-input");
      const statusEl = document.getElementById("comment-status");
      const content = input.value.trim();
      if (!content || !currentPostId) return;
      try {
        const res = await SAPAuth.apiFetch(`${API_BASE}/${currentPostId}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
        if (!res.ok) throw new Error();
        statusEl.textContent = "";
        input.value = "";
        loadComments();
      } catch (err) {
        statusEl.textContent = "댓글 등록에 실패했습니다.";
      }
    });

    document.getElementById("modal-close").addEventListener("click", closePost);
    document.getElementById("post-modal").addEventListener("click", (e) => {
      if (e.target.id === "post-modal") closePost();
    });

    SAPAuth.requireSession().then(user => {
      if (user?.unavailable) {
        document.getElementById("post-list").innerHTML = '<tr><td colspan="5">인증 서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.</td></tr>';
        return;
      }
      if (!user) return;
      if (formAdminOnly) document.getElementById("post-form").hidden = !user.isAdmin;
      loadPosts();
    });
  }

  window.SAPPosts = { mount };
})();
