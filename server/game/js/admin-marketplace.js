function el(id) {
  return document.getElementById(id);
}

function getAuthToken() {
  return localStorage.getItem("sb_token") || "";
}

async function api(path, options = {}) {
  const token = getAuthToken();
  const res = await fetch(path, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.ok === false) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }

  return data;
}

const state = {
  packs: [],
  selectedPackId: "",
};

function formatDateTime(value = "") {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value || "—";
  }
}

function renderTimeline(pack) {
  const items = Array.isArray(pack.status_timeline) ? pack.status_timeline : [];
  if (!items.length) return `<div class="muted">No timeline yet.</div>`;

  return `
    <div style="display:flex; flex-direction:column; gap:8px;">
      ${items.map(item => `
        <div style="display:flex; justify-content:space-between; gap:12px; padding:8px 10px; border:1px solid #e7eeff; border-radius:12px; background:#fbfcff;">
          <strong>${item.label}</strong>
          <span class="muted">${formatDateTime(item.at)}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function renderReviewHistory(pack) {
  const events = Array.isArray(pack.review_history) ? pack.review_history : [];
  if (!events.length) {
    return `<div class="muted">No review history yet.</div>`;
  }

  return `
    <div style="display:flex; flex-direction:column; gap:10px;">
      ${events.map(event => `
        <div style="padding:10px 12px; border:1px solid #e7eeff; border-radius:14px; background:#fff;">
          <div style="display:flex; justify-content:space-between; gap:12px; align-items:center;">
            <strong>${String(event.action || "").toUpperCase()}</strong>
            <span class="muted">${formatDateTime(event.created_at)}</span>
          </div>
          <div class="muted" style="margin-top:4px;">Reviewer: ${event.reviewer_email || "Unknown"}</div>
          ${
            String(event.note || "").trim()
              ? `<div style="margin-top:8px; color:#22314f;">${event.note}</div>`
              : `<div class="muted" style="margin-top:8px;">No note.</div>`
          }
        </div>
      `).join("")}
    </div>
  `;
}

function matchesFilters(pack) {
  const q = String(el("search-input")?.value || "").trim().toLowerCase();
  const status = String(el("status-filter")?.value || "").trim().toLowerCase();

  if (status && String(pack.status || "").toLowerCase() !== status) return false;
  if (!q) return true;

  const hay = [
    pack.title,
    pack.short_description,
    pack.long_description,
    pack.creator_email,
    pack.type,
    pack.category,
    pack.language,
    pack.review_notes,
  ].join(" ").toLowerCase();

  return hay.includes(q);
}

function render() {
  const list = el("admin-list");
  const filtered = state.packs.filter(matchesFilters);

  el("admin-status").textContent = `${filtered.length} pack(s)`;

  if (!filtered.length) {
    list.innerHTML = `<div class="muted">No packs found.</div>`;
    return;
  }

  list.innerHTML = filtered.map(pack => `
    <div class="card">
      ${
        pack.resolved_cover_url || pack.cover_url || pack.thumbnail_url
          ? `<img class="thumb" src="${pack.resolved_cover_url || pack.cover_url || pack.thumbnail_url}" alt="${pack.title || "Pack"}" onerror="this.style.display='none'" />`
          : ``
      }

      <h3 style="margin:0 0 6px;">${pack.title || "Untitled Pack"}</h3>
      <div class="muted">${pack.type || "pack"} • ${pack.language || "en"}</div>
      <div class="muted">${pack.category || "General"}</div>
      <div class="muted">Creator: ${pack.creator_email || "Unknown"}</div>
      <div class="muted">Reviewer: ${pack.reviewer_email || "—"}</div>
      <div class="muted">Price: $${(Number(pack.price_cents || 0) / 100).toFixed(2)}</div>
      <div class="tag">${pack.status || "draft"}</div>

      ${
        String(pack.review_notes || "").trim()
          ? `<div class="muted" style="margin-top:10px;"><strong>Latest Note:</strong> ${pack.review_notes}</div>`
          : ``
      }

      <div class="muted" style="margin-top:8px;">Reviewed: ${formatDateTime(pack.reviewed_at)}</div>
      <div class="muted">Approved: ${formatDateTime(pack.approved_at)}</div>
      <div class="muted">Rejected: ${formatDateTime(pack.rejected_at)}</div>
      <div class="muted">Published: ${formatDateTime(pack.published_at)}</div>

      <div class="row">
        <button class="preview-btn secondary" data-id="${pack.id}">Preview</button>
        <button class="approve-btn green" data-id="${pack.id}">Approve</button>
        <button class="reject-btn danger" data-id="${pack.id}">Reject</button>
        <button class="publish-btn" data-id="${pack.id}">Publish</button>
      </div>
    </div>
  `).join("");

  list.querySelectorAll(".approve-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      await approvePack(btn.dataset.id, "");
    });
  });

  list.querySelectorAll(".reject-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const reason = prompt("Reason for rejection?") || "";
      if (!reason.trim()) return;
      await rejectPack(btn.dataset.id, reason);
    });
  });

  list.querySelectorAll(".publish-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      await publishPack(btn.dataset.id, "");
    });
  });

  list.querySelectorAll(".preview-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      await openPreview(btn.dataset.id);
    });
  });
}

