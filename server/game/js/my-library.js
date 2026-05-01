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

// function formatExportPolicy(value = "") {
//   switch (String(value || "").toLowerCase()) {
//     case "owner_backup": return "Owner Backup";
//     case "classroom_only": return "Classroom Sharing";
//     case "full": return "Full Export";
//     case "none":
//     default:
//       return "No Export";
//   }
// }

function canExportFromLibrary(item) {
  const policy = String(item?.export_policy || "none").toLowerCase();
  return policy === "owner_backup" || policy === "full";
}

function canOpenPack(item) {
  return true;
}

async function exportOwnedPack(packId) {
  try {
    const data = await api(`/api/me/library/${packId}/download`);
    if (!data.ok) throw new Error(data.error || "Download failed");

    const filename = `${String(data.payload?.title || "pack")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")}.json`;

    const blob = new Blob(
      [JSON.stringify(data.payload?.pack || data.payload, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) {
    alert(err.message || "Export failed");
  }
}

function savePendingImport(item, lesson) {
  const packType = String(item.type || "").toLowerCase();

  if (packType === "reading") {
    localStorage.setItem("sb_pending_import_reading", JSON.stringify(lesson));
    window.location.href = `./reading/reading.html?marketPack=${encodeURIComponent(item.pack_id)}`;
    return;
  }

  if (packType === "words") {
    localStorage.setItem("sb_pending_import_words", JSON.stringify(lesson));
    window.location.href = `./words/words.html?marketPack=${encodeURIComponent(item.pack_id)}`;
    return;
  }

  alert(`Unsupported pack type: ${item.type}`);
}

async function importOwnedPack(item) {
  try {
    const data = await api(`/api/me/library/${item.pack_id}/import`, {
      method: "POST",
    });

    if (!data.lesson) {
      throw new Error("No lesson returned from import");
    }

    const importedVersion =
      Number(data.lesson?.data_json?.importedVersion || item.latest_version || item.owned_version || 0);

    await api(`/api/me/library/${item.pack_id}/mark-imported`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version: importedVersion }),
    });
    savePendingImport(item, data.lesson);
    alert(
      `Imported successfully!\n\n` +
      `Title: ${item.title || "Pack"}\n` +
      `Access: ${formatAccessMode(item.access_mode)}\n` +
      `License: ${formatLicenseType(item.license_type)}\n` +
      `Export: ${formatExportPolicy(item.export_policy)}`
    );
  } catch (err) {
    alert(err.message || "Import failed");
  }
}

function statusBadge(item) {
  const downloadedVersion = Number(item.downloaded_version || 0);
  const latestVersion = Number(item.latest_version || 0);

  if (latestVersion > downloadedVersion) {
    return `<span class="status-pill status-not-downloaded">Update Available</span>`;
  }

  if (downloadedVersion > 0) {
    return `<span class="status-pill status-downloaded">Up to Date</span>`;
  }

  return `<span class="status-pill status-not-downloaded">Not Imported Yet</span>`;
}

function importLabel(item) {
  const latestVersion = Number(item.latest_version || 0);
  const downloadedVersion = Number(item.downloaded_version || 0);
  const needsUpdate = latestVersion > downloadedVersion;

  if (item.type === "reading") {
    return needsUpdate ? "Update in Reading" : "Import to Reading";
  }

  if (item.type === "words") {
    return needsUpdate ? "Update in Words" : "Import to Words";
  }

  return needsUpdate ? "Update" : "Import";
}

