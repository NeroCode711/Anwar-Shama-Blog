import { detectProjectImageType } from "./image-validation.js";

export function detectBlogMediaType(buffer) {
  if (!Buffer.isBuffer(buffer)) return null;

  const image = detectProjectImageType(buffer);
  if (image) return { ...image, type: "image" };

  if (buffer.length >= 12 &&
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WAVE") {
    return { extension: "wav", mimeType: "audio/wav", type: "audio" };
  }

  if (buffer.length >= 4 && buffer.subarray(0, 4).toString("ascii") === "OggS") {
    return { extension: "ogg", mimeType: "audio/ogg", type: "audio" };
  }

  if (buffer.length >= 3 && buffer.subarray(0, 3).toString("ascii") === "ID3") {
    return { extension: "mp3", mimeType: "audio/mpeg", type: "audio" };
  }

  if (buffer.length >= 2 && buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) {
    return { extension: "mp3", mimeType: "audio/mpeg", type: "audio" };
  }

  if (buffer.length >= 4 && buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) {
    return { extension: "webm", mimeType: "video/webm", type: "video" };
  }

  if (buffer.length >= 12 && buffer.subarray(4, 8).toString("ascii") === "ftyp") {
    return { extension: "mp4", mimeType: "video/mp4", type: "video" };
  }

  return null;
}

export function isStoredBlogMediaPath(value) {
  return typeof value === "string" &&
    /^\/uploads\/[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\.(?:png|jpe?g|webp|mp3|wav|ogg|mp4|webm)$/i.test(value);
}
