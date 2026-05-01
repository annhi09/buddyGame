const q = (id) => document.getElementById(id);

function getToken() {
  return localStorage.getItem("sb_token") || "";
}

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("sb_user") || "null");
  } catch {
    return null;
  }
}

function setStatus(id, text, type = "muted") {
  const el = q(id);
  if (!el) return;
  el.textContent = text;
  el.style.color =
    type === "error" ? "#c62828" :
    type === "success" ? "#0e9c62" :
    "#66728c";
}

async function api(path, options = {}) {
  const token = getToken();
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
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

function readProfileForm() {
  return {
    studio_name: q("market-studio-name")?.value?.trim() || "",
    bio: q("market-bio")?.value?.trim() || "",
    country: q("market-country")?.value?.trim() || "",
  };
}

function fillProfileForm(profile = {}) {
  if (q("market-studio-name")) q("market-studio-name").value = profile.studio_name || "";
  if (q("market-bio")) q("market-bio").value = profile.bio || "";
  if (q("market-country")) q("market-country").value = profile.country || "";
}

function readPackForm() {
  return {
    type: q("market-pack-type")?.value || "reading",
    title: q("market-pack-title")?.value?.trim() || "",
    short_description: q("market-pack-short")?.value?.trim() || "",
    long_description: q("market-pack-long")?.value?.trim() || "",
    age_min: Number(q("market-pack-age-min")?.value || 3),
    age_max: Number(q("market-pack-age-max")?.value || 6),
    category: q("market-pack-category")?.value?.trim() || "",
    language: q("market-pack-language")?.value || "en",
    price_cents: Number(q("market-pack-price")?.value || 299),
  };
}

function fillPackForm(pack = null) {
  if (!pack) {
    q("market-pack-id").value = "";
    q("market-pack-type").value = "reading";
    q("market-pack-title").value = "";
    q("market-pack-short").value = "";
    q("market-pack-long").value = "";
    q("market-pack-age-min").value = 3;
    q("market-pack-age-max").value = 6;
    q("market-pack-category").value = "";
    q("market-pack-language").value = "en";
    q("market-pack-price").value = "299";
    setStatus("market-pack-status", "New marketplace draft ready.", "success");
    return;
  }

  q("market-pack-id").value = pack.id || "";
  q("market-pack-type").value = pack.type || "reading";
  q("market-pack-title").value = pack.title || "";
  q("market-pack-short").value = pack.short_description || "";
  q("market-pack-long").value = pack.long_description || "";
  q("market-pack-age-min").value = pack.age_min ?? 3;
  q("market-pack-age-max").value = pack.age_max ?? 6;
  q("market-pack-category").value = pack.category || "";
  q("market-pack-language").value = pack.language || "en";
  q("market-pack-price").value = String(pack.price_cents ?? 299);

  setStatus("market-pack-status", `Editing draft: ${pack.title || "Untitled"}`, "success");
}

function money(cents) {
  return `$${(Number(cents || 0) / 100).toFixed(2)}`;
}

function renderPackList(packs = []) {
  const wrap = q("market-pack-list");
  if (!wrap) return;

  if (!packs.length) {
    wrap.innerHTML = `<div class="empty-line">No marketplace packs yet.</div>`;
    return;
  }

  wrap.innerHTML = packs.map(pack => `
    <div class="market-pack">
      <div class="market-pack-top">
        <div>
          <div class="market-pack-title">${pack.title || "Untitled Pack"}</div>
          <div class="muted-line">${pack.short_description || "No short description yet."}</div>
        </div>
        <div class="market-pill">${money(pack.price_cents)}</div>
      </div>

      <div class="market-pack-meta">
        <span class="market-pill">${pack.type || "reading"}</span>
        <span class="market-pill">${pack.language || "en"}</span>
        <span class="market-pill">${pack.category || "General"}</span>
        <span class="market-pill">${pack.status || "draft"}</span>
        <span class="market-pill">Ages ${pack.age_min ?? 3}-${pack.age_max ?? 6}</span>
      </div>

      <div class="market-pack-actions">
        <button class="btn btn-primary market-edit-btn" data-id="${pack.id}">Edit</button>
        <button class="btn btn-green market-submit-btn" data-id="${pack.id}">Submit</button>
      </div>
    </div>
  `).join("");

  wrap.querySelectorAll(".market-edit-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const pack = packs.find(p => String(p.id) === String(btn.dataset.id));
      if (pack) fillPackForm(pack);
    });
  });

  wrap.querySelectorAll(".market-submit-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      await submitPack(btn.dataset.id);
    });
  });
}

