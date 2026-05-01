export function validateReadingPack(json) {
  if (!json || json.type !== "reading") {
    throw new Error("Invalid reading pack");
  }
  if (!Array.isArray(json.pages) || !json.pages.length) {
    throw new Error("Reading pack must include pages");
  }
  return true;
}

export function validateWordsPack(json) {
  if (!json || json.type !== "words") {
    throw new Error("Invalid words pack");
  }
  if (!Array.isArray(json.items) || !json.items.length) {
    throw new Error("Words pack must include items");
  }
  return true;
}

export function buildPackManifest(pack, version, assets = []) {
  return {
    schemaVersion: 1,
    packId: pack.id,
    type: pack.type,
    title: pack.title,
    version: version.version_number,
    assets,
  };
}

export function buildDownloadPayload(pack, version) {
  return {
    packId: pack.id,
    type: pack.type,
    title: pack.title,
    version: version.version_number,
    manifest_url: version.manifest_url,
    full_pack_url: version.full_pack_url,
  };
}
