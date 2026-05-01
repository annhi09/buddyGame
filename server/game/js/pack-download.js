function uid() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/* =========================================================
   READING DB HELPERS
   ========================================================= */
function openReadingDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("sbReadingDB_v1", 2);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("lessons")) {
        db.createObjectStore("lessons", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("progress")) {
        db.createObjectStore("progress", { keyPath: "lessonId" });
      }
      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta", { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains("assets")) {
        db.createObjectStore("assets", { keyPath: "id" });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function readingTx(storeName, mode, fn) {
  const db = await openReadingDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const result = fn(store, tx);
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function putReadingAsset(asset) {
  await readingTx("assets", "readwrite", store => store.put(asset));
  return asset;
}

async function putReadingLesson(lesson) {
  await readingTx("lessons", "readwrite", store => store.put(lesson));
  return lesson;
}

/* =========================================================
   WORDS DB HELPERS
   Based on words app local DB:
   - DB name: studyBuddyDB
   - lesson store: lessons
   - image store: images
   ========================================================= */
function openWordsDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("studyBuddyDB", 2);

    req.onupgradeneeded = () => {
      const db = req.result;

      if (!db.objectStoreNames.contains("images")) {
        db.createObjectStore("images", { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains("lessons")) {
        const st = db.createObjectStore("lessons", { keyPath: "id" });
        st.createIndex("updatedAt", "updatedAt");
      }

      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta", { keyPath: "key" });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function wordsTx(storeName, mode, fn) {
  const db = await openWordsDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const result = fn(store, tx);
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function putWordsImage(record) {
  await wordsTx("images", "readwrite", store => store.put(record));
  return record;
}

async function putWordsLesson(lesson) {
  await wordsTx("lessons", "readwrite", store => store.put(lesson));
  return lesson;
}

/* =========================================================
   SHARED HELPERS
   ========================================================= */
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function fetchImageAsDataUrl(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch image: ${url}`);
  }
  const blob = await res.blob();
  return blobToDataUrl(blob);
}

/* =========================================================
   READING PACK DOWNLOAD
   ========================================================= */
async function saveMarketplaceReadingPackOffline(payload) {
  const pack = payload?.pack;
  if (!pack || pack.type !== "reading") {
    throw new Error("Invalid reading pack payload");
  }

  const lessonId = `market:${payload.packId}`;
  const items = [];

  for (const page of pack.pages || []) {
    let imageRef = "";

    if (page.image) {
      const dataUrl = await fetchImageAsDataUrl(page.image);
      const assetId = uid();

      await putReadingAsset({
        id: assetId,
        dataUrl,
        name: `${lessonId}-${page.id || uid()}.png`,
        createdAt: Date.now(),
      });

      imageRef = `idb:${assetId}`;
    }

    items.push({
      word: String(page.text || "").trim(),
      image: imageRef,
    });
  }

  const lesson = {
    id: lessonId,
    title: payload.title || pack.title || "Marketplace Reading Pack",
    items,
    updatedAt: Date.now(),
    source: "marketplace",
    marketplacePackId: payload.packId,
    marketplaceVersion: payload.version,
  };

  await putReadingLesson(lesson);
  return lesson;
}

/* =========================================================
   WORDS PACK DOWNLOAD
   ========================================================= */
async function saveMarketplaceWordsPackOffline(payload) {
  const pack = payload?.pack;
  if (!pack || pack.type !== "words") {
    throw new Error("Invalid words pack payload");
  }

  const lessonId = `market:${payload.packId}`;
  const items = [];

  for (const item of pack.items || []) {
    let imageRef = "";

    if (item.image) {
      const dataUrl = await fetchImageAsDataUrl(item.image);
      const imageId = uid();

      await putWordsImage({
        id: imageId,
        blob: dataUrlToBlob(dataUrl),
        meta: {
          source: "marketplace",
          packId: payload.packId,
          itemId: item.id || uid(),
          createdAt: Date.now(),
        },
        ts: Date.now(),
      });

      imageRef = `idb:${imageId}`;
    }

    items.push({
      word: String(item.word || "").trim(),
      image: imageRef,
    });
  }

  const lesson = {
    id: lessonId,
    title: payload.title || pack.title || "Marketplace Words Pack",
    updatedAt: Date.now(),
    items,
    source: "marketplace",
    marketplacePackId: payload.packId,
    marketplaceVersion: payload.version,
  };

  await putWordsLesson(lesson);
  return lesson;
}

/* =========================================================
   WORDS image store expects blob, not dataUrl
   ========================================================= */
function dataUrlToBlob(dataUrl) {
  const parts = String(dataUrl).split(",");
  const meta = parts[0] || "";
  const data = parts[1] || "";
  const mimeMatch = meta.match(/data:(.*?);base64/);
  const mime = mimeMatch ? mimeMatch[1] : "image/png";

  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Blob([bytes], { type: mime });
}

export async function isPackDownloadedOffline(packId) {
  const readingId = `market:${packId}`;
  const wordsId = `market:${packId}`;

  const readingFound = await (async () => {
    try {
      const db = await openReadingDb();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction("lessons", "readonly");
        const req = tx.objectStore("lessons").get(readingId);
        req.onsuccess = () => resolve(!!req.result);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return false;
    }
  })();

  if (readingFound) return true;

  const wordsFound = await (async () => {
    try {
      const db = await openWordsDb();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction("lessons", "readonly");
        const req = tx.objectStore("lessons").get(wordsId);
        req.onsuccess = () => resolve(!!req.result);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return false;
    }
  })();

  return wordsFound;
}

/* =========================================================
   ENTRY
   ========================================================= */
export async function saveOwnedPackOffline(payload) {
  if (!payload?.type) {
    throw new Error("Missing pack type");
  }

  if (payload.type === "reading") {
    return saveMarketplaceReadingPackOffline(payload);
  }

  if (payload.type === "words") {
    return saveMarketplaceWordsPackOffline(payload);
  }

  throw new Error(`Pack type not supported yet: ${payload.type}`);
}

// function openDb() {
//   return new Promise((resolve, reject) => {
//     const req = indexedDB.open("buddyGameMarketplaceDB", 1);

//     req.onupgradeneeded = () => {
//       const db = req.result;
//       if (!db.objectStoreNames.contains("owned_packs")) {
//         db.createObjectStore("owned_packs", { keyPath: "packId" });
//       }
//     };

//     req.onsuccess = () => resolve(req.result);
//     req.onerror = () => reject(req.error);
//   });
// }

// async function putOwnedPack(record) {
//   const db = await openDb();
//   return new Promise((resolve, reject) => {
//     const tx = db.transaction("owned_packs", "readwrite");
//     tx.objectStore("owned_packs").put(record);
//     tx.oncomplete = () => resolve(true);
//     tx.onerror = () => reject(tx.error);
//   });
// }

// export async function saveOwnedPackOffline(payload) {
//   const record = {
//     packId: payload.packId,
//     title: payload.title,
//     type: payload.type,
//     version: payload.version,
//     manifest_url: payload.manifest_url,
//     full_pack_url: payload.full_pack_url,
//     savedAt: Date.now(),
//   };

//   await putOwnedPack(record);
//   return record;
// }
