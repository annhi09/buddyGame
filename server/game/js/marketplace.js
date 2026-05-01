import { previewPackInPlace } from "./pack-preview.js";

const state = {
  packs: [],
  ownedPackIds: new Set(),
  ownedPackMap: new Map(),
  activeAccessTab: "all",
};

function el(id) {
  return document.getElementById(id);
}

// async function api(path, options = {}) {
//   const res = await fetch(path, options);
//   return res.json();
// }

async function api(path, options = {}) {
  const res = await fetch(path, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return data;
}

// function matchesFilters(pack) {
//   const search = (el("search-input")?.value || "").trim().toLowerCase();
//   const type = el("type-filter")?.value || "";

//   if (type && pack.type !== type) return false;
//   if (!search) return true;

//   const hay = [
//     pack.title,
//     pack.short_description,
//     pack.long_description,
//     pack.category,
//     pack.language,
//   ].join(" ").toLowerCase();

//   return hay.includes(search);
// }

function formatAccessMode(value = "") {
  return value === "free_library" ? "Free Library" : "Paid";
}

function formatLicenseType(value = "") {
  switch (String(value || "").toLowerCase()) {
    case "classroom": return "Classroom License";
    case "school": return "School License";
    case "personal":
    default:
      return "Personal License";
  }
}

function formatExportPolicy(value = "") {
  switch (String(value || "").toLowerCase()) {
    case "owner_backup": return "Owner Backup";
    case "classroom_only": return "Classroom Sharing";
    case "full": return "Full Export";
    case "none":
    default:
      return "No Export";
  }
}

function matchesFilters(pack) {
  const search = (el("search-input")?.value || "").trim().toLowerCase();
  const type = el("type-filter")?.value || "";
  const access = el("access-filter")?.value || "";

  if (!matchesAccessTab(pack)) return false;
  if (type && pack.type !== type) return false;
  if (access && String(pack.access_mode || "paid") !== access) return false;
  if (!search) return true;

  const hay = [
    pack.title,
    pack.short_description,
    pack.long_description,
    pack.category,
    pack.language,
    pack.license_type,
    pack.access_mode,
    pack.export_policy,
  ].join(" ").toLowerCase();

  return hay.includes(search);
}

function isPackOwned(packId){
  return state.ownedPackIds.has(String(packId));
}

function getOwnedPackRecord(packId){
  return state.ownedPackMap.get(String(packId)) || null;
}

function getPackCtaMeta(pack){
  const owned = isPackOwned(pack.id);
  const ownedItem = getOwnedPackRecord(pack.id);
  const isFree = String(pack.access_mode || "").toLowerCase() === "free_library";

  if(owned){
    const hasUpdate =
      Number(ownedItem?.latest_version || 0) > Number(ownedItem?.downloaded_version || 0);

    if(hasUpdate){
      return {
        label: "🔄 Update Available",
        disabled: false,
        kind: "update"
      };
    }

    return {
      label: "✅ Already in Your Library",
      disabled: true,
      kind: "owned"
    };
  }

  return {
    label: isFree ? "➕ Add Free Pack" : "🛒 Buy This Pack",
    disabled: false,
    kind: isFree ? "free" : "buy"
  };
}

function getActiveAccessTab(){
  return state.activeAccessTab || "all";
}

function setActiveAccessTab(value){
  state.activeAccessTab = value || "all";

  document.querySelectorAll(".market-tab").forEach(btn => {
    const isActive = btn.dataset.accessTab === state.activeAccessTab;
    btn.classList.toggle("active", isActive);
    btn.style.opacity = isActive ? "1" : "0.85";
    btn.style.transform = isActive ? "translateY(-1px)" : "";
  });

  render();
}

function matchesAccessTab(pack){
  const tab = getActiveAccessTab();
  const accessMode = String(pack.access_mode || "paid").toLowerCase();

  if(tab === "all") return true;
  if(tab === "paid") return accessMode !== "free_library";
  if(tab === "free_library") return accessMode === "free_library";

  return true;
}

function renderFeaturedFreeSection(){
  const wrap = el("featured-free-wrap");
  const list = el("featured-free-list");
  if(!wrap || !list) return;

  const tab = getActiveAccessTab();
  const freePacks = state.packs
    .filter(pack => String(pack.access_mode || "").toLowerCase() === "free_library")
    .slice(0, 3);

  if(tab !== "all" || !freePacks.length){
    wrap.style.display = "none";
    list.innerHTML = "";
    return;
  }

  wrap.style.display = "";
  list.innerHTML = freePacks.map(pack => {
    const cover = pack.resolved_cover_url || pack.cover_url || pack.thumbnail_url || "";
    const ctaMeta = getPackCtaMeta(pack);

    return `
      <div class="card">
        <div class="card-top">
          <div>
            ${
              cover
                ? `<img class="thumb" src="${cover}" alt="${pack.title || "Pack"}" onerror="this.style.display='none'" />`
                : `<div class="thumb-fallback">📚</div>`
            }
          </div>

          <div>
            <div class="card-title">${pack.title || "Untitled Pack"}</div>
            <div class="card-sub">${pack.short_description || "No short description yet."}</div>
            <div class="price">Free</div>
          </div>
        </div>

        <div class="item-meta">
          <span class="tag free">Free Library</span>
          <span class="tag">${pack.type || "pack"}</span>
          <span class="tag">${pack.language || "en"}</span>
          <span class="tag">Ages ${pack.age_min ?? 3}-${pack.age_max ?? 6}</span>
        </div>

        <div class="row">
          <button class="btn btn-soft preview-btn" data-pack-id="${pack.id}" type="button">👁️ Preview</button>
          <button
            class="btn btn-primary buy-btn"
            data-pack-id="${pack.id}"
            type="button"
            ${ctaMeta.disabled ? "disabled" : ""}
            style="${ctaMeta.disabled ? "opacity:.75;cursor:default;" : ""}"
          >
            ${ctaMeta.label}
          </button>
        </div>
      </div>
    `;
  }).join("");

  list.querySelectorAll(".preview-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      await previewPackInPlace(btn.dataset.packId);
    });
  });

  list.querySelectorAll(".buy-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      if(btn.disabled) return;
      await buyPack(btn.dataset.packId);
    });
  });
}