async function loadAdminPacks() {
  try {
    el("admin-status").textContent = "Loading review queue...";
    const status = encodeURIComponent(el("status-filter")?.value || "");
    const data = await api(`/api/admin/packs?status=${status}`);
    state.packs = data.packs || [];
    render();
  } catch (err) {
    el("admin-status").textContent = err.message || "Admin error";
    el("admin-list").innerHTML = "";
  }
}

async function approvePack(id, note = "") {
  await api(`/api/admin/packs/${id}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ note }),
  });
  await loadAdminPacks();
  if (state.selectedPackId === id) await openPreview(id);
}

async function rejectPack(id, reason) {
  await api(`/api/admin/packs/${id}/reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  await loadAdminPacks();
  if (state.selectedPackId === id) await openPreview(id);
}

async function publishPack(id, note = "") {
  await api(`/api/admin/packs/${id}/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ note }),
  });
  await loadAdminPacks();
  if (state.selectedPackId === id) await openPreview(id);
}

function openPreviewModal() {
  const modal = el("admin-preview-modal");
  if (!modal) return;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}

function closePreviewModal() {
  const modal = el("admin-preview-modal");
  if (!modal) return;

  const active = document.activeElement;
  if (active && modal.contains(active) && typeof active.blur === "function") {
    active.blur();
  }

  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
}

async function openPreview(id) {
  try {
    state.selectedPackId = id;

    const data = await api(`/api/admin/packs/${id}`);
    const pack = data.pack;
    if (!pack) throw new Error("Pack not found");

    el("admin-preview-title").textContent = pack.title || "Pack Preview";

    const cover = pack.resolved_cover_url || pack.cover_url || pack.thumbnail_url || "";
    const currentNote = String(pack.review_notes || "").trim();

    el("admin-preview-body").innerHTML = `
      <div class="preview-grid">
        <div>
          ${
            cover
              ? `<img class="preview-cover" src="${cover}" alt="${pack.title || "Pack"}" onerror="this.style.display='none'" />`
              : `<div class="preview-fallback">📚</div>`
          }
        </div>

        <div>
          <div class="muted">Creator: ${pack.creator_email || "Unknown"}</div>
          <div class="muted">Reviewer: ${pack.reviewer_email || "—"}</div>

          <div class="preview-tags">
            <span class="preview-tag">${pack.status || "draft"}</span>
            <span class="preview-tag">${pack.type || "pack"}</span>
            <span class="preview-tag">${pack.language || "en"}</span>
            <span class="preview-tag">${pack.category || "General"}</span>
            <span class="preview-tag">Ages ${pack.age_min ?? 3}-${pack.age_max ?? 6}</span>
            <span class="preview-tag">$${(Number(pack.price_cents || 0) / 100).toFixed(2)}</span>
          </div>

          <div style="margin-top:14px;">
            <strong>Short Description</strong>
            <div class="muted" style="margin-top:6px;">${pack.short_description || "No short description."}</div>
          </div>

          <div style="margin-top:14px;">
            <strong>Long Description</strong>
            <div class="muted" style="margin-top:6px;">${pack.long_description || "No long description."}</div>
          </div>

          <div style="margin-top:14px;">
            <strong>Latest Review Note</strong>
            <div class="muted" style="margin-top:6px;">${currentNote || "No review note yet."}</div>
          </div>

          <div style="margin-top:14px;">
            <strong>Status Timeline</strong>
            <div style="margin-top:8px;">${renderTimeline(pack)}</div>
          </div>

          <div style="margin-top:14px;">
            <strong>Review History</strong>
            <div style="margin-top:8px;">${renderReviewHistory(pack)}</div>
          </div>

          <div style="margin-top:16px;">
            <label for="admin-review-note" style="font-weight:900;">Admin Note</label>
            <textarea id="admin-review-note" style="width:100%; min-height:100px; margin-top:8px;" placeholder="Write an approval, rejection, or publish note...">${currentNote}</textarea>
          </div>

          <div class="row" style="margin-top:16px;">
            <button id="admin-approve-action" class="approve-btn green" type="button">Approve</button>
            <button id="admin-reject-action" class="reject-btn danger" type="button">Reject</button>
            <button id="admin-publish-action" class="publish-btn" type="button">Publish</button>
          </div>
        </div>
      </div>
    `;

    el("admin-approve-action")?.addEventListener("click", async () => {
      const note = String(el("admin-review-note")?.value || "").trim();
      await approvePack(id, note);
    });

    el("admin-reject-action")?.addEventListener("click", async () => {
      const reason = String(el("admin-review-note")?.value || "").trim();
      if (!reason) {
        alert("Rejection reason is required.");
        return;
      }
      await rejectPack(id, reason);
    });

    el("admin-publish-action")?.addEventListener("click", async () => {
      const note = String(el("admin-review-note")?.value || "").trim();
      await publishPack(id, note);
    });

    openPreviewModal();
  } catch (err) {
    alert(err.message || "Preview failed");
  }
}

el("refresh-btn")?.addEventListener("click", loadAdminPacks);
el("search-input")?.addEventListener("input", render);
el("status-filter")?.addEventListener("change", loadAdminPacks);
el("admin-preview-close-btn")?.addEventListener("click", closePreviewModal);
el("admin-preview-modal")?.addEventListener("click", (e) => {
  if (e.target === el("admin-preview-modal")) closePreviewModal();
});

loadAdminPacks();



// function el(id) {
//   return document.getElementById(id);
// }

// function getAuthToken() {
//   return localStorage.getItem("sb_token") || "";
// }

// async function api(path, options = {}) {
//   const token = getAuthToken();
//   const res = await fetch(path, {
//     ...options,
//     headers: {
//       ...(token ? { Authorization: `Bearer ${token}` } : {}),
//       ...(options.headers || {}),
//     },
//   });

//   const data = await res.json().catch(() => ({}));

//   if (!res.ok || data.ok === false) {
//     throw new Error(data.error || `Request failed: ${res.status}`);
//   }

//   return data;
// }

// const state = {
//   packs: [],
// };

// function matchesFilters(pack) {
//   const q = String(el("search-input")?.value || "").trim().toLowerCase();
//   const status = String(el("status-filter")?.value || "").trim().toLowerCase();

//   if (status && String(pack.status || "").toLowerCase() !== status) return false;
//   if (!q) return true;

//   const hay = [
//     pack.title,
//     pack.short_description,
//     pack.long_description,
//     pack.creator_email,
//     pack.type,
//     pack.category,
//     pack.language,
//     pack.review_notes,
//   ].join(" ").toLowerCase();

//   return hay.includes(q);
// }

// function render() {
//   const list = el("admin-list");
//   const filtered = state.packs.filter(matchesFilters);

//   el("admin-status").textContent = `${filtered.length} pack(s)`;

//   if (!filtered.length) {
//     list.innerHTML = `<div class="muted">No packs found.</div>`;
//     return;
//   }

//   list.innerHTML = filtered.map(pack => `
//     <div class="card">
//       ${
//         pack.resolved_cover_url || pack.cover_url || pack.thumbnail_url
//           ? `<img class="thumb" src="${pack.resolved_cover_url || pack.cover_url || pack.thumbnail_url}" alt="${pack.title || "Pack"}" onerror="this.style.display='none'" />`
//           : ``
//       }

//       <h3 style="margin:0 0 6px;">${pack.title || "Untitled Pack"}</h3>
//       <div class="muted">${pack.type || "pack"} • ${pack.language || "en"}</div>
//       <div class="muted">${pack.category || "General"}</div>
//       <div class="muted">Creator: ${pack.creator_email || "Unknown"}</div>
//       <div class="muted">Price: $${(Number(pack.price_cents || 0) / 100).toFixed(2)}</div>
//       <div class="tag">${pack.status || "draft"}</div>

//       ${
//         String(pack.status || "").toLowerCase() === "rejected" && String(pack.review_notes || "").trim()
//           ? `<div class="muted" style="margin-top:10px; color:#b54848;"><strong>Reason:</strong> ${pack.review_notes}</div>`
//           : ``
//       }

//       <div class="row">
//         <button class="preview-btn secondary" data-id="${pack.id}">Preview</button>
//         <button class="approve-btn green" data-id="${pack.id}">Approve</button>
//         <button class="reject-btn danger" data-id="${pack.id}">Reject</button>
//         <button class="publish-btn" data-id="${pack.id}">Publish</button>
//       </div>
//     </div>
//   `).join("");

//   list.querySelectorAll(".approve-btn").forEach(btn => {
//     btn.addEventListener("click", async () => {
//       await approvePack(btn.dataset.id);
//     });
//   });

//   list.querySelectorAll(".reject-btn").forEach(btn => {
//     btn.addEventListener("click", async () => {
//       const reason = prompt("Reason for rejection?") || "";
//       if (!reason.trim()) return;
//       await rejectPack(btn.dataset.id, reason);
//     });
//   });

//   list.querySelectorAll(".publish-btn").forEach(btn => {
//     btn.addEventListener("click", async () => {
//       await publishPack(btn.dataset.id);
//     });
//   });

//   list.querySelectorAll(".preview-btn").forEach(btn => {
//     btn.addEventListener("click", async () => {
//       await openPreview(btn.dataset.id);
//     });
//   });
// }

// async function loadAdminPacks() {
//   try {
//     el("admin-status").textContent = "Loading review queue...";
//     const status = encodeURIComponent(el("status-filter")?.value || "");
//     const data = await api(`/api/admin/packs?status=${status}`);
//     state.packs = data.packs || [];
//     render();
//   } catch (err) {
//     el("admin-status").textContent = err.message || "Admin error";
//     el("admin-list").innerHTML = "";
//   }
// }

// async function approvePack(id) {
//   await api(`/api/admin/packs/${id}/approve`, { method: "POST" });
//   await loadAdminPacks();
// }

// async function rejectPack(id, reason) {
//   await api(`/api/admin/packs/${id}/reject`, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ reason }),
//   });
//   await loadAdminPacks();
// }

// function openPreviewModal() {
//   const modal = el("admin-preview-modal");
//   if (!modal) return;
//   modal.classList.add("open");
//   modal.setAttribute("aria-hidden", "false");
// }

// function closePreviewModal() {
//   const modal = el("admin-preview-modal");
//   if (!modal) return;

//   const active = document.activeElement;
//   if (active && modal.contains(active) && typeof active.blur === "function") {
//     active.blur();
//   }

//   modal.classList.remove("open");
//   modal.setAttribute("aria-hidden", "true");
// }

// async function openPreview(id) {
//   try {
//     const data = await api(`/api/admin/packs/${id}`);
//     const pack = data.pack;
//     if (!pack) throw new Error("Pack not found");

//     el("admin-preview-title").textContent = pack.title || "Pack Preview";

//     const cover = pack.resolved_cover_url || pack.cover_url || pack.thumbnail_url || "";
//     const rejection = String(pack.review_notes || "").trim();

//     el("admin-preview-body").innerHTML = `
//       <div class="preview-grid">
//         <div>
//           ${
//             cover
//               ? `<img class="preview-cover" src="${cover}" alt="${pack.title || "Pack"}" onerror="this.style.display='none'" />`
//               : `<div class="preview-fallback">📚</div>`
//           }
//         </div>

//         <div>
//           <div class="muted">Creator: ${pack.creator_email || "Unknown"}</div>
//           <div class="preview-tags">
//             <span class="preview-tag">${pack.status || "draft"}</span>
//             <span class="preview-tag">${pack.type || "pack"}</span>
//             <span class="preview-tag">${pack.language || "en"}</span>
//             <span class="preview-tag">${pack.category || "General"}</span>
//             <span class="preview-tag">Ages ${pack.age_min ?? 3}-${pack.age_max ?? 6}</span>
//             <span class="preview-tag">$${(Number(pack.price_cents || 0) / 100).toFixed(2)}</span>
//           </div>

//           <div style="margin-top:14px;">
//             <strong>Short Description</strong>
//             <div class="muted" style="margin-top:6px;">${pack.short_description || "No short description."}</div>
//           </div>

//           <div style="margin-top:14px;">
//             <strong>Long Description</strong>
//             <div class="muted" style="margin-top:6px;">${pack.long_description || "No long description."}</div>
//           </div>

//           ${
//             rejection
//               ? `
//                 <div style="margin-top:14px;">
//                   <strong>Rejection Reason</strong>
//                   <div class="muted" style="margin-top:6px; color:#b54848;">${rejection}</div>
//                 </div>
//               `
//               : ``
//           }
//         </div>
//       </div>
//     `;

//     openPreviewModal();
//   } catch (err) {
//     alert(err.message || "Preview failed");
//   }
// }

// async function publishPack(id) {
//   await api(`/api/admin/packs/${id}/publish`, { method: "POST" });
//   await loadAdminPacks();
// }

// el("refresh-btn")?.addEventListener("click", loadAdminPacks);
// el("search-input")?.addEventListener("input", render);
// el("status-filter")?.addEventListener("change", loadAdminPacks);
// el("admin-preview-close-btn")?.addEventListener("click", closePreviewModal);
// el("admin-preview-modal")?.addEventListener("click", (e) => {
//   if (e.target === el("admin-preview-modal")) closePreviewModal();
// });

// loadAdminPacks();