function formatAccessMode(value = "") {
  return String(value || "").toLowerCase() === "free_library" ? "Free Library" : "Paid";
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

function renderLibrary(items) {
  const list = el("library-list");
  const status = el("library-status");

  if (status) {
    status.textContent = `${items.length} owned pack${items.length === 1 ? "" : "s"}`;
  }

  if (!list) return;

  if (!items.length) {
    list.innerHTML = `<div class="muted">You do not own any packs yet.</div>`;
    return;
  }

  list.innerHTML = items.map(item => {
    const cover = item.cover_url || item.thumbnail_url || "";
    const exportAllowed = canExportFromLibrary(item);

    return `
      <div class="card">
        ${
          cover
            ? `<img class="thumb" src="${cover}" alt="${item.title || "Pack"}" onerror="this.style.display='none'" />`
            : ``
        }

        <h3 style="margin:0 0 6px;">${item.title || "Untitled"}</h3>
        <div class="muted">${item.type || "pack"} • ${item.language || "en"}</div>
        <div class="muted">${item.category || "General"}</div>
        <div class="muted">Ages ${item.age_min ?? 3}-${item.age_max ?? 6}</div>
        <div class="muted">Owned version: ${item.owned_version || 0}</div>
        <div class="muted">Imported version: ${item.downloaded_version || 0}</div>
        <div class="muted">Latest version: ${item.latest_version || item.owned_version || 0}</div>
        <div class="muted">License: ${item.license_type || "personal"}</div>
        <div class="muted">Access: ${item.access_mode === "free_library" ? "Free Library" : "Paid"}</div>
        <div class="muted">Export: ${formatExportPolicy(item.export_policy)}</div>

        ${statusBadge(item)}

        ${
          item.short_description
            ? `<div class="muted" style="margin-top:8px;">${item.short_description}</div>`
            : ``
        }

        <div class="row">
          <button class="import-btn" data-pack-id="${item.pack_id}">
            ${importLabel(item)}
          </button>

          ${
            exportAllowed
              ? `<button class="export-btn secondary" data-pack-id="${item.pack_id}">Export</button>`
              : ``
          }
        </div>
      </div>
    `;
  }).join("");

  list.querySelectorAll(".import-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const item = items.find(x => x.pack_id === btn.dataset.packId);
      if (item) importOwnedPack(item);
    });
  });

  list.querySelectorAll(".export-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const item = items.find(x => x.pack_id === btn.dataset.packId);
      if (!item) return;

      const policy = String(item.export_policy || "none").toLowerCase();
      if (!(policy === "owner_backup" || policy === "full")) {
        alert("Export is disabled by this pack's license.");
        return;
      }

      await exportOwnedPack(item.pack_id);
    });
  });
}

async function loadLibrary() {
  try {
    const token = getAuthToken();
    if (!token) {
      el("library-status").textContent = "Please login first.";
      el("library-list").innerHTML = "";
      return;
    }

    el("library-status").textContent = "Loading library...";
    const data = await api("/api/me/library");
    renderLibrary(data.items || []);
  } catch (err) {
    el("library-status").textContent = err.message || "Library error";
    el("library-list").innerHTML = "";
  }
}

loadLibrary();


// import { saveOwnedPackOffline, isPackDownloadedOffline } from "./pack-download.js";

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
//   return res.json();
// }

// function openPackUrl(item) {
//   const packId = encodeURIComponent(item.pack_id);

//   if (item.type === "reading") {
//     window.location.href = `./reading/reading.html?marketPack=${packId}`;
//     return;
//   }

//   if (item.type === "words") {
//     window.location.href = `./words/words.html?marketPack=${packId}`;
//     return;
//   }

//   alert(`Unsupported pack type: ${item.type}`);
// }

// async function renderLibrary(items) {
//   const list = el("library-list");
//   el("library-status").textContent = `${items.length} owned pack(s)`;

//   if (!items.length) {
//     list.innerHTML = `<div class="muted">You do not own any packs yet.</div>`;
//     return;
//   }

//   const cards = await Promise.all(items.map(async (item) => {
//     const downloaded = await isPackDownloadedOffline(item.pack_id);

//     const statusHtml = downloaded
//       ? `<span class="status-pill status-downloaded">Downloaded</span>`
//       : `<span class="status-pill status-not-downloaded">Not downloaded</span>`;

//     const openLabel =
//       item.type === "reading"
//         ? "Open in Reading"
//         : item.type === "words"
//           ? "Open in Words"
//           : "Open";

//     return `
//       <div class="card">
//         ${
//           item.cover_url || item.thumbnail_url
//             ? `<img class="thumb" src="${item.cover_url || item.thumbnail_url}" alt="${item.title || "Pack"}" onerror="this.style.display='none'" />`
//             : ``
//         }

//         <h3 style="margin:0 0 6px;">${item.title || "Untitled"}</h3>
//         <div class="muted">${item.type || "pack"}</div>
//         <div class="muted">Owned version: ${item.owned_version || 0}</div>
//         <div class="muted">Downloaded version: ${item.downloaded_version || 0}</div>

//         ${statusHtml}

//         <div class="row">
//           <button class="download-btn" data-pack-id="${item.pack_id}">
//             ${downloaded ? "Download Again" : "Download"}
//           </button>