async function loadCreatorProfile() {
  const token = getToken();
  if (!token) {
    fillProfileForm({});
    setStatus("market-profile-status", "Login to load your creator profile.", "error");
    return null;
  }

  try {
    const data = await api("/api/creator/profile");
    fillProfileForm(data.profile || {});
    setStatus("market-profile-status", "Creator profile loaded.", "success");
    return data.profile || null;
  } catch (err) {
    fillProfileForm({});
    setStatus("market-profile-status", err.message || "Load creator profile failed", "error");
    return null;
  }
}

async function saveCreatorProfile() {
  const token = getToken();
  if (!token) {
    setStatus("market-profile-status", "Login required.", "error");
    return;
  }

  try {
    const payload = readProfileForm();
    const data = await api("/api/creator/profile", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    fillProfileForm(data.profile || payload);
    setStatus("market-profile-status", "Creator profile saved.", "success");
  } catch (err) {
    setStatus("market-profile-status", err.message || "Save creator profile failed", "error");
  }
}

async function loadCreatorPacks() {
  const token = getToken();
  if (!token) {
    renderPackList([]);
    setStatus("market-packs-status", "Login to load marketplace packs.", "error");
    return [];
  }

  try {
    const data = await api("/api/creator/packs");
    renderPackList(data.packs || []);
    setStatus("market-packs-status", `${(data.packs || []).length} marketplace pack(s) loaded.`, "success");
    return data.packs || [];
  } catch (err) {
    renderPackList([]);
    setStatus("market-packs-status", err.message || "Load marketplace packs failed", "error");
    return [];
  }
}

async function savePackDraft() {
  const token = getToken();
  if (!token) {
    setStatus("market-pack-status", "Login required.", "error");
    return;
  }

  const payload = readPackForm();
  if (!payload.title) {
    setStatus("market-pack-status", "Title is required.", "error");
    return;
  }

  try {
    const packId = q("market-pack-id")?.value?.trim() || "";
    let pack;

    if (packId) {
      const data = await api(`/api/creator/packs/${packId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      pack = data.pack;
      setStatus("market-pack-status", "Marketplace draft updated.", "success");
    } else {
      const data = await api("/api/creator/packs", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      pack = data.pack;
      setStatus("market-pack-status", "Marketplace draft created.", "success");
    }

    fillPackForm(pack);
    await loadCreatorPacks();
  } catch (err) {
    setStatus("market-pack-status", err.message || "Save marketplace draft failed", "error");
  }
}

async function submitPack(packIdFromButton = "") {
  const token = getToken();
  if (!token) {
    setStatus("market-pack-status", "Login required.", "error");
    return;
  }

  try {
    const packId = String(packIdFromButton || q("market-pack-id")?.value || "").trim();
    if (!packId) {
      setStatus("market-pack-status", "Save the draft first.", "error");
      return;
    }

    await api(`/api/creator/packs/${packId}/submit`, {
      method: "POST",
    });

    setStatus("market-pack-status", "Pack submitted for review.", "success");
    await loadCreatorPacks();
  } catch (err) {
    setStatus("market-pack-status", err.message || "Submit for review failed", "error");
  }
}

function bindEvents() {
  q("market-save-profile-btn")?.addEventListener("click", saveCreatorProfile);
  q("market-refresh-packs-btn")?.addEventListener("click", loadCreatorPacks);
  q("market-new-pack-btn")?.addEventListener("click", () => fillPackForm(null));
  q("market-save-pack-btn")?.addEventListener("click", savePackDraft);
  q("market-submit-pack-btn")?.addEventListener("click", () => submitPack(""));

  window.addEventListener("storage", (e) => {
    if (e.key === "sb_token" || e.key === "sb_user") {
      initMarketplaceDashboard();
    }
  });
}

async function initMarketplaceDashboard() {
  const user = getCurrentUser();
  if (!getToken()) {
    setStatus("market-profile-status", "Login to save your creator profile.", "error");
    setStatus("market-packs-status", "Login to load marketplace packs.", "error");
    setStatus("market-pack-status", "Login to create marketplace drafts.", "error");
    renderPackList([]);
    return;
  }

  await loadCreatorProfile();
  await loadCreatorPacks();

  if (user) {
    setStatus("market-profile-status", `Ready as ${user.display_name || user.email}`, "success");
  }
}

bindEvents();
initMarketplaceDashboard();

window.BuddyCreatorDashboard = {
  initMarketplaceDashboard,
  loadCreatorProfile,
  loadCreatorPacks,
  saveCreatorProfile,
  savePackDraft,
  submitPack,
};