function render() {
  const list = el("marketplace-list");
  const filtered = state.packs.filter(matchesFilters);
  renderFeaturedFreeSection();

  el("marketplace-status").textContent = `${filtered.length} pack(s)`;

  if (!filtered.length) {
    const tab = getActiveAccessTab();
    const msg =
      tab === "paid"
        ? "No paid marketplace packs found."
        : tab === "free_library"
        ? "No free library packs found."
        : "No packs found.";
    list.innerHTML = `<div class="empty">${msg}</div>`;
    return;
  }

  list.innerHTML = filtered.map(pack => {
    const cover = pack.resolved_cover_url || pack.cover_url || pack.thumbnail_url || "";
    const isFree = String(pack.access_mode || "") === "free_library";
    const priceText = isFree
      ? "Free"
      : `$${((Number(pack.price_cents || 0)) / 100).toFixed(2)}`;

      const ctaMeta = getPackCtaMeta(pack);

    return `
      <div class="card">
        <div class="card-top">
          <div>
            ${
              cover
                ? `<img class="thumb" src="${cover}" alt="${pack.title || "Pack"}" onerror="this.style.display='none'" />`
                : `<div class="thumb-fallback">📚</div>`
            }
          </div>

          <div>
            <div class="card-title">${pack.title || "Untitled Pack"}</div>
            <div class="card-sub">${pack.short_description || "No short description yet."}</div>
            <div class="price">${priceText}</div>
          </div>
        </div>

        <div class="item-meta">
          <span class="tag">${pack.type || "pack"}</span>
          <span class="tag">${pack.language || "en"}</span>
          <span class="tag">${pack.category || "General"}</span>
          <span class="tag">Ages ${pack.age_min ?? 3}-${pack.age_max ?? 6}</span>
          <span class="tag ${isFree ? "free" : ""}">${formatAccessMode(pack.access_mode)}</span>
          <span class="tag">${formatLicenseType(pack.license_type)}</span>
          <span class="tag export">Export: ${formatExportPolicy(pack.export_policy)}</span>
        </div>

        ${
          pack.long_description
            ? `<div class="muted" style="margin-top:12px;">${pack.long_description}</div>`
            : ``
        }

        <div class="row">
          <button class="btn btn-soft preview-btn" data-pack-id="${pack.id}" type="button">👁️ Preview</button>
          <button
            class="btn btn-primary buy-btn"
            data-pack-id="${pack.id}"
            type="button"
            ${ctaMeta.disabled ? "disabled" : ""}
            style="${ctaMeta.disabled ? "opacity:.75;cursor:default;" : ""}"
          >
            ${ctaMeta.label}
          </button>
        </div>

        <div id="preview-${pack.id}" class="preview" style="display:none;"></div>
      </div>
    `;
  }).join("");

  list.querySelectorAll(".preview-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      await previewPackInPlace(btn.dataset.packId);
    });
  });

  list.querySelectorAll(".buy-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      if(btn.disabled) return;
      await buyPack(btn.dataset.packId);
    });
  });
}