//           ${
//             downloaded
//               ? `<button class="open-btn secondary" data-pack-id="${item.pack_id}">${openLabel}</button>`
//               : ``
//           }
//         </div>
//       </div>
//     `;
//   }));

//   list.innerHTML = cards.join("");

//   list.querySelectorAll(".download-btn").forEach(btn => {
//     btn.addEventListener("click", async () => {
//       await downloadOwnedPack(btn.dataset.packId);
//     });
//   });

//   list.querySelectorAll(".open-btn").forEach(btn => {
//     btn.addEventListener("click", () => {
//       const item = items.find(x => x.pack_id === btn.dataset.packId);
//       if (item) openPackUrl(item);
//     });
//   });
// }

// async function loadLibrary() {
//   try {
//     const token = getAuthToken();
//     if (!token) {
//       el("library-status").textContent = "Missing token";
//       el("library-list").innerHTML = "";
//       return;
//     }

//     el("library-status").textContent = "Loading library...";
//     const data = await api("/api/me/library");
//     if (!data.ok) throw new Error(data.error || "Load failed");
//     await renderLibrary(data.library || []);
//   } catch (err) {
//     el("library-status").textContent = err.message || "Library error";
//     el("library-list").innerHTML = "";
//   }
// }

// async function downloadOwnedPack(packId) {
//   try {
//     const data = await api(`/api/me/library/${packId}/download`);
//     if (!data.ok) throw new Error(data.error || "Download failed");

//     await saveOwnedPackOffline(data.payload);

//     await api(`/api/me/library/${packId}/mark-downloaded`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ version: data.payload.version || 0 }),
//     });

//     alert("Pack saved locally.");
//     await loadLibrary();
//   } catch (err) {
//     alert(err.message || "Save offline failed");
//   }
// }

// loadLibrary();

// // import { saveOwnedPackOffline } from "./pack-download.js";

// // function el(id) {
// //   return document.getElementById(id);
// // }

// // async function api(path, options = {}) {
// //   const token = localStorage.getItem("sb_token") || "";
// //   const res = await fetch(path, {
// //     ...options,
// //     headers: {
// //       ...(token ? { Authorization: `Bearer ${token}` } : {}),
// //       ...(options.headers || {}),
// //     },
// //   });
// //   return res.json();
// // }

// // function renderLibrary(items) {
// //   const list = el("library-list");
// //   el("library-status").textContent = `${items.length} owned pack(s)`;

// //   if (!items.length) {
// //     list.innerHTML = `<div class="muted">You do not own any packs yet.</div>`;
// //     return;
// //   }

// //   list.innerHTML = items.map(item => `
// //     <div class="card">
// //       <h3 style="margin:0 0 6px;">${item.title || "Untitled"}</h3>
// //       <div class="muted">${item.type || "pack"}</div>
// //       <div class="muted">Owned version: ${item.owned_version || 0}</div>
// //       <div class="muted">Downloaded version: ${item.downloaded_version || 0}</div>
// //       <div class="row">
// //         <button class="download-btn" data-pack-id="${item.pack_id}">Download</button>
// //       </div>
// //     </div>
// //   `).join("");

// //   list.querySelectorAll(".download-btn").forEach(btn => {
// //     btn.addEventListener("click", async () => {
// //       await downloadOwnedPack(btn.dataset.packId);
// //     });
// //   });
// // }

// // async function loadLibrary() {
// //   try {
// //     el("library-status").textContent = "Loading library...";
// //     const data = await api("/api/me/library");
// //     if (!data.ok) throw new Error(data.error || "Load failed");
// //     renderLibrary(data.library || []);
// //   } catch (err) {
// //     el("library-status").textContent = err.message || "Library error";
// //     el("library-list").innerHTML = "";
// //   }
// // }

// // async function downloadOwnedPack(packId) {
// //   try {
// //     const data = await api(`/api/me/library/${packId}/download`);
// //     if (!data.ok) throw new Error(data.error || "Download failed");

// //     await saveOwnedPackOffline(data.payload);

// //     await api(`/api/me/library/${packId}/mark-downloaded`, {
// //       method: "POST",
// //       headers: { "Content-Type": "application/json" },
// //       body: JSON.stringify({ version: data.payload.version || 0 }),
// //     });

// //     alert("Pack saved locally.");
// //     await loadLibrary();
// //   } catch (err) {
// //     alert(err.message || "Save offline failed");
// //   }
// // }

// // loadLibrary();
