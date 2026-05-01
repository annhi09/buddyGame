import path from "path";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, S3_BUCKET, S3_PUBLIC_BASE_URL } from "../config/s3.js";

export function buildPackAssetKey({ creatorId, packId, versionNumber, fileName }) {
  const safeName = path.basename(String(fileName || "file.bin"));
  return `packs/${creatorId}/${packId}/v${versionNumber}/${safeName}`;
}

export async function createPresignedUpload({ key, contentType }) {
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 });
  const publicUrl = S3_PUBLIC_BASE_URL
    ? `${S3_PUBLIC_BASE_URL}/${key}`
    : `https://${S3_BUCKET}.s3.amazonaws.com/${key}`;

  return { key, uploadUrl, publicUrl };
}

export async function createUploadIntent({ creatorId, packId, versionNumber, files }) {
  const uploads = [];

  for (const file of files || []) {
    const key = buildPackAssetKey({
      creatorId,
      packId,
      versionNumber,
      fileName: file.name,
    });

    const signed = await createPresignedUpload({
      key,
      contentType: file.type,
    });

    uploads.push({
      fileName: file.name,
      contentType: file.type,
      ...signed,
    });
  }

  return uploads;
}