async function loadOwnedLibraryState(){
  const token = localStorage.getItem("sb_token") || "";

  if(!token){
    state.ownedPackIds = new Set();
    state.ownedPackMap = new Map();
    return;
  }

  try{
    const data = await api("/api/me/library", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const items = Array.isArray(data.items) ? data.items : [];

    state.ownedPackIds = new Set(items.map(item => String(item.pack_id)));
    state.ownedPackMap = new Map(items.map(item => [String(item.pack_id), item]));
  }catch(err){
    console.warn("Could not load owned library state", err);
    state.ownedPackIds = new Set();
    state.ownedPackMap = new Map();
  }
}

async function loadMarketplace(){
  el("marketplace-status").textContent = "Loading packs...";

  try{
    await loadOwnedLibraryState();

    const data = await api("/api/marketplace/packs");
    state.packs = Array.isArray(data.packs) ? data.packs : [];

    render();
  }catch(err){
    const tab = getActiveAccessTab();
    const label =
      tab === "paid" ? "Paid Marketplace" :
      tab === "free_library" ? "Free Library" :
      "All Packs";

    el("marketplace-status").textContent = `${label} • ${filtered.length} pack(s)`;
    el("marketplace-list").innerHTML = `<div class="empty">Could not load packs.</div>`;
  }
}
async function buyPack(packId) {
  const token = localStorage.getItem("sb_token") || "";
  if (!token) {
    alert("Please login first.");
    return;
  }

  const pack = state.packs.find(p => p.id === packId);
  const grossCents = Number(pack?.price_cents || 0);
  const feeCents = Math.max(0, Math.round(grossCents * 0.03) + 30);

  const res = await fetch(`/api/purchase/packs/${packId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      grossCents,
      feeCents,
      currency: "usd",
    }),
  });

  const data = await res.json();
  if(data.ok){
    await loadOwnedLibraryState();
    render();
    alert("Purchased! Check My Library.");
  }else{
    alert(data.error || "Purchase failed");
  }
}

el("refresh-btn")?.addEventListener("click", loadMarketplace);
el("search-input")?.addEventListener("input", render);
el("type-filter")?.addEventListener("change", render);
el("access-filter")?.addEventListener("change", render);

document.querySelectorAll(".market-tab").forEach(btn => {
  btn.addEventListener("click", () => {
    setActiveAccessTab(btn.dataset.accessTab || "all");
  });
});

loadMarketplace();
window.getMarketplacePackCtaMeta = getPackCtaMeta;
window.getMarketplaceOwnedPackRecord = getOwnedPackRecord;
