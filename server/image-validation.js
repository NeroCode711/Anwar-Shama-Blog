export function detectProjectImageType(buffer) {
  if (!Buffer.isBuffer(buffer)) return null;

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer.subarray(1, 4).toString("ascii") === "PNG" &&
    buffer.subarray(4, 8).equals(Buffer.from([0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return { extension: "png", mimeType: "image/png" };
  }

  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { extension: "jpg", mimeType: "image/jpeg" };
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { extension: "webp", mimeType: "image/webp" };
  }

  return null;
}

export function isStoredProjectImage(value) {
  return typeof value === "string" &&
    /^\/uploads\/[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\.(?:png|jpe?g|webp)$/i.test(value);
}
