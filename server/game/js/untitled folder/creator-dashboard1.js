const token = localStorage.getItem("sb_token") || "";

async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  return res.json();
}

export async function loadCreatorProfile() {
  return api("/api/creator/profile");
}

export async function saveCreatorProfile(payload) {
  return api("/api/creator/profile", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function loadCreatorPacks() {
  return api("/api/creator/packs");
}

export async function createDraftPack(payload) {
  return api("/api/creator/packs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateDraftPack(packId, payload) {
  return api(`/api/creator/packs/${packId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function createVersion(packId, payload) {
  return api(`/api/creator/packs/${packId}/version`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function requestUploadIntent(packId, versionNumber, files) {
  return api(`/api/creator/packs/${packId}/upload-intent`, {
    method: "POST",
    body: JSON.stringify({ versionNumber, files }),
  });
}

export async function uploadFilesToS3(uploadPlan, fileMap) {
  for (const upload of uploadPlan.uploads || []) {
    const file = fileMap.get(upload.fileName);
    if (!file) continue;

    const res = await fetch(upload.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": upload.contentType || file.type || "application/octet-stream" },
      body: file,
    });

    if (!res.ok) {
      throw new Error(`Upload failed for ${upload.fileName}`);
    }
  }
  return true;
}

export async function submitPack(packId) {
  return api(`/api/creator/packs/${packId}/submit`, {
    method: "POST",
  });
}

window.BuddyCreator = {
  loadCreatorProfile,
  saveCreatorProfile,
  loadCreatorPacks,
  createDraftPack,
  updateDraftPack,
  createVersion,
  requestUploadIntent,
  uploadFilesToS3,
  submitPack,
};
