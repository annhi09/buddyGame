function ensurePreviewModal() {
  let modal = document.getElementById("market-pack-preview-modal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "market-pack-preview-modal";
  modal.setAttribute("aria-hidden", "true");
  modal.style.cssText = `
    position:fixed;
    inset:0;
    background:rgba(18,28,54,.48);
    display:none;
    align-items:center;
    justify-content:center;
    padding:20px;
    z-index:1000;
  `;

  modal.innerHTML = `
    <div id="market-pack-preview-card" style="
      width:min(920px, 100%);
      max-height:min(88vh, 960px);
      overflow:auto;
      background:#fff;
      border-radius:26px;
      border:1px solid #dbe5ff;
      box-shadow:0 24px 60px rgba(18,28,54,.18);
      padding:18px;
    ">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:14px;">
        <div>
          <h3 id="market-pack-preview-title" style="margin:0;font-size:1.28rem;">Pack Preview</h3>
          <div id="market-pack-preview-sub" style="color:#66728c;margin-top:4px;">Loading preview...</div>
        </div>
        <button id="market-pack-preview-close" type="button" style="
          border:none;
          background:#eef4ff;
          color:#3553a6;
          width:40px;
          height:40px;
          border-radius:12px;
          font-size:1rem;
          cursor:pointer;
          font-weight:900;
        ">✕</button>
      </div>

      <div id="market-pack-preview-body"></div>
    </div>
  `;

  document.body.appendChild(modal);

  const close = () => {
    const active = document.activeElement;
    if (active && modal.contains(active) && typeof active.blur === "function") {
      active.blur();
    }
    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
  };

  modal.querySelector("#market-pack-preview-close")?.addEventListener("click", close);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });

  return modal;
}

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

function money(cents) {
  return `$${(Number(cents || 0) / 100).toFixed(2)}`;
}

export async function previewPackInPlace(packId) {
  const modal = ensurePreviewModal();
  const body = document.getElementById("market-pack-preview-body");
  const titleEl = document.getElementById("market-pack-preview-title");
  const subEl = document.getElementById("market-pack-preview-sub");

  if (!modal || !body || !titleEl || !subEl) return;

  modal.style.display = "flex";
  modal.setAttribute("aria-hidden", "false");
  body.innerHTML = `<div style="color:#66728c;">Loading preview...</div>`;
  titleEl.textContent = "Pack Preview";
  subEl.textContent = "Loading...";

  try {
    const res = await fetch(`/api/marketplace/packs/${packId}/preview`);
    const data = await res.json().catch(() => ({}));

    if (!res.ok || data.ok === false) {
      throw new Error(data.error || `Preview failed: ${res.status}`);
    }

    const pack = data.preview?.pack || {};
    const preview1 = data.preview?.preview_1_url || pack.resolved_cover_url || pack.cover_url || pack.thumbnail_url || "";
    const preview2 = data.preview?.preview_2_url || "";
    const cover = pack.resolved_cover_url || pack.cover_url || pack.thumbnail_url || preview1 || "";

    // const isFree = String(pack.access_mode || "") === "free_library";
    // const priceText = isFree ? "Free" : money(pack.price_cents);

    titleEl.textContent = pack.title || "Pack Preview";
    subEl.textContent = pack.short_description || "Marketplace pack preview";

    const isFree = String(pack.access_mode || "").toLowerCase() === "free_library";
    const priceText = isFree ? "Free" : money(pack.price_cents);

    const ctaMeta = typeof window.getMarketplacePackCtaMeta === "function"
    ? window.getMarketplacePackCtaMeta(pack)
    : {
        label: isFree ? "➕ Add Free Pack" : "🛒 Buy This Pack",
        disabled: false,
        kind: isFree ? "free" : "buy"
      };

    body.innerHTML = `
      <div style="
        display:grid;
        grid-template-columns:minmax(240px, 420px) 1fr;
        gap:18px;
        align-items:start;
      ">
        <div>
          ${
            cover
              ? `<img src="${cover}" alt="${pack.title || "Pack"} cover" style="
                  width:100%;
                  max-width:420px;
                  height:220px;
                  object-fit:cover;
                  border-radius:18px;
                  border:1px solid #dfe8ff;
                  background:#eef4ff;
                  box-shadow:0 14px 30px rgba(45,107,255,.12);
                " />`
              : `<div style="
                  min-height:220px;
                  display:flex;
                  align-items:center;
                  justify-content:center;
                  border:1px dashed #dbe5ff;
                  border-radius:18px;
                  background:linear-gradient(180deg,#fcfdff 0%, #f8fbff 100%);
                  color:#66728c;
                ">No cover image available.</div>`
          }
        </div>

        <div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
            <span style="display:inline-flex;align-items:center;padding:6px 10px;border-radius:999px;background:#eef4ff;color:#4560aa;font-size:.82rem;font-weight:800;">${pack.type || "pack"}</span>
            <span style="display:inline-flex;align-items:center;padding:6px 10px;border-radius:999px;background:#eef4ff;color:#4560aa;font-size:.82rem;font-weight:800;">${pack.language || "en"}</span>
            <span style="display:inline-flex;align-items:center;padding:6px 10px;border-radius:999px;background:#eef4ff;color:#4560aa;font-size:.82rem;font-weight:800;">${pack.category || "General"}</span>
            <span style="display:inline-flex;align-items:center;padding:6px 10px;border-radius:999px;background:#eef4ff;color:#4560aa;font-size:.82rem;font-weight:800;">Ages ${pack.age_min ?? 3}-${pack.age_max ?? 6}</span>
            <span style="display:inline-flex;align-items:center;padding:6px 10px;border-radius:999px;background:${isFree ? "#eafaf1" : "#eef4ff"};color:${isFree ? "#17815b" : "#4560aa"};font-size:.82rem;font-weight:800;">${formatAccessMode(pack.access_mode)}</span>
            <span style="display:inline-flex;align-items:center;padding:6px 10px;border-radius:999px;background:#eef4ff;color:#4560aa;font-size:.82rem;font-weight:800;">${formatLicenseType(pack.license_type)}</span>
            <span style="display:inline-flex;align-items:center;padding:6px 10px;border-radius:999px;background:#fff4e5;color:#9b5d00;font-size:.82rem;font-weight:800;">Export: ${formatExportPolicy(pack.export_policy)}</span>
            <span style="display:inline-flex;align-items:center;padding:6px 10px;border-radius:999px;background:#eef4ff;color:#4560aa;font-size:.82rem;font-weight:800;">${priceText}</span>
          </div>

          <div style="color:#22314f;line-height:1.5;margin-bottom:14px;">
            ${pack.long_description || pack.short_description || "No description yet."}
          </div>

          ${
            ctaMeta.kind === "owned"
              ? `<div style="margin-top:10px; color:#17815b; font-weight:800;">This pack is already in your library.</div>`
              : ``
          }
          ${
            ctaMeta.kind === "update"
              ? `<div style="margin-top:10px; color:#9b5d00; font-weight:800;">A newer version is available in your library.</div>`
              : ``
          }

          <div class="row" style="justify-content:flex-start; align-items:center;">
            <button
              id="market-pack-preview-cta"
              type="button"
              ${ctaMeta.disabled ? "disabled" : ""}
              style="
                border:none;
                background:${ctaMeta.kind === "owned" ? "#95a5a6" : (isFree ? "#17a36b" : "#2d6bff")};
                color:#fff;
                padding:12px 16px;
                border-radius:14px;
                font-weight:900;
                cursor:${ctaMeta.disabled ? "default" : "pointer"};
                opacity:${ctaMeta.disabled ? "0.9" : "1"};
              "
            >
              ${ctaMeta.label}
            </button>
          </div>
        </div>
      </div>

      <div style="margin-top:18px;">
        <div style="font-weight:900;margin-bottom:10px;">Preview Images</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          ${
            preview1
              ? `<img src="${preview1}" alt="Preview 1" style="width:180px;height:120px;object-fit:cover;border-radius:14px;border:1px solid #dfe8ff;background:#eef3ff;" />`
              : ``
          }
          ${
            preview2
              ? `<img src="${preview2}" alt="Preview 2" style="width:180px;height:120px;object-fit:cover;border-radius:14px;border:1px solid #dfe8ff;background:#eef3ff;" />`
              : ``
          }
          ${
            !preview1 && !preview2
              ? `<div style="color:#66728c;">No preview images available.</div>`
              : ``
          }
        </div>
      </div>
    `;

    const ctaBtn = document.getElementById("market-pack-preview-cta");
    if(ctaBtn && !ctaMeta.disabled){
      ctaBtn.onclick = async () => {
        try{
          if(typeof window.buyMarketplacePack === "function"){
            await window.buyMarketplacePack(pack.id);
          }
        }catch(err){
          console.warn(err);
        }
      };
    }
    if (window.innerWidth <= 820) {
      body.firstElementChild.style.gridTemplateColumns = "1fr";
    }
  } catch (err) {
    titleEl.textContent = "Preview";
    subEl.textContent = "Could not load preview";
    body.innerHTML = `<div style="color:#c62828;">${err.message || "Preview failed"}</div>`;
  }
}